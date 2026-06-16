import { fail } from '@sveltejs/kit';
import { and, eq, or, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	users,
	connections,
	ticketBudgets,
	questions,
	answers,
	points,
	interests,
	quests,
	claps
} from '$lib/server/db/schema.js';
import { getWeekKey, normalizeAnswer, netzStufe, rankFor } from '$lib/netz.js';
import { getSettings } from '$lib/server/settings.js';

function todayStr(d = new Date()) {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
		d.getDate()
	).padStart(2, '0')}`;
}

function dayOfYear(d = new Date()) {
	const start = new Date(d.getFullYear(), 0, 0);
	return Math.floor((d - start) / 86400000);
}

// Prüft, ob die aktive Wochen-Mission DES WORKSPACES jetzt erfüllt ist;
// schaltet ggf. das Wahrzeichen frei. Zählt nur Linien innerhalb des Workspaces.
async function maybeCompleteQuest(workspaceId) {
	const [activeQuestRows, wsUsers, all] = await Promise.all([
		db
			.select()
			.from(quests)
			.where(and(eq(quests.workspaceId, workspaceId), isNull(quests.completedAt))),
		db.select().from(users).where(eq(users.workspaceId, workspaceId)),
		db.select().from(connections)
	]);
	const activeQuest = activeQuestRows[0];
	if (!activeQuest) return null;
	const since = new Date(activeQuest.createdAt).getTime();
	const wsIds = new Set(wsUsers.map((u) => u.id));
	const cnt = all.filter(
		(c) =>
			wsIds.has(c.fromUserId) && wsIds.has(c.toUserId) && new Date(c.createdAt).getTime() >= since
	).length;
	if (cnt >= activeQuest.targetCount) {
		await db.update(quests).set({ completedAt: new Date() }).where(eq(quests.id, activeQuest.id));
		return { landmark: activeQuest.landmark, title: activeQuest.title };
	}
	return null;
}

export function load({ locals }) {
	// Sofort navigieren: wir geben ein Promise zurück, das im Hintergrund streamt.
	// Das Frontend zeigt so lange ein Skeleton (siehe +page.svelte / Stadt.svelte).
	return { content: loadStadt(locals.user) };
}

async function loadStadt(me) {
	const ws = me.workspaceId;

	// PERFORMANCE: Alle voneinander unabhängigen Abfragen GLEICHZEITIG abschicken.
	// Bei der Cloud-Datenbank (jede Abfrage ~ein Netzwerk-Weg) ist das der große Hebel:
	// aus „eine Abfrage nach der anderen abwarten" wird „einmal warten".
	const [
		settings,
		allUsers,
		allConnectionsRaw,
		allPointRows,
		budgetRows,
		allQuestions,
		allAnswers,
		allQuests,
		allInterests,
		allClaps
	] = await Promise.all([
		getSettings(),
		db.select().from(users).where(eq(users.workspaceId, ws)).orderBy(users.id),
		db.select().from(connections).orderBy(connections.createdAt),
		db.select().from(points),
		db.select().from(ticketBudgets).where(eq(ticketBudgets.userId, me.id)),
		db.select().from(questions),
		db.select().from(answers),
		db.select().from(quests).where(eq(quests.workspaceId, ws)),
		db.select().from(interests),
		db.select().from(claps)
	]);

	const wsUserIds = new Set(allUsers.map((u) => u.id));
	// Punkte pro Person (für Größe & Rang in den Karten-Infokarten)
	const pointsByUser = {};
	for (const p of allPointRows)
		if (wsUserIds.has(p.userId)) pointsByUser[p.userId] = (pointsByUser[p.userId] ?? 0) + p.amount;
	// Linien zählen nur, wenn beide Enden im selben Workspace liegen.
	const allConnections = allConnectionsRaw.filter(
		(c) => wsUserIds.has(c.fromUserId) && wsUserIds.has(c.toUserId)
	);
	const now = new Date();
	const week = getWeekKey(now);

	// Netz-Ausbaustufe (mit konfigurierbaren Schwellen)
	const level = netzStufe(allConnections.length, {
		kleinstadt: settings.levelKleinstadt,
		grossstadt: settings.levelGrossstadt,
		metropole: settings.levelMetropole
	});

	// Mein persönlicher Rang (nach gesammelten Fahrgäste-Punkten)
	const myPoints = pointsByUser[me.id] ?? 0;
	const rank = rankFor(myPoints);

	// Wie viele Fahrscheine hat die Person diese Woche noch?
	const budgetRow = budgetRows.find((b) => b.week === week);
	const ticketsRemaining = budgetRow ? budgetRow.remaining : settings.ticketsPerWeek;

	// Streak: an wie vielen Tagen in Folge (bis heute) wurde etwas gebaut?
	const activeDays = new Set(allConnections.map((c) => todayStr(new Date(c.createdAt))));
	let streak = 0;
	for (let i = 0; ; i++) {
		const d = new Date(now);
		d.setDate(d.getDate() - i);
		if (activeDays.has(todayStr(d))) streak++;
		else break;
	}

	// Frage des Tages
	let question = null;
	let myAnswer = null;
	let sameCount = 0;
	let answersCount = 0;
	if (allQuestions.length) {
		const today = todayStr();
		question =
			allQuestions.find((q) => q.activeDate === today) ??
			allQuestions[dayOfYear() % allQuestions.length];
		// Nur Antworten aus dem eigenen Workspace auf die heutige Frage.
		const qAnswers = allAnswers.filter(
			(a) => a.questionId === question.id && wsUserIds.has(a.userId)
		);
		answersCount = qAnswers.length;
		const mine = qAnswers.find((a) => a.userId === me.id);
		if (mine) {
			myAnswer = mine.answer;
			const norm = normalizeAnswer(mine.answer);
			sameCount = qAnswers.filter(
				(a) => a.userId !== me.id && normalizeAnswer(a.answer) === norm
			).length;
		}
	}

	// Letzte Strecken für den Aktivitäts-Stream
	const recent = allConnections.slice(-7).reverse();

	// Wochen-Mission: Fortschritt + freigeschaltete Wahrzeichen (nur dieser Workspace)
	const activeQuest = allQuests.find((q) => !q.completedAt) ?? null;
	let quest = null;
	if (activeQuest) {
		const since = new Date(activeQuest.createdAt).getTime();
		const cnt = allConnections.filter((c) => new Date(c.createdAt).getTime() >= since).length;
		quest = {
			title: activeQuest.title,
			description: activeQuest.description,
			target: activeQuest.targetCount,
			count: cnt,
			landmark: activeQuest.landmark,
			pct: Math.min(100, Math.round((cnt / activeQuest.targetCount) * 100))
		};
	}
	const landmarks = allQuests.filter((q) => q.completedAt).map((q) => q.landmark);

	// Gemeinsamkeiten-Vorschlag (Interessen aus dem einen Abruf ableiten)
	const myInterests = allInterests.filter((r) => r.userId === me.id).map((r) => r.tag);
	const tagsByUser = {};
	for (const r of allInterests) (tagsByUser[r.userId] ??= []).push(r.tag);
	const connectedIds = new Set();
	for (const c of allConnections) {
		if (c.fromUserId === me.id) connectedIds.add(c.toUserId);
		if (c.toUserId === me.id) connectedIds.add(c.fromUserId);
	}
	let suggestion = null;
	let best = null;
	for (const u of allUsers) {
		if (u.id === me.id) continue;
		const shared = (tagsByUser[u.id] ?? []).filter((t) => myInterests.includes(t));
		if (!shared.length) continue;
		const notConnected = !connectedIds.has(u.id);
		const score = shared.length + (notConnected ? 10 : 0);
		if (!best || score > best.score) best = { user: u, shared, score, notConnected };
	}
	if (best)
		suggestion = {
			id: best.user.id,
			name: best.user.name,
			sharedTags: best.shared,
			notConnected: best.notConnected
		};

	// Applaus pro Linie (allClaps kommt aus dem Promise.all oben)
	const clapsByConn = {};
	for (const c of allClaps) {
		clapsByConn[c.connectionId] ??= { count: 0, mine: false };
		clapsByConn[c.connectionId].count++;
		if (c.userId === me.id) clapsByConn[c.connectionId].mine = true;
	}

	// Kür der Woche: lebendigste Haltestelle (meiste Linien der letzten 7 Tage)
	const weekAgo = Date.now() - 7 * 86400000;
	const tally = {};
	for (const c of allConnections) {
		if (new Date(c.createdAt).getTime() < weekAgo) continue;
		tally[c.fromUserId] = (tally[c.fromUserId] ?? 0) + 1;
		tally[c.toUserId] = (tally[c.toUserId] ?? 0) + 1;
	}
	let starOfWeek = null;
	for (const u of allUsers) {
		const t = tally[u.id] ?? 0;
		if (t > 0 && (!starOfWeek || t > starOfWeek.count))
			starOfWeek = { id: u.id, name: u.name, count: t };
	}

	return {
		meId: me.id,
		meName: me.name,
		users: allUsers,
		connections: allConnections,
		pointsByUser,
		level,
		myPoints,
		rank,
		ticketsRemaining,
		ticketsPerWeek: settings.ticketsPerWeek,
		values: settings.firmenwerte,
		week,
		streak,
		question,
		myAnswer,
		sameCount,
		answersCount,
		recent,
		quest,
		landmarks,
		suggestion,
		clapsByConn,
		starOfWeek
	};
}

export const actions = {
	// Fahrschein verschenken = Linie bauen
	fahrschein: async ({ request, locals }) => {
		const me = locals.user;
		const data = await request.formData();
		const toUserId = Number(data.get('toUserId'));
		const valueTag = String(data.get('valueTag') || '').trim();
		const message = String(data.get('message') || '').trim();

		if (!toUserId || toUserId === me.id) {
			return fail(400, { error: 'Bitte eine andere Kollegin oder einen Kollegen wählen.' });
		}

		// Alle Vorab-Abfragen GLEICHZEITIG (statt sieben mal nacheinander zu warten).
		const [settings, target, budgetRows, existing, wsUsers, allConns, myPointRows] =
			await Promise.all([
				getSettings(),
				db
					.select()
					.from(users)
					.where(eq(users.id, toUserId))
					.then((r) => r[0]),
				db.select().from(ticketBudgets).where(eq(ticketBudgets.userId, me.id)),
				db
					.select()
					.from(connections)
					.where(
						or(
							and(eq(connections.fromUserId, me.id), eq(connections.toUserId, toUserId)),
							and(eq(connections.fromUserId, toUserId), eq(connections.toUserId, me.id))
						)
					),
				db.select().from(users).where(eq(users.workspaceId, me.workspaceId)),
				db.select().from(connections),
				db.select().from(points).where(eq(points.userId, me.id))
			]);

		// Sicherheitscheck: nur an Personen aus dem eigenen Workspace verschenken.
		if (!target || target.workspaceId !== me.workspaceId) {
			return fail(400, { error: 'Diese Person gehört nicht zu deinem Netz.' });
		}

		const now = new Date();
		const week = getWeekKey(now);
		const budget = budgetRows.find((b) => b.week === week);
		const remaining = budget ? budget.remaining : settings.ticketsPerWeek;
		if (remaining <= 0) {
			return fail(400, {
				error: 'Diese Woche sind deine Fahrscheine aufgebraucht – am Montag gibt es neue.'
			});
		}

		const isNew = existing.length === 0;
		const wsIds = new Set(wsUsers.map((u) => u.id));
		const lineCountBefore = allConns.filter(
			(c) => wsIds.has(c.fromUserId) && wsIds.has(c.toUserId)
		).length;
		const myPointsBefore = myPointRows.reduce((s, p) => s + p.amount, 0);
		const gain = isNew ? settings.pointsNewStrecke : settings.pointsGiveTicket;

		// Schreibvorgänge gebündelt: Linie bauen, Budget abziehen, Punkte vergeben – parallel.
		const budgetWrite = budget
			? db
					.update(ticketBudgets)
					.set({ remaining: budget.remaining - 1 })
					.where(and(eq(ticketBudgets.userId, me.id), eq(ticketBudgets.week, week)))
			: db
					.insert(ticketBudgets)
					.values({ userId: me.id, week, remaining: settings.ticketsPerWeek - 1 });
		const [insertedRows] = await Promise.all([
			db
				.insert(connections)
				.values({
					fromUserId: me.id,
					toUserId,
					valueTag: valueTag || null,
					message: message || null,
					week,
					createdAt: now
				})
				.returning(),
			budgetWrite,
			db.insert(points).values([
				{ userId: me.id, amount: gain, reason: isNew ? 'neue_strecke' : 'fahrschein_gegeben' },
				{ userId: toUserId, amount: settings.pointsReceiveTicket, reason: 'fahrschein_erhalten' }
			])
		]);
		const inserted = insertedRows;

		// Hebt die neue Linie das ganze Netz auf die nächste Ausbaustufe?
		const thresholds = {
			kleinstadt: settings.levelKleinstadt,
			grossstadt: settings.levelGrossstadt,
			metropole: settings.levelMetropole
		};
		const stufeNach = netzStufe(lineCountBefore + 1, thresholds);
		const levelUp =
			stufeNach.index > netzStufe(lineCountBefore, thresholds).index ? { name: stufeNach.name } : null;

		// Steige ICH durch die Punkte in einen neuen Rang auf?
		const rankBefore = rankFor(myPointsBefore);
		const rankAfter = rankFor(myPointsBefore + gain);
		const rankUp =
			rankAfter.index > rankBefore.index ? { title: rankAfter.title, icon: rankAfter.icon } : null;

		const questCompleted = await maybeCompleteQuest(me.workspaceId);
		return { success: true, isNew, newConnectionId: inserted[0].id, questCompleted, levelUp, rankUp };
	},

	// Frage des Tages beantworten
	antwort: async ({ request, locals }) => {
		const me = locals.user;
		const settings = await getSettings();
		const data = await request.formData();
		const questionId = Number(data.get('questionId'));
		const answer = String(data.get('answer') || '').trim();
		if (!questionId || !answer) return fail(400, { error: 'Bitte etwas eingeben.' });

		const existing = (
			await db
				.select()
				.from(answers)
				.where(and(eq(answers.questionId, questionId), eq(answers.userId, me.id)))
		)[0];

		if (existing) {
			await db.update(answers).set({ answer }).where(eq(answers.id, existing.id));
		} else {
			await db.insert(answers).values({ questionId, userId: me.id, answer });
			await db.insert(points).values({ userId: me.id, amount: settings.pointsAnswer, reason: 'antwort' });
		}

		return { answered: true };
	},

	// Applaus für eine Linie (an/aus)
	applaus: async ({ request, locals }) => {
		const me = locals.user;
		const data = await request.formData();
		const connId = Number(data.get('connectionId'));
		if (!connId) return fail(400);
		const existing = (
			await db
				.select()
				.from(claps)
				.where(and(eq(claps.userId, me.id), eq(claps.connectionId, connId)))
		)[0];
		if (existing) {
			await db.delete(claps).where(eq(claps.id, existing.id));
			return { clapped: false };
		}
		await db.insert(claps).values({ userId: me.id, connectionId: connId });
		return { clapped: true };
	}
};
