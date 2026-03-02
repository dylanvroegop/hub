import type { OpsPriority, OpsSeverity, OpsStatus } from '@/lib/types';

function classFor(type: 'status' | 'priority' | 'severity', value: string): string {
  return `pill ${type}-${value}`;
}

export function StatusPill({ status }: { status: OpsStatus }) {
  return <span className={classFor('status', status)}>{status}</span>;
}

export function PriorityPill({ priority }: { priority: OpsPriority }) {
  return <span className={classFor('priority', priority)}>{priority}</span>;
}

export function SeverityPill({ severity }: { severity: OpsSeverity }) {
  return <span className={classFor('severity', severity)}>{severity}</span>;
}
