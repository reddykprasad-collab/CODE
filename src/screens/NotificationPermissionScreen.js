import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { requestPermissions } from '../services/notifications';
import { colors, fonts, spacing, radius, textSize } from '../theme';

const BENEFITS = [
  { icon: '💊', text: 'Dose reminders at the time you choose' },
  { icon: '📅', text: 'Daily logging prompts so you never miss a day' },
  { icon: '📊', text: 'Alerts when your trends are ready to review' },
];

export default function NotificationPermissionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  async function handleAllow() {
    setLoading(true);
    await requestPermissions();
    setLoading(false);
    navigation.replace('Main');
  }

  function handleSkip() {
    navigation.replace('Main');
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.body}>
        <LinearGradient
          colors={[colors.lav, colors.lavDark]}
          style={styles.iconWrap}
        >
          <Text style={styles.icon}>🔔</Text>
        </LinearGradient>

        <Text style={styles.title}>Stay on track with reminders</Text>
        <Text style={styles.subtitle}>
          Notifications help you build consistent habits without having to remember on your own.
        </Text>

        <View style={styles.benefitList}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Text style={{ fontSize: textSize.icon }}>{b.icon}</Text>
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            You can change notification settings at any time in the Reminders tab or your phone's Settings app.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.allowBtn, loading && { opacity: 0.6 }]}
          onPress={handleAllow}
          disabled={loading}
          activeOpacity={0.88}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.allowBtnText}>Allow notifications</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  body: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, alignItems: 'center' },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  icon: { fontSize: textSize.displayXl },
  title: {
    fontFamily: fonts.display, fontSize: textSize.display, color: colors.slate,
    textAlign: 'center', lineHeight: 36, marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateMid,
    textAlign: 'center', lineHeight: 24, marginBottom: spacing.xl,
  },
  benefitList: { width: '100%', gap: 12, marginBottom: spacing.lg },
  benefitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.cream, borderRadius: 14, padding: 14,
  },
  benefitIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.lavPale, alignItems: 'center', justifyContent: 'center',
  },
  benefitText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slate, flex: 1, lineHeight: 22 },
  noteCard: {
    backgroundColor: colors.creamMid, borderRadius: 12, padding: 14, width: '100%',
  },
  noteText: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid, lineHeight: 20, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 8 },
  allowBtn: {
    backgroundColor: colors.lav, borderRadius: 16, paddingVertical: 17, alignItems: 'center',
  },
  allowBtnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  skipBtn: { paddingVertical: 12, alignItems: 'center' },
  skipBtnText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight },
});
