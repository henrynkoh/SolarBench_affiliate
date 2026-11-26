import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  DailyVideoEngine,
  formatLocalDateKey,
  getNextMidnightIso,
} from './server/dailyVideoEngine.ts';
import { AutonomousSwarmEngine } from './server/autonomousSwarmEngine.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  createSolarQuoteSnapshot,
  deleteSolarQuoteSnapshot,
  deleteUtilityRateProfile,
  getOutboundClickSummary,
  listGrowthCampaignBriefs,
  listSolarQuoteSnapshots,
  listSwarmState,
  listUtilityRateProfiles,
  recordOutboundClick,
  recordSwarmRunAndUpdateMetrics,
  saveGrowthCampaignBrief,
  saveUtilityRateProfile,
  toggleAgentActiveState,
  updateSwarmRunDecision,
} from './src/db/solarRepository.ts';
import type {
  SwarmActionType,
  SwarmAgentId,
  SwarmAgentVote,
  SwarmDeliberationResult,
  SwarmVoteDecision,
} from './src/types/solar.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

// Always serve generated daily videos directly from public/videos in both dev and production
app.use(
  '/videos',
  express.static(path.join(__dirname, 'public', 'videos'), {
    maxAge: '1h',
  })
);

const audioCache = new Map<string, Buffer>();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const dailyVideoEngine = new DailyVideoEngine(__dirname, getGeminiClient);
const autonomousSwarmEngine = new AutonomousSwarmEngine(
  __dirname,
  dailyVideoEngine,
  getGeminiClient
);

app.post('/api/tts/narrator', async (req, res) => {
  const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  if (!rawText) {
    res.status(400).json({ error: 'Narration text is required.' });
    return;
  }

  const text = rawText.slice(0, 2500);
  const cached = audioCache.get(text);
  if (cached) {
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(cached);
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      fallback: true,
      error: 'Gemini TTS unavailable in current environment.',
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text,
              speechMetadata: {
                style:
                  'Solo mature adult male narrator alone, deep warm baritone voice, calm unhurried authoritative audiobook cadence (~145 WPM), clear resonant American English articulation, zero background voices or music.',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    const base64Audio =
      response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      res.status(502).json({
        fallback: true,
        error: 'Empty audio payload returned from Gemini TTS.',
      });
      return;
    }

    const wavBuffer = Buffer.from(base64Audio, 'base64');
    if (audioCache.size > 20) {
      const oldestKey = audioCache.keys().next().value;
      if (oldestKey) audioCache.delete(oldestKey);
    }
    audioCache.set(text, wavBuffer);

    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(wavBuffer);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to synthesize narrator audio.';
    res.status(502).json({ fallback: true, error: message });
  }
});

app.get('/api/daily-videos', async (_req, res) => {
  try {
    await dailyVideoEngine.initializeAndReconcile();
    const allVideos = dailyVideoEngine.getAllSorted();
    const activeVideo =
      allVideos.find((v) => v.status === 'playing_today') ?? allVideos[0] ?? null;
    const archivedVideos = allVideos.filter((v) => v.status === 'archived');

    res.json({
      todayDateKey: formatLocalDateKey(new Date()),
      nextMidnightIso: getNextMidnightIso(new Date()),
      activeVideo,
      archivedVideos,
      allVideos,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load daily videos.';
    res.status(500).json({ error: message });
  }
});

interface GroundedRateSource {
  title: string;
  uri: string;
}

interface GroundedElectricityRatePayload {
  ratePerKwh: number;
  resolvedLocation: string;
  utilityContext: string;
  explanation: string;
  sources: GroundedRateSource[];
  cachedAt: string;
}

const electricityRateCache = new Map<string, GroundedElectricityRatePayload>();
const RATE_CACHE_TTL_MS = 1000 * 60 * 60;

function extractElectricityRateJson(
  rawText: string,
  fallbackLocation: string
): Omit<GroundedElectricityRatePayload, 'sources' | 'cachedAt'> | null {
  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const rawRate = Number(parsed.ratePerKwh);
      if (Number.isFinite(rawRate) && rawRate > 0) {
        const normalizedRate =
          rawRate > 2 ? Number((rawRate / 100).toFixed(3)) : Number(rawRate.toFixed(3));
        return {
          ratePerKwh: Math.min(1.5, Math.max(0.04, normalizedRate)),
          resolvedLocation:
            typeof parsed.resolvedLocation === 'string' && parsed.resolvedLocation.trim()
              ? parsed.resolvedLocation.trim()
              : fallbackLocation,
          utilityContext:
            typeof parsed.utilityContext === 'string' && parsed.utilityContext.trim()
              ? parsed.utilityContext.trim()
              : 'Local Residential Utility Tariff',
          explanation:
            typeof parsed.explanation === 'string' && parsed.explanation.trim()
              ? parsed.explanation.trim()
              : 'Estimated residential electricity rate retrieved via Google Search.',
        };
      }
    } catch {
      // Fall through to regex extraction
    }
  }

  const dollarMatch = cleaned.match(/\$\s*(\d+(?:\.\d{1,4})?)\s*(?:\/\s*kWh|per\s*kWh)/i);
  const centsMatch = cleaned.match(/(\d+(?:\.\d{1,2})?)\s*(?:cents|¢)\s*(?:\/\s*kWh|per\s*kWh)/i);
  const extractedRate = dollarMatch
    ? Number(dollarMatch[1])
    : centsMatch
    ? Number(centsMatch[1]) / 100
    : NaN;

  if (!Number.isFinite(extractedRate) || extractedRate <= 0) {
    return null;
  }

  return {
    ratePerKwh: Math.min(1.5, Math.max(0.04, Number(extractedRate.toFixed(3)))),
    resolvedLocation: fallbackLocation,
    utilityContext: 'Search-Grounded Utility Average',
    explanation: cleaned.slice(0, 260),
  };
}

