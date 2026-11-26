import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  Bot,
  Calculator,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Layers,
  LayoutGrid,
  Play,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sliders,
  Sparkles,
  Store,
  Trash2,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  getBestOffer,
  getFilteredOffers,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import {
  FilterCriteria,
  PURPOSE_LABELS,
  evaluatePurposeFit,
} from '../data/productInsights';
import {
  calculateBosRequirements,
  computeBomLifecycleRoi,
  extractPromoCode,
  getEffectiveNetPrice,
  getPriceArbitrageMetrics,
  isSec25DEligible,
} from '../data/solarEconomics';
import { SOLAR_SWARM_AGENTS } from '../data/solarSwarm';
import {
  AutonomousSwarmStatus,
  DailyVideoRecord,
  GrowthCampaignBrief,
  OutboundClickSummary,
  PriceAlertRecord,
  SearchPurpose,
  SocialMockupCard,
  SolarProduct,
  SystemBuildItem,
} from '../types/solar';
import { HardwareImage } from './HardwareImage';

export type V1WorkspaceTab =
  | 'bench'
  | 'store-matrix'
  | 'bom-nec'
  | 'swarm'
  | 'growth';

interface SolarBenchV1AppProps {
  catalog: SolarProduct[];
  totalOfferCount: number;
  buildItems: SystemBuildItem[];
  compareIds: string[];
  priceAlerts: PriceAlertRecord[];
  preferredUtilityRate: number;
  autonomousStatus: AutonomousSwarmStatus | null;
  isSweepingAutonomous: boolean;
  clickSummary: OutboundClickSummary;
  growthBriefs: GrowthCampaignBrief[];
  socialFeedCards: SocialMockupCard[];
  onSwitchToV0: () => void;
  onOpenScorecard: () => void;
  onInspectProduct: (product: SolarProduct) => void;
  onAddToBuild: (productId: string, merchantId?: string) => void;
  onUpdateBuildQty: (productId: string, qty: number) => void;
  onRemoveBuildItem: (productId: string) => void;
  onLoadStarterKit: (kit: 'cabin-48v' | 'van-24v' | 'whole-home') => void;
  onOptimizeBuild: (authorizedOnly: boolean) => void;
  onToggleCompare: (productId: string) => void;
  onOpenRoiModal: () => void;
  onOpenAlertsModal: (initialProductId?: string) => void;
  onCreateAlert: (product: SolarProduct, targetPrice: number) => Promise<void>;
  onCopyPromoCode: (code: string, merchantName: string) => void;
  onToggleAutopilot: (nextEnabled: boolean) => void;
  onTriggerAutonomousSweep: () => void;
  onShareToSlack: (mode: 'launch-review' | 'daily-spotlight') => void;
  isSendingSlack: boolean;
  onNotify: (msg: string) => void;
}

const PURPOSE_TABS: { id: SearchPurpose; label: string }[] = [
  { id: 'whole-home-backup', label: 'Whole-Home' },
  { id: 'off-grid-cabin', label: 'Off-Grid / Cabin' },
  { id: 'van-rv-marine', label: 'Van / RV' },
  { id: 'portable-emergency', label: 'Portable' },
  { id: 'high-yield-array', label: 'Solar Array' },
  { id: 'local-ai-llm', label: 'Local AI LLM' },
];

const QUICK_MATRIX_IDS = [
  'eg4-6000xp-inverter',
  'eg4-ll-s-48v-100ah',
  'solark-15k-2p',
  'eg4-powerpro-wallmount-280ah',
  'ecoflow-delta-pro-3',
  'anker-solix-f3800',
];

