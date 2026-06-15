import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { settings } from './db/schema.js';

/**
 * Alle einstellbaren Parameter der App – an EINER Stelle definiert.
 * Jeder Eintrag liefert gleichzeitig den Standardwert UND die Beschreibung
 * für die Einstellungs-Seite. Neuer Parameter = ein neuer Eintrag hier.
 */
export const SETTING_DEFS = [
	{
		key: 'ticketsPerWeek',
		group: 'Fahrscheine',
		label: 'Fahrscheine pro Woche',
		type: 'int',
		default: 5,
		min: 1,
		max: 50,
		help: 'Wie viele Fahrscheine jede Person pro Woche verschenken kann. Wirkt ab der nächsten neuen Woche bzw. für neue Personen.'
	},
	{
		key: 'pointsNewStrecke',
		group: 'Punkte (Fahrgäste)',
		label: 'Punkte für eine neue Strecke',
		type: 'int',
		default: 15,
		min: 0,
		max: 500,
		help: 'Bonus, wenn zwei Personen zum allerersten Mal verbunden werden.'
	},
	{
		key: 'pointsGiveTicket',
		group: 'Punkte (Fahrgäste)',
		label: 'Punkte fürs Verschenken',
		type: 'int',
		default: 8,
		min: 0,
		max: 500,
		help: 'Punkte für die schenkende Person bei einer bereits bestehenden Verbindung.'
	},
	{
		key: 'pointsReceiveTicket',
		group: 'Punkte (Fahrgäste)',
		label: 'Punkte fürs Erhalten',
		type: 'int',
		default: 5,
		min: 0,
		max: 500,
		help: 'Punkte für die Person, die einen Fahrschein bekommt.'
	},
	{
		key: 'pointsAnswer',
		group: 'Punkte (Fahrgäste)',
		label: 'Punkte für die Tagesfrage',
		type: 'int',
		default: 5,
		min: 0,
		max: 500,
		help: 'Punkte fürs Beantworten der Frage des Tages.'
	},
	{
		key: 'pointsLieCorrect',
		group: 'Punkte (Fahrgäste)',
		label: 'Punkte für eine enttarnte Lüge',
		type: 'int',
		default: 10,
		min: 0,
		max: 500,
		help: 'Punkte für beide Seiten, wenn jemand bei „Zwei Wahrheiten, eine Lüge" richtig rät.'
	},
	{
		key: 'levelKleinstadt',
		group: 'Netz-Ausbaustufen',
		label: 'Linien bis „Kleinstadt"',
		type: 'int',
		default: 5,
		min: 1,
		max: 5000,
		help: 'Ab so vielen bestätigten Linien wird aus dem Dorf eine Kleinstadt.'
	},
	{
		key: 'levelGrossstadt',
		group: 'Netz-Ausbaustufen',
		label: 'Linien bis „Großstadt"',
		type: 'int',
		default: 15,
		min: 1,
		max: 5000,
		help: 'Ab so vielen bestätigten Linien wird aus der Kleinstadt eine Großstadt.'
	},
	{
		key: 'levelMetropole',
		group: 'Netz-Ausbaustufen',
		label: 'Linien bis „Metropole"',
		type: 'int',
		default: 30,
		min: 1,
		max: 5000,
		help: 'Ab so vielen bestätigten Linien erreicht das Netz die Metropole (höchste Stufe).'
	},
	{
		key: 'decoBank',
		group: 'Werkstatt-Kosten (Punkte)',
		label: '🪑 Bank',
		type: 'int',
		default: 20,
		min: 0,
		max: 5000,
		help: 'Benötigte Fahrgäste-Punkte, um die Bank freizuschalten.'
	},
	{
		key: 'decoLampe',
		group: 'Werkstatt-Kosten (Punkte)',
		label: '💡 Laterne',
		type: 'int',
		default: 40,
		min: 0,
		max: 5000
	},
	{
		key: 'decoCafe',
		group: 'Werkstatt-Kosten (Punkte)',
		label: '☕ Café',
		type: 'int',
		default: 70,
		min: 0,
		max: 5000
	},
	{
		key: 'decoTram',
		group: 'Werkstatt-Kosten (Punkte)',
		label: '🚊 Tram',
		type: 'int',
		default: 100,
		min: 0,
		max: 5000
	},
	{
		key: 'firmenwerte',
		group: 'Inhalte',
		label: 'Firmenwerte (mit Komma getrennt)',
		type: 'list',
		default: 'Füreinander da, Sicher unterwegs, Fahrgast zuerst, Tüftlergeist, Pünktlich & verlässlich',
		help: 'Diese Werte kann man an einen Fahrschein hängen. Der erste Wert in der Liste gilt als „Schicht-Hilfe" und vergibt das Abzeichen „Schicht-Retter".'
	},
	{
		// versteckt: wird nicht im normalen Formular gezeigt, sondern über die Demo-Zeitmaschine gesteuert
		key: 'demoOffsetDays',
		group: 'Demo',
		label: 'Zeit-Versatz (Tage)',
		type: 'int',
		default: 0,
		min: -3650,
		max: 3650,
		hidden: true
	},
	// Anmeldung: 'demo' = Person per Klick wählen, 'slack' = echtes Slack-Login.
	// Diese Felder bekommen eine eigene Bedien-Oberfläche im Abschnitt "Anmeldung".
	{ key: 'loginMode', group: 'Anmeldung', label: 'Anmelde-Modus', type: 'text', default: 'demo', hidden: true },
	{ key: 'slackClientId', group: 'Anmeldung', label: 'Slack Client ID', type: 'text', default: '', hidden: true },
	{ key: 'slackClientSecret', group: 'Anmeldung', label: 'Slack Client Secret', type: 'text', default: '', hidden: true },
	{ key: 'slackRedirectUri', group: 'Anmeldung', label: 'Slack Redirect URL', type: 'text', default: '', hidden: true }
];

