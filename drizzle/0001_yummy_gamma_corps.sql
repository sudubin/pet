CREATE TABLE `community_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_key` text NOT NULL,
	`author_name` text NOT NULL,
	`category` text NOT NULL,
	`pet_id` text,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`professional` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_community_posts_status_created` ON `community_posts` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_community_posts_pet_status` ON `community_posts` (`pet_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_community_posts_user_created` ON `community_posts` (`user_key`,`created_at`);--> statement-breakpoint
CREATE TABLE `home_placements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`item_id` text NOT NULL,
	`slot` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_home_placements_user_item` ON `home_placements` (`user_key`,`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_home_placements_user_slot` ON `home_placements` (`user_key`,`slot`);--> statement-breakpoint
CREATE TABLE `post_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` text NOT NULL,
	`user_key` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_post_reports_post_user` ON `post_reports` (`post_id`,`user_key`);--> statement-breakpoint
CREATE TABLE `quiz_answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`question_id` text NOT NULL,
	`choice` integer NOT NULL,
	`correct` integer NOT NULL,
	`answered_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_quiz_answers_user_question` ON `quiz_answers` (`user_key`,`question_id`);--> statement-breakpoint
CREATE INDEX `idx_quiz_answers_user_date` ON `quiz_answers` (`user_key`,`answered_at`);--> statement-breakpoint
CREATE TABLE `user_furniture` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_key` text NOT NULL,
	`item_id` text NOT NULL,
	`acquired_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_user_furniture_user_item` ON `user_furniture` (`user_key`,`item_id`);--> statement-breakpoint
CREATE TABLE `vet_applications` (
	`user_key` text PRIMARY KEY NOT NULL,
	`real_name` text NOT NULL,
	`license_no` text NOT NULL,
	`clinic` text,
	`statement` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`reviewed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reward_ledger_user_source` ON `reward_ledger` (`user_key`,`source_key`);--> statement-breakpoint
CREATE INDEX `idx_reward_ledger_user_created` ON `reward_ledger` (`user_key`,`created_at`);