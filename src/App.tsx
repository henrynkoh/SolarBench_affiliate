import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  ArrowDownRight,
  BellRing,
  Check,
  Download,
  GitCompareArrows,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  TrendingUp,
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  HERO_WORKBENCH_IMAGE,
  MATRIX_CHANNELS,
  SOLAR_PRODUCTS,
  get90DayDropPct,
  getBestOffer,
  getFilteredOffers,
  getLandedPrice,
  getOfferLandedPrice,
  getUnitMetricValue,
} from './data/solarCatalog';
import {
  FilterCriteria,
  evaluatePurposeFit,
} from './data/productInsights';
import {
  LoadSizingSummary,
  getEffectiveNetPrice,
  getPriceArbitrageMetrics,
  isSec25DEligible,
} from './data/solarEconomics';
import {
  AgentPerformanceRecord,
  AutonomousSwarmStatus,
  DailySpotlightUpdatePayload,
  GrowthCampaignBrief,
  OutboundClickSummary,
  PlatformChannel,
  PriceAlertRecord,
  SavedBuildLineItem,
  SavedSolarBuild,
  SolarCategory,
  SolarProduct,
  SolarQuoteSnapshotRecord,
  SortOption,
  SwarmAgentId,
  SwarmProposedAction,
  SwarmRunRecord,
  SystemBuildItem,
  UtilityRateProfileRecord,
  VoltageClass,
} from './types/solar';
import { buildDefaultAgentPerformanceMetrics } from './data/solarSwarm';
import { syncDynamicSeo } from './data/seoManager';
import { useDailySpotlightSocialFeed } from './hooks/useDailySpotlightSocialFeed';
import { auth } from './lib/firebase';
import {
  createSolarQuoteSnapshotClient,
  createUtilityRateProfile,
  dispatchSlackShare,
  fetchAutonomousSwarmStatus,
  fetchGrowthAnalytics,
  fetchSolarQuoteSnapshots,
  fetchSwarmState,
  fetchUtilityRateProfiles,
  removeSolarQuoteSnapshotClient,
  removeUtilityRateProfile,
  setAutonomousSwarmEnabled,
  syncAccountProfile,
  triggerAutonomousSwarmSweep,
} from './services/accountCloudService';
import {
  createPriceAlert,
  createSavedSolarBuild,
  deletePriceAlert,
  deleteSavedSolarBuild,
  loadLocalPriceAlerts,
  loadLocalSavedBuilds,
  subscribeUserPriceAlerts,
  subscribeUserSavedBuilds,
  syncLocalBuyerDataToFirestore,
  updatePriceAlertTarget,
  updateSavedSolarBuild,
} from './services/buyerToolsFirestoreService';
import { HardwareImage } from './components/HardwareImage';
import { PriceSparkline } from './components/PriceSparkline';
import { ProductDetailModal } from './components/ProductDetailModal';
import { ComparisonMatrix } from './components/ComparisonMatrix';
import { SystemBuilderSection } from './components/SystemBuilderSection';
import { StoreComparisonTable } from './components/StoreComparisonTable';
import { TopFilterComparisonHub } from './components/TopFilterComparisonHub';
import { PaidDailySpotlightSection } from './components/PaidDailySpotlightSection';
import { PriceAlertsModal } from './components/PriceAlertsModal';
import {
  LocalAiLlmSection,
  type LocalAiServerFilterMode,
} from './components/LocalAiLlmSection';
import { ShareControl, buildSolarShareUrl } from './components/ShareControl';
import { FaqAccordionSection } from './components/FaqAccordionSection';
import { SwarmCommandCenter } from './components/SwarmCommandCenter';
import { GrowthDistributionHub } from './components/GrowthDistributionHub';
import { PriceEmbedWidget } from './components/PriceEmbedWidget';
import { RoiCalculatorModal } from './components/RoiCalculatorModal';
import { HeroShowcase } from './components/HeroShowcase';
import { SolarBenchV1App } from './components/SolarBenchV1App';
import { VersionComparisonModal } from './components/VersionComparisonModal';
import { downloadFilteredCatalogCsv } from './utils/csvExport';

const ALL_BRANDS = Array.from(
  new Set(SOLAR_PRODUCTS.map((p) => p.brand))
).sort();

const ALL_VOLTAGES: VoltageClass[] = [
  '48V',
  'High Voltage PV',
  '12V/24V',
  '120V/240V AC',
];

const DEFAULT_CRITERIA: FilterCriteria = {
  purpose: 'off-grid-cabin',
  priceRange: 'all',
  sizeRange: 'all',
  volumeRange: 'all',
  powerRange: 'all',
  deliveryNeed: 'all',
  minBuyers: 0,
};

function matchesUpperCriteria(
  product: SolarProduct,
  criteria: FilterCriteria,
  landedPrice: number
): boolean {
  if (
    criteria.purpose !== 'all' &&
    !product.purposes.includes(criteria.purpose)
  ) {
    return false;
  }

  if (criteria.priceRange === 'under-250' && landedPrice >= 250) return false;
  if (
    criteria.priceRange === '250-1000' &&
    (landedPrice < 250 || landedPrice > 1000)
  ) {
    return false;
  }
  if (
    criteria.priceRange === '1000-2500' &&
    (landedPrice < 1000 || landedPrice > 2500)
  ) {
    return false;
  }
  if (criteria.priceRange === '2500-plus' && landedPrice < 2500) return false;

  if (
    criteria.sizeRange !== 'all' &&
    product.sizeFootprint !== criteria.sizeRange
  ) {
    return false;
  }

  const wh = product.specs.capacityWh ?? 0;
  if (criteria.volumeRange === 'under-1kwh' && wh >= 1000) return false;
  if (criteria.volumeRange === '1-3kwh' && (wh < 1000 || wh > 3000)) {
    return false;
  }
  if (criteria.volumeRange === '3-6kwh' && (wh <= 3000 || wh > 6000)) {
    return false;
  }
  if (criteria.volumeRange === '10kwh-plus' && wh < 10000) return false;

  const watts = product.specs.powerWatts ?? 0;
  if (criteria.powerRange === '200-600w' && (watts < 200 || watts > 600)) {
    return false;
  }
  if (
    criteria.powerRange === '1000-4000w' &&
    (watts < 1000 || watts > 4000)
  ) {
    return false;
  }
  if (
    criteria.powerRange === '5000-10000w' &&
    (watts < 5000 || watts > 10000)
  ) {
    return false;
  }
  if (criteria.powerRange === '12000w-plus' && watts < 12000) return false;

  if (
    criteria.deliveryNeed === 'same-day' &&
    product.fastestDeliveryDays > 1
  ) {
    return false;
  }
  if (
    criteria.deliveryNeed === 'fast-2d' &&
    product.fastestDeliveryDays > 2
  ) {
    return false;
  }
  if (
    criteria.deliveryNeed === 'standard-5d' &&
    product.fastestDeliveryDays > 5
  ) {
    return false;
  }

  if (product.buyerFollowers < criteria.minBuyers) return false;

  return true;
}