const DEFS_BY_KEY = Object.fromEntries(SETTING_DEFS.map((d) => [d.key, d]));

function coerce(def, raw) {
	if (def.type === 'int') {
		let n = parseInt(raw, 10);
		if (Number.isNaN(n)) n = def.default;
		if (def.min != null) n = Math.max(def.min, n);
		if (def.max != null) n = Math.min(def.max, n);
		return n;
	}
	if (def.type === 'list') {
		return String(raw)
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return String(raw);
}

/** Liefert alle Einstellungen als fertig getyptes Objekt (Zahlen als Zahlen, Listen als Arrays). */
export async function getSettings() {
	const rows = await db.select().from(settings);
	const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
	const out = {};
	for (const def of SETTING_DEFS) {
		out[def.key] = coerce(def, stored[def.key] ?? def.default);
	}
	return out;
}

/** Speichert Werte aus einem {key: rohwert}-Objekt (z. B. aus einem Formular). */
export async function saveSettings(values) {
	for (const def of SETTING_DEFS) {
		const raw = values[def.key];
		if (raw === undefined || raw === null) continue;
		let toStore;
		if (def.type === 'int') {
			toStore = String(coerce(def, raw));
		} else if (def.type === 'list') {
			// als bereinigte Komma-Liste ablegen
			toStore = coerce(def, raw).join(', ');
		} else {
			toStore = String(raw).trim();
		}
		const existing = (await db.select().from(settings).where(eq(settings.key, def.key)))[0];
		if (existing) {
			await db.update(settings).set({ value: toStore }).where(eq(settings.key, def.key));
		} else {
			await db.insert(settings).values({ key: def.key, value: toStore });
		}
	}
}

/** Setzt alle Einstellungen auf die Standardwerte zurück. */
export async function resetSettings() {
	await db.delete(settings);
}

/** Die (für die Demo ggf. verschobene) aktuelle Zeit. */
export function demoNow(settings) {
	const off = settings?.demoOffsetDays || 0;
	return new Date(Date.now() + off * 86400000);
}

export { DEFS_BY_KEY };
