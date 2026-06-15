<script>
	import { enhance } from '$app/forms';
	import {
		stationPositions,
		colorForValue,
		monogram,
		monogramColor,
		LANDMARKS,
		decorationByKey
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

	const positions = $derived(stationPositions(data.users, W, H));
	const userById = $derived(Object.fromEntries(data.users.map((u) => [u.id, u])));
	const lines = $derived(data.connections);
	const level = $derived(data.level);
	const newestId = $derived(lines.length ? Math.max(...lines.map((c) => c.id)) : -1);
	const others = $derived(data.users.filter((u) => u.id !== data.meId));
	const answered = $derived(Boolean(data.myAnswer));

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

	// Eine sanft gebogene Linie zwischen zwei Haltestellen
	function pathFor(c) {
		const a = positions[c.fromUserId];
		const b = positions[c.toUserId];
		if (!a || !b) return '';
		const mx = (a.x + b.x) / 2;
		const my = (a.y + b.y) / 2;
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		const off = (c.id % 2 === 0 ? 1 : -1) * Math.min(42, len * 0.13);
		const nx = -dy / len;
		const ny = dx / len;
		return `M ${a.x} ${a.y} Q ${mx + nx * off} ${my + ny * off} ${b.x} ${b.y}`;
	}

	// Ein Bähnchen fährt über jede Linie – längere Linien = etwas langsamer
	function tramDur(c) {
		const a = positions[c.fromUserId];
		const b = positions[c.toUserId];
		if (!a || !b) return 6;
		const dist = Math.hypot(b.x - a.x, b.y - a.y);
		return Math.max(4, Math.min(9, dist / 70));
	}

	// Die Stadt-Kulisse im Hintergrund wächst mit der Ausbaustufe
	// (mehr & höhere Häuser von Dorf → Metropole). Deterministisch, damit nichts flackert.
	function buildSkyline(lvlIndex) {
		const count = [7, 12, 18, 26][lvlIndex] ?? 7;
		const maxH = [18, 36, 62, 98][lvlIndex] ?? 18;
		const out = [];
		for (let i = 0; i < count; i++) {
			const frac = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
			const w = W / count;
			const h = 8 + frac * maxH;
			out.push({ x: i * w, y: H - h, w: w - 2, h });
		}
		return out;
	}
	const skyline = $derived(buildSkyline(level.index));

	const enhanceTicket = () => async ({ result, update }) => {
		await update();
		if (result.type === 'success' && result.data?.success) {
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
	{#if data.demoOffsetDays}
		<div class="demo-time">
			🕰️ Demo-Zeit aktiv: {data.demoOffsetDays > 0 ? '+' : ''}{data.demoOffsetDays}
			{Math.abs(data.demoOffsetDays) === 1 ? 'Tag' : 'Tage'} · in
			<a href="/config">Einstellungen</a> zurücksetzbar
		</div>
	{/if}

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
			<span class="map-hint">{data.users.length} Haltestellen · {level.count} Linien</span>
		</div>

		<svg viewBox="0 0 {W} {H}" class="map" role="img" aria-label="Karte des Teamnetzes">
			<!-- Stadt-Kulisse im Hintergrund (wächst mit der Ausbaustufe) -->
			<g class="skyline">
				{#each skyline as b, i (i)}
					<rect x={b.x} y={b.y} width={b.w} height={b.h} rx="2" />
				{/each}
			</g>

			<!-- Linien -->
			{#each lines as c (c.id)}
				<path
					d={pathFor(c)}
					class="line"
					class:fresh={c.id === newestId}
					pathLength={c.id === newestId ? 1 : undefined}
					stroke={colorForValue(c.valueTag)}
				/>
			{/each}

			<!-- Bähnchen, die über die Linien fahren -->
			{#each lines as c (c.id)}
				{#if pathFor(c)}
					<circle class="tram" r="3.6" fill={colorForValue(c.valueTag)}>
						<animateMotion
							dur="{tramDur(c)}s"
							repeatCount="indefinite"
							path={pathFor(c)}
							begin="-{c.id % 7}s"
						/>
					</circle>
				{/if}
			{/each}

			<!-- Haltestellen -->
			{#each data.users as u, i (u.id)}
				{#if positions[u.id]}
					<a href="/haltestelle/{u.id}" class="station-link">
						<g
							class="station"
							class:me={u.id === data.meId}
							transform="translate({positions[u.id].x} {positions[u.id].y})"
						>
							{#if data.starOfWeek && data.starOfWeek.id === u.id}
								<text class="crown" text-anchor="middle" y="-27">👑</text>
							{/if}
							<circle
								class="halo"
								r="20"
								fill={monogramColor(u.name)}
								style="animation-delay:{(i % 5) * -0.8}s"
							/>
							<circle r="20" fill={monogramColor(u.name)} class="dot" />
							<text class="initials" text-anchor="middle" dy="0.34em">{monogram(u.name)}</text>
							{#if u.decoration && decorationByKey(u.decoration)}
								<text class="deco" x="21" y="-11">{decorationByKey(u.decoration).icon}</text>
							{/if}
							<text class="label" text-anchor="middle" y="34">{u.name.split(' ')[0]}</text>
						</g>
					</a>
				{/if}
			{/each}

			<!-- Freigeschaltete Wahrzeichen – als platzierte Monumente -->
			{#each data.landmarks as key (key)}
				{#if LANDMARK_POS[key]}
					<g class="landmark" transform="translate({LANDMARK_POS[key].x} {LANDMARK_POS[key].y})">
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
					<select name="valueTag" required>
						{#each data.values as v}
							<option value={v}>{v}</option>
						{/each}
					</select>
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

	.demo-time {
		background: #2b2b2b;
		color: #f4f1ea;
		font-size: 0.82rem;
		padding: 8px 14px;
		border-radius: 10px;
		margin-bottom: 16px;
		text-align: center;
	}

	.demo-time a {
		color: #f0c8bd;
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

	.map {
		width: 100%;
		height: auto;
		display: block;
		background: radial-gradient(circle at 50% 45%, #fbf8f1 0%, #f4f1ea 78%);
		border-radius: 12px;
	}

	/* Stadt-Kulisse im Hintergrund */
	.skyline rect {
		fill: #cfc6b4;
		opacity: 0.16;
	}

	/* Bähnchen, die über die Linien fahren */
	.tram {
		filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.18));
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
		stroke-width: 3.4;
		stroke-linecap: round;
		opacity: 0.5;
	}

	.line.fresh {
		opacity: 1;
		stroke-width: 4.4;
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

	.station-link {
		cursor: pointer;
	}

	.station .dot {
		stroke: #fffdf8;
		stroke-width: 3;
		transition: r 0.15s;
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

	.station-link:hover .dot {
		r: 23;
	}

	/* Wahrzeichen auf der Karte – platzierte Monumente */
	.landmark {
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
		gap: 11px;
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
</style>
