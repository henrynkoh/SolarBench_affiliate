export type SolarCategory =
  | 'batteries'
  | 'panels'
  | 'inverters'
  | 'portable'
  | 'controllers';

export type VoltageClass = '12V/24V' | '48V' | 'High Voltage PV' | '120V/240V AC';

export type SortOption =
  | 'lowest-price'
  | 'best-value-metric'
  | 'highest-efficiency'
  | 'biggest-drop'
  | 'biggest-spread';

export type PlatformChannel =
  | 'Amazon'
  | 'eBay'
  | 'Signature Solar'
  | 'Current Connected'
  | 'ShopSolar'
  | 'Home Depot'
  | 'Walmart'
  | 'Inverter Supply'
  | 'SanTan Solar'
  | 'altE Store'
  | 'OEM Direct';

export type PlatformCategory =
  | 'Marketplace'
  | 'Specialty Distributor'
  | 'Big-Box Retail'
  | 'Manufacturer Direct';

export interface MerchantOffer {
  merchantId: string;
  merchantName: string;
  channel: PlatformChannel;
  platformCategory: PlatformCategory;
  condition: 'New' | 'Refurbished' | 'Open-Box';
  price: number;
  shipping: number;
  couponDiscount?: number;
  promoLabel?: string;
  sellerRating: string;
  returnWindow: string;
  inStock: boolean;
  leadTime: string;
  warrantyNote: string;
  isAuthorizedDealer: boolean;
}

export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface SolarSpecs {
  nominalVoltage: string;
  capacityWh?: number;
  powerWatts?: number;
  efficiencyPct: number;
  cycleLife?: number;
  maxPvInputVoc?: number;
  maxChargeAmps?: number;
  chemistryOrCell: string;
  certifications: string[];
  lowTempCutoff?: boolean;
  bmsComms?: string;
  weightLbs: number;
  dimensionsIn: string;
  warrantyYears: number;
}

export interface TeardownBenchmark {
  verified: boolean;
  testedDate: string;
  internalBuildNote: string;
  thermalResult: string;
  bmsOrMpptVerdict: string;
}

export type SearchPurpose =
  | 'all'
  | 'off-grid-cabin'
  | 'whole-home-backup'
  | 'van-rv-marine'
  | 'portable-emergency'
  | 'high-yield-array'
  | 'local-ai-llm';

export type SizeFootprint = 'compact' | 'rack-wall' | 'full-panel';

export interface SolarProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: SolarCategory;
  voltageClass: VoltageClass;
  sizeFootprint: SizeFootprint;
  purposes: Exclude<SearchPurpose, 'all'>[];
  starRating: number;
  reviewCount: number;
  buyerFollowers: number;
  topReviewExcerpt: string;
  pros: string[];
  cons: string[];
  fastestDeliveryDays: number;
  image: string;
  msrp: number;
  summarySpec: string;
  unitMetricType: '$/Wh' | '$/W';
  specs: SolarSpecs;
  benchmark: TeardownBenchmark;
  offers: MerchantOffer[];
  priceHistory90d: PriceHistoryPoint[];
}

export interface SystemBuildItem {
  productId: string;
  quantity: number;
  selectedMerchantId?: string;
}

export type DailyVideoStatus = 'playing_today' | 'archived';

export interface DailyVideoRecord {
  dateKey: string;
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  campaignHeadline: string;
  status: DailyVideoStatus;
  visibility: 'public';
  windowStartIso: string;
  windowEndIso: string;
  videoUrl: string;
  posterUrl: string;
  narratorVoice: string;
  durationSec: number;
  bestPlatform: string;
  lowestLandedPrice: number;
  msrp: number;
  dailyUnitsSoldEstimate: string;
  scriptSummary: string;
  ownerId: string;
  source?: 'firestore' | 'server';
}

export type VideoAnalysisFocus =
  | 'Price Velocity'
  | 'Voice Retention'
  | 'Margin Spread'
  | 'Seasonal Demand';

export interface VideoAnalysisNote {
  noteId: string;
  videoDateKey: string;
  productName: string;
  metricFocus: VideoAnalysisFocus;
  noteText: string;
  ownerId: string;
  createdAtIso: string;
}

