import { fail, redirect, error } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema.js';
import { getSlackConfig, createSession, setSessionCookie } from '$lib/server/auth.js';

export async function load() {
	const slack = await getSlackConfig();
	// Im Demo-Modus zeigen wir die Liste aller Personen zum Anklicken.
	const allUsers = slack.active ? [] : await db.select().from(users).orderBy(users.id);
	return {
		slackEnabled: slack.active,
		// Slack-Modus gewählt, aber Zugangsdaten fehlen -> wir fallen auf Demo zurück und erklären das.
		slackMisconfigured: slack.mode === 'slack' && !slack.hasCreds,
		users: allUsers
	};
}

export const actions = {
	// Als bestehende Demo-Person einloggen (nur wenn Slack nicht aktiv ist)
	loginAs: async ({ request, cookies }) => {
		if ((await getSlackConfig()).active) throw error(403, 'Im Slack-Modus deaktiviert.');
		const data = await request.formData();
		const userId = Number(data.get('userId'));
		if (!userId) return fail(400, { error: 'Keine Person gewählt.' });
		const token = await createSession(userId);
		setSessionCookie(cookies, token);
		throw redirect(303, '/');
	},

	// Neue Demo-Person anlegen und gleich einloggen (nur wenn Slack nicht aktiv ist)
	createAndLogin: async ({ request, cookies }) => {
		if ((await getSlackConfig()).active) throw error(403, 'Im Slack-Modus deaktiviert.');
		const data = await request.formData();
		const name = String(data.get('name') || '').trim();
		const department = String(data.get('department') || '').trim() || 'Verwaltung';
		if (!name) return fail(400, { error: 'Bitte einen Namen eingeben.' });
		const inserted = await db
			.insert(users)
			.values({
				slackId: 'dev:' + crypto.randomUUID(),
				workspaceId: 'demo',
				name,
				email: null,
				avatarUrl: null,
				role: 'Neu dabei',
				department
			})
			.returning();
		const token = await createSession(inserted[0].id);
		setSessionCookie(cookies, token);
		throw redirect(303, '/');
	}
};
