import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Checkbox } from '@/components/checkbox';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { signInWithGoogle } from '@/features/google-sign-in';
import { supabase } from '@/lib/supabase';
import { TERMS_VERSION } from '@/lib/terms';
import { radius, spacing, useTheme } from '@/theme';

type Mode = 'signIn' | 'signUp';

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: 'E-Mail oder Passwort ist falsch.',
  email_not_confirmed: 'Bitte bestätige zuerst deine E-Mail-Adresse.',
  user_already_exists: 'Zu dieser E-Mail gibt es bereits ein Konto.',
  weak_password: 'Das Passwort ist zu schwach (mindestens 8 Zeichen).',
  over_email_send_rate_limit: 'Zu viele Versuche. Bitte warte kurz.',
};

export default function SignInScreen() {
  const theme = useTheme();
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
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    if (password.length < 8) return setError('Das Passwort muss mindestens 8 Zeichen haben.');
    if (mode === 'signUp' && password !== passwordRepeat) return setRepeatError('Die Passwörter stimmen nicht überein.');
    if (mode === 'signUp' && !termsAccepted) return setTermsError(true);

    setLoading(true);
    const credentials = { email: email.trim(), password };
    const { data, error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : // The consent is stored in the user's metadata and recorded server-side after the first sign-in.
          await supabase.auth.signUp({ ...credentials, options: { data: { terms_version: TERMS_VERSION } } });
    setLoading(false);

    if (authError) return setError(AUTH_ERRORS[authError.code ?? ''] ?? authError.message);
    // With email confirmation enabled, sign-up returns no session.
    if (mode === 'signUp' && !data.session) {
      setInfo('Fast geschafft! Wir haben dir eine E-Mail geschickt. Bestätige sie und melde dich dann an.');
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
            <Text variant="display">Garantie-Radar</Text>
            <Text variant="body" color="textSecondary">
              Deine Geräte. Deine Sicherheit.
            </Text>
          </View>

          <View style={[styles.segments, { backgroundColor: theme.surfaceMuted }]}>
            {(
              [
                ['signIn', 'Anmelden'],
                ['signUp', 'Registrieren'],
              ] as const
            ).map(([key, label]) => (
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
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {info ? <InfoBanner title="E-Mail bestätigen" subtitle={info} /> : null}

          <TextField
            label="E-Mail"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="du@beispiel.de"
          />
          <TextField
            label="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            textContentType={mode === 'signIn' ? 'password' : 'newPassword'}
            placeholder="Mindestens 8 Zeichen"
            onSubmitEditing={mode === 'signIn' ? submit : undefined}
            error={error}
          />
          {mode === 'signUp' ? (
            <TextField
              label="Passwort wiederholen"
              value={passwordRepeat}
              onChangeText={(v) => {
                setPasswordRepeat(v);
                setRepeatError(null);
              }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              placeholder="Passwort erneut eingeben"
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
                Ich akzeptiere die{' '}
                <Link href="/terms" style={{ color: theme.brand, fontWeight: '600' }}>
                  Nutzungsbedingungen
                </Link>
                . Die{' '}
                <Link href="/privacy" style={{ color: theme.brand, fontWeight: '600' }}>
                  Datenschutzerklärung
                </Link>{' '}
                habe ich zur Kenntnis genommen.
              </Text>
              {termsError ? (
                <Text variant="caption" color="danger">
                  Bitte bestätige die Nutzungsbedingungen, um ein Konto zu erstellen.
                </Text>
              ) : null}
            </Checkbox>
          ) : null}

          <Button label={mode === 'signIn' ? 'Anmelden' : 'Konto erstellen'} onPress={submit} loading={loading} />

          <View style={styles.divider}>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
            <Text variant="caption" color="textSecondary">
              oder
            </Text>
            <View style={[styles.line, { backgroundColor: theme.border }]} />
          </View>
          <Button label="Mit Google fortfahren" variant="secondary" icon="logo-google" onPress={google} loading={googleLoading} />
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
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
});
