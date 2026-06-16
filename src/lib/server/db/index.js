import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';
import { resolveDbConfig } from './resolve.js';

/**
 * Verbindung zur Datenbank. Welche genutzt wird, steuert die Umgebungs-Variable
 * DB_MODE (siehe resolve.js):
 *   DB_MODE=local  -> lokale Datei local.db (schnell, offline)
 *   DB_MODE=turso  -> gehostete Turso-Datenbank
 *   (nicht gesetzt) -> automatisch (Turso, falls Zugangsdaten vorhanden, sonst lokal)
 * Es ist exakt dieselbe Technik (@libsql/client) – nur die Adresse ändert sich.
 */
const { url, authToken } = resolveDbConfig(env);

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
