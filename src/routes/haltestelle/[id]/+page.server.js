import { error, fail } from '@sveltejs/kit';
import { and, eq, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	users,
	connections,
	interests,
	points,
	ticketBudgets,
	truths,
	guesses
} from '$lib/server/db/schema.js';
import { DECORATIONS, decorationByKey } from '$lib/netz.js';
import { getSettings } from '$lib/server/settings.js';

// Effektive Deko-Kosten aus den Einstellungen
function decoCosts(settings) {
	return {
		baum: 0,
		bank: settings.decoBank,
		lampe: settings.decoLampe,
		cafe: settings.decoCafe,
		tram: settings.decoTram
	};
}

export async function load({ params, locals }) {
	const id = Number(params.id);
	const person = (await db.select().from(users).where(eq(users.id, id)))[0];
	if (!person) throw error(404, 'Diese Haltestelle gibt es nicht.');
	// Haltestellen aus fremden Workspaces sind nicht einsehbar.
	if (locals.user && person.workspaceId !== locals.user.workspaceId) {
		throw error(404, 'Diese Haltestelle gibt es nicht.');
	}

	const settings = await getSettings();
	const teamWert = settings.firmenwerte[0] ?? 'Füreinander da';
	const costs = decoCosts(settings);
	const decorations = DECORATIONS.map((d) => ({
		key: d.key,
		icon: d.icon,
		label: d.label,
		cost: costs[d.key] ?? d.cost
	}));

	const allUsers = await db.select().from(users);
	const userById = Object.fromEntries(allUsers.map((u) => [u.id, u]));

	const myConnections = await db
		.select()
		.from(connections)
		.where(or(eq(connections.fromUserId, id), eq(connections.toUserId, id)));

	const myInterests = (await db.select().from(interests).where(eq(interests.userId, id))).map(
		(r) => r.tag
	);

	const pts = (await db.select().from(points).where(eq(points.userId, id))).reduce(
		(s, p) => s + p.amount,
		0
	);

	const budgets = await db.select().from(ticketBudgets).where(eq(ticketBudgets.userId, id));

	// Abzeichen aus den vorhandenen Daten berechnen
	const badges = [];
	const partners = myConnections.map((c) => (c.fromUserId === id ? c.toUserId : c.fromUserId));
	const crossDept = partners.some(
		(pid) => userById[pid] && userById[pid].department !== person.department
	);
	if (crossDept)
		badges.push({ icon: '🌉', name: 'Brückenbauer', desc: 'Verbindet verschiedene Abteilungen' });

	const rueckenstaerker = myConnections.filter(
		(c) => c.toUserId === id && c.valueTag === teamWert
	).length;
	if (rueckenstaerker >= 3)
		badges.push({ icon: '🛟', name: 'Rückenstärker', desc: `3× für „${teamWert}" gewürdigt` });

	const distinctDays = new Set(myConnections.map((c) => new Date(c.createdAt).toDateString())).size;
	if (distinctDays >= 3)
		badges.push({ icon: '☕', name: 'Stammgast', desc: 'An mehreren Tagen im Netz unterwegs' });

	// "Stadtgründer": die ersten vier Mitglieder eines Workspaces (unabhängig von den IDs)
	const founderIds = allUsers
		.filter((u) => u.workspaceId === person.workspaceId)
		.sort((a, b) => a.id - b.id)
		.slice(0, 4)
		.map((u) => u.id);
	if (founderIds.includes(id))
		badges.push({ icon: '🏗️', name: 'Stadtgründer', desc: 'Von Anfang an dabei' });

	if (budgets.some((b) => b.remaining === 0))
		badges.push({ icon: '🎁', name: 'Großzügig', desc: 'Alle Fahrscheine einer Woche verschenkt' });

	const quotes = myConnections
		.filter((c) => c.toUserId === id && c.message)
		.map((c) => ({
			from: userById[c.fromUserId]?.name ?? '?',
			value: c.valueTag,
			message: c.message
		}))
		.reverse();

	const lines = myConnections
		.map((c) => {
			const otherId = c.fromUserId === id ? c.toUserId : c.fromUserId;
			return {
				other: userById[otherId]?.name ?? '?',
				otherId,
				value: c.valueTag,
				sent: c.fromUserId === id
			};
		})
		.reverse();

	// Gemeinsamkeiten mit der gerade angemeldeten Person
	const isSelf = locals.user?.id === id;
	let sharedInterests = [];
	if (!isSelf && locals.user) {
		const viewerTags = (
			await db.select().from(interests).where(eq(interests.userId, locals.user.id))
		).map((r) => r.tag);
		sharedInterests = myInterests.filter((t) => viewerTags.includes(t));
	}

	// "Zwei Wahrheiten, eine Lüge"
	const myTruths = (await db.select().from(truths).where(eq(truths.userId, id)))[0];
	let truthGame = null;
	if (isSelf) {
		truthGame = {
			isSelf: true,
			hasStatements: !!myTruths,
			statements: myTruths
				? [myTruths.statement1, myTruths.statement2, myTruths.statement3]
				: ['', '', ''],
			lieIndex: myTruths ? myTruths.lieIndex : 0
		};
	} else if (myTruths) {
		const g = locals.user
			? (
					await db
						.select()
						.from(guesses)
						.where(and(eq(guesses.userId, locals.user.id), eq(guesses.targetUserId, id)))
				)[0]
			: null;
		truthGame = {
			isSelf: false,
			hasStatements: true,
			statements: [myTruths.statement1, myTruths.statement2, myTruths.statement3],
			guessed: !!g,
			guessedIndex: g ? g.guessedIndex : null,
			correct: g ? g.correct : null,
			lieIndex: g ? myTruths.lieIndex : null
		};
	}

	// Abzeichen "Lügen-Detektiv": mindestens 3 Lügen richtig erraten
	const personGuesses = await db.select().from(guesses).where(eq(guesses.userId, id));
	if (personGuesses.filter((g) => g.correct).length >= 3)
		badges.push({ icon: '🕵️', name: 'Lügen-Detektiv', desc: '3× eine Lüge enttarnt' });

	return {
		person,
		interests: myInterests,
		points: pts,
		badges,
		quotes,
		lines,
		connectionCount: myConnections.length,
		isSelf,
		sharedInterests,
		decorations,
		truthGame
	};
}

