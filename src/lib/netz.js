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

// Auswählbare Avatar-Symbole (statt Initialen).
export const AVATAR_ICONS = [
	'😀', '😎', '🤓', '🤖', '🦊', '🐱', '🐶', '🐼',
	'🐧', '🦉', '🐢', '🐝', '🦄', '🐙', '🦖', '🐬',
	'🌟', '🚀', '⚡', '🌈', '🎩', '👑', '🎸', '🎮',
	'☕', '🌵', '🍀', '🔥', '🍕', '🏀', '🎨', '📚'
];

// Was im Avatar-Kreis steht: gewähltes Emoji, sonst die Initialen.
export function avatarText(user) {
	return user?.avatar || monogram(user?.name);
}

// Wahrzeichen, die eine abgeschlossene Wochen-Mission freischaltet
export const LANDMARKS = {
	hauptbahnhof: {
		icon: '🏛️',
		label: 'Hauptbahnhof',
		desc: 'Das Herz eures Netzes – gemeinsam durch eine Wochen-Mission freigeschaltet.'
	},
	bruecke: {
		icon: '🌉',
		label: 'Brücke',
		desc: 'Verbindet, was vorher getrennt war – Belohnung für eine erfüllte Wochen-Mission.'
	},
	park: {
		icon: '🌳',
		label: 'Stadtpark',
		desc: 'Ein Ort zum Durchatmen – euer Netz hat dafür eine Wochen-Mission gemeistert.'
	}
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

	// Hindernisse für die Häuser-Platzierung: Punkte entlang Straßen/Fluss/Teich,
	// damit kein Haus auf einer Straße oder im Wasser landet (Straße geht nicht durch Häuser).
	const obstacles = [];
	let riverPts = []; // Stützpunkte des Flusses – Straßen sollen nicht parallel darin laufen
	const cubicPts = (p0, p1, p2, p3, steps = 16) => {
		const pts = [];
		for (let s = 0; s <= steps; s++) {
			const t = s / steps;
			const mt = 1 - t;
			pts.push([
				mt * mt * mt * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t * t * t * p3[0],
				mt * mt * mt * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t * t * t * p3[1]
			]);
		}
		return pts;
	};
	const addObstacles = (pts, pad) => {
		for (const p of pts) obstacles.push({ x: p[0], y: p[1], pad });
	};

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
	// Häuser deterministisch platzieren. Aussparen: Straßen/Fluss/Teich (obstacles)
	// UND andere Häuser (keine Überlappung) – per Rejection Sampling.
	const GAP = 4; // Mindestabstand zwischen zwei Häusern
	const houses = (n, maxS) => {
		let placed = 0;
		let k = 0;
		while (placed < n && k < n * 40) {
			const w = 8 + cityRnd(k, 41) * maxS;
			const h = 8 + cityRnd(k, 42) * maxS;
			const cx = sx(cityRnd(k, 43));
			const cy = sy(cityRnd(k, 44));
			const lit = cityRnd(k, 45) > 0.72;
			k++;
			const half = Math.max(w, h) / 2;
			const x = cx - w / 2;
			const y = cy - h / 2;
			// 1) zu nah an Straße/Fluss/Teich?
			const nearObstacle = obstacles.some((o) => {
				const dx = cx - o.x;
				const dy = cy - o.y;
				const min = o.pad + half;
				return dx * dx + dy * dy < min * min;
			});
			if (nearObstacle) continue;
			// 2) überlappt ein bereits gesetztes Haus (mit kleinem Abstand)?
			const overlaps = out.buildings.some(
				(b) => x < b.x + b.w + GAP && b.x < x + w + GAP && y < b.y + b.h + GAP && b.y < y + h + GAP
			);
			if (overlaps) continue;
			out.buildings.push({ id: placed, x, y, w, h, lit });
			placed++;
		}
	};
	// Geschwungene Straßen (sanfte Kurven) in DREI Richtungen – waagerecht, senkrecht
	// UND diagonal – wirkt wie ein lebendiges Stadtnetz. Straßen, die zu lange parallel
	// im Fluss lägen, werden verworfen (eine querende/diagonale Straße hat nur wenige
	// flussnahe Punkte; eine parallel laufende viele).
	const grid = (n) => {
		let placed = 0;
		let k = 0;
		while (placed < n && k < n * 12) {
			const a = (cityRnd(k, 36) - 0.5) * 55; // sanfte Kurven-Auslenkung
			const b = (cityRnd(k, 37) - 0.5) * 55;
			const dir = placed % 3; // 0 waagerecht, 1 senkrecht, 2 diagonal → garantierter Mix
			let p0, p1, p2, p3;
			if (dir === 0) {
				const y = sy(0.12 + cityRnd(k, 32) * 0.76);
				const y2 = y + (cityRnd(k, 33) - 0.5) * 45;
				p0 = [0, y]; p1 = [W * 0.3, y + a]; p2 = [W * 0.66, y2 + b]; p3 = [W, y2];
			} else if (dir === 1) {
				const x = sx(0.12 + cityRnd(k, 34) * 0.76);
				const x2 = x + (cityRnd(k, 35) - 0.5) * 45;
				p0 = [x, 0]; p1 = [x + a, H * 0.3]; p2 = [x2 + b, H * 0.66]; p3 = [x2, H];
			} else {
				// Diagonale quer über die Karte (Richtung zufällig, damit sie den Fluss kreuzt)
				const yA = sy(0.08 + cityRnd(k, 38) * 0.28);
				const yB = sy(0.64 + cityRnd(k, 39) * 0.28);
				const [ys, ye] = cityRnd(k, 40) > 0.5 ? [yA, yB] : [yB, yA];
				p0 = [0, ys];
				p1 = [W * 0.33, ys + (ye - ys) * 0.33 + a];
				p2 = [W * 0.66, ys + (ye - ys) * 0.66 + b];
				p3 = [W, ye];
			}
			k++;
			// dicht abtasten, damit Häuser zuverlässig Abstand halten (keine Lücken zwischen Punkten)
			const pts = cubicPts(p0, p1, p2, p3, 50);
			if (riverPts.length) {
				// Längster zusammenhängender Lauf nah am Fluss: eine querende Straße
				// streift den Fluss nur kurz, eine parallel laufende über eine lange Strecke.
				let run = 0;
				let maxRun = 0;
				for (const rp of pts) {
					const near = riverPts.some(
						(q) => (rp[0] - q[0]) ** 2 + (rp[1] - q[1]) ** 2 < 30 * 30
					);
					if (near) {
						run++;
						if (run > maxRun) maxRun = run;
					} else {
						run = 0;
					}
				}
				if (maxRun > 6) continue; // läuft zu lange am Fluss entlang → parallel → verwerfen
			}
			out.roads.push(`M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`);
			addObstacles(pts, 16);
			placed++;
		}
	};
	const pond = (cx, cy, rx, ry) => {
		out.water.push({ cx, cy, rx, ry });
		obstacles.push({ x: cx, y: cy, pad: Math.max(rx, ry) + 6 });
	};

	if (idx === 0) {
		for (let i = 0; i < 3; i++) {
			const w = 130 + cityRnd(i, 1) * 70;
			const h = 90 + cityRnd(i, 2) * 60;
			out.fields.push({ x: sx(cityRnd(i, 3)) - w / 2, y: sy(cityRnd(i, 4)) - h / 2, w, h });
		}
		pond(sx(0.28), sy(0.72), 42, 30);
		for (let i = 0; i < 4; i++)
			out.parks.push(grove(i, 50 + cityRnd(i, 21) * 28, 42 + cityRnd(i, 22) * 22, 4 + Math.floor(cityRnd(i, 25) * 4)));
		houses(7, 14);
	} else if (idx === 1) {
		out.fields.push({ x: sx(0.82) - 60, y: sy(0.18) - 45, w: 120, h: 90 });
		pond(sx(0.72), sy(0.76), 52, 36);
		out.parks.push(grove(0, 110, 78, 7));
		out.parks.push(grove(1, 58, 48, 4));
		grid(3);
		houses(22, 15);
	} else {
		const y0 = sy(0.26);
		const y1 = sy(0.7);
		const rp0 = [0, y0], rp1 = [W * 0.32, y0 - 70], rp2 = [W * 0.6, y1 + 60], rp3 = [W, y1];
		out.river = `M ${rp0[0]} ${rp0[1]} C ${rp1[0]} ${rp1[1]}, ${rp2[0]} ${rp2[1]}, ${rp3[0]} ${rp3[1]}`;
		// Fluss-Stützpunkte: Straßen meiden Parallelverlauf, Häuser bleiben am Ufer.
		riverPts = cubicPts(rp0, rp1, rp2, rp3, 36);
		addObstacles(riverPts, 30);
		// Straßen in beide Richtungen; die Parallel-Prüfung sorgt fürs Queren des Flusses.
		grid(idx === 2 ? 6 : 9);
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

// Sanfte Farben für die Stadtviertel – je Abteilung ein eigener Ton.
export const DISTRICT_COLORS = [
	'#b5462f',
	'#3f6b73',
	'#c89b3c',
	'#7c8b5e',
	'#8a5a8b',
	'#a8674a',
	'#5f7a6a',
	'#9a6b9c'
];

/**
 * Ordnet die Haltestellen nach Abteilung in „Stadtviertel": jede Abteilung
 * bekommt eine eigene Zelle (Rasterfeld) auf der Karte; ihre Mitglieder
 * gruppieren sich darin (kleines Sonnenblumen-Muster). Liefert die Positionen
 * je User-ID UND die Viertel (Zentrum, Maße, Farbe, Name) zum Einzeichnen.
 */
export function cityDistricts(users, W, H) {
	const margin = 70;
	const sorted = [...users].sort((a, b) => a.id - b.id);

	// Nach Abteilung gruppieren (stabile Reihenfolge nach erstem Auftreten der ID).
	const order = [];
	const groups = new Map();
	for (const u of sorted) {
		const key = (u.department && String(u.department).trim()) || 'Ohne Team';
		if (!groups.has(key)) {
			groups.set(key, []);
			order.push(key);
		}
		groups.get(key).push(u);
	}

	const D = order.length;
	const cols = Math.ceil(Math.sqrt(D));
	const rows = Math.ceil(D / cols);
	const cellW = (W - 2 * margin) / cols;
	const cellH = (H - 2 * margin) / rows;
	const golden = Math.PI * (3 - Math.sqrt(5));
	const positions = {};
	const districts = [];

	order.forEach((name, di) => {
		const members = groups.get(name);
		const row = Math.floor(di / cols);
		const col = di % cols;
		// Letzte (evtl. unvollständige) Reihe waagerecht zentrieren.
		const inRow = Math.min(cols, D - row * cols);
		const rowOffset = ((cols - inRow) * cellW) / 2;
		const dcx = margin + rowOffset + cellW * (col + 0.5);
		const dcy = margin + cellH * (row + 0.5);

		const m = members.length;
		const clusterR = m <= 1 ? 0 : Math.min(cellW, cellH) * 0.28;
		members.forEach((u, i) => {
			const r = m === 1 ? 0 : clusterR * Math.sqrt((i + 0.5) / m);
			const ang = i * golden + di * 1.3;
			positions[u.id] = { x: dcx + r * Math.cos(ang), y: dcy + r * Math.sin(ang) };
		});

		districts.push({
			name,
			cx: dcx,
			cy: dcy,
			rx: cellW * 0.42,
			ry: cellH * 0.42,
			color: DISTRICT_COLORS[di % DISTRICT_COLORS.length],
			count: m
		});
	});

	return { positions, districts };
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
