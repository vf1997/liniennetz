import { SETTING_DEFS, getSettings, saveSettings, resetSettings } from '$lib/server/settings.js';
import { getSlackConfig } from '$lib/server/auth.js';

export async function load({ url }) {
	const s = await getSettings();
	const slack = await getSlackConfig();
	const values = {};
	for (const def of SETTING_DEFS) {
		values[def.key] = def.type === 'list' ? s[def.key].join(', ') : s[def.key];
	}
	// Sichtbare Felder nach Gruppen ordnen (hidden-Felder werden separat behandelt)
	const groups = [];
	for (const def of SETTING_DEFS) {
		if (def.hidden) continue;
		let g = groups.find((x) => x.name === def.group);
		if (!g) {
			g = { name: def.group, fields: [] };
			groups.push(g);
		}
		g.fields.push(def);
	}
	return {
		groups,
		values,
		login: {
			mode: slack.mode,
			clientId: s.slackClientId,
			clientSecret: s.slackClientSecret,
			redirectUri: s.slackRedirectUri,
			hasCreds: slack.hasCreds,
			active: slack.active,
			// Vorschlag für die Redirect-URL, falls noch keine eingetragen ist
			suggestedRedirect: `${url.origin}/auth/slack/callback`
		}
	};
}

export const actions = {
	speichern: async ({ request }) => {
		const data = await request.formData();
		const values = {};
		for (const def of SETTING_DEFS) {
			if (def.hidden) continue;
			values[def.key] = data.get(def.key);
		}
		await saveSettings(values);
		return { saved: true };
	},
	zuruecksetzen: async () => {
		await resetSettings();
		return { reset: true };
	},
	// Anmelde-Modus umschalten und ggf. Slack-Zugangsdaten speichern
	anmeldung: async ({ request }) => {
		const data = await request.formData();
		const mode = data.get('loginMode') === 'slack' ? 'slack' : 'demo';
		await saveSettings({
			loginMode: mode,
			slackClientId: data.get('slackClientId') ?? '',
			slackClientSecret: data.get('slackClientSecret') ?? '',
			slackRedirectUri: data.get('slackRedirectUri') ?? ''
		});
		return { saved: true };
	}
};
