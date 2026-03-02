import type { SupabaseClient } from '@supabase/supabase-js';

import type { AdminPrincipal, OpsItem, OpsItemEvent, OpsItemNote, OpsItemType, OpsPriority, OpsSeverity, OpsStatus } from '@/lib/types';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const TERMINAL_STATUSES: OpsStatus[] = ['opgelost', 'genegeerd'];

function safeObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  return {};
}

function toISO(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapItemRow(row: Record<string, unknown>): OpsItem {
  const owner = safeObject(row.owner);
  return {
    id: String(row.id),
    type: row.type as OpsItemType,
    title: String(row.title),
    summary: cleanText(row.summary),
    status: row.status as OpsStatus,
    priority: row.priority as OpsPriority,
    severity: row.severity as OpsSeverity,
    source_system: String(row.source_system),
    source_collection: cleanText(row.source_collection),
    source_record_id: cleanText(row.source_record_id),
    source_url: cleanText(row.source_url),
    owner_id: cleanText(row.owner_id),
    owner_email: cleanText(owner.email),
    owner_name: cleanText(owner.display_name),
    sla_started_at: toISO(row.sla_started_at),
    sla_paused_at: toISO(row.sla_paused_at),
    sla_stopped_at: toISO(row.sla_stopped_at),
    snoozed_until: toISO(row.snoozed_until),
    resolution: cleanText(row.resolution),
    normalized_payload: safeObject(row.normalized_payload),
    raw_payload: safeObject(row.raw_payload),
    tags_cache: Array.isArray(row.tags_cache) ? row.tags_cache.filter((tag: unknown): tag is string => typeof tag === 'string') : [],
    first_seen_at: String(row.first_seen_at),
    last_seen_at: String(row.last_seen_at),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

function scoreSeverity(current: OpsSeverity): number {
  switch (current) {
    case 'kritiek':
      return 4;
    case 'error':
      return 3;
    case 'waarschuwing':
      return 2;
    default:
      return 1;
  }
}

export interface UpsertOpsItemInput {
  type: OpsItemType;
  title: string;
  summary?: string | null;
  priority?: OpsPriority;
  severity?: OpsSeverity;
  source_system: string;
  source_collection: string;
  source_record_id: string;
  source_url?: string | null;
  normalized_payload?: Record<string, unknown>;
  raw_payload?: Record<string, unknown>;
  tags?: string[];
}

async function ensureTags(supabase: SupabaseClient, tags: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  if (normalized.length === 0) return;

  const rows = normalized.map((tag) => ({ tag }));
  await supabase.from('ops_tags').upsert(rows, { onConflict: 'tag', ignoreDuplicates: true });
}

async function setItemTags(supabase: SupabaseClient, itemId: string, tags: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(
      tags
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );

  await ensureTags(supabase, normalized);

  const { data: tagRows, error: tagsError } = await supabase
    .from('ops_tags')
    .select('id, tag')
    .in('tag', normalized);

  if (tagsError) throw tagsError;

  const linkRows = (tagRows || []).map((row) => ({ item_id: itemId, tag_id: row.id }));

  await supabase.from('ops_item_tags').delete().eq('item_id', itemId);
  if (linkRows.length > 0) {
    await supabase.from('ops_item_tags').insert(linkRows);
  }

  await supabase
    .from('ops_items')
    .update({ tags_cache: normalized, updated_at: nowIso() })
    .eq('id', itemId);
}

export async function createItemEvent(
  itemId: string,
  eventType: string,
  actor: AdminPrincipal | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('ops_item_events').insert({
    item_id: itemId,
    event_type: eventType,
    actor_uid: actor?.uid ?? null,
    actor_email: actor?.email ?? null,
    event_payload: payload,
  });
  if (error) throw error;
}

export async function upsertOpsItemFromSource(input: UpsertOpsItemInput): Promise<OpsItem> {
  const supabase = getSupabaseAdmin();

  const { data: existing, error: existingError } = await supabase
    .from('ops_items')
    .select('*, owner:ops_owners(id,email,display_name)')
    .eq('source_system', input.source_system)
    .eq('source_collection', input.source_collection)
    .eq('source_record_id', input.source_record_id)
    .maybeSingle();

  if (existingError) throw existingError;

  const incomingSeverity = input.severity || 'info';

  if (existing) {
    const currentSeverity = existing.severity as OpsSeverity;
    const nextSeverity = scoreSeverity(incomingSeverity) > scoreSeverity(currentSeverity)
      ? incomingSeverity
      : currentSeverity;

    const { data, error } = await supabase
      .from('ops_items')
      .update({
        title: input.title,
        summary: input.summary || null,
        source_url: input.source_url || null,
        severity: nextSeverity,
        normalized_payload: input.normalized_payload || {},
        raw_payload: input.raw_payload || {},
        last_seen_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq('id', existing.id)
      .select('*, owner:ops_owners(id,email,display_name)')
      .single();

    if (error) throw error;
    const mapped = mapItemRow(data);

    if (input.tags) {
      await setItemTags(supabase, mapped.id, input.tags);
      const refreshed = await getOpsItemById(mapped.id);
      if (refreshed) return refreshed;
    }

    return mapped;
  }

  const { data, error } = await supabase
    .from('ops_items')
    .insert({
      type: input.type,
      title: input.title,
      summary: input.summary || null,
      status: 'nieuw',
      priority: input.priority || 'medium',
      severity: incomingSeverity,
      source_system: input.source_system,
      source_collection: input.source_collection,
      source_record_id: input.source_record_id,
      source_url: input.source_url || null,
      normalized_payload: input.normalized_payload || {},
      raw_payload: input.raw_payload || {},
      first_seen_at: nowIso(),
      last_seen_at: nowIso(),
      sla_started_at: nowIso(),
      tags_cache: input.tags || [],
    })
    .select('*, owner:ops_owners(id,email,display_name)')
    .single();

  if (error) throw error;

  const mapped = mapItemRow(data);
  if (input.tags && input.tags.length > 0) {
    await setItemTags(supabase, mapped.id, input.tags);
    const refreshed = await getOpsItemById(mapped.id);
    if (refreshed) return refreshed;
  }

  await createItemEvent(mapped.id, 'item_created', null, {
    source_system: input.source_system,
    source_collection: input.source_collection,
    source_record_id: input.source_record_id,
  });

  return mapped;
}

export interface ListItemsFilters {
  type?: string;
  status?: string;
  priority?: string;
  owner?: string;
  source?: string;
  tag?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listOpsItems(filters: ListItemsFilters): Promise<{ items: OpsItem[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const page = Number.isFinite(filters.page) && (filters.page || 0) > 0 ? Number(filters.page) : 1;
  const pageSize = Number.isFinite(filters.pageSize) && (filters.pageSize || 0) > 0 ? Math.min(Number(filters.pageSize), 100) : 25;
  const fromOffset = (page - 1) * pageSize;
  const toOffset = fromOffset + pageSize - 1;

  let query = supabase
    .from('ops_items')
    .select('*, owner:ops_owners(id,email,display_name)', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(fromOffset, toOffset);

  if (filters.type) query = query.eq('type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.priority) query = query.eq('priority', filters.priority);
  if (filters.owner) query = query.eq('owner_id', filters.owner);
  if (filters.source) query = query.eq('source_system', filters.source);
  if (filters.tag) query = query.contains('tags_cache', [filters.tag]);
  if (filters.from) query = query.gte('created_at', filters.from);
  if (filters.to) query = query.lte('created_at', filters.to);
  if (filters.q) query = query.or(`title.ilike.%${filters.q}%,summary.ilike.%${filters.q}%`);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    items: (data || []).map(mapItemRow),
    total: count || 0,
  };
}

export async function getOpsItemById(id: string): Promise<OpsItem | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_items')
    .select('*, owner:ops_owners(id,email,display_name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapItemRow(data);
}

export async function getItemNotes(itemId: string): Promise<OpsItemNote[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_item_notes')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as OpsItemNote[];
}

export async function getItemEvents(itemId: string): Promise<OpsItemEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_item_events')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as OpsItemEvent[];
}

export async function getRedditDetailsForItem(itemId: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_reddit_complaints')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function getDataQualityDetailsForItem(itemId: string): Promise<Record<string, unknown> | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_data_quality_issues')
    .select('*')
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function addItemNote(itemId: string, note: string, actor: AdminPrincipal): Promise<OpsItemNote> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_item_notes')
    .insert({
      item_id: itemId,
      author_uid: actor.uid,
      author_email: actor.email,
      note,
    })
    .select('*')
    .single();
  if (error) throw error;

  await createItemEvent(itemId, 'note_added', actor, { note });
  return data as OpsItemNote;
}

interface PatchPayload {
  status?: OpsStatus;
  priority?: OpsPriority;
  severity?: OpsSeverity;
  ownerId?: string | null;
  tags?: string[];
  snoozedUntil?: string | null;
  resolution?: string | null;
}

export async function patchOpsItem(itemId: string, payload: PatchPayload, actor: AdminPrincipal): Promise<OpsItem> {
  const supabase = getSupabaseAdmin();

  const existing = await getOpsItemById(itemId);
  if (!existing) throw new Error('Item not found.');

  const patch: Record<string, unknown> = {
    updated_at: nowIso(),
  };

  if (payload.priority) patch.priority = payload.priority;
  if (payload.severity) patch.severity = payload.severity;
  if (Object.prototype.hasOwnProperty.call(payload, 'ownerId')) patch.owner_id = payload.ownerId ?? null;
  if (Object.prototype.hasOwnProperty.call(payload, 'snoozedUntil')) patch.snoozed_until = payload.snoozedUntil;
  if (Object.prototype.hasOwnProperty.call(payload, 'resolution')) patch.resolution = payload.resolution;

  if (payload.status) {
    patch.status = payload.status;

    if (!existing.sla_started_at) patch.sla_started_at = nowIso();

    if (payload.status === 'geblokkeerd') {
      patch.sla_paused_at = nowIso();
    } else if (!TERMINAL_STATUSES.includes(payload.status)) {
      patch.sla_paused_at = null;
    }

    if (TERMINAL_STATUSES.includes(payload.status)) {
      patch.sla_stopped_at = nowIso();
    } else {
      patch.sla_stopped_at = null;
    }
  }

  const { error } = await supabase
    .from('ops_items')
    .update(patch)
    .eq('id', itemId)
    .select('*, owner:ops_owners(id,email,display_name)')
    .single();

  if (error) throw error;

  if (payload.tags) {
    await setItemTags(supabase, itemId, payload.tags);
  }

  await createItemEvent(itemId, 'item_patched', actor, payload as Record<string, unknown>);

  const refreshed = await getOpsItemById(itemId);
  if (!refreshed) throw new Error('Updated item not found.');
  return refreshed;
}

export async function getDashboardMetrics(): Promise<Record<string, unknown>> {
  const supabase = getSupabaseAdmin();

  const [
    totalsResult,
    backlogResult,
    sourceResult,
    dailyResult,
  ] = await Promise.all([
    supabase.from('ops_items').select('status, type, created_at', { count: 'exact' }),
    supabase.from('ops_items').select('status, priority').not('status', 'in', '(opgelost,genegeerd)'),
    supabase.from('ops_items').select('source_system, status'),
    supabase.from('ops_dashboard_daily').select('*').order('day', { ascending: false }).limit(30),
  ]);

  if (totalsResult.error) throw totalsResult.error;
  if (backlogResult.error) throw backlogResult.error;
  if (sourceResult.error) throw sourceResult.error;
  if (dailyResult.error) throw dailyResult.error;

  const totalItems = totalsResult.count || 0;
  const openItems = (backlogResult.data || []).length;
  const criticalOpen = (backlogResult.data || []).filter((row) => row.priority === 'kritiek').length;

  const byType = (totalsResult.data || []).reduce<Record<string, number>>((acc, row) => {
    const key = row.type || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const sourceHealth = (sourceResult.data || []).reduce<Record<string, { total: number; open: number }>>((acc, row) => {
    const key = row.source_system || 'unknown';
    if (!acc[key]) acc[key] = { total: 0, open: 0 };
    acc[key].total += 1;
    if (!TERMINAL_STATUSES.includes(row.status as OpsStatus)) acc[key].open += 1;
    return acc;
  }, {});

  return {
    cards: {
      totalItems,
      openItems,
      criticalOpen,
      resolvedItems: totalItems - openItems,
    },
    byType,
    sourceHealth,
    trend: dailyResult.data || [],
  };
}

export async function upsertOwner(input: { firebase_uid?: string | null; email: string; display_name: string }): Promise<{ id: string; email: string; display_name: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_owners')
    .upsert(
      {
        firebase_uid: input.firebase_uid || null,
        email: input.email.toLowerCase(),
        display_name: input.display_name,
        active: true,
      },
      { onConflict: 'email' },
    )
    .select('id,email,display_name')
    .single();

  if (error) throw error;
  return data;
}

export async function listOwners(): Promise<Array<{ id: string; email: string; display_name: string }>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_owners')
    .select('id,email,display_name')
    .eq('active', true)
    .order('display_name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function upsertSyncCursor(input: {
  sourceKey: string;
  firestoreCollection: string;
  lastSeenCreatedAt: string | null;
  lastDocId: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('ops_source_sync_state').upsert(
    {
      source_key: input.sourceKey,
      firestore_collection: input.firestoreCollection,
      last_seen_created_at: input.lastSeenCreatedAt,
      last_doc_id: input.lastDocId,
      metadata: input.metadata || {},
      last_run_at: nowIso(),
    },
    { onConflict: 'source_key' },
  );
  if (error) throw error;
}

export async function getSyncCursor(sourceKey: string): Promise<{ last_seen_created_at: string | null; last_doc_id: string | null } | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ops_source_sync_state')
    .select('last_seen_created_at,last_doc_id')
    .eq('source_key', sourceKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function addIngestFailure(source: string, reason: string, payload: unknown): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('ops_ingest_failures').insert({
    source,
    reason,
    payload: payload && typeof payload === 'object' ? payload : { preview: String(payload ?? '') },
  });

  if (error) throw error;
}

export async function upsertRedditComplaintDetails(input: {
  itemId: string;
  subreddit: string;
  postId: string;
  commentId: string;
  author?: string | null;
  score?: number | null;
  customerStage?: string | null;
  painTopic?: string | null;
  sentiment?: string | null;
  urgencyScore?: number | null;
  sourceUrl?: string | null;
  postTitle?: string | null;
  postBody?: string | null;
  commentBody?: string | null;
  runId?: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('ops_reddit_complaints').upsert(
    {
      item_id: input.itemId,
      subreddit: input.subreddit,
      post_id: input.postId,
      comment_id: input.commentId,
      author: input.author || null,
      score: input.score ?? null,
      customer_stage: input.customerStage || null,
      pain_topic: input.painTopic || null,
      sentiment: input.sentiment || null,
      urgency_score: input.urgencyScore ?? null,
      source_url: input.sourceUrl || null,
      post_title: input.postTitle || null,
      post_body: input.postBody || null,
      comment_body: input.commentBody || null,
      run_id: input.runId || null,
      updated_at: nowIso(),
    },
    { onConflict: 'subreddit,post_id,comment_id' },
  );

  if (error) throw error;
}

export async function listRedditComplaints(filters: {
  painTopic?: string;
  sentiment?: string;
  subreddit?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: Record<string, unknown>[]; total: number }> {
  const supabase = getSupabaseAdmin();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const pageSize = filters.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, 100) : 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('ops_reddit_complaints')
    .select('*, ops_items!ops_reddit_complaints_item_id_fkey(id,title,status,priority,severity,tags_cache,created_at,updated_at)', {
      count: 'exact',
    })
    .order('updated_at', { ascending: false })
    .range(from, to);

  if (filters.painTopic) query = query.eq('pain_topic', filters.painTopic);
  if (filters.sentiment) query = query.eq('sentiment', filters.sentiment);
  if (filters.subreddit) query = query.eq('subreddit', filters.subreddit);

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: data || [], total: count || 0 };
}

export async function createDataQualityIssue(input: {
  checkKey: string;
  entityType: string;
  entityRef: string;
  failureReason: string;
  metadata?: Record<string, unknown>;
}): Promise<OpsItem> {
  const issueItem = await upsertOpsItemFromSource({
    type: 'data_quality_issue',
    title: `Data issue: ${input.checkKey}`,
    summary: input.failureReason,
    priority: 'hoog',
    severity: 'waarschuwing',
    source_system: 'ops_quality_engine',
    source_collection: input.entityType,
    source_record_id: `${input.checkKey}:${input.entityRef}`,
    normalized_payload: {
      check_key: input.checkKey,
      entity_type: input.entityType,
      entity_ref: input.entityRef,
      failure_reason: input.failureReason,
    },
    raw_payload: input.metadata || {},
    tags: ['data-quality'],
  });

  const supabase = getSupabaseAdmin();
  await supabase.from('ops_data_quality_issues').upsert(
    {
      item_id: issueItem.id,
      check_key: input.checkKey,
      entity_type: input.entityType,
      entity_ref: input.entityRef,
      failure_reason: input.failureReason,
      metadata: input.metadata || {},
      detected_at: nowIso(),
    },
    { onConflict: 'check_key,entity_type,entity_ref' },
  );

  return issueItem;
}
