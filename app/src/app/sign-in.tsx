import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { supabase } from '@/lib/supabase';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Bitte gib eine gültige E-Mail-Adresse ein.');
    if (password.length < 8) return setError('Das Passwort muss mindestens 8 Zeichen haben.');

    setLoading(true);
    const credentials = { email: email.trim(), password };
    const { data, error: authError } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp(credentials);
    setLoading(false);

    if (authError) return setError(AUTH_ERRORS[authError.code ?? ''] ?? authError.message);
    // With email confirmation enabled, sign-up returns no session.
    if (mode === 'signUp' && !data.session) {
      setInfo('Fast geschafft! Wir haben dir eine E-Mail geschickt. Bestätige sie und melde dich dann an.');
      setMode('signIn');
    }
    // On success the auth listener switches to the app.
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
            onSubmitEditing={submit}
            error={error}
          />

          <Button label={mode === 'signIn' ? 'Anmelden' : 'Konto erstellen'} onPress={submit} loading={loading} />
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
  segments: { flexDirection: 'row', borderRadius: radius.md, padding: spacing.xs },
  segment: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
});
