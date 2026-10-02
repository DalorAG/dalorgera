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
  return {
    title: 'Gewährleistung endet bald',
    body: `${r.device_name}: die gesetzliche Gewährleistung endet in ${r.days_before} Tagen (${until}).`,
  };
}
