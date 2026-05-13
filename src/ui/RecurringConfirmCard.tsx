import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Glass } from './atoms/Glass';
import { space } from './theme';
import { format } from '@/domain/money';
import type { RecurringRule, TemplateTxn } from '@/db/repos/recurring_rules';

type Props = {
  rule: RecurringRule;
  onConfirm: (ruleId: string) => void;
  onSkip: (ruleId: string) => void;
};

export function RecurringConfirmCard({ rule, onConfirm, onSkip }: Props) {
  const tmpl = (() => {
    try { return JSON.parse(rule.template_txn) as TemplateTxn; }
    catch { return null; }
  })();

  const amountLabel = tmpl
    ? `${tmpl.kind === 'income' ? '+' : '-'}${format(tmpl.amount_micro, tmpl.currency)}`
    : '—';

  return (
    <View style={{ marginHorizontal: space(4), marginBottom: space(3) }}>
      <Glass
        intensity="med"
        radius="lg"
        border
        style={{ padding: space(4), gap: space(2) }}
      >
        <Text variant="caption" tone="muted" caps>RECURRING</Text>
        <Text variant="bodyLg">{rule.name}</Text>
        <Text variant="display3">{amountLabel}</Text>
        <Text variant="caption" tone="muted">{rule.cadence}</Text>
        <View style={{ flexDirection: 'row', gap: space(2), marginTop: space(2) }}>
          <Button
            title="Skip"
            variant="glass"
            onPress={() => onSkip(rule.id)}
            style={{ flex: 1 }}
          />
          <Button
            title="Confirm"
            variant="primary"
            onPress={() => onConfirm(rule.id)}
            style={{ flex: 1 }}
          />
        </View>
      </Glass>
    </View>
  );
}
