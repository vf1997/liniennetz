import { redirect } from '@sveltejs/kit';
import { validateSession, COOKIE_NAME } from '$lib/server/auth.js';

/**
 * Läuft bei JEDEM Aufruf auf dem Server, bevor eine Seite gerendert wird.
 * Hier wird geprüft, wer eingeloggt ist (locals.user), und wer nicht
 * eingeloggt ist, landet auf der Login-Seite.
 */

function isPublic(pathname) {
	return pathname === '/login' || pathname.startsWith('/auth');
}

export async function handle({ event, resolve }) {
	const token = event.cookies.get(COOKIE_NAME);
	const user = token ? await validateSession(token) : null;
	event.locals.user = user;

	if (!user && !isPublic(event.url.pathname)) {
		throw redirect(303, '/login');
	}

	return resolve(event);
}
