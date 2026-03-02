import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { createDataQualityIssue } from '@/lib/ops-db';

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  const maybe = value as { toDate?: () => Date; seconds?: number };
  if (typeof maybe.toDate === 'function') return maybe.toDate();
  if (typeof maybe.seconds === 'number') return new Date(maybe.seconds * 1000);
  return null;
}

export async function runHourlyDataQualityChecks(): Promise<{ created: number }> {
  const firestore = getFirestoreAdmin();
  let created = 0;

  // Check 1: quotes stuck in processing for > 24h
  const stuckQuotes = await firestore
    .collection('quotes')
    .where('status', '==', 'in_behandeling')
    .limit(200)
    .get()
    .catch(() => null);

  if (stuckQuotes) {
    for (const doc of stuckQuotes.docs) {
      const payload = doc.data();
      const updatedAt = toDate(payload.updatedAt) || toDate(payload.createdAt);
      if (!updatedAt) continue;

      const hours = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);
      if (hours < 24) continue;

      await createDataQualityIssue({
        checkKey: 'quote_stuck_processing_24h',
        entityType: 'quotes',
        entityRef: doc.id,
        failureReason: `Quote staat al ${Math.floor(hours)} uur op in_behandeling.`,
        metadata: {
          quoteId: doc.id,
          status: payload.status,
          updatedAt: updatedAt.toISOString(),
        },
      });
      created += 1;
    }
  }

  // Check 2: support feedback n8n failed
  const failedFeedback = await firestore
    .collection('support_feedback')
    .where('n8nStatus', '==', 'failed')
    .limit(200)
    .get()
    .catch(() => null);

  if (failedFeedback) {
    for (const doc of failedFeedback.docs) {
      const payload = doc.data();
      await createDataQualityIssue({
        checkKey: 'feedback_n8n_failed',
        entityType: 'support_feedback',
        entityRef: doc.id,
        failureReason: 'Feedback melding kon niet naar n8n/Telegram worden verstuurd.',
        metadata: {
          feedbackId: doc.id,
          n8nStatusCode: payload.n8nStatusCode,
          n8nResponse: payload.n8nResponse,
        },
      });
      created += 1;
    }
  }

  return { created };
}
