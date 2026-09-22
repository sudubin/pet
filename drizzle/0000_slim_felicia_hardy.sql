CREATE TABLE `app_states` (
	`user_key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `reward_ledger` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`source_key` text NOT NULL,
	`amount` integer NOT NULL,
	`created_at` text NOT NULL
);
