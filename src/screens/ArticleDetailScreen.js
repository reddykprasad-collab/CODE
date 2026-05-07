import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { colors, fonts, spacing, radius } from '../theme';

const ARTICLES = {
  'cgrp-education': {
    title: 'What is a CGRP and how does it relate to migraines?',
    category: 'Education',
    readTime: '5 min',
    icon: '🧠',
    sections: [
      {
        heading: 'The short version',
        body: 'CGRP stands for calcitonin gene-related peptide. It is a protein your nervous system releases during a migraine attack. When CGRP floods the area around your brain, it widens blood vessels and cranks up pain signals, which is a big part of why migraines hurt so much.',
      },
      {
        heading: 'Why CGRP matters for treatment',
        body: 'For decades, migraine treatments worked indirectly: they targeted general pain pathways or tried to constrict blood vessels. CGRP-targeting treatments work differently. They focus specifically on this protein and its receptors, which are heavily involved in migraine biology rather than other functions. That specificity is why some people who failed older treatments respond to this approach.',
      },
      {
        heading: 'Preventive vs. acute treatments',
        body: 'There are two types of CGRP-related treatments. Preventive ones are taken on a regular schedule (daily pills or monthly and quarterly injections) to reduce how often migraines happen. Acute ones are taken at the onset of a migraine to stop it faster. Your doctor can help you figure out which type (or which combination) makes sense for your situation.',
      },
      {
        heading: 'How long does it take to work?',
        body: 'Preventive treatments typically take 8 to 12 weeks to show their full effect. It is common to still have migraines in the first few weeks. Most doctors consider a 50% reduction in migraine frequency a meaningful response. Tracking your headache days in a journal makes it much easier to see whether a treatment is making a difference.',
      },
      {
        heading: 'Is this right for me?',
        body: 'Not everyone needs a CGRP-targeting preventive. They are generally considered when migraines are frequent, disabling, or when other preventive approaches have not worked well. The candidacy self-assessment in this app can give you a starting signal, but your doctor is the right person to make that call.',
      },
    ],
  },
  'undertreated': {
    title: 'How to tell if you are being undertreated for migraines',
    category: 'Education',
    readTime: '4 min',
    icon: '📋',
    sections: [
      {
        heading: 'The undertreated patient is not rare',
        body: 'Research suggests that a large share of people with frequent migraines are not on preventive therapy even when they would likely benefit from it. This is not necessarily anyone\'s fault: migraines are often undertreated because they are underreported, and because patients and doctors do not always have the same conversation about prevention.',
      },
      {
        heading: 'Signs you may be undertreated',
        body: 'You might be undertreated if you have four or more migraine days per month, if you rely on acute (rescue) medication more than ten days per month, if migraines are affecting your work or relationships, or if you have tried two or more types of acute treatment without adequate relief. Any of these is worth a conversation with your doctor about preventive options.',
      },
      {
        heading: 'The medication overuse cycle',
        body: 'Using acute migraine medications too frequently (a rough threshold is more than ten days per month) can paradoxically cause more headaches over time. This is called medication overuse headache. If you find yourself taking rescue medication very often, that is a signal to discuss preventive therapy rather than just relying on acute treatment.',
      },
      {
        heading: 'Preventive therapy is not a last resort',
        body: 'Many people assume preventive treatment is only for the most severe cases. That is not accurate. It is appropriate for anyone whose migraines significantly affect their quality of life, even if they are "managing." Managing is not the same as having good control.',
      },
      {
        heading: 'What to do next',
        body: 'If any of this resonates, the most useful next step is to track your migraine days in the journal for 4 to 8 weeks, then bring that data to your next doctor appointment. Numbers give your doctor a much clearer picture than memory alone.',
      },
    ],
  },
  'hcp-conversation': {
    title: 'How to talk to your doctor about preventive options',
    category: 'HCP Prep',
    readTime: '6 min',
    icon: '💬',
    sections: [
      {
        heading: 'Why this conversation is hard',
        body: 'Doctors often have limited time, and migraines can feel too normal to bring up assertively. Patients frequently underreport their migraine burden, either because they have adapted to it or because they worry about appearing dramatic. The result is that doctors often do not know how much migraines are affecting a patient\'s life.',
      },
      {
        heading: 'What to bring',
        body: 'The most useful thing you can bring is data. How many days per month do you get migraines? How many of those days did you miss work, cancel plans, or stay in bed? How many times per month do you take a rescue medication? If you have been logging in this app\'s journal, that data is exactly what you need.',
      },
      {
        heading: 'What to say',
        body: 'Be direct about the impact, not just the frequency. "I have migraines six days a month" is less compelling than "I have migraines six days a month and I missed three work deadlines last month because of them." Doctors respond to functional impairment. Make the cost visible.',
      },
      {
        heading: 'Questions worth asking',
        body: 'Ask your doctor: "Could I be a candidate for preventive migraine therapy?" If yes: "What options exist, and what is realistic to expect in terms of timeline?" If you have already tried preventives that did not work: "Are there newer approaches that might work differently for me?" These are reasonable questions that any doctor should welcome.',
      },
      {
        heading: 'Managing expectations',
        body: 'If your doctor prescribes a preventive treatment, ask them: how long before you expect to see a difference, what counts as a good response, and when should you check back in. Setting those expectations upfront prevents you from stopping a treatment too early because you do not know whether it is working.',
      },
    ],
  },
};

export default function ArticleDetailScreen({ route, navigation }) {
  const { articleId } = route.params;
  const article = ARTICLES[articleId];

  if (!article) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.slate, marginBottom: 10 }}>Article not found</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: colors.slateMid, textAlign: 'center' }}>This article is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.meta}>
          <Text style={styles.category}>{article.category}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.readTime}>{article.readTime} read</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{article.icon}</Text>
        </View>
        <Text style={styles.title}>{article.title}</Text>

        {article.sections.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This content is for general education only. It is not medical advice. Always consult your healthcare provider before making any changes to your treatment.
          </Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { marginBottom: 10 },
  backText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  category: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.lav, letterSpacing: 1 },
  dot: { color: colors.slateLight },
  readTime: { fontFamily: fonts.body, fontSize: 17, color: colors.slateLight },
  scroll: { flex: 1 },
  body: { padding: spacing.lg },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: colors.lavPale,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  icon: { fontSize: 26 },
  title: {
    fontFamily: fonts.display, fontSize: 28, color: colors.slate,
    lineHeight: 36, marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
  sectionHeading: {
    fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.slate, marginBottom: 8,
  },
  sectionBody: { fontFamily: fonts.body, fontSize: 17, color: colors.slateMid, lineHeight: 24 },
  disclaimer: {
    backgroundColor: colors.terraPale, borderRadius: 12,
    padding: spacing.md, marginTop: spacing.lg,
  },
  disclaimerText: { fontFamily: fonts.body, fontSize: 16, color: colors.terra, lineHeight: 22 },
});
