<script>
	import { enhance } from '$app/forms';
	import { monogram, monogramColor } from '$lib/netz.js';

	let { data, form } = $props();
	let creating = $state(false);
</script>

<svelte:head>
	<title>Liniennetz · Anmelden</title>
</svelte:head>

<div class="login">
	<div class="hero">
		<div class="kicker">Stadt.Land.Netz</div>
		<h1><span class="logo">◍</span> Liniennetz</h1>
		<p class="lead">
			Aus dem Team wird ein lebendiges Verkehrsnetz. Jeder Fahrschein baut eine Linie –
			gemeinsam wächst die Stadt.
		</p>
	</div>

	<div class="card">
		{#if data.slackEnabled}
			<h2>Anmelden</h2>
			<p class="hint">Melde dich mit deinem Slack-Konto an, um deine Haltestelle zu betreten.</p>
			<a class="slack-btn" href="/auth/slack">
				<span class="slack-mark" aria-hidden="true">#</span> Mit Slack anmelden
			</a>
		{:else}
			<h2>Wer bist du?</h2>
			{#if data.slackMisconfigured}
				<p class="notice">
					ℹ️ Der Slack-Modus ist gewählt, aber es fehlen noch Client ID und Secret. Solange
					läuft die Anmeldung im Demo-Modus. Die Zugangsdaten trägst du unter
					<a href="/config">Einstellungen → Anmeldung</a> ein.
				</p>
			{/if}
			<p class="hint">
				Demo-Modus: Wähle eine Person aus, um als sie die Stadt zu erkunden. Du kannst
				jederzeit oben rechts wechseln.
			</p>

			{#if form?.error}
				<p class="error">{form.error}</p>
			{/if}

			<div class="people">
				{#each data.users as person (person.id)}
					<form method="POST" action="?/loginAs" use:enhance>
						<input type="hidden" name="userId" value={person.id} />
						<button class="person" type="submit">
							<span class="avatar" style="background:{monogramColor(person.name)}"
								>{monogram(person.name)}</span
							>
							<span class="who">
								<span class="name">{person.name}</span>
								<span class="role">{person.role ?? person.department ?? ''}</span>
							</span>
						</button>
					</form>
				{/each}
			</div>

			{#if creating}
				<form method="POST" action="?/createAndLogin" use:enhance class="create">
					<input name="name" placeholder="Dein Name" autocomplete="off" required />
					<button type="submit" class="primary">Loslegen</button>
				</form>
			{:else}
				<button class="add" onclick={() => (creating = true)}>+ Neue Person anlegen</button>
			{/if}
		{/if}
	</div>
</div>

<style>
	.login {
		min-height: 100vh;
		display: grid;
		place-items: center;
		gap: 32px;
		grid-template-columns: 1fr;
		max-width: 460px;
		margin: 0 auto;
		padding: 48px 24px 80px;
		text-align: center;
	}

	.kicker {
		font-size: 0.78rem;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: #b5462f;
		font-weight: 600;
		margin-bottom: 14px;
	}

	h1 {
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: clamp(2.6rem, 9vw, 3.6rem);
		margin: 0 0 18px;
		letter-spacing: -0.02em;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
	}

	h1 .logo {
		color: #b5462f;
	}

	.lead {
		font-size: 1.05rem;
		line-height: 1.6;
		color: #3a3a37;
		margin: 0;
	}

	.card {
		width: 100%;
		background: #fffdf8;
		border: 1px solid #e3ddd0;
		border-radius: 16px;
		padding: 28px;
		box-shadow: 0 18px 40px -28px rgba(60, 40, 20, 0.5);
		text-align: left;
	}

	h2 {
		font-family: 'Fraunces', serif;
		font-weight: 600;
		font-size: 1.4rem;
		margin: 0 0 6px;
	}

	.hint {
		color: #79736a;
		font-size: 0.92rem;
		line-height: 1.5;
		margin: 0 0 20px;
	}

	.error {
		background: #f7e0da;
		color: #9c3a26;
		padding: 10px 13px;
		border-radius: 9px;
		font-size: 0.9rem;
		margin: 0 0 16px;
	}

	.notice {
		background: #fdf6e3;
		border: 1px solid #ecd9a8;
		color: #6b5526;
		padding: 11px 13px;
		border-radius: 9px;
		font-size: 0.86rem;
		line-height: 1.5;
		margin: 0 0 16px;
	}

	.notice a {
		color: #b5462f;
		font-weight: 600;
	}

	.people {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.people form {
		display: contents;
	}

	.person {
		display: flex;
		align-items: center;
		gap: 13px;
		width: 100%;
		text-align: left;
		background: #fff;
		border: 1px solid #e8e1d4;
		border-radius: 11px;
		padding: 11px 13px;
		cursor: pointer;
		font-family: inherit;
		transition: border-color 0.12s, transform 0.12s;
	}

	.person:hover {
		border-color: #d8b8ad;
		transform: translateX(2px);
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-weight: 600;
		font-size: 0.92rem;
		flex-shrink: 0;
	}

	.who {
		display: flex;
		flex-direction: column;
	}

	.name {
		font-weight: 600;
		font-size: 0.98rem;
	}

	.role {
		font-size: 0.82rem;
		color: #79736a;
	}

	.add {
		margin-top: 16px;
		width: 100%;
		background: transparent;
		border: 1px dashed #cabfad;
		color: #79736a;
		padding: 11px;
		border-radius: 11px;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.92rem;
	}

	.add:hover {
		color: #b5462f;
		border-color: #d8b8ad;
	}

	.create {
		margin-top: 16px;
		display: flex;
		gap: 8px;
	}

	.create input {
		flex: 1;
		padding: 11px 13px;
		border: 1px solid #d8d0c0;
		border-radius: 9px;
		font-size: 0.95rem;
		font-family: inherit;
		background: #fff;
	}

	.create input:focus {
		outline: none;
		border-color: #b5462f;
		box-shadow: 0 0 0 3px rgba(181, 70, 47, 0.12);
	}

	.primary,
	.slack-btn {
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

	.primary:hover,
	.slack-btn:hover {
		background: #9c3a26;
	}

	.slack-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		text-decoration: none;
	}

	.slack-mark {
		font-weight: 900;
		font-size: 1.2rem;
	}
</style>
