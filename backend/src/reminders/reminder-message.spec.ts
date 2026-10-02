import { reminderMessage } from './reminder-message.js';

const base = { id: 'r1', user_id: 'u1', device_id: 'd1', device_name: 'Kaffeemaschine', days_before: 30, due_date: '2025-10-14' };

describe('reminderMessage', () => {
  it('formats warranty reminders in German', () => {
    expect(reminderMessage({ ...base, kind: 'warranty' })).toEqual({
      title: 'Garantie läuft bald ab',
      body: 'Kaffeemaschine: noch 30 Tage Garantie (bis 14.10.2025). Jetzt prüfen, ob alles funktioniert.',
    });
  });

  it('formats statutory reminders', () => {
    expect(reminderMessage({ ...base, kind: 'statutory', days_before: 7 }).title).toBe('Gewährleistung endet bald');
  });
});
