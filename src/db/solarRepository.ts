import { and, asc, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from './index.ts';
import {
  agentPerformanceMetrics,
  growthCampaignBriefs,
  outboundClickEvents,
  solarQuoteItems,
  solarQuoteSnapshots,
  swarmRuns,
  utilityRateProfiles,
} from './schema.ts';
import { getOrCreateUser } from './users.ts';
import type {
  OutboundClickSummary,
  SwarmAgentId,
} from '../types/solar.ts';

export interface UtilityProfileInput {
  label: string;
  locationQuery: string;
  utilityContext: string;
  ratePerKwh: number;
  isDefault?: boolean;
}

export interface QuoteItemInput {
  productId: string;
  productName: string;
  merchantId: string;
  quantity: number;
  unitLandedPrice: number;
}

export interface SolarQuoteInput {
  quoteTitle: string;
  totalLandedCost: number;
  totalStorageWh: number;
  totalSolarWatts: number;
  utilityRateSnapshot: number;
  items: QuoteItemInput[];
}

export async function listUtilityRateProfiles(userUid: string) {
  try {
    return await db
      .select()
      .from(utilityRateProfiles)
      .where(eq(utilityRateProfiles.userUid, userUid))
      .orderBy(
        desc(utilityRateProfiles.isDefault),
        desc(utilityRateProfiles.updatedAt)
      );
  } catch (error) {
    console.error('Database query failed (listUtilityRateProfiles):', error);
    throw new Error('Failed to load saved utility rate profiles.', {
      cause: error,
    });
  }
}

export async function saveUtilityRateProfile(
  user: { uid: string; email: string; displayName?: string | null },
  input: UtilityProfileInput
) {
  try {
    await getOrCreateUser(user.uid, user.email, user.displayName);

    const safeRate = Math.min(1.5, Math.max(0.04, Number(input.ratePerKwh) || 0.17));
    const cleanLabel = input.label.trim().slice(0, 120) || 'Saved Utility Tariff';
    const cleanLocation = input.locationQuery.trim().slice(0, 120) || 'Custom';
    const cleanContext =
      input.utilityContext.trim().slice(0, 160) || 'Residential Tariff';

    return await db.transaction(async (tx) => {
      if (input.isDefault) {
        await tx
          .update(utilityRateProfiles)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(utilityRateProfiles.userUid, user.uid));
      }

      const [created] = await tx
        .insert(utilityRateProfiles)
        .values({
          userUid: user.uid,
          label: cleanLabel,
          locationQuery: cleanLocation,
          utilityContext: cleanContext,
          ratePerKwh: Number(safeRate.toFixed(3)),
          isDefault: Boolean(input.isDefault),
          updatedAt: new Date(),
        })
        .returning();

      return created;
    });
  } catch (error) {
    console.error('Database write failed (saveUtilityRateProfile):', error);
    throw new Error('Failed to save utility rate profile.', { cause: error });
  }
}

export async function deleteUtilityRateProfile(
  userUid: string,
  profileId: number
) {
  try {
    const deleted = await db
      .delete(utilityRateProfiles)
      .where(
        and(
          eq(utilityRateProfiles.id, profileId),
          eq(utilityRateProfiles.userUid, userUid)
        )
      )
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('Database delete failed (deleteUtilityRateProfile):', error);
    throw new Error('Failed to delete utility rate profile.', { cause: error });
  }
}

