import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['account', 'common']);
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
      setMessage({ ok: false, text: t('profile.passwordTooShort', { min: MIN_PASSWORD }) });
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
    setMessage({ ok: true, text: t('profile.saved') });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {message?.ok ? <InfoBanner title={message.text} subtitle={t('profile.savedSubtitle')} /> : null}
        <TextField label={t('profile.nameLabel')} value={name} onChangeText={setName} placeholder={t('profile.namePlaceholder')} autoComplete="name" />
        <TextField label={t('profile.emailLabel')} value={email ?? ''} editable={false} hint={t('profile.emailHint')} />
        <TextField
          label={t('profile.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          placeholder={t('profile.passwordPlaceholder')}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />
        {message && !message.ok ? (
          <Text variant="body" color="danger">
            {message.text}
          </Text>
        ) : null}
        <Button label={t('common:actions.save')} icon="checkmark" onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.lg },
});