export interface DailyVideosApiResponse {
  todayDateKey: string;
  nextMidnightIso: string;
  activeVideo: DailyVideoRecord | null;
  archivedVideos: DailyVideoRecord[];
  allVideos: DailyVideoRecord[];
}

export interface PriceAlertRecord {
  alertId: string;
  productId: string;
  productName: string;
  brand: string;
  targetPrice: number;
  lowestLandedAtCreation: number;
  ownerId: string;
  createdAtIso: string;
}

export interface SavedBuildLineItem {
  productId: string;
  quantity: number;
  selectedMerchantId: string;
}

export interface SavedSolarBuild {
  buildId: string;
  buildName: string;
  items: SavedBuildLineItem[];
  totalCost: number;
  totalStorageWh: number;
  totalSolarWatts: number;
  ownerId: string;
  createdAtIso: string;
}

export interface ApplianceLoadItem {
  id: string;
  name: string;
  watts: number;
  surgeWatts: number;
  hoursPerDay: number;
  enabled: boolean;
  quantity: number;
}

export interface UtilityRateProfileRecord {
  id: number;
  userUid: string;
  label: string;
  locationQuery: string;
  utilityContext: string;
  ratePerKwh: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SolarQuoteSnapshotItemRecord {
  id: number;
  quoteId: number;
  productId: string;
  productName: string;
  merchantId: string;
  quantity: number;
  unitLandedPrice: number;
}

export interface SolarQuoteSnapshotRecord {
  id: number;
  userUid: string;
  quoteTitle: string;
  totalLandedCost: number;
  totalStorageWh: number;
  totalSolarWatts: number;
  utilityRateSnapshot: number;
  createdAt: string;
  items: SolarQuoteSnapshotItemRecord[];
}

export type SwarmAgentId =
  | 'chief-of-staff'
  | 'arbitrage-scout'
  | 'advisor-analyst'
  | 'teardown-auditor'
  | 'thermal-safety'
  | 'runtime-engineer'
  | 'roi-economist'
  | 'permit-guardian'
  | 'bom-allocator'
  | 'spotlight-producer'
  | 'catalog-crawler'
  | 'seo-publisher'
  | 'social-courier'
  | 'policy-tracker'
  | 'partner-steward';

export type SwarmAgentDivision = 'core-bench' | 'growth-ops';

export type SwarmVoteDecision = 'approve' | 'caution' | 'hold' | 'standby';

export type SwarmActionType =
  | 'optimize-bom-split'
  | 'filter-local-ai-48v'
  | 'load-compare-preset'
  | 'apply-starter-kit'
  | 'set-utility-rate'
  | 'open-product-audit';

export interface SwarmAgentProfile {
  agentId: SwarmAgentId;
  agentNumber: number;
  division: SwarmAgentDivision;
  name: string;
  roleTitle: string;
  ownedFeature: string;
  featureAnchor: string;
  authorityScope: string;
  easyLabel: string;
  easyAnalogy: string;
  defaultAccuracy: number;
  defaultLatencyMs: number;
}

export interface SwarmAgentVote {
  agentId: SwarmAgentId;
  agentNumber: number;
  name: string;
  roleTitle: string;
  decision: SwarmVoteDecision;
  confidencePct: number;
  latencyMs: number;
  assignedJob: string;
  finding: string;
  easySummary: string;
}

export interface SwarmProposedAction {
  actionType: SwarmActionType;
  actionLabel: string;
  targetProductId?: string;
  targetKitType?: 'cabin-48v' | 'van-24v' | 'whole-home';
  targetCompareIds?: string[];
  suggestedUtilityRate?: number;
  authorizedOnly?: boolean;
  summaryText: string;
  safetyGuardText: string;
}

export interface SwarmDeliberationResult {
  missionId: string;
  missionTitle: string;
  directive: string;
  sourceMode: 'live-gemini' | 'visual-replay';
  generatedAtIso: string;
  chiefOfStaffSummary: string;
  consensusScore: number;
  approveVotes: number;
  cautionVotes: number;
  holdVotes: number;
  quorumPassed: boolean;
  agentVotes: SwarmAgentVote[];
  proposedAction: SwarmProposedAction;
  slackDispatchHeadline: string;
  slackDispatchBody: string;
  easyStorySteps: {
    stepNumber: number;
    title: string;
    detail: string;
    result: string;
  }[];
}

export interface SwarmRunRecord {
  id: number;
  userUid: string;
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
  ceoDecision: 'pending' | 'approved' | 'rejected';
  executedSummary: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface AgentPerformanceRecord {
  agentId: SwarmAgentId;
  agentNumber: number;
  tasksCompleted: number;
  approvalsWon: number;
  avgLatencyMs: number;
  accuracyScore: number;
  isActive: boolean;
  lastTaskSummary: string;
  updatedAt: string;
}

export interface OutboundClickSummary {
  totalClicks: number;
  clicksLast7d: number;
  byChannel: { channel: string; clicks: number }[];
  topProducts: { productId: string; productName: string; clicks: number }[];
  recentEvents: {
    id: number;
    eventType: string;
    productId: string;
    productName: string;
    channel: string;
    merchantId: string;
    landedPrice: number;
    createdAt: string;
  }[];
}

export interface GrowthCampaignBrief {
  id: number;
  briefType: string;
  title: string;
  targetSlug: string;
  seoHeadline: string;
  seoMetaDescription: string;
  youtubeShortCaption: string;
  redditReplyDraft: string;
  kakaotalkSummary: string;
  xThreadPost: string;
  status: string;
  createdAt: string;
}

export type SocialPlatformTarget = 'twitter' | 'facebook';

export interface DailySpotlightUpdatePayload {
  dateLabel: string;
  dayTag: string;
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  campaignHeadline: string;
  landedPrice: number;
  msrp: number;
  unitMetricValue: number;
  unitMetricType: string;
  bestMerchantName: string;
  promoLabel?: string;
  dailyUnitsSoldEstimate: string;
  image: string;
  isAuthorizedDealer: boolean;
  triggerReason: 'initial' | 'selection-change' | 'override-update' | 'daily-rotation';
  serverVideoDateKey?: string;
}

export interface SocialMockupCard {
  id: string;
  sourceKey: string;
  productId: string;
  productName: string;
  brand: string;
  sku: string;
  dateLabel: string;
  dayTag: string;
  campaignHeadline: string;
  landedPrice: number;
  msrp: number;
  unitMetricLabel: string;
  bestMerchantName: string;
  promoLabel?: string;
  image: string;
  shareUrl: string;
  twitterText: string;
  facebookText: string;
  facebookLinkTitle: string;
  facebookLinkDescription: string;
  triggerReason: DailySpotlightUpdatePayload['triggerReason'];
  pushedAtIso: string;
  liked: boolean;
  reposted: boolean;
  likeCount: number;
  repostCount: number;
}

export type AutonomousCheckStatus = 'pass' | 'healed' | 'warn';

export interface AutonomousAgentAuditItem {
  agentNumber: number;
  agentId: string;
  agentName: string;
  roleLabel: string;
  status: AutonomousCheckStatus;
  metricValue: string;
  detail: string;
  checkedAtIso: string;
}

export interface AutonomousCycleLogEntry {
  cycleId: string;
  triggeredBy: 'startup' | 'scheduler' | 'ceo-manual';
  startedAtIso: string;
  completedAtIso: string;
  durationMs: number;
  healthScore: number;
  passedCount: number;
  healedCount: number;
  warnCount: number;
  briefPublished: boolean;
  summary: string;
}

export interface AutonomousSwarmStatus {
  autopilotEnabled: boolean;
  intervalMinutes: number;
  lastRunAtIso: string | null;
  nextScheduledRunIso: string | null;
  totalCyclesCompleted: number;
  overallHealthScore: number;
  catalogSkuCount: number;
  videoArchiveCount: number;
  healthyVideoCount: number;
  growthBriefsCount: number;
  summaryText: string;
  checks: AutonomousAgentAuditItem[];
  history: AutonomousCycleLogEntry[];
}