export async function listSolarQuoteSnapshots(userUid: string) {
  try {
    const quotes = await db
      .select()
      .from(solarQuoteSnapshots)
      .where(eq(solarQuoteSnapshots.userUid, userUid))
      .orderBy(desc(solarQuoteSnapshots.createdAt));

    if (quotes.length === 0) return [];

    const allItems = await db
      .select()
      .from(solarQuoteItems)
      .innerJoin(
        solarQuoteSnapshots,
        eq(solarQuoteItems.quoteId, solarQuoteSnapshots.id)
      )
      .where(eq(solarQuoteSnapshots.userUid, userUid));

    const itemsByQuote = new Map<number, (typeof solarQuoteItems.$inferSelect)[]>();
    for (const row of allItems) {
      const list = itemsByQuote.get(row.solar_quote_items.quoteId) ?? [];
      list.push(row.solar_quote_items);
      itemsByQuote.set(row.solar_quote_items.quoteId, list);
    }

    return quotes.map((q) => ({
      ...q,
      items: itemsByQuote.get(q.id) ?? [],
    }));
  } catch (error) {
    console.error('Database query failed (listSolarQuoteSnapshots):', error);
    throw new Error('Failed to load saved hardware quote snapshots.', {
      cause: error,
    });
  }
}

export async function createSolarQuoteSnapshot(
  user: { uid: string; email: string; displayName?: string | null },
  input: SolarQuoteInput
) {
  try {
    await getOrCreateUser(user.uid, user.email, user.displayName);

    const cleanTitle =
      input.quoteTitle.trim().slice(0, 120) || 'SolarBench Hardware Quote';
    const boundedItems = input.items.slice(0, 30);

    return await db.transaction(async (tx) => {
      const [quote] = await tx
        .insert(solarQuoteSnapshots)
        .values({
          userUid: user.uid,
          quoteTitle: cleanTitle,
          totalLandedCost: Math.max(0, Number(input.totalLandedCost) || 0),
          totalStorageWh: Math.max(0, Math.round(Number(input.totalStorageWh) || 0)),
          totalSolarWatts: Math.max(0, Math.round(Number(input.totalSolarWatts) || 0)),
          utilityRateSnapshot: Math.min(
            1.5,
            Math.max(0.04, Number(input.utilityRateSnapshot) || 0.17)
          ),
        })
        .returning();

      let insertedItems: (typeof solarQuoteItems.$inferSelect)[] = [];
      if (boundedItems.length > 0) {
        insertedItems = await tx
          .insert(solarQuoteItems)
          .values(
            boundedItems.map((item) => ({
              quoteId: quote.id,
              productId: item.productId.trim().slice(0, 80),
              productName: item.productName.trim().slice(0, 160),
              merchantId: item.merchantId.trim().slice(0, 80),
              quantity: Math.max(1, Math.min(999, Math.round(item.quantity) || 1)),
              unitLandedPrice: Math.max(0, Number(item.unitLandedPrice) || 0),
            }))
          )
          .returning();
      }

      return {
        ...quote,
        items: insertedItems,
      };
    });
  } catch (error) {
    console.error('Database write failed (createSolarQuoteSnapshot):', error);
    throw new Error('Failed to create hardware quote snapshot.', {
      cause: error,
    });
  }
}

export async function deleteSolarQuoteSnapshot(
  userUid: string,
  quoteId: number
) {
  try {
    const deleted = await db
      .delete(solarQuoteSnapshots)
      .where(
        and(
          eq(solarQuoteSnapshots.id, quoteId),
          eq(solarQuoteSnapshots.userUid, userUid)
        )
      )
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error('Database delete failed (deleteSolarQuoteSnapshot):', error);
    throw new Error('Failed to delete hardware quote snapshot.', {
      cause: error,
    });
  }
}