export default function App() {
  const [criteria, setCriteria] = useState<FilterCriteria>(DEFAULT_CRITERIA);
  const [selectedCategory, setSelectedCategory] = useState<
    SolarCategory | 'all'
  >('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedVoltages, setSelectedVoltages] = useState<VoltageClass[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<
    PlatformChannel | 'all'
  >('all');
  const [includeRefurb, setIncludeRefurb] = useState(true);
  const [authorizedOnly, setAuthorizedOnly] = useState(false);
  const [ulListedOnly, setUlListedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(6000);
  const [sortBy, setSortBy] = useState<SortOption>('best-value-metric');
  const [viewMode, setViewMode] = useState<'table' | 'list' | 'grid'>('table');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [activeProduct, setActiveProduct] = useState<SolarProduct | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([
    'eg4-ll-s-48v-100ah',
    'sok-48v-100ah-pro',
    'pytes-v5-5120',
    'ecoworthy-48v-100ah',
  ]);
  const [buildItems, setBuildItems] = useState<SystemBuildItem[]>([
    {
      productId: 'eg4-6000xp-inverter',
      quantity: 1,
      selectedMerchantId: 'sig-solar',
    },
    {
      productId: 'eg4-ll-s-48v-100ah',
      quantity: 2,
      selectedMerchantId: 'sig-solar',
    },
    {
      productId: 'canadian-solar-440w-bifacial',
      quantity: 8,
      selectedMerchantId: 'sig-solar',
    },
  ]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [applyFederalCredit, setApplyFederalCredit] = useState(false);
  const [utilityRebatePct, setUtilityRebatePct] = useState<number>(0);
  const [dealFilterMode, setDealFilterMode] = useState<
    'all' | '90d-low' | 'biggest-spread'
  >('all');
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);
  const [roiModalOpen, setRoiModalOpen] = useState(false);
  const [alertInitialProductId, setAlertInitialProductId] = useState<string | null>(
    null
  );
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlertRecord[]>(() =>
    loadLocalPriceAlerts()
  );
  const [savedBuilds, setSavedBuilds] = useState<SavedSolarBuild[]>(() =>
    loadLocalSavedBuilds()
  );
  const [utilityProfiles, setUtilityProfiles] = useState<
    UtilityRateProfileRecord[]
  >([]);
  const [quoteSnapshots, setQuoteSnapshots] = useState<
    SolarQuoteSnapshotRecord[]
  >([]);
  const [preferredUtilityRate, setPreferredUtilityRate] = useState<number>(() => {
    try {
      const raw = localStorage.getItem('solarbench_saved_utility_rate_v1');
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) && parsed >= 0.05 && parsed <= 1.2
        ? parsed
        : 0.24;
    } catch {
      return 0.24;
    }
  });
  const [preferredUtilityLabel, setPreferredUtilityLabel] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('solarbench_saved_utility_label_v1') ||
        'Saved Utility Benchmark'
      );
    } catch {
      return 'Saved Utility Benchmark';
    }
  });
  const [swarmMetrics, setSwarmMetrics] = useState<AgentPerformanceRecord[]>(() =>
    buildDefaultAgentPerformanceMetrics()
  );
  const [swarmRuns, setSwarmRuns] = useState<SwarmRunRecord[]>([]);
  const [swarmMissionRequest, setSwarmMissionRequest] = useState<{
    agentId?: SwarmAgentId;
    directive: string;
    nonce: number;
  } | null>(null);
  const [clickSummary, setClickSummary] = useState<OutboundClickSummary>({
    totalClicks: 0,
    clicksLast7d: 0,
    byChannel: [],
    topProducts: [],
    recentEvents: [],
  });
  const [growthBriefs, setGrowthBriefs] = useState<GrowthCampaignBrief[]>([]);
  const [activeDailySpotlight, setActiveDailySpotlight] =
    useState<DailySpotlightUpdatePayload | null>(null);
  const [autonomousStatus, setAutonomousStatus] =
    useState<AutonomousSwarmStatus | null>(null);
  const [isSweepingAutonomous, setIsSweepingAutonomous] = useState(false);
  const [appEdition, setAppEdition] = useState<'v0' | 'v1'>(() => {
    if (typeof window === 'undefined') return 'v1';
    const params = new URLSearchParams(window.location.search);
    const paramEd = params.get('edition');
    if (paramEd === 'v0' || paramEd === 'v1') return paramEd;
    try {
      const saved = localStorage.getItem('solarbench_active_edition');
      if (saved === 'v0' || saved === 'v1') return saved;
    } catch {
      // ignore
    }
    return 'v1';
  });
  const [scorecardModalOpen, setScorecardModalOpen] = useState(false);
  const [isSendingSlack, setIsSendingSlack] = useState(false);

  const handleShareToSlack = async (
    mode: 'launch-review' | 'daily-spotlight' = 'launch-review'
  ) => {
    setIsSendingSlack(true);
    try {
      const publicUrl =
        typeof window !== 'undefined' ? window.location.origin : undefined;
      const result = await dispatchSlackShare({ mode, publicUrl });
      if (result.delivered) {
        triggerNotice(
          result.message || 'Posted live link to Slack channel C8Y7536BU.'
        );
      } else {
        if (result.formattedMessage && navigator.clipboard) {
          await navigator.clipboard
            .writeText(result.formattedMessage)
            .catch(() => {});
        }
        triggerNotice(
          'Copied Slack review message! Set SLACK_WEBHOOK_URL in AI Studio Secrets for 1-click auto-send.'
        );
      }
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Unable to send Slack dispatch.'
      );
    } finally {
      setIsSendingSlack(false);
    }
  };

  const handleSelectEdition = (nextEdition: 'v0' | 'v1') => {
    setAppEdition(nextEdition);
    try {
      localStorage.setItem('solarbench_active_edition', nextEdition);
    } catch {
      // ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    triggerNotice(
      nextEdition === 'v1'
        ? 'Switched to SolarBench_v1 (Stitch Dark Telemetry Edition).'
        : 'Switched to original SolarBench (Light Editorial Edition).'
    );
  };

  const totalOfferCount = useMemo(
    () => SOLAR_PRODUCTS.reduce((sum, p) => sum + p.offers.length, 0),
    []
  );

  const widgetProduct = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (params.get('widget') !== 'price') return null;
    const prodId = params.get('product');
    return SOLAR_PRODUCTS.find((p) => p.id === prodId) ?? SOLAR_PRODUCTS[0];
  }, []);

  const refreshGrowthAnalytics = async () => {
    const data = await fetchGrowthAnalytics();
    setClickSummary(data.summary);
    setGrowthBriefs(data.briefs);
  };

  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    window.setTimeout(() => {
      setActionNotice((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const applyAndSaveUtilityRate = (ratePerKwh: number, label?: string) => {
    const clamped = Math.max(0.05, Math.min(1.2, Number(ratePerKwh) || 0.24));
    const cleanLabel = label || preferredUtilityLabel || 'Saved Utility Rate';
    setPreferredUtilityRate(clamped);
    setPreferredUtilityLabel(cleanLabel);
    try {
      localStorage.setItem('solarbench_saved_utility_rate_v1', String(clamped));
      localStorage.setItem('solarbench_saved_utility_label_v1', cleanLabel);
    } catch {
      // Ignore storage restrictions
    }
  };

  const {
    feedCards: socialFeedCards,
    toggleLike: toggleLikeSocialCard,
    toggleRepost: toggleRepostSocialCard,
    dismissCard: dismissSocialCard,
    clearFeed: clearSocialFeed,
  } = useDailySpotlightSocialFeed(activeDailySpotlight, (pushedCard) => {
    triggerNotice(
      `Auto-pushed Twitter/X & Facebook share cards for ${pushedCard.productName}.`
    );
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    void refreshGrowthAnalytics().catch(() => {
      // Non-blocking telemetry hydration
    });
    const loadAutopilot = () => {
      void fetchAutonomousSwarmStatus()
        .then((status) => setAutonomousStatus(status))
        .catch(() => {});
    };
    loadAutopilot();
    const timer = window.setInterval(loadAutopilot, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const handleToggleAutopilot = async (nextEnabled: boolean) => {
    try {
      const status = await setAutonomousSwarmEnabled(nextEnabled);
      setAutonomousStatus(status);
      triggerNotice(
        nextEnabled
          ? '15-Agent Autonomous Autopilot resumed (15-min sweeps active).'
          : '15-Agent Autonomous Autopilot paused by CEO.'
      );
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Unable to update autopilot mode.'
      );
    }
  };

  const handleTriggerAutonomousSweep = async () => {
    setIsSweepingAutonomous(true);
    try {
      const status = await triggerAutonomousSwarmSweep();
      setAutonomousStatus(status);
      await refreshGrowthAnalytics().catch(() => {});
      triggerNotice(
        `Agent #01 Aria completed full 15-agent verification sweep (${status.overallHealthScore}% health).`
      );
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Autonomous verification sweep failed.'
      );
    } finally {
      setIsSweepingAutonomous(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pathname = window.location.pathname;

    let sharedProductId = params.get('product');
    let sharedCompare = params.get('compare');

    if (!sharedProductId && pathname.startsWith('/product/')) {
      sharedProductId = decodeURIComponent(
        pathname.slice('/product/'.length).replace(/\/+$/, '')
      );
    }
    if (!sharedCompare && pathname.startsWith('/compare/')) {
      sharedCompare = decodeURIComponent(
        pathname.slice('/compare/'.length).replace(/\/+$/, '')
      );
    }

    if (sharedProductId && params.get('widget') !== 'price') {
      const matched = SOLAR_PRODUCTS.find((p) => p.id === sharedProductId);
      if (matched) setActiveProduct(matched);
    }
    if (sharedCompare) {
      const ids = sharedCompare
        .split(',')
        .map((id) => id.trim())
        .filter((id) => SOLAR_PRODUCTS.some((p) => p.id === id))
        .slice(0, 4);
      if (ids.length > 0) {
        setCompareIds(ids);
        window.setTimeout(() => {
          document
            .getElementById('compare')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 120);
      }
    }
  }, []);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setPriceAlerts(loadLocalPriceAlerts());
      setSavedBuilds(loadLocalSavedBuilds());
      setUtilityProfiles([]);
      setQuoteSnapshots([]);
      setSwarmRuns([]);
      setSwarmMetrics(buildDefaultAgentPerformanceMetrics());
      return;
    }

    let active = true;
    void syncLocalBuyerDataToFirestore(user.uid)
      .then(({ syncedAlerts, syncedBuilds }) => {
        if (!active) return;
        const totalSynced = syncedAlerts + syncedBuilds;
        if (totalSynced > 0) {
          triggerNotice(
            `Synced ${syncedAlerts} price alert(s) and ${syncedBuilds} build(s) to your account.`
          );
        }
      })
      .catch(() => {
        // Silent fallback if local sync encounters a transient error
      });

    void syncAccountProfile(user)
      .then(() =>
        Promise.all([
          fetchUtilityRateProfiles(user),
          fetchSolarQuoteSnapshots(user),
          fetchSwarmState(user),
        ])
      )
      .then(([profiles, quotes, swarmState]) => {
        if (!active) return;
        setUtilityProfiles(profiles);
        setQuoteSnapshots(quotes);
        setSwarmRuns(swarmState.runs);
        if (swarmState.metrics.length > 0) {
          setSwarmMetrics(swarmState.metrics);
        }
        const defaultProf = profiles.find((p) => p.isDefault) ?? profiles[0];
        if (defaultProf) {
          applyAndSaveUtilityRate(defaultProf.ratePerKwh, defaultProf.label);
        }
      })
      .catch(() => {
        // Localized fallback keeps the catalog and calculators responsive
      });

    const unsubAlerts = subscribeUserPriceAlerts(
      user.uid,
      (items) => setPriceAlerts(items),
      () => triggerNotice('Could not sync alerts from Firestore.')
    );
    const unsubBuilds = subscribeUserSavedBuilds(
      user.uid,
      (items) => setSavedBuilds(items),
      () => triggerNotice('Could not sync saved builds from Firestore.')
    );
    return () => {
      active = false;
      unsubAlerts();
      unsubBuilds();
    };
  }, [user]);

  const watchedProductIds = useMemo(
    () => Array.from(new Set(priceAlerts.map((a) => a.productId))),
    [priceAlerts]
  );

  const localAiServerCount = useMemo(
    () => SOLAR_PRODUCTS.filter((p) => p.purposes.includes('local-ai-llm')).length,
    []
  );

  const triggeredAlertsCount = useMemo(
    () =>
      priceAlerts.filter((alert) => {
        const prod = SOLAR_PRODUCTS.find((p) => p.id === alert.productId);
        if (!prod) return false;
        return getLandedPrice(prod, includeRefurb) <= alert.targetPrice;
      }).length,
    [priceAlerts, includeRefurb]
  );

  // Top 3 Purpose-Fit Scored Recommendations for the Upper Filter Bar
  const { topThree, totalUpperMatched } = useMemo(() => {
    const scored = SOLAR_PRODUCTS.filter((product) => {
      const landed = getLandedPrice(product, includeRefurb);
      return matchesUpperCriteria(product, criteria, landed);
    })
      .map((product) => {
        const landed = getLandedPrice(product, includeRefurb);
        const unitMetric = getUnitMetricValue(product, includeRefurb);
        return evaluatePurposeFit(product, criteria, landed, unitMetric);
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.product.buyerFollowers - a.product.buyerFollowers;
      });

    return {
      topThree: scored.slice(0, 3),
      totalUpperMatched: scored.length,
    };
  }, [criteria, includeRefurb]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = SOLAR_PRODUCTS.filter((product) => {
      if (selectedCategory !== 'all' && product.category !== selectedCategory) {
        return false;
      }
      if (
        selectedBrands.length > 0 &&
        !selectedBrands.includes(product.brand)
      ) {
        return false;
      }
      if (
        selectedVoltages.length > 0 &&
        !selectedVoltages.includes(product.voltageClass)
      ) {
        return false;
      }
      if (
        ulListedOnly &&
        !product.specs.certifications.some((c) => c.startsWith('UL'))
      ) {
        return false;
      }
      const matchingOffers = getFilteredOffers(product, {
        includeRefurb,
        authorizedOnly,
        channelFilter: selectedChannel,
      });
      if (matchingOffers.length === 0) return false;
      const landed = getOfferLandedPrice(matchingOffers[0]);
      if (landed > maxPrice) {
        return false;
      }
      if (!matchesUpperCriteria(product, criteria, landed)) {
        return false;
      }
      if (dealFilterMode !== 'all') {
        const arb = getPriceArbitrageMetrics(product, includeRefurb);
        if (dealFilterMode === '90d-low' && arb.percentile90d > 20) {
          return false;
        }
        if (dealFilterMode === 'biggest-spread' && arb.spreadPct < 14) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          product.name,
          product.brand,
          product.sku,
          product.summarySpec,
          product.specs.chemistryOrCell,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'lowest-price') {
        return (
          getLandedPrice(a, includeRefurb) - getLandedPrice(b, includeRefurb)
        );
      }
      if (sortBy === 'best-value-metric') {
        return (
          getUnitMetricValue(a, includeRefurb) -
          getUnitMetricValue(b, includeRefurb)
        );
      }
      if (sortBy === 'highest-efficiency') {
        return b.specs.efficiencyPct - a.specs.efficiencyPct;
      }
      if (sortBy === 'biggest-drop') {
        return get90DayDropPct(b) - get90DayDropPct(a);
      }
      if (sortBy === 'biggest-spread') {
        return (
          getPriceArbitrageMetrics(b, includeRefurb).spreadDollar -
          getPriceArbitrageMetrics(a, includeRefurb).spreadDollar
        );
      }
      return 0;
    });
  }, [
    criteria,
    selectedCategory,
    searchQuery,
    selectedBrands,
    selectedVoltages,
    selectedChannel,
    includeRefurb,
    authorizedOnly,
    ulListedOnly,
    maxPrice,
    sortBy,
    dealFilterMode,
  ]);

  const comparedProducts = useMemo(
    () =>
      compareIds
        .map((id) => SOLAR_PRODUCTS.find((p) => p.id === id))
        .filter((p): p is SolarProduct => Boolean(p)),
    [compareIds]
  );

  useEffect(() => {
    if (widgetProduct) return;
    syncDynamicSeo({
      activeProduct,
      comparedProducts,
      utilityRate: preferredUtilityRate,
      includeRefurb,
    });
  }, [activeProduct, comparedProducts, preferredUtilityRate, includeRefurb, widgetProduct]);

  const toggleCompare = (productId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 4) {
        triggerNotice('Comparison matrix holds up to 4 models; replaced oldest.');
        return [...prev.slice(1), productId];
      }
      triggerNotice('Added to side-by-side Comparison Matrix.');
      return [...prev, productId];
    });
  };

  const handleAddToBuild = (productId: string, merchantId?: string) => {
    const product = SOLAR_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    const chosenMerchant =
      merchantId ?? getBestOffer(product, includeRefurb).merchantId;
    const chosenOffer = product.offers.find(
      (o) => o.merchantId === chosenMerchant
    );

    setBuildItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? {
                ...i,
                quantity: i.quantity + 1,
                selectedMerchantId: chosenMerchant,
              }
            : i
        );
      }
      return [
        ...prev,
        { productId, quantity: 1, selectedMerchantId: chosenMerchant },
      ];
    });
    triggerNotice(
      `Added ${product.name} (${chosenOffer?.merchantName ?? 'Best Store'}) to System Builder.`
    );
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setBuildItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleAddBulkBatteryUnits = (
    productId: string,
    merchantId: string,
    quantity: number
  ) => {
    if (quantity <= 0) return;
    const product = SOLAR_PRODUCTS.find((p) => p.id === productId);
    if (!product) return;
    setBuildItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        { productId, quantity, selectedMerchantId: merchantId },
      ];
    });
    triggerNotice(
      `Added +${quantity}x ${product.name} to System Builder.`
    );
  };

  const handleChangeMerchant = (productId: string, merchantId: string) => {
    setBuildItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, selectedMerchantId: merchantId }
          : item
      )
    );
  };

  const handleRemoveBuildItem = (productId: string) => {
    setBuildItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const handleLoadStarterKit = (
    kitType: 'cabin-48v' | 'van-24v' | 'whole-home'
  ) => {
    if (kitType === 'cabin-48v') {
      setBuildItems([
        {
          productId: 'eg4-6000xp-inverter',
          quantity: 1,
          selectedMerchantId: 'sig-solar',
        },
        {
          productId: 'eg4-ll-s-48v-100ah',
          quantity: 2,
          selectedMerchantId: 'sig-solar',
        },
        {
          productId: 'canadian-solar-440w-bifacial',
          quantity: 8,
          selectedMerchantId: 'sig-solar',
        },
      ]);
      triggerNotice('Loaded 48V Off-Grid Cabin Starter Kit.');
    } else if (kitType === 'whole-home') {
      setBuildItems([
        {
          productId: 'solark-15k-2p',
          quantity: 1,
          selectedMerchantId: 'curr-conn',
        },
        {
          productId: 'eg4-powerpro-wallmount-280ah',
          quantity: 2,
          selectedMerchantId: 'sig-solar',
        },
        {
          productId: 'rec-alpha-pure-r-430w',
          quantity: 16,
          selectedMerchantId: 'ebay-new',
        },
      ]);
      triggerNotice('Loaded 15kW Whole-Home Backup Starter Kit.');
    } else {
      setBuildItems([
        {
          productId: 'bluetti-ac200l',
          quantity: 1,
          selectedMerchantId: 'amazon',
        },
        {
          productId: 'rich-solar-200w-12v',
          quantity: 3,
          selectedMerchantId: 'amazon',
        },
      ]);
      triggerNotice('Loaded Compact Portable / Van Solar Kit.');
    }
  };

  const resetAllFilters = () => {
    setCriteria({
      purpose: 'all',
      priceRange: 'all',
      sizeRange: 'all',
      volumeRange: 'all',
      powerRange: 'all',
      deliveryNeed: 'all',
      minBuyers: 0,
    });
    setSelectedCategory('all');
    setSearchQuery('');
    setSelectedBrands([]);
    setSelectedVoltages([]);
    setSelectedChannel('all');
    setIncludeRefurb(true);
    setAuthorizedOnly(false);
    setUlListedOnly(false);
    setMaxPrice(6000);
    setDealFilterMode('all');
    setApplyFederalCredit(false);
    setUtilityRebatePct(0);
  };

  const handleCopyPromoCode = (code: string, merchantName: string) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code);
    }
    triggerNotice(`Copied promo code ${code} for ${merchantName}.`);
  };

  const handleCopyPromoBundle = (summaryText: string, count: number) => {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(summaryText);
    }
    triggerNotice(
      count > 0
        ? `Copied ${count} active BOM promo code(s) to clipboard.`
        : 'Copied build discount summary to clipboard.'
    );
  };

  const handleWatchProduct = (product: SolarProduct) => {
    setAlertInitialProductId(product.id);
    setAlertsModalOpen(true);
  };

  const handleCreateAlert = async (input: {
    productId: string;
    productName: string;
    brand: string;
    targetPrice: number;
    lowestLandedAtCreation: number;
  }) => {
    const created = await createPriceAlert(input);
    if (!user || !user.emailVerified) {
      setPriceAlerts((prev) => [created, ...prev]);
    }
    triggerNotice(
      `Price alert set for ${input.productName} at ≤ $${input.targetPrice.toLocaleString()}.`
    );
  };

  const handleUpdateAlertTarget = async (
    alertId: string,
    targetPrice: number
  ) => {
    await updatePriceAlertTarget(alertId, targetPrice);
    if (!user || !user.emailVerified) {
      setPriceAlerts((prev) =>
        prev.map((a) => (a.alertId === alertId ? { ...a, targetPrice } : a))
      );
    }
    triggerNotice(`Updated alert target to ≤ $${targetPrice.toLocaleString()}.`);
  };

  const handleDeleteAlert = async (alertId: string) => {
    await deletePriceAlert(alertId);
    if (!user || !user.emailVerified) {
      setPriceAlerts((prev) => prev.filter((a) => a.alertId !== alertId));
    }
    triggerNotice('Removed price alert.');
  };

  const handleSaveBuild = async (
    buildName: string,
    totalCost: number,
    totalStorageWh: number,
    totalSolarWatts: number
  ) => {
    const lineItems: SavedBuildLineItem[] = buildItems.map((b) => ({
      productId: b.productId,
      quantity: b.quantity,
      selectedMerchantId: b.selectedMerchantId ?? '',
    }));
    const saved = await createSavedSolarBuild({
      buildName,
      items: lineItems,
      totalCost,
      totalStorageWh,
      totalSolarWatts,
    });
    if (!user || !user.emailVerified) {
      setSavedBuilds((prev) => [saved, ...prev]);
    }
    triggerNotice(`Saved "${buildName}" to Saved Solar Builds.`);
  };

  const handleUpdateSavedBuild = async (
    buildId: string,
    buildName: string,
    totalCost: number,
    totalStorageWh: number,
    totalSolarWatts: number
  ) => {
    const lineItems: SavedBuildLineItem[] = buildItems.map((b) => ({
      productId: b.productId,
      quantity: b.quantity,
      selectedMerchantId: b.selectedMerchantId ?? '',
    }));
    await updateSavedSolarBuild(buildId, {
      buildName,
      items: lineItems,
      totalCost,
      totalStorageWh,
      totalSolarWatts,
    });
    if (!user || !user.emailVerified) {
      setSavedBuilds((prev) =>
        prev.map((b) =>
          b.buildId === buildId
            ? {
                ...b,
                buildName,
                items: lineItems,
                totalCost,
                totalStorageWh,
                totalSolarWatts,
              }
            : b
        )
      );
    }
    triggerNotice(`Updated saved build "${buildName}".`);
  };

  const handleExportFilteredCsv = () => {
    if (filteredProducts.length === 0) return;
    const filename = downloadFilteredCatalogCsv({
      products: filteredProducts,
      includeRefurb,
      authorizedOnly,
      selectedChannel,
      applyFederalCredit,
      utilityRebatePct,
    });
    triggerNotice(
      `Exported ${filteredProducts.length} filtered SKU(s) to ${filename}.`
    );
  };

  const handleLoadSavedBuild = (loadedItems: SavedBuildLineItem[]) => {
    setBuildItems(
      loadedItems.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        selectedMerchantId: i.selectedMerchantId || undefined,
      }))
    );
    triggerNotice('Loaded saved Bill of Materials into System Builder.');
  };

  const handleDeleteSavedBuild = async (buildId: string) => {
    await deleteSavedSolarBuild(buildId);
    if (!user || !user.emailVerified) {
      setSavedBuilds((prev) => prev.filter((b) => b.buildId !== buildId));
    }
    triggerNotice('Deleted saved solar build.');
  };

  const handleSaveUtilityProfile = async (input: {
    label: string;
    locationQuery: string;
    utilityContext: string;
    ratePerKwh: number;
    isDefault?: boolean;
  }) => {
    if (!user || !user.emailVerified) return;
    try {
      const saved = await createUtilityRateProfile(user, input);
      setUtilityProfiles((prev) => {
        const updatedPrev = input.isDefault
          ? prev.map((p) => ({ ...p, isDefault: false }))
          : prev;
        return [saved, ...updatedPrev];
      });
      applyAndSaveUtilityRate(saved.ratePerKwh, saved.label);
      triggerNotice(
        `Saved regional tariff "${saved.label}" ($${saved.ratePerKwh.toFixed(2)}/kWh).`
      );
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Unable to save tariff preset.'
      );
    }
  };

  const handleDeleteUtilityProfile = async (profileId: number) => {
    if (!user || !user.emailVerified) return;
    try {
      await removeUtilityRateProfile(user, profileId);
      setUtilityProfiles((prev) => prev.filter((p) => p.id !== profileId));
      triggerNotice('Removed saved tariff preset.');
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Unable to remove tariff preset.'
      );
    }
  };

  const handleSaveQuoteSnapshot = async (input: {
    quoteTitle: string;
    totalLandedCost: number;
    totalStorageWh: number;
    totalSolarWatts: number;
    utilityRateSnapshot: number;
    items: {
      productId: string;
      productName: string;
      merchantId: string;
      quantity: number;
      unitLandedPrice: number;
    }[];
  }) => {
    if (!user || !user.emailVerified) return;
    try {
      const saved = await createSolarQuoteSnapshotClient(user, input);
      setQuoteSnapshots((prev) => [saved, ...prev]);
      triggerNotice(`Locked quote "${saved.quoteTitle}" to your account.`);
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Unable to lock price quote.'
      );
    }
  };

  const handleDeleteQuoteSnapshot = async (quoteId: number) => {
    if (!user || !user.emailVerified) return;
    try {
      await removeSolarQuoteSnapshotClient(user, quoteId);
      setQuoteSnapshots((prev) => prev.filter((q) => q.id !== quoteId));
      triggerNotice('Removed locked price quote.');
    } catch (err) {
      triggerNotice(
        err instanceof Error ? err.message : 'Unable to delete locked quote.'
      );
    }
  };

  const handleLoadQuoteSnapshot = (quote: SolarQuoteSnapshotRecord) => {
    setBuildItems(
      quote.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        selectedMerchantId: i.merchantId || undefined,
      }))
    );
    triggerNotice(`Restored locked quote "${quote.quoteTitle}" into Builder.`);
  };

  const handleOptimizeBuild = (authOnly: boolean) => {
    setBuildItems((prev) =>
      prev.map((item) => {
        const product = SOLAR_PRODUCTS.find((p) => p.id === item.productId);
        if (!product) return item;
        const offers = getFilteredOffers(product, {
          includeRefurb: !authOnly && includeRefurb,
          authorizedOnly: authOnly,
        });
        const best = offers[0] ?? getBestOffer(product, includeRefurb);
        return { ...item, selectedMerchantId: best.merchantId };
      })
    );
    triggerNotice(
      authOnly
        ? 'Optimized every BOM line to lowest Authorized OEM Dealer offer.'
        : 'Optimized every BOM line to lowest split-merchant landed price.'
    );
  };

  const handleApplyConsolidatedChannel = (channel: string) => {
    setBuildItems((prev) =>
      prev.map((item) => {
        const product = SOLAR_PRODUCTS.find((p) => p.id === item.productId);
        if (!product) return item;
        const match = product.offers
          .filter((o) => o.channel === channel && o.inStock)
          .sort((a, b) => getOfferLandedPrice(a) - getOfferLandedPrice(b))[0];
        return match ? { ...item, selectedMerchantId: match.merchantId } : item;
      })
    );
    triggerNotice(`Consolidated all BOM lines to ${channel}.`);
  };

  const handleApplyLoadSizingToFilter = (summary: LoadSizingSummary) => {
    setCriteria((prev) => ({
      ...prev,
      purpose: summary.needs240V ? 'whole-home-backup' : 'off-grid-cabin',
      volumeRange:
        summary.recommendedStorageWh >= 10000
          ? '10kwh-plus'
          : summary.recommendedStorageWh >= 3000
          ? '3-6kwh'
          : '1-3kwh',
      powerRange:
        summary.recommendedInverterWatts >= 12000
          ? '12000w-plus'
          : summary.recommendedInverterWatts >= 5000
          ? '5000-10000w'
          : '1000-4000w',
    }));
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    triggerNotice(
      `Filtered catalog for ${(summary.recommendedStorageWh / 1000).toFixed(1)} kWh bank & ${(summary.recommendedInverterWatts / 1000).toFixed(1)} kW inverter.`
    );
  };

  const handleAutoBuildFromSizing = (summary: LoadSizingSummary) => {
    if (summary.recommendedInverterWatts >= 10000) {
      const batteryCount = Math.max(
        1,
        Math.ceil(summary.recommendedStorageWh / 14340)
      );
      const panelCount = Math.max(
        4,
        Math.ceil(summary.recommendedSolarWatts / 430)
      );
      setBuildItems([
        {
          productId: 'solark-15k-2p',
          quantity: 1,
          selectedMerchantId: 'curr-conn',
        },
        {
          productId: 'eg4-powerpro-wallmount-280ah',
          quantity: batteryCount,
          selectedMerchantId: 'sig-solar',
        },
        {
          productId: 'rec-alpha-pure-r-430w',
          quantity: panelCount,
          selectedMerchantId: 'ebay-new',
        },
      ]);
      triggerNotice(
        `Auto-built ${batteryCount}× 14.3kWh + Sol-Ark 15K + ${panelCount}× 430W array for your load.`
      );
      return;
    }

    if (summary.recommendedInverterWatts >= 3500 || summary.needs240V) {
      const batteryCount = Math.max(
        1,
        Math.ceil(summary.recommendedStorageWh / 5120)
      );
      const panelCount = Math.max(
        2,
        Math.ceil(summary.recommendedSolarWatts / 440)
      );
      setBuildItems([
        {
          productId: 'eg4-6000xp-inverter',
          quantity: 1,
          selectedMerchantId: 'sig-solar',
        },
        {
          productId: 'eg4-ll-s-48v-100ah',
          quantity: batteryCount,
          selectedMerchantId: 'sig-solar',
        },
        {
          productId: 'canadian-solar-440w-bifacial',
          quantity: panelCount,
          selectedMerchantId: 'sig-solar',
        },
      ]);
      triggerNotice(
        `Auto-built EG4 6000XP + ${batteryCount}× 5.12kWh + ${panelCount}× 440W kit for your load.`
      );
      return;
    }

    const panelCount = Math.max(
      1,
      Math.ceil(summary.recommendedSolarWatts / 200)
    );
    setBuildItems([
      {
        productId: 'bluetti-ac200l',
        quantity: 1,
        selectedMerchantId: 'amazon',
      },
      {
        productId: 'rich-solar-200w-12v',
        quantity: panelCount,
        selectedMerchantId: 'amazon',
      },
    ]);
    triggerNotice(
      `Auto-built Bluetti AC200L + ${panelCount}× 200W portable kit for your load.`
    );
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const toggleVoltage = (voltage: VoltageClass) => {
    setSelectedVoltages((prev) =>
      prev.includes(voltage)
        ? prev.filter((v) => v !== voltage)
        : [...prev, voltage]
    );
  };

  const handleFilterSolarForLocalAiServer = (
    mode: LocalAiServerFilterMode,
    scrollTarget: '#top' | '#catalog'
  ) => {
    setSelectedCategory('all');
    setSearchQuery('');
    setSelectedBrands([]);
    setSelectedChannel('all');
    setMaxPrice(6000);
    setDealFilterMode('all');
    setUlListedOnly(false);

    if (mode === 'rack-48v') {
      setSelectedVoltages(['48V']);
      setCriteria({
        purpose: 'local-ai-llm',
        priceRange: 'all',
        sizeRange: 'rack-wall',
        volumeRange: 'all',
        powerRange: 'all',
        deliveryNeed: 'all',
        minBuyers: 0,
      });
      triggerNotice(
        'Filtered solar catalog for 48V Server Rack & UPS Hybrid Local AI LLM platforms.'
      );
    } else if (mode === 'compact-ups') {
      setSelectedVoltages([]);
      setCriteria({
        purpose: 'local-ai-llm',
        priceRange: 'all',
        sizeRange: 'compact',
        volumeRange: 'all',
        powerRange: 'all',
        deliveryNeed: 'all',
        minBuyers: 0,
      });
      triggerNotice(
        'Filtered solar catalog for Quiet Compact UPS (≤10ms) Local AI LLM setups.'
      );
    } else {
      setSelectedVoltages([]);
      setCriteria({
        purpose: 'local-ai-llm',
        priceRange: 'all',
        sizeRange: 'all',
        volumeRange: 'all',
        powerRange: 'all',
        deliveryNeed: 'all',
        minBuyers: 0,
      });
      triggerNotice(
        'Filtered solar catalog & Top-3 Advisor for Local AI LLM Setup hardware.'
      );
    }

    const targetId = scrollTarget === '#top' ? 'top' : 'catalog';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAskSwarmAgent = (agentId: SwarmAgentId, directive: string) => {
    setSwarmMissionRequest({
      agentId,
      directive,
      nonce: Date.now(),
    });
    document.getElementById('swarm')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    triggerNotice('Mission routed to Agent #01 Aria for Swarm consensus.');
  };

  const handleJumpToFeature = (anchor: string) => {
    const cleanId = anchor.replace(/^#/, '');
    document.getElementById(cleanId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const handleExecuteCeoProposal = (
    proposal: SwarmProposedAction,
    missionTitle: string
  ): string => {
    if (proposal.actionType === 'optimize-bom-split') {
      const authFlag = proposal.authorizedOnly ?? true;
      handleOptimizeBuild(authFlag);
      document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' });
      return `Executed "${missionTitle}": re-allocated BOM to lowest-landed ${
        authFlag ? 'Authorized OEM Dealer' : 'split-merchant'
      } pricing.`;
    }

    if (proposal.actionType === 'filter-local-ai-48v') {
      handleFilterSolarForLocalAiServer('rack-48v', '#top');
      return `Executed "${missionTitle}": filtered Top-3 Advisor and Store Matrix for 48V Local AI LLM / quiet UPS hardware.`;
    }

    if (proposal.actionType === 'load-compare-preset') {
      const fallbackIds = [
        'eg4-ll-s-48v-100ah',
        'sok-48v-100ah-pro',
        'ruixu-lithi2-48v-100ah',
        'eg4-powerpro-wallmount-280ah',
      ];
      const validIds = (proposal.targetCompareIds ?? [])
        .filter((id) => SOLAR_PRODUCTS.some((p) => p.id === id))
        .slice(0, 4);
      const finalIds = validIds.length >= 2 ? validIds : fallbackIds;
      setCompareIds(finalIds);
      document.getElementById('compare')?.scrollIntoView({ behavior: 'smooth' });
      triggerNotice(`Loaded ${finalIds.length} SKUs into Spec Comparison Matrix.`);
      return `Executed "${missionTitle}": staged ${finalIds.length} benchmarked models in Spec Matrix.`;
    }

    if (proposal.actionType === 'apply-starter-kit') {
      const kit = proposal.targetKitType ?? 'cabin-48v';
      handleLoadStarterKit(kit);
      document.getElementById('builder')?.scrollIntoView({ behavior: 'smooth' });
      return `Executed "${missionTitle}": loaded ${kit} Starter Kit into System Builder.`;
    }

    if (proposal.actionType === 'set-utility-rate') {
      const nextRate = Math.min(
        1.2,
        Math.max(0.06, Number(proposal.suggestedUtilityRate) || preferredUtilityRate)
      );
      applyAndSaveUtilityRate(nextRate, 'Swarm Consensus Benchmark');
      triggerNotice(`Updated ROI baseline to $${nextRate.toFixed(2)}/kWh.`);
      return `Executed "${missionTitle}": set active ROI utility baseline to $${nextRate.toFixed(
        2
      )}/kWh.`;
    }

    const targetProduct =
      SOLAR_PRODUCTS.find((p) => p.id === proposal.targetProductId) ??
      SOLAR_PRODUCTS.find((p) => p.id === 'eg4-ll-s-48v-100ah') ??
      SOLAR_PRODUCTS[0];
    setActiveProduct(targetProduct);
    triggerNotice(`Opened full teardown audit for ${targetProduct.name}.`);
    return `Executed "${missionTitle}": opened full teardown & 10-yr ROI inspection modal for ${targetProduct.name}.`;
  };

  if (widgetProduct) {
    return <PriceEmbedWidget product={widgetProduct} />;
  }

  const sharedModalsAndToast = (
    <>
      {/* Live Action Feedback Toast */}
      {actionNotice && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-16 md:bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg border border-slate-700"
        >
          {actionNotice}
        </div>
      )}

      {/* Side-by-Side SolarBench vs SolarBench_v1 Decision Scorecard */}
      <VersionComparisonModal
        isOpen={scorecardModalOpen}
        onClose={() => setScorecardModalOpen(false)}
        activeEdition={appEdition}
        onSelectEdition={handleSelectEdition}
        productCount={SOLAR_PRODUCTS.length}
        totalOfferCount={totalOfferCount}
        buildItemsCount={buildItems.length}
        alertsCount={priceAlerts.length}
        autonomousStatus={autonomousStatus}
        onShareToSlack={handleShareToSlack}
        isSendingSlack={isSendingSlack}
      />

      {/* Product Detail & Multi-Merchant Modal */}
      <ProductDetailModal
        product={activeProduct}
        onClose={() => setActiveProduct(null)}
        isCompared={
          activeProduct ? compareIds.includes(activeProduct.id) : false
        }
        onToggleCompare={toggleCompare}
        onAddToBuild={handleAddToBuild}
        applyFederalCredit={applyFederalCredit}
        utilityRebatePct={utilityRebatePct}
        includeRefurb={includeRefurb}
        alerts={priceAlerts}
        onCreateAlert={handleCreateAlert}
        onDeleteAlert={handleDeleteAlert}
        onCopyPromoCode={handleCopyPromoCode}
        user={user}
        utilityProfiles={utilityProfiles}
        defaultUtilityRate={preferredUtilityRate}
        onSaveUtilityProfile={handleSaveUtilityProfile}
        onDeleteUtilityProfile={handleDeleteUtilityProfile}
      />

      {/* Target Price-Drop Watchlist Modal */}
      <PriceAlertsModal
        isOpen={alertsModalOpen}
        onClose={() => {
          setAlertsModalOpen(false);
          setAlertInitialProductId(null);
        }}
        alerts={priceAlerts}
        catalog={SOLAR_PRODUCTS}
        includeRefurb={includeRefurb}
        user={user}
        initialProductId={alertInitialProductId}
        onCreateAlert={handleCreateAlert}
        onUpdateAlertTarget={handleUpdateAlertTarget}
        onDeleteAlert={handleDeleteAlert}
        onInspectProduct={(p) => setActiveProduct(p)}
        onAddToBuild={handleAddToBuild}
      />

      {/* Full-System ROI, Grid Parity & Cost Recovery Modal */}
      <RoiCalculatorModal
        isOpen={roiModalOpen}
        onClose={() => setRoiModalOpen(false)}
        buildItems={buildItems}
        catalog={SOLAR_PRODUCTS}
        savedBuilds={savedBuilds}
        quoteSnapshots={quoteSnapshots}
        applyFederalCredit={applyFederalCredit}
        utilityRebatePct={utilityRebatePct}
        savedUtilityRate={preferredUtilityRate}
        savedUtilityLabel={preferredUtilityLabel}
        utilityProfiles={utilityProfiles}
        user={user}
        onApplyUtilityRate={(nextRate, nextLabel) =>
          applyAndSaveUtilityRate(nextRate, nextLabel)
        }
        onSaveUtilityProfile={handleSaveUtilityProfile}
        onJumpToBuilder={() => {
          if (appEdition === 'v0') {
            document
              .getElementById('builder')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            setRoiModalOpen(false);
          }
        }}
      />
    </>
  );

  if (appEdition === 'v1') {
    return (
      <>
        <SolarBenchV1App
          catalog={SOLAR_PRODUCTS}
          totalOfferCount={totalOfferCount}
          buildItems={buildItems}
          compareIds={compareIds}
          priceAlerts={priceAlerts}
          preferredUtilityRate={preferredUtilityRate}
          autonomousStatus={autonomousStatus}
          isSweepingAutonomous={isSweepingAutonomous}
          clickSummary={clickSummary}
          growthBriefs={growthBriefs}
          socialFeedCards={socialFeedCards}
          onSwitchToV0={() => handleSelectEdition('v0')}
          onOpenScorecard={() => setScorecardModalOpen(true)}
          onInspectProduct={(p) => setActiveProduct(p)}
          onAddToBuild={handleAddToBuild}
          onUpdateBuildQty={handleUpdateQty}
          onRemoveBuildItem={handleRemoveBuildItem}
          onLoadStarterKit={handleLoadStarterKit}
          onOptimizeBuild={handleOptimizeBuild}
          onToggleCompare={toggleCompare}
          onOpenRoiModal={() => setRoiModalOpen(true)}
          onOpenAlertsModal={(pid) => {
            setAlertInitialProductId(pid ?? null);
            setAlertsModalOpen(true);
          }}
          onCreateAlert={async (prod, targetPrice) => {
            const best = getOfferLandedPrice(getBestOffer(prod, true));
            await handleCreateAlert({
              productId: prod.id,
              productName: prod.name,
              brand: prod.brand,
              targetPrice,
              lowestLandedAtCreation: best,
            });
          }}
          onCopyPromoCode={handleCopyPromoCode}
          onToggleAutopilot={handleToggleAutopilot}
          onTriggerAutonomousSweep={handleTriggerAutonomousSweep}
          onShareToSlack={handleShareToSlack}
          isSendingSlack={isSendingSlack}
          onNotify={triggerNotice}
        />
        {sharedModalsAndToast}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#hero"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SolarBench
          </a>

          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
            aria-label="Primary Navigation"
          >
            <a
              href="#top"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Top 3 Advisor
            </a>
            <a
              href="#catalog"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Store Matrix
            </a>
            <a
              href="#daily-spotlight"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Daily Spotlight
            </a>
            <a
              href="#builder"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              System Builder
            </a>
            <a
              href="#swarm"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Swarm HQ
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <a
              href="#compare"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 tabular-nums"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              Compare ({compareIds.length})
            </a>
          </div>
        </div>
      </header>

      {/* Edition Comparison Bar (Sub-Header Toolbar) */}
      <div className="bg-slate-900 text-slate-200 border-b border-slate-800">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="inline-flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700"
              role="group"
              aria-label="Edition Switcher"
            >
              <button
                type="button"
                className="px-3 py-1 rounded-md text-xs font-semibold bg-white text-slate-900 whitespace-nowrap"
              >
                SolarBench (Light)
              </button>
              <button
                type="button"
                onClick={() => handleSelectEdition('v1')}
                className="px-3 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap"
              >
                SolarBench_v1 (Stitch)
              </button>
            </div>
            <span className="hidden sm:inline text-slate-400">
              Preview both live editions side-by-side before choosing your launch build
            </span>
          </div>

          <button
            type="button"
            onClick={() => setScorecardModalOpen(true)}
            className="px-3 py-1 rounded-md text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap"
          >
            Open v0 vs v1 Scorecard (1–10)
          </button>
        </div>
      </div>

      <main className="flex-1">
        {/* Public High-Conversion Landing Hero */}
        <div id="hero">
          <HeroShowcase
            workbenchImage={HERO_WORKBENCH_IMAGE}
            productCount={SOLAR_PRODUCTS.length}
            totalOfferCount={totalOfferCount}
            autonomousStatus={autonomousStatus}
            onOpenRoiCalculator={() => setRoiModalOpen(true)}
          />
        </div>

        {/* Upper Interactive Filter Bar + Top 3 Comparative Evaluation Cards */}
        <div id="top">
          <TopFilterComparisonHub
            criteria={criteria}
            onChangeCriteria={setCriteria}
            onResetCriteria={resetAllFilters}
            topThree={topThree}
            totalMatchedCount={totalUpperMatched}
            includeRefurb={includeRefurb}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
            onInspectProduct={(p) => setActiveProduct(p)}
            onAddToBuild={handleAddToBuild}
            workbenchImage={HERO_WORKBENCH_IMAGE}
            onAskSwarmAgent={handleAskSwarmAgent}
          />
        </div>

        {/* Full Cross-Platform Solar Price Comparison Catalog (30 SKUs × 10+ Stores) */}
        <section
          id="catalog"
          className="py-12 bg-white border-b border-slate-200"
          aria-labelledby="catalog-heading"
        >
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Same Product Across 10+ Stores · Landed Item + Freight − Coupon
                </p>
                <h2
                  id="catalog-heading"
                  className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1"
                >
                  Full Multi-Store Solar Price Comparison Table
                </h2>
              </div>

              {/* Category Segmented Filter Tabs */}
              <div
                className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg"
                role="tablist"
                aria-label="Solar product categories"
              >
                {(
                  Object.keys(CATEGORY_LABELS) as Array<SolarCategory | 'all'>
                ).map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* Mobile Filter Toggle */}
              <div className="lg:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Spec &amp; Platform Filters
                  </span>
                  <span className="text-xs text-slate-500">
                    {mobileFiltersOpen ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>

              {/* Left Spec & Distribution Filter Rail */}
              <aside
                className={`lg:col-span-3 bg-white border border-slate-200 rounded-xl p-5 space-y-5 ${
                  mobileFiltersOpen ? 'block' : 'hidden lg:block'
                }`}
                aria-label="Technical specification and store filters"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Store &amp; Spec Filters
                  </h3>
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="text-xs font-medium text-amber-700 hover:underline"
                  >
                    Reset All
                  </button>
                </div>

                {/* Search Input */}
                <div>
                  <label
                    htmlFor="solar-search"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Model, Brand, or Cell Type
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="solar-search"
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="e.g. EG4, Victron, 440W..."
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>

                {/* Distribution Channel Filter */}
                <div>
                  <label
                    htmlFor="channel-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Distribution Platform
                  </label>
                  <select
                    id="channel-select"
                    value={selectedChannel}
                    onChange={(e) =>
                      setSelectedChannel(
                        e.target.value as PlatformChannel | 'all'
                      )
                    }
                    className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    <option value="all">All 10+ Merged Stores</option>
                    {MATRIX_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                    <option value="SanTan Solar">SanTan Solar</option>
                    <option value="Inverter Supply">Inverter Supply</option>
                  </select>
                </div>

                {/* Condition & Warranty Toggles */}
                <div className="pt-4 border-t border-slate-200 space-y-2.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Offer Condition &amp; Warranty
                  </div>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeRefurb}
                      onChange={(e) => setIncludeRefurb(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                    />
                    <span>Include eBay Certified Refurb / Open-Box</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authorizedOnly}
                      onChange={(e) => setAuthorizedOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                    />
                    <span>Authorized OEM Dealers Only</span>
                  </label>
                  <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ulListedOnly}
                      onChange={(e) => setUlListedOnly(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                    />
                    <span>UL Listed Hardware Only</span>
                  </label>
                </div>

                {/* Max Price Slider */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <label
                      htmlFor="max-price-slider"
                      className="font-semibold text-slate-700"
                    >
                      Max Landed Price
                    </label>
                    <span className="font-mono font-semibold text-slate-900 tabular-nums">
                      ${maxPrice.toLocaleString()}
                    </span>
                  </div>
                  <input
                    id="max-price-slider"
                    type="range"
                    min={150}
                    max={6000}
                    step={50}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-slate-400 mt-0.5">
                    <span>$150</span>
                    <span>$6,000</span>
                  </div>
                </div>

                {/* System Voltage Filter */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Voltage Architecture
                  </div>
                  <div className="space-y-1.5">
                    {ALL_VOLTAGES.map((voltage) => (
                      <label
                        key={voltage}
                        className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedVoltages.includes(voltage)}
                          onChange={() => toggleVoltage(voltage)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                        />
                        <span>{voltage}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-700 mb-2">
                    Manufacturers ({ALL_BRANDS.length})
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {ALL_BRANDS.map((brand) => (
                      <label
                        key={brand}
                        className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={() => toggleBrand(brand)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                        />
                        <span>{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Main Price Comparison Results */}
              <div className="lg:col-span-9 space-y-4">
                {/* Sort & View Controls Toolbar */}
                <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-slate-600">
                    Showing{' '}
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {filteredProducts.length}
                    </strong>{' '}
                    models ·{' '}
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {filteredProducts.reduce(
                        (sum, p) =>
                          sum +
                          getFilteredOffers(p, {
                            includeRefurb,
                            authorizedOnly,
                            channelFilter: selectedChannel,
                          }).length,
                        0
                      )}
                    </strong>{' '}
                    store offers
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Function 1: 30% Sec. 25D Federal Tax Credit & Utility Rebate Controls */}
                    <button
                      type="button"
                      onClick={() => setApplyFederalCredit((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                        applyFederalCredit
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {applyFederalCredit
                        ? '30% Sec. 25D Net: ON'
                        : 'Apply 30% Sec. 25D Credit'}
                    </button>

                    {(applyFederalCredit || utilityRebatePct > 0) && (
                      <select
                        aria-label="Local utility solar rebate percentage"
                        value={utilityRebatePct}
                        onChange={(e) =>
                          setUtilityRebatePct(Number(e.target.value))
                        }
                        className="text-xs font-semibold border border-emerald-300 rounded-md px-2 py-1.5 bg-emerald-50 text-emerald-800 focus:outline-none"
                      >
                        <option value={0}>+0% Utility Rebate</option>
                        <option value={10}>+10% Utility Rebate</option>
                        <option value={20}>+20% Utility Rebate</option>
                      </select>
                    )}

                    {/* Function 5: Real-Time 90-Day Low & Store Arbitrage Filters */}
                    <button
                      type="button"
                      onClick={() =>
                        setDealFilterMode((m) =>
                          m === '90d-low' ? 'all' : '90d-low'
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                        dealFilterMode === '90d-low'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      At 90d Low
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDealFilterMode((m) =>
                          m === 'biggest-spread' ? 'all' : 'biggest-spread'
                        )
                      }
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                        dealFilterMode === 'biggest-spread'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      14%+ Spread
                    </button>

                    {/* Function 2: Price Watchlist & Alerts Button */}
                    <button
                      type="button"
                      onClick={() => setAlertsModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:border-amber-500 transition-colors whitespace-nowrap shrink-0 tabular-nums"
                    >
                      <BellRing className="w-3.5 h-3.5 text-amber-600" />
                      Alerts ({priceAlerts.length})
                      {triggeredAlertsCount > 0 && (
                        <span className="text-emerald-700 font-bold">
                          · {triggeredAlertsCount} Hit
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoiModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 tabular-nums"
                      title="Estimate time to achieve grid parity or full system cost recovery"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                      ROI Calculator
                    </button>

                    <button
                      type="button"
                      onClick={handleExportFilteredCsv}
                      disabled={filteredProducts.length === 0}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-800 hover:border-slate-900 hover:bg-slate-50 disabled:opacity-45 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
                      title="Export current filtered models and store prices as CSV for manual budget analysis"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      Export CSV
                    </button>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="sort-select"
                        className="text-xs text-slate-500 whitespace-nowrap"
                      >
                        Sort by
                      </label>
                      <select
                        id="sort-select"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(e.target.value as SortOption)
                        }
                        className="text-xs font-semibold border border-slate-200 rounded-md px-2.5 py-1.5 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      >
                        <option value="best-value-metric">
                          Best $/Wh or $/W
                        </option>
                        <option value="lowest-price">
                          Lowest Landed Price
                        </option>
                        <option value="highest-efficiency">
                          Highest Efficiency %
                        </option>
                        <option value="biggest-drop">
                          Largest 90-Day Drop
                        </option>
                        <option value="biggest-spread">
                          Largest Store Spread ($)
                        </option>
                      </select>
                    </div>

                    <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                          viewMode === 'table'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        aria-label="Cross-store comparison table view"
                      >
                        <Table2 className="w-3.5 h-3.5" />
                        Store Table
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                          viewMode === 'list'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        aria-label="Danawa list comparison view"
                      >
                        <List className="w-3.5 h-3.5" />
                        List
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                          viewMode === 'grid'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                        aria-label="Grid card view"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        Grid
                      </button>
                    </div>
                  </div>
                </div>

                {/* Empty Filter State */}
                {filteredProducts.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      No solar hardware matches all active filters
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      Reset the upper requirement bar or side spec filters to
                      view all 30 solar models and 300+ store offers.
                    </p>
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors"
                    >
                      Show All 30 Solar Products
                    </button>
                  </div>
                ) : viewMode === 'table' ? (
                  <StoreComparisonTable
                    products={filteredProducts}
                    includeRefurb={includeRefurb}
                    authorizedOnly={authorizedOnly}
                    applyFederalCredit={applyFederalCredit}
                    utilityRebatePct={utilityRebatePct}
                    compareIds={compareIds}
                    watchedProductIds={watchedProductIds}
                    onToggleCompare={toggleCompare}
                    onInspectProduct={(p) => setActiveProduct(p)}
                    onAddToBuild={handleAddToBuild}
                    onCopyPromoCode={handleCopyPromoCode}
                    onWatchProduct={handleWatchProduct}
                    onAskSwarmAgent={handleAskSwarmAgent}
                  />
                ) : viewMode === 'list' ? (
                  /* Danawa-Inspired Multi-Merchant Comparison List Rows */
                  <div className="space-y-3">
                    {filteredProducts.map((product) => {
                      const sortedOffers = getFilteredOffers(product, {
                        includeRefurb,
                        authorizedOnly,
                        channelFilter: selectedChannel,
                      });
                      const bestOffer = sortedOffers[0];
                      const lowestLanded = getOfferLandedPrice(bestOffer);
                      const unitVal = getUnitMetricValue(
                        product,
                        includeRefurb
                      );
                      const dropPct = get90DayDropPct(product);
                      const isCompared = compareIds.includes(product.id);

                      return (
                        <article
                          key={product.id}
                          className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 hover:border-slate-300 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                            <div className="md:col-span-3">
                              <button
                                type="button"
                                onClick={() => setActiveProduct(product)}
                                className="block w-full aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 text-left focus-visible:outline-2 focus-visible:outline-amber-600"
                              >
                                <HardwareImage
                                  src={product.image}
                                  alt={product.name}
                                  title={product.name}
                                />
                              </button>
                            </div>

                            <div className="md:col-span-5 space-y-2 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                                <span>{product.brand}</span>
                                <span aria-hidden="true">·</span>
                                <span>{CATEGORY_LABELS[product.category]}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono">{product.sku}</span>
                              </div>

                              <h3 className="text-base font-bold text-slate-900 leading-snug">
                                <button
                                  type="button"
                                  onClick={() => setActiveProduct(product)}
                                  className="text-left hover:text-amber-700 transition-colors"
                                >
                                  {product.name}
                                </button>
                              </h3>

                              <p className="text-xs font-mono text-slate-600 tabular-nums">
                                {product.summarySpec}
                              </p>

                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                {product.benchmark.bmsOrMpptVerdict}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleCompare(product.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                                    isCompared
                                      ? 'bg-slate-900 text-white border-slate-900'
                                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                  }`}
                                >
                                  {isCompared ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      In Matrix
                                    </>
                                  ) : (
                                    <>
                                      <GitCompareArrows className="w-3.5 h-3.5" />
                                      Compare
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddToBuild(
                                      product.id,
                                      bestOffer.merchantId
                                    )
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Add to Build
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setActiveProduct(product)}
                                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2 whitespace-nowrap"
                                >
                                  Compare {sortedOffers.length} Stores
                                </button>

                                <ShareControl
                                  variant="compact-inline"
                                  subjectLabel={product.name}
                                  shareUrl={buildSolarShareUrl({
                                    productId: product.id,
                                  })}
                                  shareText={`${product.name} — $${lowestLanded.toLocaleString()} lowest landed ($${unitVal.toFixed(2)} ${product.unitMetricType}) at ${bestOffer.merchantName} on SolarBench`}
                                  onCopied={() =>
                                    triggerNotice(
                                      `Copied share link for ${product.name}.`
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-5 space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-[11px] font-medium text-slate-500">
                                    Lowest Landed ({bestOffer.condition})
                                  </div>
                                  <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                                    ${lowestLanded.toLocaleString()}
                                  </div>
                                  {(applyFederalCredit ||
                                    utilityRebatePct > 0) && (
                                    <div className="text-[11px] font-mono font-semibold text-emerald-700 tabular-nums">
                                      Net $
                                      {getEffectiveNetPrice(
                                        product,
                                        lowestLanded,
                                        applyFederalCredit,
                                        utilityRebatePct
                                      ).toLocaleString()}
                                      {applyFederalCredit &&
                                      isSec25DEligible(product)
                                        ? ' (Sec. 25D)'
                                        : ''}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-xs font-mono tabular-nums mt-0.5">
                                    <span className="font-semibold text-amber-700">
                                      ${unitVal.toFixed(2)}{' '}
                                      {product.unitMetricType}
                                    </span>
                                    {dropPct > 0 && (
                                      <span className="inline-flex items-center text-emerald-700 font-semibold">
                                        <ArrowDownRight className="w-3.5 h-3.5" />
                                        {dropPct}% 90d
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 pt-1">
                                  <PriceSparkline
                                    data={product.priceHistory90d}
                                    width={88}
                                    height={28}
                                  />
                                </div>
                              </div>

                              <div className="divide-y divide-slate-100 border-t border-slate-100 pt-1">
                                {sortedOffers.slice(0, 4).map((offer, idx) => {
                                  const total = getOfferLandedPrice(offer);
                                  return (
                                    <button
                                      key={offer.merchantId}
                                      type="button"
                                      onClick={() => setActiveProduct(product)}
                                      className="w-full py-1.5 flex items-center justify-between text-xs hover:bg-slate-50 rounded px-1 -mx-1 transition-colors"
                                    >
                                      <span
                                        className={`truncate pr-2 ${
                                          idx === 0
                                            ? 'font-semibold text-slate-900'
                                            : 'text-slate-600'
                                        }`}
                                      >
                                        {offer.merchantName}
                                      </span>
                                      <span className="font-mono tabular-nums shrink-0 flex items-center gap-2">
                                        <span className="text-[11px] text-slate-400">
                                          {offer.couponDiscount
                                            ? `-$${offer.couponDiscount}`
                                            : offer.shipping === 0
                                            ? 'Free'
                                            : `+$${offer.shipping}`}
                                        </span>
                                        <span
                                          className={
                                            idx === 0
                                              ? 'font-bold text-emerald-700'
                                              : 'font-medium text-slate-800'
                                          }
                                        >
                                          ${total.toLocaleString()}
                                        </span>
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  /* Uniform 3-Column E-Commerce Grid View */
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                      const matching = getFilteredOffers(product, {
                        includeRefurb,
                        authorizedOnly,
                        channelFilter: selectedChannel,
                      });
                      const bestOffer = matching[0];
                      const landed = getOfferLandedPrice(bestOffer);
                      const unitVal = getUnitMetricValue(
                        product,
                        includeRefurb
                      );
                      const isCompared = compareIds.includes(product.id);

                      return (
                        <article
                          key={product.id}
                          className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveProduct(product)}
                            className="aspect-[4/3] w-full bg-slate-100 overflow-hidden block text-left"
                          >
                            <HardwareImage
                              src={product.image}
                              alt={product.name}
                              title={product.name}
                            />
                          </button>

                          <div className="p-4 flex-1 flex flex-col">
                            <div className="text-xs text-slate-500">
                              {product.brand} ·{' '}
                              {CATEGORY_LABELS[product.category]} ·{' '}
                              {matching.length} Stores
                            </div>
                            <h3 className="text-base font-semibold text-slate-900 mt-1 line-clamp-2">
                              <button
                                type="button"
                                onClick={() => setActiveProduct(product)}
                                className="text-left hover:text-amber-700 transition-colors"
                              >
                                {product.name}
                              </button>
                            </h3>

                            <p className="text-xs font-mono text-slate-600 mt-2 line-clamp-1">
                              {product.summarySpec}
                            </p>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex items-baseline justify-between gap-2">
                              <div>
                                <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                  ${landed.toLocaleString()}
                                </div>
                                {(applyFederalCredit || utilityRebatePct > 0) && (
                                  <div className="text-[11px] font-mono font-semibold text-emerald-700 tabular-nums">
                                    Net $
                                    {getEffectiveNetPrice(
                                      product,
                                      landed,
                                      applyFederalCredit,
                                      utilityRebatePct
                                    ).toLocaleString()}
                                  </div>
                                )}
                                <div className="text-[11px] text-slate-500 truncate max-w-[140px]">
                                  {bestOffer.merchantName}
                                </div>
                              </div>
                              <div className="text-right font-mono text-xs font-semibold text-amber-700 tabular-nums">
                                ${unitVal.toFixed(2)} {product.unitMetricType}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-3">
                              <button
                                type="button"
                                onClick={() => toggleCompare(product.id)}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                                  isCompared
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                                }`}
                              >
                                {isCompared ? 'In Matrix' : 'Compare'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToBuild(
                                    product.id,
                                    bestOffer.merchantId
                                  )
                                }
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
                              >
                                Add to Build
                              </button>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                              <ShareControl
                                variant="compact-inline"
                                subjectLabel={product.name}
                                shareUrl={buildSolarShareUrl({
                                  productId: product.id,
                                })}
                                shareText={`${product.name} — $${landed.toLocaleString()} lowest landed ($${unitVal.toFixed(2)} ${product.unitMetricType}) at ${bestOffer.merchantName} on SolarBench`}
                                onCopied={() =>
                                  triggerNotice(
                                    `Copied share link for ${product.name}.`
                                  )
                                }
                              />
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom-Right Paid Ads Section: Daily #1 Best-Seller Deep Research & Voice-Only Video Blueprint */}
        <PaidDailySpotlightSection
          catalog={SOLAR_PRODUCTS}
          onInspectProduct={(p) => setActiveProduct(p)}
          onAddToBuild={handleAddToBuild}
          onAskSwarmAgent={handleAskSwarmAgent}
          socialFeedCards={socialFeedCards}
          onDailyBestSellerChange={setActiveDailySpotlight}
          onToggleLikeSocialCard={toggleLikeSocialCard}
          onToggleRepostSocialCard={toggleRepostSocialCard}
          onDismissSocialCard={dismissSocialCard}
          onClearSocialFeed={clearSocialFeed}
          onNotify={triggerNotice}
        />

        {/* Side-by-Side Spec Matrix */}
        <ComparisonMatrix
          products={comparedProducts}
          applyFederalCredit={applyFederalCredit}
          utilityRebatePct={utilityRebatePct}
          onRemove={(id) =>
            setCompareIds((prev) => prev.filter((item) => item !== id))
          }
          onClear={() => setCompareIds([])}
          onLoadPreset={(ids) => {
            setCompareIds(ids);
            triggerNotice('Updated side-by-side comparison preset.');
          }}
          onInspect={(product) => setActiveProduct(product)}
          onAddToBuild={handleAddToBuild}
          onAskSwarmAgent={handleAskSwarmAgent}
        />

        {/* DIY Solar System Cost & Compatibility Builder */}
        <SystemBuilderSection
          items={buildItems}
          catalog={SOLAR_PRODUCTS}
          applyFederalCredit={applyFederalCredit}
          utilityRebatePct={utilityRebatePct}
          user={user}
          savedBuilds={savedBuilds}
          onSaveBuild={handleSaveBuild}
          onUpdateSavedBuild={handleUpdateSavedBuild}
          onLoadSavedBuild={handleLoadSavedBuild}
          onDeleteSavedBuild={handleDeleteSavedBuild}
          onOptimizeBuild={handleOptimizeBuild}
          onApplyConsolidatedChannel={handleApplyConsolidatedChannel}
          onApplyLoadSizingToFilter={handleApplyLoadSizingToFilter}
          onAutoBuildFromSizing={handleAutoBuildFromSizing}
          onCopyPromoBundle={handleCopyPromoBundle}
          onUpdateQty={handleUpdateQty}
          onAddBatteryUnits={handleAddBulkBatteryUnits}
          onChangeMerchant={handleChangeMerchant}
          onRemoveItem={handleRemoveBuildItem}
          onLoadStarterKit={handleLoadStarterKit}
          quoteSnapshots={quoteSnapshots}
          onSaveQuoteSnapshot={handleSaveQuoteSnapshot}
          onDeleteQuoteSnapshot={handleDeleteQuoteSnapshot}
          onLoadQuoteSnapshot={handleLoadQuoteSnapshot}
          onAskSwarmAgent={handleAskSwarmAgent}
          utilityRate={preferredUtilityRate}
          onChangeUtilityRate={(nextRate) => applyAndSaveUtilityRate(nextRate)}
          onOpenRoiCalculator={() => setRoiModalOpen(true)}
        />

        {/* Independent Testing & Price Index Methodology */}
        <section
          id="methodology"
          className="py-14 bg-white border-t border-slate-200"
          aria-labelledby="methodology-heading"
        >
          <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <p className="text-xs font-medium text-slate-500">
                Testing Standard · Normalized Cost Math
              </p>
              <h2
                id="methodology-heading"
                className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1"
              >
                How SolarBench Evaluates Solar Hardware
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <div className="font-mono text-xs font-semibold text-amber-700">
                  01. Cross-Platform Landed Math
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  Item + Freight − Verified Coupons
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  We merge offers across Amazon, eBay, Walmart, Home Depot, and
                  specialty distributors (Signature Solar, Current Connected,
                  SanTan Solar, ShopSolar), adjusting for LTL liftgate freight
                  and active coupon codes.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <div className="font-mono text-xs font-semibold text-amber-700">
                  02. Purpose-Fit Scoring (1–10)
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  Requirement Match &amp; Teardown Safety
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  Each model&apos;s 1–10 score weighs purpose alignment, UL
                  certifications, verified $/Wh or $/W efficiency, delivery
                  speed, and buyer/review volume for your exact search criteria.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50">
                <div className="font-mono text-xs font-semibold text-amber-700">
                  03. Authorized Warranty Tracking
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  New OEM vs. Certified Refurbished
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">
                  Every row flags whether an eBay outlet, marketplace seller, or
                  distributor carries full 10–25 year OEM warranty coverage or a
                  2-year third-party Allstate refurb protection plan.
                </p>
              </div>
            </div>

            <LocalAiLlmSection
              matchedCount={localAiServerCount}
              onFilterSolarForServer={handleFilterSolarForLocalAiServer}
            />
          </div>
        </section>

        {/* Autonomous 15-Agent Swarm Command & Human CEO Oversight */}
        <SwarmCommandCenter
          catalog={SOLAR_PRODUCTS}
          buildItems={buildItems}
          utilityRate={preferredUtilityRate}
          user={user}
          runs={swarmRuns}
          metrics={swarmMetrics}
          autonomousStatus={autonomousStatus}
          isSweepingAutonomous={isSweepingAutonomous}
          onToggleAutopilot={handleToggleAutopilot}
          onTriggerAutonomousSweep={handleTriggerAutonomousSweep}
          externalMissionRequest={swarmMissionRequest}
          onUpdateMetrics={setSwarmMetrics}
          onUpdateRuns={setSwarmRuns}
          onExecuteCeoProposal={handleExecuteCeoProposal}
          onJumpToFeature={handleJumpToFeature}
          onNotify={triggerNotice}
        />

        {/* Audience Growth, SEO Schema & Catalog Operations Hub */}
        <GrowthDistributionHub
          catalog={SOLAR_PRODUCTS}
          compareIds={compareIds}
          utilityRate={preferredUtilityRate}
          clickSummary={clickSummary}
          briefs={growthBriefs}
          socialFeedCards={socialFeedCards}
          onToggleLikeSocialCard={toggleLikeSocialCard}
          onToggleRepostSocialCard={toggleRepostSocialCard}
          onDismissSocialCard={dismissSocialCard}
          onClearSocialFeed={clearSocialFeed}
          onRefreshAnalytics={refreshGrowthAnalytics}
          onBriefCreated={(brief) =>
            setGrowthBriefs((prev) => [brief, ...prev].slice(0, 12))
          }
          onApplyUtilityRate={(rate, label) => {
            applyAndSaveUtilityRate(rate, label);
            triggerNotice(`Applied ${label} benchmark ($${rate.toFixed(2)}/kWh).`);
          }}
          onLoadComparePreset={(ids) => {
            setCompareIds(ids);
            document
              .getElementById('compare')
              ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            triggerNotice('Staged comparison cluster into Spec Matrix.');
          }}
          onInspectProduct={(p) => setActiveProduct(p)}
          onAskSwarmAgent={handleAskSwarmAgent}
          onNotify={triggerNotice}
        />

        {/* Frequently Asked Questions Accordion */}
        <FaqAccordionSection onAskSwarmAgent={handleAskSwarmAgent} />
      </main>

      {/* Clean Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="font-display text-lg font-bold text-white">
              SolarBench
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Independent price comparison and specification index dedicated
              exclusively to photovoltaic panels, LiFePO4 storage, inverters, and
              MPPT charge controllers across 10+ distribution platforms.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <a href="#swarm" className="hover:text-white transition-colors">
              Swarm HQ
            </a>
            <a href="#top" className="hover:text-white transition-colors">
              Top 3 Advisor
            </a>
            <a href="#catalog" className="hover:text-white transition-colors">
              Store Table
            </a>
            <a
              href="#daily-spotlight"
              className="hover:text-white transition-colors"
            >
              Daily #1 Ad
            </a>
            <a href="#compare" className="hover:text-white transition-colors">
              Spec Matrix
            </a>
            <a href="#builder" className="hover:text-white transition-colors">
              System Builder
            </a>
            <a
              href="#growth-hub"
              className="hover:text-white transition-colors"
            >
              Growth Hub
            </a>
            <a
              href="#local-ai-llm-setup"
              className="hover:text-white transition-colors"
            >
              Local AI LLM Setup
            </a>
            <a href="#faq" className="hover:text-white transition-colors">
              FAQ
            </a>
            <a
              href="https://soundcarewa.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-300 transition-colors"
            >
              Partner: SoundCare WA
            </a>
          </div>
        </div>
      </footer>

      {sharedModalsAndToast}
    </div>
  );
}
