<script>
	import { monogram, monogramColor } from '$lib/netz.js';
	import { page } from '$app/state';

	let { children, data } = $props();
</script>

{#if data.user}
	<header class="topbar">
		<a class="brand" href="/">
			<span class="logo" aria-hidden="true">◍</span>
			<span>Liniennetz</span>
		</a>

		<nav>
			<a href="/" class:active={page.url.pathname === '/'}>Stadt</a>
			<a
				href="/haltestelle/{data.user.id}"
				class:active={page.url.pathname.startsWith('/haltestelle')}>Meine Haltestelle</a
			>
			<a href="/rangliste" class:active={page.url.pathname === '/rangliste'}>Rangliste</a>
			<a href="/hilfe" class:active={page.url.pathname === '/hilfe'}>Hilfe</a>
			<a href="/config" class:active={page.url.pathname === '/config'}>Einstellungen</a>
		</nav>

		<div class="me">
			<a class="who" href="/haltestelle/{data.user.id}" title="Meine Haltestelle">
				<span class="avatar" style="background:{monogramColor(data.user.name)}"
					>{monogram(data.user.name)}</span
				>
				<span class="name">{data.user.name}</span>
			</a>
			<form method="POST" action="/auth/logout">
				<button class="logout" title="Abmelden / Konto wechseln" aria-label="Abmelden">↪</button>
			</form>
		</div>
	</header>
{/if}

<main>
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		background: #f4f1ea;
		color: #1a1a1a;
		font-family: 'IBM Plex Sans', sans-serif;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.topbar {
		display: flex;
		align-items: center;
		gap: 28px;
		padding: 16px 28px;
		background: #fffdf8cc;
		backdrop-filter: blur(8px);
		border-bottom: 1px solid #e3ddd0;
		position: sticky;
		top: 0;
		z-index: 50;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 9px;
		font-family: 'Fraunces', serif;
		font-weight: 900;
		font-size: 1.25rem;
		color: #1a1a1a;
		text-decoration: none;
		letter-spacing: -0.01em;
	}

	.brand .logo {
		color: #b5462f;
		font-size: 1.4rem;
	}

	nav {
		display: flex;
		gap: 6px;
		margin-right: auto;
	}

	nav a {
		text-decoration: none;
		color: #79736a;
		font-size: 0.92rem;
		font-weight: 500;
		padding: 7px 13px;
		border-radius: 8px;
	}

	nav a:hover {
		background: #f4ece2;
		color: #1a1a1a;
	}

	nav a.active {
		color: #b5462f;
		background: #f7e9e3;
	}

	.me {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.who {
		display: flex;
		align-items: center;
		gap: 9px;
		text-decoration: none;
		color: #1a1a1a;
		padding: 5px 10px 5px 5px;
		border-radius: 999px;
		border: 1px solid transparent;
	}

	.who:hover {
		border-color: #e3ddd0;
		background: #fffdf8;
	}

	.avatar {
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		font-size: 0.78rem;
		font-weight: 600;
		flex-shrink: 0;
	}

	.who .name {
		font-size: 0.9rem;
		font-weight: 500;
	}

	.logout {
		border: 1px solid #e3ddd0;
		background: #fffdf8;
		color: #79736a;
		width: 34px;
		height: 34px;
		border-radius: 9px;
		font-size: 1.1rem;
		cursor: pointer;
	}

	.logout:hover {
		color: #b5462f;
		border-color: #d8b8ad;
	}

	@media (max-width: 620px) {
		.topbar {
			gap: 14px;
			padding: 12px 16px;
		}
		.who .name {
			display: none;
		}
		nav a {
			padding: 7px 9px;
		}
	}
</style>
