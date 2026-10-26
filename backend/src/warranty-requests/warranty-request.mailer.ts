import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import type { LuxuryCategory, RequestKind } from './warranty-requests.dto.js';

const RESEND_URL = 'https://api.resend.com/emails';
const TIMEOUT_MS = 15_000;

export type WarrantyRequestMail = {
  id: string;
  kind: RequestKind;
  userEmail: string | null;
  productName: string;
  category: LuxuryCategory | null;
  brand: string | null;
  serialNumber: string | null;
  /** Luxury items only */
  referenceNumber?: string | null;
  hasBoxPapers?: boolean;
  /** Value stated by the user, formatted */
  value: string | null;
  store: string | null;
  purchaseDate: string | null;
  price: string | null;
  message: string | null;
  /** Beleg and photos, attached to the email itself: no links that anyone holding them could open. */
  attachments: MailAttachment[];
  /** Files left out because the email would have become too large */
  skippedAttachments?: number;
};

export type MailAttachment = { filename: string; content: string /* base64 */ };

const TITLES: Record<RequestKind, string> = {
  extension: 'Garantieverlängerung',
  luxury: 'Luxus-Versicherung',
};

const CATEGORY_LABELS: Record<LuxuryCategory, string> = {
  watch: 'Uhr',
  jewelry: 'Schmuck',
  bag: 'Tasche',
  other: 'Sonstiges',
};

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Notifies our insurance team about a new Garantieverlängerung or Luxus-Versicherung request via Resend. */
@Injectable()
export class WarrantyRequestMailer {
  private readonly logger = new Logger(WarrantyRequestMailer.name);
  private readonly apiKey?: string;
  private readonly from?: string;
  private readonly to: string[];

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('RESEND_API_KEY', { infer: true });
    this.from = config.get('RESEND_FROM', { infer: true });
    this.to = (config.get('WARRANTY_REQUESTS_EMAIL_TO', { infer: true }) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get enabled(): boolean {
    return !!this.apiKey && !!this.from && this.to.length > 0;
  }

  /** Never throws: the request is stored either way, a lost email is only logged. */
  async send(mail: WarrantyRequestMail): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(`Email not configured, request ${mail.id} is only stored`);
      return;
    }
    const title = TITLES[mail.kind];
    const rows: [string, string | null][] = [
      ['Kategorie', mail.category && CATEGORY_LABELS[mail.category]],
      ['Marke', mail.brand],
      [mail.kind === 'luxury' ? 'Modell' : 'Produkt', mail.productName],
      ['Referenznummer', mail.referenceNumber ?? null],
      ['Seriennummer', mail.serialNumber],
      ['Box und Papiere', mail.hasBoxPapers === undefined ? null : mail.hasBoxPapers ? 'Ja' : 'Nein'],
      ['Wert (Angabe Kunde)', mail.value],
      ['Gekauft bei', mail.store],
      ['Kaufdatum', mail.purchaseDate],
      ['Preis', mail.price],
      ['Kunde', mail.userEmail ?? 'Anonym (keine E-Mail)'],
      ['Nachricht', mail.message],
    ];
    const text = [
      `Neue Anfrage: ${title}`,
      '',
      ...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
      ...(mail.attachments.length ? ['', `Anhänge: ${mail.attachments.map((a) => a.filename).join(', ')}`] : []),
      ...(mail.skippedAttachments ? [`${mail.skippedAttachments} weitere Fotos sind in der App gespeichert (zu groß für die E-Mail).`] : []),
      `\nAnfrage-ID: ${mail.id}`,
    ].join('\n');
    const html = `<h2>Neue Anfrage: ${escape(title)}</h2><table cellpadding="4">${rows
      .filter(([, v]) => v)
      .map(([k, v]) => `<tr><td><b>${escape(k)}</b></td><td>${escape(v!).replace(/\n/g, '<br>')}</td></tr>`)
      .join('')}</table>${
      mail.attachments.length ? `<p>Anhänge: ${mail.attachments.map((a) => escape(a.filename)).join(', ')}</p>` : ''
    }${
      mail.skippedAttachments
        ? `<p>${mail.skippedAttachments} weitere Fotos sind in der App gespeichert (zu groß für die E-Mail).</p>`
        : ''
    }<p style="color:#888">Anfrage-ID: ${escape(mail.id)}</p>`;

    try {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
          'idempotency-key': `warranty-request-${mail.id}`,
        },
        body: JSON.stringify({
          from: this.from,
          to: this.to,
          ...(mail.userEmail ? { reply_to: mail.userEmail } : {}),
          subject: `${title}: ${[mail.brand, mail.productName].filter(Boolean).join(' ')}`,
          text,
          html,
          ...(mail.attachments.length ? { attachments: mail.attachments } : {}),
        }),
      });
      if (!res.ok) this.logger.error(`Resend responded with HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
    } catch (err) {
      this.logger.error(`Could not email request ${mail.id}: ${(err as Error).message}`);
    }
  }
}
