import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useOrchestration } from '../contexts/OrchestrationContext';
import { colors, fonts, radius, textSize } from '../theme';
import { INTERVENTION_CONFIG } from '../config/interventions';

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
