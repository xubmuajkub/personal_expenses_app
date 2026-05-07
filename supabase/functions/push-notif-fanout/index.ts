import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface QueueRow {
  id: number;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  attempts: number;
}

function buildMessage(row: QueueRow): { title: string; body: string } {
  switch (row.type) {
    case 'budget_threshold': {
      const t = (row.payload['threshold'] as number) ?? 0;
      const spend = row.payload['spend_base'];
      const limit = row.payload['limit_base'];
      return { title: t === 100 ? 'Budget exceeded' : 'Budget 80%', body: `${spend} of ${limit}` };
    }
    case 'recurring_confirm':
      return { title: 'Confirm recurring', body: String(row.payload['name'] ?? '') };
    default:
      return { title: 'Update', body: '' };
  }
}

Deno.serve(async () => {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: pending } = await sb
    .from('push_queue')
    .select('*')
    .is('sent_at', null)
    .lt('attempts', 5)
    .order('created_at')
    .limit(100);

  let sent = 0;
  for (const row of (pending ?? []) as QueueRow[]) {
    const { data: tokens } = await sb
      .from('push_tokens')
      .select('expo_token')
      .eq('user_id', row.user_id)
      .is('deleted_at', null);

    const msg = buildMessage(row);
    const messages = (tokens ?? []).map((t: { expo_token: string }) => ({
      to: t.expo_token,
      sound: 'default',
      title: msg.title,
      body: msg.body,
      data: { type: row.type, ...row.payload },
    }));

    if (messages.length === 0) {
      await sb
        .from('push_queue')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', row.id);
      continue;
    }

    const r = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(messages),
    });

    if (r.ok) {
      await sb
        .from('push_queue')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', row.id);
      sent++;
    } else {
      const err = await r.text();
      await sb
        .from('push_queue')
        .update({ attempts: row.attempts + 1, last_error: err.slice(0, 500) })
        .eq('id', row.id);
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'content-type': 'application/json' },
  });
});
