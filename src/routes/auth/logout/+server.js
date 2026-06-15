import { redirect } from '@sveltejs/kit';
import { deleteSession, clearSessionCookie, COOKIE_NAME } from '$lib/server/auth.js';

export async function POST({ cookies }) {
	const token = cookies.get(COOKIE_NAME);
	if (token) await deleteSession(token);
	clearSessionCookie(cookies);
	throw redirect(303, '/login');
}
