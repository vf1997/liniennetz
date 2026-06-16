<script>
	import { onDestroy } from 'svelte';
	import {
		stationPositions,
		colorForValue,
		monogram,
		monogramColor,
		netzStufe,
		VALUES,
		CITY_THEMES,
		buildCity
	} from '$lib/netz.js';

	const W = 820;
	const H = 540;

	// 8 Haltestellen – nur für die Vorführung (keine echten Daten, keine DB).
	const MEMBERS = [
		{ id: 1, name: 'Mara Lindqvist' },
		{ id: 2, name: 'Tobias Krüger' },
		{ id: 3, name: 'Aylin Demir' },
		{ id: 4, name: 'Jens Hoffmann' },
		{ id: 5, name: 'Sophie Bauer' },
		{ id: 6, name: 'Ricardo Santos' },
		{ id: 7, name: 'Petra Wagner' },
		{ id: 8, name: 'Daniel Fischer' }
	];
	const positions = stationPositions(MEMBERS, W, H);

	const GOAL = 30; // ab hier: Metropole erreicht
	const SPEEDS = { Langsam: 1100, Normal: 650, Schnell: 320 };

	let lines = $state([]); // { id, fromId, toId, value }
	let ticker = $state([]); // letzte Meldungen
	let running = $state(false);
	let done = $state(false);
	let speed = $state('Normal');
	let nextId = 1;
	let timer = null;

	const level = $derived(netzStufe(lines.length, {}));
	const newestId = $derived(lines.length ? lines[lines.length - 1].id : -1);

	// Theme-Stadt (Vogelperspektive, Tag) – wächst mit der Stufe Dorf → Metropole
	const theme = $derived(CITY_THEMES[level.index] ?? CITY_THEMES[0]);
	const look = $derived(theme.day);
	const city = $derived(buildCity(level.index, W, H));

	// Gebündelte Strecken (Bindungsstärke) – wie auf der Hauptkarte
	const edges = $derived.by(() => {
		const m = new Map();
		for (const c of lines) {
			const a = Math.min(c.fromId, c.toId);
			const b = Math.max(c.fromId, c.toId);
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
	const degreeByMember = $derived.by(() => {
		const d = {};
		for (const e of edges) {
			d[e.a] = (d[e.a] ?? 0) + e.gifts.length;
			d[e.b] = (d[e.b] ?? 0) + e.gifts.length;
		}
		return d;
	});
	function radiusFor(id) {
		return 15 + Math.min(degreeByMember[id] ?? 0, 10) * 1.0;
	}
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
	function tramDurEdge(e) {
		const a = positions[e.a];
		const b = positions[e.b];
		if (!a || !b) return 6;
		return Math.max(4, Math.min(9, Math.hypot(b.x - a.x, b.y - a.y) / 70));
	}
	function edgeColor(e) {
		let l = e.gifts[0];
		for (const g of e.gifts) if (g.id > l.id) l = g;
		return colorForValue(l.value);
	}
	function edgeWidth(e) {
		return 2.6 + Math.min(e.gifts.length, 6) * 0.95;
	}

	function step() {
		const ai = Math.floor(Math.random() * MEMBERS.length);
		let bi = Math.floor(Math.random() * (MEMBERS.length - 1));
		if (bi >= ai) bi++;
		const value = VALUES[Math.floor(Math.random() * VALUES.length)];
		const c = { id: nextId++, fromId: MEMBERS[ai].id, toId: MEMBERS[bi].id, value };
		lines = [...lines, c];
		ticker = [{ id: c.id, from: MEMBERS[ai].name, to: MEMBERS[bi].name, value }, ...ticker].slice(0, 6);
		if (lines.length >= GOAL) {
			done = true;
			pause();
		}
	}

	function start() {
		if (running || done) return;
		running = true;
		timer = setInterval(step, SPEEDS[speed]);
	}

	function pause() {
		running = false;
		if (timer) clearInterval(timer);
		timer = null;
	}

	function reset() {
		pause();
		lines = [];
		ticker = [];
		done = false;
		nextId = 1;
	}

	function setSpeed(s) {
		speed = s;
		if (running) {
			clearInterval(timer);
			timer = setInterval(step, SPEEDS[speed]);
		}
	}

	onDestroy(pause);
</script>

<svelte:head>
	<title>Liniennetz · Simulation</title>
</svelte:head>

<div class="page">
	<header class="head">
		<div>
			<div class="kicker">Live-Simulation</div>
			<h1>So wächst euer <span class="hl">Liniennetz</span></h1>
			<p class="lead">
				8 Haltestellen, am Anfang ohne eine einzige Verbindung. Drück auf Start und schau zu, wie
				Fahrscheine verschenkt werden und die Stadt vom Dorf zur Metropole wächst. (Nur Ansicht –
				deine echten Daten bleiben unberührt.)
			</p>
		</div>
		<a class="back" href="/config">← zurück</a>
	</header>

	<!-- Steuerung + Status -->
	<section class="bar">
		<div class="controls">
			{#if !running}
				<button class="ctrl primary" onclick={start} disabled={done}>▶ Start</button>
			{:else}
				<button class="ctrl" onclick={pause}>⏸ Pause</button>
			{/if}
			<button class="ctrl ghost" onclick={reset}>↺ Zurücksetzen</button>
			<div class="speeds">
				{#each Object.keys(SPEEDS) as s}
					<button class="speed" class:active={speed === s} onclick={() => setSpeed(s)}>{s}</button>
				{/each}
			</div>
		</div>
		<div class="status">
			<span class="level-name">{level.name}</span>
			<div class="bar-track">
				<div class="bar-fill" style="width:{Math.round(level.progress * 100)}%"></div>
			</div>
			<span class="count">{lines.length} Linien</span>
		</div>
	</section>

	<!-- Die wachsende Stadt -->
	<section class="map-card">
		<svg
			viewBox="0 0 {W} {H}"
			class="map"
			style="--map-bg:{look.bg}; --water:{look.water}; --field:{look.field}; --park:{look.park}; --tree:{look.tree}; --road:{look.road}; --plaza:{look.plaza}; --roof:{look.roof}"
			role="img"
			aria-label="Simulation des Liniennetzes"
		>
			<!-- Theme-Stadt aus der Vogelperspektive (wächst mit der Stufe) -->
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
				{#each city.roads as r, i (i)}
					<line class="road" x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
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
					<rect class="roof" x={b.x} y={b.y} width={b.w} height={b.h} rx="1.5" />
				{/each}
			</g>

			<!-- Strecken (gebündelt; Dicke = Bindungsstärke) -->
			{#each edges as e (e.key)}
				<path
					d={pathForEdge(e)}
					class="line"
					class:fresh={e.key === newestEdgeKey}
					pathLength={e.key === newestEdgeKey ? 1 : undefined}
					stroke={edgeColor(e)}
					stroke-width={edgeWidth(e)}
				/>
			{/each}

			<!-- Bähnchen je Strecke -->
			{#each edges as e (e.key)}
				{#if pathForEdge(e)}
					<circle class="tram" r="3.6" fill={edgeColor(e)}>
						<animateMotion dur="{tramDurEdge(e)}s" repeatCount="indefinite" path={pathForEdge(e)} />
					</circle>
				{/if}
			{/each}

			<!-- Haltestellen (Größe nach Aktivität) -->
			{#each MEMBERS as m, i (m.id)}
				{@const r = radiusFor(m.id)}
				<g class="station" transform="translate({positions[m.id].x} {positions[m.id].y})">
					<circle
						class="halo"
						r={r}
						fill={monogramColor(m.name)}
						style="animation-delay:{(i % 5) * -0.8}s"
					/>
					<circle r={r} fill={monogramColor(m.name)} class="dot" />
					<text class="initials" text-anchor="middle" dy="0.34em">{monogram(m.name)}</text>
					<text class="label" text-anchor="middle" y={r + 14}>{m.name.split(' ')[0]}</text>
				</g>
			{/each}
		</svg>

		{#if done}
			<div class="done-banner">🎉 Metropole erreicht – aus 8 Haltestellen wurde eine ganze Stadt!</div>
		{/if}
	</section>

	<!-- Live-Ticker -->
	<section class="ticker">
		<h2>Gerade geschenkt</h2>
		{#if ticker.length}
			<ul>
				{#each ticker as t (t.id)}
					<li>
						<span class="dot-sm" style="background:{colorForValue(t.value)}"></span>
						<strong>{t.from.split(' ')[0]}</strong> → <strong>{t.to.split(' ')[0]}</strong>
						<span class="tag">{t.value}</span>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="hint">Noch nichts passiert – drück auf <strong>Start</strong>. 🎟️</p>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 900px;
		margin: 0 auto;
		padding: 28px 24px 90px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		margin-bottom: 20px;
	}

	.kicker {
		font-size: 0.78rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
		margin-bottom: 8px;
	}

	h1 {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: clamp(1.8rem, 5vw, 2.6rem);
		margin: 0 0 10px;
		letter-spacing: -0.02em;
	}

	.hl {
		color: #b5462f;
	}

	.lead {
		color: #3a3a37;
		line-height: 1.55;
		margin: 0;
		max-width: 60ch;
	}

	.back {
		flex-shrink: 0;
		color: #79736a;
		text-decoration: none;
		font-size: 0.9rem;
		white-space: nowrap;
	}

	.back:hover {
		color: #b5462f;
	}

	/* Steuerung */
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 14px;
		padding: 14px 18px;
		margin-bottom: 16px;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}

	.ctrl {
		border: 1px solid #d8d0c0;
		background: #fff;
		color: #1a1a1a;
		padding: 9px 16px;
		border-radius: 9px;
		font-family: inherit;
		font-size: 0.92rem;
		font-weight: 600;
		cursor: pointer;
	}

	.ctrl.primary {
		background: #b5462f;
		color: #fff;
		border-color: #b5462f;
	}

	.ctrl.primary:hover {
		background: #9c3a26;
	}

	.ctrl.primary:disabled {
		background: #cabfad;
		border-color: #cabfad;
		cursor: not-allowed;
	}

	.ctrl.ghost:hover {
		border-color: #b5462f;
		color: #b5462f;
	}

	.speeds {
		display: flex;
		gap: 4px;
		margin-left: 4px;
	}

	.speed {
		border: 1px solid #e8e1d4;
		background: #fff;
		color: #79736a;
		padding: 7px 11px;
		border-radius: 8px;
		font-family: inherit;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.speed.active {
		background: #1a1a1a;
		color: #f4f1ea;
		border-color: #1a1a1a;
	}

	.status {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 240px;
		flex: 1;
	}

	.level-name {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 1.1rem;
		white-space: nowrap;
	}

	.bar-track {
		flex: 1;
		height: 8px;
		background: #ece4d6;
		border-radius: 99px;
		overflow: hidden;
		min-width: 80px;
	}

	.bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #b5462f, #c89b3c);
		border-radius: 99px;
		transition: width 0.5s ease;
	}

	.count {
		font-size: 0.82rem;
		color: #79736a;
		font-family: 'IBM Plex Mono', monospace;
		white-space: nowrap;
	}

	/* Karte */
	.map-card {
		position: relative;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 14px;
		box-shadow: 0 22px 48px -32px rgba(60, 40, 20, 0.55);
		margin-bottom: 16px;
	}

	.map {
		width: 100%;
		height: auto;
		display: block;
		background: var(--map-bg, radial-gradient(circle at 50% 45%, #fbf8f1 0%, #f4f1ea 78%));
		border-radius: 12px;
		transition: background 0.5s ease;
		user-select: none;
		-webkit-user-select: none;
	}

	/* Theme-Stadt (Vogelperspektive) – dezente Karten-Ebene unter dem Netz */
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
		stroke: var(--road, #efe8d8);
		stroke-width: 7;
		stroke-linecap: round;
		opacity: 0.6;
	}
	.city .roof {
		fill: var(--roof, #d6cab5);
		fill-opacity: 0.45;
	}

	.line {
		fill: none;
		stroke-linecap: round;
		opacity: 0.55;
	}

	.line.fresh {
		opacity: 1;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
		animation: draw 0.7s ease forwards;
		filter: drop-shadow(0 0 5px rgba(181, 70, 47, 0.55));
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	.tram {
		filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.18));
	}

	.station .halo {
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
		animation: pulse 4s ease-out infinite;
		pointer-events: none;
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

	.station .dot {
		stroke: #fffdf8;
		stroke-width: 3;
	}

	.station .initials {
		fill: #fff;
		font-size: 13px;
		font-weight: 600;
		font-family: 'IBM Plex Sans', sans-serif;
		pointer-events: none;
	}

	.station .label {
		fill: #4a443c;
		font-size: 12px;
		font-family: 'IBM Plex Mono', monospace;
		pointer-events: none;
	}

	.done-banner {
		position: absolute;
		left: 50%;
		bottom: 26px;
		transform: translateX(-50%);
		background: #1a1a1a;
		color: #f4f1ea;
		font-family: 'Fraunces', serif;
		font-weight: 600;
		padding: 12px 22px;
		border-radius: 12px;
		box-shadow: 0 18px 40px -18px rgba(0, 0, 0, 0.5);
		text-align: center;
		max-width: 90%;
	}

	/* Ticker */
	.ticker {
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 18px 22px;
	}

	.ticker h2 {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.1rem;
		margin: 0 0 12px;
	}

	.ticker ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ticker li {
		display: flex;
		align-items: center;
		gap: 9px;
		font-size: 0.92rem;
	}

	.dot-sm {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.tag {
		margin-left: auto;
		font-size: 0.72rem;
		background: #f4ece2;
		color: #9c3a26;
		padding: 3px 9px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.hint {
		color: #79736a;
		font-size: 0.9rem;
		margin: 0;
	}
</style>
