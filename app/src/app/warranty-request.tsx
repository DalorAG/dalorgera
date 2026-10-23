import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { InfoBanner } from '@/components/info-banner';
import { RequestPhotoField } from '@/components/request-photo-field';
import { Text } from '@/components/text';
import { TextField } from '@/components/text-field';
import { useRequestPhoto } from '@/features/use-request-photo';
import { extensionDaysLabel, extensionWindow } from '@/lib/device-ui';
import { apiErrorMessage, formatDate, formatPrice } from '@/lib/format';
import { useCreateWarrantyRequestMutation, useGetDocumentsQuery, useGetMeQuery } from '@/store/api';
import { radius, spacing, useTheme } from '@/theme';

/** Garantieverlängerung: asks our insurance team to cover a purchase without (enough) warranty. */
export default function WarrantyRequestScreen() {
  const theme = useTheme();
  const { documentId, productName } = useLocalSearchParams<{ documentId?: string; productName?: string }>();
  const { data: me } = useGetMeQuery();
  // The list is cached from the Posteingang tab.
  const { data: documents } = useGetDocumentsQuery();
  const doc = documentId ? documents?.find((d) => d.id === documentId) : undefined;
  // Opened from the Posteingang without a receipt: the photo is taken right here.
  const { photo, busy: photoBusy, add: attachPhoto, clear: clearPhoto } = useRequestPhoto();
  const extracted = doc?.extracted ?? photo?.extracted ?? null;
  const attachedId = documentId ?? photo?.id;
  const products = extracted?.products ?? [];

  const [name, setName] = useState(productName ?? products[0]?.name ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [create, { isLoading }] = useCreateWarrantyRequestMutation();
  const canBeReached = !!me?.email;
  const purchaseDate = extracted?.purchaseDate ?? (doc ?? photo)?.createdAt.slice(0, 10);

  const addPhoto = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const added = await attachPhoto(source);
      if (!name.trim() && added?.extracted?.products[0]) setName(added.extracted.products[0].name);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };
  const extension = purchaseDate ? extensionWindow(purchaseDate) : null;

  const send = async () => {
    if (!name.trim()) return setError('Bitte gib an, was abgesichert werden soll.');
    setError(null);
    try {
      await create({ documentId: attachedId, productName: name.trim(), message: message.trim() || undefined }).unwrap();
      setSent(true);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  if (sent) {
    return (
      <View style={[styles.flex, styles.done, { backgroundColor: theme.background }]}>
        <Ionicons name="shield-checkmark" size={56} color={theme.success} />
        <Text variant="title" style={styles.center}>
          Anfrage gesendet
        </Text>
        <Text variant="body" color="textSecondary" style={styles.center}>
          Unser Versicherungspartner prüft dein Angebot für „{name.trim()}“. Wir melden uns per E-Mail an {me?.email}.
        </Text>
        <Button label="Fertig" onPress={() => router.back()} style={styles.fullWidth} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <InfoBanner
          title="Keine Garantie? Wir sichern es ab."
          subtitle="Über unseren Versicherungspartner bekommst du eine Garantieverlängerung oder Versicherung, auch für Kleidung oder Schuhe. Möglich bis 4 Wochen nach dem Kauf."
          icon={
            <View style={[styles.icon, { backgroundColor: theme.brand }]}>
              <Ionicons name="shield-half" size={18} color={theme.textOnBrand} />
            </View>
          }
        />

        {extension ? (
          <Text variant="captionStrong" color="brand">
            Abschluss bis {formatDate(extension.until)} möglich ({extensionDaysLabel(extension)}, 4 Wochen ab Kauf).
          </Text>
        ) : purchaseDate ? (
          <Text variant="caption" color="warningText">
            Die 4 Wochen ab Kauf sind vorbei. Wir prüfen trotzdem, ob unser Partner noch ein Angebot hat.
          </Text>
        ) : null}

        {!documentId ? (
          <RequestPhotoField
            label="Beleg oder Produkt fotografieren"
            hint="Am besten den Kassenbon, sonst ein Foto vom Produkt. Optional, hilft aber bei einem schnellen Angebot."
            photo={photo}
            busy={photoBusy}
            onAdd={addPhoto}
            onRemove={clearPhoto}
          />
        ) : null}

        {extracted ? (
          <View style={[styles.receipt, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text variant="captionStrong">Vom Beleg</Text>
            <Text variant="caption" color="textSecondary">
              {[
                extracted.merchant,
                extracted.purchaseDate ? formatDate(extracted.purchaseDate) : null,
                formatPrice(extracted.totalCents, extracted.currency ?? 'EUR'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ) : null}

        {products.length > 1 ? (
          <View style={styles.group}>
            <Text variant="captionStrong">Welches Produkt?</Text>
            <View style={styles.chips}>
              {products.map((p, i) => (
                <Chip key={`${p.name}-${i}`} label={p.name} selected={name === p.name} onPress={() => setName(p.name)} />
              ))}
            </View>
          </View>
        ) : null}
        <TextField
          label="Produkt *"
          value={name}
          onChangeText={setName}
          placeholder="z. B. Abendkleid, Winterjacke, Fahrrad"
          maxLength={120}
        />
        <TextField
          label="Nachricht"
          value={message}
          onChangeText={setMessage}
          placeholder="Optional, z. B. wogegen du es absichern möchtest"
          multiline
          maxLength={1000}
          style={styles.message}
        />

        {!canBeReached ? (
          <Text variant="caption" color="warningText">
            Damit wir dir ein Angebot schicken können, melde dich bitte mit deiner E-Mail-Adresse an (Profil).
          </Text>
        ) : (
          <Text variant="caption" color="textSecondary">
            Wir senden deine Angaben und den Beleg an unser Team und melden uns an {me?.email}. Unverbindlich und kostenlos.
          </Text>
        )}
        {error ? (
          <Text variant="body" color="danger">
            {error}
          </Text>
        ) : null}
        <Button label="Anfrage senden" icon="paper-plane" onPress={send} loading={isLoading} disabled={!canBeReached || photoBusy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxxl * 2 },
  done: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl },
  icon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  receipt: { gap: spacing.xxs, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  message: { minHeight: 96, textAlignVertical: 'top', paddingTop: spacing.md },
});
