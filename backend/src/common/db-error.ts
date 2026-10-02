import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

type DbError = { code?: string; message: string; details?: string | null };

const logger = new Logger('Database');

/** Maps PostgREST / Postgres errors to HTTP errors without leaking internals. */
export function toHttpError(error: DbError): Error {
  switch (error.code) {
    case 'PGRST116':
      return new NotFoundException();
    case '23503':
      return new BadRequestException('Referenced resource does not exist');
    case '23505':
      return new ConflictException('Resource already exists');
    case '23514':
    case '22P02':
    case '22007':
    case '22008':
      return new BadRequestException('Invalid value');
    case '42501':
      return new ForbiddenException();
    default:
      logger.error(`${error.code ?? 'unknown'}: ${error.message}`);
      return new InternalServerErrorException();
  }
}

export function unwrap<T>(result: { data: T; error: DbError | null }): NonNullable<T> {
  if (result.error) throw toHttpError(result.error);
  if (result.data === null || result.data === undefined) throw new NotFoundException();
  return result.data;
}
