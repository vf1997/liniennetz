import { getSettings } from '$lib/server/settings.js';

// Die Doku zeigt die aktuell eingestellten Werte – damit bleibt sie automatisch aktuell.
export async function load() {
	return { settings: await getSettings() };
}
