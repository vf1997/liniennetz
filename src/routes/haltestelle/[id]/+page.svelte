<script>
	import { enhance } from '$app/forms';
	import { monogram, monogramColor, colorForValue, decorationByKey } from '$lib/netz.js';

	let { data, form } = $props();
	const p = $derived(data.person);
	const deco = $derived(decorationByKey(p.decoration));
</script>

<svelte:head>
	<title>Liniennetz · {data.person.name}</title>
</svelte:head>

<div class="page">
	<a class="back" href="/">← Zurück zur Stadt</a>

	<header class="profile">
		<span class="avatar" style="background:{monogramColor(p.name)}">{monogram(p.name)}</span>
		<div class="ident">
			<h1>{p.name}{#if deco}<span class="profile-deco" title={deco.label}>{deco.icon}</span>{/if}</h1>
			<p class="role">
				{p.role ?? 'Mitarbeiter:in'}{p.department ? ` · ${p.department}` : ''}
			</p>
			<div class="meta">
				<span><strong>{data.points}</strong> Fahrgäste</span>
				<span><strong>{data.connectionCount}</strong> Linien</span>
			</div>
		</div>
	</header>

	{#if data.isSelf}
		<section class="card werkstatt">
			<h2>Haltestellen-Werkstatt 🎨</h2>
			<p class="card-hint">
				Gestalte deine Haltestelle. Neue Deko schaltest du mit gesammelten Fahrgäste-Punkten frei –
				du hast aktuell <strong>{data.points}</strong>.
			</p>
			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}
			<div class="deco-grid">
				<form method="POST" action="?/dekorieren" use:enhance>
					<input type="hidden" name="decoration" value="" />
					<button class="deco-opt" class:active={!p.decoration} type="submit">
						<span class="deco-ic">🚫</span>
						<span class="deco-lab">Keine</span>
						<span class="deco-cost">✓</span>
					</button>
				</form>
				{#each data.decorations as d (d.key)}
					{@const unlocked = data.points >= d.cost}
					<form method="POST" action="?/dekorieren" use:enhance>
						<input type="hidden" name="decoration" value={d.key} />
						<button
							class="deco-opt"
							class:active={p.decoration === d.key}
							type="submit"
							disabled={!unlocked}
						>
							<span class="deco-ic">{d.icon}</span>
							<span class="deco-lab">{d.label}</span>
							<span class="deco-cost">{unlocked ? '✓' : `${d.cost} P`}</span>
						</button>
					</form>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.truthGame}
		<section class="card truth">
			<h2>Zwei Wahrheiten, eine Lüge 🕵️</h2>
			{#if data.truthGame.isSelf}
				<p class="card-hint">
					Schreib drei Aussagen über dich – zwei wahre und eine erfundene. Deine Kolleginnen und
					Kollegen versuchen, die Lüge zu enttarnen. Markiere mit dem Knopf links, welche die Lüge
					ist.
				</p>
				{#if form?.truthError}
					<p class="error">{form.truthError}</p>
				{/if}
				{#if form?.truthSaved}
					<p class="success-msg">✓ Gespeichert! Andere können jetzt raten.</p>
				{/if}
				<form method="POST" action="?/speichern" use:enhance>
					<div class="truth-fields">
						{#each [0, 1, 2] as i}
							<div class="truth-field">
								<label class="lie-radio" title="Diese Aussage ist die Lüge">
									<input
										type="radio"
										name="lieIndex"
										value={i}
										checked={data.truthGame.lieIndex === i}
									/>
									<span class="lie-dot"></span>
								</label>
								<input
									type="text"
									name="s{i + 1}"
									value={data.truthGame.statements[i]}
									placeholder="Aussage {i + 1}"
									maxlength="200"
									required
								/>
							</div>
						{/each}
					</div>
					<button type="submit" class="truth-save-btn"
						>{data.truthGame.hasStatements ? 'Aktualisieren' : 'Speichern & veröffentlichen'}</button
					>
				</form>
			{:else if data.truthGame.hasStatements}
				{#if form?.truthError}
					<p class="error">{form.truthError}</p>
				{/if}
				{#if data.truthGame.guessed}
					<p class="card-hint">
						Du hast Aussage {data.truthGame.guessedIndex + 1} als Lüge gewählt –
						{#if data.truthGame.correct}
							<strong>🎉 Richtig!</strong> Das war tatsächlich die Lüge.
						{:else}
							<strong>❌ Falsch.</strong> Die echte Lüge war Aussage {data.truthGame.lieIndex + 1}.
						{/if}
					</p>
					<ol class="truth-list">
						{#each data.truthGame.statements as s, i}
							<li
								class="truth-item"
								class:is-lie={i === data.truthGame.lieIndex}
								class:was-guessed={i === data.truthGame.guessedIndex &&
									i !== data.truthGame.lieIndex}
							>
								{s}
								{#if i === data.truthGame.lieIndex}
									<span class="truth-badge lie-badge">Lüge</span>
								{:else if i === data.truthGame.guessedIndex}
									<span class="truth-badge wrong-badge">Dein Tipp</span>
								{/if}
							</li>
						{/each}
					</ol>
				{:else}
					<p class="card-hint">
						Welche dieser drei Aussagen ist erfunden? Tippe auf die, die du für die Lüge hältst.
					</p>
					<form method="POST" action="?/raten" use:enhance>
						<ol class="truth-list clickable">
							{#each data.truthGame.statements as s, i}
								<li>
									<button type="submit" name="guessedIndex" value={i} class="truth-guess-btn">
										{s}
									</button>
								</li>
							{/each}
						</ol>
					</form>
				{/if}
			{/if}
		</section>
	{/if}

	{#if !data.isSelf}
		<section class="card common">
			<h2>Das habt ihr gemeinsam</h2>
			{#if data.sharedInterests.length}
				<div class="tags">
					{#each data.sharedInterests as t}
						<span class="tag hl">{t}</span>
					{/each}
				</div>
				<p class="card-hint">
					Ein guter Gesprächsanfang – schenk {data.person.name.split(' ')[0]} doch einen Fahrschein.
				</p>
			{:else}
				<p class="card-hint">
					Noch keine gemeinsamen Interessen entdeckt – umso spannender, {data.person.name.split(
						' '
					)[0]} kennenzulernen.
				</p>
			{/if}
		</section>
	{/if}

	{#if data.badges.length}
		<section class="card">
			<h2>Abzeichen</h2>
			<div class="badges">
				{#each data.badges as b (b.name)}
					<div class="badge" title={b.desc}>
						<span class="badge-icon">{b.icon}</span>
						<span class="badge-name">{b.name}</span>
						<span class="badge-desc">{b.desc}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if data.interests.length}
		<section class="card">
			<h2>Interessen</h2>
			<div class="tags">
				{#each data.interests as tag}
					<span class="tag">{tag}</span>
				{/each}
			</div>
		</section>
	{/if}

	<section class="card">
		<h2>Erhaltene Fahrscheine</h2>
		{#if data.quotes.length}
			<ul class="quotes">
				{#each data.quotes as q}
					<li>
						<p class="q-msg">„{q.message}"</p>
						<p class="q-meta">
							<span class="dot-sm" style="background:{colorForValue(q.value)}"></span>
							von {q.from}{q.value ? ` · ${q.value}` : ''}
						</p>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="card-hint">Noch keine Fahrscheine erhalten.</p>
		{/if}
	</section>

	<section class="card">
		<h2>Verbindungen</h2>
		{#if data.lines.length}
			<ul class="lines">
				{#each data.lines as l}
					<li>
						<span class="dot-sm" style="background:{colorForValue(l.value)}"></span>
						<a href="/haltestelle/{l.otherId}">{l.other}</a>
						<span class="dir">{l.sent ? 'geschenkt' : 'erhalten'}</span>
						{#if l.value}<span class="tag small">{l.value}</span>{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="card-hint">Diese Haltestelle ist noch nicht verbunden – bau die erste Linie!</p>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 680px;
		margin: 0 auto;
		padding: 28px 24px 90px;
	}

	.back {
		display: inline-block;
		color: #79736a;
		text-decoration: none;
		font-size: 0.9rem;
		margin-bottom: 22px;
	}

	.back:hover {
		color: #b5462f;
	}

	.profile {
		display: flex;
		align-items: center;
		gap: 20px;
		margin-bottom: 26px;
	}

	.avatar {
		width: 84px;
		height: 84px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-size: 1.8rem;
		font-weight: 600;
		flex-shrink: 0;
		box-shadow: 0 12px 30px -16px rgba(60, 40, 20, 0.6);
	}

	h1 {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 2.1rem;
		margin: 0;
		letter-spacing: -0.02em;
	}

	.role {
		color: #79736a;
		margin: 4px 0 10px;
		font-size: 0.95rem;
	}

	.meta {
		display: flex;
		gap: 18px;
		font-size: 0.92rem;
		color: #4a443c;
	}

	.meta strong {
		font-family: 'Fraunces', serif;
		font-size: 1.05rem;
	}

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
		margin: 0 0 16px;
	}

	.card-hint {
		color: #79736a;
		font-size: 0.9rem;
		margin: 0 0 14px;
	}

	.profile-deco {
		font-size: 1.5rem;
		margin-left: 8px;
		vertical-align: middle;
	}

	.error {
		background: #f7e0da;
		color: #9c3a26;
		padding: 10px 13px;
		border-radius: 9px;
		font-size: 0.88rem;
		margin: 0 0 14px;
	}

	.deco-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 10px;
	}

	.deco-grid form {
		display: contents;
	}

	.deco-opt {
		width: 100%;
		background: #fff;
		border: 1px solid #e8e1d4;
		border-radius: 12px;
		padding: 12px 8px;
		cursor: pointer;
		font-family: inherit;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		transition: border-color 0.12s, transform 0.12s;
	}

	.deco-opt:hover:not(:disabled) {
		border-color: #d8b8ad;
		transform: translateY(-2px);
	}

	.deco-opt:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.deco-opt.active {
		border-color: #b5462f;
		background: #f7e0d9;
	}

	.deco-ic {
		font-size: 1.6rem;
	}

	.deco-lab {
		font-size: 0.82rem;
		font-weight: 500;
		color: #1a1a1a;
	}

	.deco-cost {
		font-size: 0.72rem;
		color: #79736a;
	}

	.badges {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: 12px;
	}

	.badge {
		background: #fff;
		border: 1px solid #e8e1d4;
		border-radius: 12px;
		padding: 14px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.badge-icon {
		font-size: 1.7rem;
	}

	.badge-name {
		font-weight: 600;
		color: #b5462f;
		font-size: 0.92rem;
	}

	.badge-desc {
		font-size: 0.76rem;
		color: #79736a;
		line-height: 1.35;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.tag {
		background: #f4ece2;
		color: #4a443c;
		padding: 6px 13px;
		border-radius: 999px;
		font-size: 0.85rem;
	}

	.tag.small {
		font-size: 0.72rem;
		padding: 3px 9px;
		color: #9c3a26;
	}

	.tag.hl {
		background: #f7e0d9;
		color: #9c3a26;
		font-weight: 600;
	}

	.quotes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.q-msg {
		font-family: 'Fraunces', serif;
		font-size: 1.12rem;
		line-height: 1.4;
		margin: 0 0 6px;
	}

	.q-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.83rem;
		color: #79736a;
		margin: 0;
	}

	.dot-sm {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		flex-shrink: 0;
		display: inline-block;
	}

	.lines {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.lines li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 2px;
		border-bottom: 1px solid #efe9dd;
		font-size: 0.92rem;
	}

	.lines li:last-child {
		border-bottom: none;
	}

	.lines a {
		color: #1a1a1a;
		font-weight: 600;
		text-decoration: none;
	}

	.lines a:hover {
		color: #b5462f;
	}

	.dir {
		font-size: 0.78rem;
		color: #9a948a;
	}

	.lines .tag {
		margin-left: auto;
	}

	/* Zwei Wahrheiten, eine Lüge */
	.truth-fields {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-bottom: 16px;
	}

	.truth-field {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lie-radio {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		cursor: pointer;
	}

	.lie-radio input[type='radio'] {
		appearance: none;
		width: 22px;
		height: 22px;
		border: 2px solid #d8d0c0;
		border-radius: 50%;
		cursor: pointer;
		position: relative;
		flex-shrink: 0;
	}

	.lie-radio input[type='radio']:checked {
		border-color: #b5462f;
		background: #b5462f;
	}

	.lie-radio input[type='radio']:checked::after {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		width: 10px;
		height: 10px;
		background: #fff;
		border-radius: 50%;
	}

	.truth-field input[type='text'] {
		flex: 1;
		padding: 10px 13px;
		border: 1px solid #d8d0c0;
		border-radius: 9px;
		font-size: 0.95rem;
		font-family: inherit;
		background: #fff;
		color: #1a1a1a;
	}

	.truth-field input[type='text']:focus {
		outline: none;
		border-color: #b5462f;
		box-shadow: 0 0 0 3px rgba(181, 70, 47, 0.12);
	}

	.truth-save-btn {
		background: #b5462f;
		color: #fff;
		border: none;
		padding: 10px 22px;
		border-radius: 9px;
		font-weight: 600;
		font-size: 0.93rem;
		cursor: pointer;
		font-family: inherit;
	}

	.truth-save-btn:hover {
		background: #9c3a26;
	}

	.success-msg {
		background: #e6f4ea;
		color: #2e6b3a;
		padding: 10px 13px;
		border-radius: 9px;
		font-size: 0.88rem;
		margin: 0 0 14px;
	}

	.truth-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.truth-list.clickable li {
		padding: 0;
	}

	.truth-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		background: #fff;
		border: 1px solid #e3ddd0;
		border-radius: 10px;
		font-size: 0.95rem;
		line-height: 1.4;
	}

	.truth-item.is-lie {
		border-color: #d88080;
		background: #fdf0ee;
	}

	.truth-item.was-guessed {
		border-color: #b5a060;
		background: #fdf9ee;
	}

	.truth-badge {
		margin-left: auto;
		font-size: 0.75rem;
		font-weight: 700;
		padding: 3px 9px;
		border-radius: 999px;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.lie-badge {
		background: #f7e0d9;
		color: #9c3a26;
	}

	.wrong-badge {
		background: #fdf3d9;
		color: #7a6030;
	}

	.truth-guess-btn {
		width: 100%;
		text-align: left;
		background: #fff;
		border: 1px solid #e3ddd0;
		border-radius: 10px;
		padding: 14px 16px;
		font-size: 0.95rem;
		font-family: inherit;
		color: #1a1a1a;
		cursor: pointer;
		line-height: 1.4;
		transition:
			border-color 0.12s,
			background 0.12s,
			transform 0.1s;
	}

	.truth-guess-btn:hover {
		border-color: #b5462f;
		background: #fdf0ee;
		transform: translateX(3px);
	}
</style>
