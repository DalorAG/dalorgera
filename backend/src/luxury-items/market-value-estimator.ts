import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../config/env.js';

const OPENAI_URL = 'https://api.openai.com/v1/responses';
// Web search takes a few rounds.
const TIMEOUT_MS = 90_000;
const MAX_SOURCES = 3;

export type MarketValueItem = {
  category: string;
  brand: string;
  model: string | null;
  referenceNumber: string | null;
  purchaseDate: string | null;
  purchasePriceCents: number | null;
  hasBoxPapers: boolean;
  notes: string | null;
};

export type MarketValueEstimate = {
  valueCents: number;
  lowCents: number;
  highCents: number;
  currency: 'EUR';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  sources: { title: string; url: string }[];
};

const LANGUAGE_NAMES: Record<string, string> = {
  de: 'German',
  en: 'English',
  ru: 'Russian',
};

const PROMPT = `You estimate the current resale market value of a luxury item (watch, jewellery, handbag, art, ...) for its owner in Germany, Austria or Switzerland.
Search the web for current asking and sold prices of the same reference or model in comparable condition (e.g. Chrono24, Watchcharts, auction results, Vestiaire Collective), preferring EU listings in EUR.
With box and papers ("full set") prices are higher than without.
Give a realistic private-sale value, not a dealer retail price, and a low/high range. If the item is too vague to find, base the estimate on the purchase price and say so, with low confidence.
Amounts in whole euros. The summary is one or two short sentences for the owner on what the estimate is based on.
List up to three pages you actually found in the search as sources, with their exact URL.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'estimate_eur',
    'low_eur',
    'high_eur',
    'confidence',
    'summary',
    'sources',
  ],
  properties: {
    estimate_eur: { type: 'number' },
    low_eur: { type: 'number' },
    high_eur: { type: 'number' },
    confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
    summary: { type: 'string' },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'url'],
        properties: { title: { type: 'string' }, url: { type: 'string' } },
      },
    },
  },
} as const;

type Extracted = {
  estimate_eur: number;
  low_eur: number;
  high_eur: number;
  confidence: MarketValueEstimate['confidence'];
  summary: string;
  sources: { title: string; url: string }[];
};

type ResponsesOutput = {
  output?: {
    type: string;
    /** web_search_call: the pages the search really returned */
    action?: { sources?: { url?: string }[] };
    content?: {
      type: string;
      text?: string;
      annotations?: { type: string; url?: string; title?: string }[];
    }[];
  }[];
};

/** Price sites a source link may point to when the search did not report its pages. */
const KNOWN_PRICE_SITES =
  /(^|\.)(chrono24\.[a-z.]+|chronostats\.com|watchcharts\.com|chronocheck\.de|chronext\.[a-z.]+|vestiairecollective\.com|catawiki\.[a-z.]+|dorotheum\.com|christies\.com|sothebys\.com|phillips\.com|bonhams\.com|antiquorum\.swiss|ebay\.[a-z.]+|kleinanzeigen\.de|willhaben\.at|ricardo\.ch|uhrforum\.de|rebag\.com|fashionphile\.com)$/;

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Estimates what a Wertsache is worth today with an OpenAI model and web search. */
@Injectable()
export class MarketValueEstimator {
  private readonly logger = new Logger(MarketValueEstimator.name);
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(config: ConfigService<Env, true>) {
    this.apiKey = config.get('OPENAI_API_KEY', { infer: true });
    this.model = config.get('OPENAI_MODEL', { infer: true });
  }

  async estimate(
    item: MarketValueItem,
    language: string,
  ): Promise<MarketValueEstimate> {
    if (!this.apiKey)
      throw new ServiceUnavailableException(
        'Market value estimation is not configured',
      );

    const facts = [
      `Category: ${item.category}`,
      `Brand: ${item.brand}`,
      item.model && `Model: ${item.model}`,
      item.referenceNumber && `Reference number: ${item.referenceNumber}`,
      item.purchaseDate && `Bought on: ${item.purchaseDate}`,
      item.purchasePriceCents != null &&
        `Purchase price: ${Math.round(item.purchasePriceCents / 100)} EUR`,
      `Box and papers: ${item.hasBoxPapers ? 'yes' : 'no'}`,
      item.notes && `Owner's notes: ${item.notes}`,
    ].filter(Boolean);

    let res: Response;
    try {
      res = await fetch(OPENAI_URL, {
        method: 'POST',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          tools: [
            {
              type: 'web_search',
              user_location: { type: 'approximate', country: 'DE' },
            },
          ],
          // The pages the search returned, to check the links the model names against.
          include: ['web_search_call.action.sources'],
          instructions: `${PROMPT}\nWrite the summary in ${LANGUAGE_NAMES[language] ?? 'German'}. Today is ${new Date().toISOString().slice(0, 10)}.`,
          input: facts.join('\n'),
          text: {
            format: {
              type: 'json_schema',
              name: 'market_value',
              strict: true,
              schema: SCHEMA,
            },
          },
        }),
      });
    } catch (err) {
      this.logger.error(`OpenAI request failed: ${(err as Error).message}`);
      if ((err as Error).name === 'TimeoutError')
        throw new GatewayTimeoutException('Market value estimation timed out');
      throw new BadGatewayException('Market value estimation failed');
    }

    if (!res.ok) {
      this.logger.error(
        `OpenAI responded with HTTP ${res.status}: ${(await res.text()).slice(0, 500)}`,
      );
      throw new BadGatewayException('Market value estimation failed');
    }

    const output = ((await res.json()) as ResponsesOutput).output ?? [];
    const content = output
      .filter((o) => o.type === 'message')
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text');
    const text = content?.map((c) => c.text ?? '').join('');
    if (!text) {
      this.logger.warn('OpenAI returned no market value');
      throw new BadGatewayException('Market value estimation failed');
    }

    let parsed: Extracted;
    try {
      parsed = JSON.parse(text) as Extracted;
    } catch {
      this.logger.warn('OpenAI returned invalid JSON for the market value');
      throw new BadGatewayException('Market value estimation failed');
    }
    const cents = (eur: number) => Math.max(0, Math.round(eur * 100));
    const valueCents = cents(parsed.estimate_eur);
    if (!valueCents)
      throw new BadGatewayException('Market value estimation failed');

    // Only links to sites the web search really returned, or well-known price sites: a page could
    // otherwise talk the model into naming any URL (phishing) as a source.
    const searched = new Set(
      output
        .flatMap((o) => o.action?.sources ?? [])
        .concat(content.flatMap((c) => c.annotations ?? []))
        .flatMap((src) => (src.url ? [hostOf(src.url)] : []))
        .filter(Boolean),
    );
    const sources = new Map<string, string>();
    const found = [
      ...content.flatMap((c) => c.annotations ?? []),
      ...(Array.isArray(parsed.sources) ? parsed.sources : []).map((p) => ({
        type: 'url_citation',
        ...p,
      })),
    ];
    for (const a of found) {
      if (
        !a.url ||
        !/^https:\/\/[^\s/]+\.[^\s]+$/.test(a.url) ||
        !(searched.has(hostOf(a.url)) || KNOWN_PRICE_SITES.test(hostOf(a.url)))
      )
        continue;
      if (
        a.type === 'url_citation' &&
        a.url &&
        sources.size < MAX_SOURCES &&
        !sources.has(a.url)
      )
        sources.set(a.url, a.title || new URL(a.url).hostname);
    }

    return {
      valueCents,
      lowCents: Math.min(cents(parsed.low_eur), valueCents),
      highCents: Math.max(cents(parsed.high_eur), valueCents),
      currency: 'EUR',
      confidence: parsed.confidence,
      summary: parsed.summary.trim(),
      sources: [...sources].map(([url, title]) => ({ title, url })),
    };
  }
}