const DEFAULT_AGENT_SEED: {
  agentId: SwarmAgentId;
  agentNumber: number;
  avgLatencyMs: number;
  accuracyScore: number;
  lastTaskSummary: string;
}[] = [
  {
    agentId: 'chief-of-staff',
    agentNumber: 1,
    avgLatencyMs: 145,
    accuracyScore: 98,
    lastTaskSummary: 'Swarm Job Allocation, SLA Monitoring & CEO Dispatch',
  },
  {
    agentId: 'arbitrage-scout',
    agentNumber: 2,
    avgLatencyMs: 185,
    accuracyScore: 96,
    lastTaskSummary: 'Store Matrix (10+ Platforms Landed Math)',
  },
  {
    agentId: 'advisor-analyst',
    agentNumber: 3,
    avgLatencyMs: 190,
    accuracyScore: 95,
    lastTaskSummary: 'Top 3 Purpose Hub & Local AI LLM Filtering',
  },
  {
    agentId: 'teardown-auditor',
    agentNumber: 4,
    avgLatencyMs: 210,
    accuracyScore: 97,
    lastTaskSummary: 'Side-by-Side Spec Matrix & Energy Density Chart',
  },
  {
    agentId: 'thermal-safety',
    agentNumber: 5,
    avgLatencyMs: 165,
    accuracyScore: 99,
    lastTaskSummary: 'Thermal Derating & High-Humidity IP Guard',
  },
  {
    agentId: 'runtime-engineer',
    agentNumber: 6,
    avgLatencyMs: 205,
    accuracyScore: 96,
    lastTaskSummary: 'Battery Runtime Estimator & Appliance Load Sizing',
  },
  {
    agentId: 'roi-economist',
    agentNumber: 7,
    avgLatencyMs: 260,
    accuracyScore: 95,
    lastTaskSummary: 'Search-Grounded Tariff Lookup & 1/5/10-Yr ROI Chart',
  },
  {
    agentId: 'permit-guardian',
    agentNumber: 8,
    avgLatencyMs: 175,
    accuracyScore: 99,
    lastTaskSummary: 'UL 1973 / 9540 Permit & Authorized Dealer Guard',
  },
  {
    agentId: 'bom-allocator',
    agentNumber: 9,
    avgLatencyMs: 225,
    accuracyScore: 97,
    lastTaskSummary: 'System Builder Split-Cart & Locked Quotes',
  },
  {
    agentId: 'spotlight-producer',
    agentNumber: 10,
    avgLatencyMs: 240,
    accuracyScore: 94,
    lastTaskSummary: 'Daily #1 Spotlight Video, Price Alerts & Social Broadcasts',
  },
  {
    agentId: 'catalog-crawler',
    agentNumber: 11,
    avgLatencyMs: 230,
    accuracyScore: 96,
    lastTaskSummary: '30-SKU Price Freshness, Coupon Verification & 90d Low Audits',
  },
  {
    agentId: 'seo-publisher',
    agentNumber: 12,
    avgLatencyMs: 250,
    accuracyScore: 97,
    lastTaskSummary: 'Sitemap.xml, JSON-LD Product Schema & Comparison Landing Briefs',
  },
  {
    agentId: 'social-courier',
    agentNumber: 13,
    avgLatencyMs: 215,
    accuracyScore: 95,
    lastTaskSummary: 'YouTube Shorts, Reddit r/SolarDIY, X & KakaoTalk Briefs',
  },
  {
    agentId: 'policy-tracker',
    agentNumber: 14,
    avgLatencyMs: 195,
    accuracyScore: 96,
    lastTaskSummary: 'High-Rate State Audit Presets (CA, HI, MA, NY, TX)',
  },
  {
    agentId: 'partner-steward',
    agentNumber: 15,
    avgLatencyMs: 170,
    accuracyScore: 98,
    lastTaskSummary: 'Outbound Store Click Telemetry & Embeddable Price Badges',
  },
];

