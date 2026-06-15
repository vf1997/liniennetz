/**
 * Gemeinsame, reine Hilfsfunktionen für "Liniennetz".
 * Diese Datei darf sowohl auf dem Server als auch im Browser benutzt werden
 * (sie greift NICHT auf die Datenbank zu).
 */

// Die Firmenwerte, an die man einen Fahrschein knüpft (bestimmt auch die Linienfarbe).
// Sollte zur Standard-Liste in src/lib/server/settings.js (firmenwerte) passen.
export const VALUES = [
	'Füreinander da',
	'Software mit Herz',
	'Gemeinsam wegweisend',
	'Tüftlergeist',
	'Fahrgast im Blick'
];

// Linienfarben wie bei einem U-Bahn-Plan
export const LINE_COLORS = ['#b5462f', '#3f6b73', '#c89b3c', '#7c8b5e', '#8a5a8b'];

export function colorForValue(value) {
	const i = VALUES.indexOf(value);
	return LINE_COLORS[(i >= 0 ? i : 0) % LINE_COLORS.length];
}

const MONOGRAM_COLORS = ['#b5462f', '#7c8b5e', '#3f6b73', '#c89b3c', '#8a5a8b', '#a8674a', '#5f7a6a'];

function hashString(str) {
	let h = 0;
	for (let i = 0; i < str.length; i++) {
		h = (h << 5) - h + str.charCodeAt(i);
		h |= 0;
	}
	return Math.abs(h);
}

// Initialen aus einem Namen, z. B. "Mara Lindqvist" -> "ML"
export function monogram(name) {
	const parts = String(name || '?')
		.trim()
		.split(/\s+/);
	const first = parts[0]?.[0] ?? '?';
	const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
	return (first + last).toUpperCase();
}

// Eine stabile Erdton-Farbe pro Person
export function monogramColor(name) {
	return MONOGRAM_COLORS[hashString(String(name || '')) % MONOGRAM_COLORS.length];
}

// Wahrzeichen, die eine abgeschlossene Wochen-Mission freischaltet
export const LANDMARKS = {
	hauptbahnhof: { icon: '🏛️', label: 'Hauptbahnhof' },
	bruecke: { icon: '🌉', label: 'Brücke' },
	park: { icon: '🌳', label: 'Stadtpark' }
};

// Deko für die eigene Haltestelle – wird über gesammelte Fahrgäste-Punkte freigeschaltet
export const DECORATIONS = [
	{ key: 'baum', icon: '🌳', label: 'Baum', cost: 0 },
	{ key: 'bank', icon: '🪑', label: 'Bank', cost: 20 },
	{ key: 'lampe', icon: '💡', label: 'Laterne', cost: 40 },
	{ key: 'cafe', icon: '☕', label: 'Café', cost: 70 },
	{ key: 'tram', icon: '🚊', label: 'Tram', cost: 100 }
];

export function decorationByKey(key) {
	return DECORATIONS.find((d) => d.key === key) ?? null;
}

// Die Ausbaustufen des gemeinsamen Netzes.
// Die Schwellen sind konfigurierbar; ohne Angabe gelten diese Standardwerte.
export function netzStufe(lineCount, thresholds) {
	const t = thresholds ?? {};
	const levels = [
		{ name: 'Dorf', min: 0 },
		{ name: 'Kleinstadt', min: t.kleinstadt ?? 5 },
		{ name: 'Großstadt', min: t.grossstadt ?? 15 },
		{ name: 'Metropole', min: t.metropole ?? 30 }
	];
	let idx = 0;
	for (let i = 0; i < levels.length; i++) {
		if (lineCount >= levels[i].min) idx = i;
	}
	const current = levels[idx];
	const next = levels[idx + 1] ?? null;
	const progress = next ? (lineCount - current.min) / (next.min - current.min) : 1;
	return {
		name: current.name,
		index: idx,
		next: next?.name ?? null,
		nextAt: next?.min ?? null,
		progress: Math.max(0, Math.min(1, progress)),
		count: lineCount
	};
}

/**
 * Verteilt die Haltestellen gleichmäßig und hübsch auf einer Scheibe
 * (Sonnenblumen-/Phyllotaxis-Muster). Die Position hängt nur von der
 * Reihenfolge der ID ab – damit liegt jede Haltestelle immer am selben Ort.
 */
export function stationPositions(users, width, height) {
	const cx = width / 2;
	const cy = height / 2;
	const margin = 72;
	const maxR = Math.min(width, height) / 2 - margin;
	const n = Math.max(users.length, 1);
	const golden = Math.PI * (3 - Math.sqrt(5));
	const sorted = [...users].sort((a, b) => a.id - b.id);
	const map = {};
	sorted.forEach((u, i) => {
		const r = n === 1 ? 0 : maxR * Math.sqrt((i + 0.5) / n);
		const angle = i * golden;
		map[u.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
	});
	return map;
}

// ISO-Kalenderwoche als Schlüssel, z. B. "2026-W24"
export function getWeekKey(date) {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	const dayNum = (d.getUTCDay() + 6) % 7;
	d.setUTCDate(d.getUTCDate() - dayNum + 3);
	const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
	const week =
		1 +
		Math.round(
			((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7
		);
	return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Antworten vergleichbar machen (Kleinschreibung, Leerzeichen, Satzzeichen am Ende)
export function normalizeAnswer(s) {
	return String(s || '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.replace(/[.!?,;:]+$/, '');
}
