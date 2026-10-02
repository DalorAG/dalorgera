import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

process.env.SUPABASE_URL ??= 'https://lunokowximvnzefgfnib.supabase.co';
process.env.SUPABASE_PUBLISHABLE_KEY ??= 'sb_publishable_test';
process.env.REMINDERS_WORKER_ENABLED = 'false';

const { AppModule } = await import('../src/app.module.js');

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });

  it('rejects requests without a token', () => {
    return request(app.getHttpServer()).get('/devices').expect(401);
  });

  it('rejects a forged token', () => {
    const forged = ['eyJhbGciOiJFUzI1NiJ9', 'eyJzdWIiOiJ4Iiwicm9sZSI6ImF1dGhlbnRpY2F0ZWQifQ', 'c2ln'].join('.');
    return request(app.getHttpServer()).get('/me').set('authorization', `Bearer ${forged}`).expect(401);
  });
});
