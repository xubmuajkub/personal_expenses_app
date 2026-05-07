import { addNotifListener } from '../../modules/notif-listener';
import { openDb } from '@/db/sqlite';
import { processNotif } from '@/domain/notif_pipeline';
import { showUndoToast } from '@/ui/UndoToast';
import { deleteTransaction, getTransaction } from '@/db/repos/transactions';
import { format } from '@/domain/money';

let off: (() => void) | null = null;

export function startNotifBridge(userId: string): void {
  if (off) return;
  off = addNotifListener(async (payload) => {
    const db = await openDb();
    const r = await processNotif(db, userId, payload);
    if (r.created && r.txn_id) {
      const txn = await getTransaction(db, r.txn_id);
      if (txn) {
        showUndoToast({
          title: `Logged ${format(txn.amount_micro, txn.currency)}${txn.merchant ? ' at ' + txn.merchant : ''}`,
          actionLabel: 'Undo',
          ttlMs: 5000,
          onAction: async () => { await deleteTransaction(db, r.txn_id!); },
        });
      }
    } else if (r.reason === 'no_rule_match') {
      showUndoToast({
        title: 'New BCEL alert — tap to log',
        actionLabel: 'Open',
        ttlMs: 8000,
        onAction: () => { /* router.push('/txn/new') */ },
      });
    }
  });
}

export function stopNotifBridge(): void {
  if (off) { off(); off = null; }
}
