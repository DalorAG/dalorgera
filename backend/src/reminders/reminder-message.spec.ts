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

  it('formats vignette reminders', () => {
    expect(reminderMessage({ ...base, kind: 'vignette', device_name: 'Autobahnvignette 2026', days_before: 7 }).title).toBe(
      'Vignette läuft ab',
    );
  });

  it('formats burden of proof reminders', () => {
    expect(reminderMessage({ ...base, kind: 'burden_of_proof' })).toEqual({
      title: 'Mängel jetzt melden',
      body: 'Kaffeemaschine: am 14.10.2025 endet das erste Jahr. Bis dahin muss der Händler beweisen, dass ein Mangel nicht schon beim Kauf bestand. Jetzt prüfen, ob alles funktioniert.',
    });
  });

  it('formats maintenance reminders', () => {
    expect(reminderMessage({ ...base, kind: 'maintenance', device_name: 'Auto' })).toEqual({
      title: 'Wartung steht an',
      body: 'Auto: nächste Wartung in 30 Tagen (14.10.2025). Jetzt einen Termin vereinbaren.',
    });
  });
});
