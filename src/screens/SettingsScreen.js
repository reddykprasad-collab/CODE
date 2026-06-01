import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, fonts, spacing, radius, textSize, shadows } from '../theme';
import { useFontSize, FONT_SCALES } from '../contexts/FontSizeContext';

const SCALE_DISPLAY_SIZES = [14, 18, 24];

export default function SettingsScreen({ navigation }) {
  const { scaleKey, setScaleKey, fs } = useFontSize();

  function handleSelect(key) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScaleKey(key);
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: fs(textSize.heading) }]}>Settings</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color={colors.slate} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: fs(textSize.caption) }]}>TEXT SIZE</Text>

          <View style={[styles.card, shadows.sm]}>
            <View style={styles.sizeRow}>
              {FONT_SCALES.map((option, i) => {
                const active = scaleKey === option.key;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.sizeButton, active && styles.sizeButtonActive]}
                    onPress={() => handleSelect(option.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.key} text size`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      style={[
                        styles.sizeButtonLabel,
                        { fontSize: SCALE_DISPLAY_SIZES[i] },
                        active && styles.sizeButtonLabelActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={[styles.sizeTag, active && styles.sizeTagActive]}>
                      {option.key.charAt(0).toUpperCase() + option.key.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider} />

            <View style={styles.preview}>
              <Text style={[styles.previewHeading, { fontSize: fs(textSize.title) }]}>
                Tracking your patterns
              </Text>
              <Text style={[styles.previewBody, { fontSize: fs(textSize.body) }]}>
                Your journal data helps identify triggers and measure how well your treatment is working over time.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { fontSize: fs(textSize.caption) }]}>MY HEALTH RECORDS</Text>
          <View style={[styles.card, shadows.sm]}>
            <TouchableOpacity
              style={styles.navRow}
              onPress={() => navigation.navigate('MedicationHistory')}
              accessibilityRole="button"
              accessibilityLabel="View medication history"
            >
              <View style={styles.navRowLeft}>
                <Feather name="list" size={16} color={colors.lav} />
                <Text style={styles.navRowLabel}>My medication history</Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.slateLight} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.display,
    color: colors.slate,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    color: colors.slateLight,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  sizeRow: {
    flexDirection: 'row',
  },
  sizeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: 4,
  },
  sizeButtonActive: {
    borderBottomColor: colors.lav,
    backgroundColor: colors.lavPale,
  },
  sizeButtonLabel: {
    fontFamily: fonts.display,
    color: colors.slateMid,
  },
  sizeButtonLabelActive: {
    color: colors.lav,
  },
  sizeTag: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.slateLight,
  },
  sizeTagActive: {
    color: colors.lav,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  preview: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  previewHeading: {
    fontFamily: fonts.bodyMedium,
    color: colors.slate,
  },
  previewBody: {
    fontFamily: fonts.body,
    color: colors.slateMid,
    lineHeight: 22,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navRowLabel: {
    fontFamily: fonts.body,
    fontSize: textSize.body,
    color: colors.slate,
  },
});
