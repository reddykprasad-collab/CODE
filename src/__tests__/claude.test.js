jest.mock('expo-constants', () => ({
  default: { expoConfig: { extra: { claudeApiKey: 'test-key-123' } } },
  expoConfig: { extra: { claudeApiKey: 'test-key-123' } },
}));

global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

const { sendMessage, isEscalation } = require('../services/claude');

// ─── isEscalation ─────────────────────────────────────────────────────────────

describe('isEscalation', () => {
  it('returns true for exact ESCALATION string', () => {
    expect(isEscalation('ESCALATION')).toBe(true);
  });

  it('returns false when ESCALATION appears with extra text (exact match only)', () => {
    expect(isEscalation('ESCALATION needed here')).toBe(false);
  });

  it('returns false for normal responses', () => {
    expect(isEscalation('Migraines can be managed with preventive therapy.')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isEscalation('')).toBe(false);
  });

  it('is case-sensitive — lowercase does not trigger', () => {
    expect(isEscalation('escalation')).toBe(false);
  });
});

// ─── sendMessage ──────────────────────────────────────────────────────────────

describe('sendMessage', () => {
  const messages = [{ role: 'user', content: 'What is a CGRP?' }];

  it('returns assistant message from API response', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: 'CGRP stands for calcitonin gene-related peptide.' }],
      }),
    });

    const result = await sendMessage(messages);
    expect(result.role).toBe('assistant');
    expect(result.content).toBe('CGRP stands for calcitonin gene-related peptide.');
  });

  it('calls the Anthropic API endpoint', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: 'Test response' }] }),
    });

    await sendMessage(messages);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('throws on API error response', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    });

    await expect(sendMessage(messages)).rejects.toThrow('API error 401');
  });

  it('throws on network failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(sendMessage(messages)).rejects.toThrow('Network error');
  });

  it('sends ESCALATION_UI messages through as-is (filtering is caller responsibility)', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: [{ text: 'Safe response' }] }),
    });

    const msgsWithEscalation = [
      { role: 'user', content: 'I want to hurt myself' },
      { role: 'assistant', content: 'ESCALATION_UI' },
      { role: 'user', content: 'I am okay now' },
    ];

    await sendMessage(msgsWithEscalation);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.messages).toHaveLength(3);
  });
});
