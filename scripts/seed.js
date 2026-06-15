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
	claps
} from '../src/lib/server/db/schema.js';
import { getWeekKey } from '../src/lib/netz.js';

/**
 * Füllt die Datenbank mit glaubwürdigen Beispiel-Daten,
 * damit "Liniennetz" sofort lebendig wirkt.
 * Ausführen mit:  npm run db:seed
 *
 * Sind in der .env die Turso-Zugangsdaten gesetzt, wird die Cloud-Datenbank
 * befüllt – sonst die lokale Datei local.db.
 */

// .env einlesen (ohne Zusatz-Bibliothek), damit die Turso-Werte gefunden werden.
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

const client = createClient({
	url: process.env.TURSO_DATABASE_URL || 'file:local.db',
	authToken: process.env.TURSO_AUTH_TOKEN || undefined
});
const db = drizzle(client);

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

// --- Personen (Mix aus Fahrdienst/Schicht und Büro) ---
const personas = [
	{ name: 'Mara Lindqvist', role: 'Fahrerin Standort Süd', department: 'Fahrdienst Süd', tags: ['Wandern', 'True-Crime-Podcasts', 'Filterkaffee'] },
	{ name: 'Tobias Krüger', role: 'Fahrer Nachtschicht', department: 'Fahrdienst Nord', tags: ['Angeln', '80er-Musik', 'Schach'] },
	{ name: 'Aylin Demir', role: 'Disponentin', department: 'Disposition', tags: ['Yoga', 'Kochen', 'Filterkaffee'] },
	{ name: 'Jens Hoffmann', role: 'Werkstattleiter', department: 'Werkstatt', tags: ['Schrauben', 'Heavy Metal', 'Grillen'] },
	{ name: 'Sophie Bauer', role: 'Personalreferentin', department: 'Verwaltung', tags: ['Lesen', 'Yoga', 'Tee'] },
	{ name: 'Ricardo Santos', role: 'Fahrer Standort Süd', department: 'Fahrdienst Süd', tags: ['Fußball', 'Kochen', 'Gitarre'] },
	{ name: 'Petra Wagner', role: 'Buchhalterin', department: 'Verwaltung', tags: ['Gartenarbeit', 'True-Crime-Podcasts', 'Tee'] },
	{ name: 'Daniel Fischer', role: 'Disponent', department: 'Disposition', tags: ['Radfahren', 'Fotografie', 'Filterkaffee'] }
];

// Ein paar Haltestellen haben schon Deko (über Index zugeordnet)
const decoByIdx = { 0: 'cafe', 3: 'tram', 2: 'baum', 6: 'lampe' };

const insertedUsers = await db
	.insert(users)
	.values(
		personas.map((p, i) => ({
			slackId: `dev:seed-${i + 1}`,
			workspaceId: 'demo',
			name: p.name,
			email: null,
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
	[1, 0, 'Füreinander da', 'Danke fürs Einspringen in der Spätschicht!', 0],
	[0, 7, 'Pünktlich & verlässlich', 'Top Disposition heute!', 0],
	[3, 0, 'Sicher unterwegs', 'Vorbildliche Fahrzeugpflege.', 0],
	[2, 7, 'Pünktlich & verlässlich', 'Perfekte Schichtplanung.', 0],
	[2, 0, 'Füreinander da', 'Du hast meine Tour gerettet, danke!', 1],
	[3, 1, 'Tüftlergeist', 'Schnelle Reparatur, klasse.', 1],
	[5, 4, 'Füreinander da', 'Danke für die schnelle Urlaubsfreigabe.', 1],
	[4, 6, 'Füreinander da', 'Danke fürs Aushelfen in der Buchhaltung.', 1],
	[5, 0, 'Füreinander da', 'Immer verlässlich, danke Mara.', 2],
	[4, 2, 'Fahrgast zuerst', 'Danke für die geduldige Fahrgast-Hilfe.', 2],
	[1, 3, 'Sicher unterwegs', 'Bremsen wieder top, danke.', 2],
	[7, 1, 'Füreinander da', 'Nachtschicht-Held.', 2],
	[7, 5, 'Sicher unterwegs', 'Souverän im Berufsverkehr.', 3],
	[6, 3, 'Tüftlergeist', 'Werkstatt-Magie wie immer.', 3],
	[2, 5, 'Fahrgast zuerst', 'Lob von Fahrgästen für dich!', 3]
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
	{ text: 'Kaffee oder Tee in der Frühschicht?', activeDate: todayStr() },
	{ text: 'Welchen Ort auf deiner Strecke magst du am liebsten?', activeDate: null },
	{ text: 'Welcher Song darf auf einer langen Schicht nicht fehlen?', activeDate: null },
	{ text: 'Was war dein allererster Job?', activeDate: null },
	{ text: 'Wohin würdest du mit dem Bus am liebsten mal fahren?', activeDate: null },
	{ text: 'Süßer oder herzhafter Pausensnack?', activeDate: null }
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
