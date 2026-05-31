import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radius, textSize } from '../theme';

const ARTICLE_TITLES = {
  'cgrp-education': 'What is a CGRP and how does it relate to migraines?',
  'undertreated': 'How to tell if you are being undertreated for migraines',
  'hcp-conversation': 'How to talk to your doctor about preventive options',
  'stress-triggers': 'How stress triggers migraines — and what you can do about it',
  'sleep-migraines': 'The connection between sleep and migraine frequency',
};

export default function EducationInsightCard({ insight, onPress }) {
  if (!insight) return null;
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Read article: ${ARTICLE_TITLES[insight.articleId]}`}
    >
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Feather name="book-open" size={13} color={colors.lav} />
        </View>
        <Text style={styles.eyebrow}>Based on your logs</Text>
      </View>
      <Text style={styles.context}>{insight.context}</Text>
      <Text style={styles.title}>{ARTICLE_TITLES[insight.articleId]}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={styles.cta}>Read article</Text>
        <Feather name="arrow-right" size={13} color={colors.lav} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: 20,
    marginBottom: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  iconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  eyebrow: { fontFamily: fonts.bodySemiBold, fontSize: textSize.label, color: colors.slateMid },
  context: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateMid, marginBottom: 6 },
  title: {
    fontFamily: fonts.display,
    fontSize: textSize.title,
    color: colors.slate,
    lineHeight: 26,
    marginBottom: 12,
  },
  cta: { fontFamily: fonts.bodyMedium, fontSize: textSize.body, color: colors.lav },
});
