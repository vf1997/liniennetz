import { env } from '$env/dynamic/private';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { sessions, users } from './db/schema.js';
import { getSettings } from './settings.js';

/**
 * Login & Sitzungen – komplett mit Bordmitteln, ohne Zusatz-Bibliothek.
 *
 * Es gibt zwei Anmelde-Modi, umschaltbar in den Einstellungen:
 * - "demo":  Person per Klick auswählen (kein Slack nötig).
 * - "slack": echtes "Mit Slack anmelden". Dafür braucht es Client ID + Secret,
 *            die in den Einstellungen ODER in der .env hinterlegt sein können.
 */

const SESSION_SECRET = env.SESSION_SECRET || 'dev-only-unsicheres-geheimnis-bitte-aendern';
export const COOKIE_NAME = 'liniennetz_session';

/**
 * Liefert die wirksame Anmelde-Konfiguration.
 *   mode      – gewählter Modus ('demo' | 'slack'). Vorrang: Umgebungs-Variable
 *               LOGIN_MODE > Einstellung loginMode (DB) > Standard 'demo'.
 *   hasCreds  – sind Client ID + Secret vorhanden? (Env zuerst, dann DB-Einstellung)
 *   active    – ist Slack-Login JETZT wirklich aktiv (Modus slack UND Zugangsdaten da)?
 */
export async function getSlackConfig() {
	const s = await getSettings();
	const clientId = (env.SLACK_CLIENT_ID || s.slackClientId || '').trim();
	const clientSecret = (env.SLACK_CLIENT_SECRET || s.slackClientSecret || '').trim();
	const redirectUri = (env.SLACK_REDIRECT_URI || s.slackRedirectUri || '').trim();
	const envMode = String(env.LOGIN_MODE || '').trim().toLowerCase();
	const wanted = envMode === 'slack' || envMode === 'demo' ? envMode : s.loginMode;
	const mode = wanted === 'slack' ? 'slack' : 'demo';
	const hasCreds = Boolean(clientId && clientSecret);
	return { mode, clientId, clientSecret, redirectUri, hasCreds, active: mode === 'slack' && hasCreds };
}
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 Tage

// Das Cookie wird signiert, damit niemand eine fremde Sitzung fälschen kann.
function sign(value) {
	const sig = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
	return `${value}.${sig}`;
}

export function readSessionId(token) {
	if (!token) return null;
	const idx = token.lastIndexOf('.');
	if (idx < 0) return null;
	const value = token.slice(0, idx);
	const sig = token.slice(idx + 1);
	const expected = crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
	const a = Buffer.from(sig);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
	return value;
}

export async function createSession(userId) {
	const id = crypto.randomBytes(24).toString('hex');
	const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
	await db.insert(sessions).values({ id, userId, expiresAt });
	return sign(id);
}

export async function validateSession(token) {
	const id = readSessionId(token);
	if (!id) return null;
	const session = (await db.select().from(sessions).where(eq(sessions.id, id)))[0];
	if (!session) return null;
	if (session.expiresAt.getTime() < Date.now()) {
		await db.delete(sessions).where(eq(sessions.id, id));
		return null;
	}
	const user = (await db.select().from(users).where(eq(users.id, session.userId)))[0];
	return user ?? null;
}

export async function deleteSession(token) {
	const id = readSessionId(token);
	if (id) await db.delete(sessions).where(eq(sessions.id, id));
}

export function setSessionCookie(cookies, token) {
	cookies.set(COOKIE_NAME, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false, // localhost läuft über http
		maxAge: MAX_AGE_SECONDS
	});
}

export function clearSessionCookie(cookies) {
	cookies.delete(COOKIE_NAME, { path: '/' });
}

// Beim echten Slack-Login: Person anhand der Slack-ID finden oder neu anlegen.
// Slack liefert beim Login automatisch die Workspace-Kennung (team_id) mit –
// damit landen alle aus demselben Slack-Workspace im selben Liniennetz.
export async function findOrCreateUserFromSlack(profile) {
	const slackId = profile.sub;
	// Standard-Claim aus Slacks OpenID Connect; Fallback, falls mal nicht vorhanden.
	const workspaceId =
		profile['https://slack.com/team_id'] || profile.team_id || profile['team_id'] || 'slack';
	const existing = (await db.select().from(users).where(eq(users.slackId, slackId)))[0];
	if (existing) {
		await db
			.update(users)
			.set({
				workspaceId,
				name: profile.name ?? existing.name,
				email: profile.email ?? existing.email,
				avatarUrl: profile.picture ?? existing.avatarUrl
			})
			.where(eq(users.id, existing.id));
		return existing.id;
	}
	const inserted = await db
		.insert(users)
		.values({
			slackId,
			workspaceId,
			name: profile.name ?? 'Unbekannt',
			email: profile.email ?? null,
			avatarUrl: profile.picture ?? null
		})
		.returning();
	return inserted[0].id;
}
