import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import {
	users,
	connections,
	ticketBudgets,
	questions,
	answers,
	interests,
	points,
	quests,
	claps,
	truths,
	guesses,
	sessions
} from '../src/lib/server/db/schema.js';
import { getWeekKey } from '../src/lib/netz.js';
import { resolveDbConfig } from '../src/lib/server/db/resolve.js';

/**
 * Füllt die Datenbank mit glaubwürdigen Beispiel-Daten,
 * damit "Liniennetz" sofort lebendig wirkt.
 * Ausführen mit:  npm run db:seed
 *
 * Welche Datenbank befüllt wird, steuert DB_MODE (siehe resolve.js):
 * lokal (Datei) oder Turso (Cloud). Zum gezielten Befüllen der Cloud:
 *   DB_MODE=turso npm run db:seed
 */

// .env einlesen (ohne Zusatz-Bibliothek), damit DB_MODE und Turso-Werte gefunden werden.
try {
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
		if (!m || process.env[m[1]]) continue;
		let v = m[2];
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		if (v) process.env[m[1]] = v;
	}
} catch {
	// keine .env -> lokale Datei
}

const dbCfg = resolveDbConfig(process.env);
const client = createClient({ url: dbCfg.url, authToken: dbCfg.authToken });
const db = drizzle(client);
console.log(`→ Befülle ${dbCfg.mode === 'turso' ? 'die Turso-Cloud-Datenbank' : 'die lokale Datei local.db'} …`);

// Vorhandene Daten leeren, damit erneutes Seeden sauber ERSETZT (nicht dupliziert).
// Reihenfolge: erst abhängige Tabellen, dann die referenzierten.
// Hinweis: die Einstellungen (settings) bleiben unangetastet.
await db.delete(claps);
await db.delete(guesses);
await db.delete(truths);
await db.delete(answers);
await db.delete(points);
await db.delete(interests);
await db.delete(ticketBudgets);
await db.delete(sessions);
await db.delete(connections);
await db.delete(questions);
await db.delete(quests);
await db.delete(users);

