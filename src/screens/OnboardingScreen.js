import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, spacing, radius, textSize, gradients } from '../theme';

export default function OnboardingScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.root}>
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
            onPress={() => navigation.navigate('Quiz')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Get started"
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnPrimary}
            >
              <Text style={styles.btnPrimaryText}>Get started</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnGhost}
            onPress={() => navigation.navigate('SignIn')}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Sign in to existing account"
          >
            <Text style={styles.btnGhostText}>I already have an account</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('PrivacyPolicy')}
            activeOpacity={0.7}
            style={styles.privacyLink}
            accessibilityRole="link"
            accessibilityLabel="View privacy policy"
          >
            <Text style={styles.privacyLinkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: 44 },
  top: { flex: 1, justifyContent: 'center' },
  mark: {
    width: 52, height: 52, backgroundColor: colors.lavPale, borderRadius: 16,
    marginBottom: 44, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.lav,
  },
  markText: { color: colors.lav, fontSize: textSize.headingLg },
  eyebrow: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label,
    color: colors.lav, marginBottom: 14,
  },
  headline: {
    fontFamily: fonts.display, fontSize: textSize.hero, lineHeight: 55,
    color: colors.slate, marginBottom: 20,
  },
  headlineItalic: { fontFamily: fonts.displayItalic, color: colors.lav },
  desc: {
    fontFamily: fonts.body, fontSize: textSize.base, lineHeight: 26,
    color: colors.slateMid,
  },
  bottom: { gap: spacing.sm },
  pills: { flexDirection: 'row', gap: spacing.sm, marginBottom: 4 },
  pill: {
    backgroundColor: colors.lavPale, borderRadius: radius.full,
    paddingHorizontal: 13, paddingVertical: 6,
  },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: textSize.bodyLarge, color: colors.lav },
  btnPrimary: {
    borderRadius: 16,
    paddingVertical: 17, alignItems: 'center',
    overflow: 'hidden',
  },
  btnPrimaryText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  btnGhost: { paddingVertical: 12, alignItems: 'center' },
  btnGhostText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  privacyLink: { paddingVertical: 4, alignItems: 'center' },
  privacyLinkText: { fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateLight, textDecorationLine: 'underline' },
});
