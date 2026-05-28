import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { colors, fonts, radius, textSize } from '../theme';

const INTERVENTION_CONFIG = {
  escalation_safety: {
    title: 'Please seek immediate help',
    body: 'If you are in crisis, call 988 or go to your nearest emergency room.',
    cta: null,
    accentColor: colors.terraDark,
    bg: colors.terraStrong,
    border: colors.terraBorder,
    icon: 'alert-triangle',
    urgent: true,
  },
  pa_denial_support: {
    title: 'Prior authorization denied',
    body: 'Appeals are common and often successful. Your doctor can help you navigate next steps.',
    cta: 'What you can do',
    accentColor: colors.terraDark,
    bg: colors.terraPale,
    border: colors.terraBorder,
    icon: 'file-text',
    urgent: true,
  },
  positive_reinforcement: {
    title: "You're having a better week",
    body: 'Your recent severity is notably lower than your baseline. Consistency is paying off.',
    cta: 'See your trends',
    accentColor: colors.sageDark,
    bg: colors.sagePale,
    border: colors.sageBorder,
    icon: 'trending-down',
    urgent: false,
  },
  hcp_prep_prompt: {
    title: 'Your data may warrant a doctor conversation',
    body: 'Recent changes in your scores suggest it may be worth reviewing with your healthcare provider.',
    cta: 'Prep for your visit',
    accentColor: colors.lavDark,
    bg: colors.lavPale,
    border: colors.lavLight,
    icon: 'user',
    urgent: false,
  },
  diary_prompt: {
    title: 'Time to log',
    body: "It's been a while since your last entry. Consistent tracking gives you and your doctor better data.",
    cta: 'Log today',
    accentColor: colors.lavDark,
    bg: colors.lavPale,
    border: colors.lavLight,
    icon: 'book-open',
    urgent: false,
  },
  first_dose_coaching: {
    title: 'Starting strong',
    body: 'Preventive treatments take 3–6 months to show their full effect. Consistency now matters more than early results.',
    cta: null,
    accentColor: colors.sageDark,
    bg: colors.sagePale,
    border: colors.sageBorder,
    icon: 'clock',
    urgent: false,
  },
  refill_nudge: {
    title: 'Refill may be coming up',
    body: 'Based on your dose history, a refill may be due soon. Ask your pharmacist or doctor.',
    cta: null,
    accentColor: colors.slateLight,
    bg: colors.creamMid,
    border: colors.border,
    icon: 'refresh-cw',
    urgent: false,
  },
  guidance_unavailable: {
    title: 'Guidance temporarily unavailable',
    body: "We couldn't refresh your personalized guidance right now. Your data is safe.",
    cta: null,
    accentColor: colors.slateLight,
    bg: colors.creamMid,
    border: colors.border,
    icon: 'info',
    urgent: false,
  },
};

export default function InterventionBanner({ onCtaPress }) {
  const { interventionQueue, dismissIntervention } = useOrchestration();

  // Only show banner-channel interventions
  const bannerItem = interventionQueue.find(i => i.channel?.includes('banner'));
  if (!bannerItem) return null;

  const config = INTERVENTION_CONFIG[bannerItem.type];
  if (!config) return null;

  return (
    <View
      style={[styles.container, { backgroundColor: config.bg, borderColor: config.border }]}
      accessibilityRole={config.urgent ? 'alert' : 'none'}
      accessibilityLabel={`${config.title}. ${config.body}`}
    >
      <View style={[styles.accent, { backgroundColor: config.accentColor, width: config.urgent ? 6 : 4 }]} />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Feather name={config.icon} size={15} color={config.accentColor} style={styles.icon} />
          <Text style={[styles.title, { color: config.accentColor }]}>{config.title}</Text>
          <TouchableOpacity
            onPress={() => dismissIntervention(bannerItem.id, true)}
            style={styles.dismissBtn}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="x" size={16} color={colors.slateLight} />
          </TouchableOpacity>
        </View>
        <Text style={styles.body}>{config.body}</Text>
        {config.cta && (
          <TouchableOpacity
            onPress={() => {
              if (onCtaPress) onCtaPress(bannerItem.type);
              dismissIntervention(bannerItem.id, false);
            }}
            style={[styles.ctaBtn, { borderColor: config.accentColor }]}
            accessibilityRole="button"
            accessibilityLabel={config.cta}
          >
            <Text style={[styles.ctaTxt, { color: config.accentColor }]}>{config.cta}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radius.md,
    marginHorizontal: 16,
    marginTop: 12,
    overflow: 'hidden',
  },
  accent: {
    width: 4,
    borderTopLeftRadius: radius.md,
    borderBottomLeftRadius: radius.md,
  },
  content: {
    flex: 1,
    padding: 12,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    marginTop: 1,
  },
  title: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.body,
  },
  dismissBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slateMid,
    lineHeight: 20,
  },
  ctaBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  ctaTxt: {
    fontFamily: fonts.bodyMedium,
    fontSize: textSize.body,
  },
});
