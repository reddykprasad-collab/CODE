import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { sendMessageStreaming, isEscalation, buildAdherenceContext, buildAwarenessContext, isDemoMode } from '../services/claude';
import { INTERVENTION_CONTEXTS } from '../services/orchestration';
import { getChatMessages, saveChatMessages, getUserPath, getJournalEntries, getStreak, getTreatmentStartDate, getMidasScores } from '../services/storage';
import { colors, fonts, spacing, radius, textSize } from '../theme';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { EVENTS } from '../services/orchestration';

const WELCOME_DEFAULT = {
  role: 'assistant',
  content: "Hello! I'm here to help you understand your migraines and navigate your options. What's on your mind today?",
};

const WELCOME_ADHERENCE = {
  role: 'assistant',
  content: "Hello! I'm here to support you through your treatment journey. Ask me anything about managing migraines, what to expect from preventive therapy, or how to make the most of your next doctor visit.",
};

const PROMPT_CHIPS = [
  'What triggers should I be aware of?',
  "I'm having trouble staying consistent with my medication",
  'Help me prepare for my next doctor visit',
];

const DEMO_FLOWS = {
  'What triggers should I be aware of?': {
    response: "Common triggers include changes in sleep, skipping meals, stress, bright lights, strong scents, and weather shifts. Everyone's pattern is different — your journal is the best way to spot yours over time. Have you noticed anything that tends to come before an attack?",
    chips: ['Yes, stress seems to be a big one', "I haven't started tracking yet", 'What foods should I watch?'],
  },
  'Yes, stress seems to be a big one': {
    response: "Stress is one of the most frequently reported triggers — partly because it's hard to avoid entirely. Consistent sleep, regular meals, and short breaks during high-pressure stretches all help. The Journal tab can help you confirm the pattern over several weeks.",
    chips: ['What about sleep?', 'Any quick stress relief tips?', 'How long until I see a pattern?'],
  },
  "I haven't started tracking yet": {
    response: "Starting is the hardest part. Even logging just whether you had a migraine and one notable thing from that day builds a useful picture after a few weeks. The Journal tab makes it quick — under a minute per entry.",
    chips: ['What should I track?', 'How long until I see patterns?'],
  },
  'What foods should I watch?': {
    response: "Aged cheeses, red wine, processed meats, and foods with MSG or artificial sweeteners are commonly reported triggers. That said, food sensitivity is personal — what affects one person may not affect you. The best approach is logging meals around the time of an attack and watching for repeats.",
    chips: ['What about caffeine?', 'Should I do an elimination diet?'],
  },
  'What about caffeine?': {
    response: "Caffeine is a double-edged trigger. Too much can provoke migraines; too little — if you're used to it — can cause withdrawal headaches. Consistency matters more than cutting it out entirely. Keeping your daily intake steady tends to help more than going cold turkey.",
    chips: ['Got it', 'What else should I avoid?'],
  },
  'What about sleep?': {
    response: "Sleep irregularity is a major trigger for many people — both too little and too much. Keeping a consistent wake time even on weekends is often more protective than trying to get more total sleep. Even a 30-minute shift can be enough to set off an attack in sensitive people.",
    chips: ['How many hours is ideal?', 'What if I work shifts?'],
  },
  'How long until I see a pattern?': {
    response: "Most people start to see meaningful patterns after 4 to 6 weeks of consistent logging. It helps to log even on days without migraines — the contrast is often where the signal shows up.",
    chips: ['Got it', 'What should I track?'],
  },
  'What should I track?': {
    response: "The most useful things to log: whether you had a migraine, severity from 1 to 10, how long it lasted, potential triggers (sleep, stress, food, weather), and any medication you took. You don't need all of it every day — even partial entries are useful.",
    chips: ['Got it', 'Help me prepare for my next doctor visit'],
  },
  "I'm having trouble staying consistent with my medication": {
    response: "That's really common, and it's worth figuring out what's getting in the way. Whether it's forgetting, side effects, or doubting whether it's working — each has a different fix. What's making it hardest right now?",
    chips: ['I keep forgetting to take it', "I'm not sure it's working", 'Side effects are bothering me'],
  },
  'I keep forgetting to take it': {
    response: "Linking your dose to something you already do without thinking — morning coffee, brushing teeth — tends to work better than relying on memory alone. The Reminders tab can also send a daily nudge at whatever time fits your routine.",
    chips: ['How do I set a reminder?', 'What if I miss a dose?'],
  },
  "I'm not sure it's working": {
    response: "Preventive therapies typically take 3 to 6 months to show their full effect — which is a long time to wait when you're not feeling different yet. The most useful thing you can do now is keep logging consistently so you can bring real data to your doctor and have a grounded conversation about whether to adjust.",
    chips: ['How do I talk to my doctor about this?', 'What counts as the treatment working?'],
  },
  'Side effects are bothering me': {
    response: "Side effects are worth taking seriously — they're one of the most common reasons people stop treatment before it has a chance to work. Please talk to your doctor before stopping on your own. Some effects ease up after the first few weeks; others signal a need to adjust the dose or try a different option.",
    chips: ['What should I tell my doctor?', 'Are side effects normal early on?'],
  },
  'What counts as the treatment working?': {
    response: "Typically, a meaningful reduction in migraine frequency — fewer days per month, shorter attacks, or migraines that are easier to treat. Your doctor may have a specific target based on your baseline. Bringing your logged data to appointments makes this conversation much more concrete.",
    chips: ['Help me prepare for my next doctor visit', 'Got it'],
  },
  'Help me prepare for my next doctor visit': {
    response: "The most useful things to bring are your migraine frequency, severity, attack duration, what you've tried, and any patterns you've noticed. Your journal data covers most of that. When is your appointment?",
    chips: ['What questions should I ask?', "It's coming up soon", 'What is HCP Prep?'],
  },
  'What questions should I ask?': {
    response: "Good ones: How long before we know if this is working? What should I do on a difficult week? Are there lifestyle changes that would help? What's the plan if this doesn't work? Writing them down before you go makes it much easier to remember in the moment.",
    chips: ['How do I prepare my symptom summary?', "It's coming up soon"],
  },
  "It's coming up soon": {
    response: "Take a few minutes to review your recent journal entries — look for your worst days, any patterns, and side effects worth mentioning. The HCP Prep tool in the Tools tab can pull that into a one-page summary you can hand directly to your doctor.",
    chips: ['What is HCP Prep?', 'What if I forget something during the visit?'],
  },
  'What is HCP Prep?': {
    response: "HCP Prep pulls your logged migraine history into a one-page summary built for a doctor's appointment. It covers frequency, severity, triggers, and treatment notes — formatted so your provider can scan it quickly. You'll find it in the Tools tab.",
    chips: ['Got it', 'What questions should I ask?'],
  },
  'What if I forget something during the visit?': {
    response: "It happens to everyone. A short written list — even in your phone notes — keeps the most important points in front of you. Bringing a family member or friend can also help catch things you miss in the moment.",
    chips: ['Got it', 'What questions should I ask?'],
  },
  'Got it': {
    response: "Happy to help. Feel free to ask anything else about managing your migraines or preparing for care.",
    chips: ['What triggers should I be aware of?', 'Help me prepare for my next doctor visit'],
  },
};

