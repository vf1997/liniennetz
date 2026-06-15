<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	let saved = $state(false);
	// gewählter Anmelde-Modus (steuert, ob die Slack-Felder sichtbar sind)
	let loginMode = $state(data.login.mode);

	const enhanceSave = () => async ({ result, update }) => {
		await update();
		if (result.type === 'success' && result.data?.saved) {
			saved = true;
			setTimeout(() => (saved = false), 2500);
		}
	};
</script>

<svelte:head>
	<title>Liniennetz · Einstellungen</title>
</svelte:head>

<div class="page">
	<header class="head">
		<div>
			<div class="kicker">Einstellungen</div>
			<h1>Spielregeln festlegen</h1>
			<p class="lead">
				Hier stellst du alle Parameter des Spiels ein. Änderungen wirken sofort – nur
				Fahrschein-Budgets gelten ab der jeweils nächsten Woche.
			</p>
		</div>
		<span class="admin-hint" title="Später nur für Admins">🔓 derzeit für alle offen</span>
	</header>

	{#if saved}
		<div class="toast">✓ Gespeichert</div>
	{/if}

	<!-- Anmelde-Modus: Demo ↔ Slack -->
	<section class="group login-group">
		<h2>🔑 Anmeldung</h2>
		<p class="login-desc">
			Wähle, wie sich Leute anmelden. Im <strong>Demo-Modus</strong> klickt man einfach eine
			Person an – ideal zum Ausprobieren. Im <strong>Slack-Modus</strong> meldet sich jede:r mit
			dem echten Slack-Konto an.
		</p>

		<form method="POST" action="?/anmeldung" use:enhance={enhanceSave}>
			<div class="switch" role="radiogroup" aria-label="Anmelde-Modus">
				<label class="switch-opt" class:active={loginMode === 'demo'}>
					<input type="radio" name="loginMode" value="demo" bind:group={loginMode} />
					<span class="switch-ic">🧪</span>
					<span class="switch-lab">Demo-Modus</span>
					<span class="switch-sub">Person per Klick wählen</span>
				</label>
				<label class="switch-opt" class:active={loginMode === 'slack'}>
					<input type="radio" name="loginMode" value="slack" bind:group={loginMode} />
					<span class="switch-ic">#️⃣</span>
					<span class="switch-lab">Slack-Login</span>
					<span class="switch-sub">Echte Anmeldung mit Slack</span>
				</label>
			</div>

			{#if loginMode === 'slack'}
				<div class="slack-fields">
					{#if !data.login.hasCreds}
						<p class="slack-warn">
							⚠️ Damit Slack-Login funktioniert, brauchst du eine Slack-App mit Client ID und
							Secret. Solange diese fehlen, läuft die Anmeldung weiter im Demo-Modus.
						</p>
					{/if}
					<label class="field">
						<span class="field-label">Slack Client ID</span>
						<input
							type="text"
							name="slackClientId"
							value={data.login.clientId}
							placeholder="z. B. 1234567890.0987654321"
							autocomplete="off"
						/>
					</label>
					<label class="field">
						<span class="field-label">Slack Client Secret</span>
						<input
							type="password"
							name="slackClientSecret"
							value={data.login.clientSecret}
							placeholder="geheim – aus „Basic Information“"
							autocomplete="off"
						/>
					</label>
					<label class="field">
						<span class="field-label">Redirect URL</span>
						<input
							type="text"
							name="slackRedirectUri"
							value={data.login.redirectUri}
							placeholder={data.login.suggestedRedirect}
							autocomplete="off"
						/>
						<span class="field-help">
							Trag genau diese URL auch in deiner Slack-App unter „OAuth & Permissions“ ein. Leer
							lassen = automatisch <code>{data.login.suggestedRedirect}</code>.
						</span>
					</label>
				</div>
			{:else}
				<input type="hidden" name="slackClientId" value={data.login.clientId} />
				<input type="hidden" name="slackClientSecret" value={data.login.clientSecret} />
				<input type="hidden" name="slackRedirectUri" value={data.login.redirectUri} />
			{/if}

			<div class="login-status">
				{#if data.login.active}
					<span class="badge-on">● Slack-Login ist aktiv</span>
				{:else}
					<span class="badge-demo">● Demo-Modus ist aktiv</span>
				{/if}
			</div>

			<button type="submit" class="primary">Anmelde-Modus speichern</button>
		</form>
	</section>

	<form method="POST" action="?/speichern" use:enhance={enhanceSave}>
		{#each data.groups as group (group.name)}
			<section class="group">
				<h2>{group.name}</h2>
				<div class="fields">
					{#each group.fields as f (f.key)}
						<label class="field">
							<span class="field-label">{f.label}</span>
							{#if f.type === 'list'}
								<input type="text" name={f.key} value={data.values[f.key]} autocomplete="off" />
							{:else}
								<input
									type="number"
									name={f.key}
									value={data.values[f.key]}
									min={f.min}
									max={f.max}
									step="1"
								/>
							{/if}
							{#if f.help}<span class="field-help">{f.help}</span>{/if}
						</label>
					{/each}
				</div>
			</section>
		{/each}

		<div class="actions">
			<button type="submit" class="primary">Speichern</button>
		</div>
	</form>

	<!-- Demo-Zeitmaschine -->
	<section class="group demo-group">
		<h2>🕰️ Demo-Zeitmaschine</h2>
		<p class="demo-desc">
			Verschiebt das interne Datum der App, damit du testen kannst, wie sich Wochen-Budgets,
			Streaks und die Kür der Woche über die Zeit verändern. Die echte Uhr bleibt unberührt.
		</p>
		<div class="demo-status">
			{#if data.demoOffsetDays === 0}
				<span class="demo-now">Heute · kein Versatz aktiv</span>
			{:else}
				<span class="demo-offset">
					Versatz: <strong>{data.demoOffsetDays > 0 ? '+' : ''}{data.demoOffsetDays}
						{Math.abs(data.demoOffsetDays) === 1 ? 'Tag' : 'Tage'}</strong>
				</span>
			{/if}
		</div>
		<div class="demo-btns">
			<form method="POST" action="?/demo" use:enhance={enhanceSave}>
				<input type="hidden" name="delta" value="-7" />
				<button type="submit" class="demo-btn">− 7 Tage</button>
			</form>
			<form method="POST" action="?/demo" use:enhance={enhanceSave}>
				<input type="hidden" name="delta" value="-1" />
				<button type="submit" class="demo-btn">− 1 Tag</button>
			</form>
			<form method="POST" action="?/demo" use:enhance={enhanceSave}>
				<input type="hidden" name="delta" value="1" />
				<button type="submit" class="demo-btn">+ 1 Tag</button>
			</form>
			<form method="POST" action="?/demo" use:enhance={enhanceSave}>
				<input type="hidden" name="delta" value="7" />
				<button type="submit" class="demo-btn">+ 7 Tage</button>
			</form>
			<form method="POST" action="?/demo" use:enhance={enhanceSave}>
				<input type="hidden" name="delta" value={-data.demoOffsetDays} />
				<button type="submit" class="demo-btn reset-demo" disabled={data.demoOffsetDays === 0}>
					Zurück zu Heute
				</button>
			</form>
		</div>
	</section>

	<form method="POST" action="?/zuruecksetzen" use:enhance class="reset-form">
		<button type="submit" class="reset"
			onclick={(e) => {
				if (!confirm('Alle Einstellungen auf die Standardwerte zurücksetzen?')) e.preventDefault();
			}}>Auf Standard zurücksetzen</button
		>
	</form>
</div>

<style>
	.page {
		max-width: 720px;
		margin: 0 auto;
		padding: 36px 24px 90px;
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
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
		font-size: clamp(2rem, 5vw, 2.6rem);
		margin: 0 0 12px;
		letter-spacing: -0.02em;
	}

	.lead {
		color: #3a3a37;
		line-height: 1.55;
		margin: 0;
		max-width: 56ch;
	}

	.admin-hint {
		flex-shrink: 0;
		font-size: 0.78rem;
		color: #79736a;
		background: #f4ece2;
		padding: 6px 12px;
		border-radius: 999px;
		white-space: nowrap;
	}

	.toast {
		position: sticky;
		top: 80px;
		z-index: 20;
		background: #1a1a1a;
		color: #f4f1ea;
		padding: 10px 16px;
		border-radius: 10px;
		font-weight: 600;
		margin-bottom: 18px;
		width: fit-content;
		box-shadow: 0 14px 30px -16px rgba(0, 0, 0, 0.5);
	}

	.group {
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
		font-size: 1.2rem;
		margin: 0 0 16px;
	}

	.fields {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}

	.field-label {
		font-weight: 600;
		font-size: 0.95rem;
		color: #1a1a1a;
	}

	.field input {
		padding: 10px 12px;
		border: 1px solid #d8d0c0;
		border-radius: 9px;
		font-size: 0.95rem;
		font-family: inherit;
		background: #fff;
		color: #1a1a1a;
		max-width: 320px;
	}

	.field input[type='number'] {
		max-width: 140px;
	}

	.field input:focus {
		outline: none;
		border-color: #b5462f;
		box-shadow: 0 0 0 3px rgba(181, 70, 47, 0.12);
	}

	.field-help {
		font-size: 0.82rem;
		color: #79736a;
		line-height: 1.4;
		max-width: 60ch;
	}

	.actions {
		position: sticky;
		bottom: 0;
		padding: 16px 0;
		background: linear-gradient(to top, #f4f1ea 60%, transparent);
	}

	.primary {
		background: #b5462f;
		color: #fff;
		border: none;
		padding: 13px 28px;
		border-radius: 10px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		font-family: inherit;
	}

	.primary:hover {
		background: #9c3a26;
	}

	.reset-form {
		margin-top: 8px;
	}

	.reset {
		background: transparent;
		border: 1px solid #e3ddd0;
		color: #79736a;
		padding: 9px 16px;
		border-radius: 9px;
		font-size: 0.88rem;
		cursor: pointer;
		font-family: inherit;
	}

	.reset:hover {
		border-color: #d8b8ad;
		color: #b5462f;
	}

	/* Demo-Zeitmaschine */
	.demo-group {
		border-style: dashed;
		border-color: #c8b8a0;
	}

	.demo-desc {
		font-size: 0.88rem;
		color: #79736a;
		margin: 0 0 14px;
		line-height: 1.45;
	}

	.demo-status {
		margin-bottom: 14px;
	}

	.demo-now {
		font-size: 0.88rem;
		color: #79736a;
	}

	.demo-offset {
		font-size: 0.92rem;
		color: #b5462f;
	}

	.demo-btns {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.demo-btns form {
		display: contents;
	}

	.demo-btn {
		background: #fff;
		border: 1px solid #d8d0c0;
		color: #1a1a1a;
		padding: 9px 16px;
		border-radius: 9px;
		font-family: inherit;
		font-size: 0.9rem;
		cursor: pointer;
		font-weight: 500;
		transition: border-color 0.12s, background 0.12s;
	}

	.demo-btn:hover:not(:disabled) {
		border-color: #b5462f;
		background: #fdf0ee;
	}

	.demo-btn.reset-demo {
		border-color: #b5462f;
		color: #b5462f;
	}

	.demo-btn.reset-demo:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Anmelde-Modus */
	.login-group {
		border-color: #d8b8ad;
	}

	.login-desc {
		font-size: 0.9rem;
		color: #4a443c;
		line-height: 1.5;
		margin: 0 0 18px;
	}

	.switch {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 10px;
		margin-bottom: 16px;
	}

	.switch-opt {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 3px;
		padding: 16px 12px;
		background: #fff;
		border: 2px solid #e8e1d4;
		border-radius: 12px;
		cursor: pointer;
		transition: border-color 0.12s, background 0.12s, transform 0.12s;
	}

	.switch-opt:hover {
		border-color: #d8b8ad;
		transform: translateY(-2px);
	}

	.switch-opt.active {
		border-color: #b5462f;
		background: #f7e0d9;
	}

	.switch-opt input[type='radio'] {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}

	.switch-ic {
		font-size: 1.7rem;
	}

	.switch-lab {
		font-weight: 600;
		font-size: 1rem;
		color: #1a1a1a;
	}

	.switch-sub {
		font-size: 0.8rem;
		color: #79736a;
	}

	.slack-fields {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin-bottom: 16px;
		padding: 16px;
		background: #faf6ef;
		border: 1px solid #ece3d3;
		border-radius: 12px;
	}

	.slack-warn {
		background: #fdf6e3;
		border: 1px solid #ecd9a8;
		color: #6b5526;
		padding: 11px 13px;
		border-radius: 9px;
		font-size: 0.85rem;
		line-height: 1.5;
		margin: 0;
	}

	.slack-fields .field input {
		max-width: none;
	}

	.field-help code {
		background: #efe7d8;
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 0.82em;
	}

	.login-status {
		margin-bottom: 16px;
	}

	.badge-on {
		font-size: 0.9rem;
		font-weight: 600;
		color: #2e7d4f;
	}

	.badge-demo {
		font-size: 0.9rem;
		font-weight: 600;
		color: #b5462f;
	}
</style>
