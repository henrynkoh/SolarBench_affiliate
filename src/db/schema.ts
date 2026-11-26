import { relations } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const utilityRateProfiles = pgTable('utility_rate_profiles', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  locationQuery: text('location_query').notNull(),
  utilityContext: text('utility_context').notNull(),
  ratePerKwh: doublePrecision('rate_per_kwh').notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const solarQuoteSnapshots = pgTable('solar_quote_snapshots', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  quoteTitle: text('quote_title').notNull(),
  totalLandedCost: doublePrecision('total_landed_cost').notNull(),
  totalStorageWh: integer('total_storage_wh').notNull(),
  totalSolarWatts: integer('total_solar_watts').notNull(),
  utilityRateSnapshot: doublePrecision('utility_rate_snapshot').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const solarQuoteItems = pgTable('solar_quote_items', {
  id: serial('id').primaryKey(),
  quoteId: integer('quote_id')
    .notNull()
    .references(() => solarQuoteSnapshots.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  merchantId: text('merchant_id').notNull(),
  quantity: integer('quantity').notNull(),
  unitLandedPrice: doublePrecision('unit_landed_price').notNull(),
});

export const swarmRuns = pgTable('swarm_runs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  missionTitle: text('mission_title').notNull(),
  directive: text('directive').notNull(),
  chiefOfStaffSummary: text('chief_of_staff_summary').notNull(),
  consensusScore: integer('consensus_score').notNull(),
  approveVotes: integer('approve_votes').notNull(),
  cautionVotes: integer('caution_votes').notNull(),
  holdVotes: integer('hold_votes').notNull(),
  proposedActionType: text('proposed_action_type').notNull(),
  proposedActionLabel: text('proposed_action_label').notNull(),
  proposedPayloadJson: text('proposed_payload_json').notNull(),
  ceoDecision: text('ceo_decision').notNull(),
  executedSummary: text('executed_summary').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  decidedAt: timestamp('decided_at'),
});

export const agentPerformanceMetrics = pgTable('agent_performance_metrics', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid')
    .notNull()
    .references(() => users.uid, { onDelete: 'cascade' }),
  agentId: text('agent_id').notNull(),
  agentNumber: integer('agent_number').notNull(),
  tasksCompleted: integer('tasks_completed').default(0).notNull(),
  approvalsWon: integer('approvals_won').default(0).notNull(),
  avgLatencyMs: integer('avg_latency_ms').default(220).notNull(),
  accuracyScore: integer('accuracy_score').default(95).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  lastTaskSummary: text('last_task_summary').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  utilityRateProfiles: many(utilityRateProfiles),
  solarQuoteSnapshots: many(solarQuoteSnapshots),
  swarmRuns: many(swarmRuns),
  agentPerformanceMetrics: many(agentPerformanceMetrics),
}));

export const utilityRateProfilesRelations = relations(
  utilityRateProfiles,
  ({ one }) => ({
    owner: one(users, {
      fields: [utilityRateProfiles.userUid],
      references: [users.uid],
    }),
  })
);

export const solarQuoteSnapshotsRelations = relations(
  solarQuoteSnapshots,
  ({ one, many }) => ({
    owner: one(users, {
      fields: [solarQuoteSnapshots.userUid],
      references: [users.uid],
    }),
    items: many(solarQuoteItems),
  })
);

export const solarQuoteItemsRelations = relations(
  solarQuoteItems,
  ({ one }) => ({
    quote: one(solarQuoteSnapshots, {
      fields: [solarQuoteItems.quoteId],
      references: [solarQuoteSnapshots.id],
    }),
  })
);

export const swarmRunsRelations = relations(swarmRuns, ({ one }) => ({
  owner: one(users, {
    fields: [swarmRuns.userUid],
    references: [users.uid],
  }),
}));

export const agentPerformanceMetricsRelations = relations(
  agentPerformanceMetrics,
  ({ one }) => ({
    owner: one(users, {
      fields: [agentPerformanceMetrics.userUid],
      references: [users.uid],
    }),
  })
);

export const outboundClickEvents = pgTable('outbound_click_events', {
  id: serial('id').primaryKey(),
  eventType: text('event_type').notNull(),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  channel: text('channel').notNull(),
  merchantId: text('merchant_id').notNull(),
  landedPrice: doublePrecision('landed_price').default(0).notNull(),
  sourceSection: text('source_section').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const growthCampaignBriefs = pgTable('growth_campaign_briefs', {
  id: serial('id').primaryKey(),
  briefType: text('brief_type').notNull(),
  title: text('title').notNull(),
  targetSlug: text('target_slug').notNull(),
  seoHeadline: text('seo_headline').notNull(),
  seoMetaDescription: text('seo_meta_description').notNull(),
  youtubeShortCaption: text('youtube_short_caption').notNull(),
  redditReplyDraft: text('reddit_reply_draft').notNull(),
  kakaotalkSummary: text('kakaotalk_summary').notNull(),
  xThreadPost: text('x_thread_post').notNull(),
  status: text('status').default('approved').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

