import type { LeadCapturePayload } from '@/lib/types';

interface LeadRecord extends LeadCapturePayload {
  id: string;
  receivedAt: string;
  tags: string[];
}

declare global {
  // eslint-disable-next-line no-var
  var __calvoraLeadStore: LeadRecord[] | undefined;
}

const store = globalThis.__calvoraLeadStore ?? [];
if (!globalThis.__calvoraLeadStore) {
  globalThis.__calvoraLeadStore = store;
}

export function saveLead(payload: LeadCapturePayload): LeadRecord {
  const record: LeadRecord = {
    ...payload,
    id: crypto.randomUUID(),
    receivedAt: new Date().toISOString(),
    tags: ['verliescheck_completed'],
  };

  store.push(record);
  console.info('[lead] stored', {
    id: record.id,
    firstName: record.firstName,
    email: record.email,
    source: record.source,
    campaign: record.campaign,
    tags: record.tags,
    likelyMonthly: record.resultSnapshot.monthly.likely,
    likelyYearly: record.resultSnapshot.yearly.likely,
  });

  return record;
}

export function listLeads(): LeadRecord[] {
  return [...store];
}
