import { sqliteTable, integer, text, unique } from 'drizzle-orm/sqlite-core';

/**
 * Die Datenbank-Tabellen für "Liniennetz".
 *
 * Jede Mitarbeiterin / jeder Mitarbeiter ist eine Haltestelle (users).
 * Jede geschenkte Verbindung ist eine Linie auf der Karte (connections).
 *
 * Nach jeder Änderung hier:  npm run db:push
 */

// Eine Person = eine Haltestelle auf der Karte
export const users = sqliteTable('users', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	slackId: text('slack_id').notNull().unique(),
	// Zu welchem Slack-Workspace (Team) gehört die Person? Trennt die Netze:
	// Nur Leute im selben Workspace teilen sich eine Karte. Demo-Login = 'demo'.
	workspaceId: text('workspace_id').notNull().default('demo'),
	name: text('name').notNull(),
	email: text('email'),
	avatarUrl: text('avatar_url'),
	// Selbst gewähltes Emoji als Avatar (statt Initialen). Leer = Initialen.
	avatar: text('avatar'),
	role: text('role'),
	department: text('department'),
	decoration: text('decoration'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Aktive Anmelde-Sitzungen (wer ist gerade eingeloggt)
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date()),
	expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});

// Eine Linie zwischen zwei Haltestellen (entsteht durch einen geschenkten Fahrschein)
export const connections = sqliteTable('connections', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fromUserId: integer('from_user_id')
		.notNull()
		.references(() => users.id),
	toUserId: integer('to_user_id')
		.notNull()
		.references(() => users.id),
	valueTag: text('value_tag'),
	message: text('message'),
	week: text('week'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Wöchentliches Fahrschein-Budget pro Person (knappe Währung)
export const ticketBudgets = sqliteTable(
	'ticket_budgets',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		week: text('week').notNull(),
		remaining: integer('remaining').notNull().default(5)
	},
	(t) => ({ userWeek: unique().on(t.userId, t.week) })
);

// Pool an Kennenlern-Fragen
export const questions = sqliteTable('questions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	text: text('text').notNull(),
	activeDate: text('active_date'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Eine Antwort pro Person pro Frage
export const answers = sqliteTable(
	'answers',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		questionId: integer('question_id')
			.notNull()
			.references(() => questions.id),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		answer: text('answer').notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => ({ questionUser: unique().on(t.questionId, t.userId) })
);

// Interessen-Tags pro Person (für Profil & Gemeinsamkeiten)
export const interests = sqliteTable('interests', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	tag: text('tag').notNull()
});

// Punkte-Log ("Fahrgäste"): jede Aktion bringt Punkte
export const points = sqliteTable('points', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id),
	amount: integer('amount').notNull(),
	reason: text('reason'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Gemeinsame Wochen-Missionen: erreicht das Team das Ziel,
// wird ein dauerhaftes Wahrzeichen in der Stadt freigeschaltet.
// Jeder Workspace hat seine eigenen Missionen & Wahrzeichen.
export const quests = sqliteTable('quests', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	workspaceId: text('workspace_id').notNull().default('demo'),
	title: text('title').notNull(),
	description: text('description'),
	targetCount: integer('target_count').notNull(),
	landmark: text('landmark').notNull(),
	completedAt: integer('completed_at', { mode: 'timestamp' }),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Applaus für eine Linie (höchstens einer pro Person pro Linie)
export const claps = sqliteTable(
	'claps',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		connectionId: integer('connection_id')
			.notNull()
			.references(() => connections.id),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => ({ userConn: unique().on(t.userId, t.connectionId) })
);

// Einstellbare Parameter der App (Schlüssel-Wert). Fehlt ein Schlüssel, gilt der Standardwert.
export const settings = sqliteTable('settings', {
	key: text('key').primaryKey(),
	value: text('value').notNull()
});

// "Zwei Wahrheiten, eine Lüge": drei Aussagen pro Person, eine davon erfunden
export const truths = sqliteTable('truths', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	userId: integer('user_id')
		.notNull()
		.references(() => users.id)
		.unique(),
	statement1: text('statement1').notNull(),
	statement2: text('statement2').notNull(),
	statement3: text('statement3').notNull(),
	lieIndex: integer('lie_index').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Wer hat bei wem geraten (höchstens einmal pro Paar)
export const guesses = sqliteTable(
	'guesses',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id),
		targetUserId: integer('target_user_id')
			.notNull()
			.references(() => users.id),
		guessedIndex: integer('guessed_index').notNull(),
		correct: integer('correct', { mode: 'boolean' }).notNull(),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.$defaultFn(() => new Date())
	},
	(t) => ({ guesserTarget: unique().on(t.userId, t.targetUserId) })
);
