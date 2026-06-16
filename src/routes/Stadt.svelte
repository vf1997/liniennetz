<script>
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import { invalidateAll } from '$app/navigation';
	import {
		cityDistricts,
		colorForValue,
		monogram,
		monogramColor,
		LANDMARKS,
		decorationByKey,
		rankFor,
		CITY_THEMES,
		buildCity
	} from '$lib/netz.js';

	let { data, form } = $props();

	const W = 820;
	const H = 540;

	// Feste Plätze für die Wahrzeichen am Kartenrand (mit Platz für Sockel & Plakette)
	const LANDMARK_POS = {
		hauptbahnhof: { x: W / 2, y: 58 },
		bruecke: { x: W - 92, y: H - 70 },
		park: { x: 92, y: 74 }
	};

	const layout = $derived(cityDistricts(data.users, W, H));
	const positions = $derived(layout.positions);
	const districts = $derived(layout.districts);
	const userById = $derived(Object.fromEntries(data.users.map((u) => [u.id, u])));
	const allLines = $derived(data.connections);
	const level = $derived(data.level);
	const others = $derived(data.users.filter((u) => u.id !== data.meId));
	const answered = $derived(Boolean(data.myAnswer));

	// --- B4 Zeitraffer: nur Linien bis zum gewählten Zeitpunkt anzeigen (null = alle/jetzt) ---
	let timeCut = $state(null);
	const timeRange = $derived.by(() => {
		if (!allLines.length) return null;
		let min = Infinity;
		let max = -Infinity;
		for (const c of allLines) {
			const t = new Date(c.createdAt).getTime();
			if (t < min) min = t;
			if (t > max) max = t;
		}
		return { min, max };
	});
	const lines = $derived(
		timeCut == null ? allLines : allLines.filter((c) => new Date(c.createdAt).getTime() <= timeCut)
	);
	const newestId = $derived(lines.length ? Math.max(...lines.map((c) => c.id)) : -1);

	// Feier-Animation
	let celebrate = $state(false);
	let celebrateMsg = $state('');
	let confetti = $state([]);

	function fireCelebration(msg, big) {
		celebrateMsg = msg;
		const amount = big ? 72 : 38;
		const dur = big ? 3200 : 2400;
		confetti = Array.from({ length: amount }, (_, i) => ({
			id: i,
			left: Math.random() * 100,
			delay: Math.random() * 0.4,
			dur: 1.1 + Math.random() * 1.1,
			size: 6 + Math.random() * 7,
			color: ['#b5462f', '#c89b3c', '#7c8b5e', '#3f6b73'][i % 4]
		}));
		celebrate = true;
		setTimeout(() => (celebrate = false), dur);
	}

	function questMsg(q) {
		const lm = LANDMARKS[q.landmark];
		return `${lm?.icon ?? '🎉'} ${lm?.label ?? 'Wahrzeichen'} freigeschaltet!`;
	}

	// Eine sanft gebogene Strecke zwischen zwei Haltestellen (a/b = User-IDs)
	function pathForEdge(e) {
		const a = positions[e.a];
		const b = positions[e.b];
		if (!a || !b) return '';
		const mx = (a.x + b.x) / 2;
		const my = (a.y + b.y) / 2;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		const off = ((e.a + e.b) % 2 === 0 ? 1 : -1) * Math.min(40, len * 0.12);
		return `M ${a.x} ${a.y} Q ${mx + (-dy / len) * off} ${my + (dx / len) * off} ${b.x} ${b.y}`;
	}

	// Ein Bähnchen fährt über jede Strecke – längere Strecken = etwas langsamer
	function tramDurEdge(e) {
		const a = positions[e.a];
		const b = positions[e.b];
		if (!a || !b) return 6;
		return Math.max(4, Math.min(9, Math.hypot(b.x - a.x, b.y - a.y) / 70));
	}

	// Farbe = jüngste Gabe der Strecke; Dicke = wie oft schon geschenkt wurde (Bindungsstärke)
	function edgeColor(e) {
		let latest = e.gifts[0];
		for (const g of e.gifts) if (g.id > latest.id) latest = g;
		return colorForValue(latest.valueTag);
	}
	function edgeWidth(e) {
		return 2.6 + Math.min(e.gifts.length, 6) * 0.95;
	}

	// Haltestellen-Größe nach Aktivität (Anzahl Streckenenden)
	function radiusFor(uid) {
		return 15 + Math.min(degreeByUser[uid] ?? 0, 10) * 1.0;
	}

	// Theme je Ausbaustufe – gemeinsame Definition in netz.js (auch von der Simulation genutzt)
	const theme = $derived(CITY_THEMES[themeIdx] ?? CITY_THEMES[0]);
	const look = $derived(daytime ? theme.day : theme.night);

	const city = $derived(buildCity(themeIdx, W, H));

	// --- Gebündelte Strecken (Bindungsstärke): alle Fahrscheine je Personenpaar zusammenfassen ---
	const edges = $derived.by(() => {
		const m = new Map();
		for (const c of lines) {
			const a = Math.min(c.fromUserId, c.toUserId);
			const b = Math.max(c.fromUserId, c.toUserId);
			const key = `${a}-${b}`;
			let e = m.get(key);
			if (!e) {
				e = { key, a, b, gifts: [], maxId: -1 };
				m.set(key, e);
			}
			e.gifts.push(c);
			if (c.id > e.maxId) e.maxId = c.id;
		}
		return [...m.values()];
	});
	const newestEdgeKey = $derived(edges.find((e) => e.maxId === newestId)?.key ?? null);

	// Nachbarschaft (für „mein Netz" und kürzesten Weg) + Aktivität je Haltestelle
	const adjacency = $derived.by(() => {
		const adj = {};
		for (const e of edges) {
			(adj[e.a] ??= new Set()).add(e.b);
			(adj[e.b] ??= new Set()).add(e.a);
		}
		return adj;
	});
	const degreeByUser = $derived.by(() => {
		const d = {};
		for (const e of edges) {
			d[e.a] = (d[e.a] ?? 0) + e.gifts.length;
			d[e.b] = (d[e.b] ?? 0) + e.gifts.length;
		}
		return d;
	});

	// --- Hover (kurze Info, folgt der Maus) ---
	/** @type {null | { type: 'station', id: number } | { type: 'edge', e: any } | { type: 'landmark', key: string } | { type: 'district', i: number }} */
	let hover = $state(null);
	let pointer = $state({ x: 0, y: 0 });
	let frameEl = $state(null);
	function trackPointer(ev) {
		const r = frameEl?.getBoundingClientRect();
		if (r) pointer = { x: ev.clientX - r.left, y: ev.clientY - r.top };
	}

	// --- Auswahl per Klick: Ego-Netz hervorheben + kürzester Weg zu mir ---
	let selected = $state(null); // User-ID
	function toggleSelect(id) {
		selected = selected === id ? null : id;
	}
	const ego = $derived.by(() => {
		if (selected == null) return null;
		const s = new Set([selected]);
		for (const n of adjacency[selected] ?? []) s.add(n);
		return s;
	});
	// Breitensuche von mir zur ausgewählten Person
	const pathIds = $derived.by(() => {
		if (selected == null || selected === data.meId) return null;
		const prev = { [data.meId]: null };
		const q = [data.meId];
		while (q.length) {
			const cur = q.shift();
			if (cur === selected) break;
			for (const n of adjacency[cur] ?? []) if (!(n in prev)) ((prev[n] = cur), q.push(n));
		}
		if (!(selected in prev)) return null;
		const path = [];
		let c = selected;
		while (c != null) {
			path.unshift(c);
			c = prev[c];
		}
		return path;
	});
	const pathEdgeKeys = $derived.by(() => {
		if (!pathIds) return null;
		const ks = new Set();
		for (let i = 0; i < pathIds.length - 1; i++) {
			const a = Math.min(pathIds[i], pathIds[i + 1]);
			const b = Math.max(pathIds[i], pathIds[i + 1]);
			ks.add(`${a}-${b}`);
		}
		return ks;
	});

	// Wird eine Strecke gerade hervorgehoben (Ego-Netz oder Pfad)?
	function edgeActive(e) {
		if (pathEdgeKeys?.has(e.key)) return true;
		if (selected != null) return e.a === selected || e.b === selected;
		return false;
	}
	function edgeValueTag(e) {
		let latest = e.gifts[0];
		for (const g of e.gifts) if (g.id > latest.id) latest = g;
		return latest.valueTag;
	}
	function edgeDimmed(e) {
		if (selected != null) return !edgeActive(e);
		if (activeValue) return edgeValueTag(e) !== activeValue;
		if (activeDept)
			return (
				userById[e.a]?.department !== activeDept && userById[e.b]?.department !== activeDept
			);
		return false;
	}
	function stationDimmed(id) {
		if (selected != null) {
			if (id === selected) return false;
			if (ego?.has(id)) return false;
			if (pathIds?.includes(id)) return false;
			return true;
		}
		if (activeDept) return userById[id]?.department !== activeDept;
		return false;
	}

	// Infos für die Karten
	function rankOf(id) {
		return rankFor(data.pointsByUser?.[id] ?? 0);
	}
	const selectedInfo = $derived.by(() => {
		if (selected == null) return null;
		const u = userById[selected];
		if (!u) return null;
		const r = rankOf(selected);
		const isMe = selected === data.meId;
		const connectedDirect = (adjacency[data.meId]?.has(selected)) ?? false;
		const hops = pathIds ? pathIds.length - 1 : null;
		return { u, rank: r, degree: degreeByUser[selected] ?? 0, isMe, connectedDirect, hops };
	});
	function edgeApplause(e) {
		let n = 0;
		for (const g of e.gifts) n += data.clapsByConn?.[g.id]?.count ?? 0;
		return n;
	}
	function edgeLastMsg(e) {
		let latest = null;
		for (const g of e.gifts) if (g.message && (!latest || g.id > latest.id)) latest = g;
		return latest?.message ?? null;
	}

	// --- A5 Suche + A4 Filter-Legende ---
	let query = $state('');
	let activeValue = $state(null);
	let activeDept = $state(null);
	const departments = $derived([...new Set(data.users.map((u) => u.department).filter(Boolean))]);
	// Firmenwert-Chips: vorgegebene Werte + tatsächlich verschenkte „eigene" Werte (aus den Linien)
	const valueChips = $derived.by(() => {
		const set = new Set(data.values);
		for (const c of data.connections) if (c.valueTag) set.add(c.valueTag);
		return [...set];
	});
	const customValues = $derived(new Set(valueChips.filter((v) => !data.values.includes(v))));

	// Filter-Legende: jede Gruppe (Firmenwerte / Abteilungen) ist sichtbar und klappt
	// für sich auf eine Zeile ein – „Mehr" erscheint nur, wenn die Gruppe länger ist.
	let valuesEl = $state(null);
	let deptsEl = $state(null);
	let valuesExpanded = $state(false);
	let deptsExpanded = $state(false);
	let valuesOverflow = $state(false);
	let deptsOverflow = $state(false);
	function measureLegend() {
		if (valuesEl) valuesOverflow = valuesEl.scrollHeight > 40;
		if (deptsEl) deptsOverflow = deptsEl.scrollHeight > 40;
	}
	$effect(() => {
		valueChips.length;
		departments.length;
		measureLegend();
	});
	$effect(() => {
		if (!browser) return;
		window.addEventListener('resize', measureLegend);
		return () => window.removeEventListener('resize', measureLegend);
	});
	const searchMatches = $derived(
		query.trim()
			? data.users
					.filter((u) => u.name.toLowerCase().includes(query.trim().toLowerCase()))
					.slice(0, 6)
			: []
	);

	// --- D1 Tag/Nacht + D2 Jahreszeit: Auto (nach Uhrzeit/Monat) ODER manuell ---
	const SEASONS4 = [
		{ key: 'winter', emoji: '❄️', name: 'Winter' },
		{ key: 'fruehling', emoji: '🌸', name: 'Frühling' },
		{ key: 'sommer', emoji: '', name: 'Sommer' },
		{ key: 'herbst', emoji: '🍂', name: 'Herbst' }
	];
	function autoSeasonIndex(m) {
		if (m <= 1 || m === 11) return 0; // Dez–Feb Winter
		if (m <= 4) return 1; // Mär–Mai Frühling
		if (m <= 7) return 2; // Jun–Aug Sommer
		return 3; // Sep–Nov Herbst
	}
	const _now = new Date();
	const autoDaytime = _now.getHours() >= 7 && _now.getHours() < 19;

	// Modus: 'auto' | 'day' | 'night'  /  'auto' | season.key
	let dnMode = $state(browser ? localStorage.getItem('liniennetz-dn') || 'auto' : 'auto');
	let seasonMode = $state(browser ? localStorage.getItem('liniennetz-season') || 'auto' : 'auto');
	let viewMenu = $state(false);
	$effect(() => {
		if (!browser) return;
		localStorage.setItem('liniennetz-dn', dnMode);
		localStorage.setItem('liniennetz-season', seasonMode);
	});
	// Das Theme folgt IMMER der aktuellen Ausbaustufe (nicht manuell wählbar).
	const themeIdx = $derived(level.index);

	const daytime = $derived(dnMode === 'auto' ? autoDaytime : dnMode === 'day');
	const seasonIdx = $derived(
		seasonMode === 'auto'
			? autoSeasonIndex(_now.getMonth())
			: Math.max(0, SEASONS4.findIndex((s) => s.key === seasonMode))
	);
	const season = $derived(SEASONS4[seasonIdx]);
	const weather = $derived(
		season.emoji
			? Array.from({ length: 12 }, (_, i) => ({
					id: i,
					left: Math.random() * 100,
					delay: Math.random() * 7,
					dur: 6 + Math.random() * 7,
					size: 10 + Math.random() * 9
				}))
			: []
	);

	// --- B4 Zeitraffer: Abspielen ---
	let playing = $state(false);
	let playTimer = null;
	function stopPlay() {
		playing = false;
		if (playTimer) {
			clearInterval(playTimer);
			playTimer = null;
		}
	}
	function togglePlay() {
		if (!timeRange) return;
		if (playing) {
			stopPlay();
			return;
		}
		if (timeCut == null || timeCut >= timeRange.max) timeCut = timeRange.min;
		playing = true;
		const inc = Math.max(1, (timeRange.max - timeRange.min) / 32);
		playTimer = setInterval(() => {
			const next = (timeCut ?? timeRange.min) + inc;
			if (next >= timeRange.max) {
				timeCut = null; // am Ende zurück auf „jetzt"
				stopPlay();
			} else {
				timeCut = next;
			}
		}, 250);
	}
	function scrub(ev) {
		stopPlay();
		timeCut = Number(ev.target.value);
	}
	function toNow() {
		stopPlay();
		timeCut = null;
	}
	function fmtDate(ms) {
		const d = new Date(ms);
		return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.`;
	}

	// --- C2 Zoom & Verschieben (über das viewBox) ---
	let view = $state({ x: 0, y: 0, w: W, h: H });
	const viewBox = $derived(`${view.x} ${view.y} ${view.w} ${view.h}`);
	let svgEl = $state(null);
	const zoomed = $derived(view.w < W - 1);
	function svgScale() {
		const r = svgEl?.getBoundingClientRect();
		return r && r.width ? view.w / r.width : 1;
	}
	// Hält die Ansicht innerhalb der Szene (kein Wegrutschen ins Leere beim Verschieben)
	function clampView(v) {
		const w = Math.min(W, v.w);
		const h = Math.min(H, v.h);
		return {
			w,
			h,
			x: Math.max(0, Math.min(W - w, v.x)),
			y: Math.max(0, Math.min(H - h, v.y))
		};
	}
	let panning = $state(false);
	let panStart = null;
	let panMoved = 0;
	function panDown(ev) {
		panning = true;
		panMoved = 0;
		panStart = { cx: ev.clientX, cy: ev.clientY, vx: view.x, vy: view.y };
		svgEl?.setPointerCapture?.(ev.pointerId);
	}
	function panMove(ev) {
		if (!panning || !panStart) return;
		const s = svgScale();
		const dx = ev.clientX - panStart.cx;
		const dy = ev.clientY - panStart.cy;
		panMoved = Math.max(panMoved, Math.abs(dx) + Math.abs(dy));
		view = clampView({ ...view, x: panStart.vx - dx * s, y: panStart.vy - dy * s });
	}
	function panUp() {
		if (!panStart) return; // nur reagieren, wenn der Zug auf dem Hintergrund begann
		// kaum bewegt = Klick auf leere Fläche -> Auswahl aufheben
		if (panMoved < 4) selected = null;
		panning = false;
		panStart = null;
	}
	function zoomAt(clientX, clientY, factor) {
		const r = svgEl?.getBoundingClientRect();
		if (!r) return;
		const px = (clientX - r.left) / r.width;
		const py = (clientY - r.top) / r.height;
		const cx = view.x + px * view.w;
		const cy = view.y + py * view.h;
		let nw = Math.min(W, Math.max(W * 0.35, view.w * factor));
		const nh = nw * (H / W);
		view = clampView({ w: nw, h: nh, x: cx - px * nw, y: cy - py * nh });
	}
	function onWheel(ev) {
		ev.preventDefault();
		zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 0.86 : 1.16);
	}
	function zoomBtn(factor) {
		const r = svgEl?.getBoundingClientRect();
		if (r) zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
	}
	function resetView() {
		view = { x: 0, y: 0, w: W, h: H };
		selected = null;
		hover = null;
		activeValue = null;
		activeDept = null;
		timeCut = null;
		stopPlay();
	}
	// Ist gerade irgendetwas verstellt (Zoom/Auswahl/Filter/Zeitraffer)?
	const viewChanged = $derived(
		zoomed || selected != null || activeValue != null || activeDept != null || timeCut != null
	);

	// --- B5 Live-Aktualisierung: immer aktiv (sanftes Nachladen alle 8s) ---
	$effect(() => {
		const t = setInterval(() => invalidateAll(), 8000);
		return () => clearInterval(t);
	});

	// Timer aufräumen, wenn die Karte verschwindet
	$effect(() => () => {
		if (playTimer) clearInterval(playTimer);
	});

	// Eigener Firmenwert (statt aus der Liste) – je Gift-Formular ein Schalter.
	let selCustomValue = $state(false);
	let giveCustomValue = $state(false);
	// Beim Wechsel/Schließen der Haltestelle das kompakte Formular wieder auf die
	// Liste stellen (Default = erster Firmenwert), nicht im Eigener-Wert-Modus bleiben.
	$effect(() => {
		selected;
		selCustomValue = false;
	});

	const enhanceTicket = () => async ({ result, update }) => {
		await update();
		if (result.type === 'success' && result.data?.success) {
			selCustomValue = false;
			giveCustomValue = false;
			const d = result.data;
			if (d.levelUp) fireCelebration(`🎉 ${d.levelUp.name} erreicht!`, true);
			else if (d.questCompleted) fireCelebration(questMsg(d.questCompleted), true);
			else if (d.rankUp) fireCelebration(`${d.rankUp.icon} Neuer Rang: ${d.rankUp.title}!`, true);
			else
				fireCelebration(
					d.isNew ? 'Neue Strecke eröffnet! 🚍' : 'Fahrschein verschenkt! 🎟️',
					false
				);
		}
	};
</script>

<svelte:head>
	<title>Liniennetz · Die Stadt</title>
</svelte:head>

{#if celebrate}
	<div class="celebration" aria-hidden="true">
		<div class="confetti">
			{#each confetti as p (p.id)}
				<span
					style="left:{p.left}%; animation-delay:{p.delay}s; animation-duration:{p.dur}s; width:{p.size}px; height:{p.size}px; background:{p.color}"
				></span>
			{/each}
		</div>
		<div class="banner">{celebrateMsg}</div>
	</div>
{/if}

<div class="page">
	<!-- Persönlicher Rang -->
	<section class="rank-chip">
		<span class="rank-ic">{data.rank.icon}</span>
		<div class="rank-body">
			<div class="rank-line">
				<span>Dein Rang: <strong>{data.rank.title}</strong></span>
				<span class="rank-pts">{data.myPoints} Fahrgäste</span>
			</div>
			<div class="rank-bar">
				<div class="rank-fill" style="width:{Math.round(data.rank.progress * 100)}%"></div>
			</div>
			<span class="rank-next">
				{#if data.rank.next}
					Noch <strong>{data.rank.toNext}</strong> Fahrgäste bis „{data.rank.next}"
				{:else}
					Höchster Rang erreicht 🌟
				{/if}
			</span>
		</div>
	</section>

	<!-- Statuszeile -->
	<section class="stats">
		<div class="stat level">
			<span class="stat-kicker">Netz-Ausbaustufe</span>
			<span class="stat-big">{level.name}</span>
			<div class="bar">
				<div class="bar-fill" style="width:{Math.round(level.progress * 100)}%"></div>
			</div>
			<span class="stat-sub">
				{#if level.next}
					{level.count} Linien · noch {level.nextAt - level.count} bis {level.next}
				{:else}
					{level.count} Linien · höchste Stufe erreicht 🎉
				{/if}
			</span>
		</div>

		<div class="stat">
			<span class="stat-kicker">Netz-Flamme</span>
			<span class="stat-big flame">🔥 {data.streak}</span>
			<span class="stat-sub">{data.streak === 1 ? 'Tag' : 'Tage'} in Folge aktiv</span>
		</div>

		<div class="stat">
			<span class="stat-kicker">Deine Fahrscheine</span>
			<span class="stat-big tickets">
				{#if data.ticketsPerWeek <= 8}
					{#each Array(data.ticketsPerWeek) as _, i}
						<span class="ticket" class:spent={i >= data.ticketsRemaining}>🎟️</span>
					{/each}
				{:else}
					🎟️ {data.ticketsRemaining}
				{/if}
			</span>
			<span class="stat-sub">{data.ticketsRemaining} von {data.ticketsPerWeek} übrig diese Woche</span>
		</div>
	</section>

	<!-- Wochen-Mission -->
	{#if data.quest}
		<section class="quest">
			<div class="quest-head">
				<div>
					<span class="quest-kicker">Wochen-Mission</span>
					<h2>{data.quest.title}</h2>
					<p class="quest-desc">{data.quest.description}</p>
				</div>
				<div class="quest-reward" title="Belohnung bei Erfüllung">
					<span class="reward-icon">{LANDMARKS[data.quest.landmark]?.icon}</span>
					<span class="reward-label">{LANDMARKS[data.quest.landmark]?.label}</span>
				</div>
			</div>
			<div class="quest-bar">
				<div class="quest-fill" style="width:{data.quest.pct}%"></div>
			</div>
			<div class="quest-foot">
				<span><strong>{data.quest.count}</strong> von {data.quest.target} Linien</span>
				<span
					>{data.quest.pct}%{#if data.quest.count >= data.quest.target} · erfüllt 🎉{/if}</span
				>
			</div>
		</section>
	{/if}

	<!-- Kür der Woche -->
	{#if data.starOfWeek}
		<section class="kuer">
			<span class="kuer-icon">🏆</span>
			<span class="kuer-text">
				Lebendigste Haltestelle der Woche:
				<a href="/haltestelle/{data.starOfWeek.id}">{data.starOfWeek.name}</a>
			</span>
			<span class="kuer-count">{data.starOfWeek.count} Linien</span>
		</section>
	{/if}

	<!-- Die lebende Stadt -->
	<section class="map-card">
		<div class="map-head">
			<h2>Das Liniennetz</h2>
			<span class="map-hint">
				{data.users.length} Haltestellen · {level.count} Linien · {edges.length} Strecken
				· <span class="ambient">{daytime ? '☀️' : '🌙'} {season.name}</span>
			</span>
		</div>

		<!-- A5 Suche + A4 Filter-Legende -->
		<div class="map-controls">
			<div class="search">
				<input
					class="search-in"
					placeholder="Haltestelle suchen …"
					bind:value={query}
					autocomplete="off"
				/>
				<button class="find-me" onclick={() => toggleSelect(data.meId)}>📍 Mich</button>
				{#if query.trim()}
					<div class="search-results">
						{#each searchMatches as u (u.id)}
							<button
								onclick={() => {
									selected = u.id;
									query = '';
								}}>{u.name}</button
							>
						{/each}
						{#if !searchMatches.length}<span class="no-match">nichts gefunden</span>{/if}
					</div>
				{/if}
			</div>
			<div class="legend">
				<div class="legend-group">
					<span class="lg-label">Firmenwerte</span>
					<div class="lg-row" class:collapsed={!valuesExpanded} bind:this={valuesEl}>
						{#each valueChips as v (v)}
							<button
								class="lg-chip"
								class:active={activeValue === v}
								class:custom={customValues.has(v)}
								style="--c:{colorForValue(v)}"
								onclick={() => (activeValue = activeValue === v ? null : v)}
							>
								<span class="lg-dot"></span>{customValues.has(v) ? '✏️ ' : ''}{v}
							</button>
						{/each}
					</div>
					{#if valuesOverflow}
						<button class="lg-more" onclick={() => (valuesExpanded = !valuesExpanded)}>
							{valuesExpanded ? 'Weniger ▴' : 'Mehr ▾'}
						</button>
					{/if}
				</div>

				{#if departments.length}
					<div class="legend-group">
						<span class="lg-label">Abteilungen</span>
						<div class="lg-row" class:collapsed={!deptsExpanded} bind:this={deptsEl}>
							{#each departments as d (d)}
								<button
									class="lg-chip dept"
									class:active={activeDept === d}
									onclick={() => (activeDept = activeDept === d ? null : d)}>🏢 {d}</button
								>
							{/each}
						</div>
						{#if deptsOverflow}
							<button class="lg-more" onclick={() => (deptsExpanded = !deptsExpanded)}>
								{deptsExpanded ? 'Weniger ▴' : 'Mehr ▾'}
							</button>
						{/if}
					</div>
				{/if}

				{#if activeValue || activeDept}
					<button class="lg-clear" onclick={() => ((activeValue = null), (activeDept = null))}>
						Filter aus ✕
					</button>
				{/if}
			</div>

			<!-- D1/D2: Ansicht (Auto/Manuell für Tag-Nacht & Jahreszeit) -->
			<div class="view-ctrl">
				<button
					class="view-btn"
					class:on={viewMenu}
					onclick={() => (viewMenu = !viewMenu)}
					title="Ansicht: Tag/Nacht & Jahreszeit">{daytime ? '☀️' : '🌙'} Ansicht</button
				>
				{#if viewMenu}
					<div class="view-menu">
						<div class="vm-row">
							<span class="vm-label">Tag / Nacht</span>
							<div class="vm-opts">
								<button class:active={dnMode === 'auto'} onclick={() => (dnMode = 'auto')}>Auto</button>
								<button class:active={dnMode === 'day'} onclick={() => (dnMode = 'day')}>☀️ Tag</button>
								<button class:active={dnMode === 'night'} onclick={() => (dnMode = 'night')}
									>🌙 Nacht</button
								>
							</div>
						</div>
						<div class="vm-row">
							<span class="vm-label">Jahreszeit</span>
							<div class="vm-opts">
								<button class:active={seasonMode === 'auto'} onclick={() => (seasonMode = 'auto')}
									>Auto</button
								>
								{#each SEASONS4 as s (s.key)}
									<button
										class:active={seasonMode === s.key}
										title={s.name}
										onclick={() => (seasonMode = s.key)}>{s.emoji || '☀️'}</button
									>
								{/each}
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- Karten-Rahmen: alle Overlays kleben an DER KARTE (nicht am Container) -->
		<div class="map-frame" bind:this={frameEl}>
			<!-- C2: Zoom-Werkzeuge (Ecke oben links der Karte) -->
			<div class="map-tools">
				<button onclick={() => zoomBtn(0.8)} title="Vergrößern" aria-label="Vergrößern">＋</button>
				<button onclick={() => zoomBtn(1.25)} title="Verkleinern" aria-label="Verkleinern">−</button>
			</div>

			<!-- Ansicht zurücksetzen (Ecke oben rechts der Karte) -->
			<button
				class="view-reset"
				class:show={viewChanged}
				onclick={resetView}
				title="Ansicht zurücksetzen (Zoom, Auswahl, Filter, Zeitraffer)"
			>
				⟲ Zurücksetzen
			</button>

			<svg
			bind:this={svgEl}
			viewBox={viewBox}
			class="map"
			class:night={!daytime}
			class:focused={selected != null}
			class:panning
			style="--map-bg:{look.bg}; --water:{look.water}; --field:{look.field}; --park:{look.park}; --tree:{look.tree}; --road:{look.road}; --plaza:{look.plaza}; --roof:{look.roof}; --rooflit:{look.lit}"
			role="img"
			aria-label="Karte des Teamnetzes"
			onmousemove={trackPointer}
			onwheel={onWheel}
			onpointermove={panMove}
			onpointerup={panUp}
			onpointerleave={panUp}
		>
			<!-- C2: unsichtbare Hintergrund-Fläche zum Verschieben / Auswahl aufheben -->
			<rect
				class="pan-bg"
				x={view.x}
				y={view.y}
				width={view.w}
				height={view.h}
				fill="transparent"
				role="presentation"
				onpointerdown={panDown}
			/>

			<!-- Theme-Stadt aus der Vogelperspektive (Karten-Ebene unter dem Netz) -->
			<g class="city">
				{#each city.fields as f, i (i)}
					<rect class="field" x={f.x} y={f.y} width={f.w} height={f.h} rx="20" />
				{/each}
				{#if city.river}
					<path class="river" d={city.river} />
				{/if}
				{#each city.water as w, i (i)}
					<ellipse class="water" cx={w.cx} cy={w.cy} rx={w.rx} ry={w.ry} />
				{/each}
				{#each city.roads as rd, i (i)}
					<path class="road" d={rd} />
				{/each}
				{#each city.plazas as p, i (i)}
					<circle class="plaza" cx={p.cx} cy={p.cy} r={p.r} />
				{/each}
				{#each city.parks as p, i (i)}
					<rect class="park" x={p.x} y={p.y} width={p.w} height={p.h} rx="16" />
					{#each p.trees as t, ti (ti)}
						<circle class="tree" cx={t.x} cy={t.y} r={t.r} />
					{/each}
				{/each}
				{#each city.buildings as b (b.id)}
					<rect
						class="roof"
						class:lit={!daytime && b.lit}
						x={b.x}
						y={b.y}
						width={b.w}
						height={b.h}
						rx="1.5"
					/>
				{/each}
			</g>

			<!-- Stadtviertel: je Abteilung eine sanft getönte Zone mit Namensschild -->
			{#if districts.length > 1}
				<g class="districts">
					{#each districts as d, i (d.name)}
						<ellipse
							class="district-zone"
							cx={d.cx}
							cy={d.cy}
							rx={d.rx}
							ry={d.ry}
							style="--dc:{d.color}"
							role="presentation"
							onpointerdown={panDown}
							onmouseenter={() => (hover = { type: 'district', i })}
							onmouseleave={() => (hover = null)}
						/>
						<text
							class="district-label"
							x={d.cx}
							y={d.cy - d.ry + 16}
							text-anchor="middle"
							style="--dc:{d.color}">{d.name}</text
						>
					{/each}
				</g>
			{/if}

			<!-- Strecken (gebündelt; Dicke = Bindungsstärke) -->
			{#each edges as e (e.key)}
				<path
					d={pathForEdge(e)}
					class="line"
					class:fresh={e.key === newestEdgeKey && selected == null}
					class:active={edgeActive(e)}
					class:dim={edgeDimmed(e)}
					pathLength={e.key === newestEdgeKey && selected == null ? 1 : undefined}
					stroke={edgeColor(e)}
					stroke-width={edgeWidth(e)}
				/>
			{/each}

			<!-- unsichtbare Treffer-Flächen, damit man Strecken leicht antippt/hovert -->
			{#each edges as e (e.key)}
				<path
					d={pathForEdge(e)}
					class="line-hit"
					role="presentation"
					onmouseenter={() => (hover = { type: 'edge', e })}
					onmouseleave={() => (hover = null)}
				/>
			{/each}

			<!-- Bähnchen je Strecke -->
			{#each edges as e (e.key)}
				{#if pathForEdge(e) && !edgeDimmed(e)}
					<circle class="tram" r="3.6" fill={edgeColor(e)}>
						<animateMotion dur="{tramDurEdge(e)}s" repeatCount="indefinite" path={pathForEdge(e)} />
					</circle>
				{/if}
			{/each}

			<!-- Haltestellen (anklicken = Netz hervorheben + Aktionen) -->
			{#each data.users as u, i (u.id)}
				{#if positions[u.id]}
					{@const r = radiusFor(u.id)}
					<g
						class="station"
						class:me={u.id === data.meId && !activeValue && !activeDept}
						class:sel={u.id === selected}
						class:dim={stationDimmed(u.id)}
						transform="translate({positions[u.id].x} {positions[u.id].y})"
						role="button"
						tabindex="0"
						onclick={() => toggleSelect(u.id)}
						onkeydown={(ev) => (ev.key === 'Enter' || ev.key === ' ') && toggleSelect(u.id)}
						onmouseenter={() => (hover = { type: 'station', id: u.id })}
						onmouseleave={() => (hover = null)}
					>
						{#if data.starOfWeek && data.starOfWeek.id === u.id}
							<text class="crown" text-anchor="middle" y={-(r + 7)}>👑</text>
						{/if}
						<circle
							class="halo"
							r={r}
							fill={monogramColor(u.name)}
							style="animation-delay:{(i % 5) * -0.8}s"
						/>
						{#if u.id === selected}
							<circle class="sel-ring" r={r + 5} />
						{/if}
						<circle r={r} fill={monogramColor(u.name)} class="dot" />
						<text class="initials" class:emoji={!!u.avatar} text-anchor="middle" dy="0.34em">{u.avatar || monogram(u.name)}</text>
						{#if u.decoration && decorationByKey(u.decoration)}
							<text class="deco" x={r + 1} y={-(r - 9)}>{decorationByKey(u.decoration).icon}</text>
						{/if}
						<text class="label" text-anchor="middle" y={r + 14}>{u.name.split(' ')[0]}</text>
					</g>
				{/if}
			{/each}

			<!-- Freigeschaltete Wahrzeichen – als platzierte Monumente -->
			{#each data.landmarks as key (key)}
				{#if LANDMARK_POS[key]}
					<g
						class="landmark"
						transform="translate({LANDMARK_POS[key].x} {LANDMARK_POS[key].y})"
						role="img"
						aria-label={LANDMARKS[key]?.label}
						onmouseenter={() => (hover = { type: 'landmark', key })}
						onmouseleave={() => (hover = null)}
					>
						<ellipse class="lm-shadow" cx="0" cy="23" rx="28" ry="7" />
						<circle class="lm-disc" r="25" />
						<circle class="lm-ring" r="25" />
						<text class="lm-icon" text-anchor="middle" dy="0.34em">{LANDMARKS[key]?.icon}</text>
						<g transform="translate(0 42)">
							<rect class="lm-plate" x="-48" y="-11" width="96" height="22" rx="11" />
							<text class="lm-label" text-anchor="middle" dy="0.32em">{LANDMARKS[key]?.label}</text>
						</g>
					</g>
				{/if}
			{/each}
		</svg>

		<!-- Jahreszeiten-Wetter (dezent) -->
		{#if weather.length}
			<div class="weather" aria-hidden="true">
				{#each weather as p (p.id)}
					<span
						style="left:{p.left}%; animation-delay:{p.delay}s; animation-duration:{p.dur}s; font-size:{p.size}px"
						>{season.emoji}</span
					>
				{/each}
			</div>
		{/if}

		<!-- Hover-Infokarte (folgt der Maus) -->
		{#if hover}
			<div class="tooltip" style="left:{pointer.x}px; top:{pointer.y}px">
				{#if hover.type === 'station'}
					{@const ru = rankOf(hover.id)}
					<strong>{userById[hover.id]?.name}</strong>
					<span class="tt-sub"
						>{userById[hover.id]?.role ?? ''}{userById[hover.id]?.department
							? ' · ' + userById[hover.id].department
							: ''}</span
					>
					<span class="tt-row">{ru.icon} {ru.title} · {degreeByUser[hover.id] ?? 0} Linien</span>
				{:else if hover.type === 'landmark'}
					{@const lm = LANDMARKS[hover.key]}
					<strong>{lm?.icon} {lm?.label}</strong>
					<span class="tt-sub">Gemeinsam freigeschaltetes Wahrzeichen</span>
					{#if lm?.desc}<span class="tt-row">{lm.desc}</span>{/if}
				{:else if hover.type === 'district'}
					{@const d = districts[hover.i]}
					<strong>🏙️ {d?.name}</strong>
					<span class="tt-sub">Stadtviertel · {d?.count} {d?.count === 1 ? 'Haltestelle' : 'Haltestellen'}</span>
				{:else}
					{@const e = hover.e}
					<strong>{userById[e.a]?.name?.split(' ')[0]} ↔ {userById[e.b]?.name?.split(' ')[0]}</strong>
					<span class="tt-sub">
						{e.gifts.length} Fahrschein{e.gifts.length > 1 ? 'e' : ''}{edgeApplause(e)
							? ` · 👏 ${edgeApplause(e)}`
							: ''}
					</span>
					{#if edgeLastMsg(e)}<span class="tt-row">„{edgeLastMsg(e)}"</span>{/if}
				{/if}
			</div>
		{/if}

		<!-- Ausgewählte Haltestelle: Infokarte mit Aktionen -->
		{#if selectedInfo}
			<div class="sel-card">
				<button class="sel-close" onclick={() => (selected = null)} aria-label="Schließen">×</button>
				<div class="sel-head">
					<span
						class="sel-avatar"
						class:emoji={!!selectedInfo.u.avatar}
						style="background:{monogramColor(selectedInfo.u.name)}"
						>{selectedInfo.u.avatar || monogram(selectedInfo.u.name)}</span
					>
					<div class="sel-ident">
						<strong>{selectedInfo.u.name}</strong>
						<span class="sel-sub">{selectedInfo.rank.icon} {selectedInfo.rank.title} · {selectedInfo.degree} Linien</span>
					</div>
				</div>

				{#if selectedInfo.isMe}
					<p class="sel-hint">Das bist du – tippe eine andere Haltestelle an. 🙂</p>
				{:else}
					<p class="sel-hint">
						{#if selectedInfo.connectedDirect}
							🔗 Direkt mit dir verbunden.
						{:else if selectedInfo.hops}
							🧭 Über {selectedInfo.hops} Stationen mit dir verbunden.
						{:else}
							Noch nicht mit dir verbunden – bau die erste Linie!
						{/if}
					</p>
					{#if form?.error}<p class="sel-err">{form.error}</p>{/if}
					<form method="POST" action="?/fahrschein" use:enhance={enhanceTicket} class="sel-gift">
						<input type="hidden" name="toUserId" value={selected} />
						{#if selCustomValue}
							<input name="valueTag" required placeholder="Eigener Wert …" maxlength="40" autocomplete="off" />
							<button type="button" class="val-back" onclick={() => (selCustomValue = false)}>↩ Liste</button>
						{:else}
							<select name="valueTag" required>
								{#each data.values as v}<option value={v}>{v}</option>{/each}
							</select>
							<button type="button" class="val-back" onclick={() => (selCustomValue = true)}>✏️ Eigener Wert</button>
						{/if}
						<input name="message" placeholder="Kurzer Dank …" autocomplete="off" maxlength="140" />
						<button type="submit" class="sel-send" disabled={data.ticketsRemaining <= 0}>
							🎟️ Schenken
						</button>
					</form>
				{/if}
				<a class="sel-profile" href="/haltestelle/{selected}">Profil ansehen →</a>
			</div>
		{/if}
		</div>
		<!-- Ende Karten-Rahmen -->

		<!-- B4: Zeitraffer-Regler (unter der Karte) -->
		{#if timeRange && timeRange.max > timeRange.min}
			<div class="timelapse">
				<button class="tl-play" onclick={togglePlay} title="Wachstum abspielen">
					{playing ? '⏸' : '▶'}
				</button>
				<input
					class="tl-range"
					type="range"
					min={timeRange.min}
					max={timeRange.max}
					step="60000"
					value={timeCut ?? timeRange.max}
					oninput={scrub}
				/>
				<span class="tl-label">
					{#if timeCut == null}
						jetzt
					{:else}
						{fmtDate(timeCut)}
					{/if}
				</span>
				{#if timeCut != null}
					<button class="tl-now" onclick={toNow}>Jetzt</button>
				{/if}
			</div>
		{/if}
	</section>

	<div class="grid">
		<!-- Fahrschein verschenken -->
		<section class="card give">
			<h2>Fahrschein verschenken</h2>
			<p class="card-hint">Sag jemandem Danke – das zeichnet sofort eine Linie über die Karte.</p>

			{#if data.suggestion}
				<p class="suggestion">
					💡 Du und <a href="/haltestelle/{data.suggestion.id}">{data.suggestion.name}</a>
					mögt beide {data.suggestion.sharedTags.join(', ')}.{#if data.suggestion.notConnected}
						&nbsp;Noch keine Linie – eine wert?{/if}
				</p>
			{/if}

			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<form method="POST" action="?/fahrschein" use:enhance={enhanceTicket} class="give-form">
				<label>
					<span>An wen?</span>
					<select name="toUserId" required>
						<option value="" disabled selected>Kollegin / Kollege wählen …</option>
						{#each others as u (u.id)}
							<option value={u.id}>{u.name}{u.department ? ` · ${u.department}` : ''}</option>
						{/each}
					</select>
				</label>

				<label>
					<span>Wofür? (Firmenwert)</span>
					{#if giveCustomValue}
						<input name="valueTag" required placeholder="Eigener Wert …" maxlength="40" autocomplete="off" />
						<button type="button" class="val-back" onclick={() => (giveCustomValue = false)}>↩ aus Liste wählen</button>
					{:else}
						<select name="valueTag" required>
							{#each data.values as v}
								<option value={v}>{v}</option>
							{/each}
						</select>
						<button type="button" class="val-back" onclick={() => (giveCustomValue = true)}>✏️ Eigener Wert eingeben</button>
					{/if}
				</label>

				<label>
					<span>Kurze Nachricht</span>
					<input
						name="message"
						placeholder="z. B. Danke fürs schnelle Code-Review!"
						autocomplete="off"
						maxlength="140"
					/>
				</label>

				<button type="submit" class="primary" disabled={data.ticketsRemaining <= 0}>
					{data.ticketsRemaining > 0 ? 'Fahrschein abschicken 🎟️' : 'Keine Fahrscheine mehr'}
				</button>
			</form>
		</section>

		<!-- Frage des Tages -->
		<section class="card flip-wrap">
			<h2>Frage des Tages</h2>
			{#if data.question}
				<div class="flip" class:flipped={answered}>
					<div class="flip-inner">
						<div class="flip-front">
							<p class="question">{data.question.text}</p>
							<form method="POST" action="?/antwort" use:enhance>
								<input type="hidden" name="questionId" value={data.question.id} />
								<input
									name="answer"
									placeholder="Deine Antwort …"
									autocomplete="off"
									required
									maxlength="80"
								/>
								<button type="submit" class="primary">Antworten</button>
							</form>
						</div>
						<div class="flip-back">
							<p class="question small">{data.question.text}</p>
							<p class="my-answer">„{data.myAnswer}"</p>
							{#if data.sameCount > 0}
								<p class="aha">
									✨ {data.sameCount}
									{data.sameCount === 1 ? 'Kollegin/Kollege sieht' : 'Kolleg:innen sehen'} das genauso.
								</p>
							{:else}
								<p class="aha solo">Du bist die erste Stimme dazu – mal sehen, wer mitzieht.</p>
							{/if}
							<p class="count">{data.answersCount} Antworten insgesamt</p>
						</div>
					</div>
				</div>
			{:else}
				<p class="card-hint">Heute gibt es keine Frage.</p>
			{/if}
		</section>
	</div>

	<!-- Letzte Strecken -->
	<section class="card feed">
		<h2>Zuletzt im Netz</h2>
		{#if data.recent.length}
			<ul>
				{#each data.recent as c (c.id)}
					<li>
						<span class="dot-sm" style="background:{colorForValue(c.valueTag)}"></span>
						<span class="feed-text">
							<strong>{userById[c.fromUserId]?.name.split(' ')[0] ?? '?'}</strong>
							→
							<strong>{userById[c.toUserId]?.name.split(' ')[0] ?? '?'}</strong>
							{#if c.message}<span class="msg">„{c.message}"</span>{/if}
						</span>
						{#if c.valueTag}<span class="tag">{c.valueTag}</span>{/if}
						<form method="POST" action="?/applaus" use:enhance class="clap-form">
							<input type="hidden" name="connectionId" value={c.id} />
							<button
								type="submit"
								class="clap"
								class:clapped={data.clapsByConn[c.id]?.mine}
								title="Applaus"
							>
								👏 {data.clapsByConn[c.id]?.count ?? 0}
							</button>
						</form>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="card-hint">Noch keine Linien. Verschenk den ersten Fahrschein!</p>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
		padding: 32px 24px 90px;
	}

	h2 {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.3rem;
		margin: 0 0 4px;
	}

	/* Persönlicher Rang */
	.rank-chip {
		display: flex;
		align-items: center;
		gap: 14px;
		background: linear-gradient(135deg, #1a1a1a, #2e2a26);
		color: #f4f1ea;
		border-radius: 14px;
		padding: 14px 18px;
		margin-bottom: 14px;
		box-shadow: 0 18px 40px -30px rgba(60, 40, 20, 0.7);
	}

	.rank-ic {
		font-size: 1.9rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.rank-body {
		flex: 1;
		min-width: 0;
	}

	.rank-line {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 10px;
		font-size: 0.95rem;
	}

	.rank-line strong {
		font-family: 'Fraunces', serif;
		font-weight: 600;
	}

	.rank-pts {
		font-size: 0.8rem;
		color: #c9c1b4;
		white-space: nowrap;
	}

	.rank-bar {
		height: 7px;
		background: rgba(255, 255, 255, 0.16);
		border-radius: 99px;
		overflow: hidden;
		margin: 8px 0 6px;
	}

	.rank-fill {
		height: 100%;
		background: linear-gradient(90deg, #c89b3c, #e0b85a);
		border-radius: 99px;
		transition: width 0.7s ease;
	}

	.rank-next {
		font-size: 0.78rem;
		color: #c9c1b4;
	}

	.rank-next strong {
		color: #e0b85a;
	}

	/* Statuszeile */
	.stats {
		display: grid;
		grid-template-columns: 1.3fr 1fr 1fr;
		gap: 14px;
		margin-bottom: 22px;
	}

	.stat {
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 14px;
		padding: 16px 18px;
		box-shadow: 0 18px 40px -34px rgba(60, 40, 20, 0.5);
	}

	.stat-kicker {
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
		display: block;
		margin-bottom: 7px;
	}

	.stat-big {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 1.7rem;
		display: block;
		line-height: 1.1;
	}

	.stat-sub {
		font-size: 0.8rem;
		color: #79736a;
		display: block;
		margin-top: 7px;
	}

	.bar {
		height: 7px;
		background: #ece4d6;
		border-radius: 99px;
		margin-top: 10px;
		overflow: hidden;
	}

	.bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #b5462f, #c89b3c);
		border-radius: 99px;
		transition: width 0.6s ease;
	}

	.tickets {
		font-size: 1.1rem;
		letter-spacing: 1px;
	}

	.ticket.spent {
		filter: grayscale(1);
		opacity: 0.32;
	}

	/* Wochen-Mission */
	.quest {
		background: linear-gradient(135deg, #fffdf8, #fbf3ec);
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 20px 22px;
		margin-bottom: 18px;
		box-shadow: 0 18px 40px -34px rgba(60, 40, 20, 0.5);
	}

	.quest-head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 14px;
	}

	.quest-kicker {
		font-size: 0.72rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
	}

	.quest h2 {
		margin: 4px 0 4px;
	}

	.quest-desc {
		margin: 0;
		color: #79736a;
		font-size: 0.9rem;
		max-width: 52ch;
	}

	.quest-reward {
		text-align: center;
		flex-shrink: 0;
		background: #fff;
		border: 1px solid #e8e1d4;
		border-radius: 12px;
		padding: 8px 14px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.reward-icon {
		font-size: 1.7rem;
	}

	.reward-label {
		font-size: 0.7rem;
		color: #79736a;
	}

	.quest-bar {
		height: 14px;
		background: #ece4d6;
		border-radius: 99px;
		overflow: hidden;
	}

	.quest-fill {
		height: 100%;
		background: repeating-linear-gradient(
			45deg,
			#b5462f,
			#b5462f 10px,
			#c2543c 10px,
			#c2543c 20px
		);
		border-radius: 99px;
		transition: width 0.7s ease;
	}

	.quest-foot {
		display: flex;
		justify-content: space-between;
		font-size: 0.84rem;
		color: #4a443c;
		margin-top: 8px;
	}

	.quest-foot strong {
		font-family: 'Fraunces', serif;
	}

	/* Kür der Woche */
	.kuer {
		display: flex;
		align-items: center;
		gap: 12px;
		background: #1a1a1a;
		color: #f4f1ea;
		border-radius: 14px;
		padding: 13px 20px;
		margin-bottom: 22px;
	}

	.kuer-icon {
		font-size: 1.4rem;
	}

	.kuer-text {
		flex: 1;
		font-size: 0.95rem;
	}

	.kuer-text a {
		color: #fff;
		font-weight: 600;
		font-family: 'Fraunces', serif;
		text-decoration: none;
		border-bottom: 1px solid #b5462f;
	}

	.kuer-count {
		font-size: 0.8rem;
		background: #b5462f;
		padding: 4px 11px;
		border-radius: 999px;
		white-space: nowrap;
	}

	/* Karte */
	.map-card {
		position: relative;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 20px 20px 8px;
		box-shadow: 0 22px 48px -32px rgba(60, 40, 20, 0.55);
		margin-bottom: 22px;
	}

	.map-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-bottom: 6px;
	}

	.map-hint {
		font-size: 0.82rem;
		color: #79736a;
		font-family: 'IBM Plex Mono', monospace;
	}

	/* Rahmen direkt um die Karte: alle Overlays kleben hieran */
	.map-frame {
		position: relative;
	}

	.map {
		width: 100%;
		height: auto;
		display: block;
		/* Hintergrund kommt vom aktuellen Theme (Dorf → Metropole), Tag/Nacht */
		background: var(--map-bg, radial-gradient(circle at 50% 45%, #fbf8f1 0%, #f4f1ea 78%));
		border-radius: 12px;
		transition: background 0.5s ease;
		/* Karten-Texte/Icons nicht markierbar (kein blaues Hervorheben beim Ziehen/Scrollen) */
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}

	/* Nachts die Beschriftungen hell halten */
	.map.night :global(.label) {
		fill: #c9d2e6;
	}

	.ambient {
		white-space: nowrap;
	}

	/* A4/A5: Bedien-Leiste über der Karte */
	.map-controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}

	.search {
		position: relative;
		display: flex;
		gap: 6px;
	}

	.search-in {
		padding: 7px 11px;
		border: 1px solid #d8d0c0;
		border-radius: 8px;
		font-size: 0.85rem;
		font-family: inherit;
		background: #fff;
		color: #1a1a1a;
		width: 170px;
	}

	.search-in:focus {
		outline: none;
		border-color: #b5462f;
	}

	.find-me {
		border: 1px solid #d8d0c0;
		background: #fff;
		color: #1a1a1a;
		padding: 7px 11px;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.82rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.find-me:hover {
		border-color: #b5462f;
		color: #b5462f;
	}

	.search-results {
		position: absolute;
		top: 38px;
		left: 0;
		z-index: 15;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 10px;
		box-shadow: 0 16px 34px -16px rgba(60, 40, 20, 0.5);
		padding: 5px;
		display: flex;
		flex-direction: column;
		min-width: 180px;
	}

	.search-results button {
		text-align: left;
		border: none;
		background: transparent;
		padding: 7px 9px;
		border-radius: 7px;
		font-family: inherit;
		font-size: 0.85rem;
		cursor: pointer;
		color: #1a1a1a;
	}

	.search-results button:hover {
		background: #f4ece2;
		color: #b5462f;
	}

	.no-match {
		padding: 7px 9px;
		font-size: 0.82rem;
		color: #79736a;
	}

	.legend {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.legend-group {
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.lg-label {
		font-size: 0.66rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #9a948a;
		font-weight: 600;
		flex-shrink: 0;
		min-width: 88px;
		padding-top: 7px;
	}

	.lg-row {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	/* eingeklappt: nur eine Zeile der Gruppe sichtbar */
	.lg-row.collapsed {
		max-height: 30px;
		overflow: hidden;
	}

	.lg-more {
		border: 1px solid #d8d0c0;
		background: #f7efe9;
		color: #b5462f;
		font-family: inherit;
		font-size: 0.74rem;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 999px;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		margin-top: 1px;
	}

	.lg-more:hover {
		border-color: #d8b8ad;
	}

	/* eigene Firmenwerte (nicht aus der Vorgabe) – gestrichelter Rand zur Unterscheidung */
	.lg-chip.custom {
		border-style: dashed;
	}

	.lg-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		border: 1px solid #e8e1d4;
		background: #fff;
		color: #4a443c;
		padding: 5px 10px;
		border-radius: 999px;
		font-family: inherit;
		font-size: 0.76rem;
		cursor: pointer;
	}

	.lg-dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--c, #b5462f);
		flex-shrink: 0;
	}

	.lg-chip:hover {
		border-color: #d8b8ad;
	}

	.lg-chip.active {
		border-color: #1a1a1a;
		background: #1a1a1a;
		color: #f4f1ea;
	}

	.lg-clear {
		border: none;
		background: transparent;
		color: #b5462f;
		font-family: inherit;
		font-size: 0.76rem;
		cursor: pointer;
		text-decoration: underline;
	}

	/* D1/D2: Ansicht-Menü */
	.view-ctrl {
		position: relative;
		margin-left: auto;
	}

	.view-btn {
		border: 1px solid #e8e1d4;
		background: #fff;
		color: #4a443c;
		padding: 5px 12px;
		border-radius: 999px;
		font-family: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.view-btn:hover,
	.view-btn.on {
		border-color: #b5462f;
		color: #b5462f;
	}

	.view-menu {
		position: absolute;
		top: 34px;
		right: 0;
		z-index: 16;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 12px;
		box-shadow: 0 18px 40px -16px rgba(60, 40, 20, 0.5);
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-width: 220px;
	}

	.vm-row {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.vm-label {
		font-size: 0.72rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #79736a;
		font-weight: 600;
	}

	.vm-opts {
		display: flex;
		gap: 5px;
		flex-wrap: wrap;
	}

	.vm-opts button {
		border: 1px solid #e8e1d4;
		background: #fff;
		color: #4a443c;
		padding: 6px 10px;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.vm-opts button:hover {
		border-color: #d8b8ad;
	}

	.vm-opts button.active {
		background: #1a1a1a;
		color: #f4f1ea;
		border-color: #1a1a1a;
	}

	/* B5: Live-Schalter */
	.live-btn {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: 1px solid #e8e1d4;
		background: #fff;
		color: #79736a;
		padding: 5px 12px;
		border-radius: 999px;
		font-family: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		white-space: nowrap;
	}

	.live-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #cabfad;
	}

	.live-btn.on {
		border-color: #c0392b;
		color: #c0392b;
	}

	.live-btn.on .live-dot {
		background: #e23b2e;
		animation: live-pulse 1.3s ease-in-out infinite;
	}

	@keyframes live-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	/* C2: Zoom-Werkzeuge (über der Karte) */
	.map-tools {
		position: absolute;
		left: 10px;
		top: 10px;
		z-index: 8;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	/* Ansicht-zurücksetzen-Knopf in der Ecke oben rechts der KARTE */
	.view-reset {
		position: absolute;
		right: 10px;
		top: 10px;
		z-index: 8;
		border: 1px solid #e3ddd0;
		background: #fffdf8cc;
		backdrop-filter: blur(4px);
		color: #9a948a;
		padding: 7px 13px;
		border-radius: 999px;
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		box-shadow: 0 10px 24px -16px rgba(60, 40, 20, 0.6);
		transition: color 0.15s, border-color 0.15s;
	}

	.view-reset:hover {
		border-color: #b5462f;
		color: #b5462f;
	}

	/* hervorgehoben, sobald etwas verstellt ist */
	.view-reset.show {
		color: #b5462f;
		border-color: #d8b8ad;
		font-weight: 600;
	}

	.map-tools button {
		width: 30px;
		height: 30px;
		border: 1px solid #e3ddd0;
		background: #fffdf8cc;
		backdrop-filter: blur(4px);
		color: #1a1a1a;
		border-radius: 8px;
		font-size: 1.1rem;
		line-height: 1;
		cursor: pointer;
		font-family: inherit;
	}

	.map-tools button:hover {
		border-color: #b5462f;
		color: #b5462f;
	}

	.pan-bg {
		cursor: grab;
	}

	.map.panning .pan-bg {
		cursor: grabbing;
	}

	/* B4: Zeitraffer-Regler */
	.timelapse {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 4px 2px;
	}

	.tl-play {
		flex-shrink: 0;
		width: 32px;
		height: 32px;
		border: 1px solid #d8d0c0;
		background: #fff;
		border-radius: 8px;
		font-size: 0.9rem;
		cursor: pointer;
		font-family: inherit;
	}

	.tl-play:hover {
		border-color: #b5462f;
	}

	.tl-range {
		flex: 1;
		accent-color: #b5462f;
		cursor: pointer;
	}

	.tl-label {
		font-size: 0.78rem;
		color: #79736a;
		font-family: 'IBM Plex Mono', monospace;
		min-width: 48px;
		text-align: right;
	}

	.tl-now {
		border: none;
		background: transparent;
		color: #b5462f;
		font-family: inherit;
		font-size: 0.78rem;
		cursor: pointer;
		text-decoration: underline;
	}

	/* D2: Jahreszeiten-Wetter */
	.weather {
		position: absolute;
		inset: 0;
		overflow: hidden;
		pointer-events: none;
		user-select: none;
		-webkit-user-select: none;
		z-index: 6;
		border-radius: 12px;
	}

	.weather span {
		position: absolute;
		top: -24px;
		opacity: 0.55;
		animation-name: fall-weather;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
	}

	@keyframes fall-weather {
		0% {
			transform: translateY(-10px) rotate(0deg);
			opacity: 0;
		}
		12% {
			opacity: 0.55;
		}
		100% {
			transform: translateY(560px) rotate(220deg);
			opacity: 0.2;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.weather {
			display: none;
		}
	}

	/* Theme-Stadt (Vogelperspektive) – dezente Karten-Ebene unter dem Netz.
	   Rein dekorativ -> Mausereignisse durchreichen, damit Verschieben darüber klappt. */
	.city {
		pointer-events: none;
	}
	.city .field {
		fill: var(--field, #d7e29c);
		fill-opacity: 0.4;
	}
	.city .water {
		fill: var(--water, #a9cbe0);
		fill-opacity: 0.6;
	}
	.city .river {
		fill: none;
		stroke: var(--water, #a9cbe0);
		stroke-width: 22;
		stroke-linecap: round;
		opacity: 0.6;
	}
	.city .plaza {
		fill: var(--plaza, #e3e5ec);
		fill-opacity: 0.6;
	}
	.city .park {
		fill: var(--park, #c2d8a6);
		fill-opacity: 0.5;
	}
	.city .tree {
		fill: var(--tree, #86a35e);
		fill-opacity: 0.7;
	}
	.city .road {
		fill: none;
		stroke: var(--road, #efe8d8);
		stroke-width: 7;
		stroke-linecap: round;
		opacity: 0.6;
	}
	.city .roof {
		fill: var(--roof, #d6cab5);
		fill-opacity: 0.45;
	}
	.city .roof.lit {
		fill: var(--rooflit, #ffd27a);
		fill-opacity: 0.9;
	}

	/* Bähnchen, die über die Linien fahren */
	.tram {
		filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.18));
		pointer-events: none;
	}

	/* Sanft pulsierender Halo um jede Haltestelle */
	.station .halo {
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
		animation: pulse 4s ease-out infinite;
		pointer-events: none;
	}

	.station.me .halo {
		animation-duration: 2.8s;
	}

	@keyframes pulse {
		0% {
			opacity: 0.32;
			transform: scale(0.7);
		}
		70% {
			opacity: 0;
			transform: scale(2.1);
		}
		100% {
			opacity: 0;
			transform: scale(2.1);
		}
	}

	.line {
		fill: none;
		stroke-linecap: round;
		opacity: 0.5;
		transition: opacity 0.2s;
		/* sichtbare Linie reagiert nicht auf die Maus – dafür gibt es .line-hit */
		pointer-events: none;
	}

	/* Strecken-Dicke kommt aus dem stroke-width-Attribut (Bindungsstärke) */
	.line.active {
		opacity: 1;
		filter: drop-shadow(0 0 5px rgba(181, 70, 47, 0.45));
	}

	.line.dim {
		opacity: 0.1;
	}

	.line.fresh {
		opacity: 1;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: draw 1s ease forwards;
		filter: drop-shadow(0 0 5px rgba(181, 70, 47, 0.55));
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	/* unsichtbare, breite Treffer-Fläche für Hover/Tap auf Strecken */
	.line-hit {
		fill: none;
		stroke: transparent;
		stroke-width: 16;
		cursor: pointer;
	}

	.station {
		cursor: pointer;
	}

	/* kein blauer Browser-Fokus-Rahmen beim Klick (die Auswahl-Markierung reicht) */
	.station:focus {
		outline: none;
	}

	.station.dim {
		opacity: 0.22;
		transition: opacity 0.2s;
	}

	.sel-ring {
		fill: none;
		stroke: #b5462f;
		stroke-width: 2.5;
		stroke-dasharray: 4 4;
	}

	.station .dot {
		stroke: #fffdf8;
		stroke-width: 3;
		transition: r 0.15s;
	}

	.station:hover .dot {
		stroke: #b5462f;
	}

	.station .initials {
		fill: #fff;
		font-size: 13px;
		font-weight: 600;
		font-family: 'IBM Plex Sans', sans-serif;
		pointer-events: none;
	}

	/* Emoji-Avatar füllt den Kreis besser als 2 Initialen */
	.station .initials.emoji {
		font-size: 20px;
	}

	.station .label {
		fill: #4a443c;
		font-size: 12px;
		font-family: 'IBM Plex Mono', monospace;
		letter-spacing: 0.02em;
		pointer-events: none;
	}

	.station .deco {
		font-size: 17px;
		pointer-events: none;
	}

	.station .crown {
		font-size: 18px;
		pointer-events: none;
	}

	.station.me .dot {
		stroke: #b5462f;
		stroke-width: 3.5;
	}

	/* Hover-Infokarte (folgt der Maus) */
	.tooltip {
		position: absolute;
		transform: translate(14px, 12px);
		pointer-events: none;
		background: #1a1a1a;
		color: #f4f1ea;
		border-radius: 10px;
		padding: 8px 11px;
		max-width: 240px;
		box-shadow: 0 14px 30px -14px rgba(0, 0, 0, 0.55);
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.tooltip strong {
		font-size: 0.9rem;
	}

	.tt-sub {
		font-size: 0.76rem;
		color: #c9c1b4;
	}

	.tt-row {
		font-size: 0.78rem;
		color: #e7ddcd;
	}

	/* Ausgewählte Haltestelle: Infokarte mit Aktionen */
	.sel-card {
		position: absolute;
		top: 50px;
		right: 10px;
		width: 250px;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 14px;
		padding: 14px;
		box-shadow: 0 22px 48px -20px rgba(60, 40, 20, 0.55);
		z-index: 12;
	}

	.sel-close {
		position: absolute;
		top: 8px;
		right: 8px;
		border: none;
		background: #f4ece2;
		color: #79736a;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		cursor: pointer;
		font-size: 1rem;
		line-height: 1;
		font-family: inherit;
	}

	.sel-close:hover {
		background: #d8b8ad;
		color: #9c3a26;
	}

	.sel-head {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
		padding-right: 18px;
	}

	.sel-avatar {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-weight: 600;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.sel-avatar.emoji {
		font-size: 1.5rem;
	}

	.sel-ident {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.sel-ident strong {
		font-size: 0.95rem;
	}

	.sel-sub {
		font-size: 0.76rem;
		color: #79736a;
	}

	.sel-hint {
		font-size: 0.82rem;
		color: #4a443c;
		margin: 0 0 10px;
		line-height: 1.4;
	}

	.sel-err {
		font-size: 0.78rem;
		color: #9c3a26;
		background: #f7e0da;
		padding: 6px 9px;
		border-radius: 8px;
		margin: 0 0 8px;
	}

	.sel-gift {
		display: flex;
		flex-direction: column;
		gap: 7px;
		margin-bottom: 10px;
	}

	.sel-gift select,
	.sel-gift input {
		padding: 8px 10px;
		border: 1px solid #d8d0c0;
		border-radius: 8px;
		font-size: 0.85rem;
		font-family: inherit;
		background: #fff;
		color: #1a1a1a;
		width: 100%;
	}

	.sel-send {
		background: #b5462f;
		color: #fff;
		border: none;
		padding: 9px 12px;
		border-radius: 8px;
		font-weight: 600;
		font-size: 0.88rem;
		cursor: pointer;
		font-family: inherit;
	}

	/* „zurück zur Liste"-Link bei eigenem Firmenwert */
	.val-back {
		align-self: flex-start;
		background: none;
		border: none;
		color: #b5462f;
		font-size: 0.78rem;
		font-family: inherit;
		cursor: pointer;
		padding: 2px 0 0;
	}

	.val-back:hover {
		text-decoration: underline;
	}

	.sel-send:hover {
		background: #9c3a26;
	}

	.sel-send:disabled {
		background: #cabfad;
		cursor: not-allowed;
	}

	.sel-profile {
		font-size: 0.82rem;
		color: #b5462f;
		font-weight: 600;
		text-decoration: none;
	}

	.sel-profile:hover {
		text-decoration: underline;
	}

	@media (max-width: 620px) {
		.sel-card {
			right: 12px;
			left: 12px;
			width: auto;
		}
	}

	/* Wahrzeichen auf der Karte – platzierte Monumente */
	/* Stadtviertel (Abteilungs-Zonen) */
	.districts {
		pointer-events: none;
	}

	.district-zone {
		fill: var(--dc);
		fill-opacity: 0.07;
		stroke: var(--dc);
		stroke-opacity: 0.35;
		stroke-width: 1.5;
		stroke-dasharray: 5 7;
		pointer-events: auto;
		cursor: help;
	}

	.district-label {
		pointer-events: none;
	}

	.district-label {
		fill: var(--dc);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		opacity: 0.85;
	}

	.map.night .district-zone {
		fill-opacity: 0.12;
		stroke-opacity: 0.5;
	}

	.map.night .district-label {
		opacity: 0.95;
	}

	.landmark {
		pointer-events: auto;
		cursor: help;
	}

	/* Plakette unter dem Monument fängt keine Maus-Hover ab (nur die Scheibe/Icon) */
	.landmark .lm-plate,
	.landmark .lm-label,
	.lm-shadow {
		pointer-events: none;
	}

	.lm-shadow {
		fill: rgba(60, 40, 20, 0.16);
	}

	.lm-disc {
		fill: #fffdf8;
		filter: drop-shadow(0 5px 9px rgba(60, 40, 20, 0.28));
	}

	.lm-ring {
		fill: none;
		stroke: #c89b3c;
		stroke-width: 2.5;
		opacity: 0.95;
	}

	.landmark .lm-icon {
		font-size: 26px;
	}

	.lm-plate {
		fill: #1a1a1a;
	}

	.landmark .lm-label {
		fill: #f4f1ea;
		font-size: 10.5px;
		font-family: 'IBM Plex Mono', monospace;
		font-weight: 500;
	}

	/* Zwei-Spalten-Bereich */
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 22px;
		margin-bottom: 22px;
	}

	.card {
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 22px;
		box-shadow: 0 18px 40px -34px rgba(60, 40, 20, 0.5);
	}

	.feed {
		margin-bottom: 22px;
	}

	.card-hint {
		color: #79736a;
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 16px;
	}

	.error {
		background: #f7e0da;
		color: #9c3a26;
		padding: 10px 13px;
		border-radius: 9px;
		font-size: 0.88rem;
		margin: 0 0 14px;
	}

	/* Gemeinsamkeiten-Tipp */
	.suggestion {
		background: #f7efe9;
		border-left: 3px solid #b5462f;
		padding: 10px 13px;
		border-radius: 8px;
		font-size: 0.88rem;
		color: #4a443c;
		line-height: 1.45;
		margin: 0 0 16px;
	}

	.suggestion a {
		color: #b5462f;
		font-weight: 600;
		text-decoration: none;
	}

	.suggestion a:hover {
		text-decoration: underline;
	}

	.give-form {
		display: flex;
		flex-direction: column;
		gap: 13px;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 5px;
		font-size: 0.82rem;
		color: #4a443c;
		font-weight: 500;
	}

	select,
	input {
		padding: 10px 12px;
		border: 1px solid #d8d0c0;
		border-radius: 9px;
		font-size: 0.95rem;
		font-family: inherit;
		background: #fff;
		color: #1a1a1a;
	}

	select:focus,
	input:focus {
		outline: none;
		border-color: #b5462f;
		box-shadow: 0 0 0 3px rgba(181, 70, 47, 0.12);
	}

	.primary {
		background: #b5462f;
		color: #fff;
		border: none;
		padding: 11px 18px;
		border-radius: 9px;
		font-weight: 600;
		font-size: 0.95rem;
		cursor: pointer;
		font-family: inherit;
	}

	.primary:hover {
		background: #9c3a26;
	}

	.primary:disabled {
		background: #cabfad;
		cursor: not-allowed;
	}

	/* Flip-Karte */
	.flip {
		perspective: 1200px;
	}

	.flip-inner {
		position: relative;
		transition: transform 0.7s cubic-bezier(0.4, 0.1, 0.2, 1);
		transform-style: preserve-3d;
		min-height: 172px;
	}

	.flip.flipped .flip-inner {
		transform: rotateY(180deg);
	}

	.flip-front,
	.flip-back {
		position: absolute;
		inset: 0;
		backface-visibility: hidden;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.flip-back {
		transform: rotateY(180deg);
		justify-content: center;
		text-align: center;
	}

	.question {
		font-family: 'Fraunces', serif;
		font-size: 1.18rem;
		line-height: 1.35;
		margin: 4px 0 4px;
	}

	.question.small {
		font-size: 0.92rem;
		color: #79736a;
		font-family: 'IBM Plex Sans', sans-serif;
	}

	.flip-front form {
		display: flex;
		gap: 8px;
		margin-top: auto;
	}

	.flip-front input {
		flex: 1;
	}

	.my-answer {
		font-family: 'Fraunces', serif;
		font-size: 1.5rem;
		font-weight: 600;
		color: #1a1a1a;
		margin: 0;
	}

	.aha {
		color: #b5462f;
		font-weight: 600;
		font-size: 1rem;
		margin: 0;
	}

	.aha.solo {
		color: #79736a;
		font-weight: 500;
		font-size: 0.92rem;
	}

	.count {
		font-size: 0.78rem;
		color: #9a948a;
		margin: 0;
	}

	/* Feed */
	.feed ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.feed li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 8px 11px;
		padding: 11px 2px;
		border-bottom: 1px solid #efe9dd;
		font-size: 0.92rem;
	}

	.feed li:last-child {
		border-bottom: none;
	}

	.dot-sm {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.feed-text {
		flex: 1;
		min-width: 0;
	}

	.feed .tag {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.clap-form {
		flex-shrink: 0;
		margin-left: auto;
	}

	.feed .msg {
		color: #79736a;
		margin-left: 4px;
	}

	.tag {
		font-size: 0.72rem;
		background: #f4ece2;
		color: #9c3a26;
		padding: 3px 9px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.clap {
		background: #fff;
		border: 1px solid #e8e1d4;
		color: #79736a;
		padding: 5px 11px;
		border-radius: 999px;
		font-size: 0.82rem;
		cursor: pointer;
		font-family: inherit;
		white-space: nowrap;
	}

	.clap:hover {
		border-color: #d8b8ad;
	}

	.clap.clapped {
		background: #f7e0d9;
		border-color: #d8b8ad;
		color: #9c3a26;
		font-weight: 600;
	}

	/* Feier-Animation */
	.celebration {
		position: fixed;
		inset: 0;
		z-index: 100;
		pointer-events: none;
		display: grid;
		place-items: center;
	}

	.banner {
		background: #1a1a1a;
		color: #f4f1ea;
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 1.6rem;
		padding: 16px 30px;
		border-radius: 14px;
		box-shadow: 0 24px 60px -20px rgba(0, 0, 0, 0.5);
		animation: pop 2.4s ease forwards;
	}

	@keyframes pop {
		0% {
			transform: scale(0.6);
			opacity: 0;
		}
		12% {
			transform: scale(1.05);
			opacity: 1;
		}
		20% {
			transform: scale(1);
		}
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: scale(0.95);
		}
	}

	.confetti span {
		position: absolute;
		top: -20px;
		border-radius: 2px;
		animation-name: fall;
		animation-timing-function: ease-in;
		animation-fill-mode: forwards;
	}

	@keyframes fall {
		to {
			transform: translateY(105vh) rotate(540deg);
			opacity: 0.2;
		}
	}

	@media (max-width: 720px) {
		.stats {
			grid-template-columns: 1fr;
		}
		.grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 600px) {
		.page {
			padding: 16px 12px 80px;
		}
		.map-card {
			padding: 14px 12px 8px;
			border-radius: 14px;
		}
		.map-head {
			flex-direction: column;
			align-items: flex-start;
			gap: 2px;
		}
		.map-hint {
			font-size: 0.72rem;
		}
		.rank-chip {
			flex-wrap: wrap;
			padding: 12px 14px;
			gap: 8px 12px;
		}
		.stat {
			padding: 14px;
		}
		/* Legende: Label auf eigene Zeile, Chips darunter über volle Breite */
		.legend-group {
			flex-wrap: wrap;
		}
		.lg-label {
			flex-basis: 100%;
			min-width: 0;
			padding-top: 0;
		}
		.lg-row {
			flex-basis: 100%;
		}
		.search {
			flex: 1;
		}
		.search-in {
			flex: 1;
			min-width: 0;
		}
	}
</style>