function daysAgo(n) {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d;
}
function todayStr(d = new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
		d.getDate()
	).padStart(2, '0')}`;
}

// --- Personen (interdisziplinäres Team: Produkt, Entwicklung, Beratung, Support, Design) ---
const personas = [
	{ name: 'Mara Lindqvist', role: 'Product Ownerin VIA', department: 'Produkt', tags: ['Wandern', 'True-Crime-Podcasts', 'Filterkaffee'] },
	{ name: 'Tobias Krüger', role: 'Backend-Entwickler', department: 'Entwicklung', tags: ['Mechanical Keyboards', '80er-Musik', 'Schach'] },
	{ name: 'Aylin Demir', role: 'Kundenberaterin', department: 'Beratung', tags: ['Yoga', 'Kochen', 'Filterkaffee'] },
	{ name: 'Jens Hoffmann', role: 'Frontend-Entwickler', department: 'Entwicklung', tags: ['Open Source', 'Heavy Metal', 'Grillen'] },
	{ name: 'Sophie Bauer', role: 'People & Culture', department: 'Verwaltung', tags: ['Lesen', 'Yoga', 'Tee'] },
	{ name: 'Ricardo Santos', role: 'UX/UI Designer', department: 'Design', tags: ['Fußball', 'Kochen', 'Gitarre'] },
	{ name: 'Petra Wagner', role: 'Support-Spezialistin', department: 'Support', tags: ['Gartenarbeit', 'True-Crime-Podcasts', 'Tee'] },
	{ name: 'Daniel Fischer', role: 'Customer Success Manager', department: 'Beratung', tags: ['Radfahren', 'Fotografie', 'Filterkaffee'] }
];

// E-Mail aus dem Namen auf der Firmen-Domain (vorname.nachname@stadtlandnetz.de)
function emailFor(name) {
	return (
		name
			.toLowerCase()
			.replaceAll('ä', 'ae')
			.replaceAll('ö', 'oe')
			.replaceAll('ü', 'ue')
			.replaceAll('ß', 'ss')
			.replace(/[^a-z ]/g, '')
			.trim()
			.replace(/ +/g, '.') + '@stadtlandnetz.de'
	);
}

// Ein paar Haltestellen haben schon Deko (über Index zugeordnet)
const decoByIdx = { 0: 'cafe', 3: 'tram', 2: 'baum', 6: 'lampe' };

const insertedUsers = await db
	.insert(users)
	.values(
		personas.map((p, i) => ({
			slackId: `dev:seed-${i + 1}`,
			workspaceId: 'demo',
			name: p.name,
			email: emailFor(p.name),
			avatarUrl: null,
			role: p.role,
			department: p.department,
			decoration: decoByIdx[i] ?? null
		}))
	)
	.returning();

const id = (i) => insertedUsers[i].id;

// --- Interessen ---
const interestRows = [];
personas.forEach((p, i) => p.tags.forEach((tag) => interestRows.push({ userId: id(i), tag })));
await db.insert(interests).values(interestRows);

// --- Linien (geschenkte Fahrscheine) über mehrere Tage ---
const lineDefs = [
	// Mara (Index 0) bekommt 3× „Füreinander da" -> Abzeichen „Rückenstärker"
	[2, 0, 'Füreinander da', 'Du hast meinen Kunden-Call gerettet, danke!', 1],
	[3, 0, 'Füreinander da', 'Bist sofort eingesprungen, als das Release wackelte – danke!', 0],
	[7, 0, 'Füreinander da', 'Immer ansprechbar für uns in der Beratung. Danke, Mara!', 2],
	[5, 0, 'Software mit Herz', 'Dein Produkt-Gespür macht VIA richtig nahbar.', 2],
	[0, 1, 'Tüftlergeist', 'Den fiesen NovaHub-Bug elegant gefixt – stark!', 0],
	[3, 1, 'Tüftlergeist', 'Sauberes Code-Review, viel gelernt!', 1],
	[1, 3, 'Gemeinsam wegweisend', 'Klasse Pairing an der heyNova-App.', 2],
	[6, 3, 'Tüftlergeist', 'Bug sauber reproduziert und dokumentiert – top!', 3],
	[0, 5, 'Software mit Herz', 'Dein neues Design ist einfach schön geworden.', 0],
	[7, 5, 'Software mit Herz', 'Dein Prototyp hat den Kunden begeistert!', 3],
	[2, 7, 'Fahrgast im Blick', 'Super Beratung beim Schulträger.', 0],
	[4, 2, 'Fahrgast im Blick', 'Geduldige Hilfe bei den Eltern-Anfragen.', 2],
	[2, 6, 'Füreinander da', 'Danke fürs Einspringen im Support!', 1],
	[4, 6, 'Füreinander da', 'Danke, dass du im Support ausgeholfen hast.', 1],
	[5, 4, 'Gemeinsam wegweisend', 'Tolles Onboarding-Material zusammengestellt.', 1]
];

const connectionRows = lineDefs.map(([from, to, value, message, ago]) => {
	const createdAt = daysAgo(ago);
	return {
		fromUserId: id(from),
		toUserId: id(to),
		valueTag: value,
		message,
		week: getWeekKey(createdAt),
		createdAt
	};
});
const insertedConns = await db.insert(connections).values(connectionRows).returning();

// --- Applaus auf ein paar schöne Gesten ---
await db.insert(claps).values([
	{ userId: id(3), connectionId: insertedConns[0].id },
	{ userId: id(4), connectionId: insertedConns[0].id },
	{ userId: id(5), connectionId: insertedConns[1].id },
	{ userId: id(2), connectionId: insertedConns[4].id }
]);

// --- Punkte passend zu den Linien ---
const pointRows = [];
lineDefs.forEach(([from, to]) => {
	pointRows.push({ userId: id(from), amount: 10, reason: 'fahrschein_gegeben' });
	pointRows.push({ userId: id(to), amount: 5, reason: 'fahrschein_erhalten' });
});
await db.insert(points).values(pointRows);

// --- Fahrschein-Budgets für die aktuelle Woche ---
const week = getWeekKey(new Date());
const remainingByIdx = [2, 3, 1, 4, 3, 0, 4, 2]; // Ricardo (Index 5) hat alle verschenkt -> "Großzügig"
await db.insert(ticketBudgets).values(
	remainingByIdx.map((remaining, i) => ({ userId: id(i), week, remaining }))
);

// --- Fragen ---
const questionDefs = [
	{ text: 'Kaffee oder Tee im Daily?', activeDate: todayStr() },
	{ text: 'Welches unserer Produkte zeigst du Freund:innen zuerst – VIA, myVIA, NovaHub oder heyNova?', activeDate: null },
	{ text: 'Welcher Song darf im Fokus-Modus nicht fehlen?', activeDate: null },
	{ text: 'Was war dein allererster Job?', activeDate: null },
	{ text: 'Womit planst du deinen Tag – analog oder digital?', activeDate: null },
	{ text: 'Süßer oder herzhafter Snack im Homeoffice?', activeDate: null }
];
const insertedQuestions = await db.insert(questions).values(questionDefs).returning();
const todayQuestionId = insertedQuestions[0].id;

// --- Antworten auf die heutige Frage (für den Aha-Moment) ---
// Jens (Index 3) und Daniel (Index 7) bleiben offen, damit man live antworten kann.
const answerDefs = [
	[0, 'Kaffee'],
	[2, 'Kaffee'],
	[5, 'Kaffee'],
	[1, 'Tee'],
	[4, 'Tee'],
	[6, 'Tee']
];
await db.insert(answers).values(
	answerDefs.map(([idx, answer]) => ({ questionId: todayQuestionId, userId: id(idx), answer }))
);
await db.insert(points).values(
	answerDefs.map(([idx]) => ({ userId: id(idx), amount: 5, reason: 'antwort' }))
);

// --- Wochen-Missionen (Demo-Workspace) ---
await db.insert(quests).values([
	{
		workspaceId: 'demo',
		title: 'Das Netz erwacht',
		description: 'Die ersten 10 Linien – der Hauptbahnhof entsteht.',
		targetCount: 10,
		landmark: 'hauptbahnhof',
		createdAt: daysAgo(20),
		completedAt: daysAgo(18)
	},
	{
		workspaceId: 'demo',
		title: 'Die große Verbindung',
		description: 'Baut gemeinsam 20 Linien – dann spannt sich eine Brücke über das Netz.',
		targetCount: 20,
		landmark: 'bruecke',
		createdAt: daysAgo(4),
		completedAt: null
	}
]);

console.log(`✓ Beispieldaten eingefügt: ${personas.length} Haltestellen, ${lineDefs.length} Linien.`);
process.exit(0);
