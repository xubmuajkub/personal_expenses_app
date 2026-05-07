/**
 * recurring-engine-cron
 *
 * For each recurring_rules row where enabled=true AND next_run_at <= now() AND deleted_at IS NULL:
 *   - Skip if end_date < now().
 *   - mode='auto'   → insert transaction with FX snapshot, source='recurring', advance next_run_at.
 *   - mode='confirm' → enqueue push_queue with type='recurring_confirm', 12-hour cooldown.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RecurringRule {
  id: string;
  user_id: string;
  name: string;
  template_txn: string; // JSON
  cadence: string;
  mode: 'auto' | 'confirm';
  next_run_at: string;
  last_notified_at: string | null;
  end_date: string | null;
  enabled: boolean;
}

interface TemplateTxn {
  account_id: string;
  category_id?: string;
  kind: 'expense' | 'income' | 'transfer';
  amount_micro: number;
  currency: 'LAK' | 'THB' | 'USD';
  merchant?: string;
  note?: string;
}

function advanceNextRunAt(cadence: string, after: Date): Date {
  // cron: not supported client-side
  if (cadence.startsWith('cron:')) {
    throw new Error('cron cadence not supported in edge function');
  }

  const monthlyMatch = cadence.match(/^monthly_day_(\d+)$/);
  if (monthlyMatch) {
    const targetDay = parseInt(monthlyMatch[1]!, 10);
    let year = after.getFullYear();
    let month = after.getMonth();
    for (let attempt = 0; attempt < 13; attempt++) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
      const last = new Date(year, month + 1, 0).getDate();
      const day = Math.min(targetDay, last);
      const candidate = new Date(year, month, day);
      candidate.setHours(0, 0, 0, 0);
      if (candidate > after) return candidate;
    }
    throw new Error(`Cannot advance monthly cadence ${cadence}`);
  }

  const weeklyMatch = cadence.match(/^weekly_dow_([0-6])$/);
  if (weeklyMatch) {
    const targetDow = parseInt(weeklyMatch[1]!, 10);
    const candidate = new Date(after);
    candidate.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 7; i++) {
      candidate.setDate(candidate.getDate() + 1);
      if (candidate.getDay() === targetDow) return new Date(candidate);
    }
    throw new Error(`Cannot advance weekly cadence ${cadence}`);
  }

  const everyNMatch = cadence.match(/^every_n_days_(\d+)$/);
  if (everyNMatch) {
    const n = parseInt(everyNMatch[1]!, 10);
    const result = new Date(after);
    result.setDate(result.getDate() + n);
    return result;
  }

  throw new Error(`Unknown cadence: ${cadence}`);
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, serviceRoleKey);

  const now = new Date();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);

  // Fetch due recurring rules
  const { data: rules, error: rulesError } = await sb
    .from('recurring_rules')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', nowIso)
    .is('deleted_at', null);

  if (rulesError) {
    return new Response(`fetch rules error: ${rulesError.message}`, { status: 500 });
  }
  if (!rules || rules.length === 0) {
    return new Response('ok-no-rules');
  }

  // Fetch today's FX rates for auto-mode transactions
  const { data: fxRows } = await sb
    .from('fx_rates')
    .select('from_curr,to_curr,rate')
    .eq('date', today);

  const fxMap = new Map<string, number>();
  if (fxRows) {
    for (const r of fxRows) {
      fxMap.set(`${r.from_curr}-${r.to_curr}`, r.rate);
    }
  }

  const processed: string[] = [];
  const errors: string[] = [];

  for (const rule of rules as RecurringRule[]) {
    try {
      // Skip if end_date has passed
      if (rule.end_date && new Date(rule.end_date) < now) continue;

      const tmpl: TemplateTxn = JSON.parse(rule.template_txn);

      if (rule.mode === 'auto') {
        // Get FX rate: currency → base (LAK default)
        const fxRate = fxMap.get(`${tmpl.currency}-LAK`) ?? 1;
        const amountBaseMicro = Math.round(tmpl.amount_micro * fxRate);
        const txnId = crypto.randomUUID();
        const sourceRef = `recurring:${rule.id}:${nowIso}`;

        const { error: txnError } = await sb.from('transactions').insert({
          id: txnId,
          user_id: rule.user_id,
          account_id: tmpl.account_id,
          category_id: tmpl.category_id ?? null,
          kind: tmpl.kind,
          amount_micro: tmpl.amount_micro,
          currency: tmpl.currency,
          fx_rate_to_base: fxRate,
          amount_base_micro: amountBaseMicro,
          occurred_at: nowIso,
          merchant: tmpl.merchant ?? null,
          note: tmpl.note ?? null,
          source: 'recurring',
          source_ref: sourceRef,
          created_at: nowIso,
          updated_at: nowIso,
          sync_version: 1,
        });

        if (txnError) {
          errors.push(`rule ${rule.id} txn insert: ${txnError.message}`);
          continue;
        }

        // Advance next_run_at
        const nextRun = advanceNextRunAt(rule.cadence, now);
        const { error: updateError } = await sb
          .from('recurring_rules')
          .update({
            next_run_at: nextRun.toISOString(),
            updated_at: nowIso,
            sync_version: sb.rpc('increment', {}), // use raw SQL below via direct update
          })
          .eq('id', rule.id);

        // Simpler: just update next_run_at and bump updated_at
        if (updateError) {
          // Try again with minimal fields
          await sb
            .from('recurring_rules')
            .update({ next_run_at: nextRun.toISOString(), updated_at: nowIso })
            .eq('id', rule.id);
        }

        processed.push(rule.id);
      } else if (rule.mode === 'confirm') {
        // 12-hour cooldown
        const cooldownMs = 12 * 60 * 60 * 1000;
        if (
          rule.last_notified_at &&
          now.getTime() - new Date(rule.last_notified_at).getTime() < cooldownMs
        ) {
          continue;
        }

        // Enqueue push notification
        const { error: pushError } = await sb.from('push_queue').insert({
          user_id: rule.user_id,
          type: 'recurring_confirm',
          payload: JSON.stringify({ rule_id: rule.id, rule_name: rule.name }),
          created_at: nowIso,
        });

        if (pushError) {
          errors.push(`rule ${rule.id} push enqueue: ${pushError.message}`);
          continue;
        }

        // Update last_notified_at
        await sb
          .from('recurring_rules')
          .update({ last_notified_at: nowIso, updated_at: nowIso })
          .eq('id', rule.id);

        processed.push(rule.id);
      }
    } catch (e) {
      errors.push(`rule ${rule.id}: ${(e as Error).message}`);
    }
  }

  const body = JSON.stringify({ processed, errors, total: rules.length });
  const status = errors.length > 0 ? 207 : 200;
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
});
