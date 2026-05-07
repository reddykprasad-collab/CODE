import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius } from '../theme';

export default function OnboardingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
      {/* ambient blobs via gradients */}
      <LinearGradient
        colors={['rgba(142,125,196,0.25)', 'transparent']}
        style={styles.blob1}
      />
      <LinearGradient
        colors={['rgba(107,158,147,0.2)', 'transparent']}
        style={styles.blob2}
      />

      <View style={styles.content}>
        {/* top section */}
        <View style={styles.top}>
          <View style={styles.mark}>
            <Text style={styles.markText}>◎</Text>
          </View>
          <Text style={styles.eyebrow}>Your companion</Text>
          <Text style={styles.headline}>
            Migraine care{'\n'}that{' '}
            <Text style={styles.headlineItalic}>stays{'\n'}</Text>
            with you
          </Text>
          <Text style={styles.desc}>
            A private space to understand your migraines, explore your options, and stay on track with treatment.
          </Text>
        </View>

        {/* bottom section */}
        <View style={styles.bottom}>
          <View style={styles.pills}>
            {['Always available', 'Private', 'Unbranded'].map(p => (
              <View key={p} style={styles.pill}>
                <Text style={styles.pillText}>{p}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={() => navigation.navigate('Quiz')}
            activeOpacity={0.88}
          >
            <Text style={styles.btnPrimaryText}>Get started</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={() => navigation.navigate('SignIn')} activeOpacity={0.7}>
            <Text style={styles.btnGhostText}>I already have an account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} activeOpacity={0.7} style={styles.privacyLink}>
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  blob1: {
    position: 'absolute', width: 340, height: 340,
    top: -100, right: -110, borderRadius: 170,
  },
  blob2: {
    position: 'absolute', width: 300, height: 300,
    bottom: 60, left: -100, borderRadius: 150,
  },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: 44 },
  top: { flex: 1, justifyContent: 'center' },
  mark: {
    width: 52, height: 52, backgroundColor: colors.lav, borderRadius: 16,
    marginBottom: 44, alignItems: 'center', justifyContent: 'center',
  },
  markText: { color: 'white', fontSize: 26 },
  eyebrow: {
    fontFamily: fonts.bodySemiBold, fontSize: 17, letterSpacing: 2,
    color: colors.lav, textTransform: 'uppercase', marginBottom: 14,
  },
  headline: {
    fontFamily: fonts.display, fontSize: 50, lineHeight: 55,
    color: colors.slate, marginBottom: 20,
  },
  headlineItalic: { fontFamily: fonts.displayItalic, color: colors.lav },
  desc: {
    fontFamily: fonts.body, fontSize: 16, lineHeight: 26,
    color: colors.slateMid,
  },
  bottom: { gap: spacing.sm },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  pill: {
    backgroundColor: colors.lavPale, borderRadius: radius.full,
    paddingHorizontal: 13, paddingVertical: 6,
  },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 17, color: colors.lav },
  btnPrimary: {
    backgroundColor: colors.lav, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
  },
  btnPrimaryText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: 'white' },
  btnGhost: { paddingVertical: 12, alignItems: 'center' },
  btnGhostText: { fontFamily: fonts.body, fontSize: 16, color: colors.slateMid },
  privacyLink: { paddingVertical: 4, alignItems: 'center' },
  privacyLinkText: { fontFamily: fonts.body, fontSize: 14, color: colors.slateLight, textDecorationLine: 'underline' },
});
