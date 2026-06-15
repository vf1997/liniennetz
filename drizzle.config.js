import { defineConfig } from 'drizzle-kit';

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
