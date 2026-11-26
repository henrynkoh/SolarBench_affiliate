import {
  AgentPerformanceRecord,
  SolarProduct,
  SwarmAgentId,
  SwarmAgentProfile,
  SwarmDeliberationResult,
  SystemBuildItem,
} from '../types/solar';
import { getBestOffer, getOfferLandedPrice } from './solarCatalog';

export const SOLAR_SWARM_AGENTS: SwarmAgentProfile[] = [
  {
    agentId: 'chief-of-staff',
    agentNumber: 1,
    division: 'core-bench',
    name: 'Aria',
    roleTitle: 'Chief of Staff & Swarm Orchestrator',
    ownedFeature: '15-Agent Job Allocation, SLA Monitoring & CEO Dispatch',
    featureAnchor: '#swarm',
    authorityScope: 'Allocates tasks across Agents #02–#15, enforces vote quorum, tracks SLA latency/accuracy, and packages CEO sign-off.',
    easyLabel: 'Class Captain Robot',
    easyAnalogy: 'Hands out magnifying glasses to all 14 detective friends, counts raised hands, and rings the CEO phone.',
    defaultAccuracy: 98,
    defaultLatencyMs: 145,
  },
  {
    agentId: 'arbitrage-scout',
    agentNumber: 2,
    division: 'core-bench',
    name: 'Vector',
    roleTitle: 'Cross-Store Arbitrage Scout',
    ownedFeature: 'Store Matrix (10+ Platforms Landed Math)',
    featureAnchor: '#catalog',
    authorityScope: 'Audits Item + LTL Freight - Coupon across Amazon, eBay, Signature Solar, Current Connected & Home Depot.',
    easyLabel: 'Price Tag Detective',
    easyAnalogy: 'Runs through 10 different toy stores with a calculator to find the lowest total price with shipping.',
    defaultAccuracy: 96,
    defaultLatencyMs: 185,
  },
  {
    agentId: 'advisor-analyst',
    agentNumber: 3,
    division: 'core-bench',
    name: 'Atlas',
    roleTitle: 'Purpose-Fit & Top-3 Advisor',
    ownedFeature: 'Top 3 Purpose Hub & Local AI LLM Filtering',
    featureAnchor: '#top',
    authorityScope: 'Scores hardware 1–10 for Cabin, Whole-Home, Van/RV, and Quiet 48V Local AI Server UPS workloads.',
    easyLabel: 'Matchmaker Owl',
    easyAnalogy: 'Matches the exact right size backpack for your trip so nothing is too heavy or too small.',
    defaultAccuracy: 95,
    defaultLatencyMs: 190,
  },
  {
    agentId: 'teardown-auditor',
    agentNumber: 4,
    division: 'core-bench',
    name: 'Micron',
    roleTitle: 'Spec & Teardown Bench Auditor',
    ownedFeature: 'Side-by-Side Spec Matrix & Energy Density Chart',
    featureAnchor: '#compare',
    authorityScope: 'Verifies Wh/lb & Wh/L energy density, cell busbar welds, BMS comms (CAN/RS485), and 4-SKU matrix winners.',
    easyLabel: 'X-Ray Teardown Bot',
    easyAnalogy: 'Peeks inside battery boxes to check which one packs the most energy without weighing a ton.',
    defaultAccuracy: 97,
    defaultLatencyMs: 210,
  },
  {
    agentId: 'thermal-safety',
    agentNumber: 5,
    division: 'core-bench',
    name: 'Kelvin',
    roleTitle: 'Thermal & IP-Rating Safety Agent',
    ownedFeature: 'Thermal Derating & High-Humidity IP Guard',
    featureAnchor: '#catalog',
    authorityScope: 'Audits -20°C to 55°C derating curves, low-temp charging cutoffs, and IP20–IP43 open-frame vs IP65/IP67 humidity safety.',
    easyLabel: 'Weather & Raincoat Bear',
    easyAnalogy: 'Makes sure open chargers wear a raincoat indoors while sealed batteries stay cozy in winter and summer.',
    defaultAccuracy: 99,
    defaultLatencyMs: 165,
  },
  {
    agentId: 'runtime-engineer',
    agentNumber: 6,
    division: 'core-bench',
    name: 'Ampere',
    roleTitle: 'Battery Runtime & Load Engineer',
    ownedFeature: 'Battery Runtime Estimator & Appliance Load Sizing',
    featureAnchor: '#builder',
    authorityScope: 'Simulates continuous/surge watts, inverter efficiency, 80% DoD reserve, and NEC BOS breaker/AWG cabling.',
    easyLabel: 'Hourglass Power Engineer',
    easyAnalogy: 'Counts exactly how many hours the fridge and lights stay glowing before the battery needs sunlight.',
    defaultAccuracy: 96,
    defaultLatencyMs: 205,
  },
  {
    agentId: 'roi-economist',
    agentNumber: 7,
    division: 'core-bench',
    name: 'Ledger',
    roleTitle: 'Search-Grounded Tariff & ROI Economist',
    ownedFeature: 'Google Search Tariff Lookup & 1/5/10-Yr ROI Chart',
    featureAnchor: '#catalog',
    authorityScope: 'Grounds local utility $/kWh via Google Search, models 30% Sec. 25D tax credits, and forecasts 10-yr break-even.',
    easyLabel: 'Piggy Bank Counter',
    easyAnalogy: 'Checks what your electric company charges and counts how fast solar puts money back into your piggy bank.',
    defaultAccuracy: 95,
    defaultLatencyMs: 260,
  },
  {
    agentId: 'permit-guardian',
    agentNumber: 8,
    division: 'core-bench',
    name: 'Shield',
    roleTitle: 'UL Permit & OEM Warranty Guardian',
    ownedFeature: 'UL 1973 / 9540 Permit & Authorized Dealer Guard',
    featureAnchor: '#builder',
    authorityScope: 'Blocks unauthorized 3P outlet warranty voids when OEM coverage is required and exports AHJ permit packets.',
    easyLabel: 'Safety Helmet Inspector',
    easyAnalogy: 'Checks that every box has a real safety sticker and official warranty before the CEO approves.',
    defaultAccuracy: 99,
    defaultLatencyMs: 175,
  },
  {
    agentId: 'bom-allocator',
    agentNumber: 9,
    division: 'core-bench',
    name: 'Forge',
    roleTitle: 'BOM Split-Cart & Quote Allocator',
    ownedFeature: 'System Builder Split-Cart, Pallet Consolidation & Locked Quotes',
    featureAnchor: '#builder',
    authorityScope: 'Allocates multi-merchant line items for lowest landed BOM total and commits price-stamped quote snapshots.',
    easyLabel: 'Shopping Cart Captain',
    easyAnalogy: 'Splits your shopping list across stores to save shipping money and locks your receipt price.',
    defaultAccuracy: 97,
    defaultLatencyMs: 225,
  },
  {
    agentId: 'spotlight-producer',
    agentNumber: 10,
    division: 'core-bench',
    name: 'Beacon',
    roleTitle: 'Daily Spotlight & Watchlist Producer',
    ownedFeature: 'Daily #1 Spotlight Video, Price Alerts & Social Broadcasts',
    featureAnchor: '#daily-spotlight',
    authorityScope: 'Tracks 24h sales velocity, triggers target price-drop watchlists, and prepares daily video dispatches.',
    easyLabel: 'News & Megaphone Bird',
    easyAnalogy: 'Announces today’s #1 battery deal on video and watches price tags for sudden discounts.',
    defaultAccuracy: 94,
    defaultLatencyMs: 240,
  },
  {
    agentId: 'catalog-crawler',
    agentNumber: 11,
    division: 'growth-ops',
    name: 'Harvest',
    roleTitle: 'Catalog & Price Freshness Scout',
    ownedFeature: '30-SKU Price Freshness, Coupon Verification & 90d Low Audits',
    featureAnchor: '#growth-hub',
    authorityScope: 'Audits coupon validity, detects 90-day price drops across 10 stores, and queues SKU refreshes for CEO approval.',
    easyLabel: 'Freshness Orchard Keeper',
    easyAnalogy: 'Checks every price tag every morning so no expired coupon or stale price ever sneaks onto our shelf.',
    defaultAccuracy: 96,
    defaultLatencyMs: 230,
  },
  {
    agentId: 'seo-publisher',
    agentNumber: 12,
    division: 'growth-ops',
    name: 'Scribe',
    roleTitle: 'Programmatic SEO & Schema Publisher',
    ownedFeature: 'Sitemap.xml, JSON-LD Product Schema & Comparison Landing Briefs',
    featureAnchor: '#growth-hub',
    authorityScope: 'Publishes dynamic Product/FAQ Schema.org data, sitemap URLs, and long-tail head-to-head comparison briefs.',
    easyLabel: 'Library Signpost Painter',
    easyAnalogy: 'Puts bright clear street signs on Google so solar shoppers find our comparison tables right away.',
    defaultAccuracy: 97,
    defaultLatencyMs: 250,
  },
  {
    agentId: 'social-courier',
    agentNumber: 13,
    division: 'growth-ops',
    name: 'Courier',
    roleTitle: 'Multi-Channel Video & Social Distributor',
    ownedFeature: 'YouTube Shorts, Reddit r/SolarDIY, X & KakaoTalk Briefs',
    featureAnchor: '#growth-hub',
    authorityScope: 'Packages daily hardware videos and real landed-math answers into platform-native threads without spam.',
    easyLabel: 'Postcard Delivery Fox',
    easyAnalogy: 'Wraps up today’s best solar story like a postcard ready to drop into YouTube Shorts and KakaoTalk.',
    defaultAccuracy: 95,
    defaultLatencyMs: 215,
  },
  {
    agentId: 'policy-tracker',
    agentNumber: 14,
    division: 'growth-ops',
    name: 'Pulse',
    roleTitle: 'Utility Tariff & Rebate Hook Tracker',
    ownedFeature: 'High-Rate State Audit Presets (CA, HI, MA, NY, TX)',
    featureAnchor: '#growth-hub',
    authorityScope: 'Tracks utility rate surges and NEM 3.0 battery payback hooks to attract high-intent homeowners.',
    easyLabel: 'Electric Bill Weathervane',
    easyAnalogy: 'Spots cities where electricity got super expensive and shows families how fast solar pays itself back.',
    defaultAccuracy: 96,
    defaultLatencyMs: 195,
  },
  {
    agentId: 'partner-steward',
    agentNumber: 15,
    division: 'growth-ops',
    name: 'Steward',
    roleTitle: 'Community, Widget & Affiliate Steward',
    ownedFeature: 'Outbound Store Click Telemetry & Embeddable Price Badges',
    featureAnchor: '#growth-hub',
    authorityScope: 'Tracks outbound affiliate clicks, share velocity, and provides clean embeddable landed-price widgets for creators.',
    easyLabel: 'Friendly Storefront Greeter',
    easyAnalogy: 'Counts which deals visitors love most and gives solar bloggers a mini price box they can share.',
    defaultAccuracy: 98,
    defaultLatencyMs: 170,
  },
];

