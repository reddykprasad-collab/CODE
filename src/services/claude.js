import Constants from 'expo-constants';

// SECURITY: This key lives in the app bundle and is visible to anyone who extracts
// the APK or IPA. Before shipping to production, move all Claude API calls to a
// server-side proxy and remove the key from the client entirely.
const API_KEY = Constants.expoConfig?.extra?.claudeApiKey || '';

const SYSTEM_PROMPT = `You are a migraine companion assistant providing general health education. You are not a medical professional and cannot provide medical advice.

HARD RULES (no exceptions):
1. Never mention specific medication brand names (e.g. Nurtec, Ubrelvy, Aimovig, Emgality, Ajovy, Qulipta, or any other branded product)
2. Never provide dosing instructions or schedules
3. Never diagnose medical conditions
4. Never make specific treatment efficacy claims
5. SAFETY ESCALATION: If the user describes "worst headache of their life," sudden severe neurological symptoms, vision loss, paralysis, chest pain, or suicidal thoughts, respond with exactly this and nothing else: "ESCALATION"
6. Always recommend consulting a healthcare provider for any medical decisions
7. Keep responses warm, supportive, and concise: 3 to 5 sentences per response, no longer
8. You can discuss: migraine types and triggers, CGRP as a treatment class (not specific products), general disease education, realistic treatment timelines, the importance of symptom tracking, and emotional support around living with chronic migraines
9. For cost or access questions: acknowledge the challenge and mention that patient assistance programs often exist, then suggest asking their doctor or pharmacist
10. This app is unbranded and disease-state only. Never imply or suggest any specific product

Your tone is warm and direct, like a knowledgeable friend who genuinely cares but knows their limits. Never clinical, never dismissive, never overly cautious to the point of being unhelpful.

ORCHESTRATION CONTEXT RULES (when a context update is prepended to the conversation):
- Orchestration context is background information only. It does not override what the patient says or asks.
- In at_risk or struggling phases, prioritize listening and routing to their care team over proactive reinforcement or timeline-normalization.
- Never use orchestration context to steer toward a clinical conclusion the patient has not raised themselves.`;

// Two-layer sanitization for any user-sourced text entering the system prompt.
// Layer 1: allowlist strips syntax chars. Layer 2: deny-pattern rejects semantic injection
// ("ignore all rules" passes a character allowlist but fails a keyword scan).
// TR-8: uses literal space [ ] not \s — \s passes Unicode non-breaking spaces.
const _INJECTION_DENY = /\b(ignore|disregard|forget|override|system|instruction|rules?|prompt|assistant|user)\b/i;

function _sanitizeTrigger(t) {
  const clean = String(t).replace(/[^a-zA-Z0-9 '\-.,]/g, '').trim().slice(0, 20);
  return clean && !_INJECTION_DENY.test(clean) ? clean : null;
}

function _sanitizeTriggers(triggers) {
  return triggers.map(_sanitizeTrigger).filter(Boolean);
}

const ADHERENCE_ADDITIONS = `

ADHERENCE CONTEXT (this patient is currently on preventive migraine treatment):
- Preventive therapies typically take 3–6 months to show full effect. Normalize early discouragement and emphasize that consistency matters more than early symptom changes.
- Acknowledge dose streaks and treatment duration when relevant — sustained effort is meaningful.
- When the patient reports a difficult week, provide perspective: one bad week does not indicate treatment failure. Encourage them to track patterns over months, not individual days.
- If they ask whether the treatment is working, acknowledge it is a fair question, explain the typical timeline without making efficacy claims, and encourage them to bring their logged data to their next HCP visit.
- Reference their journal data naturally when it adds context — do not recite numbers verbatim, use them to personalize your response.`;

export function buildAwarenessContext(entries) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recent = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);

  if (recent.length === 0) return '';

  const migraineDays = new Set(recent.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())).size;
  const severities = recent.filter(e => e.hadMigraine && e.severity).map(e => e.severity);
  const avgSev = severities.length > 0 ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1) : null;

  const triggerCounts = {};
  recent.forEach(e => (e.triggers || []).forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; }));
  const topTriggers = _sanitizeTriggers(
    Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
  );

  const parts = [`Past 30 days: ${migraineDays} migraine day${migraineDays === 1 ? '' : 's'} (${recent.length} entries logged)`];
  if (avgSev) parts.push(`Average severity on migraine days: ${avgSev}/10`);
  if (topTriggers.length > 0) parts.push(`Common triggers: ${topTriggers.join(', ')}`);
  if (migraineDays >= 4) parts.push('Note: frequency is at a level where preventive therapy candidacy is worth discussing with a doctor.');

  return `\n\nAWARENESS CONTEXT (this patient is exploring their options, not yet on preventive treatment):\n- Focus on education, pattern recognition, and preparing for HCP conversations.\n- If their migraine frequency is high, gently note that this may be worth discussing with a doctor.\n- Do not push any particular treatment path.\n\nPATIENT DATA:\n<patient_data>\n${parts.join('\n')}\n</patient_data>`;
}

