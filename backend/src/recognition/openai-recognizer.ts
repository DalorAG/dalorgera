import { Injectable, Logger, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
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
    if (!this.apiKey) throw new ServiceUnavailableException('Recognition is not configured');

    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract the purchase data from this document.' },
              { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
            ],
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'receipt_extraction', strict: true, schema: RECEIPT_EXTRACTION_SCHEMA },
        },
      }),
    });

    if (!res.ok) {
      this.logger.error(`OpenAI responded with HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`);
      throw new BadGatewayException('Recognition failed');
    }
    const message = ((await res.json()) as ChatCompletion).choices[0]?.message;
    if (!message?.content) {
      this.logger.warn(`OpenAI returned no content${message?.refusal ? `: ${message.refusal}` : ''}`);
      throw new BadGatewayException('Recognition failed');
    }
    return sanitizeExtraction(JSON.parse(message.content) as ReceiptExtraction);
  }
}
