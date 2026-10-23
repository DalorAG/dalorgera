import type { Database } from '../supabase/database.types.js';

type DueReminder = Database['public']['Functions']['claim_due_reminders']['Returns'][number];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function reminderMessage(r: DueReminder): { title: string; body: string } {
  const until = formatDate(r.due_date);
  if (r.kind === 'warranty') {
    return {
      title: 'Garantie läuft bald ab',
      body: `${r.device_name}: noch ${r.days_before} Tage Garantie (bis ${until}). Jetzt prüfen, ob alles funktioniert.`,
    };
  }
  if (r.kind === 'vignette') {
    return {
      title: 'Vignette läuft ab',
      body: `${r.device_name}: gültig nur noch ${r.days_before} Tage (bis ${until}). Rechtzeitig eine neue kaufen.`,
    };
  }
  if (r.kind === 'burden_of_proof') {
    return {
      title: 'Mängel jetzt melden',
      body: `${r.device_name}: am ${until} endet das erste Jahr. Bis dahin muss der Händler beweisen, dass ein Mangel nicht schon beim Kauf bestand. Jetzt prüfen, ob alles funktioniert.`,
    };
  }
  if (r.kind === 'maintenance') {
    return {
      title: 'Wartung steht an',
      body: `${r.device_name}: nächste Wartung in ${r.days_before} Tagen (${until}). Jetzt einen Termin vereinbaren.`,
    };
  }
  return {
    title: 'Gewährleistung endet bald',
    body: `${r.device_name}: die gesetzliche Gewährleistung endet in ${r.days_before} Tagen (${until}).`,
  };
}