async function ensureDefaultAgentMetrics(userUid: string) {
  const existing = await db
    .select()
    .from(agentPerformanceMetrics)
    .where(eq(agentPerformanceMetrics.userUid, userUid))
    .orderBy(asc(agentPerformanceMetrics.agentNumber));

  if (existing.length >= 15) {
    return existing;
  }

  const existingIds = new Set(existing.map((r) => r.agentId));
  const missing = DEFAULT_AGENT_SEED.filter(
    (seed) => !existingIds.has(seed.agentId)
  );

  if (missing.length > 0) {
    await db.insert(agentPerformanceMetrics).values(
      missing.map((seed) => ({
        userUid,
        agentId: seed.agentId,
        agentNumber: seed.agentNumber,
        tasksCompleted: seed.agentNumber === 1 ? 18 : 8 + (seed.agentNumber % 5),
        approvalsWon: seed.agentNumber === 1 ? 17 : 7 + (seed.agentNumber % 4),
        avgLatencyMs: seed.avgLatencyMs,
        accuracyScore: seed.accuracyScore,
        isActive: true,
        lastTaskSummary: seed.lastTaskSummary,
        updatedAt: new Date(),
      }))
    );
  }

  return db
    .select()
    .from(agentPerformanceMetrics)
    .where(eq(agentPerformanceMetrics.userUid, userUid))
    .orderBy(asc(agentPerformanceMetrics.agentNumber));
}

export async function listSwarmState(userUid: string) {
  try {
    const metrics = await ensureDefaultAgentMetrics(userUid);
    const runs = await db
      .select()
      .from(swarmRuns)
      .where(eq(swarmRuns.userUid, userUid))
      .orderBy(desc(swarmRuns.createdAt))
      .limit(25);
    return { runs, metrics };
  } catch (error) {
    console.error('Database query failed (listSwarmState):', error);
    throw new Error('Failed to load AI Swarm history and metrics.', {
      cause: error,
    });
  }
}

export interface SwarmRunCreateInput {
  missionTitle: string;
  directive: string;
  chiefOfStaffSummary: string;
  consensusScore: number;
  approveVotes: number;
  cautionVotes: number;
  holdVotes: number;
  proposedActionType: string;
  proposedActionLabel: string;
  proposedPayloadJson: string;
  agentVotes: {
    agentId: string;
    decision: string;
    confidencePct: number;
    latencyMs: number;
    assignedJob: string;
  }[];
}

export async function recordSwarmRunAndUpdateMetrics(
  user: { uid: string; email: string; displayName?: string | null },
  input: SwarmRunCreateInput
) {
  try {
    await getOrCreateUser(user.uid, user.email, user.displayName);
    const currentMetrics = await ensureDefaultAgentMetrics(user.uid);
    const metricMap = new Map(currentMetrics.map((m) => [m.agentId, m]));

    return await db.transaction(async (tx) => {
      const [run] = await tx
        .insert(swarmRuns)
        .values({
          userUid: user.uid,
          missionTitle:
            input.missionTitle.trim().slice(0, 140) || 'Swarm Evaluation',
          directive: input.directive.trim().slice(0, 600),
          chiefOfStaffSummary: input.chiefOfStaffSummary.trim().slice(0, 600),
          consensusScore: Math.min(
            100,
            Math.max(0, Math.round(Number(input.consensusScore) || 0))
          ),
          approveVotes: Math.max(0, Math.round(Number(input.approveVotes) || 0)),
          cautionVotes: Math.max(0, Math.round(Number(input.cautionVotes) || 0)),
          holdVotes: Math.max(0, Math.round(Number(input.holdVotes) || 0)),
          proposedActionType: input.proposedActionType.trim().slice(0, 60),
          proposedActionLabel: input.proposedActionLabel.trim().slice(0, 160),
          proposedPayloadJson: input.proposedPayloadJson.slice(0, 4000),
          ceoDecision: 'pending',
          executedSummary: 'Pending Human CEO approval.',
        })
        .returning();

      for (const vote of input.agentVotes) {
        if (vote.decision === 'standby') continue;
        const existing = metricMap.get(vote.agentId);
        if (!existing) continue;
        const nextTasks = existing.tasksCompleted + 1;
        const clampedLatency = Math.min(
          1500,
          Math.max(60, Math.round(Number(vote.latencyMs) || existing.avgLatencyMs))
        );
        const nextLatency = Math.round(
          (existing.avgLatencyMs * existing.tasksCompleted + clampedLatency) /
            Math.max(1, nextTasks)
        );
        const voteConf = Math.min(
          99,
          Math.max(70, Math.round(Number(vote.confidencePct) || existing.accuracyScore))
        );
        const nextAccuracy = Math.min(
          99,
          Math.max(82, Math.round(existing.accuracyScore * 0.8 + voteConf * 0.2))
        );

        await tx
          .update(agentPerformanceMetrics)
          .set({
            tasksCompleted: nextTasks,
            avgLatencyMs: nextLatency,
            accuracyScore: nextAccuracy,
            lastTaskSummary:
              vote.assignedJob.trim().slice(0, 180) || existing.lastTaskSummary,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(agentPerformanceMetrics.userUid, user.uid),
              eq(agentPerformanceMetrics.agentId, vote.agentId)
            )
          );
      }

      const updatedMetrics = await tx
        .select()
        .from(agentPerformanceMetrics)
        .where(eq(agentPerformanceMetrics.userUid, user.uid))
        .orderBy(asc(agentPerformanceMetrics.agentNumber));

      return { run, metrics: updatedMetrics };
    });
  } catch (error) {
    console.error(
      'Database write failed (recordSwarmRunAndUpdateMetrics):',
      error
    );
    throw new Error('Failed to record AI Swarm deliberation.', {
      cause: error,
    });
  }
}

