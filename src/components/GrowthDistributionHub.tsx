import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  Check,
  Code2,
  Copy,
  ExternalLink,
  FileCode2,
  Globe,
  Megaphone,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  Zap,
} from 'lucide-react';
import {
  GrowthCampaignBrief,
  OutboundClickSummary,
  SocialMockupCard,
  SolarProduct,
  SwarmAgentId,
} from '../types/solar';
import {
  CATEGORY_LABELS,
  get90DayDropPct,
  getBestOffer,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import { extractPromoCode } from '../data/solarEconomics';
import { generateGrowthBriefClient } from '../services/accountCloudService';
import { SocialMockupFeedPanel } from './SocialMockupFeedPanel';

interface GrowthDistributionHubProps {
  catalog: SolarProduct[];
  compareIds: string[];
  utilityRate: number;
  clickSummary: OutboundClickSummary;
  briefs: GrowthCampaignBrief[];
  socialFeedCards: SocialMockupCard[];
  onToggleLikeSocialCard: (cardId: string) => void;
  onToggleRepostSocialCard: (cardId: string) => void;
  onDismissSocialCard: (cardId: string) => void;
  onClearSocialFeed: () => void;
  onRefreshAnalytics: () => Promise<void>;
  onBriefCreated: (brief: GrowthCampaignBrief) => void;
  onApplyUtilityRate: (rate: number, label: string) => void;
  onLoadComparePreset: (ids: string[]) => void;
  onInspectProduct: (product: SolarProduct) => void;
  onAskSwarmAgent: (agentId: SwarmAgentId, directive: string) => void;
  onNotify: (message: string) => void;
}

type HubTab = 'seo' | 'social' | 'telemetry' | 'freshness';

const HIGH_RATE_STATE_HOOKS = [
  {
    code: 'CA',
    state: 'California (NEM 3.0)',
    rate: 0.42,
    hookTitle: 'CA $0.42/kWh Peak + NEM 3.0 Battery Shift',
    paybackSummary: 'Pair 10–14.3 kWh LiFePO4 storage with Sec. 25D 30% credit to slash peak EV/evening import.',
  },
  {
    code: 'HI',
    state: 'Hawaii (HECO)',
    rate: 0.44,
    hookTitle: 'HI $0.44/kWh Grid Parity Audit',
    paybackSummary: 'Highest residential kWh cost in US makes 48V rack storage cashflow-positive inside 3.2 years.',
  },
  {
    code: 'MA',
    state: 'Massachusetts / New England',
    rate: 0.33,
    hookTitle: 'MA $0.33/kWh Winter Cold-Weather Array',
    paybackSummary: 'Cold-rated self-heating LiFePO4 + 10-yr Sec. 25D offset beats winter utility surcharges.',
  },
  {
    code: 'NY',
    state: 'New York (ConEd / Downstate)',
    rate: 0.27,
    hookTitle: 'NY $0.27/kWh Backup & UL 9540 Checklist',
    paybackSummary: 'UL 9540 certified wall-mount storage clears ConEd interconnect & apartment UPS compliance.',
  },
  {
    code: 'TX',
    state: 'Texas (ERCOT Reliability)',
    rate: 0.16,
    hookTitle: 'TX $0.16/kWh Zero-Outage Hybrid Split-Cart',
    paybackSummary: 'Optimize split-store OEM wholesale freight for whole-home blackout protection + free nights.',
  },
];

const SEO_COMPARISON_CLUSTERS = [
  {
    id: 'eg4-vs-sok-vs-pytes',
    label: '48V Server Rack Showdown: EG4 LL-S vs SOK Pro vs Pytes V5',
    ids: ['eg4-ll-s-48v-100ah', 'sok-48v-100ah-pro', 'pytes-v5-5120', 'ecoworthy-48v-100ah'],
  },
  {
    id: 'hybrid-inverter-12kw',
    label: 'Whole-Home Split-Phase: EG4 6000XP vs 18kPV vs Sol-Ark 15K',
    ids: ['eg4-6000xp-inverter', 'eg4-18kpv-12kw', 'solark-15k-2p'],
  },
  {
    id: 'portable-ups-3kwh',
    label: 'Zero-Drop Portable UPS: EcoFlow Delta Pro 3 vs Anker F3800 vs Bluetti',
    ids: ['ecoflow-delta-pro-3', 'anker-solix-f3800', 'bluetti-ac300-b300k'],
  },
  {
    id: 'bifacial-panels-440w',
    label: 'High-Efficiency Panels: Canadian Solar 440W vs REC 430W vs Qcells',
    ids: ['canadian-solar-440w-bifacial', 'rec-alpha-pure-r-430w', 'qcells-qpeak-duo-405w'],
  },
];

export function GrowthDistributionHub({
  catalog,
  compareIds,
  utilityRate,
  clickSummary,
  briefs,
  socialFeedCards,
  onToggleLikeSocialCard,
  onToggleRepostSocialCard,
  onDismissSocialCard,
  onClearSocialFeed,
  onRefreshAnalytics,
  onBriefCreated,
  onApplyUtilityRate,
  onLoadComparePreset,
  onInspectProduct,
  onAskSwarmAgent,
  onNotify,
}: GrowthDistributionHubProps) {
  const [activeTab, setActiveTab] = useState<HubTab>('seo');
  const [selectedClusterId, setSelectedClusterId] = useState(
    SEO_COMPARISON_CLUSTERS[0].id
  );
  const [widgetProductId, setWidgetProductId] = useState<string>(
    'eg4-ll-s-48v-100ah'
  );
  const [freshnessSearch, setFreshnessSearch] = useState('');
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefreshingTelemetry, setIsRefreshingTelemetry] = useState(false);

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://solarbench.app';

  const activeCluster = useMemo(
    () =>
      SEO_COMPARISON_CLUSTERS.find((c) => c.id === selectedClusterId) ??
      SEO_COMPARISON_CLUSTERS[0],
    [selectedClusterId]
  );

  const clusterProducts = useMemo(
    () =>
      activeCluster.ids
        .map((id) => catalog.find((p) => p.id === id))
        .filter((p): p is SolarProduct => Boolean(p)),
    [activeCluster, catalog]
  );

  const widgetProduct = useMemo(
    () => catalog.find((p) => p.id === widgetProductId) ?? catalog[0],
    [catalog, widgetProductId]
  );

  const compareSlug = `/compare/${encodeURIComponent(activeCluster.ids.join(','))}`;
  const compareFullUrl = `${origin}/?compare=${encodeURIComponent(
    activeCluster.ids.join(',')
  )}#compare`;

  const clusterMetricsSummary = useMemo(() => {
    return clusterProducts
      .map((p) => {
        const best = getBestOffer(p, true);
        const landed = getOfferLandedPrice(best);
        const unit = getUnitMetricValue(p, true);
        const promo = extractPromoCode(best);
        return `${p.name} (${p.sku}): $${landed} landed ($${unit.toFixed(2)} ${
          p.unitMetricType
        }) at ${best.merchantName}${promo ? `, promo ${promo}` : ''}, OEM auth=${
          best.isAuthorizedDealer
        }, ${p.specs.certifications.join('/')}`;
      })
      .join(' | ');
  }, [clusterProducts]);

  const fallbackTemplates = useMemo(() => {
    const lead = clusterProducts[0] ?? catalog[0];
    const runner = clusterProducts[1] ?? catalog[1];
    const leadBest = getBestOffer(lead, true);
    const runnerBest = getBestOffer(runner, true);
    const leadPrice = getOfferLandedPrice(leadBest);
    const runnerPrice = getOfferLandedPrice(runnerBest);
    const leadUnit = getUnitMetricValue(lead, true);
    const runnerUnit = getUnitMetricValue(runner, true);

    return {
      seoHeadline: `${lead.name} vs ${runner.name}: True $${leadUnit.toFixed(
        2
      )} vs $${runnerUnit.toFixed(2)} ${lead.unitMetricType} Landed Index`,
      seoMetaDescription: `Compare ${lead.name} ($${leadPrice.toLocaleString()} at ${
        leadBest.merchantName
      }) against ${runner.name} ($${runnerPrice.toLocaleString()}) with freight, coupons & $${utilityRate.toFixed(
        2
      )}/kWh ROI.`,
      youtubeShortCaption: `Stop overpaying for solar shipping! Real Item+Freight-Coupon check: ${lead.name} lands at $${leadPrice.toLocaleString()} ($${leadUnit.toFixed(
        2
      )}${lead.unitMetricType}) vs ${runner.name} at $${runnerPrice.toLocaleString()}. Full spec matrix + 30% tax credit calculator live at ${compareFullUrl} #SolarDIY #LiFePO4 #OffGrid`,
      redditReplyDraft: `Ran your hardware shortlist through SolarBench (includes parcel/LTL freight + coupons, not base MSRP):\n- **${lead.name}**: $${leadPrice.toLocaleString()} landed at ${leadBest.merchantName} ($${leadUnit.toFixed(
        2
      )} ${lead.unitMetricType}, OEM auth: ${
        leadBest.isAuthorizedDealer ? 'Yes' : 'Verify 3P'
      })\n- **${runner.name}**: $${runnerPrice.toLocaleString()} landed at ${runnerBest.merchantName} ($${runnerUnit.toFixed(
        2
      )} ${runner.unitMetricType})\n\nAt $${utilityRate.toFixed(
        2
      )}/kWh utility rates, you can inspect the side-by-side matrix and split-cart builder directly here: ${compareFullUrl}`,
      kakaotalkSummary: `[SolarBench 오늘의 태양광 하드웨어 비교 브리프]\n1) ${lead.name}: 실구매가 $${leadPrice.toLocaleString()} (${leadBest.merchantName}, $${leadUnit.toFixed(
        2
      )}${lead.unitMetricType})\n2) ${runner.name}: 실구매가 $${runnerPrice.toLocaleString()} (${runnerBest.merchantName})\n3) 전기요금 $${utilityRate.toFixed(
        2
      )}/kWh 기준 ROI 및 30% 세액공제 계산 포함\n실시간 비교표 열기: ${compareFullUrl}`,
      xThreadPost: `Audited ${clusterProducts.length} solar models across 10 stores (Item + Freight - Coupon):\n1) ${lead.name}: $${leadPrice.toLocaleString()} ($${leadUnit.toFixed(
        2
      )} ${lead.unitMetricType})\n2) ${runner.name}: $${runnerPrice.toLocaleString()}\nLive landed matrix + 10-yr ROI at $${utilityRate.toFixed(
        2
      )}/kWh -> ${compareFullUrl}`,
    };
  }, [clusterProducts, catalog, utilityRate, compareFullUrl]);

  const activeBrief = briefs[0] ?? null;

  const iframeCode = `<iframe src="${origin}/?widget=price&product=${encodeURIComponent(
    widgetProduct.id
  )}" title="${widgetProduct.name} Live Price — SolarBench" width="100%" height="360" style="border:0;max-width:440px;border-radius:12px;" loading="lazy"></iframe>`;

  const freshnessRows = useMemo(() => {
    const q = freshnessSearch.trim().toLowerCase();
    return catalog
      .filter((p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      })
      .map((p) => {
        const best = getBestOffer(p, true);
        const landed = getOfferLandedPrice(best);
        const promo = extractPromoCode(best);
        const drop = get90DayDropPct(p);
        return { product: p, best, landed, promo, drop };
      });
  }, [catalog, freshnessSearch]);

  const copyText = async (key: string, text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      onNotify(`Copied ${label} to clipboard.`);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2200);
    } catch {
      onNotify('Browser clipboard blocked copy request.');
    }
  };

  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true);
    setBriefError(null);
    try {
      const created = await generateGrowthBriefClient({
        briefType: 'seo-social-pack',
        targetSlug: compareSlug,
        utilityRate,
        focusSummary: `${activeCluster.label} :: ${clusterMetricsSummary}`,
      });
      onBriefCreated(created);
      onNotify(
        `Agent #12 Scribe & #13 Courier generated "${created.title}".`
      );
    } catch (err) {
      setBriefError(
        err instanceof Error
          ? err.message
          : 'Unable to reach AI Growth Brief generator.'
      );
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const handleRefreshTelemetryClick = async () => {
    setIsRefreshingTelemetry(true);
    try {
      await onRefreshAnalytics();
      onNotify('Refreshed live outbound merchant click & SEO brief metrics.');
    } catch {
      onNotify('Unable to refresh telemetry metrics.');
    } finally {
      setIsRefreshingTelemetry(false);
    }
  };

  return (
    <section
      id="growth-hub"
      className="py-14 bg-[#F7F8FA] border-t border-slate-200"
      aria-labelledby="growth-hub-heading"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Header + Live KPI Strip */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-slate-500">
              Agents #11 Harvest · #12 Scribe · #13 Courier · #14 Pulse · #15 Steward
            </p>
            <h2
              id="growth-hub-heading"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1"
            >
              Audience Growth, SEO Schema &amp; Catalog Operations Hub
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Live programmatic SEO routes, Schema.org Product/FAQ markup, XML sitemap endpoints, YouTube Shorts / Reddit / KakaoTalk distribution briefs, high-rate utility state hooks, embeddable creator price badges, and outbound merchant click telemetry.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white border border-slate-200 rounded-xl p-3 font-mono tabular-nums shrink-0">
            <div>
              <div className="text-[11px] text-slate-500">Indexed SKUs</div>
              <div className="text-base font-bold text-slate-900">
                {catalog.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Outbound Clicks</div>
              <div className="text-base font-bold text-emerald-700">
                {clickSummary.totalClicks}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Last 7d Clicks</div>
              <div className="text-base font-bold text-amber-700">
                {clickSummary.clicksLast7d}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Saved Briefs</div>
              <div className="text-base font-bold text-slate-900">
                {briefs.length}
              </div>
            </div>
          </div>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Growth and distribution workspaces"
            className="inline-flex flex-wrap items-center p-1 bg-slate-200/70 rounded-xl border border-slate-200 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'seo'}
              onClick={() => setActiveTab('seo')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'seo'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-amber-700" />
              SEO &amp; Sitemap (#12 Scribe)
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'social'}
              onClick={() => setActiveTab('social')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'social'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 text-amber-700" />
              Shorts, Reddit &amp; KakaoTalk (#13 Courier)
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'telemetry'}
              onClick={() => setActiveTab('telemetry')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'telemetry'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-amber-700" />
              State Audits, Telemetry &amp; Widget (#14–#15)
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'freshness'}
              onClick={() => setActiveTab('freshness')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'freshness'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-amber-700" />
              30-SKU Price &amp; Coupon Board (#11 Harvest)
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 font-mono text-[11px] font-semibold text-slate-800"
            >
              <FileCode2 className="w-3.5 h-3.5 text-amber-700" />
              /sitemap.xml
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-400 font-mono text-[11px] font-semibold text-slate-800"
            >
              /robots.txt
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Comparison Cluster Selector Shared Across Tab 1 & Tab 2 */}
        {(activeTab === 'seo' || activeTab === 'social') && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <label
                htmlFor="growth-cluster-select"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Active Programmatic Comparison Cluster ({compareIds.length} in live Spec Matrix)
              </label>
              <select
                id="growth-cluster-select"
                value={selectedClusterId}
                onChange={(e) => setSelectedClusterId(e.target.value)}
                className="w-full bg-[#F7F8FA] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
              >
                {SEO_COMPARISON_CLUSTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onLoadComparePreset(activeCluster.ids)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-slate-500 text-slate-800 transition-colors whitespace-nowrap"
              >
                Stage Cluster in Spec Matrix
              </button>

              <button
                type="button"
                disabled={isGeneratingBrief}
                onClick={() => void handleGenerateBrief()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingBrief
                  ? 'Agent #12 & #13 Writing Brief...'
                  : 'Generate AI SEO & Social Pack'}
              </button>
            </div>
          </div>
        )}

        {briefError && (
          <div
            role="alert"
            className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-900 flex items-center justify-between gap-3"
          >
            <span>{briefError} Deterministic calculator briefs below remain live and ready to copy.</span>
            <button
              type="button"
              onClick={() => setBriefError(null)}
              className="font-semibold underline shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: Programmatic SEO & Schema Publisher */}
        {activeTab === 'seo' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Google SERP &amp; OpenGraph Preview (Agent #12 Scribe)
                </h3>
                <span className="text-[11px] font-mono text-emerald-700 font-semibold">
                  JSON-LD Product + FAQ Active
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-[#F7F8FA] space-y-1.5">
                <div className="text-xs font-mono text-emerald-800 truncate">
                  {origin}
                  {compareSlug}
                </div>
                <div className="text-base font-bold text-blue-800 leading-snug">
                  {activeBrief?.seoHeadline || fallbackTemplates.seoHeadline}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeBrief?.seoMetaDescription ||
                    fallbackTemplates.seoMetaDescription}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Indexable Landing Routes ({catalog.length} SKUs + {SEO_COMPARISON_CLUSTERS.length} Comparison Clusters)</span>
                  <button
                    type="button"
                    onClick={() =>
                      onAskSwarmAgent(
                        'seo-publisher',
                        `Audit Schema.org Product/Offer markup and sitemap coverage for ${activeCluster.label} at $${utilityRate.toFixed(
                          2
                        )}/kWh.`
                      )
                    }
                    className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800"
                  >
                    Dispatch #12 Scribe
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {clusterProducts.map((p) => {
                    const best = getBestOffer(p, true);
                    const landed = getOfferLandedPrice(best);
                    return (
                      <div
                        key={p.id}
                        className="border border-slate-200 rounded-lg p-3 bg-white flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 truncate">
                            /product/{p.id} · ${landed.toLocaleString()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onInspectProduct(p)}
                          className="px-2.5 py-1 rounded border border-slate-200 hover:border-slate-400 text-[11px] font-semibold text-slate-800 shrink-0"
                        >
                          Audit
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 cols: Saved AI Brief Archive */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Published AI Growth Briefs
                </h3>
                <span className="text-xs font-mono text-slate-500">
                  {briefs.length} stored
                </span>
              </div>

              {briefs.length === 0 ? (
                <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center space-y-2">
                  <p className="text-xs font-semibold text-slate-800">
                    No AI distribution briefs generated yet
                  </p>
                  <p className="text-xs text-slate-500">
                    Click &ldquo;Generate AI SEO &amp; Social Pack&rdquo; above to have Agents #12 &amp; #13 draft and store a custom multi-channel brief for this comparison cluster.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                  {briefs.map((b) => (
                    <div
                      key={b.id}
                      className="border border-slate-200 rounded-lg p-3 bg-[#F7F8FA] space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {b.title}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-700 font-semibold shrink-0">
                          {b.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">
                        {b.targetSlug}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {b.seoHeadline}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Multi-Channel Video & Community Packager */}
        {activeTab === 'social' && (
          <div className="space-y-6">
            <SocialMockupFeedPanel
              cards={socialFeedCards}
              onToggleLike={onToggleLikeSocialCard}
              onToggleRepost={onToggleRepostSocialCard}
              onDismissCard={onDismissSocialCard}
              onClearFeed={onClearSocialFeed}
              onNotify={onNotify}
              compactHeader
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                key: 'youtube',
                title: 'YouTube Shorts / Reels Voice & Caption (#10 Beacon + #13 Courier)',
                body:
                  activeBrief?.youtubeShortCaption ||
                  fallbackTemplates.youtubeShortCaption,
              },
              {
                key: 'reddit',
                title: 'Reddit r/SolarDIY & r/LocalLLaMA Helpful Reply (#13 Courier)',
                body:
                  activeBrief?.redditReplyDraft ||
                  fallbackTemplates.redditReplyDraft,
              },
              {
                key: 'kakao',
                title: 'KakaoTalk SNS Open-Chat Live Story Summary (#13 Courier)',
                body:
                  activeBrief?.kakaotalkSummary ||
                  fallbackTemplates.kakaotalkSummary,
              },
              {
                key: 'xthread',
                title: 'X (Twitter) Landed-Cost Arbitrage Post (#13 Courier)',
                body: activeBrief?.xThreadPost || fallbackTemplates.xThreadPost,
              },
            ].map((card) => (
              <div
                key={card.key}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900">
                      {card.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => void copyText(card.key, card.body, card.title)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 hover:border-slate-400 text-[11px] font-semibold text-slate-800 shrink-0"
                    >
                      {copiedKey === card.key ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-700" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Post
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 bg-[#F7F8FA] border border-slate-200 rounded-lg p-3 leading-relaxed">
                    {card.body}
                  </pre>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Embeds verified landed URL</span>
                  <button
                    type="button"
                    onClick={() =>
                      onAskSwarmAgent(
                        'social-courier',
                        `Prepare today’s social outreach packet for ${activeCluster.label} referencing ${compareFullUrl}.`
                      )
                    }
                    className="font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                  >
                    Route to #13 Courier
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            </div>
          </div>
        )}

        {/* TAB 3: High-Rate State Audit Hooks, Outbound Telemetry & Embeddable Widget */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* High-Rate Utility Hooks (Agent #14 Pulse) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    High-Rate Utility Audit Presets (Agent #14 Pulse)
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Active ROI Baseline:{' '}
                    <strong className="font-mono text-slate-900">
                      ${utilityRate.toFixed(2)}/kWh
                    </strong>{' '}
                    · Click any state benchmark to recalibrate every 10-year ROI chart across SolarBench.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onAskSwarmAgent(
                      'policy-tracker',
                      `Run a high-rate utility payback audit at $${utilityRate.toFixed(
                        2
                      )}/kWh plus 30% Sec. 25D federal credit.`
                    )
                  }
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Dispatch #14 Pulse
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {HIGH_RATE_STATE_HOOKS.map((hook) => {
                  const isActive = Math.abs(utilityRate - hook.rate) < 0.005;
                  return (
                    <button
                      key={hook.code}
                      type="button"
                      onClick={() => onApplyUtilityRate(hook.rate, hook.state)}
                      className={`text-left p-3.5 rounded-xl border transition-colors flex flex-col justify-between gap-2 ${
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-[#F7F8FA] text-slate-900 border-slate-200 hover:border-amber-500'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span
                          className={`font-mono text-xs font-bold ${
                            isActive ? 'text-amber-400' : 'text-amber-700'
                          }`}
                        >
                          {hook.code}
                        </span>
                        <span className="font-mono text-sm font-bold tabular-nums">
                          ${hook.rate.toFixed(2)}/kWh
                        </span>
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-snug">
                          {hook.hookTitle}
                        </div>
                        <p
                          className={`text-[11px] mt-1 leading-relaxed ${
                            isActive ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {hook.paybackSummary}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom 2 cols: Live Outbound Telemetry + Embeddable Creator Price Widget */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Outbound Click Telemetry (#15 Steward) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Live Merchant Outbound &amp; Share Telemetry (Agent #15 Steward)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Every external store visit, widget click, and share event recorded in real time.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isRefreshingTelemetry}
                    onClick={() => void handleRefreshTelemetryClick()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-400 text-xs font-semibold text-slate-800"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isRefreshingTelemetry ? 'animate-spin' : ''
                      }`}
                    />
                    Refresh
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-lg p-3 bg-[#F7F8FA]">
                    <div className="text-xs font-bold text-slate-800 mb-2">
                      Clicks by Channel
                    </div>
                    {clickSummary.byChannel.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Click any external store offer link to populate live channel counts.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {clickSummary.byChannel.map((row) => (
                          <div
                            key={row.channel}
                            className="flex items-center justify-between text-xs font-mono tabular-nums"
                          >
                            <span className="font-sans font-medium text-slate-700 truncate pr-2">
                              {row.channel}
                            </span>
                            <strong className="text-slate-900">{row.clicks}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3 bg-[#F7F8FA]">
                    <div className="text-xs font-bold text-slate-800 mb-2">
                      Top Clicked SKUs
                    </div>
                    {clickSummary.topProducts.length === 0 ? (
                      <p className="text-xs text-slate-500">
                        Top hardware demand rankings update automatically on outbound store visits.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {clickSummary.topProducts.map((row) => (
                          <div
                            key={row.productId}
                            className="flex items-center justify-between text-xs font-mono tabular-nums"
                          >
                            <span className="font-sans font-medium text-slate-700 truncate pr-2">
                              {row.productName}
                            </span>
                            <strong className="text-emerald-700">
                              {row.clicks}
                            </strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {clickSummary.recentEvents.length > 0 && (
                  <div className="overflow-x-auto border-t border-slate-100 pt-3">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[11px] text-slate-500 border-b border-slate-200">
                          <th className="py-1.5 pr-3">Event</th>
                          <th className="py-1.5 px-3">Hardware SKU</th>
                          <th className="py-1.5 px-3">Store Channel</th>
                          <th className="py-1.5 pl-3 text-right">Landed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                        {clickSummary.recentEvents.slice(0, 6).map((ev) => (
                          <tr key={ev.id} className="text-slate-700">
                            <td className="py-1.5 pr-3 font-sans text-[11px]">
                              {ev.eventType}
                            </td>
                            <td className="py-1.5 px-3 font-sans font-medium text-slate-900 truncate max-w-[180px]">
                              {ev.productName}
                            </td>
                            <td className="py-1.5 px-3 font-sans">
                              {ev.channel}
                            </td>
                            <td className="py-1.5 pl-3 text-right">
                              ${Math.round(ev.landedPrice).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Embeddable Creator Price Widget */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-amber-700" />
                    Embeddable Creator Price Badge
                  </h3>
                  <a
                    href={`/?widget=price&product=${encodeURIComponent(
                      widgetProduct.id
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                  >
                    Live Preview
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div>
                  <label
                    htmlFor="widget-sku-select"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Select SolarBench SKU for Blogger / YouTube Embed
                  </label>
                  <select
                    id="widget-sku-select"
                    value={widgetProductId}
                    onChange={(e) => setWidgetProductId(e.target.value)}
                    className="w-full bg-[#F7F8FA] border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    {catalog.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${getOfferLandedPrice(getBestOffer(p, true)).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-slate-900 text-slate-100 rounded-lg p-3 text-[11px] font-mono overflow-x-auto">
                  {iframeCode}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void copyText('widget-iframe', iframeCode, 'embeddable widget HTML')
                  }
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-amber-600 text-white transition-colors"
                >
                  {copiedKey === 'widget-iframe' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      Copied Embed HTML
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy &lt;iframe&gt; Widget Snippet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: 30-SKU Catalog Freshness & Coupon Audit (Agent #11 Harvest) */}
        {activeTab === 'freshness' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  30-SKU Catalog Freshness &amp; Active Coupon Ledger (Agent #11 Harvest)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live landed anchor, coupon verification status, 90-day drop percentage, and fastest dispatch lead time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={freshnessSearch}
                  onChange={(e) => setFreshnessSearch(e.target.value)}
                  placeholder="Filter 30 SKUs..."
                  className="px-3 py-1.5 text-xs bg-[#F7F8FA] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    onAskSwarmAgent(
                      'catalog-crawler',
                      'Audit all 30 SKUs for coupon freshness, LTL freight shifts, and 90-day lows.'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 whitespace-nowrap"
                >
                  Dispatch #11 Harvest
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[11px] text-slate-500 font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">SKU &amp; Model</th>
                    <th className="py-2.5 px-3">Best Landed Store</th>
                    <th className="py-2.5 px-3 text-right">Landed</th>
                    <th className="py-2.5 px-3">Active Promo</th>
                    <th className="py-2.5 px-3 text-right">90d Drop</th>
                    <th className="py-2.5 px-3">Lead Time</th>
                    <th className="py-2.5 px-4 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {freshnessRows.map(({ product, best, landed, promo, drop }) => (
                    <tr key={product.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <div className="font-semibold text-slate-900">
                          {product.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {product.brand} · {CATEGORY_LABELS[product.category]} · {product.sku}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">
                        <div>{best.merchantName}</div>
                        <div className="text-[11px] text-slate-500">
                          {best.isAuthorizedDealer ? 'OEM Authorized' : '3P Verify'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                        ${landed.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {promo ? (
                          <button
                            type="button"
                            onClick={() =>
                              void copyText(
                                `promo-${product.id}`,
                                promo,
                                `promo code ${promo}`
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[11px] font-semibold"
                          >
                            {promo}
                            {best.couponDiscount ? ` (-$${best.couponDiscount})` : ''}
                          </button>
                        ) : (
                          <span className="text-slate-400">Direct Net</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                        {drop > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            -{drop}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {best.leadTime}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => onInspectProduct(product)}
                          className="px-2.5 py-1 rounded border border-slate-200 hover:border-slate-500 font-semibold text-slate-800"
                        >
                          Audit SKU
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