export function buildAdherenceContext(entries, streak, treatmentStartISO, midasScores = []) {
  const parts = [];

  if (treatmentStartISO) {
    const daysOnTreatment = Math.floor((Date.now() - new Date(treatmentStartISO)) / 864e5);
    parts.push(`Treatment duration: ${daysOnTreatment} day${daysOnTreatment === 1 ? '' : 's'}`);
  }

  parts.push(`Dose streak: ${streak.count} consecutive dose${streak.count === 1 ? '' : 's'} confirmed`);

  if (midasScores.length > 0) {
    const latest = midasScores[0];
    parts.push(`MIDAS score (latest): ${latest.total} — ${latest.label} disability (taken ${new Date(latest.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`);
    if (midasScores.length >= 2) {
      const prev = midasScores[1];
      const delta = latest.total - prev.total;
      parts.push(`MIDAS trend: ${delta < 0 ? `improved by ${Math.abs(delta)} points` : delta > 0 ? `increased by ${delta} points` : 'unchanged'} vs prior assessment`);
    }
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent = entries.filter(e => new Date(e.date) >= sevenDaysAgo);

  if (recent.length > 0) {
    const migraineDays = recent.filter(e => e.hadMigraine).length;
    parts.push(`Past 7 days: ${migraineDays} migraine day${migraineDays === 1 ? '' : 's'} (${recent.length} entries logged)`);

    const severities = recent.filter(e => e.hadMigraine && e.severity).map(e => e.severity);
    if (severities.length > 0) {
      const avg = (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1);
      parts.push(`Average severity on migraine days: ${avg}/10`);
    }

    const triggerCounts = {};
    recent.forEach(e => (e.triggers || []).forEach(t => { triggerCounts[t] = (triggerCounts[t] || 0) + 1; }));
    const topTriggers = _sanitizeTriggers(
      Object.entries(triggerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)
    );
    if (topTriggers.length > 0) parts.push(`Common triggers this week: ${topTriggers.join(', ')}`);
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const monthEntries = entries.filter(e => new Date(e.date) >= thirtyDaysAgo);
  if (monthEntries.length >= 5) {
    const monthMigraineDays = new Set(
      monthEntries.filter(e => e.hadMigraine).map(e => new Date(e.date).toDateString())
    ).size;
    parts.push(`Past 30 days: ${monthMigraineDays} migraine day${monthMigraineDays === 1 ? '' : 's'}`);
  }

  return `${ADHERENCE_ADDITIONS}\n\nPATIENT DATA (personalize responses using this — do not quote numbers unless directly relevant):\n<patient_data>\n${parts.join('\n')}\n</patient_data>`;
}

// Wraps the system prompt in cached format. The system prompt is large and constant
// across all calls, so caching it saves tokens on every subsequent turn.
function buildSystemPayload(extraContext) {
  const text = extraContext ? `${SYSTEM_PROMPT}${extraContext}` : SYSTEM_PROMPT;
  return [{ type: 'text', text, cache_control: { type: 'ephemeral' } }];
}

// Injects orchestration context as a synthetic assistant turn prepended to the
// messages array. This keeps the system prompt fingerprint constant (cache hit)
// while giving the AI per-session behavioral guidance.
// TR-3: only inject when messages.length > 0 (API requires first turn = user).
function _injectOrchestrationContext(messages, orchestrationContext) {
  if (!orchestrationContext || messages.length === 0) return messages;
  return [
    { role: 'user', content: 'Please note the following context for our conversation.' },
    { role: 'assistant', content: orchestrationContext },
    ...messages,
  ];
}

export async function sendMessage(messages, extraSystemContext = null) {
  if (!API_KEY || API_KEY === 'your_claude_api_key_here') {
    return {
      role: 'assistant',
      content: 'The AI companion is not configured yet. Add your Claude API key to the .env file to enable chat.',
    };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: buildSystemPayload(extraSystemContext),
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return { role: 'assistant', content: data.content[0].text };
}

export async function sendMessageStreaming(messages, extraSystemContext, orchestrationContext, onChunk) {
  if (!API_KEY || API_KEY === 'your_claude_api_key_here') {
    const msg = 'The AI companion is not configured yet. Add your Claude API key to the .env file to enable chat.';
    onChunk(msg);
    return msg;
  }

  // Anthropic requires the first message to be a user turn.
  // Strip any leading assistant messages (e.g. the in-app welcome message).
  const mapped = messages.map(m => ({ role: m.role, content: m.content }));
  const firstUserIdx = mapped.findIndex(m => m.role === 'user');
  const trimmed = firstUserIdx > 0 ? mapped.slice(firstUserIdx) : mapped;
  const apiMessages = _injectOrchestrationContext(trimmed, orchestrationContext);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      stream: true,
      system: buildSystemPayload(extraSystemContext),
      messages: apiMessages,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  // React Native's fetch does not expose ReadableStream reliably across all versions.
  // Buffer the full SSE response then parse lines — onChunk is called with each
  // accumulated partial so the UI still shows progressive text as chunks arrive.
  const text = await response.text();
  const lines = text.split('\n');
  let full = '';

  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') break;
    try {
      const parsed = JSON.parse(data);
      if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
        full += parsed.delta.text;
        onChunk(full);
      }
    } catch {}
  }

  // Fall back to non-streaming JSON if SSE parsing produced nothing
  if (!full) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.content?.[0]?.text) {
        full = parsed.content[0].text;
        onChunk(full);
      }
    } catch {}
  }

  return full;
}

export const isDemoMode = !API_KEY || API_KEY === 'your_claude_api_key_here';

export function isEscalation(text) {
  return text.trim() === 'ESCALATION';
}

export const ESCALATION_MESSAGE = {
  role: 'assistant',
  content: 'ESCALATION_UI',
};
