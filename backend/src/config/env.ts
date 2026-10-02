import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, validateSync } from 'class-validator';

export class Env {
  @IsInt()
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? undefined : Number(value)))
  PORT = 3000;

  @IsUrl({ require_tld: false })
  SUPABASE_URL: string;

  /** Publishable key: used for requests made on behalf of a signed-in user (RLS applies). */
  @IsString()
  SUPABASE_PUBLISHABLE_KEY: string;

  /** Secret key: only used by the background reminders worker. Never ship it to clients. */
  @IsString()
  @IsOptional()
  SUPABASE_SECRET_KEY?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === undefined || value === true || value === 'true')
  REMINDERS_WORKER_ENABLED = true;

  /** Optional, only needed when "enhanced push security" is enabled in Expo. */
  @IsString()
  @IsOptional()
  EXPO_ACCESS_TOKEN?: string;

  /** Enables receipt / warranty card recognition. Without it the endpoint returns 503. */
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL = 'gpt-4o-mini';

  /** Comma separated list, `*` allows every origin. */
  @IsString()
  @IsOptional()
  CORS_ORIGINS = '*';
}

export function validateEnv(config: Record<string, unknown>): Env {
  const env = plainToInstance(Env, config, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n${errors.map((e) => `  - ${Object.values(e.constraints ?? {}).join(', ')}`).join('\n')}`);
  }
  return env;
}
