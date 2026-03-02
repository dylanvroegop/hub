import { NextRequest } from 'next/server';

import { handleRouteError, jsonError, jsonOk } from '@/lib/api';
import { addIngestFailure, createItemEvent, upsertOpsItemFromSource, upsertRedditComplaintDetails } from '@/lib/ops-db';
import { readSignedPayload } from '@/lib/ingest-auth';
import { ingestRedditComplaintSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function shorten(message: string, max = 100): string {
  if (message.length <= max) return message;
  return `${message.slice(0, max - 1)}…`;
}

export async function POST(request: NextRequest) {
  try {
    const { payload } = await readSignedPayload(request);
    const parsed = ingestRedditComplaintSchema.safeParse(payload);

    if (!parsed.success) {
      await addIngestFailure('reddit_complaints', 'invalid_payload', {
        errors: parsed.error.flatten(),
      });
      return jsonError('Payload validatie mislukt.', 400, parsed.error.flatten());
    }

    const { source, runId, post, comment, enrichment } = parsed.data;

    const subreddit = text(post.subreddit) || text(comment.subreddit) || 'unknown';
    const postId = text(post.id) || text(post.post_id) || text(post.reddit_post_id) || 'unknown-post';
    const commentId = text(comment.id) || text(comment.comment_id) || text(comment.reddit_comment_id) || 'unknown-comment';

    const commentBody = text(comment.body) || text(comment.text) || '';
    const postTitle = text(post.title) || 'Reddit klacht';
    const sourceUrl = text(comment.permalink) || text(post.permalink) || text(post.url);

    const painTopic = text(enrichment.pain_topic) || text(enrichment.topic) || 'overig';
    const sentiment = text(enrichment.sentiment) || 'negatief';
    const urgency = numberValue(enrichment.urgency_score) ?? 0;

    const item = await upsertOpsItemFromSource({
      type: 'reddit_complaint',
      title: `Reddit klacht (${subreddit}): ${shorten(postTitle, 90)}`,
      summary: shorten(commentBody || postTitle, 280),
      priority: urgency >= 8 ? 'hoog' : 'medium',
      severity: urgency >= 8 ? 'error' : 'waarschuwing',
      source_system: source || 'n8n_reddit',
      source_collection: 'reddit_complaints',
      source_record_id: `${subreddit}:${postId}:${commentId}`,
      source_url: sourceUrl,
      normalized_payload: {
        runId,
        subreddit,
        postId,
        commentId,
        painTopic,
        sentiment,
        urgency,
      },
      raw_payload: {
        post,
        comment,
        enrichment,
      },
      tags: ['reddit', 'complaint', painTopic, sentiment],
    });

    await upsertRedditComplaintDetails({
      itemId: item.id,
      subreddit,
      postId,
      commentId,
      author: text(comment.author) || text(post.author),
      score: numberValue(comment.score) ?? numberValue(post.score),
      customerStage: text(enrichment.customer_stage) || 'non_customer',
      painTopic,
      sentiment,
      urgencyScore: urgency,
      sourceUrl,
      postTitle,
      postBody: text(post.selftext) || text(post.body),
      commentBody,
      runId,
    });

    await createItemEvent(item.id, 'reddit_ingested', null, {
      runId,
      subreddit,
      postId,
      commentId,
    });

    return jsonOk({ ok: true, itemId: item.id, sourceKey: `${subreddit}:${postId}:${commentId}` });
  } catch (error) {
    return handleRouteError(error);
  }
}
