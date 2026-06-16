import { db } from '$lib/server/db';
import { users, connections, points } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { rankFor } from '$lib/netz.js';

export function load({ locals }) {
	// Sofort navigieren: Inhalt streamt nach (Skeleton im Frontend).
	return { content: loadRangliste(locals.user) };
}

async function loadRangliste(me) {
	const ws = me.workspaceId;

	// PERFORMANCE: unabhängige Abfragen gleichzeitig (Cloud-DB = je Abfrage ein Netzwerk-Weg).
	const [allUsers, allConnsRaw, allPointsRaw] = await Promise.all([
		db.select().from(users).where(eq(users.workspaceId, ws)).orderBy(users.id),
		db.select().from(connections),
		db.select().from(points)
	]);

	// Alles auf den eigenen Workspace beschränken
	const usersById = Object.fromEntries(allUsers.map((u) => [u.id, u]));
	const wsIds = new Set(allUsers.map((u) => u.id));
	const allConns = allConnsRaw.filter((c) => wsIds.has(c.fromUserId) && wsIds.has(c.toUserId));
	const allPoints = allPointsRaw.filter((p) => wsIds.has(p.userId));

	// Punkte je Person
	const ptsByUser = {};
	for (const p of allPoints) ptsByUser[p.userId] = (ptsByUser[p.userId] ?? 0) + p.amount;

	// Linien der letzten 7 Tage je Person (zählt für beide Enden)
	const weekAgo = Date.now() - 7 * 86400000;
	const weekLines = {};
	const totalLines = {};
	for (const c of allConns) {
		totalLines[c.fromUserId] = (totalLines[c.fromUserId] ?? 0) + 1;
		totalLines[c.toUserId] = (totalLines[c.toUserId] ?? 0) + 1;
		if (new Date(c.createdAt).getTime() >= weekAgo) {
			weekLines[c.fromUserId] = (weekLines[c.fromUserId] ?? 0) + 1;
			weekLines[c.toUserId] = (weekLines[c.toUserId] ?? 0) + 1;
		}
	}

	// Rangliste nach Fahrgäste-Punkten
	const ranking = allUsers
		.map((u) => ({
			id: u.id,
			name: u.name,
			role: u.role,
			department: u.department,
			decoration: u.decoration,
			points: ptsByUser[u.id] ?? 0,
			lines: totalLines[u.id] ?? 0,
			weekLines: weekLines[u.id] ?? 0,
			rank: rankFor(ptsByUser[u.id] ?? 0)
		}))
		.sort((a, b) => b.points - a.points || b.lines - a.lines);

	// Abteilungs-Duell: aktivste Teams (Linien-Enden je Abteilung)
	const deptTotals = {};
	for (const c of allConns) {
		const fd = usersById[c.fromUserId]?.department;
		const td = usersById[c.toUserId]?.department;
		if (fd) deptTotals[fd] = (deptTotals[fd] ?? 0) + 1;
		if (td) deptTotals[td] = (deptTotals[td] ?? 0) + 1;
	}
	const departments = Object.entries(deptTotals)
		.map(([name, count]) => ({ name, count }))
		.sort((a, b) => b.count - a.count);
	const deptMax = departments[0]?.count ?? 1;

	return { ranking, departments, deptMax, meId: me.id };
}