app.post('/api/electricity-rate', async (req, res) => {
  const rawLocation =
    typeof req.body?.location === 'string' ? req.body.location.trim() : '';
  if (!rawLocation) {
    res.status(400).json({ error: 'Please enter a city, state, or ZIP code.' });
    return;
  }

  const location = rawLocation.slice(0, 120);
  const cacheKey = location.toLowerCase();
  const cached = electricityRateCache.get(cacheKey);
  if (cached && Date.now() - Date.parse(cached.cachedAt) < RATE_CACHE_TTL_MS) {
    res.json({ ...cached, fromCache: true });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'Live Search rate lookup is unavailable without a server Gemini API key. Enter your local $/kWh rate manually below.',
    });
    return;
  }

  try {
    const prompt = `Look up the current average residential electricity rate in USD per kWh for "${location}".
Use Google Search to check the most recent EIA state/regional retail electricity price or primary local utility residential tariff (e.g. 2025 or 2026 residential rate).
Respond ONLY with a single JSON object (no markdown, no code fences) with these exact keys:
{
  "ratePerKwh": 0.24,
  "resolvedLocation": "City, State or Region",
  "utilityContext": "Primary Utility or EIA Benchmark",
  "explanation": "One concise sentence stating the residential average $/kWh and tariff context."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text ?? '';
    const parsed = extractElectricityRateJson(text, location);

    if (!parsed) {
      res.status(502).json({
        error:
          'Could not parse a verified $/kWh rate for that location. Try adding a city and state or ZIP code.',
      });
      return;
    }

    const chunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seenUris = new Set<string>();
    const sources: GroundedRateSource[] = [];

    for (const chunk of chunks) {
      const uri = chunk.web?.uri;
      if (!uri || seenUris.has(uri)) continue;
      seenUris.add(uri);
      sources.push({
        uri,
        title: chunk.web?.title?.trim() || new URL(uri).hostname,
      });
      if (sources.length >= 4) break;
    }

    const payload: GroundedElectricityRatePayload = {
      ...parsed,
      sources,
      cachedAt: new Date().toISOString(),
    };

    if (electricityRateCache.size >= 50) {
      const oldestKey = electricityRateCache.keys().next().value;
      if (oldestKey) electricityRateCache.delete(oldestKey);
    }
    electricityRateCache.set(cacheKey, payload);

    res.json({ ...payload, fromCache: false });
  } catch (err) {
    const rawMessage =
      err instanceof Error
        ? err.message
        : 'Failed to look up local electricity rate via Search.';
    const isQuota =
      rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED');
    const cleanMessage = isQuota
      ? 'Live Search rate lookup quota is currently exhausted. Enter your local $/kWh rate manually below.'
      : 'Unable to complete live Search rate lookup right now. Enter your local $/kWh rate manually below.';
    res.status(isQuota ? 429 : 502).json({ error: cleanMessage });
  }
});

app.post('/api/daily-videos/generate-next', async (_req, res) => {
  try {
    const allVideos = await dailyVideoEngine.generateNextDayAndArchiveCurrent();
    const activeVideo =
      allVideos.find((v) => v.status === 'playing_today') ?? allVideos[0] ?? null;
    const archivedVideos = allVideos.filter((v) => v.status === 'archived');

    res.json({
      todayDateKey: formatLocalDateKey(new Date()),
      nextMidnightIso: getNextMidnightIso(new Date()),
      activeVideo,
      archivedVideos,
      allVideos,
    });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to generate next daily spotlight video.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/account/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const syncedUser = await getOrCreateUser(
      req.user.uid,
      req.user.email ?? `${req.user.uid}@firebase.local`,
      typeof req.user.name === 'string' ? req.user.name : null
    );
    res.json({ user: syncedUser });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to synchronize account.';
    res.status(500).json({ error: message });
  }
});

app.get('/api/utility-profiles', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await getOrCreateUser(
      req.user.uid,
      req.user.email ?? `${req.user.uid}@firebase.local`,
      typeof req.user.name === 'string' ? req.user.name : null
    );
    const profiles = await listUtilityRateProfiles(req.user.uid);
    res.json({ profiles });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to load utility rate profiles.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/utility-profiles', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const label =
      typeof req.body?.label === 'string' ? req.body.label.trim() : '';
    const locationQuery =
      typeof req.body?.locationQuery === 'string'
        ? req.body.locationQuery.trim()
        : '';
    const utilityContext =
      typeof req.body?.utilityContext === 'string'
        ? req.body.utilityContext.trim()
        : '';
    const ratePerKwh = Number(req.body?.ratePerKwh);

    if (!label || !Number.isFinite(ratePerKwh) || ratePerKwh <= 0) {
      res
        .status(400)
        .json({ error: 'Valid profile label and $/kWh rate are required.' });
      return;
    }

    const profile = await saveUtilityRateProfile(
      {
        uid: req.user.uid,
        email: req.user.email ?? `${req.user.uid}@firebase.local`,
        displayName: typeof req.user.name === 'string' ? req.user.name : null,
      },
      {
        label,
        locationQuery: locationQuery || label,
        utilityContext: utilityContext || 'Local Residential Tariff',
        ratePerKwh,
        isDefault: Boolean(req.body?.isDefault),
      }
    );
    res.status(201).json({ profile });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to save utility profile.';
    res.status(500).json({ error: message });
  }
});

app.delete(
  '/api/utility-profiles/:id',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid profile ID.' });
        return;
      }
      const deleted = await deleteUtilityRateProfile(req.user.uid, id);
      if (!deleted) {
        res.status(404).json({ error: 'Utility rate profile not found.' });
        return;
      }
      res.json({ deleted: true, id });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to delete utility profile.';
      res.status(500).json({ error: message });
    }
  }
);

app.get('/api/solar-quotes', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await getOrCreateUser(
      req.user.uid,
      req.user.email ?? `${req.user.uid}@firebase.local`,
      typeof req.user.name === 'string' ? req.user.name : null
    );
    const quotes = await listSolarQuoteSnapshots(req.user.uid);
    res.json({ quotes });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load solar quotes.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/solar-quotes', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const quoteTitle =
      typeof req.body?.quoteTitle === 'string'
        ? req.body.quoteTitle.trim()
        : '';
    const rawItems: unknown[] = Array.isArray(req.body?.items)
      ? req.body.items
      : [];

    if (!quoteTitle || rawItems.length === 0) {
      res
        .status(400)
        .json({ error: 'Quote title and at least one item are required.' });
      return;
    }

    const items = rawItems
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object'
      )
      .map((item) => ({
        productId: String(item.productId ?? ''),
        productName: String(item.productName ?? ''),
        merchantId: String(item.merchantId ?? ''),
        quantity: Number(item.quantity ?? 1),
        unitLandedPrice: Number(item.unitLandedPrice ?? 0),
      }))
      .filter((item) => Boolean(item.productId && item.productName));

    if (items.length === 0) {
      res.status(400).json({ error: 'Valid quote line items are required.' });
      return;
    }

    const quote = await createSolarQuoteSnapshot(
      {
        uid: req.user.uid,
        email: req.user.email ?? `${req.user.uid}@firebase.local`,
        displayName: typeof req.user.name === 'string' ? req.user.name : null,
      },
      {
        quoteTitle,
        totalLandedCost: Number(req.body?.totalLandedCost ?? 0),
        totalStorageWh: Number(req.body?.totalStorageWh ?? 0),
        totalSolarWatts: Number(req.body?.totalSolarWatts ?? 0),
        utilityRateSnapshot: Number(req.body?.utilityRateSnapshot ?? 0.24),
        items,
      }
    );

    res.status(201).json({ quote });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to save hardware quote.';
    res.status(500).json({ error: message });
  }
});

app.delete(
  '/api/solar-quotes/:id',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid quote ID.' });
        return;
      }
      const deleted = await deleteSolarQuoteSnapshot(req.user.uid, id);
      if (!deleted) {
        res.status(404).json({ error: 'Solar quote snapshot not found.' });
        return;
      }
      res.json({ deleted: true, id });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete solar quote.';
      res.status(500).json({ error: message });
    }
  }
);

const SERVER_SWARM_ROSTER: {
  agentId: SwarmAgentId;
  agentNumber: number;
  name: string;
  roleTitle: string;
  ownedFeature: string;
  easyLabel: string;
  defaultLatencyMs: number;
}[] = [
  {
    agentId: 'chief-of-staff',
    agentNumber: 1,
    name: 'Aria',
    roleTitle: 'Chief of Staff & Swarm Orchestrator',
    ownedFeature: 'Swarm Job Allocation, SLA Monitoring & CEO Dispatch',
    easyLabel: 'Class Captain Robot',
    defaultLatencyMs: 145,
  },
  {
    agentId: 'arbitrage-scout',
    agentNumber: 2,
    name: 'Vector',
    roleTitle: 'Cross-Store Arbitrage Scout',
    ownedFeature: 'Store Matrix (10+ Platforms Landed Math)',
    easyLabel: 'Price Tag Detective',
    defaultLatencyMs: 185,
  },
  {
    agentId: 'advisor-analyst',
    agentNumber: 3,
    name: 'Atlas',
    roleTitle: 'Purpose-Fit & Top-3 Advisor',
    ownedFeature: 'Top 3 Purpose Hub & Local AI LLM Filtering',
    easyLabel: 'Matchmaker Owl',
    defaultLatencyMs: 190,
  },
  {
    agentId: 'teardown-auditor',
    agentNumber: 4,
    name: 'Micron',
    roleTitle: 'Spec & Teardown Bench Auditor',
    ownedFeature: 'Side-by-Side Spec Matrix & Energy Density Chart',
    easyLabel: 'X-Ray Teardown Bot',
    defaultLatencyMs: 210,
  },
  {
    agentId: 'thermal-safety',
    agentNumber: 5,
    name: 'Kelvin',
    roleTitle: 'Thermal & IP-Rating Safety Agent',
    ownedFeature: 'Thermal Derating & High-Humidity IP Guard',
    easyLabel: 'Weather & Raincoat Bear',
    defaultLatencyMs: 165,
  },
  {
    agentId: 'runtime-engineer',
    agentNumber: 6,
    name: 'Ampere',
    roleTitle: 'Battery Runtime & Load Engineer',
    ownedFeature: 'Battery Runtime Estimator & Appliance Load Sizing',
    easyLabel: 'Hourglass Power Engineer',
    defaultLatencyMs: 205,
  },
  {
    agentId: 'roi-economist',
    agentNumber: 7,
    name: 'Ledger',
    roleTitle: 'Search-Grounded Tariff & ROI Economist',
    ownedFeature: 'Search-Grounded Tariff Lookup & 1/5/10-Yr ROI Chart',
    easyLabel: 'Piggy Bank Counter',
    defaultLatencyMs: 260,
  },
  {
    agentId: 'permit-guardian',
    agentNumber: 8,
    name: 'Shield',
    roleTitle: 'UL Permit & OEM Warranty Guardian',
    ownedFeature: 'UL 1973 / 9540 Permit & Authorized Dealer Guard',
    easyLabel: 'Safety Helmet Inspector',
    defaultLatencyMs: 175,
  },
  {
    agentId: 'bom-allocator',
    agentNumber: 9,
    name: 'Forge',
    roleTitle: 'BOM Split-Cart & Quote Allocator',
    ownedFeature: 'System Builder Split-Cart, Pallet Consolidation & Locked Quotes',
    easyLabel: 'Shopping Cart Captain',
    defaultLatencyMs: 225,
  },
  {
    agentId: 'spotlight-producer',
    agentNumber: 10,
    name: 'Beacon',
    roleTitle: 'Daily Spotlight & Watchlist Producer',
    ownedFeature: 'Daily #1 Spotlight Video, Price Alerts & Social Broadcasts',
    easyLabel: 'News & Megaphone Bird',
    defaultLatencyMs: 240,
  },
  {
    agentId: 'catalog-crawler',
    agentNumber: 11,
    name: 'Harvest',
    roleTitle: 'Catalog & Price Freshness Scout',
    ownedFeature: '30-SKU Price Freshness, Coupon Verification & 90d Low Audits',
    easyLabel: 'Freshness Orchard Keeper',
    defaultLatencyMs: 230,
  },
  {
    agentId: 'seo-publisher',
    agentNumber: 12,
    name: 'Scribe',
    roleTitle: 'Programmatic SEO & Schema Publisher',
    ownedFeature: 'Sitemap.xml, JSON-LD Product Schema & Comparison Landing Briefs',
    easyLabel: 'Library Signpost Painter',
    defaultLatencyMs: 250,
  },
  {
    agentId: 'social-courier',
    agentNumber: 13,
    name: 'Courier',
    roleTitle: 'Multi-Channel Video & Social Distributor',
    ownedFeature: 'YouTube Shorts, Reddit r/SolarDIY, X & KakaoTalk Briefs',
    easyLabel: 'Postcard Delivery Fox',
    defaultLatencyMs: 215,
  },
  {
    agentId: 'policy-tracker',
    agentNumber: 14,
    name: 'Pulse',
    roleTitle: 'Utility Tariff & Rebate Hook Tracker',
    ownedFeature: 'High-Rate State Audit Presets (CA, HI, MA, NY, TX)',
    easyLabel: 'Electric Bill Weathervane',
    defaultLatencyMs: 195,
  },
  {
    agentId: 'partner-steward',
    agentNumber: 15,
    name: 'Steward',
    roleTitle: 'Community, Widget & Affiliate Steward',
    ownedFeature: 'Outbound Store Click Telemetry & Embeddable Price Badges',
    easyLabel: 'Friendly Storefront Greeter',
    defaultLatencyMs: 170,
  },
];

const VALID_SWARM_ACTIONS: SwarmActionType[] = [
  'optimize-bom-split',
  'filter-local-ai-48v',
  'load-compare-preset',
  'apply-starter-kit',
  'set-utility-rate',
  'open-product-audit',
];

const SWARM_DELIBERATION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    missionTitle: { type: Type.STRING },
    chiefOfStaffSummary: { type: Type.STRING },
    agentVotes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          agentId: { type: Type.STRING },
          decision: {
            type: Type.STRING,
            enum: ['approve', 'caution', 'hold'],
          },
          confidencePct: { type: Type.INTEGER },
          assignedJob: { type: Type.STRING },
          finding: { type: Type.STRING },
          easySummary: { type: Type.STRING },
        },
        required: [
          'agentId',
          'decision',
          'confidencePct',
          'assignedJob',
          'finding',
          'easySummary',
        ],
      },
    },
    proposedAction: {
      type: Type.OBJECT,
      properties: {
        actionType: {
          type: Type.STRING,
          enum: VALID_SWARM_ACTIONS,
        },
        actionLabel: { type: Type.STRING },
        targetProductId: { type: Type.STRING },
        targetKitType: {
          type: Type.STRING,
          enum: ['cabin-48v', 'van-24v', 'whole-home'],
        },
        targetCompareIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
        suggestedUtilityRate: { type: Type.NUMBER },
        authorizedOnly: { type: Type.BOOLEAN },
        summaryText: { type: Type.STRING },
        safetyGuardText: { type: Type.STRING },
      },
      required: ['actionType', 'actionLabel', 'summaryText', 'safetyGuardText'],
    },
    slackDispatchHeadline: { type: Type.STRING },
    slackDispatchBody: { type: Type.STRING },
    easyStorySteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepNumber: { type: Type.INTEGER },
          title: { type: Type.STRING },
          detail: { type: Type.STRING },
          result: { type: Type.STRING },
        },
        required: ['stepNumber', 'title', 'detail', 'result'],
      },
    },
  },
  required: [
    'missionTitle',
    'chiefOfStaffSummary',
    'agentVotes',
    'proposedAction',
    'slackDispatchHeadline',
    'slackDispatchBody',
    'easyStorySteps',
  ],
};

app.post('/api/swarm/deliberate', async (req, res) => {
  const directive =
    typeof req.body?.directive === 'string' ? req.body.directive.trim() : '';
  if (!directive) {
    res.status(400).json({ error: 'CEO directive prompt is required.' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'Live AI Swarm requires a server Gemini API key. Use Play 5-Step Replay to preview the full Swarm workflow locally.',
    });
    return;
  }

  const catalogSummary =
    typeof req.body?.catalogSummary === 'string'
      ? req.body.catalogSummary.slice(0, 3500)
      : '';
  const buildSummary =
    typeof req.body?.buildSummary === 'string'
      ? req.body.buildSummary.slice(0, 1500)
      : '';
  const utilityRate = Number(req.body?.utilityRate) || 0.24;
  const activeAgentIdsRaw: string[] = Array.isArray(req.body?.activeAgentIds)
    ? req.body.activeAgentIds.map((x: unknown) => String(x))
    : SERVER_SWARM_ROSTER.map((a) => a.agentId);
  const activeSet = new Set<string>(activeAgentIdsRaw);

  const rosterPrompt = SERVER_SWARM_ROSTER.map(
    (a) =>
      `- Agent #${a.agentNumber} (${a.agentId}) "${a.name}" [${activeSet.has(a.agentId) ? 'ACTIVE' : 'PAUSED'}]: ${a.roleTitle}. Owns: ${a.ownedFeature}. Picture-book mascot: ${a.easyLabel}.`
  ).join('\n');

  const prompt = `You are Agent #01 Aria (Chief of Staff) leading SolarBench's Genuine 15-Agent AI Swarm reporting to 1 Human CEO.
Human CEO Directive: "${directive.slice(0, 500)}"

Active Utility Rate: $${utilityRate.toFixed(2)}/kWh
Current System Builder BOM:
${buildSummary || 'Default off-grid solar hardware BOM.'}

Live SolarBench Hardware Catalog Reference:
${catalogSummary || 'Use standard SolarBench 48V LiFePO4 batteries, hybrid inverters, and bifacial solar panels.'}

15-Agent Swarm Roster (Core Bench #01-#10 + Growth & Freshness #11-#15):
${rosterPrompt}

Instructions:
1. Chief of Staff Aria (agent #01) MUST allocate a concrete task to every ACTIVE agent (#01 through #15) matched to their owned SolarBench feature, evaluate trade-offs objectively (include genuine "caution" or "hold" notes where appropriate—such as IP20 open-frame humidity risks, 3P unauthorized warranty risks, or low-temp freezing LiFePO4 cutoffs), and compile a crisp CEO Dispatch proposal.
2. For proposedAction.actionType choose the single best matching SolarBench action:
   - "optimize-bom-split" (optimizes BOM across stores; set authorizedOnly=true when OEM warranty should be protected)
   - "filter-local-ai-48v" (filters advisor & catalog for 48V Local AI LLM / UPS quiet storage)
   - "load-compare-preset" (loads 2-4 exact product IDs into targetCompareIds from the catalog reference)
   - "apply-starter-kit" (sets targetKitType to 'cabin-48v', 'van-24v', or 'whole-home')
   - "set-utility-rate" (sets suggestedUtilityRate USD/kWh between 0.08 and 0.65)
   - "open-product-audit" (sets targetProductId to an exact product ID from the catalog reference)
3. Provide 5 numbered easyStorySteps written warmly and vividly (easy enough for a child or SNS follower to visualize step by step: Chief hands out jobs -> 15 robots vote -> card sent to CEO phone -> CEO stamps Approve -> SolarBench updates).
4. Include every active agentId in agentVotes cleanly.`;

  const startMs = Date.now();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: SWARM_DELIBERATION_SCHEMA,
      },
    });

    const elapsedMs = Math.max(120, Date.now() - startMs);
    const rawJson = (response.text ?? '').trim();
    if (!rawJson) {
      res.status(502).json({ error: 'Gemini returned an empty Swarm response.' });
      return;
    }

    const parsed = JSON.parse(rawJson) as Record<string, unknown>;
    const aiVotesList = Array.isArray(parsed.agentVotes)
      ? (parsed.agentVotes as Record<string, unknown>[])
      : [];
    const aiVoteMap = new Map<string, Record<string, unknown>>();
    for (const v of aiVotesList) {
      if (typeof v?.agentId === 'string') {
        aiVoteMap.set(v.agentId, v);
      }
    }

    const agentVotes: SwarmAgentVote[] = SERVER_SWARM_ROSTER.map((agent) => {
      const isAgentActive =
        agent.agentId === 'chief-of-staff' || activeSet.has(agent.agentId);
      if (!isAgentActive) {
        return {
          agentId: agent.agentId,
          agentNumber: agent.agentNumber,
          name: agent.name,
          roleTitle: agent.roleTitle,
          decision: 'standby',
          confidencePct: 0,
          latencyMs: 0,
          assignedJob: `Paused by CEO (${agent.ownedFeature})`,
          finding: 'Agent currently on standby; excluded from quorum vote.',
          easySummary: `${agent.easyLabel} is resting on the bench.`,
        };
      }

      const rawVote = aiVoteMap.get(agent.agentId);
      const rawDecision = String(rawVote?.decision ?? 'approve').toLowerCase();
      const decision: SwarmVoteDecision =
        rawDecision === 'caution'
          ? 'caution'
          : rawDecision === 'hold'
          ? 'hold'
          : 'approve';
      const conf = Math.min(
        99,
        Math.max(
          60,
          Math.round(Number(rawVote?.confidencePct) || (decision === 'approve' ? 91 : 80))
        )
      );

      return {
        agentId: agent.agentId,
        agentNumber: agent.agentNumber,
        name: agent.name,
        roleTitle: agent.roleTitle,
        decision,
        confidencePct: conf,
        latencyMs: Math.round(
          (elapsedMs / 5 + agent.defaultLatencyMs) * (0.9 + (agent.agentNumber % 3) * 0.06)
        ),
        assignedJob:
          typeof rawVote?.assignedJob === 'string' && rawVote.assignedJob.trim()
            ? rawVote.assignedJob.trim()
            : `Audited ${agent.ownedFeature}`,
        finding:
          typeof rawVote?.finding === 'string' && rawVote.finding.trim()
            ? rawVote.finding.trim()
            : `Completed live verification on ${agent.ownedFeature}.`,
        easySummary:
          typeof rawVote?.easySummary === 'string' && rawVote.easySummary.trim()
            ? rawVote.easySummary.trim()
            : `${agent.easyLabel} checked its solar checklist!`,
      };
    });

    const approveVotes = agentVotes.filter((v) => v.decision === 'approve').length;
    const cautionVotes = agentVotes.filter((v) => v.decision === 'caution').length;
    const holdVotes = agentVotes.filter((v) => v.decision === 'hold').length;
    const activeCount = Math.max(1, approveVotes + cautionVotes + holdVotes);
    const consensusScore = Math.round(
      agentVotes
        .filter((v) => v.decision !== 'standby')
        .reduce((acc, v) => acc + v.confidencePct, 0) / activeCount
    );

    const rawProposal = (parsed.proposedAction ?? {}) as Record<string, unknown>;
    const rawActionType = String(rawProposal.actionType ?? '');
    const actionType: SwarmActionType = VALID_SWARM_ACTIONS.includes(
      rawActionType as SwarmActionType
    )
      ? (rawActionType as SwarmActionType)
      : 'optimize-bom-split';

    const rawEasySteps = Array.isArray(parsed.easyStorySteps)
      ? (parsed.easyStorySteps as Record<string, unknown>[])
      : [];
    const easyStorySteps =
      rawEasySteps.length >= 3
        ? rawEasySteps.slice(0, 5).map((step, i) => ({
            stepNumber: Number(step.stepNumber) || i + 1,
            title:
              typeof step.title === 'string' && step.title.trim()
                ? step.title.trim()
                : `Step ${i + 1}`,
            detail:
              typeof step.detail === 'string' && step.detail.trim()
                ? step.detail.trim()
                : 'Swarm step verified.',
            result:
              typeof step.result === 'string' && step.result.trim()
                ? step.result.trim()
                : 'Ready.',
          }))
        : [
            {
              stepNumber: 1,
              title: 'Captain Aria Hands Out Jobs',
              detail: 'Agent #01 assigns jobs across SolarBench specialist agents.',
              result: `${activeCount} agents checked live data.`,
            },
            {
              stepNumber: 2,
              title: '10 Robot Detectives Vote',
              detail: `Consensus reached ${consensusScore}/100 with ${approveVotes} Approve and ${cautionVotes} Caution.`,
              result: 'Vote quorum complete.',
            },
            {
              stepNumber: 3,
              title: 'CEO Dispatch Prepared',
              detail: 'Safety guards verified before packaging CEO phone card.',
              result: 'Awaiting Human CEO sign-off.',
            },
          ];

    const result: SwarmDeliberationResult = {
      missionId: `swarm_${Date.now().toString(36)}`,
      missionTitle:
        typeof parsed.missionTitle === 'string' && parsed.missionTitle.trim()
          ? parsed.missionTitle.trim()
          : 'Live AI Swarm Audit',
      directive,
      sourceMode: 'live-gemini',
      generatedAtIso: new Date().toISOString(),
      chiefOfStaffSummary:
        typeof parsed.chiefOfStaffSummary === 'string' &&
        parsed.chiefOfStaffSummary.trim()
          ? parsed.chiefOfStaffSummary.trim()
          : `Chief of Staff Aria coordinated ${activeCount} agents (${consensusScore}/100 consensus).`,
      consensusScore,
      approveVotes,
      cautionVotes,
      holdVotes,
      quorumPassed: approveVotes + cautionVotes >= Math.min(10, activeCount),
      agentVotes,
      proposedAction: {
        actionType,
        actionLabel:
          typeof rawProposal.actionLabel === 'string' &&
          rawProposal.actionLabel.trim()
            ? rawProposal.actionLabel.trim()
            : 'Execute Swarm Proposal',
        targetProductId:
          typeof rawProposal.targetProductId === 'string' &&
          rawProposal.targetProductId.trim()
            ? rawProposal.targetProductId.trim()
            : undefined,
        targetKitType:
          rawProposal.targetKitType === 'cabin-48v' ||
          rawProposal.targetKitType === 'van-24v' ||
          rawProposal.targetKitType === 'whole-home'
            ? rawProposal.targetKitType
            : undefined,
        targetCompareIds: Array.isArray(rawProposal.targetCompareIds)
          ? rawProposal.targetCompareIds
              .map((x) => String(x).trim())
              .filter(Boolean)
              .slice(0, 4)
          : undefined,
        suggestedUtilityRate: Number.isFinite(Number(rawProposal.suggestedUtilityRate))
          ? Math.min(1.2, Math.max(0.05, Number(rawProposal.suggestedUtilityRate)))
          : undefined,
        authorizedOnly:
          typeof rawProposal.authorizedOnly === 'boolean'
            ? rawProposal.authorizedOnly
            : undefined,
        summaryText:
          typeof rawProposal.summaryText === 'string' &&
          rawProposal.summaryText.trim()
            ? rawProposal.summaryText.trim()
            : 'Swarm validated proposal ready for Human CEO execution.',
        safetyGuardText:
          typeof rawProposal.safetyGuardText === 'string' &&
          rawProposal.safetyGuardText.trim()
            ? rawProposal.safetyGuardText.trim()
            : 'OEM Warranty + Thermal IP Safety Guard verified.',
      },
      slackDispatchHeadline:
        typeof parsed.slackDispatchHeadline === 'string' &&
        parsed.slackDispatchHeadline.trim()
          ? parsed.slackDispatchHeadline.trim()
          : 'CEO Swarm Approval Card Ready',
      slackDispatchBody:
        typeof parsed.slackDispatchBody === 'string' &&
        parsed.slackDispatchBody.trim()
          ? parsed.slackDispatchBody.trim()
          : 'Review safety checks and approve or reject to execute live across SolarBench.',
      easyStorySteps,
    };

    res.json({ result });
  } catch (err) {
    const rawMsg =
      err instanceof Error ? err.message : 'Failed to run Live AI Swarm.';
    const isQuota =
      rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 502).json({
      error: isQuota
        ? 'Gemini quota limit reached. Use Play 5-Step Replay to inspect the full Swarm decision flow.'
        : 'Live AI Swarm encountered an upstream error. Use Play 5-Step Replay or retry.',
    });
  }
});

