import { parseNotif, type ParseRule } from '@/domain/notif_parser';
import { fromMicro } from '@/domain/money';

const rule: ParseRule = {
  id: 'r1',
  app_package: 'la.bcel.bcelone',
  regex: 'Debit\\s+([\\d,\\.]+)\\s+(LAK|THB|USD)\\s+at\\s+(.+)',
  field_map: { amount: '$1', currency: '$2', merchant: '$3' },
  priority: 100,
  default_account_id: null,
};

describe('parseNotif', () => {
  it('matches a BCEL-style debit', () => {
    const r = parseNotif({
      package: 'la.bcel.bcelone',
      title: 'BCELOne',
      text: 'Debit 150,000 LAK at Joma Bakery',
    }, [rule]);
    expect(r).toBeTruthy();
    expect(fromMicro(r!.amount_micro)).toBe(150000);
    expect(r!.currency).toBe('LAK');
    expect(r!.merchant).toBe('Joma Bakery');
  });

  it('returns null when no rule matches', () => {
    const r = parseNotif({ package: 'x', title: '', text: '' }, [rule]);
    expect(r).toBeNull();
  });

  it('picks higher priority rule first', () => {
    const lowRule: ParseRule = {
      id: 'low',
      app_package: 'la.bcel.bcelone',
      regex: 'Debit\\s+([\\d,\\.]+)\\s+(LAK|THB|USD)',
      field_map: { amount: '$1', currency: '$2', merchant: '' },
      priority: 50,
      default_account_id: null,
    };
    const highRule: ParseRule = {
      id: 'high',
      app_package: 'la.bcel.bcelone',
      regex: 'Debit\\s+([\\d,\\.]+)\\s+(LAK|THB|USD)\\s+at\\s+(.+)',
      field_map: { amount: '$1', currency: '$2', merchant: '$3' },
      priority: 200,
      default_account_id: null,
    };
    const r = parseNotif({
      package: 'la.bcel.bcelone',
      title: '',
      text: 'Debit 5,000 THB at Shop',
    }, [lowRule, highRule]);
    expect(r?.rule_id).toBe('high');
    expect(r?.merchant).toBe('Shop');
  });

  it('falls back to LAK for unknown currency', () => {
    const unknownCurrRule: ParseRule = {
      ...rule,
      id: 'unk',
      regex: 'Debit\\s+([\\d,\\.]+)\\s+(XYZ)',
      field_map: { amount: '$1', currency: '$2', merchant: '' },
    };
    const r = parseNotif({
      package: 'la.bcel.bcelone',
      title: '',
      text: 'Debit 1000 XYZ',
    }, [unknownCurrRule]);
    expect(r?.currency).toBe('LAK');
  });
});
