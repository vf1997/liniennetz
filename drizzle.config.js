import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';
import { resolveDbConfig } from './src/lib/server/db/resolve.js';

// Werte aus der Datei .env einlesen (ohne Zusatz-Bibliothek), damit
// "npm run db:push" DB_MODE und die Turso-Zugangsdaten findet.
try {
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (!m || process.env[m[1]]) continue;
		let v = m[2];
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		if (v) process.env[m[1]] = v;
	}
} catch {
	// keine .env vorhanden – dann läuft alles lokal auf der Datei local.db
}

// Welche Datenbank? Gesteuert über DB_MODE (siehe resolve.js).
// Tipp: zum Anpassen der Cloud-DB gezielt mit  DB_MODE=turso npm run db:push  ausführen.
const cfg = resolveDbConfig(process.env);

export default defineConfig({
	schema: './src/lib/server/db/schema.js',
	out: './drizzle',
	dialect: cfg.mode === 'turso' ? 'turso' : 'sqlite',
	dbCredentials:
		cfg.mode === 'turso' ? { url: cfg.url, authToken: cfg.authToken } : { url: cfg.url }
});
