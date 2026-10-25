import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const eventsData = JSON.parse(fs.readFileSync(path.join(rootDir, 'public/data/events.json'), 'utf8'));
const events = eventsData.events || [];

events.forEach((e, idx) => {
  console.log(`${idx + 1}. [${e.id}]`);
  console.log(`   Title: ${e.title}`);
  console.log(`   Dates: ${e.startDate} to ${e.endDate} (Status: ${e.eventStatus}, TZ: ${e.timezone})`);
  console.log(`   Venue: ${e.venueName}, ${e.city}, ${e.country}`);
  console.log(`   Official: ${e.officialUrl}`);
  console.log(`   Booking: ${e.bookingUrl || 'NONE'}`);
});