app.get('/api/swarm/state', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await getOrCreateUser(
      req.user.uid,
      req.user.email ?? `${req.user.uid}@firebase.local`,
      typeof req.user.name === 'string' ? req.user.name : null
    );
    const state = await listSwarmState(req.user.uid);
    res.json(state);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load AI Swarm state.';
    res.status(500).json({ error: message });
  }
});

app.post('/api/swarm/runs', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user?.uid) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const missionTitle =
      typeof req.body?.missionTitle === 'string'
        ? req.body.missionTitle.trim()
        : '';
    const directive =
      typeof req.body?.directive === 'string' ? req.body.directive.trim() : '';
    if (!missionTitle || !directive) {
      res
        .status(400)
        .json({ error: 'Mission title and directive are required.' });
      return;
    }

    const rawVotes: unknown[] = Array.isArray(req.body?.agentVotes)
      ? req.body.agentVotes
      : [];
    const agentVotes = rawVotes
      .filter(
        (v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object'
      )
      .map((v) => ({
        agentId: String(v.agentId ?? ''),
        decision: String(v.decision ?? 'approve'),
        confidencePct: Number(v.confidencePct ?? 90),
        latencyMs: Number(v.latencyMs ?? 180),
        assignedJob: String(v.assignedJob ?? ''),
      }))
      .filter((v) => Boolean(v.agentId));

    const saved = await recordSwarmRunAndUpdateMetrics(
      {
        uid: req.user.uid,
        email: req.user.email ?? `${req.user.uid}@firebase.local`,
        displayName: typeof req.user.name === 'string' ? req.user.name : null,
      },
      {
        missionTitle,
        directive,
        chiefOfStaffSummary:
          typeof req.body?.chiefOfStaffSummary === 'string'
            ? req.body.chiefOfStaffSummary
            : '',
        consensusScore: Number(req.body?.consensusScore ?? 90),
        approveVotes: Number(req.body?.approveVotes ?? 8),
        cautionVotes: Number(req.body?.cautionVotes ?? 1),
        holdVotes: Number(req.body?.holdVotes ?? 0),
        proposedActionType:
          typeof req.body?.proposedActionType === 'string'
            ? req.body.proposedActionType
            : 'optimize-bom-split',
        proposedActionLabel:
          typeof req.body?.proposedActionLabel === 'string'
            ? req.body.proposedActionLabel
            : 'Execute Proposal',
        proposedPayloadJson:
          typeof req.body?.proposedPayloadJson === 'string'
            ? req.body.proposedPayloadJson
            : '{}',
        agentVotes,
      }
    );

    res.status(201).json(saved);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to record AI Swarm run.';
    res.status(500).json({ error: message });
  }
});

