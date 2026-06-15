import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { env } from '$env/dynamic/private';
import * as schema from './schema.js';

/**
 * Verbindung zur Datenbank.
 *
 * - LOKAL (zum Entwickeln): einfach die Datei "local.db" im Projektordner.
 *   Kein Server, kein Internet, keine Zugangsdaten nötig.
 * - IN DER CLOUD (z. B. auf Vercel/Netlify gehostet): sind die Umgebungs-
 *   Variablen TURSO_DATABASE_URL und TURSO_AUTH_TOKEN gesetzt, verbindet sich
 *   die App stattdessen mit der gehosteten Turso-Datenbank ("SQLite in der Cloud").
 *
 * Es ist exakt dieselbe Technik (@libsql/client) – nur die Adresse ändert sich.
 */

const url = env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = env.TURSO_AUTH_TOKEN || undefined;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
