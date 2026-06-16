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

// Persönliche Ränge nach gesammelten Fahrgäste-Punkten (Gamification).
export const RANKS = [
	{ min: 0, title: 'Fahrgast', icon: '🎫' },
	{ min: 25, title: 'Stammgast', icon: '🎟️' },
	{ min: 60, title: 'Pendler-Profi', icon: '🚉' },
	{ min: 120, title: 'Streckenkenner', icon: '🧭' },
	{ min: 220, title: 'Netz-Legende', icon: '🌟' }
];

// Liefert den aktuellen Rang + Fortschritt zum nächsten.
export function rankFor(points) {
	const p = points || 0;
	let idx = 0;
	for (let i = 0; i < RANKS.length; i++) if (p >= RANKS[i].min) idx = i;
	const cur = RANKS[idx];
	const next = RANKS[idx + 1] ?? null;
	const progress = next ? (p - cur.min) / (next.min - cur.min) : 1;
	return {
		title: cur.title,
		icon: cur.icon,
		index: idx,
		points: p,
		next: next ? next.title : null,
		nextAt: next ? next.min : null,
		toNext: next ? Math.max(0, next.min - p) : 0,
		progress: Math.max(0, Math.min(1, progress))
	};
}

// --- Karten-Themes je Ausbaustufe (gemeinsam für Stadt-Karte & Simulation) ---
// Stadt aus der Vogelperspektive: pro Stufe eigene Farbwelt + eigener Aufbau.
export const CITY_THEMES = [
	{
		name: 'Dorf',
		day: { bg: 'radial-gradient(circle at 50% 50%, #e9f1d4 0%, #d3e3b8 96%)', water: '#9fc6dd', field: '#d7e29c', park: '#bcd58e', tree: '#6f9447', roof: '#cc7a4f', road: '#d3bd90', plaza: '#cfc19c', lit: '#ffd27a' },
		night: { bg: 'radial-gradient(circle at 50% 45%, #1f2c1c 0%, #131e16 96%)', water: '#34557a', field: '#2a3820', park: '#324a2b', tree: '#2a4125', roof: '#7c4a35', road: '#28321f', plaza: '#2c3322', lit: '#ffd27a' }
	},
	{
		name: 'Kleinstadt',
		day: { bg: 'radial-gradient(circle at 50% 50%, #f0e9d3 0%, #e0d6b6 96%)', water: '#a4c9df', field: '#cfdc9a', park: '#bbd29b', tree: '#789a52', roof: '#cf8a5c', road: '#dccfb1', plaza: '#d6cba8', lit: '#ffd27a' },
		night: { bg: 'radial-gradient(circle at 50% 45%, #2a2740 0%, #19172e 96%)', water: '#3a5d80', field: '#2f3a26', park: '#36502f', tree: '#314c2c', roof: '#8a5a3e', road: '#2f2b46', plaza: '#322e49', lit: '#ffd27a' }
	},
	{
		name: 'Großstadt',
		day: { bg: 'radial-gradient(circle at 50% 50%, #e6e9f0 0%, #d3d8e4 96%)', water: '#8fb6d6', field: '#c2cfa8', park: '#b4cf98', tree: '#7c9a62', roof: '#aeb3c1', road: '#f2f3f7', plaza: '#e3e5ec', lit: '#ffcf6f' },
		night: { bg: 'radial-gradient(circle at 50% 45%, #1e2640 0%, #131a2e 96%)', water: '#33597f', field: '#2f3a30', park: '#33492f', tree: '#2c4730', roof: '#2b2f41', road: '#3a4060', plaza: '#2e3450', lit: '#ffcf6f' }
	},
	{
		name: 'Metropole',
		day: { bg: 'radial-gradient(circle at 50% 50%, #e6e3ee 0%, #d0cadf 96%)', water: '#8bb0cf', field: '#bdcaa4', park: '#a9c391', tree: '#74906a', roof: '#9a9fb1', road: '#eef0f4', plaza: '#dfdee9', lit: '#ffd27a' },
		night: { bg: 'radial-gradient(circle at 50% 45%, #19142e 0%, #0e0a1d 96%)', water: '#2f5078', field: '#2c3530', park: '#314632', tree: '#2a4430', roof: '#23273c', road: '#34395a', plaza: '#2a2b46', lit: '#ffd27a' }
	}
];

