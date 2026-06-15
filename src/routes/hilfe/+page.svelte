<script>
	let { data } = $props();
	const s = $derived(data.settings);

	let step = $state(0);
	let drawn = $state(false);

	function buildSteps(s) {
		return [
			{
				icon: '🚏',
				title: 'Du bist eine Haltestelle',
				body: `Melde dich an – im Demo-Modus per Klick, oder mit deinem echten Slack-Konto. Welcher Modus gilt, legst du in den Einstellungen unter „Anmeldung“ fest. Meldest du dich mit Slack an, teilst du dir automatisch ein Netz mit allen aus demselben Slack-Workspace. Ab dann bist du eine Haltestelle auf der gemeinsamen Stadtkarte – jede Kollegin, jeder Kollege ist eine eigene Haltestelle.`
			},
			{
				icon: '🎟️',
				title: 'Fahrscheine verschenken = Linien bauen',
				body: `Du hast ${s.ticketsPerWeek} Fahrscheine pro Woche. Schenk einen mit einem kurzen Dank und einem Firmenwert – sofort zeichnet sich eine Linie über die Karte. Eine ganz neue Verbindung bringt ${s.pointsNewStrecke} Punkte, sonst ${s.pointsGiveTicket}; die beschenkte Person bekommt ${s.pointsReceiveTicket}.`
			},
			{
				icon: '📈',
				title: 'Das ganze Netz wächst',
				body: `Alle bestätigten Linien zusammen heben das Team durch Ausbaustufen: Dorf → Kleinstadt (ab ${s.levelKleinstadt} Linien) → Großstadt (ab ${s.levelGrossstadt}) → Metropole (ab ${s.levelMetropole}). Ihr wachst gemeinsam – nicht gegeneinander.`
			},
			{
				icon: '🏗️',
				title: 'Wochen-Mission & Wahrzeichen',
				body: `Eine gemeinsame Mission gibt ein Ziel vor. Erreicht ihr es, erscheint dauerhaft ein Wahrzeichen auf der Karte – Hauptbahnhof, Brücke oder Park. Ein bleibendes Andenken an das, was ihr zusammen geschafft habt.`
			},
			{
				icon: '❓',
				title: 'Frage des Tages',
				body: `Jeden Tag eine lockere Frage. Antworte (${s.pointsAnswer} Punkte) und die Karte verrät dir, wie viele Kolleg:innen genauso denken – der schnellste Weg zu einem „Oh, du auch?".`
			},
			{
				icon: '👏',
				title: 'Anerkennung & Kür der Woche',
				body: `Spende Applaus für schöne Gesten im Verlauf. Wer in den letzten 7 Tagen am aktivsten verbunden hat, wird „Lebendigste Haltestelle der Woche" – mit Krone auf der Karte.`
			},
			{
				icon: '🎨',
				title: 'Haltestellen-Werkstatt',
				body: `Mit gesammelten Fahrgäste-Punkten schaltest du Deko frei und verschönerst deine Haltestelle: Baum (gratis), Bank (${s.decoBank}), Laterne (${s.decoLampe}), Café (${s.decoCafe}), Tram (${s.decoTram}).`
			},
			{
				icon: '🕵️',
				title: 'Zwei Wahrheiten, eine Lüge',
				body: `Schreib auf deinem Profil drei Aussagen über dich – zwei wahre, eine erfundene. Wer die Lüge errät, bekommt ${s.pointsLieCorrect} Fahrgäste-Punkte – genau wie du, weil du andere zum Staunen gebracht hast.`
			},
			{
				icon: '🏅',
				title: 'Steige im Rang auf',
				body: `Jede Aktion bringt dir Fahrgäste-Punkte – und mit ihnen einen persönlichen Rang: vom Fahrgast über den Pendler-Profi bis zur Netz-Legende. Oben auf der Stadt-Seite siehst du deinen Fortschritt, und in der „Rangliste" misst du dich mit dem Team – inklusive Abteilungs-Duell.`
			},
			{
				icon: '🙋',
				title: 'Zeig, wer du bist',
				body: `Auf deiner eigenen Haltestelle wählst du deine Interessen selbst (hinzufügen & entfernen). So entdeckt ihr Gemeinsamkeiten – und das „Dein Netz auf einen Blick"-Panel zeigt dir deine persönlichen Zahlen und dein nächstes Ziel.`
			}
		];
	}

	const steps = $derived(buildSteps(s));
	const current = $derived(steps[step]);

	function next() {
		if (step < steps.length - 1) step++;
	}
	function prev() {
		if (step > 0) step--;
	}

	const glossar = $derived([
		{ icon: '🚏', term: 'Haltestelle', def: 'Deine Person auf der Karte.' },
		{ icon: '〰️', term: 'Linie', def: 'Eine Verbindung zwischen zwei Haltestellen.' },
		{ icon: '🎟️', term: 'Fahrschein', def: `Knappe Währung: ${s.ticketsPerWeek} pro Woche zum Verschenken.` },
		{ icon: '👥', term: 'Fahrgäste', def: 'Deine persönlichen Punkte für jede Aktion.' },
		{ icon: '📈', term: 'Netz-Stufe', def: 'Gemeinsames Level des ganzen Teams.' },
		{ icon: '🔥', term: 'Netz-Flamme', def: 'Tage in Folge, an denen etwas gebaut wurde.' },
		{ icon: '🏗️', term: 'Wochen-Mission', def: 'Gemeinsames Ziel mit Belohnung.' },
		{ icon: '🌉', term: 'Wahrzeichen', def: 'Dauerhafte Belohnung einer erfüllten Mission.' },
		{ icon: '🎖️', term: 'Abzeichen', def: 'Auszeichnungen wie „Brückenbauer" oder „Stammgast".' },
		{ icon: '🏆', term: 'Kür der Woche', def: 'Lebendigste Haltestelle der letzten 7 Tage.' },
		{ icon: '👏', term: 'Applaus', def: 'Würdigt eine schöne Geste mit einem Klick.' },
		{ icon: '🕵️', term: 'Zwei Wahrheiten, eine Lüge', def: 'Mini-Spiel auf jedem Profil: Finde die erfundene Aussage.' },
		{ icon: '🏅', term: 'Rang', def: 'Dein persönlicher Titel nach gesammelten Fahrgäste-Punkten.' },
		{ icon: '🏆', term: 'Rangliste', def: 'Wertung aller Haltestellen + Abteilungs-Duell.' },
		{ icon: '🔑', term: 'Anmelde-Modus', def: 'Demo (Person per Klick) oder Slack-Login – umschaltbar in den Einstellungen.' }
	]);
