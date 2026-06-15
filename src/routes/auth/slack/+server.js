import { redirect } from '@sveltejs/kit';
import crypto from 'node:crypto';
import { getSlackConfig } from '$lib/server/auth.js';

// Startet den "Mit Slack anmelden"-Vorgang.
export async function GET({ cookies, url }) {
	const slack = await getSlackConfig();
	if (!slack.active) throw redirect(303, '/login');

	// state schützt vor Missbrauch (CSRF): beweist beim Rückweg, dass der
	// Vorgang wirklich von uns gestartet wurde.
	const state = crypto.randomUUID();
	cookies.set('slack_oauth_state', state, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 600
	});

	const redirectUri = slack.redirectUri || `${url.origin}/auth/slack/callback`;
	const authUrl = new URL('https://slack.com/openid/connect/authorize');
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('scope', 'openid profile email');
	authUrl.searchParams.set('client_id', slack.clientId);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('redirect_uri', redirectUri);

	throw redirect(303, authUrl.toString());
}