function RetryBubble({ onRetry }) {
  return (
    <View style={styles.retryBubble}>
      <Text style={styles.retryText}>Connection failed. Your message was sent but didn't get a response.</Text>
      <TouchableOpacity
        onPress={onRetry}
        style={styles.retryBtn}
        accessibilityRole="button"
        accessibilityLabel="Retry sending message"
      >
        <Feather name="rotate-ccw" size={13} color={colors.lav} />
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EscalationBubble() {
  return (
    <View style={styles.escalationCard}>
      <Text style={styles.escalationTitle}>⚠ This sounds serious</Text>
      <Text style={styles.escalationBody}>
        If you are experiencing a medical emergency, call 911 or go to your nearest emergency room right away.
      </Text>
      <TouchableOpacity
        onPress={() => Linking.openURL('tel:988')}
        style={styles.crisisBtn}
        accessibilityRole="link"
        accessibilityLabel="Call or text 988: Crisis Lifeline"
      >
        <Text style={styles.crisisBtnText}>Call or text 988: Crisis Lifeline</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => Linking.openURL('sms:741741&body=HOME')}
        style={styles.crisisLinkBtn}
        accessibilityRole="link"
        accessibilityLabel="Text HOME to 741741: Crisis Text Line"
      >
        <Text style={styles.crisisLink}>Text HOME to 741741: Crisis Text Line</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ChatScreen() {
  const { emitEvent, interventionQueue } = useOrchestration();
  const orchestrationContext = useMemo(() => {
    const item = interventionQueue.find(i => i.channel?.includes('chat_context'));
    return item ? (INTERVENTION_CONTEXTS[item.type] ?? null) : null;
  }, [interventionQueue]);
  const [messages, setMessages] = useState(null);
  const [userPath, setUserPath] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState(null);
  const [demoChips, setDemoChips] = useState(PROMPT_CHIPS);
  const [journalContext, setJournalContext] = useState(null);
  const scrollRef = useRef(null);
  const messagesRef = useRef(messages);

  const isEscalated = useMemo(
    () => messages ? messages.some(m => m.content === 'ESCALATION_UI') : false,
    [messages]
  );

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // Load messages and user path once on mount
  useEffect(() => {
    (async () => {
      try {
        const [saved, path] = await Promise.all([getChatMessages(), getUserPath()]);
        setUserPath(path);
        if (saved && saved.length > 0) {
          setMessages(saved);
        } else if (path === 'adherence') {
          setMessages([{ ...WELCOME_ADHERENCE, timestamp: Date.now() }]);
        } else {
          setMessages([{ ...WELCOME_DEFAULT, timestamp: Date.now() }]);
        }
      } catch (err) {
        if (__DEV__) console.warn('ChatScreen init:', err);
        setMessages([{ ...WELCOME_DEFAULT, timestamp: Date.now() }]);
      }
    })();
  }, []);

  // Refresh journal context each time the tab comes into focus
  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const path = userPath ?? await getUserPath();
        if (path === 'adherence') {
          const [entries, streak, treatmentStart, midasScores] = await Promise.all([
            getJournalEntries(),
            getStreak(),
            getTreatmentStartDate(),
            getMidasScores(),
          ]);
          setJournalContext(buildAdherenceContext(entries, streak, treatmentStart, midasScores));
        } else {
          const entries = await getJournalEntries();
          const ctx = buildAwarenessContext(entries);
          if (ctx) setJournalContext(ctx);
        }
      } catch (err) {
        if (__DEV__) console.warn('ChatScreen context refresh:', err);
      }
    })();
  }, [userPath]));

  useEffect(() => {
    if (messages !== null) saveChatMessages(messages);
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading, streamingContent]);

  const _DOUBT_RE = /\b(not (sure|working|helping|effective)|doesn'?t (seem|work|help)|giving up|stop (taking|treatment)|side effect|doesn'?t feel|not feel(ing)?|no (difference|change|effect))\b/i;

  async function dispatchMessage(msgHistory) {
    setLoading(true);
    setStreamingContent('');
    try {
      const full = await sendMessageStreaming(msgHistory, journalContext, orchestrationContext, (partial) => {
        setStreamingContent(partial);
        setLoading(false);
      });
      setStreamingContent(null);
      if (isEscalation(full)) {
        emitEvent(EVENTS.ESCALATION_DETECTED, {});
        setMessages(prev => [...prev.filter(m => m.content !== 'RETRY_UI'), { role: 'assistant', content: 'ESCALATION_UI', timestamp: Date.now() }]);
      } else {
        // Detect doubt signal from user's last message
        const lastUser = [...msgHistory].reverse().find(m => m.role === 'user');
        if (lastUser && _DOUBT_RE.test(lastUser.content)) {
          emitEvent(EVENTS.CHAT_SIGNAL_DETECTED, { signal: 'doubt' });
        }
        setMessages(prev => [...prev.filter(m => m.content !== 'RETRY_UI'), { role: 'assistant', content: full, timestamp: Date.now() }]);
      }
    } catch {
      setStreamingContent(null);
      setMessages(prev => [...prev.filter(m => m.content !== 'RETRY_UI'), { role: 'assistant', content: 'RETRY_UI', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || isEscalated) return;
    if (isDemoMode) {
      setInput('');
      const userMsg = { role: 'user', content: text, timestamp: Date.now() };
      setMessages(prev => [...(prev || []), userMsg]);
      setLoading(true);
      setStreamingContent('');
      setTimeout(() => {
        const flow = DEMO_FLOWS[text];
        const aiContent = flow
          ? flow.response
          : "I'm not sure about that specific question. Try one of the options below — they cover the most common topics.";
        setMessages(prev => [...(prev || []), { role: 'assistant', content: aiContent, timestamp: Date.now() }]);
        if (flow?.chips) setDemoChips(flow.chips);
        setStreamingContent(null);
        setLoading(false);
      }, 750);
      return;
    }
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const updated = [...(messages || []), userMsg];
    setMessages(updated);
    setInput('');
    dispatchMessage(updated);
  }

  function retry() {
    if (loading) return;
    const clean = (messagesRef.current || []).filter(m => m.content !== 'RETRY_UI');
    setMessages(clean);
    dispatchMessage(clean);
  }

  function sendChip(text) {
    if (loading || isEscalated) return;
    if (isDemoMode) {
      const userMsg = { role: 'user', content: text, timestamp: Date.now() };
      setMessages(prev => [...(prev || []), userMsg]);
      setLoading(true);
      setStreamingContent('');
      setTimeout(() => {
        const flow = DEMO_FLOWS[text];
        const aiContent = flow
          ? flow.response
          : "I don't have a scripted path for that yet. Try one of the options below.";
        setMessages(prev => [...(prev || []), { role: 'assistant', content: aiContent, timestamp: Date.now() }]);
        setDemoChips(flow?.chips ?? PROMPT_CHIPS);
        setStreamingContent(null);
        setLoading(false);
      }, 750);
      return;
    }
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const updated = [...(messages || []), userMsg];
    setMessages(updated);
    dispatchMessage(updated);
  }

  function newChat() {
    if (loading) return;
    Alert.alert(
      'Start new chat?',
      'This will clear your conversation history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const welcome = userPath === 'adherence' ? WELCOME_ADHERENCE : WELCOME_DEFAULT;
            setMessages([{ ...welcome, timestamp: Date.now() }]);
            setDemoChips(PROMPT_CHIPS);
            setInput('');
            setStreamingContent(null);
            setLoading(false);
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Feather name="activity" size={18} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>Migraine Companion</Text>
          <Text style={[styles.headerStatus, isDemoMode && styles.headerStatusDemo]}>
            {isDemoMode ? '◎ Demo mode' : '● Online'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={newChat}
          style={styles.newChatBtn}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Start new chat"
        >
          <Feather name="edit-2" size={18} color={colors.slateLight} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {(messages || []).map((m, i) => {
            if (m.content === 'ESCALATION_UI') return <EscalationBubble key={i} />;
            if (m.content === 'RETRY_UI') return <RetryBubble key={i} onRetry={retry} />;
            const showTime = i === 0 || (m.timestamp && messages[i - 1]?.timestamp &&
              m.timestamp - messages[i - 1].timestamp > 5 * 60 * 1000);
            const isLastWelcome = i === 0 && m.role === 'assistant' && !isEscalated && messages.length === 1;
            const showDemoChips = isDemoMode && i === messages.length - 1 && m.role === 'assistant' && demoChips.length > 0;
            const showChips = isDemoMode ? showDemoChips : isLastWelcome;
            const chips = isDemoMode ? demoChips : PROMPT_CHIPS;
            return (
              <React.Fragment key={i}>
                {showTime && m.timestamp && (
                  <Text style={styles.timeLabel}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
                <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleAi]}>
                  <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAi]}>
                    {m.content}
                  </Text>
                </View>
                {showChips && (
                  <>
                    <Text style={styles.chipLabel}>Suggested topics</Text>
                    <View style={styles.chipRow}>
                      {chips.map(chip => (
                        <TouchableOpacity
                          key={chip}
                          style={styles.chip}
                          onPress={() => sendChip(chip)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={chip}
                        >
                          <Text style={styles.chipText}>{chip}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </React.Fragment>
            );
          })}
          {loading && streamingContent === '' && (
            <View
              style={[styles.bubble, styles.bubbleAi, styles.bubbleLoading]}
              accessibilityLiveRegion="polite"
              accessibilityLabel="Thinking…"
            >
              <ActivityIndicator size="small" color={colors.slateLight} />
            </View>
          )}
          {streamingContent !== null && streamingContent.length > 0 && (
            <View
              style={[styles.bubble, styles.bubbleAi]}
              accessibilityLiveRegion="polite"
              accessibilityLabel="Response streaming"
            >
              <Text style={[styles.bubbleText, styles.bubbleTextAi]}>{streamingContent}</Text>
            </View>
          )}
        </ScrollView>

        {isEscalated && (
          <View style={styles.escalatedBanner}>
            <Text style={styles.escalatedBannerTxt}>Chat paused. Please use the emergency contacts above.</Text>
          </View>
        )}
        <View style={styles.inputBarContainer}>
          <Text style={styles.disclaimerText}>
            General information only · Not medical advice · Consult your healthcare provider
          </Text>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about your migraines…"
              placeholderTextColor={colors.slateLight}
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={send}
              editable={!isEscalated}
              accessibilityLabel="Message input"
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!input.trim() || loading || isEscalated) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!input.trim() || loading || isEscalated}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !input.trim() || loading || isEscalated }}
            >
              <Feather name="arrow-up" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: spacing.md, backgroundColor: colors.cream, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.lav,
    alignItems: 'center', justifyContent: 'center',
  },
  headerName: { fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.slate },
  headerStatus: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.sage },
  headerStatusDemo: { color: colors.terra },
  newChatBtn: { padding: 8 },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.md, gap: 10 },
  timeLabel: {
    fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight,
    textAlign: 'center', marginBottom: 4,
  },
  bubble: { maxWidth: '82%', padding: 13, borderRadius: 18 },
  bubbleAi: {
    backgroundColor: colors.white, alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: colors.slate, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  bubbleUser: { backgroundColor: colors.lav, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleLoading: { paddingHorizontal: 18 },
  bubbleText: { fontSize: textSize.base, lineHeight: 22 },
  bubbleTextAi: { fontFamily: fonts.body, color: colors.slate },
  bubbleTextUser: { fontFamily: fonts.body, color: colors.white },
  escalationCard: {
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.md, padding: spacing.md, alignSelf: 'flex-start', maxWidth: '90%',
  },
  escalationTitle: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.terra, marginBottom: 8 },
  escalationBody: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateMid, lineHeight: 24, marginBottom: 12 },
  crisisBtn: {
    backgroundColor: colors.terra, borderRadius: radius.full,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8, alignItems: 'center',
  },
  crisisBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.white },
  crisisLinkBtn: { paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' },
  crisisLink: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.terra, textAlign: 'center' },
  inputBarContainer: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  disclaimerText: {
    fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight,
    textAlign: 'center', paddingTop: 8, paddingHorizontal: spacing.md,
  },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  input: {
    flex: 1, backgroundColor: colors.creamMid, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: fonts.body, fontSize: textSize.base, color: colors.slate, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, backgroundColor: colors.lav, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  chipLabel: {
    fontFamily: fonts.body, fontSize: textSize.fine, color: colors.slateLight,
    marginTop: 8, marginLeft: 4, marginBottom: 2,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4, marginLeft: 4 },
  chip: {
    backgroundColor: colors.lavPale, borderWidth: 1, borderColor: colors.lavLight,
    borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 13,
  },
  chipText: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.lav, lineHeight: 20 },
  retryBubble: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, alignSelf: 'flex-start', maxWidth: '82%',
    shadowColor: colors.slate, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  retryText: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 22, marginBottom: 10 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.lavLight, borderRadius: radius.full,
    paddingVertical: 7, paddingHorizontal: 12, alignSelf: 'flex-start',
  },
  retryBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.lav },
  escalatedBanner: {
    backgroundColor: colors.terraPale, borderTopWidth: 1, borderTopColor: colors.terraBorder,
    paddingHorizontal: spacing.md, paddingVertical: 8,
  },
  escalatedBannerTxt: {
    fontFamily: fonts.body, fontSize: textSize.fine, color: colors.terra, textAlign: 'center',
  },
});