export function SolarBenchV1App({
  catalog,
  totalOfferCount,
  buildItems,
  compareIds,
  priceAlerts,
  preferredUtilityRate,
  autonomousStatus,
  isSweepingAutonomous,
  clickSummary,
  growthBriefs,
  socialFeedCards,
  onSwitchToV0,
  onOpenScorecard,
  onInspectProduct,
  onAddToBuild,
  onUpdateBuildQty,
  onRemoveBuildItem,
  onLoadStarterKit,
  onOptimizeBuild,
  onToggleCompare,
  onOpenRoiModal,
  onOpenAlertsModal,
  onCreateAlert,
  onCopyPromoCode,
  onToggleAutopilot,
  onTriggerAutonomousSweep,
  onShareToSlack,
  isSendingSlack,
  onNotify,
}: SolarBenchV1AppProps) {
  const [activeTab, setActiveTab] = useState<V1WorkspaceTab>('bench');
  const [showAllScroll, setShowAllScroll] = useState(false);

  // Screen 1: Bench Overview state
  const [selectedPurpose, setSelectedPurpose] =
    useState<SearchPurpose>('whole-home-backup');
  const [dailyVideos, setDailyVideos] = useState<DailyVideoRecord[]>([]);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  // Screen 2: 10-Store Landed Matrix state
  const [matrixProductId, setMatrixProductId] = useState<string>(
    'eg4-6000xp-inverter'
  );
  const [matrixSort, setMatrixSort] = useState<
    'price' | 'authorized' | 'fastest'
  >('price');
  const [matrixInStockOnly, setMatrixInStockOnly] = useState(false);
  const [matrixAuthorizedOnly, setMatrixAuthorizedOnly] = useState(false);
  const [matrixIncludeRefurb, setMatrixIncludeRefurb] = useState(true);

  // Screen 3: BOM & NEC System Parameter sliders
  const [pvKwSlider, setPvKwSlider] = useState(8.8);
  const [inverterKwSlider, setInverterKwSlider] = useState(12);
  const [batteryKwhSlider, setBatteryKwhSlider] = useState(15.4);

  // Screen 4: CEO Command Input
  const [ceoDirective, setCeoDirective] = useState('');

  // Screen 5: Target Price Watchdog form
  const [watchdogProductId, setWatchdogProductId] = useState(
    'eg4-ll-s-48v-100ah'
  );
  const [watchdogTargetPrice, setWatchdogTargetPrice] = useState('1050');
  const [armingWatchdog, setArmingWatchdog] = useState(false);

  // Fetch live daily videos from /api/daily-videos
  useEffect(() => {
    let cancelled = false;
    fetch('/api/daily-videos')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.allVideos)) return;
        setDailyVideos(data.allVideos as DailyVideoRecord[]);
        const todayIdx = (data.allVideos as DailyVideoRecord[]).findIndex(
          (v) => v.status === 'playing_today'
        );
        if (todayIdx >= 0) setActiveVideoIndex(todayIdx);
      })
      .catch(() => {
        // Non-blocking video hydration
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentVideo = dailyVideos[activeVideoIndex] ?? null;
  const currentVideoProduct = useMemo(() => {
    if (!currentVideo) return catalog[0];
    return (
      catalog.find((p) => p.id === currentVideo.productId) ?? catalog[0]
    );
  }, [catalog, currentVideo]);

  // Top 3 Purpose Advisor ranked cards
  const topThreePicks = useMemo(() => {
    const criteria: FilterCriteria = {
      purpose: selectedPurpose,
      priceRange: 'all',
      sizeRange: 'all',
      volumeRange: 'all',
      powerRange: 'all',
      deliveryNeed: 'all',
      minBuyers: 0,
    };

    const scored = catalog
      .map((product) => {
        const best = getBestOffer(product, true);
        const landed = getOfferLandedPrice(best);
        const metric = getUnitMetricValue(product, true);
        return {
          ...evaluatePurposeFit(product, criteria, landed, metric),
          bestOffer: best,
          landed,
          metric,
        };
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 3);
  }, [catalog, selectedPurpose]);

  // Screen 2: Selected Product & Ranked Offers
  const matrixProduct = useMemo(
    () => catalog.find((p) => p.id === matrixProductId) ?? catalog[0],
    [catalog, matrixProductId]
  );

  const matrixArbitrage = useMemo(
    () => getPriceArbitrageMetrics(matrixProduct, matrixIncludeRefurb),
    [matrixProduct, matrixIncludeRefurb]
  );

  const matrixOffers = useMemo(() => {
    let list = getFilteredOffers(matrixProduct, {
      includeRefurb: matrixIncludeRefurb,
      authorizedOnly: matrixAuthorizedOnly,
    });
    if (matrixInStockOnly) {
      list = list.filter((o) => o.inStock);
    }
    if (matrixSort === 'authorized') {
      list = [...list].sort((a, b) => {
        if (a.isAuthorizedDealer !== b.isAuthorizedDealer) {
          return a.isAuthorizedDealer ? -1 : 1;
        }
        return getOfferLandedPrice(a) - getOfferLandedPrice(b);
      });
    } else if (matrixSort === 'fastest') {
      list = [...list].sort((a, b) => {
        const aFast = /same|1–2|1-2|2 day|next/i.test(a.leadTime) ? 0 : 1;
        const bFast = /same|1–2|1-2|2 day|next/i.test(b.leadTime) ? 0 : 1;
        if (aFast !== bFast) return aFast - bFast;
        return getOfferLandedPrice(a) - getOfferLandedPrice(b);
      });
    }
    return list;
  }, [
    matrixProduct,
    matrixIncludeRefurb,
    matrixAuthorizedOnly,
    matrixInStockOnly,
    matrixSort,
  ]);

  const lowestMatrixOffer = matrixOffers[0] ?? getBestOffer(matrixProduct, true);
  const lowestMatrixLanded = getOfferLandedPrice(lowestMatrixOffer);
  const avgMatrixLanded = useMemo(() => {
    if (matrixOffers.length === 0) return lowestMatrixLanded;
    const sum = matrixOffers.reduce((s, o) => s + getOfferLandedPrice(o), 0);
    return Math.round(sum / matrixOffers.length);
  }, [matrixOffers, lowestMatrixLanded]);

  // Screen 3: BOM & NEC calculations
  const bomSummary = useMemo(() => {
    let totalLanded = 0;
    let totalStorageWh = 0;
    let totalSolarWatts = 0;
    let totalInverterWatts = 0;
    let maxVoc = 0;
    let ulCount = 0;

    const resolvedLines = buildItems
      .map((item) => {
        const product = catalog.find((p) => p.id === item.productId);
        if (!product) return null;
        const offer =
          product.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
          getBestOffer(product, true);
        const unitLanded = getOfferLandedPrice(offer);
        const lineTotal = unitLanded * item.quantity;
        totalLanded += lineTotal;
        if (product.specs.capacityWh) {
          totalStorageWh += product.specs.capacityWh * item.quantity;
        }
        if (product.category === 'panels' && product.specs.powerWatts) {
          totalSolarWatts += product.specs.powerWatts * item.quantity;
        }
        if (
          (product.category === 'inverters' || product.category === 'portable') &&
          product.specs.powerWatts
        ) {
          totalInverterWatts += product.specs.powerWatts * item.quantity;
        }
        if (product.specs.maxPvInputVoc && product.specs.maxPvInputVoc > maxVoc) {
          maxVoc = product.specs.maxPvInputVoc;
        }
        if (product.specs.certifications.some((c) => c.startsWith('UL'))) {
          ulCount += 1;
        }
        return { item, product, offer, unitLanded, lineTotal };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const bos = calculateBosRequirements(buildItems, catalog, 6);
    const bosCost = bos?.estimatedBosCost ?? 0;
    const grossProjectCost = totalLanded + bosCost;
    const federalCredit30 = Math.round(grossProjectCost * 0.3);
    const netCapitalRequired = Math.max(0, grossProjectCost - federalCredit30);
    const roi = computeBomLifecycleRoi(
      totalStorageWh,
      totalSolarWatts,
      totalInverterWatts,
      netCapitalRequired,
      preferredUtilityRate
    );

    return {
      resolvedLines,
      totalLanded,
      bos,
      bosCost,
      grossProjectCost,
      federalCredit30,
      netCapitalRequired,
      totalStorageWh,
      totalSolarWatts,
      totalInverterWatts,
      maxVoc: maxVoc || 500,
      ulCount,
      roi,
    };
  }, [buildItems, catalog, preferredUtilityRate]);

  // Apply interactive sliders directly to live buildItems
  const handleApplySlidersToBom = () => {
    const inverterId =
      inverterKwSlider >= 10 ? 'solark-15k-2p' : 'eg4-6000xp-inverter';
    const batteryCount = Math.max(1, Math.round(batteryKwhSlider / 5.12));
    const panelCount = Math.max(2, Math.round((pvKwSlider * 1000) / 440));
    onLoadStarterKit(inverterKwSlider >= 10 ? 'whole-home' : 'cabin-48v');
    window.setTimeout(() => {
      if (inverterId === 'eg4-6000xp-inverter') {
        onUpdateBuildQty('eg4-ll-s-48v-100ah', batteryCount);
        onUpdateBuildQty('canadian-solar-440w-bifacial', panelCount);
      }
    }, 40);
    onNotify(
      `Synced ${pvKwSlider.toFixed(1)} kW PV · ${inverterKwSlider} kW AC · ${batteryKwhSlider.toFixed(1)} kWh target into live BOM.`
    );
  };

  const handleExportNecSpecSheet = () => {
    const lines = [
      'SOLARBENCH_V1 — SEALED NEC 125% SPEC & BOM SHEET',
      `Generated: ${new Date().toISOString()}`,
      `Utility Rate Baseline: $${preferredUtilityRate.toFixed(2)}/kWh`,
      '',
      '--- SYSTEM ELECTRICAL PROFILE ---',
      `Storage Capacity: ${(bomSummary.totalStorageWh / 1000).toFixed(2)} kWh`,
      `Solar PV Array: ${(bomSummary.totalSolarWatts / 1000).toFixed(2)} kW`,
      `Inverter Output: ${(bomSummary.totalInverterWatts / 1000).toFixed(2)} kW`,
      `DC Bus Voltage: ${bomSummary.bos?.busVoltage ?? 48}V`,
      `NEC 125% Breaker / Class-T Fuse: ${bomSummary.bos?.necSizedBreakerAmps ?? 200}A`,
      `Recommended DC Feeder Cable: ${bomSummary.bos?.recommendedWireAwg ?? '2/0 AWG Copper'}`,
      `Voltage Drop Estimate: ${bomSummary.bos?.estimatedVoltageDropPct ?? 0.8}%`,
      `Transfer Switch Spec: ${bomSummary.bos?.transferSwitchSpec ?? '50A NEMA SS2-50P'}`,
      '',
      '--- BILL OF MATERIALS ---',
      ...bomSummary.resolvedLines.map(
        (l) =>
          `${l.item.quantity}x ${l.product.name} (${l.product.sku}) @ $${l.unitLanded.toLocaleString()} via ${l.offer.merchantName} = $${l.lineTotal.toLocaleString()}`
      ),
      '',
      '--- FINANCIAL ROI & SEC. 25D ---',
      `Hardware Landed Subtotal: $${bomSummary.totalLanded.toLocaleString()}`,
      `Estimated NEC BOS Parts: $${bomSummary.bosCost.toLocaleString()}`,
      `Gross Project Investment: $${bomSummary.grossProjectCost.toLocaleString()}`,
      `Sec. 25D Federal Credit (30%): -$${bomSummary.federalCredit30.toLocaleString()}`,
      `Net Capital Required: $${bomSummary.netCapitalRequired.toLocaleString()}`,
      `Estimated Payback: ${bomSummary.roi ? (bomSummary.roi.paybackMonths / 12).toFixed(1) : 'N/A'} years`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solarbench-v1-nec-bom-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify('Downloaded Sealed NEC 125% Spec & BOM Sheet.');
  };

  const handleArmWatchdogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(watchdogTargetPrice);
    const prod = catalog.find((p) => p.id === watchdogProductId);
    if (!prod || !Number.isFinite(target) || target <= 0) {
      onNotify('Enter a valid positive target price.');
      return;
    }
    setArmingWatchdog(true);
    try {
      await onCreateAlert(prod, Math.round(target));
    } finally {
      setArmingWatchdog(false);
    }
  };

  const handleJumpToMatrixSku = (productId: string) => {
    setMatrixProductId(productId);
    setActiveTab('store-matrix');
    if (showAllScroll) {
      document
        .getElementById('v1-store-matrix')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const showSection = (tab: V1WorkspaceTab) =>
    showAllScroll || activeTab === tab;

  const healthScore = autonomousStatus?.overallHealthScore ?? 100;
  const autopilotEnabled = autonomousStatus?.autopilotEnabled ?? true;
  const checksByAgentId = useMemo(() => {
    const map = new Map<
      string,
      AutonomousSwarmStatus['checks'][number]
    >();
    for (const c of autonomousStatus?.checks ?? []) {
      map.set(c.agentId, c);
    }
    return map;
  }, [autonomousStatus]);

  return (
    <div className="min-h-screen flex flex-col bg-[#080D18] text-slate-100 pb-20 md:pb-0">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#0B1220]/95 backdrop-blur border-b border-slate-800/90">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => {
              setActiveTab('bench');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 hover:text-amber-400 transition-colors"
          >
            SolarBench_v1
          </button>

          <nav
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
            aria-label="SolarBench_v1 Workspaces"
          >
            {(
              [
                ['bench', 'Bench'],
                ['store-matrix', '10-Store Matrix'],
                ['bom-nec', 'BOM & NEC'],
                ['swarm', '15-Agent Swarm'],
                ['growth', 'Growth Hub'],
              ] as [V1WorkspaceTab, string][]
            ).map(([id, label]) => {
              const isActive = !showAllScroll && activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    if (showAllScroll) {
                      document
                        .getElementById(`v1-${id}`)
                        ?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
                    isActive
                      ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenScorecard}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              Compare v0 vs v1
            </button>
          </div>
        </div>
      </header>

      {/* Edition Switcher & Workspace Layout Toolbar (Below Header) */}
      <div className="bg-[#0D1526] border-b border-slate-800/80">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-700/80"
              role="group"
              aria-label="Edition Switcher"
            >
              <button
                type="button"
                onClick={onSwitchToV0}
                className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap"
              >
                SolarBench (Light)
              </button>
              <button
                type="button"
                className="px-3 py-1 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 whitespace-nowrap"
              >
                SolarBench_v1 (Stitch)
              </button>
            </div>

            <span className="hidden sm:inline text-slate-400">
              Stitch Project #1151634046896588888 · Live Backend Synced
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllScroll((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-colors whitespace-nowrap ${
                showAllScroll
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {showAllScroll ? 'All 5 Views Stacked' : 'Focused Workspace View'}
            </button>

            <button
              type="button"
              onClick={() => onOpenAlertsModal()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-500/60 transition-colors whitespace-nowrap tabular-nums"
            >
              <BellRing className="w-3.5 h-3.5 text-amber-400" />
              Alerts ({priceAlerts.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* ================================================================
            SCREEN 1: BENCH OVERVIEW (Hero + Today's #1 Breakdown + Top-3 Advisor)
            ================================================================ */}
        {showSection('bench') && (
          <section id="v1-bench" className="space-y-8">
            {/* Hero Conversion + Today's #1 Breakdown Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 cols: Stitch Hero Conversion Block */}
              <div className="lg:col-span-7 rounded-2xl bg-[#0F172A] border border-slate-800 p-6 sm:p-8 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="text-amber-400 font-semibold">
                      HARDWARE TELEMETRY INDEX
                    </span>
                    <span aria-hidden="true">/</span>
                    <span>ITEM + LTL FREIGHT − COUPON</span>
                    <span aria-hidden="true">/</span>
                    <span className="text-emerald-400">
                      {autopilotEnabled
                        ? `15-Agent Fleet ${healthScore}%`
                        : 'Autopilot Paused'}
                    </span>
                  </div>

                  <h1 className="font-display text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-white leading-[1.08] [text-wrap:balance]">
                    Stop overpaying on solar &amp; backup hardware.
                  </h1>

                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                    Verified landed cost arithmetic across 10+ marketplaces and
                    tier-1 solar distributors—pairing real LTL liftgate freight,
                    IRS Sec. 25D 30% credit math, and NEC 125% BOS sizing.
                  </p>

                  {/* Stitch Hero CTA Stack */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        document
                          .getElementById('v1-top3-advisor')
                          ?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                    >
                      <Zap className="w-4 h-4" />
                      Top-3 Purpose Advisor
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('store-matrix')}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[#131F35] border border-slate-700 text-slate-100 hover:border-amber-500/60 transition-colors whitespace-nowrap"
                    >
                      <Store className="w-4 h-4 text-cyan-400" />
                      10-Store Matrix
                    </button>

                    <button
                      type="button"
                      onClick={onOpenRoiModal}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[#131F35] border border-slate-700 text-slate-100 hover:border-emerald-500/60 transition-colors whitespace-nowrap"
                    >
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      Landed ROI Calc
                    </button>
                  </div>
                </div>

                {/* 3-Column KPI Strip (Stitch Screen 1) */}
                <div className="grid grid-cols-3 gap-4 pt-5 border-t border-slate-800">
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      AUDITED SKUS
                    </div>
                    <div className="font-mono text-xl sm:text-2xl font-bold text-white mt-0.5 tabular-nums">
                      {catalog.length} SKUs
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Tier-1 LFP &amp; Inverters
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      LIVE STORES
                    </div>
                    <div className="font-mono text-xl sm:text-2xl font-bold text-cyan-400 mt-0.5 tabular-nums">
                      {totalOfferCount}+ Feeds
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Freight + Coupon Net
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      SWARM QA
                    </div>
                    <div className="font-mono text-xl sm:text-2xl font-bold text-emerald-400 mt-0.5 tabular-nums">
                      15 Agents
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {autonomousStatus?.totalCyclesCompleted ?? 1} Sweeps Verified
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 5 cols: Today's #1 Benchmark Breakdown (Live MP4 Video) */}
              <div className="lg:col-span-5 rounded-2xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono font-semibold text-amber-400">
                    TODAY&apos;S #1 BENCHMARK BREAKDOWN
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    BENCH VERIFIED
                  </span>
                </div>

                <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video relative">
                  {currentVideo?.videoUrl ? (
                    <video
                      key={currentVideo.videoUrl}
                      src={currentVideo.videoUrl}
                      poster={currentVideoProduct.image}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <HardwareImage
                      src={currentVideoProduct.image}
                      alt={currentVideoProduct.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-white leading-snug">
                      {currentVideo?.campaignHeadline ??
                        `${currentVideoProduct.name}: Verified Landed Breakdown`}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {currentVideo
                        ? `${currentVideo.dateKey} · Best Offer $${currentVideo.lowestLandedPrice.toLocaleString()} at ${currentVideo.bestPlatform}`
                        : currentVideoProduct.summarySpec}
                    </p>
                  </div>

                  {/* 3-stat telemetry strip matching Stitch Video Card */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-[10px] text-slate-400">UNIT COST</div>
                      <div className="text-amber-400 font-bold">
                        $
                        {getUnitMetricValue(currentVideoProduct, true).toFixed(2)}{' '}
                        {currentVideoProduct.unitMetricType}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">EFFICIENCY</div>
                      <div className="text-cyan-400 font-bold">
                        {currentVideoProduct.specs.efficiencyPct}%
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">WARRANTY</div>
                      <div className="text-emerald-400 font-bold">
                        {currentVideoProduct.specs.warrantyYears} Yrs OEM
                      </div>
                    </div>
                  </div>

                  {/* Previous Audit Episodes Selector */}
                  {dailyVideos.length > 1 && (
                    <div className="pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                        <span className="font-mono">PREVIOUS AUDIT EPISODES</span>
                        <span>{dailyVideos.length} Archived</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {dailyVideos.slice(0, 5).map((vid, idx) => (
                          <button
                            key={vid.dateKey}
                            type="button"
                            onClick={() => setActiveVideoIndex(idx)}
                            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-left text-[11px] border transition-colors ${
                              idx === activeVideoIndex
                                ? 'bg-amber-500/15 border-amber-500/60 text-amber-300'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-mono font-semibold">
                              <Play className="w-3 h-3" />
                              {vid.dateKey.slice(5)}
                            </div>
                            <div className="truncate max-w-[115px] text-[10px] text-slate-400">
                              {vid.sku}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top-3 Purpose Advisor (Stitch Landed Arithmetic Cards) */}
            <div id="v1-top3-advisor" className="space-y-5">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-amber-400 font-semibold">
                    TOP-3 PURPOSE ADVISOR · LANDED ARITHMETIC VERIFIED
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white mt-1">
                    {PURPOSE_LABELS[selectedPurpose]}
                  </h2>
                </div>

                {/* Interactive Purpose Filter Buttons */}
                <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-[#0F172A] border border-slate-800">
                  {PURPOSE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedPurpose(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                        selectedPurpose === tab.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {topThreePicks.map((rec, idx) => {
                  const p = rec.product;
                  const best = rec.bestOffer;
                  const savingsVsMsrp = Math.max(0, p.msrp - rec.landed);
                  const sec25DEligible = isSec25DEligible(p);
                  const sec25DNet = getEffectiveNetPrice(p, rec.landed, true, 0);
                  const rankTitles = [
                    '#1 BEST VALUE',
                    '#2 MAX CAPACITY',
                    '#3 BUDGET / PERFORMANCE',
                  ];
                  const isCompared = compareIds.includes(p.id);

                  return (
                    <article
                      key={p.id}
                      className={`rounded-2xl bg-[#0F172A] border p-5 flex flex-col justify-between gap-4 ${
                        idx === 0
                          ? 'border-amber-500/60'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span
                            className={`font-bold ${
                              idx === 0 ? 'text-amber-400' : 'text-cyan-400'
                            }`}
                          >
                            {rankTitles[idx]}
                          </span>
                          <span className="text-slate-400 tabular-nums">
                            Score {rec.score.toFixed(1)}/10 ·{' '}
                            {p.specs.warrantyYears}-Yr Wty
                          </span>
                        </div>

                        <div className="flex items-start gap-3.5">
                          <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shrink-0">
                            <HardwareImage
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-slate-400">
                              {p.brand} · {p.specs.certifications[0] ?? 'Bench Tested'}
                            </div>
                            <h3 className="font-display text-base font-bold text-white leading-snug mt-0.5">
                              {p.name}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {p.summarySpec}
                            </p>
                          </div>
                        </div>

                        {/* Stitch Explicit Landed Arithmetic Box */}
                        <div className="rounded-xl bg-[#09101D] border border-slate-800/90 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400">
                              LANDED ARITHMETIC ({best.merchantName})
                            </span>
                            {savingsVsMsrp > 0 && (
                              <span className="text-emerald-400 font-semibold tabular-nums">
                                SAVE ${savingsVsMsrp.toLocaleString()} OFF MSRP
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-center font-mono tabular-nums pt-1">
                            <div>
                              <div className="text-xs font-bold text-slate-100">
                                ${best.price.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                (Item)
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-200">
                                +${best.shipping.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                (Freight)
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-emerald-400">
                                -${(best.couponDiscount ?? 0).toLocaleString()}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                (Coupon)
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-amber-400">
                                ${rec.landed.toLocaleString()}
                              </div>
                              <div className="text-[10px] text-amber-400/80">
                                Net Landed
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="text-emerald-400">
                              {sec25DEligible
                                ? 'Sec. 25D Net (30% Credit)'
                                : 'Normalized Unit Cost'}
                            </span>
                            <span className="font-bold text-emerald-300">
                              {sec25DEligible
                                ? `$${sec25DNet.toLocaleString()}`
                                : `$${rec.metric.toFixed(2)} ${p.unitMetricType}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer */}
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => handleJumpToMatrixSku(p.id)}
                          className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold bg-[#131F35] border border-slate-700 text-slate-100 hover:border-amber-500/70 hover:text-amber-300 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          <Store className="w-3.5 h-3.5 text-amber-400" />
                          View 10-Store Landed Matrix
                        </button>

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => onInspectProduct(p)}
                            className="py-2 px-2 rounded-lg text-[11px] font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                          >
                            Teardown
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleCompare(p.id)}
                            className={`py-2 px-2 rounded-lg text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                              isCompared
                                ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isCompared ? 'Compared' : 'Compare'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToBuild(p.id, best.merchantId)}
                            className="py-2 px-2 rounded-lg text-[11px] font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
                          >
                            + BOM
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            SCREEN 2: 10-STORE LANDED MATRIX (Spread Bar + LTL Trap + Ranked 1-10)
            ================================================================ */}
        {showSection('store-matrix') && (
          <section id="v1-store-matrix" className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-cyan-400 font-semibold">
                  CROSS-PLATFORM ARBITRAGE ENGINE
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  {matrixProduct.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {matrixProduct.brand} · SKU {matrixProduct.sku} ·{' '}
                  {matrixProduct.summarySpec}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="v1-sku-select">
                  Select hardware SKU
                </label>
                <select
                  id="v1-sku-select"
                  value={matrixProductId}
                  onChange={(e) => setMatrixProductId(e.target.value)}
                  className="bg-[#0F172A] border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {catalog.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} — {p.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onInspectProduct(matrixProduct)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-500/60 transition-colors whitespace-nowrap"
                >
                  Full Spec Teardown
                </button>
              </div>
            </div>

            {/* Quick SKU Selector Strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_MATRIX_IDS.map((pid) => {
                const prod = catalog.find((p) => p.id === pid);
                if (!prod) return null;
                const active = pid === matrixProductId;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setMatrixProductId(pid)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold border whitespace-nowrap shrink-0 transition-colors ${
                      active
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-[#0F172A] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {prod.name.split(' ').slice(0, 3).join(' ')}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Landed Formula + LTL Trap Warning + 90-Day Spread Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-5 rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-semibold">
                    DYNAMIC LANDED FORMULA
                  </span>
                  <span className="text-emerald-400">
                    {matrixArbitrage.buySignal}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center font-mono tabular-nums bg-[#09101D] border border-slate-800 rounded-xl p-3">
                  <div>
                    <div className="text-[10px] text-slate-400">BASE</div>
                    <div className="text-sm font-bold text-white">
                      ${lowestMatrixOffer.price.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">FREIGHT</div>
                    <div className="text-sm font-bold text-slate-200">
                      +${lowestMatrixOffer.shipping.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">COUPON</div>
                    <div className="text-sm font-bold text-emerald-400">
                      -${(lowestMatrixOffer.couponDiscount ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-400">NET LANDED</div>
                    <div className="text-sm font-bold text-amber-400">
                      ${lowestMatrixLanded.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 flex items-start gap-2.5 text-xs text-amber-100">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-amber-300">
                      LTL Freight &amp; Liftgate Audit:
                    </strong>{' '}
                    Heavy solar equipment ({matrixProduct.specs.weightLbs} lbs)
                    often hides $150–$450 residential liftgate fees. SolarBench_v1
                    normalizes freight and verified coupons before ranking #1.
                  </p>
                </div>
              </div>

              {/* 90-Day Landed Spread Visualizer */}
              <div className="lg:col-span-7 rounded-2xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono text-slate-400">
                      90-DAY LANDED PRICE SPREAD
                    </div>
                    <div className="font-mono text-lg font-bold text-white tabular-nums mt-0.5">
                      Current Lowest: ${lowestMatrixLanded.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs tabular-nums">
                    <div className="text-slate-400">
                      Store Avg: ${avgMatrixLanded.toLocaleString()}
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      Spread: -${matrixArbitrage.spreadDollar.toLocaleString()} (
                      {matrixArbitrage.spreadPct}%)
                    </div>
                  </div>
                </div>

                {/* Progress Range Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono tabular-nums">
                    <span className="text-emerald-400">
                      90D LOW ${matrixArbitrage.low90d.toLocaleString()}
                    </span>
                    <span className="text-slate-400">
                      Percentile: {matrixArbitrage.percentile90d}%
                    </span>
                    <span className="text-rose-400">
                      90D HIGH ${matrixArbitrage.high90d.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-400 to-amber-500 rounded-full transition-all"
                      style={{
                        width: `${Math.max(8, Math.min(100, matrixArbitrage.percentile90d))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Sort & Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        ['price', 'Lowest Price'],
                        ['authorized', 'Authorized OEM'],
                        ['fastest', 'Fastest Lead'],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMatrixSort(id)}
                        className={`px-2.5 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap ${
                          matrixSort === id
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-slate-300">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matrixInStockOnly}
                        onChange={(e) => setMatrixInStockOnly(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span>In Stock Only</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matrixAuthorizedOnly}
                        onChange={(e) =>
                          setMatrixAuthorizedOnly(e.target.checked)
                        }
                        className="accent-amber-500"
                      />
                      <span>OEM Authorized</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matrixIncludeRefurb}
                        onChange={(e) =>
                          setMatrixIncludeRefurb(e.target.checked)
                        }
                        className="accent-amber-500"
                      />
                      <span>Include Refurb</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Ranked 1–10 Store Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* #1 Featured Lowest Landed Pick (Left 5 cols) */}
              <div className="lg:col-span-5 rounded-2xl bg-[#111C30] border-2 border-amber-500/70 p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-amber-400 font-bold">
                      #1 LOWEST LANDED PICK
                    </div>
                    <h3 className="font-display text-xl font-bold text-white mt-0.5">
                      {lowestMatrixOffer.merchantName}
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {lowestMatrixOffer.channel} · {lowestMatrixOffer.leadTime}{' '}
                      · {lowestMatrixOffer.returnWindow}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-mono font-semibold ${
                      lowestMatrixOffer.inStock
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {lowestMatrixOffer.inStock ? 'IN STOCK' : 'BACKORDER'}
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono tabular-nums pt-2 border-t border-slate-800">
                  <div className="flex justify-between text-slate-300">
                    <span>Catalog Item Price</span>
                    <span>${lowestMatrixOffer.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Freight &amp; Liftgate Shipping</span>
                    <span>
                      {lowestMatrixOffer.shipping === 0
                        ? 'FREE'
                        : `+$${lowestMatrixOffer.shipping.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Verified Promo Savings</span>
                    <span>
                      -$
                      {(lowestMatrixOffer.couponDiscount ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {extractPromoCode(lowestMatrixOffer) && (
                  <button
                    type="button"
                    onClick={() =>
                      onCopyPromoCode(
                        extractPromoCode(lowestMatrixOffer)!,
                        lowestMatrixOffer.merchantName
                      )
                    }
                    className="w-full py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between hover:bg-emerald-500/20 transition-colors"
                  >
                    <span>
                      Promo Code: {extractPromoCode(lowestMatrixOffer)}
                    </span>
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}

                <div className="pt-3 border-t border-slate-800 flex items-end justify-between">
                  <div>
                    <div className="text-[11px] font-mono text-slate-400">
                      TRUE LANDED COST
                    </div>
                    <div className="text-xs text-emerald-400">
                      Saves $
                      {Math.max(0, avgMatrixLanded - lowestMatrixLanded).toLocaleString()}{' '}
                      vs. store avg
                    </div>
                  </div>
                  <div className="font-mono text-3xl font-bold text-amber-400 tabular-nums">
                    ${lowestMatrixLanded.toLocaleString()}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      onAddToBuild(
                        matrixProduct.id,
                        lowestMatrixOffer.merchantId
                      )
                    }
                    className="py-3 px-4 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Add #1 Deal to BOM
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAlertsModal(matrixProduct.id)}
                    className="py-3 px-4 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-500/60 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-400" />
                    Watch Price Drop
                  </button>
                </div>
              </div>

              {/* Remaining Ranked Stores #2..#10 (Right 7 cols) */}
              <div className="lg:col-span-7 space-y-2.5">
                {matrixOffers.slice(1).map((offer, idx) => {
                  const landed = getOfferLandedPrice(offer);
                  const delta = Math.max(0, landed - lowestMatrixLanded);
                  const promoCode = extractPromoCode(offer);
                  return (
                    <div
                      key={offer.merchantId}
                      className="rounded-xl bg-[#0F172A] border border-slate-800 hover:border-slate-700 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-slate-300 flex items-center justify-center shrink-0">
                          {idx + 2}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-white">
                              {offer.merchantName}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {offer.condition} ·{' '}
                              {offer.isAuthorizedDealer
                                ? 'OEM Authorized'
                                : '3P Marketplace'}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
                            Item ${offer.price.toLocaleString()} + Freight $
                            {offer.shipping.toLocaleString()}
                            {offer.couponDiscount
                              ? ` − Promo $${offer.couponDiscount}`
                              : ''}{' '}
                            · {offer.leadTime}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-right font-mono tabular-nums">
                          <div className="text-base font-bold text-white">
                            ${landed.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {delta === 0 ? 'Tied #1' : `+$${delta} vs #1`}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {promoCode && (
                            <button
                              type="button"
                              onClick={() =>
                                onCopyPromoCode(promoCode, offer.merchantName)
                              }
                              title={`Copy ${promoCode}`}
                              className="p-2 rounded-lg bg-slate-900 border border-slate-700 text-emerald-400 hover:border-emerald-500/60"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              onAddToBuild(matrixProduct.id, offer.merchantId)
                            }
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#131F35] border border-slate-700 text-slate-200 hover:border-amber-500/70 hover:text-amber-300 transition-colors whitespace-nowrap"
                          >
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            SCREEN 3: BOM MATRIX, SYSTEM PARAMETER ENGINE & NEC 125% COMPLIANCE
            ================================================================ */}
        {showSection('bom-nec') && (
          <section id="v1-bom-nec" className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-xs font-mono text-cyan-400 font-semibold">
                  DIRECT TELEMETRY &amp; ELECTRICAL COMPLIANCE
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                  BOM Matrix &amp; Automated NEC 125% Engine
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onOptimizeBuild(true)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#131F35] border border-slate-700 text-slate-100 hover:border-emerald-500/60 transition-colors whitespace-nowrap"
                >
                  Optimize to Authorized OEM
                </button>
                <button
                  type="button"
                  onClick={() => onLoadStarterKit('whole-home')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#131F35] border border-slate-700 text-slate-100 hover:border-cyan-500/60 transition-colors whitespace-nowrap"
                >
                  Load Whole-Home Kit
                </button>
                <button
                  type="button"
                  onClick={() => onLoadStarterKit('cabin-48v')}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#131F35] border border-slate-700 text-slate-100 hover:border-amber-500/60 transition-colors whitespace-nowrap"
                >
                  Load 48V Cabin Kit
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 6 cols: System Parameter Engine + Active BOM Items */}
              <div className="lg:col-span-6 space-y-5">
                {/* Electrical Profile Header Card */}
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-cyan-400 font-semibold">
                      SYSTEM PARAMETER ENGINE
                    </span>
                    <span className="text-emerald-400">REAL-TIME SIZING</span>
                  </div>

                  {/* Interactive Sliders matching Stitch Screen 4 */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">PV Array Capacity</span>
                        <span className="text-cyan-400 font-bold tabular-nums">
                          {pvKwSlider.toFixed(1)} kW DC
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1.6}
                        max={20}
                        step={0.4}
                        value={pvKwSlider}
                        onChange={(e) => setPvKwSlider(Number(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">
                          Continuous AC Inverter
                        </span>
                        <span className="text-cyan-400 font-bold tabular-nums">
                          {inverterKwSlider} kW AC
                        </span>
                      </div>
                      <input
                        type="range"
                        min={3}
                        max={18}
                        step={1}
                        value={inverterKwSlider}
                        onChange={(e) =>
                          setInverterKwSlider(Number(e.target.value))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">
                          LiFePO4 Energy Bank
                        </span>
                        <span className="text-cyan-400 font-bold tabular-nums">
                          {batteryKwhSlider.toFixed(1)} kWh
                        </span>
                      </div>
                      <input
                        type="range"
                        min={5.1}
                        max={45}
                        step={5.1}
                        value={batteryKwhSlider}
                        onChange={(e) =>
                          setBatteryKwhSlider(Number(e.target.value))
                        }
                        className="w-full accent-cyan-400"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleApplySlidersToBom}
                      className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold bg-cyan-500/15 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/25 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Sync Slider Targets into Active BOM
                    </button>
                  </div>

                  {/* Active Electrical Readouts */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-xs font-mono tabular-nums">
                    <div>
                      <div className="text-[10px] text-slate-400">
                        ACTIVE STORAGE
                      </div>
                      <div className="text-base font-bold text-white mt-0.5">
                        {(bomSummary.totalStorageWh / 1000).toFixed(2)} kWh
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">
                        SOLAR ARRAY
                      </div>
                      <div className="text-base font-bold text-cyan-400 mt-0.5">
                        {(bomSummary.totalSolarWatts / 1000).toFixed(2)} kW
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">
                        UL CERTIFIED
                      </div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">
                        {bomSummary.ulCount}/{bomSummary.resolvedLines.length} SKUs
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active BOM Lines */}
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-white">
                      Active Bill of Materials ({bomSummary.resolvedLines.length})
                    </h3>
                    <span className="text-xs font-mono text-amber-400 tabular-nums">
                      ${bomSummary.totalLanded.toLocaleString()} Hardware
                    </span>
                  </div>

                  {bomSummary.resolvedLines.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                      Your BOM is empty. Load a starter kit above or add items
                      from the 10-Store Matrix.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {bomSummary.resolvedLines.map((line) => (
                        <div
                          key={line.item.productId}
                          className="rounded-xl bg-[#09101D] border border-slate-800 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {line.product.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              {line.offer.merchantName} · $
                              {line.unitLanded.toLocaleString()} ea
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <div className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateBuildQty(
                                    line.item.productId,
                                    Math.max(1, line.item.quantity - 1)
                                  )
                                }
                                className="px-2 py-1 text-slate-300 hover:text-white"
                              >
                                -
                              </button>
                              <span className="px-2 py-1 text-white tabular-nums">
                                {line.item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateBuildQty(
                                    line.item.productId,
                                    line.item.quantity + 1
                                  )
                                }
                                className="px-2 py-1 text-slate-300 hover:text-white"
                              >
                                +
                              </button>
                            </div>

                            <div className="w-20 text-right font-mono text-xs font-bold text-amber-400 tabular-nums">
                              ${line.lineTotal.toLocaleString()}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onRemoveBuildItem(line.item.productId)
                              }
                              aria-label={`Remove ${line.product.name}`}
                              className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 6 cols: Automated NEC Compliance Engine + Financial ROI (IRS Form 5695) */}
              <div className="lg:col-span-6 space-y-5">
                {/* Automated NEC 125% Compliance Engine */}
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-mono text-cyan-400 font-semibold">
                        AUTOMATED NEC COMPLIANCE ENGINE
                      </div>
                      <h3 className="font-display text-lg font-bold text-white mt-0.5">
                        NEC 690.8 / 705.60 · 125% Continuous Duty
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      125% MULTIPLIER
                    </span>
                  </div>

                  {bomSummary.bos ? (
                    <div className="divide-y divide-slate-800 text-xs">
                      <div className="py-2.5 flex justify-between gap-3">
                        <span className="text-slate-400">
                          Battery Inverter Feeders (Copper)
                        </span>
                        <span className="font-mono font-semibold text-white text-right">
                          {bomSummary.bos.recommendedWireAwg}
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between gap-3">
                        <span className="text-slate-400">
                          Primary Overcurrent (OCPD / Class-T)
                        </span>
                        <span className="font-mono font-semibold text-cyan-300 tabular-nums">
                          {bomSummary.bos.necSizedBreakerAmps}A @{' '}
                          {bomSummary.bos.busVoltage}V DC
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between gap-3">
                        <span className="text-slate-400">
                          Calculated DC Voltage Drop (6ft run)
                        </span>
                        <span className="font-mono font-semibold text-emerald-400 tabular-nums">
                          {bomSummary.bos.estimatedVoltageDropPct}% (&lt;2.0% Limit)
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between gap-3">
                        <span className="text-slate-400">
                          PV String Inline Fuse Protection
                        </span>
                        <span className="font-mono font-semibold text-white tabular-nums">
                          {bomSummary.bos.pvStringFuseAmps}A MC4 Inline
                        </span>
                      </div>
                      <div className="py-2.5 flex justify-between gap-3">
                        <span className="text-slate-400">
                          AC Disconnect / Transfer Switch
                        </span>
                        <span className="font-mono font-semibold text-white text-right">
                          {bomSummary.bos.transferSwitchSpec}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      Add at least 1 hardware SKU to compute NEC 125% sizing.
                    </p>
                  )}
                </div>

                {/* Financial ROI & IRS Form 5695 Federal Credit */}
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono text-emerald-400 font-semibold">
                        FINANCIAL ROI &amp; FEDERAL CREDIT
                      </div>
                      <h3 className="font-display text-lg font-bold text-white mt-0.5">
                        IRS Form 5695 Residential Clean Energy
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400 tabular-nums">
                      ${preferredUtilityRate.toFixed(2)}/kWh
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-mono tabular-nums">
                    <div className="flex justify-between text-slate-300">
                      <span>Hardware Landed Subtotal</span>
                      <span>${bomSummary.totalLanded.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Estimated NEC BOS &amp; Wiring</span>
                      <span>+${bomSummary.bosCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white font-semibold pt-1.5 border-t border-slate-800">
                      <span>Gross Project Investment</span>
                      <span>
                        ${bomSummary.grossProjectCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Section 25D Clean Energy Credit (30%)</span>
                      <span>
                        -${bomSummary.federalCredit30.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-baseline justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      NET CAPITAL REQUIRED
                    </span>
                    <span className="font-mono text-3xl font-bold text-amber-400 tabular-nums">
                      ${bomSummary.netCapitalRequired.toLocaleString()}
                    </span>
                  </div>

                  {bomSummary.roi && (
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="rounded-xl bg-[#09101D] border border-slate-800 p-3">
                        <div className="text-[10px] font-mono text-slate-400">
                          SIMPLE PAYBACK
                        </div>
                        <div className="font-mono text-lg font-bold text-cyan-400 tabular-nums mt-0.5">
                          {(bomSummary.roi.paybackMonths / 12).toFixed(1)} Yrs
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#09101D] border border-slate-800 p-3">
                        <div className="text-[10px] font-mono text-slate-400">
                          5-YR UTILITY SAVINGS
                        </div>
                        <div className="font-mono text-lg font-bold text-emerald-400 tabular-nums mt-0.5">
                          ${bomSummary.roi.fiveYearUtilitySavings.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handleExportNecSpecSheet}
                      className="py-3 px-4 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Export Sealed NEC Spec BOM
                    </button>
                    <button
                      type="button"
                      onClick={onOpenRoiModal}
                      className="py-3 px-4 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-100 hover:border-emerald-500/60 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Calculator className="w-4 h-4 text-emerald-400" />
                      Open 10-Yr ROI Modal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            SCREEN 4: 15-AGENT SWARM COMMAND CENTER (Tier 0 CEO -> Tier 1 Aria -> 14 Specialists)
            ================================================================ */}
        {showSection('swarm') && (
          <section id="v1-swarm" className="space-y-6">
            {/* Swarm Telemetry Header Strip */}
            <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="space-y-1">
                <div className="text-xs font-mono text-amber-400 font-semibold">
                  AUTONOMOUS HARDWARE INTELLIGENCE DECK
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                  1 Human CEO + 15-Agent Swarm Command
                </h2>
                <p className="text-xs text-slate-400">
                  {autonomousStatus?.summaryText ??
                    'Chief of Staff Aria coordinates 14 specialist agents on 15-minute autonomous patrols.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="font-mono text-right tabular-nums">
                  <div className="text-[10px] text-slate-400">FLEET HEALTH</div>
                  <div className="text-xl font-bold text-emerald-400">
                    {healthScore}%
                  </div>
                </div>
                <div className="font-mono text-right tabular-nums">
                  <div className="text-[10px] text-slate-400">CYCLES</div>
                  <div className="text-xl font-bold text-cyan-400">
                    {autonomousStatus?.totalCyclesCompleted ?? 0}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleAutopilot(!autopilotEnabled)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold border transition-colors whitespace-nowrap ${
                    autopilotEnabled
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  Autopilot: {autopilotEnabled ? '24/7 ACTIVE' : 'PAUSED'}
                </button>

                <button
                  type="button"
                  disabled={isSweepingAutonomous}
                  onClick={onTriggerAutonomousSweep}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition-colors whitespace-nowrap"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${
                      isSweepingAutonomous ? 'animate-spin' : ''
                    }`}
                  />
                  {isSweepingAutonomous
                    ? 'Sweeping 15 Agents...'
                    : 'Run 15-Agent Sweep'}
                </button>
              </div>
            </div>

            {/* Tier 0 Human CEO + Tier 1 Aria */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="rounded-2xl bg-[#111C30] border border-amber-500/50 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-amber-400 font-bold">
                    TIER 0 · HUMAN CEO
                  </span>
                  <span className="text-amber-300">FINAL ARBITRATION</span>
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  System Architect &amp; Override Authority
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Robots audit prices, MP4 videos, UL permits, and SEO briefs
                  autonomously—you hold final capital allocation and sweep
                  authority.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!ceoDirective.trim()) {
                      onTriggerAutonomousSweep();
                      return;
                    }
                    onNotify(
                      `CEO Directive logged to Agent #01 Aria: "${ceoDirective.trim()}"`
                    );
                    setCeoDirective('');
                    onTriggerAutonomousSweep();
                  }}
                  className="flex gap-2 pt-1"
                >
                  <input
                    type="text"
                    value={ceoDirective}
                    onChange={(e) => setCeoDirective(e.target.value)}
                    placeholder="Issue CEO directive to Aria (triggers live sweep)..."
                    className="flex-1 bg-[#09101D] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 whitespace-nowrap"
                  >
                    Dispatch
                  </button>
                </form>
              </div>

              <div className="rounded-2xl bg-[#0F172A] border border-cyan-500/40 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold">
                    TIER 1 · AGENT #01 ARIA
                  </span>
                  <span className="text-emerald-400">CHIEF OF STAFF</span>
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  Swarm Orchestrator &amp; Quorum Validator
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dispatches recursive sweeps across all 14 specialists, verifies
                  daily MP4 assets (`
                  {autonomousStatus?.healthyVideoCount ?? 6}/
                  {autonomousStatus?.videoArchiveCount ?? 6}` healthy), and
                  publishes daily SEO briefs (`
                  {autonomousStatus?.growthBriefsCount ?? growthBriefs.length}`
                  stored).
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 pt-1 tabular-nums">
                  <span>
                    Last Sweep:{' '}
                    {autonomousStatus?.lastRunAtIso
                      ? new Date(
                          autonomousStatus.lastRunAtIso
                        ).toLocaleTimeString()
                      : 'Ready'}
                  </span>
                  <span>
                    Catalog: {autonomousStatus?.catalogSkuCount ?? catalog.length}{' '}
                    SKUs
                  </span>
                </div>
              </div>
            </div>

            {/* Tier 2: 14 Specialist Micro-Agents Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {SOLAR_SWARM_AGENTS.filter((a) => a.agentNumber >= 2).map(
                (agent) => {
                  const liveCheck = checksByAgentId.get(agent.agentId);
                  const status = liveCheck?.status ?? 'pass';
                  return (
                    <div
                      key={agent.agentId}
                      className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-slate-400">
                          #{String(agent.agentNumber).padStart(2, '0')}{' '}
                          {agent.name}
                        </span>
                        <span
                          className={
                            status === 'warn'
                              ? 'text-amber-400 font-semibold'
                              : status === 'healed'
                              ? 'text-cyan-400 font-semibold'
                              : 'text-emerald-400 font-semibold'
                          }
                        >
                          {status.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-white">
                          {agent.roleTitle}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {liveCheck?.detail ?? agent.ownedFeature}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono tabular-nums">
                        <span className="text-cyan-300 truncate">
                          {liveCheck?.metricValue ?? `${agent.defaultAccuracy}% SLA`}
                        </span>
                        <span className="text-slate-500">
                          {agent.defaultLatencyMs}ms
                        </span>
                      </div>
                    </div>
                  );
                }
              )}
            </div>

            {/* Real Backend Agent Telemetry Log */}
            <div className="rounded-2xl bg-[#09101D] border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-cyan-400 font-semibold">
                  LIVE AGENT AUDIT STREAM (VERIFIED SERVER TELEMETRY)
                </span>
                <span className="text-slate-400">
                  {autonomousStatus?.checks.length ?? 0} Active Checks
                </span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px] max-h-56 overflow-y-auto pr-1">
                {(autonomousStatus?.checks ?? []).length === 0 ? (
                  <div className="text-slate-400">
                    Click &quot;Run 15-Agent Sweep&quot; above to stream fresh
                    verification entries from the backend daemon.
                  </div>
                ) : (
                  (autonomousStatus?.checks ?? []).map((entry) => (
                    <div
                      key={`${entry.agentId}-${entry.checkedAtIso}`}
                      className="flex flex-wrap sm:flex-nowrap items-baseline gap-2 text-slate-300 py-1 border-b border-slate-900"
                    >
                      <span className="text-slate-500 shrink-0 tabular-nums">
                        [{new Date(entry.checkedAtIso).toLocaleTimeString()}]
                      </span>
                      <span className="text-amber-400 font-semibold shrink-0">
                        #{String(entry.agentNumber).padStart(2, '0')}{' '}
                        {entry.agentName}:
                      </span>
                      <span className="text-slate-200 flex-1">
                        {entry.detail}
                      </span>
                      <span className="text-emerald-400 shrink-0">
                        {entry.metricValue}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* ================================================================
            SCREEN 5: SEO & GROWTH HUB + TARGET PRICE WATCHDOG
            ================================================================ */}
        {showSection('growth') && (
          <section id="v1-growth" className="space-y-6">
            <div>
              <div className="text-xs font-mono text-emerald-400 font-semibold">
                DISTRIBUTION, WATCHDOG &amp; CLOUD TELEMETRY
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                SEO Growth Hub &amp; Automated Price Watchdog
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 6 cols: Automated Target Price Dispatch (Real Watchdog Form) */}
              <div className="lg:col-span-6 rounded-2xl bg-[#0F172A] border border-slate-800 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-amber-400 font-semibold">
                      AUTOMATED TARGET PRICE DISPATCH
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mt-0.5">
                      Arm Price Drop Watchdog
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenAlertsModal()}
                    className="text-xs font-mono text-cyan-400 hover:underline"
                  >
                    View 30d Charts ({priceAlerts.length})
                  </button>
                </div>

                <form onSubmit={handleArmWatchdogSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="v1-watchdog-sku"
                      className="block text-xs font-mono text-slate-400 mb-1.5"
                    >
                      TARGET HARDWARE SKU
                    </label>
                    <select
                      id="v1-watchdog-sku"
                      value={watchdogProductId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setWatchdogProductId(nextId);
                        const prod = catalog.find((p) => p.id === nextId);
                        if (prod) {
                          const best = getOfferLandedPrice(
                            getBestOffer(prod, true)
                          );
                          setWatchdogTargetPrice(
                            String(Math.round(best * 0.92))
                          );
                        }
                      }}
                      className="w-full bg-[#09101D] border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {catalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Current: $
                          {getOfferLandedPrice(
                            getBestOffer(p, true)
                          ).toLocaleString()}
                          )
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="v1-watchdog-price"
                        className="block text-xs font-mono text-slate-400 mb-1.5"
                      >
                        TARGET LANDED ($ USD)
                      </label>
                      <input
                        id="v1-watchdog-price"
                        type="number"
                        min={50}
                        max={25000}
                        value={watchdogTargetPrice}
                        onChange={(e) => setWatchdogTargetPrice(e.target.value)}
                        className="w-full bg-[#09101D] border border-slate-700 rounded-lg px-3 py-2.5 text-xs font-mono text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="rounded-lg bg-[#09101D] border border-slate-800 px-3 py-2 flex flex-col justify-center">
                      <div className="text-[10px] font-mono text-slate-400">
                        STORAGE SYNC
                      </div>
                      <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                        Firestore + 30d Chart
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={armingWatchdog}
                    className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    <BellRing className="w-4 h-4" />
                    {armingWatchdog
                      ? 'Arming Watchdog...'
                      : 'Arm Price Drop Watchdog'}
                  </button>
                </form>

                {/* Active Watchdogs */}
                {priceAlerts.length > 0 && (
                  <div className="pt-4 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] font-mono text-slate-400">
                      ACTIVE WATCHLIST ({priceAlerts.length})
                    </div>
                    {priceAlerts.slice(0, 4).map((al) => (
                      <div
                        key={al.alertId}
                        className="flex items-center justify-between text-xs bg-[#09101D] border border-slate-800 rounded-lg px-3 py-2"
                      >
                        <span className="text-slate-200 truncate pr-2">
                          {al.productName}
                        </span>
                        <span className="font-mono text-amber-400 font-semibold tabular-nums shrink-0">
                          Target ${al.targetPrice.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 6 cols: Autonomous SEO Briefs, Social Cards & Infrastructure Status */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono text-cyan-400 font-semibold">
                      AUTONOMOUS SEO BRIEFS &amp; OUTBOUND CLICKS
                    </div>
                    <span className="text-xs font-mono text-emerald-400 tabular-nums">
                      {clickSummary.totalClicks} Tracked Clicks
                    </span>
                  </div>

                  {growthBriefs.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No autonomous briefs recorded yet—trigger a 15-agent sweep
                      to auto-publish today&apos;s daily digest.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {growthBriefs.slice(0, 3).map((brief) => (
                        <div
                          key={brief.id}
                          className="rounded-xl bg-[#09101D] border border-slate-800 p-3.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                            <span className="text-amber-400 font-semibold">
                              {brief.briefType}
                            </span>
                            <span className="text-slate-400">
                              {brief.targetSlug}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white">
                            {brief.seoHeadline}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {brief.seoMetaDescription}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {socialFeedCards.length > 0 && (
                    <div className="pt-3 border-t border-slate-800 space-y-2">
                      <div className="text-[11px] font-mono text-slate-400">
                        AUTO-PUSHED SOCIAL CARDS ({socialFeedCards.length})
                      </div>
                      <div className="rounded-xl bg-[#09101D] border border-slate-800 p-3 text-xs text-slate-300">
                        <div className="font-semibold text-white">
                          {socialFeedCards[0].productName}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                          {socialFeedCards[0].twitterText}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Infrastructure & Endpoint Verification Card */}
                <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
                  <div className="text-xs font-mono text-slate-400 font-semibold">
                    INFRASTRUCTURE &amp; LIVE ENDPOINTS
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl bg-[#09101D] border border-slate-800 p-3 flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">
                          Cloud SQL Sync
                        </div>
                        <div className="text-[11px] text-emerald-400">
                          {growthBriefs.length} Briefs Persisted
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-[#09101D] border border-slate-800 p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-white">
                          Sitemap &amp; MP4s
                        </div>
                        <div className="text-[11px] text-cyan-400">
                          36 URLs · {dailyVideos.length} Daily Videos
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isSendingSlack}
                      onClick={() => onShareToSlack('launch-review')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition-colors whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSendingSlack
                        ? 'Sending...'
                        : 'Send Review to Slack (#C8Y7536BU)'}
                    </button>
                    <button
                      type="button"
                      disabled={isSendingSlack}
                      onClick={() => onShareToSlack('daily-spotlight')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:border-emerald-500/60 transition-colors whitespace-nowrap"
                    >
                      Post Daily #1 Deal
                    </button>
                    <a
                      href="https://app.slack.com/client/T8Z8U3MPZ/C8Y7536BU"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 border border-slate-700 text-slate-300 hover:text-white whitespace-nowrap"
                    >
                      Slack Channel
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="/sitemap.xml"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-900 border border-slate-700 text-slate-300 hover:text-white whitespace-nowrap"
                    >
                      /sitemap.xml
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://soundcarewa.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 border border-slate-700 text-cyan-300 hover:border-cyan-500/60 hover:text-cyan-200 transition-colors whitespace-nowrap"
                    >
                      Affiliate Partner: SoundCare WA
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      type="button"
                      onClick={onOpenScorecard}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 border border-amber-500/50 text-amber-300 hover:bg-amber-500/25 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Open v0 vs v1 Scorecard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="bg-[#060A13] border-t border-slate-800/90 mt-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            <span className="font-display font-bold text-white text-sm">
              SolarBench_v1
            </span>
            <span className="mx-2 text-slate-600">·</span>
            <span>
              Dark Hardware Telemetry Edition (Stitch Project #1151634046896588888)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://soundcarewa.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Partner: SoundCare WA
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={onSwitchToV0}
              className="hover:text-white transition-colors"
            >
              Switch to Original SolarBench
            </button>
            <button
              type="button"
              onClick={onOpenScorecard}
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              View 1–10 Scorecard
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile 5-Tab Bottom Navigation Dock (Stitch Mobile Ergonomics, <=15% height) */}
      <nav
        aria-label="Mobile Workspace Dock"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#0B1220]/95 backdrop-blur border-t border-slate-800 grid grid-cols-5"
      >
        {(
          [
            ['bench', 'Bench', Zap],
            ['store-matrix', '10-Store', Store],
            ['bom-nec', 'BOM', Layers],
            ['swarm', '15-Agent', Bot],
            ['growth', 'Growth', TrendingUp],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = !showAllScroll && activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setShowAllScroll(false);
                setActiveTab(id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