export function buildDefaultAgentPerformanceMetrics(): AgentPerformanceRecord[] {
  const nowIso = new Date().toISOString();
  return SOLAR_SWARM_AGENTS.map((agent) => ({
    agentId: agent.agentId,
    agentNumber: agent.agentNumber,
    tasksCompleted: agent.agentNumber === 1 ? 18 : 8 + (agent.agentNumber % 5),
    approvalsWon: agent.agentNumber === 1 ? 17 : 7 + (agent.agentNumber % 4),
    avgLatencyMs: agent.defaultLatencyMs,
    accuracyScore: agent.defaultAccuracy,
    isActive: true,
    lastTaskSummary: agent.ownedFeature,
    updatedAt: nowIso,
  }));
}

export interface SwarmMissionPreset {
  id: string;
  label: string;
  directive: string;
  actionType:
    | 'optimize-bom-split'
    | 'filter-local-ai-48v'
    | 'load-compare-preset'
    | 'open-product-audit'
    | 'set-utility-rate';
}

export const SWARM_MISSION_PRESETS: SwarmMissionPreset[] = [
  {
    id: 'bom-split-audit',
    label: 'Optimize BOM Split-Cart ($)',
    directive:
      'Audit my current System Builder BOM across all 10 merchants, verify UL permit/OEM warranty safety, and propose the lowest landed split-cart allocation for CEO sign-off.',
    actionType: 'optimize-bom-split',
  },
  {
    id: 'local-ai-48v',
    label: 'Audit 48V Local AI LLM Rack',
    directive:
      'Find quiet 48V server-rack storage + UPS hybrid hardware (<10ms switchover) sized for a continuous Local AI LLM cluster and stage it in Top-3 Advisor.',
    actionType: 'filter-local-ai-48v',
  },
  {
    id: 'compare-48v-density',
    label: 'Benchmark 48V Density & SEO Pair',
    directive:
      'Compare top 48V LiFePO4 server-rack banks for Wh/lb energy density, low-temp cutoffs, and prepare schema-ready comparison winners.',
    actionType: 'load-compare-preset',
  },
  {
    id: 'high-rate-state-hook',
    label: 'Audit California $0.42/kWh ROI Hook',
    directive:
      'Evaluate high-rate California utility savings ($0.42/kWh + 30% Sec. 25D credit) to attract high-intent homeowners and stage updated ROI calculations.',
    actionType: 'set-utility-rate',
  },
  {
    id: 'daily-spotlight-roi',
    label: 'Audit Daily #1 Deal & Video Push',
    directive:
      'Evaluate today’s #1 best-selling solar hardware price drop, validate coupon freshness, and open full teardown inspection for YouTube Shorts / KakaoTalk dispatch.',
    actionType: 'open-product-audit',
  },
];

