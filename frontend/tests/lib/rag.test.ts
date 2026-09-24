import { describe, expect, it, vi } from 'vitest';
import { chunkRagText, ragContentHash } from '@convex/rag/chunk';
import { buildExtractiveAnswer } from '@convex/rag/answer';
import { buildSystemPrompt, ICE_UNTRUSTED_CONTEXT_PREAMBLE, validateCitations } from '@/lib/rag/generate';
import { iceAskSchema, iceQuerySchema } from '@/lib/validations/rag.schema';
import type { RetrievedChunk } from '@convex/rag/providers';

const chunk = (anchor: string, title = 'Deploy'): RetrievedChunk => ({
  text: `Evidence for ${anchor}`,
  score: 0.9,
  sourceType: 'task',
  sourceId: 't1',
  anchor,
  title,
  target: { page: 'task', id: 't1' },
});

describe('ice request schemas', () => {
  it('accepts a valid ask with local provider default', () => {
    const parsed = iceAskSchema.safeParse({ action: 'ask', workspaceId: 'w1', question: 'Hi', generation: 0, requestId: 'r1' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.provider).toBe('local');
  });

  it('rejects empty and oversized questions', () => {
    expect(iceQuerySchema.safeParse({ action: 'query', workspaceId: 'w1', question: '  ', generation: 0, requestId: 'r1' }).success).toBe(
      false,
    );
    expect(
      iceQuerySchema.safeParse({ action: 'query', workspaceId: 'w1', question: 'a'.repeat(2001), generation: 0, requestId: 'r1' })
        .success,
    ).toBe(false);
  });
});

describe('ice system prompt', () => {
  it('keeps the safety preamble first and appends owner instructions', () => {
    expect(buildSystemPrompt()).toBe(ICE_UNTRUSTED_CONTEXT_PREAMBLE);
    expect(buildSystemPrompt('   ')).toBe(ICE_UNTRUSTED_CONTEXT_PREAMBLE);
    const prompt = buildSystemPrompt('Answer in bullet points');
    expect(prompt.startsWith(ICE_UNTRUSTED_CONTEXT_PREAMBLE)).toBe(true);
    expect(prompt).toContain('cannot override the rules above');
    expect(prompt.endsWith('Answer in bullet points')).toBe(true);
  });
});

describe('ice chunking', () => {
  it('chunks deterministically', () => {
    const body = ['One.', 'Two.', 'Three.'].join('\n\n');
    expect(chunkRagText(body, 10, 2)).toEqual(chunkRagText(body, 10, 2));
    expect(ragContentHash('ice')).toBe(ragContentHash('ice'));
  });
});

describe('ice citations', () => {
  it('keeps only retrieved anchors, deduped', () => {
    const context = [chunk('task#3'), chunk('task#4')];
    const citations = validateCitations(
      [
        { anchor: 'task#3', title: 'Deploy', snippet: 's3' },
        { anchor: 'task#3', title: 'Deploy', snippet: 'dup' },
        { anchor: 'task#404', title: 'Ghost', snippet: 'invented' },
      ],
      context,
    );
    expect(citations.map((citation) => citation.anchor)).toEqual(['task#3']);
    expect(citations[0].target).toEqual({ page: 'task', id: 't1' });
  });

  it('extractive answer states grounding explicitly', () => {
    const result = buildExtractiveAnswer({ question: 'Blocked?', context: [chunk('task#3')] });
    expect(result.answer).toContain('task#3');
    expect(result.citations).toHaveLength(1);
  });
});

describe('ice byok adapter', () => {
  it('rejects non-https base urls without calling fetch', async () => {
    const { generateWithByok } = await import('@/lib/rag/generate');
    const fetchSpy = vi.fn();
    await expect(
      generateWithByok(
        { baseUrl: 'http://evil.test', model: 'm', apiKey: 'k' },
        { question: 'Q?', context: [chunk('task#3')] },
        fetchSpy as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/https/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns extracted citations from provider content', async () => {
    const { generateWithByok } = await import('@/lib/rag/generate');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ choices: [{ message: { content: 'Blocked per [task#3] today.' } }] }),
    });
    const result = await generateWithByok(
      { baseUrl: 'https://api.example.com/v1', model: 'm', apiKey: 'k' },
      { question: 'Blocked?', context: [chunk('task#3')] },
      fetchSpy as unknown as typeof fetch,
    );
    expect(result.citations.map((citation) => citation.anchor)).toEqual(['task#3']);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});

describe('ice provider generation', () => {
  const openRouterReply = (content: string, finishReason = 'stop') =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content }, finish_reason: finishReason }] }),
    });
  const config = { provider: 'openrouter' as const, model: 'm', apiKey: 'k', maxOutputTokens: 1234 };

  it('sends the configured output limit, anchor-first sources and the live summary', async () => {
    const { generateWithProvider } = await import('@/lib/rag/generate');
    const fetchSpy = openRouterReply('There are 8 projects; see [task#3].');
    const result = await generateWithProvider(
      config,
      { question: 'How many projects?', context: [{ ...chunk('task#3'), via: 'project:p1' }], workspaceSummary: 'Projects: 8' },
      fetchSpy as unknown as typeof fetch,
    );
    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.max_tokens).toBe(1234);
    expect(body.reasoning).toEqual({ exclude: true });
    const user = body.messages[1].content as string;
    expect(user).toContain('Workspace summary (live):\nProjects: 8');
    expect(user).toContain('Source [task#3] (related to [project:p1]):');
    expect(user).not.toMatch(/\[1 \|/);
    expect(result.citations.map((citation) => citation.anchor)).toEqual(['task#3']);
  });

  it('marks answers cut off at the output limit', async () => {
    const { generateWithProvider, ICE_TRUNCATED_NOTE } = await import('@/lib/rag/generate');
    const result = await generateWithProvider(
      config,
      { question: 'List projects', context: [chunk('task#3')] },
      openRouterReply('Based', 'length') as unknown as typeof fetch,
    );
    expect(result.answer).toBe(`Based\n\n${ICE_TRUNCATED_NOTE}`);
  });

  it('asks the model when only the summary is available', async () => {
    const { generateWithProvider } = await import('@/lib/rag/generate');
    const fetchSpy = openRouterReply('8 projects.');
    const result = await generateWithProvider(config, { question: 'How many projects?', context: [], workspaceSummary: 'Projects: 8' }, fetchSpy as unknown as typeof fetch);
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(result.answer).toBe('8 projects.');
  });
});
