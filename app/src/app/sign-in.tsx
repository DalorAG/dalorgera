import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { InfoBanner } from '@/components/info-banner';
import { LanguagePicker } from '@/components/language-picker';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { signInWithGoogle } from '@/features/google-sign-in';
import { supabase } from '@/lib/supabase';
import { TERMS_VERSION } from '@/lib/terms';
import { radius, spacing, useTheme } from '@/theme';

type Mode = 'signIn' | 'signUp';

// Supabase error codes with a translated message in auth:errors.
const AUTH_ERRORS = [
  'invalid_credentials',
  'email_not_confirmed',
  'user_already_exists',
  'weak_password',
  'over_email_send_rate_limit',
] as const;

const isAuthError = (code: string | undefined): code is (typeof AUTH_ERRORS)[number] =>
  (AUTH_ERRORS as readonly string[]).includes(code ?? '');

export default function SignInScreen() {
  const theme = useTheme();
  const { t } = useTranslation('auth');
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordRepeat, setPasswordRepeat] = useState('');
  const [repeatError, setRepeatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setRepeatError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(t('errors.invalidEmail'));
    if (password.length < 8) return setError(t('errors.passwordTooShort'));
    if (mode === 'signUp' && password !== passwordRepeat) return setRepeatError(t('errors.passwordMismatch'));
    if (mode === 'signUp' && !termsAccepted) return setTermsError(true);

    setLoading(true);
    const credentials = { email: email.trim(), password };
    const { data, error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : // The consent is stored in the user's metadata and recorded server-side after the first sign-in.
          await supabase.auth.signUp({ ...credentials, options: { data: { terms_version: TERMS_VERSION } } });
    setLoading(false);

    if (authError) return setError(isAuthError(authError.code) ? t(`errors.${authError.code}`) : authError.message);
    // With email confirmation enabled, sign-up returns no session.
    if (mode === 'signUp' && !data.session) {
      setInfo(t('signIn.checkEmail'));
      setMode('signIn');
    }
    // On success the auth listener switches to the app.
  };

  const google = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={[styles.logo, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
              <Ionicons name="shield-checkmark" size={40} color={theme.brand} />
            </View>
            <Text variant="display">Dalor Gawa</Text>
            <Text variant="body" color="textSecondary">
              {t('signIn.tagline')}
            </Text>
          </View>

          <View style={[styles.segments, { backgroundColor: theme.surfaceMuted }]}>
            {(['signIn', 'signUp'] as const).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  setMode(key);
                  setError(null);
                  setRepeatError(null);
                  setPasswordRepeat('');
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === key }}
                style={[styles.segment, mode === key && { backgroundColor: theme.surface }]}>
                <Text variant="captionStrong" color={mode === key ? 'text' : 'textSecondary'}>
                  {t(`signIn.tabs.${key}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {info ? <InfoBanner title={t('signIn.confirmEmailTitle')} subtitle={info} /> : null}

          <TextField
            label={t('signIn.emailLabel')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder={t('signIn.emailPlaceholder')}
          />
          <TextField
            label={t('signIn.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            placeholder={t('signIn.passwordPlaceholder')}
            onSubmitEditing={mode === 'signIn' ? submit : undefined}
            error={error}
          />
          {mode === 'signUp' ? (
            <TextField
              label={t('signIn.passwordRepeatLabel')}
              value={passwordRepeat}
              onChangeText={(v) => {
                setPasswordRepeat(v);
                setRepeatError(null);
              }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder={t('signIn.passwordRepeatPlaceholder')}
              onSubmitEditing={submit}
              error={repeatError}
            />
          ) : null}

          {mode === 'signUp' ? (
            <Checkbox
              checked={termsAccepted}
              onChange={(v) => {
                setTermsAccepted(v);
                setTermsError(false);
              }}
              error={termsError}>
              <Text variant="caption">
                <Trans
                  t={t}
                  i18nKey="terms.consent"
                  components={{
                    terms: <Link href="/terms" style={{ color: theme.brand, fontWeight: '600' }} />,
                    privacy: <Link href="/privacy" style={{ color: theme.brand, fontWeight: '600' }} />,
                  }}
                />
              </Text>
              {termsError ? (
                <Text variant="caption" color="danger">
                  {t('signIn.termsRequired')}
                </Text>
              ) : null}
            </Checkbox>
          ) : null}

          <Button label={mode === 'signIn' ? t('signIn.submitSignIn') : t('signIn.submitSignUp')} onPress={submit} loading={loading} />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
            <Text variant="caption" color="textSecondary">
              {t('signIn.or')}
            </Text>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
          </View>
          <Button label={t('signIn.google')} variant="secondary" icon="logo-google" onPress={google} loading={googleLoading} />

          <View style={styles.language}>
            <LanguagePicker />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl, gap: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  logo: {
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  segments: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xs },
  language: { alignItems: 'center', marginTop: spacing.lg },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
});