export const actions = {
	// Eigene Aussagen für "Zwei Wahrheiten, eine Lüge" speichern
	speichern: async ({ request, locals, params }) => {
		const me = locals.user;
		const id = Number(params.id);
		if (!me || me.id !== id)
			return fail(403, { truthError: 'Du kannst nur deine eigenen Aussagen bearbeiten.' });

		const data = await request.formData();
		const s1 = String(data.get('s1') || '').trim();
		const s2 = String(data.get('s2') || '').trim();
		const s3 = String(data.get('s3') || '').trim();
		const lieIndex = Number(data.get('lieIndex') ?? 0);

		if (!s1 || !s2 || !s3)
			return fail(400, { truthError: 'Bitte alle drei Aussagen ausfüllen.' });
		if (lieIndex < 0 || lieIndex > 2)
			return fail(400, { truthError: 'Bitte markiere, welche Aussage die Lüge ist.' });

		const existing = (await db.select().from(truths).where(eq(truths.userId, id)))[0];
		if (existing) {
			await db
				.update(truths)
				.set({ statement1: s1, statement2: s2, statement3: s3, lieIndex })
				.where(eq(truths.id, existing.id));
		} else {
			await db.insert(truths).values({ userId: id, statement1: s1, statement2: s2, statement3: s3, lieIndex });
		}
		return { truthSaved: true };
	},

	// Bei einer anderen Person raten, was die Lüge ist
	raten: async ({ request, locals, params }) => {
		const me = locals.user;
		if (!me) return fail(403, { truthError: 'Bitte anmelden.' });
		const id = Number(params.id);
		if (me.id === id) return fail(400, { truthError: 'Du kannst nicht bei dir selbst raten.' });

		const data = await request.formData();
		const guessedIndex = Number(data.get('guessedIndex') ?? -1);
		if (guessedIndex < 0 || guessedIndex > 2)
			return fail(400, { truthError: 'Bitte eine Aussage auswählen.' });

		const target = (await db.select().from(truths).where(eq(truths.userId, id)))[0];
		if (!target) return fail(400, { truthError: 'Keine Aussagen vorhanden.' });

		const already = (
			await db
				.select()
				.from(guesses)
				.where(and(eq(guesses.userId, me.id), eq(guesses.targetUserId, id)))
		)[0];
		if (already) return fail(400, { truthError: 'Du hast hier bereits geraten.' });

		const correct = guessedIndex === target.lieIndex;
		await db.insert(guesses).values({ userId: me.id, targetUserId: id, guessedIndex, correct });

		if (correct) {
			const settings = await getSettings();
			await db.insert(points).values([
				{ userId: me.id, amount: settings.pointsLieCorrect, reason: 'luege_enttarnt' },
				{ userId: id, amount: settings.pointsLieCorrect, reason: 'luege_enttarnt_ziel' }
			]);
		}
		return { truthGuessed: true, correct };
	},

	// Eigene Haltestelle dekorieren (nur freigeschaltete Deko)
	dekorieren: async ({ request, locals, params }) => {
		const me = locals.user;
		const id = Number(params.id);
		if (!me || me.id !== id) return fail(403, { error: 'Du kannst nur deine eigene Haltestelle gestalten.' });

		const data = await request.formData();
		const key = String(data.get('decoration') || '');

		// "Keine Deko" ist immer erlaubt
		if (key === '') {
			await db.update(users).set({ decoration: null }).where(eq(users.id, id));
			return { decorated: true };
		}

		const deco = decorationByKey(key);
		if (!deco) return fail(400, { error: 'Unbekannte Deko.' });

		const settings = await getSettings();
		const cost = decoCosts(settings)[key] ?? deco.cost;
		const pts = (await db.select().from(points).where(eq(points.userId, id))).reduce(
			(s, p) => s + p.amount,
			0
		);
		if (pts < cost) {
			return fail(400, { error: `Dafür brauchst du ${cost} Fahrgäste-Punkte.` });
		}

		await db.update(users).set({ decoration: key }).where(eq(users.id, id));
		return { decorated: true };
	}
};
