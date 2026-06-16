<script>
	let { data } = $props();
	const s = $derived(data.settings);

	let step = $state(0);

	function buildSteps(s) {
		return [
			{
				icon: '🚏',
				title: 'Du bist eine Haltestelle',
				body: `Melde dich an – im Demo-Modus per Klick, oder mit deinem echten Slack-Konto. Welcher Modus gilt, legt die Administration fest. Meldest du dich mit Slack an, teilst du dir automatisch ein Netz mit allen aus demselben Slack-Workspace. Ab dann bist du eine Haltestelle auf der gemeinsamen Stadtkarte – jede Kollegin, jeder Kollege ist eine eigene Haltestelle.`
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

	// Alle Features – verständlich erklärt, gruppiert nach „was du damit tust".
	const features = $derived([
		{
			group: '🙋 So machst du mit',
			items: [
				{
					icon: '🎟️',
					title: 'Fahrschein verschenken',
					text: `Tipp jemanden auf der Karte an – eine kleine Karte öffnet sich. Schreib einen kurzen Dank, wähl einen Firmenwert, fertig: sofort zeichnet sich eine Linie zwischen euch. Du hast ${s.ticketsPerWeek} Fahrscheine pro Woche.`
				},
				{
					icon: '❓',
					title: 'Frage des Tages',
					text: `Jeden Tag eine lockere Frage auf der Stadt-Seite. Beantworte sie (${s.pointsAnswer} Punkte) und die Karte verrät dir, wie viele Kolleg:innen es genauso sehen.`
				},
				{
					icon: '👏',
					title: 'Applaus spenden',
					text: `Im Bereich „Zuletzt im Netz" würdigst du eine schöne Geste mit einem Klick – kostet nichts, freut alle.`
				},
				{
					icon: '🕵️',
					title: 'Zwei Wahrheiten, eine Lüge',
					text: `Auf deinem Profil schreibst du drei Aussagen über dich, eine davon erfunden. Wer die Lüge errät, bekommt ${s.pointsLieCorrect} Punkte – und du auch.`
				}
			]
		},
		{
			group: '🗺️ Die Karte erkunden',
			items: [
				{
					icon: '👆',
					title: 'Haltestelle anklicken',
					text: `Klick auf eine Person: ihr Netz wird hervorgehoben, der kürzeste Weg zu dir erscheint („über 2 Stationen verbunden"), und du kannst direkt von dort einen Fahrschein schenken.`
				},
				{
					icon: '🔎',
					title: 'Suchen & Filtern',
					text: `Finde jemanden über das Suchfeld (mit „📍 Mich" springst du zu dir selbst). Über die Farb-Chips blendest du nur einen Firmenwert oder eine Abteilung ein.`
				},
				{
					icon: '🔍',
					title: 'Zoom & Verschieben',
					text: `Mausrad zoomt, Ziehen verschiebt die Karte. Der Knopf „⟲ Zurücksetzen" (oben rechts) bringt Ansicht, Auswahl und Filter zurück auf Anfang.`
				},
				{
					icon: '⏱️',
					title: 'Zeitraffer',
					text: `Der Regler unter der Karte spielt ab, wie euer Netz über die Tage gewachsen ist – schön, um den Verlauf zu zeigen.`
				},
				{
					icon: '🔴',
					title: 'Live',
					text: `Die Karte aktualisiert sich von selbst. Verschenkt jemand im Team gerade einen Fahrschein, erscheint die neue Linie automatisch – ideal für einen Bildschirm im Büro.`
				},
				{
					icon: '🎨',
					title: 'Themes & Stimmung',
					text: `Die Stadt verändert ihr Aussehen mit der Ausbaustufe (Dorf → Metropole). Im Menü „Ansicht" kannst du außerdem Tag/Nacht, Jahreszeit und Theme selbst einstellen.`
				}
			]
		},
		{
			group: '📈 Gemeinsam wachsen',
			items: [
				{
					icon: '🏙️',
					title: 'Netz-Ausbaustufe',
					text: `Alle Linien zusammen heben das ganze Team: Dorf → Kleinstadt (ab ${s.levelKleinstadt}) → Großstadt (ab ${s.levelGrossstadt}) → Metropole (ab ${s.levelMetropole}). Ihr wachst miteinander, nicht gegeneinander.`
				},
				{
					icon: '🏗️',
					title: 'Wochen-Mission & Wahrzeichen',
					text: `Eine gemeinsame Mission gibt ein Ziel vor. Erreicht ihr es, erscheint dauerhaft ein Wahrzeichen (Hauptbahnhof, Brücke oder Park) auf der Karte – ein bleibendes Andenken.`
				},
				{
					icon: '🏆',
					title: 'Kür der Woche',
					text: `Wer in den letzten 7 Tagen am aktivsten verbunden hat, wird „Lebendigste Haltestelle der Woche" – mit Krone auf der Karte.`
				}
			]
		},
		{
			group: '🏅 Dein Fortschritt',
			items: [
				{
					icon: '🏅',
					title: 'Fahrgäste & Rang',
					text: `Jede Aktion bringt dir „Fahrgäste" (deine Punkte) und damit einen persönlichen Rang – vom Fahrgast bis zur Netz-Legende. Deinen Fortschritt siehst du oben auf der Stadt-Seite.`
				},
				{
					icon: '🎖️',
					title: 'Abzeichen',
					text: `Sammle Auszeichnungen wie „Brückenbauer", „Stammgast" oder „Lügen-Detektiv". Auf deinem Profil siehst du sie samt Fortschritt zur nächsten.`
				},
				{
					icon: '🏆',
					title: 'Rangliste',
					text: `Eine eigene Seite mit Podest, Gesamtwertung und einem spielerischen Abteilungs-Duell: welches Team treibt das Netz am meisten an?`
				},
				{
					icon: '📊',
					title: 'Dein Netz auf einen Blick',
					text: `Das Panel auf deinem Profil zeigt deine Zahlen, deine engste Verbindung und dein nächstes Ziel.`
				},
				{
					icon: '🛠️',
					title: 'Werkstatt & Interessen',
					text: `Schalte mit gesammelten Punkten Deko für deine Haltestelle frei – und wähle deine Interessen, damit ihr leichter Gemeinsamkeiten entdeckt.`
				}
			]
		}
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

	</section>

	<!-- Alle Features erklärt -->
	<section class="features-wrap">
		<h2 class="section-title">Alle Features – verständlich erklärt</h2>
		{#each features as fg (fg.group)}
			<div class="feat-group">
				<h3 class="feat-group-title">{fg.group}</h3>
				<div class="feat-grid">
					{#each fg.items as f (f.title)}
						<div class="feat">
							<span class="feat-icon">{f.icon}</span>
							<div class="feat-body">
								<div class="feat-title">{f.title}</div>
								<p class="feat-text">{f.text}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</section>

	<!-- Live-Simulation -->
	<section class="sim-card">
		<div class="sim-icon">🎬</div>
		<div class="sim-body">
			<h2>Live-Simulation</h2>
			<p>
				Du willst sehen, wie das Liniennetz lebt, ohne zu warten? Die Simulation zeigt, wie 8
				Haltestellen nach und nach Fahrscheine verschenken und die Stadt vom Dorf bis zur Metropole
				wächst – rein zur Ansicht, deine echten Daten bleiben unberührt.
			</p>
			<a class="sim-btn" href="/simulation">▶ Simulation starten</a>
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
			Tipp: Deinen Namen und dein Avatar-Symbol stellst du auf deiner
			<a href="/haltestelle/{data.user.id}">eigenen Haltestelle</a> ein. Die Spielregeln
			(Fahrscheine, Punkte, Stufen …) legt die Administration über Umgebungs-Variablen fest.
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
		margin-bottom: 40px;
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

	.section-title {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.5rem;
		margin: 0 0 22px;
		text-align: center;
	}

	/* Alle Features erklärt */
	.features-wrap {
		margin-bottom: 40px;
	}

	.feat-group {
		margin-bottom: 26px;
	}

	.feat-group-title {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.15rem;
		margin: 0 0 12px;
		color: #1a1a1a;
	}

	.feat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 12px;
	}

	.feat {
		display: flex;
		gap: 14px;
		align-items: flex-start;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 14px;
		padding: 16px 18px;
		box-shadow: 0 14px 34px -30px rgba(60, 40, 20, 0.5);
	}

	.feat-icon {
		font-size: 1.6rem;
		flex-shrink: 0;
		line-height: 1.2;
	}

	.feat-title {
		font-weight: 600;
		font-size: 1rem;
		margin-bottom: 4px;
	}

	.feat-text {
		font-size: 0.9rem;
		color: #4a443c;
		line-height: 1.5;
		margin: 0;
	}

	/* Live-Simulation */
	.sim-card {
		display: flex;
		gap: 18px;
		align-items: center;
		background: linear-gradient(135deg, #1a1a1a, #2b2b2b);
		color: #f4f1ea;
		border-radius: 18px;
		padding: 24px 26px;
		margin-bottom: 40px;
	}

	.sim-icon {
		font-size: 2.4rem;
		flex-shrink: 0;
	}

	.sim-body h2 {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.3rem;
		margin: 0 0 8px;
		color: #fff;
	}

	.sim-body p {
		margin: 0 0 14px;
		line-height: 1.55;
		color: #e7ddcd;
		font-size: 0.95rem;
		max-width: 58ch;
	}

	.sim-btn {
		display: inline-block;
		background: #b5462f;
		color: #fff;
		text-decoration: none;
		padding: 11px 22px;
		border-radius: 10px;
		font-weight: 600;
		font-size: 0.95rem;
	}

	.sim-btn:hover {
		background: #c2543c;
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
		.sim-card {
			flex-direction: column;
			text-align: center;
		}
	}

	@media (max-width: 600px) {
		.page {
			padding: 24px 14px 72px;
		}
	}
</style>
