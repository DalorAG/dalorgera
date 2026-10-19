import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { InfoBanner } from '@/components/info-banner';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { supabase } from '@/lib/supabase';
import { useAppSelector } from '@/store';
import { spacing, useTheme } from '@/theme';

const MIN_PASSWORD = 8;

/** Name lives in the Supabase user metadata, so no API call is needed. */
export default function ProfileScreen() {
  const theme = useTheme();
  const email = useAppSelector((s) => s.auth.email);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setName((data.user?.user_metadata?.full_name as string | undefined) ?? ''));
  }, []);

  const save = async () => {
    if (password && password.length < MIN_PASSWORD) {
      setMessage({ ok: false, text: `Das Passwort muss mindestens ${MIN_PASSWORD} Zeichen haben.` });
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() || null },
      ...(password ? { password } : {}),
    });
    setSaving(false);
    if (error) return setMessage({ ok: false, text: error.message });
    setPassword('');
    setMessage({ ok: true, text: 'Profil gespeichert.' });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {message?.ok ? <InfoBanner title={message.text} subtitle="Deine Änderungen sind übernommen." /> : null}
        <TextField label="Name" value={name} onChangeText={setName} placeholder="Vor- und Nachname" autoComplete="name" />
        <TextField label="E-Mail" value={email ?? ''} editable={false} hint="Die E-Mail-Adresse kann derzeit nicht geändert werden." />
        <TextField
          label="Neues Passwort"
          value={password}
          onChangeText={setPassword}
          placeholder="Leer lassen, um es zu behalten"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {message && !message.ok ? (
          <Text variant="body" color="danger">
            {message.text}
          </Text>
        ) : null}
        <Button label="Speichern" icon="checkmark" onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
});
