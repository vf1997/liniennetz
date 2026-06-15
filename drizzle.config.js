import { defineConfig } from 'drizzle-kit';
import { readFileSync } from 'node:fs';

// Werte aus der Datei .env einlesen (ohne Zusatz-Bibliothek), damit
// "npm run db:push" die Turso-Zugangsdaten findet.
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

// Lokal arbeitet "npm run db:push" auf der Datei local.db.
// Sind die Turso-Umgebungs-Variablen gesetzt, wird stattdessen die
// gehostete Datenbank angepasst (für den Cloud-Betrieb).
const useTurso = !!process.env.TURSO_DATABASE_URL;

export default defineConfig({
	schema: './src/lib/server/db/schema.js',
	out: './drizzle',
	dialect: useTurso ? 'turso' : 'sqlite',
	dbCredentials: useTurso
		? { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN }
		: { url: 'file:local.db' }
});