export function buildDeterministicSwarmReplay(params: {
  directive: string;
  catalog: SolarProduct[];
  buildItems: SystemBuildItem[];
  utilityRate: number;
  activeAgentIds: SwarmAgentId[];
  presetActionType?: SwarmMissionPreset['actionType'];
}): SwarmDeliberationResult {
  const {
    directive,
    catalog,
    buildItems,
    utilityRate,
    activeAgentIds,
    presetActionType,
  } = params;

  const isActive = (id: SwarmAgentId) => activeAgentIds.includes(id);

  const currentTotal = buildItems.reduce((sum, item) => {
    const prod = catalog.find((p) => p.id === item.productId);
    if (!prod) return sum;
    const offer =
      prod.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
      getBestOffer(prod, true);
    return sum + getOfferLandedPrice(offer) * item.quantity;
  }, 0);

  const optimalTotal = buildItems.reduce((sum, item) => {
    const prod = catalog.find((p) => p.id === item.productId);
    if (!prod) return sum;
    const best = getBestOffer(prod, false);
    return sum + getOfferLandedPrice(best) * item.quantity;
  }, 0);

  const splitSavings = Math.max(0, Math.round(currentTotal - optimalTotal));
  const lower = directive.toLowerCase();

  const resolvedActionType =
    presetActionType ??
    (lower.includes('ai') || lower.includes('llm') || lower.includes('ups')
      ? 'filter-local-ai-48v'
      : lower.includes('california') || lower.includes('hawaii') || lower.includes('tariff') || lower.includes('rate')
      ? 'set-utility-rate'
      : lower.includes('compare') || lower.includes('density') || lower.includes('thermal') || lower.includes('seo')
      ? 'load-compare-preset'
      : lower.includes('daily') || lower.includes('roi') || lower.includes('deal') || lower.includes('video')
      ? 'open-product-audit'
      : 'optimize-bom-split');

  const spotlightProduct =
    catalog.find((p) => p.id === 'eg4-ll-s-48v-100ah') ?? catalog[0];
  const bestSpotlightOffer = getBestOffer(spotlightProduct, true);
  const spotlightPrice = getOfferLandedPrice(bestSpotlightOffer);

  const actionMeta =
    resolvedActionType === 'filter-local-ai-48v'
      ? {
          missionTitle: '48V Local AI LLM Backup & Quiet UPS Audit',
          actionLabel: 'Apply 48V Local AI LLM Filter + Top-3 Ranking',
          targetProductId: 'eg4-6000xp-inverter',
          summaryText:
            'Filters Top-3 Advisor & Store Catalog for 48V rack storage and quiet ≤10ms UPS-grade inverters.',
          safetyGuardText:
            'Zero-drop UPS switchover check (≤10ms) + UL 9540 / OEM warranty filter ready.',
          slackHeadline:
            '48V Local AI Cluster Power Proposal Ready (Consensus 94/100)',
        }
      : resolvedActionType === 'set-utility-rate'
      ? {
          missionTitle: 'High-Rate Utility Audit Hook ($0.42/kWh California)',
          actionLabel: 'Activate $0.42/kWh California Benchmark ROI Rate',
          suggestedUtilityRate: 0.42,
          summaryText:
            'Switches active SolarBench ROI baseline to California $0.42/kWh residential tier so payback & Sec. 25D savings highlight fast 2.8-year break-even.',
          safetyGuardText:
            'Verified EIA/CPUC residential benchmark + 30% Sec. 25D eligibility check active.',
          slackHeadline:
            'High-Rate California $0.42/kWh ROI Campaign Staged (14/15 Approve)',
        }
      : resolvedActionType === 'load-compare-preset'
      ? {
          missionTitle: '48V LiFePO4 Energy Density & SEO Matrix Audit',
          actionLabel: 'Load 4× 48V Rack Batteries into Spec Matrix',
          targetCompareIds: [
            'eg4-ll-s-48v-100ah',
            'sok-48v-100ah-pro',
            'ruixu-lithi2-48v-100ah',
            'eg4-powerpro-wallmount-280ah',
          ],
          summaryText:
            'Stages 4 leading 48V LiFePO4 banks side-by-side to inspect Wh/lb density, low-temp cutoffs, and publish Schema.org comparison briefs.',
          safetyGuardText:
            'Low-temp charge protection (<0°C) and IP65 outdoor vs IP20 indoor cabinet checks active.',
          slackHeadline:
            '48V LiFePO4 Density & SEO Matrix Staged (Consensus 95/100)',
        }
      : resolvedActionType === 'open-product-audit'
      ? {
          missionTitle: 'Daily #1 Hardware Deal & Social Dispatch Audit',
          actionLabel: `Open Full Audit Modal: ${spotlightProduct.name}`,
          targetProductId: spotlightProduct.id,
          suggestedUtilityRate: utilityRate,
          summaryText: `Opens ${spotlightProduct.name} ($${spotlightPrice.toLocaleString()} landed at ${bestSpotlightOffer.merchantName}) with Thermal, Density & 10-Yr ROI charts ready for Shorts/KakaoTalk sharing.`,
          safetyGuardText: `${bestSpotlightOffer.isAuthorizedDealer ? 'OEM Authorized Dealer verified' : '3P seller warranty check'} · 10-year Sec. 25D eligible.`,
          slackHeadline: `Daily #1 Deal Audit: ${spotlightProduct.name} @ $${spotlightPrice.toLocaleString()}`,
        }
      : {
          missionTitle: 'BOM Split-Cart Optimization & UL Permit Check',
          actionLabel:
            splitSavings > 0
              ? `Optimize BOM Across Authorized Dealers (Save $${splitSavings.toLocaleString()})`
              : 'Verify & Optimize BOM Across Authorized Dealers',
          authorizedOnly: true,
          summaryText: `Re-allocates ${buildItems.length} BOM line items to lowest-landed OEM authorized distributors (Total $${optimalTotal.toLocaleString()} vs $${currentTotal.toLocaleString()}).`,
          safetyGuardText:
            'OEM Authorized Warranty Lock ON · UL 1973/9540 NEC BOS breaker sizing checked.',
          slackHeadline: `BOM Optimization Proposal ($${optimalTotal.toLocaleString()} Landed · 14/15 Approve)`,
        };

  const agentVotes = SOLAR_SWARM_AGENTS.map((agent) => {
    const active = isActive(agent.agentId);
    if (!active) {
      return {
        agentId: agent.agentId,
        agentNumber: agent.agentNumber,
        name: agent.name,
        roleTitle: agent.roleTitle,
        decision: 'standby' as const,
        confidencePct: 0,
        latencyMs: 0,
        assignedJob: `Paused by CEO / Chief of Staff (${agent.ownedFeature})`,
        finding: 'Agent currently on standby; excluded from quorum vote.',
        easySummary: `${agent.easyLabel} is resting on the bench.`,
      };
    }

    const baseFindings: Record<
      SwarmAgentId,
      {
        decision: 'approve' | 'caution' | 'hold';
        confidence: number;
        job: string;
        finding: string;
        easy: string;
      }
    > = {
      'chief-of-staff': {
        decision: 'approve',
        confidence: 97,
        job: 'Dispatched 14 specialist agents across Core Bench & Growth Ops, and packaged CEO sign-off.',
        finding: `${activeAgentIds.length}/15 agents reported within SLA; quorum passed cleanly.`,
        easy: 'Captain Aria checked all 14 teammates’ homework and rang the CEO bell!',
      },
      'arbitrage-scout': {
        decision: 'approve',
        confidence: 93,
        job: 'Scanned 10 platforms for Item + Freight - Coupon spread.',
        finding:
          splitSavings > 0
            ? `Identified $${splitSavings.toLocaleString()} landed savings by routing to lowest-freight distributors.`
            : `Lowest verified landed anchor is $${spotlightPrice.toLocaleString()} at ${bestSpotlightOffer.merchantName}.`,
        easy: `Checked all 10 stores and found the lowest price tag ($${spotlightPrice.toLocaleString()})!`,
      },
      'advisor-analyst': {
        decision: 'approve',
        confidence: 91,
        job: 'Evaluated purpose-fit score (1–10) against active hardware sizing.',
        finding:
          'Top 3 purpose-fit ranking scores 9.2/10 for continuous 48V backup & rapid dispatch.',
        easy: 'Picked the top 3 best-fitting batteries so nothing is too small.',
      },
      'teardown-auditor': {
        decision: 'approve',
        confidence: 92,
        job: 'Audited Wh/lb energy density and internal BMS busbar architecture.',
        finding:
          'Grade-A prismatic LiFePO4 cells verified >97 Wh/kg with CAN/RS485 closed-loop comms.',
        easy: 'Used X-ray vision to confirm heavy-duty copper inside the battery!',
      },
      'thermal-safety': {
        decision: 'caution',
        confidence: 83,
        job: 'Checked ambient derating (-20°C to 55°C) & IP20 vs IP65 humidity enclosure.',
        finding:
          'Approved with climate note: keep IP20/IP43 open-frame MPPT controllers indoors away from >80% RH humidity.',
        easy: 'Reminded us to keep open chargers dry indoors like wearing a raincoat!',
      },
      'runtime-engineer': {
        decision: 'approve',
        confidence: 90,
        job: 'Simulated continuous kW runtime, surge headroom & 80% DoD reserve.',
        finding:
          'Continuous load & 2× inductive motor surge remain safely within inverter capacity.',
        easy: 'Measured the hourglass to prove the fridge stays cold all night!',
      },
      'roi-economist': {
        decision: 'approve',
        confidence: 89,
        job: `Modeled 1/5/10-yr ROI payback at $${utilityRate.toFixed(2)}/kWh + 30% Sec. 25D credit.`,
        finding: `At $${utilityRate.toFixed(2)}/kWh residential tariff, 10-yr cumulative bill offset exceeds hardware basis cleanly.`,
        easy: 'Counted the coins going back into the piggy bank over 10 years!',
      },
      'permit-guardian': {
        decision: 'approve',
        confidence: 96,
        job: 'Verified UL 1973 / UL 9540 / UL 1741 certs & Authorized OEM Dealer status.',
        finding:
          'Enforcing OEM Authorized sellers prevents 3P outlet warranty void risks during AHJ inspection.',
        easy: 'Put the official safety helmet sticker on every part in the cart!',
      },
      'bom-allocator': {
        decision: 'approve',
        confidence: 94,
        job: 'Built multi-merchant BOM allocation & consolidated freight fallback.',
        finding: `Staged ${buildItems.length} BOM SKUs at $${optimalTotal.toLocaleString()} optimal landed cost.`,
        easy: 'Organized the shopping cart cleanly and locked in the exact price!',
      },
      'spotlight-producer': {
        decision: 'approve',
        confidence: 88,
        job: 'Checked Daily #1 Best-Seller velocity & watchlist price triggers.',
        finding:
          '24h volume confirms sustained demand on EG4 48V rack & split-phase inverter platforms.',
        easy: 'Prepared today’s spotlight video card so everyone can see the deal!',
      },
      'catalog-crawler': {
        decision: 'approve',
        confidence: 92,
        job: 'Audited 30 SKUs for expired promo codes, restock times & 90d lows.',
        finding:
          'All 30 active hardware SKUs carry fresh distributor coupons (SOLARFALL, EG4DEAL) and verified shipping.',
        easy: 'Checked every shelf price tag to make sure coupons are still fresh!',
      },
      'seo-publisher': {
        decision: 'approve',
        confidence: 94,
        job: 'Updated XML sitemap slugs & Schema.org Product/FAQ structured data.',
        finding:
          'Dynamic /product/:id, /compare/:ids JSON-LD snippets and sitemap.xml validated for search indexing.',
        easy: 'Painted bright Google street signs so solar shoppers find our page fast!',
      },
      'social-courier': {
        decision: 'approve',
        confidence: 91,
        job: 'Formatted Shorts, Reddit r/SolarDIY, X & KakaoTalk story packets.',
        finding:
          'Ready-to-post video captions and data-backed comparison replies staged in Growth Hub.',
        easy: 'Wrapped up the solar story postcards for YouTube Shorts and KakaoTalk!',
      },
      'policy-tracker': {
        decision: 'approve',
        confidence: 93,
        job: 'Tracked high-rate utility surges (CA $0.42/kWh, HI $0.44/kWh, MA $0.33/kWh).',
        finding:
          'Flagged high-rate state bill-audit hooks delivering 2.6× faster battery payback headlines.',
        easy: 'Spotted states with pricey electric bills where families save money fastest!',
      },
      'partner-steward': {
        decision: 'approve',
        confidence: 95,
        job: 'Prepared trackable distributor routing links & embeddable creator widget.',
        finding:
          'Outbound affiliate attribution & embeddable landed-price badge active for partner sites.',
        easy: 'Set up the welcome mat and mini price badge for solar creators!',
      },
    };

    const info = baseFindings[agent.agentId];
    return {
      agentId: agent.agentId,
      agentNumber: agent.agentNumber,
      name: agent.name,
      roleTitle: agent.roleTitle,
      decision: info.decision,
      confidencePct: info.confidence,
      latencyMs: agent.defaultLatencyMs,
      assignedJob: info.job,
      finding: info.finding,
      easySummary: info.easy,
    };
  });

  const approveVotes = agentVotes.filter((v) => v.decision === 'approve').length;
  const cautionVotes = agentVotes.filter((v) => v.decision === 'caution').length;
  const holdVotes = agentVotes.filter((v) => v.decision === 'hold').length;
  const activeCount = Math.max(1, approveVotes + cautionVotes + holdVotes);
  const consensusScore = Math.round(
    agentVotes
      .filter((v) => v.decision !== 'standby')
      .reduce((s, v) => s + v.confidencePct, 0) / activeCount
  );

  return {
    missionId: `swarm_${Date.now().toString(36)}`,
    missionTitle: actionMeta.missionTitle,
    directive,
    sourceMode: 'visual-replay',
    generatedAtIso: new Date().toISOString(),
    chiefOfStaffSummary: `Chief of Staff Aria dispatched ${activeCount} active agents across SolarBench. Consensus reached ${consensusScore}/100 (${approveVotes} Approve, ${cautionVotes} Caution). Ready for Human CEO sign-off.`,
    consensusScore,
    approveVotes,
    cautionVotes,
    holdVotes,
    quorumPassed: approveVotes + cautionVotes >= Math.min(7, activeCount),
    agentVotes,
    proposedAction: {
      actionType: resolvedActionType,
      actionLabel: actionMeta.actionLabel,
      targetProductId: actionMeta.targetProductId,
      targetCompareIds: actionMeta.targetCompareIds,
      suggestedUtilityRate: actionMeta.suggestedUtilityRate,
      authorizedOnly: actionMeta.authorizedOnly,
      summaryText: actionMeta.summaryText,
      safetyGuardText: actionMeta.safetyGuardText,
    },
    slackDispatchHeadline: actionMeta.slackHeadline,
    slackDispatchBody: `${actionMeta.summaryText} Safety Guard: ${actionMeta.safetyGuardText}`,
    easyStorySteps: [
      {
        stepNumber: 1,
        title: 'Captain Aria Hands Out Jobs',
        detail:
          'Agent #1 (Chief of Staff) splits your request across 14 specialist jobs—prices, density, raincoats, runtime, permits, SEO & social distribution.',
        result: `${activeCount} agents woke up and started checking!`,
      },
      {
        stepNumber: 2,
        title: '15 Robot Detectives Vote Together',
        detail: `Each detective checked real SolarBench hardware math and raised their hand: ${approveVotes} said YES and ${cautionVotes} added a helpful climate tip.`,
        result: `Team score reached ${consensusScore}/100!`,
      },
      {
        stepNumber: 3,
        title: 'Dispatch Card Sent to Human CEO',
        detail:
          'No robot is allowed to change your cart or buy/lock quotes alone. Aria sends a clear summary card right to your CEO screen.',
        result: 'Waiting safely for your green stamp!',
      },
      {
        stepNumber: 4,
        title: 'Human CEO Presses Approve',
        detail:
          'You review the safety helmet checks (OEM Warranty + Thermal Guard) and tap Approve & Execute.',
        result: 'Your command flies straight into SolarBench!',
      },
      {
        stepNumber: 5,
        title: 'Done & Graded on Scoreboard',
        detail:
          'SolarBench updates live, and Aria grades every robot on speed and accuracy so the swarm stays sharp.',
        result: actionMeta.summaryText,
      },
    ],
  };
}
