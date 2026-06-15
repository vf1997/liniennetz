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
import { getWeekKey, normalizeAnswer, netzStufe } from '$lib/netz.js';
import { getSettings, demoNow } from '$lib/server/settings.js';

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
	const activeQuest = (
		await db
			.select()
			.from(quests)
			.where(and(eq(quests.workspaceId, workspaceId), isNull(quests.completedAt)))
	)[0];
	if (!activeQuest) return null;
	const since = new Date(activeQuest.createdAt).getTime();
	const wsUsers = await db.select().from(users).where(eq(users.workspaceId, workspaceId));
	const wsIds = new Set(wsUsers.map((u) => u.id));
	const all = await db.select().from(connections);
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

export async function load({ locals }) {
	const me = locals.user;
	const ws = me.workspaceId;
	const settings = await getSettings();
	// Nur Haltestellen aus DEM SELBEN Workspace teilen sich eine Karte.
	const allUsers = await db
		.select()
		.from(users)
		.where(eq(users.workspaceId, ws))
		.orderBy(users.id);
	const wsUserIds = new Set(allUsers.map((u) => u.id));
	// Linien zählen nur, wenn beide Enden im selben Workspace liegen.
	const allConnectionsRaw = await db.select().from(connections).orderBy(connections.createdAt);
	const allConnections = allConnectionsRaw.filter(
		(c) => wsUserIds.has(c.fromUserId) && wsUserIds.has(c.toUserId)
	);
	const now = demoNow(settings);
	const week = getWeekKey(now);

	// Netz-Ausbaustufe (mit konfigurierbaren Schwellen)
	const level = netzStufe(allConnections.length, {
		kleinstadt: settings.levelKleinstadt,
		grossstadt: settings.levelGrossstadt,
		metropole: settings.levelMetropole
	});

	// Wie viele Fahrscheine hat die Person diese Woche noch?
	const budgetRow = (
		await db
			.select()
			.from(ticketBudgets)
			.where(and(eq(ticketBudgets.userId, me.id), eq(ticketBudgets.week, week)))
	)[0];
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
	const allQuestions = await db.select().from(questions);
	let question = null;
	let myAnswer = null;
	let sameCount = 0;
	let answersCount = 0;
	if (allQuestions.length) {
		const today = todayStr();
		question =
			allQuestions.find((q) => q.activeDate === today) ??
			allQuestions[dayOfYear() % allQuestions.length];
		const qAnswersRaw = await db.select().from(answers).where(eq(answers.questionId, question.id));
		// Nur Antworten aus dem eigenen Workspace zählen für das „X sehen das genauso".
		const qAnswers = qAnswersRaw.filter((a) => wsUserIds.has(a.userId));
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
	const allQuests = await db.select().from(quests).where(eq(quests.workspaceId, ws));
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

	// Gemeinsamkeiten-Vorschlag
	const myInterests = (await db.select().from(interests).where(eq(interests.userId, me.id))).map(
		(r) => r.tag
	);
	const allInterests = await db.select().from(interests);
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

	// Applaus pro Linie
	const allClaps = await db.select().from(claps);
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
		level,
		ticketsRemaining,
		ticketsPerWeek: settings.ticketsPerWeek,
		values: settings.firmenwerte,
		demoOffsetDays: settings.demoOffsetDays,
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
		const settings = await getSettings();
		const data = await request.formData();
		const toUserId = Number(data.get('toUserId'));
		const valueTag = String(data.get('valueTag') || '').trim();
		const message = String(data.get('message') || '').trim();

		if (!toUserId || toUserId === me.id) {
			return fail(400, { error: 'Bitte eine andere Kollegin oder einen Kollegen wählen.' });
		}

		// Sicherheitscheck: nur an Personen aus dem eigenen Workspace verschenken.
		const target = (await db.select().from(users).where(eq(users.id, toUserId)))[0];
		if (!target || target.workspaceId !== me.workspaceId) {
			return fail(400, { error: 'Diese Person gehört nicht zu deinem Netz.' });
		}

		const now = demoNow(settings);
		const week = getWeekKey(now);
		let budget = (
			await db
				.select()
				.from(ticketBudgets)
				.where(and(eq(ticketBudgets.userId, me.id), eq(ticketBudgets.week, week)))
		)[0];
		if (!budget) {
			await db
				.insert(ticketBudgets)
				.values({ userId: me.id, week, remaining: settings.ticketsPerWeek });
			budget = { remaining: settings.ticketsPerWeek };
		}
		if (budget.remaining <= 0) {
			return fail(400, {
				error: 'Diese Woche sind deine Fahrscheine aufgebraucht – am Montag gibt es neue.'
			});
		}

		const existing = await db
			.select()
			.from(connections)
			.where(
				or(
					and(eq(connections.fromUserId, me.id), eq(connections.toUserId, toUserId)),
					and(eq(connections.fromUserId, toUserId), eq(connections.toUserId, me.id))
				)
			);
		const isNew = existing.length === 0;

		const inserted = await db
			.insert(connections)
			.values({
				fromUserId: me.id,
				toUserId,
				valueTag: valueTag || null,
				message: message || null,
				week,
				createdAt: now
			})
			.returning();

		await db
			.update(ticketBudgets)
			.set({ remaining: budget.remaining - 1 })
			.where(and(eq(ticketBudgets.userId, me.id), eq(ticketBudgets.week, week)));

		await db.insert(points).values({
			userId: me.id,
			amount: isNew ? settings.pointsNewStrecke : settings.pointsGiveTicket,
			reason: isNew ? 'neue_strecke' : 'fahrschein_gegeben'
		});
		await db
			.insert(points)
			.values({ userId: toUserId, amount: settings.pointsReceiveTicket, reason: 'fahrschein_erhalten' });

		const questCompleted = await maybeCompleteQuest(me.workspaceId);
		return { success: true, isNew, newConnectionId: inserted[0].id, questCompleted };
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