</script>

<svelte:head>
	<title>Liniennetz · Hilfe & Anleitung</title>
</svelte:head>

<div class="page">
	<header class="hero">
		<div class="kicker">Anleitung</div>
		<h1>So funktioniert <span class="hl">Liniennetz</span></h1>
		<p class="lead">
			Aus eurem Team wird ein lebendiges Verkehrsnetz. Hier lernst du in wenigen Minuten alle
			Features kennen – Schritt für Schritt.
		</p>
	</header>

	<!-- Geführte Tour -->
	<section class="tour">
		<div class="tour-card">
			<div class="tour-step-icon">{current.icon}</div>
			<div class="tour-no">Schritt {step + 1} von {steps.length}</div>
			<h2>{current.title}</h2>
			<p>{current.body}</p>

			<div class="tour-nav">
				<button class="ghost" onclick={prev} disabled={step === 0}>← Zurück</button>
				<div class="dots">
					{#each steps as _, i}
						<button
							class="dot"
							class:active={i === step}
							aria-label="Schritt {i + 1}"
							onclick={() => (step = i)}
						></button>
					{/each}
				</div>
				{#if step < steps.length - 1}
					<button class="primary" onclick={next}>Weiter →</button>
				{:else}
					<a class="primary" href="/">Los geht's 🚍</a>
				{/if}
			</div>
		</div>

		<!-- Kleine Spielerei: eine Linie bauen -->
		<div class="demo">
			<span class="demo-title">Probier's aus:</span>
			<svg viewBox="0 0 300 130" class="demo-svg" role="img" aria-label="Demo: eine Linie bauen">
				<path class="demo-line" class:drawn d="M 55 70 Q 150 25 245 70" pathLength="1" />
				<g>
					<circle cx="55" cy="70" r="20" fill="#3f6b73" />
					<text x="55" y="74" text-anchor="middle" class="demo-init">DU</text>
				</g>
				<g>
					<circle cx="245" cy="70" r="20" fill="#c89b3c" />
					<text x="245" y="74" text-anchor="middle" class="demo-init">AB</text>
				</g>
				{#if drawn}
					<text x="150" y="115" text-anchor="middle" class="demo-ok">✓ Verbunden!</text>
				{/if}
			</svg>
			<button class="demo-btn" onclick={() => (drawn = !drawn)}>
				{drawn ? 'Nochmal' : 'Linie bauen 🎟️'}
			</button>
		</div>
	</section>

	<!-- Glossar -->
	<section class="glossar-wrap">
		<h2 class="section-title">Die Bausteine auf einen Blick</h2>
		<div class="glossar">
			{#each glossar as g (g.term)}
				<div class="gloss">
					<span class="gloss-icon">{g.icon}</span>
					<div>
						<div class="gloss-term">{g.term}</div>
						<div class="gloss-def">{g.def}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Schnellstart -->
	<section class="quickstart">
		<h2 class="section-title">In 4 Schritten loslegen</h2>
		<ol>
			<li><strong>Anmelden</strong> und deine Haltestelle auf der Karte finden.</li>
			<li>
				Einen <strong>Fahrschein verschenken</strong> – such jemanden, den du würdigen willst.
			</li>
			<li>Die <strong>Frage des Tages</strong> beantworten und Gemeinsamkeiten entdecken.</li>
			<li>
				Deine <strong>Haltestelle gestalten</strong> und gemeinsam die nächste Ausbaustufe erreichen.
			</li>
		</ol>
		<p class="tip">
			Tipp: Alle Spielregeln (Fahrscheine, Punkte, Stufen …) kannst du unter
			<a href="/config">Einstellungen</a> anpassen.
		</p>
	</section>
</div>

<style>
	.page {
		max-width: 820px;
		margin: 0 auto;
		padding: 36px 24px 90px;
	}

	.hero {
		text-align: center;
		margin-bottom: 32px;
	}

	.kicker {
		font-size: 0.78rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
		margin-bottom: 12px;
	}

	h1 {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: clamp(2.1rem, 6vw, 3.2rem);
		margin: 0 0 14px;
		letter-spacing: -0.02em;
	}

	.hl {
		color: #b5462f;
	}

	.lead {
		color: #3a3a37;
		line-height: 1.6;
		font-size: 1.08rem;
		max-width: 56ch;
		margin: 0 auto;
	}

	/* Geführte Tour */
	.tour {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 22px;
		margin-bottom: 40px;
		align-items: stretch;
	}

	.tour-card {
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 18px;
		padding: 28px;
		box-shadow: 0 22px 48px -32px rgba(60, 40, 20, 0.55);
		display: flex;
		flex-direction: column;
	}

	.tour-step-icon {
		font-size: 2.6rem;
		margin-bottom: 6px;
	}

	.tour-no {
		font-size: 0.74rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
		margin-bottom: 8px;
	}

	.tour-card h2 {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.5rem;
		margin: 0 0 10px;
	}

	.tour-card p {
		color: #3a3a37;
		line-height: 1.6;
		margin: 0 0 20px;
		flex: 1;
	}

	.tour-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.dots {
		display: flex;
		gap: 7px;
	}

	.dot {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		border: none;
		background: #ddd3c2;
		cursor: pointer;
		padding: 0;
	}

	.dot.active {
		background: #b5462f;
		transform: scale(1.25);
	}

	.primary {
		background: #b5462f;
		color: #fff;
		border: none;
		padding: 10px 18px;
		border-radius: 9px;
		font-weight: 600;
		font-size: 0.92rem;
		cursor: pointer;
		font-family: inherit;
		text-decoration: none;
		display: inline-block;
	}

	.primary:hover {
		background: #9c3a26;
	}

	.ghost {
		background: transparent;
		border: 1px solid #e3ddd0;
		color: #79736a;
		padding: 10px 16px;
		border-radius: 9px;
		font-size: 0.92rem;
		cursor: pointer;
		font-family: inherit;
	}

	.ghost:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.ghost:hover:not(:disabled) {
		border-color: #d8b8ad;
		color: #b5462f;
	}

	/* Demo */
	.demo {
		background: radial-gradient(circle at 50% 40%, #fffdf8, #f4f1ea);
		border: 1px solid #e3ddd0;
		border-radius: 18px;
		padding: 22px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		box-shadow: 0 22px 48px -32px rgba(60, 40, 20, 0.55);
	}

	.demo-title {
		font-size: 0.82rem;
		color: #79736a;
		align-self: flex-start;
	}

	.demo-svg {
		width: 100%;
		max-width: 280px;
	}

	.demo-line {
		fill: none;
		stroke: #b5462f;
		stroke-width: 4;
		stroke-linecap: round;
		stroke-dasharray: 1;
		stroke-dashoffset: 1;
	}

	.demo-line.drawn {
		animation: draw 0.9s ease forwards;
		filter: drop-shadow(0 0 5px rgba(181, 70, 47, 0.5));
	}

	@keyframes draw {
		to {
			stroke-dashoffset: 0;
		}
	}

	.demo-init {
		fill: #fff;
		font-size: 13px;
		font-weight: 600;
		font-family: 'IBM Plex Sans', sans-serif;
	}

	.demo-ok {
		fill: #b5462f;
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 15px;
	}

	.demo-btn {
		background: #1a1a1a;
		color: #f4f1ea;
		border: none;
		padding: 10px 18px;
		border-radius: 9px;
		font-weight: 600;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.92rem;
	}

	.demo-btn:hover {
		background: #b5462f;
	}

	/* Glossar */
	.section-title {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.5rem;
		margin: 0 0 18px;
		text-align: center;
	}

	.glossar-wrap {
		margin-bottom: 40px;
	}

	.glossar {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
	}

	.gloss {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 12px;
		padding: 14px;
	}

	.gloss-icon {
		font-size: 1.4rem;
		flex-shrink: 0;
	}

	.gloss-term {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.gloss-def {
		font-size: 0.85rem;
		color: #79736a;
		line-height: 1.4;
	}

	/* Schnellstart */
	.quickstart {
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 18px;
		padding: 28px;
		box-shadow: 0 18px 40px -34px rgba(60, 40, 20, 0.5);
	}

	.quickstart ol {
		margin: 0 0 16px;
		padding-left: 22px;
		line-height: 1.9;
		color: #3a3a37;
	}

	.tip {
		font-size: 0.9rem;
		color: #79736a;
		margin: 0;
		background: #f7efe9;
		border-left: 3px solid #b5462f;
		padding: 10px 13px;
		border-radius: 8px;
	}

	.tip a {
		color: #b5462f;
		font-weight: 600;
	}

	@media (max-width: 680px) {
		.tour {
			grid-template-columns: 1fr;
		}
	}
</style>
