/**
 * Entscheidet anhand der Umgebungs-Variablen, welche Datenbank genutzt wird.
 * Wird von der App (index.js), von Drizzle (drizzle.config.js) und vom
 * Seed-Skript (scripts/seed.js) gemeinsam benutzt – damit alle dasselbe tun.
 *
 *   DB_MODE=local  -> immer die lokale Datei local.db (schnell, offline)
 *   DB_MODE=turso  -> die gehostete Turso-Datenbank (braucht Zugangsdaten)
 *   (nicht gesetzt) -> automatisch: Turso, wenn Zugangsdaten vorhanden, sonst lokal
 *
 * `env` ist ein Objekt mit den Variablen (z. B. process.env oder SvelteKits env).
 */
export function resolveDbConfig(env) {
	const mode = String(env.DB_MODE || '')
		.trim()
		.toLowerCase();
	const tursoUrl = String(env.TURSO_DATABASE_URL || '').trim();
	const hasTurso = !!tursoUrl;
	// 'local' erzwingt die Datei; 'turso' nur, wenn Daten da sind; sonst automatisch.
	const useTurso = mode === 'local' ? false : hasTurso;
	if (useTurso) {
		return { mode: 'turso', url: tursoUrl, authToken: env.TURSO_AUTH_TOKEN || undefined };
	}
	return { mode: 'local', url: 'file:local.db', authToken: undefined };
}