function cityRnd(i, s) {
	return Math.abs((Math.sin(i * 12.9898 + s * 78.233) * 43758.5453) % 1);
}

// Erzeugt die Top-Down-Stadt (Felder/Wasser/Fluss/Parks/Straßen/Plätze/Dächer)
// je Ausbaustufe – mit eigenem Aufbau (nicht nur Dichte). W/H = Karten-Maße.
export function buildCity(idx, W, H) {
	const M = 24;
	const sx = (v) => M + v * (W - 2 * M);
	const sy = (v) => M + v * (H - 2 * M);
	const out = { fields: [], water: [], river: null, parks: [], roads: [], plazas: [], buildings: [] };

	const grove = (i, w, h, nt) => {
		const x = sx(cityRnd(i, 23)) - w / 2;
		const y = sy(cityRnd(i, 24)) - h / 2;
		const trees = [];
		for (let t = 0; t < nt; t++)
			trees.push({
				x: x + 8 + cityRnd(i * 13 + t, 26) * (w - 16),
				y: y + 8 + cityRnd(i * 13 + t, 27) * (h - 16),
				r: 3.5 + cityRnd(i * 13 + t, 28) * 3
			});
		return { x, y, w, h, trees };
	};
	const houses = (n, maxS) => {
		for (let i = 0; i < n; i++) {
			const w = 8 + cityRnd(i, 41) * maxS;
			const h = 8 + cityRnd(i, 42) * maxS;
			out.buildings.push({
				id: i,
				x: sx(cityRnd(i, 43)) - w / 2,
				y: sy(cityRnd(i, 44)) - h / 2,
				w,
				h,
				lit: cityRnd(i, 45) > 0.72
			});
		}
	};
	const grid = (n) => {
		for (let i = 0; i < n; i++) {
			if (cityRnd(i, 31) > 0.5) {
				const y = sy(cityRnd(i, 32));
				out.roads.push({ x1: 0, y1: y, x2: W, y2: y + (cityRnd(i, 33) - 0.5) * 30 });
			} else {
				const x = sx(cityRnd(i, 34));
				out.roads.push({ x1: x, y1: 0, x2: x + (cityRnd(i, 35) - 0.5) * 30, y2: H });
			}
		}
	};

	if (idx === 0) {
		for (let i = 0; i < 3; i++) {
			const w = 130 + cityRnd(i, 1) * 70;
			const h = 90 + cityRnd(i, 2) * 60;
			out.fields.push({ x: sx(cityRnd(i, 3)) - w / 2, y: sy(cityRnd(i, 4)) - h / 2, w, h });
		}
		out.water.push({ cx: sx(0.28), cy: sy(0.72), rx: 42, ry: 30 });
		for (let i = 0; i < 4; i++)
			out.parks.push(grove(i, 50 + cityRnd(i, 21) * 28, 42 + cityRnd(i, 22) * 22, 4 + Math.floor(cityRnd(i, 25) * 4)));
		houses(7, 14);
	} else if (idx === 1) {
		out.fields.push({ x: sx(0.82) - 60, y: sy(0.18) - 45, w: 120, h: 90 });
		out.water.push({ cx: sx(0.72), cy: sy(0.76), rx: 52, ry: 36 });
		out.parks.push(grove(0, 110, 78, 7));
		out.parks.push(grove(1, 58, 48, 4));
		grid(3);
		houses(22, 15);
	} else {
		const y0 = sy(0.26);
		const y1 = sy(0.7);
		out.river = `M 0 ${y0} C ${W * 0.32} ${y0 - 70}, ${W * 0.6} ${y1 + 60}, ${W} ${y1}`;
		grid(idx === 2 ? 5 : 8);
		out.parks.push(grove(0, 100, 70, 6));
		if (idx === 3) {
			out.parks.push(grove(1, 78, 58, 5));
			for (let i = 0; i < 2; i++)
				out.plazas.push({ cx: sx(0.3 + i * 0.42), cy: sy(0.38 + cityRnd(i, 51) * 0.24), r: 24 + cityRnd(i, 52) * 12 });
		}
		houses(idx === 2 ? 50 : 90, idx === 2 ? 16 : 20);
	}
	return out;
}

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
