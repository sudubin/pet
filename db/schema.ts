import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const appStates = sqliteTable("app_states", {
  userKey: text("user_key").primaryKey(),
  payload: text("payload").notNull(),
  revision: integer("revision").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
});

export const rewardLedger = sqliteTable("reward_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userKey: text("user_key").notNull(),
  sourceKey: text("source_key").notNull(),
  amount: integer("amount").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_reward_ledger_user_source").on(table.userKey, table.sourceKey),
  index("idx_reward_ledger_user_created").on(table.userKey, table.createdAt),
]);

export const quizAnswers = sqliteTable("quiz_answers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userKey: text("user_key").notNull(),
  questionId: text("question_id").notNull(),
  choice: integer("choice").notNull(),
  correct: integer("correct", { mode: "boolean" }).notNull(),
  answeredAt: text("answered_at").notNull(),
}, (table) => [
  uniqueIndex("idx_quiz_answers_user_question").on(table.userKey, table.questionId),
  index("idx_quiz_answers_user_date").on(table.userKey, table.answeredAt),
]);

export const userFurniture = sqliteTable("user_furniture", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userKey: text("user_key").notNull(),
  itemId: text("item_id").notNull(),
  acquiredAt: text("acquired_at").notNull(),
}, (table) => [uniqueIndex("idx_user_furniture_user_item").on(table.userKey, table.itemId)]);

export const homePlacements = sqliteTable("home_placements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userKey: text("user_key").notNull(),
  itemId: text("item_id").notNull(),
  slot: integer("slot").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_home_placements_user_item").on(table.userKey, table.itemId),
  uniqueIndex("idx_home_placements_user_slot").on(table.userKey, table.slot),
]);

export const communityPosts = sqliteTable("community_posts", {
  id: text("id").primaryKey(),
  userKey: text("user_key").notNull(),
  authorName: text("author_name").notNull(),
  category: text("category").notNull(),
  petId: text("pet_id"),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("pending"),
  professional: integer("professional", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
}, (table) => [
  index("idx_community_posts_status_created").on(table.status, table.createdAt),
  index("idx_community_posts_pet_status").on(table.petId, table.status),
  index("idx_community_posts_user_created").on(table.userKey, table.createdAt),
]);

export const postReports = sqliteTable("post_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: text("post_id").notNull(),
  userKey: text("user_key").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_post_reports_post_user").on(table.postId, table.userKey)]);

export const vetApplications = sqliteTable("vet_applications", {
  userKey: text("user_key").primaryKey(),
  realName: text("real_name").notNull(),
  licenseNo: text("license_no").notNull(),
  clinic: text("clinic"),
  statement: text("statement").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
  reviewedAt: text("reviewed_at"),
});