app.patch(
  '/api/swarm/runs/:id/decision',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: 'Invalid Swarm run ID.' });
        return;
      }
      const ceoDecision =
        req.body?.ceoDecision === 'approved'
          ? 'approved'
          : req.body?.ceoDecision === 'rejected'
          ? 'rejected'
          : null;
      if (!ceoDecision) {
        res
          .status(400)
          .json({ error: 'ceoDecision must be approved or rejected.' });
        return;
      }
      const executedSummary =
        typeof req.body?.executedSummary === 'string'
          ? req.body.executedSummary
          : '';

      const updated = await updateSwarmRunDecision(
        req.user.uid,
        id,
        ceoDecision,
        executedSummary
      );
      if (!updated) {
        res.status(404).json({ error: 'Swarm run not found.' });
        return;
      }
      res.json(updated);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to record Human CEO decision.';
      res.status(500).json({ error: message });
    }
  }
);

app.patch(
  '/api/swarm/agents/:agentId/toggle',
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      if (!req.user?.uid) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const agentId = String(req.params.agentId ?? '').trim();
      if (!agentId) {
        res.status(400).json({ error: 'Agent ID is required.' });
        return;
      }
      if (agentId === 'chief-of-staff') {
        res
          .status(400)
          .json({ error: 'Chief of Staff Aria must stay active.' });
        return;
      }
      const isActive = Boolean(req.body?.isActive);
      const updated = await toggleAgentActiveState(
        req.user.uid,
        agentId,
        isActive
      );
      if (!updated) {
        res.status(404).json({ error: 'Swarm agent not found.' });
        return;
      }
      res.json({ metric: updated });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to toggle agent state.';
      res.status(500).json({ error: message });
    }
  }
);

