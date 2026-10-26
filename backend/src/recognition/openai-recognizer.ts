import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';
import {
  EXTRACTION_PROMPT,
  RECEIPT_EXTRACTION_SCHEMA,
  sanitizeExtraction,
  type ReceiptExtraction,
} from './receipt-extraction.js';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = 60_000;

export type ItemIdentification = {
  category: 'watch' | 'jewelry' | 'bag' | 'other';
  brand: string | null;
  model: string | null;
  /** Search words for what it is, in German and English, e.g. Kaffeemaschine, coffee machine */
  keywords: string[];
};

const MAX_KEYWORDS = 8;

const IDENTIFY_PROMPT = `You look at a photo of an item (a device, a watch, jewellery, a bag, ...), or of its invoice, and say what it is.
category: "watch" for any wristwatch or pocket watch, "jewelry" for rings, necklaces, bracelets, earrings and similar, "bag" for handbags and other leather goods, otherwise "other".
brand and model only when you can read them or recognise them with confidence (e.g. "Rolex", "Submariner Date"); otherwise null. Never guess.
keywords: up to 8 short words someone would use to find it in a list, the product type in German and in English plus brand and model if known, e.g. ["Kaffeemaschine", "Espressomaschine", "coffee machine", "De'Longhi"].`;

const IDENTIFY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['category', 'brand', 'model', 'keywords'],
  properties: {
    category: { type: 'string', enum: ['watch', 'jewelry', 'bag', 'other'] },
    brand: { type: ['string', 'null'] },
    model: { type: ['string', 'null'] },
    keywords: { type: 'array', items: { type: 'string' } },
  },
} as const;

type ChatCompletion = { choices: { message: { content: string | null; refusal?: string | null } }[] };

/** Reads receipts and warranty cards with an OpenAI vision model (structured outputs). */
@Injectable()
export class OpenAiRecognizer {
  private readonly logger = new Logger(OpenAiRecognizer.name);
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('OPENAI_API_KEY', { infer: true });
    this.model = config.get('OPENAI_MODEL', { infer: true });
  }

  get enabled(): boolean {
    return !!this.apiKey;
  }

  /** `imageUrl` must be reachable by OpenAI, e.g. a short-lived signed Storage URL. */
  async extract(imageUrl: string): Promise<ReceiptExtraction> {
    const raw = await this.complete(
      EXTRACTION_PROMPT,
      `Extract the purchase data from this document. Today is ${new Date().toISOString().slice(0, 10)}.`,
      imageUrl,
      'high',
      'receipt_extraction',
      RECEIPT_EXTRACTION_SCHEMA,
    );
    return sanitizeExtraction(raw as ReceiptExtraction);
  }

  /** What a photo shows: the Tresor category for a Wertsache, and words to search for it. */
  async identify(imageUrl: string): Promise<ItemIdentification> {
    const raw = await this.complete(IDENTIFY_PROMPT, 'What is this item?', imageUrl, 'low', 'item_identification', IDENTIFY_SCHEMA);
    const parsed = raw as ItemIdentification;
    const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : null);
    return {
      category: ['watch', 'jewelry', 'bag', 'other'].includes(parsed.category) ? parsed.category : 'other',
      brand: text(parsed.brand),
      model: text(parsed.model),
      keywords: [...new Set((Array.isArray(parsed.keywords) ? parsed.keywords : []).map(text).filter((k) => k !== null))].slice(
        0,
        MAX_KEYWORDS,
      ),
    };
  }

  private async complete(
    system: string,
    prompt: string,
    imageUrl: string,
    detail: 'low' | 'high',
    name: string,
    schema: object,
  ): Promise<unknown> {
    if (!this.apiKey) throw new ServiceUnavailableException('Recognition is not configured');

    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: system },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl, detail } },
              ],
            },
          ],
          response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
        }),
      });
    } catch (err) {
      this.logger.error(`OpenAI request failed: ${(err as Error).message}`);
      if ((err as Error).name === 'TimeoutError') throw new GatewayTimeoutException('Recognition timed out');
      throw new BadGatewayException('Recognition failed');
    }

    if (!res.ok) {
      this.logger.error(`OpenAI responded with HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
      throw new BadGatewayException('Recognition failed');
    }
    const message = ((await res.json()) as ChatCompletion).choices[0]?.message;
    if (!message?.content) {
      this.logger.warn(`OpenAI returned no content${message?.refusal ? `: ${message.refusal}` : ''}`);
      throw new BadGatewayException('Recognition failed');
    }
    try {
      return JSON.parse(message.content);
    } catch {
      this.logger.warn('OpenAI returned invalid JSON');
      throw new BadGatewayException('Recognition failed');
    }
  }
}
