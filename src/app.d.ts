// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: number;
				slackId: string;
				name: string;
				email: string | null;
				avatarUrl: string | null;
				role: string | null;
				department: string | null;
				decoration: string | null;
			} | null;
		}
		// interface PageData {}
		// interface Platform {}
	}
}

export {};
