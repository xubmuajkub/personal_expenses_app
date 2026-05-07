import { View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { color, radius, shadow, space } from './theme';
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
    <View
      style={{
        marginHorizontal: space(4),
        marginBottom: space(3),
        padding: space(4),
        borderRadius: radius.lg,
        backgroundColor: color.surface,
        borderWidth: 1,
        borderColor: color.lilac300,
        ...shadow.s1,
      }}
    >
      <View style={{ marginBottom: space(2) }}>
        <Text variant="bodyLg">{rule.name}</Text>
        <Text variant="caption" tone="muted" style={{ marginTop: space(0.5) }}>
          {amountLabel} · {rule.cadence}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: space(2) }}>
        <Button
          title="Confirm"
          variant="accent"
          onPress={() => onConfirm(rule.id)}
          style={{ flex: 1 }}
        />
        <Button
          title="Skip"
          variant="secondary"
          onPress={() => onSkip(rule.id)}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
