import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAIRS = ['USD', 'LAK', 'THB'] as const;
type Curr = typeof PAIRS[number];

interface RatesResponse {
  rates: Record<string, number>;
  date: string;
}

async function fetchRates(): Promise<Map<string, number>> {
  const url = `https://api.exchangerate.host/latest?base=USD&symbols=LAK,THB,USD`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fx api ${r.status}`);
  const j = (await r.json()) as RatesResponse;
  const m = new Map<string, number>();
  for (const c of PAIRS) m.set(c, j.rates[c] ?? (c === 'USD' ? 1 : 0));
  return m;
}

function crossRate(usdRates: Map<string, number>, from: Curr, to: Curr): number {
  if (from === to) return 1;
  const fu = usdRates.get(from) ?? 0;
  const tu = usdRates.get(to) ?? 0;
  if (!fu || !tu) return 0;
  return tu / fu;
}

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(url, key);

  let usd: Map<string, number>;
  try { usd = await fetchRates(); }
  catch (e) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data } = await sb.from('fx_rates').select('*').eq('date', yesterday);
    if (!data || data.length === 0) return new Response(`fx unavailable: ${(e as Error).message}`, { status: 503 });
    const today = new Date().toISOString().slice(0, 10);
    const rows = data.map((r) => ({ ...r, date: today }));
    const { error } = await sb.from('fx_rates').upsert(rows, { onConflict: 'date,from_curr,to_curr' });
    if (error) return new Response(error.message, { status: 500 });
    return new Response('ok-fallback');
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows: { date: string; from_curr: Curr; to_curr: Curr; rate: number }[] = [];
  for (const f of PAIRS) for (const t of PAIRS) {
    rows.push({ date: today, from_curr: f, to_curr: t, rate: crossRate(usd, f, t) });
  }
  const { error } = await sb.from('fx_rates').upsert(rows, { onConflict: 'date,from_curr,to_curr' });
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok');
});