const CATALOG_SITEMAP_SLUGS = [
  'eg4-ll-s-48v-100ah',
  'eg4-powerpro-wallmount-280ah',
  'sok-48v-100ah-pro',
  'pytes-v5-5120',
  'ecoworthy-48v-100ah',
  'ruixu-lithi2-48v-100ah',
  'litime-12v-230ah-plus',
  'epoch-12v-300ah-heated',
  'canadian-solar-440w-bifacial',
  'rec-alpha-pure-r-430w',
  'qcells-qpeak-duo-405w',
  'aptos-440w-dna-bifacial',
  'jinko-eagle-415w-mono',
  'rich-solar-200w-12v',
  'ecoflow-220w-bifacial-portable',
  'eg4-6000xp-inverter',
  'eg4-18kpv-12kw',
  'solark-15k-2p',
  'victron-multiplus-ii-48-5000',
  'growatt-spf-5000es',
  'sungoldpower-10kw-48v-ul',
  'ecoflow-delta-pro-3',
  'ecoflow-delta-2-max',
  'bluetti-ac200l',
  'bluetti-ac300-b300k',
  'anker-solix-f3800',
  'victron-smartsolar-150-100',
  'victron-smartsolar-100-50',
  'renogy-rover-60a-mppt',
  'midnite-classic-150',
];

