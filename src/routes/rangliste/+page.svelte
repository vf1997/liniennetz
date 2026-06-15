<script>
	import { monogram, monogramColor, decorationByKey } from '$lib/netz.js';

	let { data } = $props();

	// Podest: 2. – 1. – 3. (1. in der Mitte, am höchsten)
	const podium = $derived(
		[
			{ slot: 2, person: data.ranking[1] },
			{ slot: 1, person: data.ranking[0] },
			{ slot: 3, person: data.ranking[2] }
		].filter((x) => x.person)
	);
	const medal = { 1: '🥇', 2: '🥈', 3: '🥉' };
</script>

<svelte:head>
	<title>Liniennetz · Rangliste</title>
</svelte:head>

<div class="page">
	<header class="hero">
		<div class="kicker">Rangliste</div>
		<h1>Wer treibt das <span class="hl">Netz</span> an?</h1>
		<p class="lead">
			Die fleißigsten Haltestellen eures Netzes – gemessen an gesammelten Fahrgäste-Punkten. Klettern
			geht nur gemeinsam: Jeder verschenkte und erhaltene Fahrschein zählt.
		</p>
	</header>

	{#if podium.length}
		<section class="podium">
			{#each podium as { slot, person } (person.id)}
				<a href="/haltestelle/{person.id}" class="pod pod-{slot}" class:me={person.id === data.meId}>
					<span class="pod-medal">{medal[slot]}</span>
					<span class="pod-avatar" style="background:{monogramColor(person.name)}">
						{monogram(person.name)}
						{#if person.decoration && decorationByKey(person.decoration)}
							<span class="pod-deco">{decorationByKey(person.decoration).icon}</span>
						{/if}
					</span>
					<span class="pod-name">{person.name.split(' ')[0]}</span>
					<span class="pod-rank">{person.rank.icon} {person.rank.title}</span>
					<span class="pod-pts">{person.points}</span>
					<span class="pod-stand"></span>
				</a>
			{/each}
		</section>
	{/if}

	<section class="card">
		<h2>Gesamtwertung</h2>
		<ol class="board">
			{#each data.ranking as p, i (p.id)}
				<li class="row" class:me={p.id === data.meId}>
					<span class="pos">{i + 1}</span>
					<span class="row-avatar" style="background:{monogramColor(p.name)}">{monogram(p.name)}</span>
					<span class="row-ident">
						<a href="/haltestelle/{p.id}" class="row-name">{p.name}</a>
						<span class="row-rank">{p.rank.icon} {p.rank.title}{p.role ? ` · ${p.role}` : ''}</span>
					</span>
					<span class="row-lines" title="Linien gesamt">〰️ {p.lines}</span>
					<span class="row-pts"><strong>{p.points}</strong> Fahrgäste</span>
				</li>
			{/each}
		</ol>
	</section>

	{#if data.departments.length > 1}
		<section class="card">
			<h2>Abteilungs-Duell 🏟️</h2>
			<p class="card-hint">Welches Team ist am aktivsten im Netz unterwegs?</p>
			<div class="duel">
				{#each data.departments as d, i (d.name)}
					<div class="duel-row">
						<span class="duel-name">{i === 0 ? '👑 ' : ''}{d.name}</span>
						<div class="duel-track">
							<div
								class="duel-fill"
								class:lead={i === 0}
								style="width:{Math.max(6, Math.round((d.count / data.deptMax) * 100))}%"
							>
								<span class="duel-count">{d.count}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.page {
		max-width: 760px;
		margin: 0 auto;
		padding: 36px 24px 90px;
	}

	.hero {
		text-align: center;
		margin-bottom: 28px;
	}

	.kicker {
		font-size: 0.78rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
		margin-bottom: 10px;
	}

	h1 {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: clamp(2rem, 5vw, 2.8rem);
		margin: 0 0 12px;
		letter-spacing: -0.02em;
	}

	.hl {
		color: #b5462f;
	}

	.lead {
		color: #3a3a37;
		line-height: 1.55;
		margin: 0 auto;
		max-width: 56ch;
	}

	/* Podest */
	.podium {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		align-items: end;
		gap: 12px;
		margin-bottom: 26px;
	}

	.pod {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		text-decoration: none;
		color: #1a1a1a;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px 16px 0 0;
		padding: 16px 8px 0;
		position: relative;
		transition: transform 0.12s;
	}

	.pod:hover {
		transform: translateY(-3px);
	}

	.pod-medal {
		font-size: 1.5rem;
	}

	.pod-avatar {
		width: 52px;
		height: 52px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-weight: 600;
		font-size: 1.05rem;
		position: relative;
		box-shadow: 0 8px 20px -10px rgba(60, 40, 20, 0.6);
	}

	.pod-deco {
		position: absolute;
		bottom: -4px;
		right: -6px;
		font-size: 1rem;
	}

	.pod-name {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.05rem;
		margin-top: 4px;
	}

	.pod-rank {
		font-size: 0.72rem;
		color: #79736a;
		text-align: center;
	}

	.pod-pts {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 1.3rem;
		color: #b5462f;
	}

	.pod-stand {
		display: block;
		width: 100%;
		margin-top: 8px;
		border-radius: 6px 6px 0 0;
	}

	.pod-1 .pod-stand {
		height: 64px;
		background: linear-gradient(#e0b85a, #c89b3c);
	}

	.pod-2 .pod-stand {
		height: 42px;
		background: linear-gradient(#cdccc6, #aaa89f);
	}

	.pod-3 .pod-stand {
		height: 28px;
		background: linear-gradient(#d3a487, #b07a59);
	}

	.pod.me {
		border-color: #b5462f;
		box-shadow: 0 0 0 2px rgba(181, 70, 47, 0.18);
	}

	/* Karte / Liste */
	.card {
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 22px;
		margin-bottom: 18px;
		box-shadow: 0 18px 40px -34px rgba(60, 40, 20, 0.5);
	}

	h2 {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.25rem;
		margin: 0 0 14px;
	}

	.card-hint {
		color: #79736a;
		font-size: 0.9rem;
		margin: 0 0 14px;
	}

	.board {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 6px;
		border-bottom: 1px solid #efe9dd;
	}

	.row:last-child {
		border-bottom: none;
	}

	.row.me {
		background: #f7e0d9;
		border-radius: 10px;
		border-bottom-color: transparent;
	}

	.pos {
		width: 24px;
		text-align: center;
		font-family: 'IBM Plex Mono', monospace;
		color: #9a948a;
		font-size: 0.9rem;
		flex-shrink: 0;
	}

	.row-avatar {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-weight: 600;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.row-ident {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}

	.row-name {
		font-weight: 600;
		color: #1a1a1a;
		text-decoration: none;
		font-size: 0.95rem;
	}

	.row-name:hover {
		color: #b5462f;
	}

	.row-rank {
		font-size: 0.76rem;
		color: #79736a;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.row-lines {
		font-size: 0.8rem;
		color: #79736a;
		font-family: 'IBM Plex Mono', monospace;
		white-space: nowrap;
	}

	.row-pts {
		font-size: 0.85rem;
		color: #4a443c;
		white-space: nowrap;
	}

	.row-pts strong {
		font-family: 'Fraunces', serif;
		color: #b5462f;
	}

	/* Abteilungs-Duell */
	.duel {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.duel-row {
		display: grid;
		grid-template-columns: 130px 1fr;
		align-items: center;
		gap: 12px;
	}

	.duel-name {
		font-size: 0.85rem;
		font-weight: 500;
		color: #4a443c;
		text-align: right;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.duel-track {
		background: #ece4d6;
		border-radius: 99px;
		height: 24px;
		overflow: hidden;
	}

	.duel-fill {
		height: 100%;
		background: #7c8b5e;
		border-radius: 99px;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 10px;
		transition: width 0.7s ease;
	}

	.duel-fill.lead {
		background: linear-gradient(90deg, #c89b3c, #e0b85a);
	}

	.duel-count {
		font-size: 0.78rem;
		font-weight: 600;
		color: #fff;
	}

	@media (max-width: 560px) {
		.duel-row {
			grid-template-columns: 96px 1fr;
		}
		.row-lines {
			display: none;
		}
	}
</style>
