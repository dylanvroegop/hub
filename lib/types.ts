export type OpsItemType =
  | 'feedback'
  | 'website_request'
  | 'price_import_request'
  | 'custom_klus_request'
  | 'demo_request'
  | 'app_error'
  | 'n8n_incident'
  | 'data_quality_issue'
  | 'reddit_complaint';

export type OpsStatus = 'nieuw' | 'in_triage' | 'bezig' | 'geblokkeerd' | 'opgelost' | 'genegeerd';
export type OpsPriority = 'laag' | 'medium' | 'hoog' | 'kritiek';
export type OpsSeverity = 'info' | 'waarschuwing' | 'error' | 'kritiek';

export interface AdminPrincipal {
  uid: string;
  email: string;
  name: string | null;
}

export interface OpsItem {
  id: string;
  type: OpsItemType;
  title: string;
  summary: string | null;
  status: OpsStatus;
  priority: OpsPriority;
  severity: OpsSeverity;
  source_system: string;
  source_collection: string | null;
  source_record_id: string | null;
  source_url: string | null;
  owner_id: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  sla_started_at: string | null;
  sla_paused_at: string | null;
  sla_stopped_at: string | null;
  snoozed_until: string | null;
  resolution: string | null;
  normalized_payload: Record<string, unknown>;
  raw_payload: Record<string, unknown>;
  tags_cache: string[];
  first_seen_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface OpsItemEvent {
  id: number;
  item_id: string;
  actor_uid: string | null;
  actor_email: string | null;
  event_type: string;
  event_payload: Record<string, unknown>;
  created_at: string;
}

export interface OpsItemNote {
  id: number;
  item_id: string;
  author_uid: string;
  author_email: string | null;
  note: string;
  created_at: string;
}
