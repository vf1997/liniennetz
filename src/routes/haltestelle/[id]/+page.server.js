import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, or, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	users,
	connections,
	interests,
	points,
	ticketBudgets,
	answers,
	claps,
	truths,
	guesses,
	sessions
} from '$lib/server/db/schema.js';
import { AVATAR_ICONS, DECORATIONS, decorationByKey, rankFor } from '$lib/netz.js';
import { getSettings } from '$lib/server/settings.js';
import { clearSessionCookie } from '$lib/server/auth.js';

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

export function load({ params, locals }) {
	// Sofort navigieren: Inhalt streamt nach (Skeleton im Frontend).
	return { content: loadProfil(params, locals) };
}

async function loadProfil(params, locals) {
	const id = Number(params.id);
	const viewer = locals.user;
	const isSelf = viewer?.id === id;

	// PERFORMANCE: alle voneinander unabhängigen Abfragen GLEICHZEITIG abschicken
	// (Cloud-Datenbank = jede Abfrage ein Netzwerk-Weg → einmal warten statt neunmal).
	const [
		person,
		settings,
		allUsers,
		myConnections,
		myInterestRows,
		viewerInterestRows,
		pointRows,
		budgets,
		myTruths,
		personGuesses,
		viewerGuessRows
	] = await Promise.all([
		db
			.select()
			.from(users)
			.where(eq(users.id, id))
			.then((r) => r[0]),
		getSettings(),
		db.select().from(users),
		db
			.select()
			.from(connections)
			.where(or(eq(connections.fromUserId, id), eq(connections.toUserId, id))),
		db.select().from(interests).where(eq(interests.userId, id)),
		viewer
			? db.select().from(interests).where(eq(interests.userId, viewer.id))
			: Promise.resolve([]),
		db.select().from(points).where(eq(points.userId, id)),
		db.select().from(ticketBudgets).where(eq(ticketBudgets.userId, id)),
		db
			.select()
			.from(truths)
			.where(eq(truths.userId, id))
			.then((r) => r[0] ?? null),
		db.select().from(guesses).where(eq(guesses.userId, id)),
		viewer
			? db.select().from(guesses).where(eq(guesses.userId, viewer.id))
			: Promise.resolve([])
	]);

	if (!person) throw error(404, 'Diese Haltestelle gibt es nicht.');
	// Haltestellen aus fremden Workspaces sind nicht einsehbar.
	if (viewer && person.workspaceId !== viewer.workspaceId) {
		throw error(404, 'Diese Haltestelle gibt es nicht.');
	}

	const teamWert = settings.firmenwerte[0] ?? 'Füreinander da';
	const costs = decoCosts(settings);
	const decorations = DECORATIONS.map((d) => ({
		key: d.key,
		icon: d.icon,
		label: d.label,
		cost: costs[d.key] ?? d.cost
	}));

	const userById = Object.fromEntries(allUsers.map((u) => [u.id, u]));
	const myInterests = myInterestRows.map((r) => r.tag);
	const pts = pointRows.reduce((s, p) => s + p.amount, 0);

	// Roh-Kennzahlen für die Achievements (inkl. Fortschritt)
	const partners = myConnections.map((c) => (c.fromUserId === id ? c.toUserId : c.fromUserId));
	const crossDept = partners.some(
		(pid) => userById[pid] && userById[pid].department !== person.department
	);
	const rueckenstaerker = myConnections.filter(
		(c) => c.toUserId === id && c.valueTag === teamWert
	).length;
	const distinctDays = new Set(myConnections.map((c) => new Date(c.createdAt).toDateString())).size;
	// "Stadtgründer": die ersten vier Mitglieder eines Workspaces (unabhängig von den IDs)
	const founderIds = allUsers
		.filter((u) => u.workspaceId === person.workspaceId)
		.sort((a, b) => a.id - b.id)
		.slice(0, 4)
		.map((u) => u.id);
	const isFounder = founderIds.includes(id);
	const wasGenerous = budgets.some((b) => b.remaining === 0);

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
	let sharedInterests = [];
	if (!isSelf && viewer) {
		const viewerTags = viewerInterestRows.map((r) => r.tag);
		sharedInterests = myInterests.filter((t) => viewerTags.includes(t));
	}

	// "Zwei Wahrheiten, eine Lüge"
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
		const g = viewerGuessRows.find((gg) => gg.targetUserId === id) ?? null;
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

	const correctGuesses = personGuesses.filter((g) => g.correct).length;

	// Alle Achievements mit Fortschritt – erreichte UND noch offene (mit „x/y")
	const achievements = [
		{ icon: '🌉', name: 'Brückenbauer', desc: 'Verbindet verschiedene Abteilungen', earned: crossDept, cur: crossDept ? 1 : 0, goal: 1 },
		{ icon: '🛟', name: 'Rückenstärker', desc: `3× für „${teamWert}" gewürdigt`, earned: rueckenstaerker >= 3, cur: Math.min(rueckenstaerker, 3), goal: 3 },
		{ icon: '☕', name: 'Stammgast', desc: 'An 3 verschiedenen Tagen aktiv', earned: distinctDays >= 3, cur: Math.min(distinctDays, 3), goal: 3 },
		{ icon: '🕵️', name: 'Lügen-Detektiv', desc: '3× eine Lüge enttarnt', earned: correctGuesses >= 3, cur: Math.min(correctGuesses, 3), goal: 3 },
		{ icon: '🏗️', name: 'Stadtgründer', desc: 'Von Anfang an dabei', earned: isFounder, cur: isFounder ? 1 : 0, goal: 1 },
		{ icon: '🎁', name: 'Großzügig', desc: 'Alle Fahrscheine einer Woche verschenkt', earned: wasGenerous, cur: wasGenerous ? 1 : 0, goal: 1 }
	];
	const badges = achievements.filter((a) => a.earned);

	// "Dein Netz auf einen Blick" – persönlicher Rückblick (nur auf dem eigenen Profil)
	let rueckblick = null;
	if (isSelf) {
		const given = myConnections.filter((c) => c.fromUserId === id).length;
		const received = myConnections.filter((c) => c.toUserId === id).length;
		const valCount = {};
		for (const c of myConnections)
			if (c.toUserId === id && c.valueTag) valCount[c.valueTag] = (valCount[c.valueTag] ?? 0) + 1;
		const favValue = Object.entries(valCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
		const partnerCount = {};
		for (const c of myConnections) {
			const other = c.fromUserId === id ? c.toUserId : c.fromUserId;
			partnerCount[other] = (partnerCount[other] ?? 0) + 1;
		}
		const topId = Object.entries(partnerCount).sort((a, b) => b[1] - a[1])[0]?.[0];
		const topPartner = topId
			? { id: Number(topId), name: userById[topId]?.name ?? '?' }
			: null;
		const nextAch = achievements.find((a) => !a.earned) ?? null;
		rueckblick = { given, received, favValue, topPartner, nextAch };
	}

	return {
		person,
		interests: myInterests,
		points: pts,
		rank: rankFor(pts),
		rueckblick,
		badges,
		achievements,
		quotes,
		lines,
		connectionCount: myConnections.length,
		isSelf,
		sharedInterests,
		decorations,
		truthGame,
		// Nur auf der eigenen Haltestelle (zum Bearbeiten): Avatar-Symbole + Abteilungen (aus den Einstellungen)
		avatarIcons: isSelf ? AVATAR_ICONS : [],
		departments: isSelf ? settings.abteilungen : []
	};
}

export const actions = {
	// Eigenen Anzeigenamen und Avatar speichern
	profil: async ({ request, locals, params }) => {
		const me = locals.user;
		const id = Number(params.id);
		if (!me || me.id !== id)
			return fail(403, { profilError: 'Du kannst nur deine eigene Haltestelle bearbeiten.' });

		const data = await request.formData();
		const name = String(data.get('name') || '')
			.trim()
			.slice(0, 40);
		let avatar = String(data.get('avatar') || '').trim();
		if (avatar && !AVATAR_ICONS.includes(avatar)) avatar = '';
		const role = String(data.get('role') || '')
			.trim()
			.slice(0, 60);
		const department = String(data.get('department') || '')
			.trim()
			.slice(0, 40);
		if (!name) return fail(400, { profilError: 'Bitte einen Namen eingeben.' });

		await db
			.update(users)
			.set({ name, avatar: avatar || null, role: role || null, department: department || null })
			.where(eq(users.id, id));
		return { profilSaved: true };
	},

	// Ein eigenes Interesse hinzufügen
	interesseHinzufuegen: async ({ request, locals, params }) => {
		const me = locals.user;
		const id = Number(params.id);
		if (!me || me.id !== id)
			return fail(403, { interestError: 'Du kannst nur deine eigenen Interessen ändern.' });
		const tag = String((await request.formData()).get('tag') || '')
			.trim()
			.slice(0, 30);
		if (!tag) return fail(400, { interestError: 'Bitte etwas eingeben.' });
		const existing = await db.select().from(interests).where(eq(interests.userId, id));
		if (existing.some((r) => r.tag.toLowerCase() === tag.toLowerCase()))
			return fail(400, { interestError: 'Das Interesse hast du schon.' });
		if (existing.length >= 12)
			return fail(400, { interestError: 'Mehr als 12 Interessen gehen nicht.' });
		await db.insert(interests).values({ userId: id, tag });
		return { interestAdded: true };
	},

	// Ein eigenes Interesse entfernen
	interesseEntfernen: async ({ request, locals, params }) => {
		const me = locals.user;
		const id = Number(params.id);
		if (!me || me.id !== id)
			return fail(403, { interestError: 'Du kannst nur deine eigenen Interessen ändern.' });
		const tag = String((await request.formData()).get('tag') || '');
		await db.delete(interests).where(and(eq(interests.userId, id), eq(interests.tag, tag)));
		return { interestRemoved: true };
	},

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
	},

	// Eigenes Konto endgültig löschen (inkl. aller zugehörigen Daten) und abmelden.
	kontoLoeschen: async ({ locals, params, cookies }) => {
		const me = locals.user;
		const id = Number(params.id);
		if (!me || me.id !== id)
			return fail(403, { profilError: 'Du kannst nur dein eigenes Konto löschen.' });

		// Verbindungen, an denen die Person beteiligt ist (für deren Applaus-Einträge)
		const myConns = await db
			.select({ id: connections.id })
			.from(connections)
			.where(or(eq(connections.fromUserId, id), eq(connections.toUserId, id)));
		const connIds = myConns.map((c) => c.id);

		// Abhängige Daten zuerst löschen, dann die Person selbst.
		if (connIds.length) await db.delete(claps).where(inArray(claps.connectionId, connIds));
		await db.delete(claps).where(eq(claps.userId, id));
		await db
			.delete(connections)
			.where(or(eq(connections.fromUserId, id), eq(connections.toUserId, id)));
		await db.delete(points).where(eq(points.userId, id));
		await db.delete(interests).where(eq(interests.userId, id));
		await db.delete(ticketBudgets).where(eq(ticketBudgets.userId, id));
		await db.delete(answers).where(eq(answers.userId, id));
		await db.delete(truths).where(eq(truths.userId, id));
		await db.delete(guesses).where(or(eq(guesses.userId, id), eq(guesses.targetUserId, id)));
		await db.delete(sessions).where(eq(sessions.userId, id));
		await db.delete(users).where(eq(users.id, id));

		clearSessionCookie(cookies);
		throw redirect(303, '/login');
	}
};
