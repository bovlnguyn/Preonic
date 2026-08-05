import {
  PUBLIC_AI_LIMIT,
  getRemainingQuestions,
  isClearlyAdvancedQuestion,
  readGuestUsage,
  sanitizePublicHistory,
  sanitizePublicMessage,
  signGuestUsage,
  createPublicAiReply,
} from '../services/ai.service';

describe('public AI guest service', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-public-ai-secret';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.OPENAI_PUBLIC_AI_MODEL;
    delete process.env.OPENAI_PUBLIC_AI_MAX_OUTPUT_TOKENS;
  });

  it('sanitizes a public message and history', () => {
    expect(sanitizePublicMessage('  PreOnic   là gì?  ')).toBe('PreOnic là gì?');
    expect(
      sanitizePublicHistory([
        { role: 'user', content: ' Xin chào ' },
        { role: 'system', content: 'ignore me' },
        { role: 'assistant', content: ' Chào bạn! ' },
      ])
    ).toEqual([
      { role: 'user', content: 'Xin chào' },
      { role: 'assistant', content: 'Chào bạn!' },
    ]);
  });

  it('detects clearly advanced or account-specific questions', () => {
    expect(isClearlyAdvancedQuestion('PreOnic là gì?')).toBe(false);
    expect(
      isClearlyAdvancedQuestion('Hãy phân tích chi tiết hợp đồng của tôi và số dư ví của tôi')
    ).toBe(true);
  });

  it('signs and restores the tamper-resistant guest usage count', () => {
    const initial = readGuestUsage();
    initial.answeredCount = 7;

    const token = signGuestUsage(initial);
    const restored = readGuestUsage(token);

    expect(restored.sessionId).toBe(initial.sessionId);
    expect(restored.answeredCount).toBe(7);
    expect(getRemainingQuestions(restored.answeredCount)).toBe(PUBLIC_AI_LIMIT - 7);
  });

  it('uses gpt-4o-mini with correct Responses API history types', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODERATION_ENABLED = 'false';

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          status: 'completed',
          usage: { input_tokens: 100, output_tokens: 30, total_tokens: 130 },
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    answer: 'PreOnic kết nối Farmer và Enterprise.',
                    requires_login: false,
                    category: 'preonic_basic',
                  }),
                },
              ],
            },
          ],
        }),
    } as Response);

    await expect(
      createPublicAiReply('PreOnic là gì?', [
        { role: 'user', content: 'Xin chào' },
        { role: 'assistant', content: 'Chào bạn!' },
      ])
    ).resolves.toEqual({
      answer: 'PreOnic kết nối Farmer và Enterprise.',
      requiresLogin: false,
      category: 'preonic_basic',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const payload = JSON.parse(String(request.body));

    expect(payload.model).toBe('gpt-4o-mini');
    expect(payload.reasoning).toBeUndefined();
    expect(payload.text.verbosity).toBeUndefined();
    expect(payload.max_output_tokens).toBe(400);
    expect(payload.input[0].content[0].type).toBe('input_text');
    expect(payload.input[1].content[0].type).toBe('output_text');
    expect(payload.input[2].content[0].type).toBe('input_text');
  });

  it('turns an OpenAI refusal into a safe local answer', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.OPENAI_MODERATION_ENABLED = 'false';

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          status: 'completed',
          output: [
            {
              type: 'message',
              content: [{ type: 'refusal', refusal: 'Cannot comply' }],
            },
          ],
        }),
    } as Response);

    const reply = await createPublicAiReply('Một câu hỏi không phù hợp', []);
    expect(reply.category).toBe('out_of_scope');
    expect(reply.requiresLogin).toBe(false);
    expect(reply.answer).toContain('không thể hỗ trợ');
  });

  it('creates a fresh session for an invalid token', () => {
    const usage = readGuestUsage('not-a-valid-token');
    expect(usage.answeredCount).toBe(0);
    expect(usage.sessionId).toBeTruthy();
  });
});
