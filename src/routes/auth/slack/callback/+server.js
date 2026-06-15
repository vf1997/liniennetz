import { redirect } from '@sveltejs/kit';
import {
	getSlackConfig,
	findOrCreateUserFromSlack,
	createSession,
	setSessionCookie
} from '$lib/server/auth.js';

// Slack schickt die Person hierher zurück. Wir tauschen den Code gegen
// ein Token, holen das Profil, legen die Person an und loggen sie ein.
export async function GET({ url, cookies }) {
	const slack = await getSlackConfig();
	if (!slack.active) throw redirect(303, '/login');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const savedState = cookies.get('slack_oauth_state');
	cookies.delete('slack_oauth_state', { path: '/' });

	if (!code || !state || state !== savedState) {
		throw redirect(303, '/login?fehler=state');
	}

	const redirectUri = slack.redirectUri || `${url.origin}/auth/slack/callback`;

	const tokenRes = await fetch('https://slack.com/api/openid.connect.token', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: slack.clientId,
			client_secret: slack.clientSecret,
			code,
			redirect_uri: redirectUri,
			grant_type: 'authorization_code'
		})
	});
	const tokenJson = await tokenRes.json();
	if (!tokenJson.ok || !tokenJson.access_token) {
		throw redirect(303, '/login?fehler=token');
	}

	const infoRes = await fetch('https://slack.com/api/openid.connect.userInfo', {
		headers: { authorization: `Bearer ${tokenJson.access_token}` }
	});
	const profile = await infoRes.json();

	const userId = await findOrCreateUserFromSlack(profile);
	const sessionToken = await createSession(userId);
	setSessionCookie(cookies, sessionToken);

	throw redirect(303, '/');
}
