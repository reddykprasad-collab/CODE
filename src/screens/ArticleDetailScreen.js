import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, spacing, radius, textSize } from '../theme';
import { sharedStyles } from '../styles/shared';

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
  'stress-triggers': {
    title: 'How stress triggers migraines — and what you can do about it',
    category: 'Triggers',
    readTime: '4 min',
    icon: '🧘',
    sections: [
      {
        heading: 'Why stress and migraines are linked',
        body: 'Stress activates your nervous system and causes the release of chemicals that can trigger cortical spreading depression — the wave of electrical activity that precedes a migraine. It also raises levels of CGRP, the same protein that CGRP-targeting medications are designed to block. The connection is direct, not just correlation.',
      },
      {
        heading: 'The letdown effect',
        body: 'One pattern that surprises many people: migraines often strike not during peak stress, but right after it lifts. Weekend migraines, holiday migraines, and migraines after a stressful project ends follow this pattern. The drop in stress hormones after sustained tension can be a more reliable trigger than the stress itself. If this sounds familiar, your logs may confirm it.',
      },
      {
        heading: 'What the research says about stress reduction',
        body: 'Cognitive behavioral therapy (CBT) and biofeedback have the strongest evidence for reducing stress-related migraine frequency. Regular aerobic exercise also helps — not just for general stress, but specifically for migraine prevention. These are not replacements for medication, but they work alongside it. Your doctor can refer you to a headache specialist or behavioral medicine provider if you want structured support.',
      },
      {
        heading: 'Practical things worth tracking',
        body: 'When you log a stress-triggered migraine, note what kind of stress it was. Work deadlines, sleep disruption from anxiety, and interpersonal conflict may have different patterns and different leverage points. The more specific your log, the clearer the pattern becomes over time and the more useful that data is for both you and your doctor.',
      },
      {
        heading: 'When stress reduction is not enough',
        body: 'If stress is a consistent trigger and lifestyle changes have not materially reduced your migraine frequency, that is a signal for a conversation about preventive medication. Managing a trigger reduces exposure; preventive treatment raises the threshold for attacks to begin. Both levers are worth using.',
      },
    ],
  },
  'sleep-migraines': {
    title: 'The connection between sleep and migraine frequency',
    category: 'Triggers',
    readTime: '4 min',
    icon: '🌙',
    sections: [
      {
        heading: 'Sleep disruption is one of the most common triggers',
        body: 'Poor sleep appears in migraine logs more reliably than almost any other factor. Both too little sleep and too much sleep can trigger attacks. The mechanism involves changes in serotonin and dopamine levels and disruption of the hypothalamus, which plays a central role in migraine generation. The relationship is not incidental.',
      },
      {
        heading: 'Why consistency matters more than duration',
        body: 'Research on sleep and migraines consistently shows that irregular sleep schedules — even with adequate total hours — are a stronger trigger than simply sleeping less. Waking at the same time every day (including weekends) is one of the most evidence-backed behavioral interventions for migraine reduction. This is harder to do than it sounds, but the payoff in migraine frequency is measurable.',
      },
      {
        heading: 'Insomnia and migraines create a feedback loop',
        body: 'Pain disrupts sleep. Poor sleep lowers the pain threshold and makes the next migraine more likely. Many people with frequent migraines also have insomnia, and treating one often helps the other. If you are experiencing both, it is worth mentioning to your doctor — there are treatment approaches that address both together.',
      },
      {
        heading: 'What to log',
        body: 'When you record a migraine day in your journal, also note when you went to bed and when you woke up, even roughly. After a few weeks, patterns become visible: late nights before migraine days, early wake-ups, irregular schedules. Your logs become a diagnostic tool your doctor can act on.',
      },
      {
        heading: 'Sleep hygiene in the context of migraines',
        body: 'Standard sleep hygiene recommendations (consistent schedule, dark and cool room, no screens before bed, limited caffeine after noon) are especially relevant for migraine sufferers. Caffeine changes are themselves a trigger — both too much and abrupt reduction. If you use caffeine to manage morning migraines, that pattern is worth discussing with your doctor.',
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
            <View style={sharedStyles.backRow}>
              <Feather name="arrow-left" size={16} color={colors.slateMid} />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: textSize.heading, color: colors.slate, marginBottom: 10 }}>Article not found</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, textAlign: 'center' }}>This article is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={sharedStyles.backRow}>
            <Feather name="arrow-left" size={16} color={colors.slateMid} />
            <Text style={styles.backText}>Back</Text>
          </View>
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
  backText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  category: { fontFamily: fonts.bodySemiBold, fontSize: textSize.caption, color: colors.lav, letterSpacing: 0.8 },
  dot: { color: colors.slateLight },
  readTime: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateLight },
  scroll: { flex: 1 },
  body: { padding: spacing.lg },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: colors.lavPale,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  icon: { fontSize: textSize.headingLg },
  title: {
    fontFamily: fonts.display, fontSize: textSize.display, color: colors.slate,
    lineHeight: 36, marginBottom: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
  sectionHeading: {
    fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.slate, marginBottom: 8,
  },
  sectionBody: { fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slateMid, lineHeight: 24 },
  disclaimer: {
    backgroundColor: colors.creamMid, borderRadius: 12,
    padding: spacing.md, marginTop: spacing.lg,
  },
  disclaimerText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateLight, lineHeight: 22 },
});