export async function updateSwarmRunDecision(
  userUid: string,
  runId: number,
  ceoDecision: 'approved' | 'rejected',
  executedSummary: string
) {
  try {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(swarmRuns)
        .where(and(eq(swarmRuns.id, runId), eq(swarmRuns.userUid, userUid)));

      if (!existing) return null;

      const [updatedRun] = await tx
        .update(swarmRuns)
        .set({
          ceoDecision,
          executedSummary:
            executedSummary.trim().slice(0, 300) ||
            (ceoDecision === 'approved'
              ? 'Approved and executed by CEO.'
              : 'Rejected by CEO.'),
          decidedAt: new Date(),
        })
        .where(and(eq(swarmRuns.id, runId), eq(swarmRuns.userUid, userUid)))
        .returning();

      if (ceoDecision === 'approved' && existing.ceoDecision !== 'approved') {
        await tx
          .update(agentPerformanceMetrics)
          .set({
            approvalsWon: sql`${agentPerformanceMetrics.approvalsWon} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(agentPerformanceMetrics.userUid, userUid),
              eq(agentPerformanceMetrics.isActive, true)
            )
          );
      }

      const metrics = await tx
        .select()
        .from(agentPerformanceMetrics)
        .where(eq(agentPerformanceMetrics.userUid, userUid))
        .orderBy(asc(agentPerformanceMetrics.agentNumber));

      return { run: updatedRun, metrics };
    });
  } catch (error) {
    console.error('Database write failed (updateSwarmRunDecision):', error);
    throw new Error('Failed to update CEO decision on Swarm run.', {
      cause: error,
    });
  }
}

export async function toggleAgentActiveState(
  userUid: string,
  agentId: string,
  isActive: boolean
) {
  try {
    await ensureDefaultAgentMetrics(userUid);
    const updated = await db
      .update(agentPerformanceMetrics)
      .set({ isActive, updatedAt: new Date() })
      .where(
        and(
          eq(agentPerformanceMetrics.userUid, userUid),
          eq(agentPerformanceMetrics.agentId, agentId)
        )
      )
      .returning();
    return updated[0] ?? null;
  } catch (error) {
    console.error('Database write failed (toggleAgentActiveState):', error);
    throw new Error('Failed to toggle AI agent status.', { cause: error });
  }
}

export async function recordOutboundClick(input: {
  eventType: string;
  productId: string;
  productName: string;
  channel: string;
  merchantId: string;
  landedPrice: number;
  sourceSection: string;
}) {
  try {
    const [created] = await db
      .insert(outboundClickEvents)
      .values({
        eventType: input.eventType.trim().slice(0, 50) || 'merchant_click',
        productId: input.productId.trim().slice(0, 80) || 'catalog',
        productName: input.productName.trim().slice(0, 160) || 'Solar Hardware',
        channel: input.channel.trim().slice(0, 60) || 'Direct',
        merchantId: input.merchantId.trim().slice(0, 60) || 'direct',
        landedPrice: Math.max(0, Number(input.landedPrice) || 0),
        sourceSection: input.sourceSection.trim().slice(0, 60) || 'catalog',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database write failed (recordOutboundClick):', error);
    throw new Error('Failed to record outbound telemetry event.', {
      cause: error,
    });
  }
}

export async function getOutboundClickSummary(): Promise<OutboundClickSummary> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outboundClickEvents);
    const [weekRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(outboundClickEvents)
      .where(gte(outboundClickEvents.createdAt, sevenDaysAgo));

    const byChannel = await db
      .select({
        channel: outboundClickEvents.channel,
        clicks: sql<number>`count(*)::int`,
      })
      .from(outboundClickEvents)
      .groupBy(outboundClickEvents.channel)
      .orderBy(desc(sql`count(*)`))
      .limit(8);

    const topProducts = await db
      .select({
        productId: outboundClickEvents.productId,
        productName: outboundClickEvents.productName,
        clicks: sql<number>`count(*)::int`,
      })
      .from(outboundClickEvents)
      .groupBy(outboundClickEvents.productId, outboundClickEvents.productName)
      .orderBy(desc(sql`count(*)`))
      .limit(6);

    const recentRows = await db
      .select()
      .from(outboundClickEvents)
      .orderBy(desc(outboundClickEvents.createdAt))
      .limit(12);

    return {
      totalClicks: totalRow?.count ?? 0,
      clicksLast7d: weekRow?.count ?? 0,
      byChannel,
      topProducts,
      recentEvents: recentRows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        productId: r.productId,
        productName: r.productName,
        channel: r.channel,
        merchantId: r.merchantId,
        landedPrice: r.landedPrice,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Database query failed (getOutboundClickSummary):', error);
    throw new Error('Failed to load outbound click summary.', {
      cause: error,
    });
  }
}

export async function saveGrowthCampaignBrief(input: {
  briefType: string;
  title: string;
  targetSlug: string;
  seoHeadline: string;
  seoMetaDescription: string;
  youtubeShortCaption: string;
  redditReplyDraft: string;
  kakaotalkSummary: string;
  xThreadPost: string;
}) {
  try {
    const [created] = await db
      .insert(growthCampaignBriefs)
      .values({
        briefType: input.briefType.trim().slice(0, 60) || 'seo-comparison',
        title: input.title.trim().slice(0, 160) || 'SolarBench Growth Brief',
        targetSlug: input.targetSlug.trim().slice(0, 160) || '/',
        seoHeadline: input.seoHeadline.trim().slice(0, 180),
        seoMetaDescription: input.seoMetaDescription.trim().slice(0, 260),
        youtubeShortCaption: input.youtubeShortCaption.trim().slice(0, 1200),
        redditReplyDraft: input.redditReplyDraft.trim().slice(0, 2000),
        kakaotalkSummary: input.kakaotalkSummary.trim().slice(0, 1200),
        xThreadPost: input.xThreadPost.trim().slice(0, 1000),
        status: 'approved',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database write failed (saveGrowthCampaignBrief):', error);
    throw new Error('Failed to store growth campaign brief.', { cause: error });
  }
}

export async function listGrowthCampaignBriefs() {
  try {
    const rows = await db
      .select()
      .from(growthCampaignBriefs)
      .orderBy(desc(growthCampaignBriefs.createdAt))
      .limit(12);
    return rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Database query failed (listGrowthCampaignBriefs):', error);
    throw new Error('Failed to load saved growth campaign briefs.', {
      cause: error,
    });
  }
}