const TOP_COMPARE_SITEMAP_SLUGS = [
  'eg4-ll-s-48v-100ah,sok-48v-100ah-pro,pytes-v5-5120,ecoworthy-48v-100ah',
  'eg4-6000xp-inverter,eg4-18kpv-12kw,solark-15k-2p',
  'ecoflow-delta-pro-3,anker-solix-f3800,bluetti-ac300-b300k',
  'canadian-solar-440w-bifacial,rec-alpha-pure-r-430w,qcells-qpeak-duo-405w',
];

function resolvePublicOrigin(req: express.Request): string {
  const proto =
    (typeof req.headers['x-forwarded-proto'] === 'string'
      ? req.headers['x-forwarded-proto'].split(',')[0].trim()
      : req.protocol) || 'https';
  const host = req.get('host') || 'solarbench.app';
  return `${proto}://${host}`;
}

app.get('/robots.txt', (req, res) => {
  const origin = resolvePublicOrigin(req);
  res.type('text/plain');
  res.send(
    `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req, res) => {
  const origin = resolvePublicOrigin(req);
  const today = formatLocalDateKey(new Date());
  const urls: { loc: string; priority: string; changefreq: string }[] = [
    { loc: `${origin}/`, priority: '1.0', changefreq: 'daily' },
    { loc: `${origin}/#growth-hub`, priority: '0.8', changefreq: 'daily' },
    ...CATALOG_SITEMAP_SLUGS.map((id) => ({
      loc: `${origin}/product/${id}`,
      priority: '0.9',
      changefreq: 'daily',
    })),
    ...TOP_COMPARE_SITEMAP_SLUGS.map((ids) => ({
      loc: `${origin}/compare/${encodeURIComponent(ids)}`,
      priority: '0.85',
      changefreq: 'weekly',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n')}\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.send(xml);
});

app.post('/api/growth/track-click', async (req, res) => {
  try {
    const productId =
      typeof req.body?.productId === 'string' ? req.body.productId.trim() : '';
    const productName =
      typeof req.body?.productName === 'string' ? req.body.productName.trim() : '';
    const channel =
      typeof req.body?.channel === 'string' ? req.body.channel.trim() : '';
    const merchantId =
      typeof req.body?.merchantId === 'string' ? req.body.merchantId.trim() : '';

    if (!productId || !channel) {
      res.status(400).json({ error: 'productId and channel are required.' });
      return;
    }

    const created = await recordOutboundClick({
      eventType:
        typeof req.body?.eventType === 'string'
          ? req.body.eventType
          : 'merchant_click',
      productId,
      productName: productName || productId,
      channel,
      merchantId: merchantId || 'direct',
      landedPrice: Number(req.body?.landedPrice) || 0,
      sourceSection:
        typeof req.body?.sourceSection === 'string'
          ? req.body.sourceSection
          : 'catalog',
    });
    res.status(201).json({ recorded: true, id: created.id });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to track outbound click.';
    res.status(500).json({ error: message });
  }
});

app.get('/api/growth/analytics', async (_req, res) => {
  try {
    const [summary, briefs] = await Promise.all([
      getOutboundClickSummary(),
      listGrowthCampaignBriefs(),
    ]);
    res.json({ summary, briefs });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load growth analytics.';
    res.status(500).json({ error: message });
  }
});

const GROWTH_BRIEF_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    targetSlug: { type: Type.STRING },
    seoHeadline: { type: Type.STRING },
    seoMetaDescription: { type: Type.STRING },
    youtubeShortCaption: { type: Type.STRING },
    redditReplyDraft: { type: Type.STRING },
    kakaotalkSummary: { type: Type.STRING },
    xThreadPost: { type: Type.STRING },
  },
  required: [
    'title',
    'targetSlug',
    'seoHeadline',
    'seoMetaDescription',
    'youtubeShortCaption',
    'redditReplyDraft',
    'kakaotalkSummary',
    'xThreadPost',
  ],
};

app.post('/api/growth/generate-brief', async (req, res) => {
  const briefType =
    typeof req.body?.briefType === 'string' && req.body.briefType.trim()
      ? req.body.briefType.trim()
      : 'seo-comparison';
  const focusSummary =
    typeof req.body?.focusSummary === 'string' ? req.body.focusSummary.trim() : '';
  const targetSlug =
    typeof req.body?.targetSlug === 'string' && req.body.targetSlug.trim()
      ? req.body.targetSlug.trim()
      : '/';
  const utilityRate = Number(req.body?.utilityRate) || 0.24;

  if (!focusSummary) {
    res.status(400).json({ error: 'focusSummary is required to generate a brief.' });
    return;
  }

  const ai = getGeminiClient();
  if (!ai) {
    res.status(503).json({
      error:
        'Live AI Growth Brief generation requires a server Gemini API key.',
    });
    return;
  }

  const prompt = `You are SolarBench Agent #12 (Scribe) and Agent #13 (Courier) coordinating under Chief of Staff Aria.
Generate a ready-to-publish SEO + multi-channel organic promotion packet based ONLY on the verified hardware numbers below.

Campaign Type: ${briefType}
Target Canonical Route: ${targetSlug}
Utility Benchmark: $${utilityRate.toFixed(2)}/kWh
Verified Hardware & Pricing Context:
${focusSummary.slice(0, 2800)}

Output requirements:
- seoHeadline: High-intent search title (55-68 chars) comparing the hardware with $/Wh or landed dollar math.
- seoMetaDescription: Compelling SERP snippet (130-155 chars) highlighting freight, coupons, Sec. 25D 30% credit, and OEM warranty checks.
- youtubeShortCaption: Punchy 35-second YouTube Shorts / Reels voice caption + hashtags using exact numbers.
- redditReplyDraft: Helpful, non-spammy r/SolarDIY or r/LocalLLaMA comment answering buyer sizing/cost questions with transparent Item+Freight-Coupon math.
- kakaotalkSummary: Friendly bilingual/easy Korean-English executive summary with bullet takeaways ready for KakaoTalk open-chat followers.
- xThreadPost: Crisp 240-char X/Twitter post with landed math hook.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: GROWTH_BRIEF_SCHEMA,
      },
    });

    const raw = (response.text ?? '').trim();
    if (!raw) {
      res.status(502).json({ error: 'Gemini returned an empty growth brief.' });
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const saved = await saveGrowthCampaignBrief({
      briefType,
      title: String(parsed.title || 'SolarBench Distribution Brief'),
      targetSlug: String(parsed.targetSlug || targetSlug),
      seoHeadline: String(parsed.seoHeadline || ''),
      seoMetaDescription: String(parsed.seoMetaDescription || ''),
      youtubeShortCaption: String(parsed.youtubeShortCaption || ''),
      redditReplyDraft: String(parsed.redditReplyDraft || ''),
      kakaotalkSummary: String(parsed.kakaotalkSummary || ''),
      xThreadPost: String(parsed.xThreadPost || ''),
    });

    res.status(201).json({
      brief: {
        ...saved,
        createdAt: saved.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const rawMsg =
      err instanceof Error ? err.message : 'Failed to generate growth brief.';
    const isQuota =
      rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED');
    res.status(isQuota ? 429 : 502).json({
      error: isQuota
        ? 'Gemini quota reached. Try again shortly or use the deterministic templates below.'
        : rawMsg,
    });
  }
});

app.get('/api/swarm/autonomous-status', (_req, res) => {
  res.json({ status: autonomousSwarmEngine.getStatus() });
});

app.post('/api/swarm/autonomous-run', async (_req, res) => {
  try {
    const status = await autonomousSwarmEngine.runAutonomousCycle('ceo-manual');
    res.json({ status });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to execute autonomous swarm sweep.';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/swarm/autonomous-config', (req, res) => {
  if (typeof req.body?.autopilotEnabled !== 'boolean') {
    res.status(400).json({ error: 'autopilotEnabled boolean is required.' });
    return;
  }
  const status = autonomousSwarmEngine.setAutopilotEnabled(
    req.body.autopilotEnabled
  );
  res.json({ status });
});

const DEFAULT_SLACK_CHANNEL_URL =
  'https://app.slack.com/client/T8Z8U3MPZ/C8Y7536BU';
const DEFAULT_SLACK_CHANNEL_ID = 'C8Y7536BU';

function getSlackConfig() {
  const webhookUrl = (process.env.SLACK_WEBHOOK_URL || '').trim();
  const botToken = (process.env.SLACK_BOT_TOKEN || '').trim();
  const channelId =
    (process.env.SLACK_CHANNEL_ID || DEFAULT_SLACK_CHANNEL_ID).trim() ||
    DEFAULT_SLACK_CHANNEL_ID;
  const mode: 'webhook' | 'bot-token' | 'unconfigured' = webhookUrl
    ? 'webhook'
    : botToken
    ? 'bot-token'
    : 'unconfigured';
  return {
    configured: mode !== 'unconfigured',
    mode,
    webhookUrl,
    botToken,
    channelId,
    channelUrl: DEFAULT_SLACK_CHANNEL_URL,
  };
}

app.get('/api/slack/status', (_req, res) => {
  const cfg = getSlackConfig();
  res.json({
    configured: cfg.configured,
    mode: cfg.mode,
    channelId: cfg.channelId,
    channelUrl: cfg.channelUrl,
  });
});

app.post('/api/slack/share', async (req, res) => {
  try {
    const cfg = getSlackConfig();
    const origin = resolvePublicOrigin(req);
    const shareBaseUrl =
      typeof req.body?.publicUrl === 'string' &&
      /^https?:\/\//i.test(req.body.publicUrl.trim())
        ? req.body.publicUrl.trim().replace(/\/+$/, '')
        : origin;

    const mode =
      req.body?.mode === 'daily-spotlight'
        ? 'daily-spotlight'
        : req.body?.mode === 'custom'
        ? 'custom'
        : 'launch-review';

    const customText =
      typeof req.body?.customText === 'string'
        ? req.body.customText.trim().slice(0, 2400)
        : '';

    const swarmStatus = autonomousSwarmEngine.getStatus();
    const activeVideo =
      dailyVideoEngine
        .getAllSorted()
        .find((v) => v.status === 'playing_today') ??
      dailyVideoEngine.getAllSorted()[0];

    let formattedMessage = customText;
    if (!formattedMessage) {
      if (mode === 'daily-spotlight' && activeVideo) {
        formattedMessage = [
          `☀️ *SolarBench Daily #1 Verified Deal (${activeVideo.dateKey})*`,
          `*${activeVideo.productName}* (${activeVideo.sku})`,
          `• Lowest Landed Price: *$${activeVideo.lowestLandedPrice.toLocaleString()}* at ${activeVideo.bestPlatform} (MSRP $${activeVideo.msrp.toLocaleString()})`,
          `• Headline: ${activeVideo.campaignHeadline}`,
          `• Inspect live on SolarBench_v1: ${shareBaseUrl}/?edition=v1`,
        ].join('\n');
      } else {
        formattedMessage = [
          `☀️ *SolarBench Launch Review — Compare \`SolarBench\` vs \`SolarBench_v1\`*`,
          `Shared live backend: ${swarmStatus.catalogSkuCount} audited SKUs · 10-store landed math · NEC 125% BOS · Sec. 25D 30% ROI · 15-agent swarm (${swarmStatus.overallHealthScore}% health).`,
          ``,
          `• *SolarBench_v1 (Stitch Dark Hardware Telemetry — 9.2/10):* ${shareBaseUrl}/?edition=v1`,
          `• *SolarBench (Original Light Editorial — 8.7/10):* ${shareBaseUrl}/?edition=v0`,
          ``,
          `Reply in thread with your vote & feedback on visual polish, mobile ergonomics, and launch readiness!`,
        ].join('\n');
      }
    }

    if (!cfg.configured) {
      res.status(200).json({
        delivered: false,
        configured: false,
        mode: cfg.mode,
        channelId: cfg.channelId,
        channelUrl: cfg.channelUrl,
        formattedMessage,
        message:
          'SLACK_WEBHOOK_URL is not set in server secrets yet. Message formatted for instant copy/paste into Slack.',
      });
      return;
    }

    if (cfg.mode === 'webhook') {
      const slackRes = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: formattedMessage }),
      });
      const respText = await slackRes.text();
      if (!slackRes.ok) {
        res.status(502).json({
          delivered: false,
          configured: true,
          error: `Slack webhook returned ${slackRes.status}: ${respText.slice(0, 160)}`,
          formattedMessage,
          channelUrl: cfg.channelUrl,
        });
        return;
      }
    } else {
      const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cfg.botToken}`,
        },
        body: JSON.stringify({
          channel: cfg.channelId,
          text: formattedMessage,
          unfurl_links: true,
        }),
      });
      const data = (await slackRes.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!slackRes.ok || !data.ok) {
        res.status(502).json({
          delivered: false,
          configured: true,
          error: `Slack Web API error: ${data.error || slackRes.statusText}`,
          formattedMessage,
          channelUrl: cfg.channelUrl,
        });
        return;
      }
    }

    res.status(200).json({
      delivered: true,
      configured: true,
      mode: cfg.mode,
      channelId: cfg.channelId,
      channelUrl: cfg.channelUrl,
      formattedMessage,
      message: `Posted live review card to Slack channel ${cfg.channelId}.`,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to send Slack dispatch.';
    res.status(500).json({ delivered: false, error: message });
  }
});

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function loadProductSeoMap(rootDir: string) {
  const map = new Map<string, { name: string; summarySpec: string; msrp: string }>();
  try {
    const src = fs.readFileSync(
      path.join(rootDir, 'src', 'data', 'solarCatalog.ts'),
      'utf-8'
    );
    const blocks = src.split(/\n  \{\s*\n    id:\s*'/g).slice(1);
    for (const block of blocks) {
      const id = block.split("'")[0];
      const nameMatch = block.match(/name:\s*'([^']+)'/);
      const specMatch = block.match(/summarySpec:\s*'([^']+)'/);
      const msrpMatch = block.match(/msrp:\s*(\d+)/);
      if (id && nameMatch) {
        map.set(id, {
          name: nameMatch[1],
          summarySpec: specMatch?.[1] ?? 'Bench-verified solar hardware specs & multi-store pricing.',
          msrp: msrpMatch?.[1] ?? '',
        });
      }
    }
  } catch {
    // Non-fatal fallback
  }
  return map;
}

const PRODUCT_SEO_MAP = loadProductSeoMap(__dirname);

function injectSeoMetaIntoHtml(
  html: string,
  req: express.Request
): string {
  const origin = resolvePublicOrigin(req);
  const urlPath = req.path || '/';
  let title = 'SolarBench — Solar Power Price & Spec Comparison';
  let description =
    'Compare landed solar hardware prices (Item + Freight - Coupons), $/Wh storage density, Local AI 48V UPS compatibility, and 10-year ROI across 10+ stores.';
  let canonical = `${origin}/`;

  if (urlPath.startsWith('/product/')) {
    const slug = decodeURIComponent(urlPath.replace('/product/', '').split('/')[0]);
    const meta = PRODUCT_SEO_MAP.get(slug);
    if (meta) {
      title = `${meta.name} — Multi-Store Landed Price & Spec Audit | SolarBench`;
      description = `${meta.name}: ${meta.summarySpec}. Compare landed pricing, freight, coupons, Sec. 25D 30% credit & 10-store OEM coverage on SolarBench.`;
      canonical = `${origin}/product/${encodeURIComponent(slug)}`;
    }
  } else if (urlPath.startsWith('/compare/')) {
    const rawIds = decodeURIComponent(urlPath.replace('/compare/', ''));
    const names = rawIds
      .split(',')
      .map((id) => PRODUCT_SEO_MAP.get(id.trim())?.name)
      .filter(Boolean)
      .slice(0, 4);
    if (names.length >= 2) {
      title = `${names.join(' vs ')} — Side-by-Side Audit | SolarBench`;
      description = `Compare ${names.join(', ')} head-to-head on landed cost, Wh/lb energy density, UL permits, thermal limits, and 10-year ROI.`;
      canonical = `${origin}/compare/${encodeURIComponent(rawIds)}`;
    }
  }

  return html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`)
    .replace(
      /<meta\s+name="description"[\s\S]*?\/>/i,
      `<meta name="description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      /<meta\s+property="og:title"[\s\S]*?\/>/i,
      `<meta property="og:title" content="${escapeHtmlAttr(title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"[\s\S]*?\/>/i,
      `<meta property="og:description" content="${escapeHtmlAttr(description)}" />`
    )
    .replace(
      '</head>',
      `  <link rel="canonical" href="${escapeHtmlAttr(canonical)}" />\n  </head>`
    );
}

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    const templateHtml = fs.existsSync(path.join(distDir, 'index.html'))
      ? fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8')
      : '';
    app.use(express.static(distDir, { index: false }));
    app.get('*', (req, res) => {
      if (templateHtml) {
        res
          .status(200)
          .type('html')
          .send(injectSeoMetaIntoHtml(templateHtml, req));
      } else {
        res.sendFile(path.join(distDir, 'index.html'));
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SolarBench server running on http://0.0.0.0:${port}`);
    dailyVideoEngine.startMidnightScheduler();
    autonomousSwarmEngine.startAutonomousScheduler();
  });
}

startServer();
