import type { Currency } from './types';
import { toMicro } from './money';

export interface ParseRule {
  id: string;
  app_package: string;
  regex: string;
  field_map: Record<string, string>;     // {amount:'$1', currency:'$2', merchant:'$3'}
  priority: number;
  default_account_id: string | null;
}

export interface ParseInput {
  package: string;
  title: string;
  text: string;
}

export interface ParseResult {
  rule_id: string;
  amount_micro: number;
  currency: Currency;
  merchant: string | null;
}

export function parseNotif(input: ParseInput, rules: ParseRule[]): ParseResult | null {
  const candidates = rules
    .filter((r) => r.app_package === input.package)
    .sort((a, b) => b.priority - a.priority);
  for (const r of candidates) {
    const m = new RegExp(r.regex, 'i').exec(`${input.title}\n${input.text}`);
    if (!m) continue;
    const amountStr = expand(r.field_map['amount'] ?? '', m);
    const currencyStr = expand(r.field_map['currency'] ?? '', m).toUpperCase();
    const merchantStr = expand(r.field_map['merchant'] ?? '', m).trim();
    if (!amountStr) continue;
    const amount = parseFloat(amountStr.replace(/,/g, ''));
    if (!isFinite(amount)) continue;
    const currency = (['LAK','THB','USD'].includes(currencyStr) ? currencyStr : 'LAK') as Currency;
    return {
      rule_id: r.id,
      amount_micro: toMicro(amount),
      currency,
      merchant: merchantStr || null,
    };
  }
  return null;
}

function expand(template: string, m: RegExpExecArray): string {
  return template.replace(/\$(\d+)/g, (_, idx) => m[Number(idx)] ?? '');
}
