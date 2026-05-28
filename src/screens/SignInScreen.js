import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { getHasOnboarded } from '../services/storage';
import { sharedStyles } from '../styles/shared';
import { colors, fonts, spacing, radius, textSize } from '../theme';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = email.trim().length > 4 && email.includes('@');

  async function handleSignIn() {
    if (!isValid) return;
    setLoading(true);
    setError('');

    await new Promise(r => setTimeout(r, 900));

    const onboarded = await getHasOnboarded();
    setLoading(false);

    if (onboarded) {
      navigation.replace('Main');
    } else {
      setError("We don't have an account for that email. Let's set you up instead.");
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={sharedStyles.backRow}>
            <Feather name="arrow-left" size={16} color={colors.slateMid} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.top}>
          <View style={styles.mark}>
            <Text style={styles.markText}>◎</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Enter the email you used when you first set up the app.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={email}
            onChangeText={t => { setEmail(t); setError(''); }}
            placeholder="you@example.com"
            placeholderTextColor={colors.slateLight}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, (!isValid || loading) && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={!isValid || loading}
            activeOpacity={0.88}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>Sign in</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchBtn}
            onPress={() => navigation.navigate('Quiz')}
            activeOpacity={0.7}
          >
            <Text style={styles.switchText}>New here? <Text style={styles.switchLink}>Get started instead</Text></Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.legalNote}>
          Your data is stored privately on this device. No password is required.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  inner: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: 32 },
  back: { paddingTop: spacing.md, marginBottom: spacing.xl },
  backText: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid },
  top: { marginBottom: spacing.xl },
  mark: {
    width: 48, height: 48, backgroundColor: colors.lav, borderRadius: 14,
    marginBottom: spacing.lg, alignItems: 'center', justifyContent: 'center',
  },
  markText: { color: colors.white, fontSize: textSize.heading },
  title: { fontFamily: fonts.display, fontSize: textSize.displayXl, color: colors.slate, marginBottom: 10, lineHeight: 42 },
  subtitle: { fontFamily: fonts.body, fontSize: textSize.base, color: colors.slateMid, lineHeight: 24 },
  form: { flex: 1 },
  label: {
    fontFamily: fonts.bodySemiBold, fontSize: textSize.label,
    color: colors.slateLight, marginBottom: 10,
  },
  input: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    fontFamily: fonts.body, fontSize: textSize.bodyLarge, color: colors.slate, marginBottom: 16,
  },
  inputError: { borderColor: colors.terra, backgroundColor: colors.terraPale },
  errorText: {
    fontFamily: fonts.body, fontSize: textSize.body, color: colors.terra,
    lineHeight: 22, marginBottom: 16, marginTop: -8,
  },
  btn: {
    backgroundColor: colors.lav, borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.35 },
  btnText: { fontFamily: fonts.bodyMedium, fontSize: textSize.base, color: colors.white },
  switchBtn: { alignItems: 'center', paddingVertical: 10 },
  switchText: { fontFamily: fonts.body, fontSize: textSize.body, color: colors.slateMid },
  switchLink: { fontFamily: fonts.bodyMedium, color: colors.lav },
  legalNote: {
    fontFamily: fonts.body, fontSize: textSize.caption, color: colors.slateLight,
    textAlign: 'center', lineHeight: 20, paddingBottom: 8,
  },
});
