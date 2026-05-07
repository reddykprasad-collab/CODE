import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Linking,
} from 'react-native';
import { sendMessage, isEscalation } from '../services/claude';
import { colors, fonts, spacing, radius } from '../theme';

const WELCOME = {
  role: 'assistant',
  content: "Hello! I'm here to help you understand your migraines and navigate your options. What's on your mind today?",
  timestamp: Date.now(),
};

function EscalationBubble() {
  return (
    <View style={styles.escalationCard}>
      <Text style={styles.escalationTitle}>⚠ This sounds serious</Text>
      <Text style={styles.escalationBody}>
        If you are experiencing a medical emergency, call 911 or go to your nearest emergency room right away.
      </Text>
      <TouchableOpacity onPress={() => Linking.openURL('tel:988')} style={styles.crisisBtn}>
        <Text style={styles.crisisBtnText}>📞 Call or text 988: Crisis Lifeline</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL('sms:741741&body=HOME')}>
        <Text style={styles.crisisLink}>Text HOME to 741741: Crisis Text Line</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ChatScreen() {
  const [messages, setMessages] = useState([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const reply = await sendMessage(updated);
      if (isEscalation(reply.content)) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'ESCALATION_UI', timestamp: Date.now() }]);
      } else {
        setMessages(prev => [...prev, { ...reply, timestamp: Date.now() }]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Something went wrong. Please try again in a moment.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 20 }}>🤝</Text>
        </View>
        <View>
          <Text style={styles.headerName}>Migraine Companion</Text>
          <Text style={styles.headerStatus}>● Online</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m, i) => {
            if (m.content === 'ESCALATION_UI') return <EscalationBubble key={i} />;
            const showTime = i === 0 || (m.timestamp && messages[i - 1]?.timestamp &&
              m.timestamp - messages[i - 1].timestamp > 5 * 60 * 1000);
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
              </React.Fragment>
            );
          })}
          {loading && (
            <View style={[styles.bubble, styles.bubbleAi, styles.bubbleLoading]}>
              <ActivityIndicator size="small" color={colors.slateLight} />
            </View>
          )}
        </ScrollView>

        {/* disclaimer — always visible, never dismissable */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            General information only. Not medical advice. Always consult your healthcare provider for treatment decisions.
          </Text>
        </View>

        {/* input */}
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
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || loading}
            activeOpacity={0.85}
          >
            <Text style={{ color: 'white', fontSize: 18 }}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: spacing.md, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.lav,
    alignItems: 'center', justifyContent: 'center',
  },
  headerName: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate },
  headerStatus: { fontFamily: fonts.body, fontSize: 16, color: colors.sage },
  messages: { flex: 1 },
  messagesContent: { padding: spacing.md, gap: 10 },
  timeLabel: { fontFamily: fonts.body, fontSize: 17, color: colors.slateLight, textAlign: 'center', marginBottom: 4 },
  bubble: { maxWidth: '82%', padding: 13, borderRadius: 18 },
  bubbleAi: {
    backgroundColor: 'white', alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  bubbleUser: { backgroundColor: colors.lav, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleLoading: { paddingHorizontal: 18 },
  bubbleText: { fontSize: 16, lineHeight: 22 },
  bubbleTextAi: { fontFamily: fonts.body, color: colors.slate },
  bubbleTextUser: { fontFamily: fonts.body, color: 'white' },
  escalationCard: {
    backgroundColor: colors.terraPale, borderWidth: 1, borderColor: colors.terraBorder,
    borderRadius: radius.md, padding: spacing.md, alignSelf: 'flex-start', maxWidth: '90%',
  },
  escalationTitle: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.terra, marginBottom: 8 },
  escalationBody: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, lineHeight: 20, marginBottom: 12 },
  crisisBtn: {
    backgroundColor: colors.terra, borderRadius: radius.full,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 8, alignItems: 'center',
  },
  crisisBtnText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: 'white' },
  crisisLink: { fontFamily: fonts.body, fontSize: 17, color: colors.terra, textAlign: 'center' },
  disclaimer: {
    backgroundColor: colors.terraPale, borderTopWidth: 1, borderTopColor: colors.terraBorder,
    paddingVertical: 8, paddingHorizontal: spacing.md,
  },
  disclaimerText: { fontFamily: fonts.body, fontSize: 17, color: colors.terra, textAlign: 'center', lineHeight: 22 },
  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  input: {
    flex: 1, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 10,
    fontFamily: fonts.body, fontSize: 16, color: colors.slate, maxHeight: 100,
  },
  sendBtn: {
    width: 38, height: 38, backgroundColor: colors.lav, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
});
