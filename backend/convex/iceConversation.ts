import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireMembership } from './lib/auth';
import { citationArg } from './rag/conversationValidators';
import { tasklabsRateLimiter } from './lib/rateLimits';
import type { Id } from './_generated/dataModel';
import { ICE_ANSWER_MAX_CHARS } from './rag/providers';

const workspaceId = v.id('workspaces');

export const get = query({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const conversation = await ctx.db.query('iceConversations').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
  return { generation: conversation?.generation ?? 0 };
}});

export const list = query({ args: { workspaceId, generation: v.number(), paginationOpts: paginationOptsValidator }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const conversation = await ctx.db.query('iceConversations').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
  if (!conversation || conversation.generation !== args.generation) return { page: [], isDone: true, continueCursor: '' };
  return await ctx.db.query('iceTurns').withIndex('by_conversation_generation', q => q.eq('conversationId', conversation._id).eq('generation', conversation.generation)).order('desc').paginate(args.paginationOpts);
}});

export const begin = mutation({ args: { workspaceId, generation: v.number(), requestId: v.string(), question: v.string(), mode: v.union(v.literal('ask'), v.literal('retrieve')) }, handler: async (ctx, args): Promise<{ turnId: Id<'iceTurns'>; history: { role: 'user' | 'assistant'; text: string }[] }> => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  if (!args.question.trim() || args.question.length > 2000 || args.requestId.length > 100) throw new Error('Invalid conversation request');
  let conversation = await ctx.db.query('iceConversations').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
  if (!conversation) {
    if (args.generation !== 0) throw new Error('Conversation has changed. Please retry.');
    const id = await ctx.db.insert('iceConversations', { workspaceId: args.workspaceId, userId, generation: 0, updatedAt: Date.now() });
    conversation = await ctx.db.get(id);
  }
  if (!conversation || conversation.generation !== args.generation) throw new Error('Conversation was cleared. Please send a new message.');
  const duplicate = await ctx.db.query('iceTurns').withIndex('by_request', q => q.eq('conversationId', conversation!._id).eq('generation', args.generation).eq('requestId', args.requestId)).unique();
  if (duplicate) throw new Error('This message was already submitted. Its result is in your conversation.');
  const recent = await ctx.db.query('iceTurns').withIndex('by_conversation_generation', q => q.eq('conversationId', conversation!._id).eq('generation', args.generation)).order('desc').take(6);
  if (recent.some(turn => turn.status === 'pending' && turn._creationTime > Date.now() - 300_000)) throw new Error('Ice is still answering your previous message');
  await tasklabsRateLimiter.limit(ctx, 'ragQuery', { key: userId, throws: true });
  const turnId = await ctx.db.insert('iceTurns', { conversationId: conversation._id, generation: args.generation, requestId: args.requestId, question: args.question.trim(), mode: args.mode, status: 'pending', citations: [], empty: false });
  await ctx.scheduler.runAfter(300_000, internal.iceConversation.expire, { turnId });
  const history: { role: 'user' | 'assistant'; text: string }[] = [];
  for (const turn of recent.reverse()) {
    if (turn.status !== 'complete') continue;
    history.push({ role: 'user', text: turn.question.slice(0, 1000) });
    if (turn.answer) history.push({ role: 'assistant', text: turn.answer.slice(0, 1000) });
  }
  return { turnId, history };
}});

export const finish = mutation({ args: { workspaceId, turnId: v.id('iceTurns'), answer: v.optional(v.string()), citations: v.array(citationArg), empty: v.boolean(), error: v.optional(v.string()) }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const turn = await ctx.db.get(args.turnId);
  if (!turn) return { stored: false };
  const conversation = await ctx.db.get(turn.conversationId);
  if (!conversation || conversation.workspaceId !== args.workspaceId || conversation.userId !== userId) throw new Error('Forbidden');
  if (conversation.generation !== turn.generation || turn.status !== 'pending') return { stored: false };
  if (args.citations.length > 20) throw new Error('Too many citations');
  await ctx.db.patch(turn._id, { status: args.error ? 'error' : 'complete', answer: args.answer?.slice(0, ICE_ANSWER_MAX_CHARS), citations: args.citations, empty: args.empty, error: args.error?.slice(0, 300) });
  return { stored: true };
}});

export const clear = mutation({ args: { workspaceId, generation: v.number() }, handler: async (ctx, args): Promise<{ ok: boolean }> => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const conversation = await ctx.db.query('iceConversations').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
  if (!conversation) {
    await ctx.db.insert('iceConversations', { workspaceId: args.workspaceId, userId, generation: 1, updatedAt: Date.now() });
    return { ok: true };
  }
  if (conversation.generation !== args.generation) return { ok: true };
  await ctx.db.patch(conversation._id, { generation: conversation.generation + 1, updatedAt: Date.now() });
  await ctx.scheduler.runAfter(0, internal.iceConversation.purge, { conversationId: conversation._id, generation: conversation.generation });
  return { ok: true };
}});

export const purge = internalMutation({ args: { conversationId: v.id('iceConversations'), generation: v.number() }, handler: async (ctx, args): Promise<void> => {
  const rows = await ctx.db.query('iceTurns').withIndex('by_conversation_generation', q => q.eq('conversationId', args.conversationId).eq('generation', args.generation)).take(50);
  for (const row of rows) await ctx.db.delete(row._id);
  if (rows.length === 50) await ctx.scheduler.runAfter(0, internal.iceConversation.purge, args);
}});
export const expire = internalMutation({ args: { turnId: v.id('iceTurns') }, handler: async (ctx, args) => {
  const turn = await ctx.db.get(args.turnId);
  if (turn?.status === 'pending') await ctx.db.patch(turn._id, { status: 'error', error: 'The request timed out. Please try again.' });
}});
