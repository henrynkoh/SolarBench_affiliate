import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  BatteryCharging,
  BellRing,
  Bookmark,
  Calculator,
  Check,
  Clock,
  Copy,
  ExternalLink,
  GitCompareArrows,
  Loader2,
  LogIn,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  PriceAlertRecord,
  SolarProduct,
  UtilityRateProfileRecord,
} from '../types/solar';
import { signInWithGoogleForArchive } from '../lib/firebase';
import {
  CATEGORY_LABELS,
  getBestOffer,
  getFilteredOffers,
  getLandedPrice,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import {
  computeBatteryRuntime,
  computeYearsToPayback,
  evaluateWarrantyAndPermit,
  extractPromoCode,
  getEffectiveNetPrice,
  getLifecycleCostMetrics,
  getPriceArbitrageMetrics,
  isSec25DEligible,
} from '../data/solarEconomics';
import {
  buildMerchantOfferUrl,
  trackOutboundClickClient,
} from '../data/affiliateRouting';
import { EnergyDensityChart } from './EnergyDensityChart';
import { HardwareImage } from './HardwareImage';
import { PriceHistoryChart } from './PriceSparkline';
import { RoiProjectionChart } from './RoiProjectionChart';
import { ShareControl, buildSolarShareUrl } from './ShareControl';
import { ThermalPerformanceChart } from './ThermalPerformanceChart';

interface ProductDetailModalProps {
  product: SolarProduct | null;
  onClose: () => void;
  isCompared: boolean;
  onToggleCompare: (productId: string) => void;
  onAddToBuild: (productId: string, merchantId: string) => void;
  applyFederalCredit: boolean;
  utilityRebatePct: number;
  includeRefurb: boolean;
  alerts: PriceAlertRecord[];
  onCreateAlert: (input: {
    productId: string;
    productName: string;
    brand: string;
    targetPrice: number;
    lowestLandedAtCreation: number;
  }) => Promise<void>;
  onDeleteAlert: (alertId: string) => Promise<void>;
  onCopyPromoCode: (code: string, merchantName: string) => void;
  user?: User | null;
  utilityProfiles?: UtilityRateProfileRecord[];
  defaultUtilityRate?: number;
  onSaveUtilityProfile?: (input: {
    label: string;
    locationQuery: string;
    utilityContext: string;
    ratePerKwh: number;
    isDefault?: boolean;
  }) => Promise<void>;
  onDeleteUtilityProfile?: (profileId: number) => Promise<void>;
}

interface GroundedRateSource {
  title: string;
  uri: string;
}

interface GroundedRateInfo {
  ratePerKwh: number;
  resolvedLocation: string;
  utilityContext: string;
  explanation: string;
  sources: GroundedRateSource[];
}

const QUICK_RATE_LOCATIONS = [
  'San Diego, CA',
  'Austin, TX',
  'Boston, MA',
  'Honolulu, HI',
];

const RUNTIME_LOAD_PRESETS: { label: string; watts: number }[] = [
  { label: 'LED Lights + Router', watts: 65 },
  { label: 'Inverter Fridge', watts: 140 },
  { label: 'Home Office + Starlink', watts: 250 },
  { label: 'Gas Furnace Blower', watts: 550 },
  { label: 'Local AI LLM Rig', watts: 850 },
  { label: 'Space Heater / Kettle', watts: 1500 },
];

function getBaseProductCapacity(product: SolarProduct): {
  baseCapacity: number;
  unitLabel: 'kWh' | 'kW';
  defaultDailyUtil: number;
  dailyUtilLabel: string;
} {
  if (product.category === 'batteries' || product.category === 'portable') {
    return {
      baseCapacity: Number(((product.specs.capacityWh ?? 5000) / 1000).toFixed(2)),
      unitLabel: 'kWh',
      defaultDailyUtil: 1.0,
      dailyUtilLabel: 'Cycles / Day',
    };
  }
  if (product.category === 'panels') {
    return {
      baseCapacity: Number(((product.specs.powerWatts ?? 400) / 1000).toFixed(2)),
      unitLabel: 'kW',
      defaultDailyUtil: 4.8,
      dailyUtilLabel: 'Peak Sun Hrs / Day',
    };
  }
  return {
    baseCapacity: Number(((product.specs.powerWatts ?? 5000) / 1000).toFixed(2)),
    unitLabel: 'kW',
    defaultDailyUtil: 4.5,
    dailyUtilLabel: 'Solar Hrs / Day',
  };
}

export function ProductDetailModal({
  product,
  onClose,
  isCompared,
  onToggleCompare,
  onAddToBuild,
  applyFederalCredit,
  utilityRebatePct,
  includeRefurb,
  alerts,
  onCreateAlert,
  onDeleteAlert,
  onCopyPromoCode,
  user = null,
  utilityProfiles = [],
  defaultUtilityRate = 0.24,
  onSaveUtilityProfile,
  onDeleteUtilityProfile,
}: ProductDetailModalProps) {
  const [targetAlertPrice, setTargetAlertPrice] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedMerchantId, setCopiedMerchantId] = useState<string | null>(null);
  const [utilityRate, setUtilityRate] = useState(defaultUtilityRate);
  const [locationQuery, setLocationQuery] = useState('');
  const [isLookingUpRate, setIsLookingUpRate] = useState(false);
  const [rateLookupError, setRateLookupError] = useState<string | null>(null);
  const [groundedRateInfo, setGroundedRateInfo] =
    useState<GroundedRateInfo | null>(null);
  const [paybackUnits, setPaybackUnits] = useState(1);
  const [paybackCapacity, setPaybackCapacity] = useState(5);
  const [dailyUtilization, setDailyUtilization] = useState(1);
  const [useIncentiveNetCost, setUseIncentiveNetCost] = useState(
    applyFederalCredit || utilityRebatePct > 0
  );
  const [runtimeLoadWatts, setRuntimeLoadWatts] = useState(140);
  const [runtimeUnits, setRuntimeUnits] = useState(1);
  const [runtimeDodPct, setRuntimeDodPct] = useState(80);
  const [runtimeOutputMode, setRuntimeOutputMode] = useState<
    'ac-inverter' | 'dc-direct'
  >('ac-inverter');

  useEffect(() => {
    if (!product) return;
    const lowest = getLandedPrice(product, includeRefurb);
    setTargetAlertPrice(String(Math.max(50, Math.round(lowest * 0.92))));
  }, [product, includeRefurb]);

  useEffect(() => {
    if (!product) return;
    const defaults = getBaseProductCapacity(product);
    setPaybackUnits(1);
    setPaybackCapacity(defaults.baseCapacity);
    setDailyUtilization(defaults.defaultDailyUtil);
    setRuntimeUnits(1);
    setRuntimeLoadWatts(140);
    setRuntimeDodPct(80);
    setUtilityRate(defaultUtilityRate);
  }, [product, defaultUtilityRate]);

  useEffect(() => {
    setUseIncentiveNetCost(applyFederalCredit || utilityRebatePct > 0);
  }, [applyFederalCredit, utilityRebatePct]);

  useEffect(() => {
    if (!product) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [product, onClose]);

  if (!product) return null;

  const sortedOffers = getFilteredOffers(product, { includeRefurb });
  const bestOffer = sortedOffers[0] ?? getBestOffer(product, includeRefurb);
  const lowestLanded = getOfferLandedPrice(bestOffer);
  const netPrice = getEffectiveNetPrice(
    product,
    lowestLanded,
    applyFederalCredit,
    utilityRebatePct
  );
  const sec25dApplies = isSec25DEligible(product);
  const unitVal = getUnitMetricValue(product, includeRefurb);
  const savingsVsMsrp = product.msrp - lowestLanded;

  const arbitrage = getPriceArbitrageMetrics(product, includeRefurb);
  const lifecycle = getLifecycleCostMetrics(product, lowestLanded, utilityRate);
  const warrantyPermit = evaluateWarrantyAndPermit(product, bestOffer);
  const existingAlerts = alerts.filter((a) => a.productId === product.id);

  const capacityDefaults = getBaseProductCapacity(product);
  const activeUnitCost =
    useIncentiveNetCost && (applyFederalCredit || utilityRebatePct > 0)
      ? netPrice
      : lowestLanded;
  const totalSystemCost = activeUnitCost * paybackUnits;
  const payback = computeYearsToPayback({
    systemCost: totalSystemCost,
    category: product.category,
    systemCapacityValue: paybackCapacity,
    dailyUtilization,
    efficiencyPct: product.specs.efficiencyPct,
    ratePerKwh: utilityRate,
  });

  const isBatteryRuntimeEligible =
    (product.category === 'batteries' || product.category === 'portable') &&
    (product.specs.capacityWh ?? 0) > 0;

  const batteryRuntime = isBatteryRuntimeEligible
    ? computeBatteryRuntime({
        capacityWh: product.specs.capacityWh ?? 0,
        unitCount: runtimeUnits,
        loadWatts: runtimeLoadWatts,
        dodPct: runtimeDodPct,
        batteryEfficiencyPct: product.specs.efficiencyPct,
        outputMode: runtimeOutputMode,
        maxContinuousWatts:
          product.specs.powerWatts ?? product.specs.capacityWh ?? 5000,
      })
    : null;

  const handleLookupElectricityRate = async (targetLocation?: string) => {
    const query = (targetLocation ?? locationQuery).trim();
    if (!query) {
      setRateLookupError('Enter a city, state, or ZIP code to ground local rates.');
      return;
    }
    if (targetLocation) {
      setLocationQuery(targetLocation);
    }
    setIsLookingUpRate(true);
    setRateLookupError(null);
    try {
      const response = await fetch('/api/electricity-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: query }),
      });
      const data = (await response.json()) as Partial<GroundedRateInfo> & {
        error?: string;
      };
      if (!response.ok || typeof data.ratePerKwh !== 'number') {
        throw new Error(
          data.error || 'Unable to retrieve local electricity rate via Search.'
        );
      }
      setUtilityRate(Number(data.ratePerKwh.toFixed(3)));
      setGroundedRateInfo({
        ratePerKwh: Number(data.ratePerKwh.toFixed(3)),
        resolvedLocation: data.resolvedLocation || query,
        utilityContext: data.utilityContext || 'Local Residential Tariff',
        explanation:
          data.explanation ||
          'Average residential electricity tariff retrieved via Google Search.',
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (err) {
      setRateLookupError(
        err instanceof Error
          ? err.message
          : 'Search rate lookup failed. Enter your $/kWh rate manually.'
      );
    } finally {
      setIsLookingUpRate(false);
    }
  };

  const handleUnitsChange = (nextUnitsRaw: number) => {
    const nextUnits = Math.max(1, Math.min(24, Math.round(nextUnitsRaw) || 1));
    setPaybackUnits(nextUnits);
    setPaybackCapacity(
      Number((capacityDefaults.baseCapacity * nextUnits).toFixed(2))
    );
  };

  const handleSaveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(targetAlertPrice);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    setSavingAlert(true);
    try {
      await onCreateAlert({
        productId: product.id,
        productName: product.name,
        brand: product.brand,
        targetPrice: numeric,
        lowestLandedAtCreation: lowestLanded,
      });
    } finally {
      setSavingAlert(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{CATEGORY_LABELS[product.category]}</span>
              <span aria-hidden="true">·</span>
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.sku}</span>
            </div>
            <h2
              id="pdp-title"
              className="text-lg md:text-xl font-bold text-slate-900 truncate mt-0.5"
            >
              {product.name}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block">
              <ShareControl
                variant="inline"
                subjectLabel={product.name}
                shareUrl={buildSolarShareUrl({ productId: product.id })}
                shareText={`${product.name} — $${lowestLanded.toLocaleString()} lowest landed ($${unitVal.toFixed(2)} ${product.unitMetricType}) at ${bestOffer.merchantName} on SolarBench`}
              />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shrink-0"
              aria-label="Close product comparison details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-4 space-y-4">
              <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                <HardwareImage
                  src={product.image}
                  alt={product.name}
                  title={product.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Function 9: UL Permit & Authorized OEM Warranty Guard */}
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    {bestOffer.isAuthorizedDealer ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                    )}
                    Permit &amp; Warranty Guard
                  </span>
                  <span
                    className={`font-semibold ${
                      bestOffer.isAuthorizedDealer
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {bestOffer.isAuthorizedDealer ? 'OEM Authorized' : '3P Risk'}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-800">
                  {warrantyPermit.warrantyStatus}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {warrantyPermit.permitNote}
                </p>
                <div className="pt-1.5 border-t border-slate-100 text-[11px] font-mono text-slate-500">
                  {warrantyPermit.certSummary}
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Bench Teardown Verdict
                  </span>
                  <span className="text-slate-500">
                    Tested {product.benchmark.testedDate}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {product.benchmark.internalBuildNote}
                </p>
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 space-y-1">
                  <p>
                    <strong className="font-semibold text-slate-800">
                      Thermal Test:
                    </strong>{' '}
                    {product.benchmark.thermalResult}
                  </p>
                  <p>
                    <strong className="font-semibold text-slate-800">
                      Engineering Takeaway:
                    </strong>{' '}
                    {product.benchmark.bmsOrMpptVerdict}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-500">
                      Lowest Verified Landed Price Across {sortedOffers.length} Stores
                    </p>
                    <div className="flex flex-wrap items-baseline gap-3 mt-1">
                      <span className="text-3xl font-bold text-slate-900 font-mono tabular-nums">
                        ${lowestLanded.toLocaleString()}
                      </span>
                      {(applyFederalCredit || utilityRebatePct > 0) && (
                        <span className="text-sm font-bold font-mono tabular-nums text-emerald-700">
                          Net ${netPrice.toLocaleString()}
                          {applyFederalCredit && sec25dApplies
                            ? ' (after 30% Sec. 25D)'
                            : utilityRebatePct > 0
                            ? ` (after ${utilityRebatePct}% rebate)`
                            : ' (under 3kWh exempt)'}
                        </span>
                      )}
                      <span className="text-sm text-slate-400 line-through font-mono tabular-nums">
                        MSRP ${product.msrp.toLocaleString()}
                      </span>
                      {savingsVsMsrp > 0 && (
                        <span className="text-xs font-semibold text-emerald-700">
                          Save ${savingsVsMsrp.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-2">
                      <span>
                        Best Offer:{' '}
                        <strong className="text-slate-900">
                          {bestOffer.merchantName}
                        </strong>{' '}
                        ({bestOffer.condition})
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums font-semibold text-amber-700">
                        ${unitVal.toFixed(2)} {product.unitMetricType}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{bestOffer.leadTime}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => onToggleCompare(product.id)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                        isCompared
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {isCompared ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          In Compare Matrix
                        </>
                      ) : (
                        <>
                          <GitCompareArrows className="w-3.5 h-3.5" />
                          Compare Specs
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAddToBuild(product.id, bestOffer.merchantId);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to System Build
                    </button>
                  </div>
                </div>

                {/* Function 2: Inline Target Price-Drop Alert Form with Quick Presets */}
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <BellRing className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        Track target landed price across all {sortedOffers.length} stores
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <button
                        type="button"
                        onClick={() =>
                          setTargetAlertPrice(String(Math.round(lowestLanded * 0.95)))
                        }
                        className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-slate-700 hover:border-amber-500"
                      >
                        -5% (${Math.round(lowestLanded * 0.95).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTargetAlertPrice(String(Math.round(lowestLanded * 0.9)))
                        }
                        className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 font-mono text-slate-700 hover:border-amber-500"
                      >
                        -10% (${Math.round(lowestLanded * 0.9).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setTargetAlertPrice(String(arbitrage.low90d))
                        }
                        className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 font-mono text-emerald-700 hover:border-emerald-400"
                      >
                        90d Low (${arbitrage.low90d.toLocaleString()})
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => void handleSaveAlert(e)}
                    className="flex items-center gap-2"
                  >
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                        $
                      </span>
                      <input
                        type="number"
                        min={10}
                        max={100000}
                        value={targetAlertPrice}
                        onChange={(e) => setTargetAlertPrice(e.target.value)}
                        aria-label="Target alert price in USD"
                        className="w-28 pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingAlert}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                    >
                      {savingAlert ? 'Saving...' : 'Set Price Alert'}
                    </button>
                  </form>
                </div>

                {existingAlerts.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                    {existingAlerts.map((al) => {
                      const triggered = lowestLanded <= al.targetPrice;
                      return (
                        <div
                          key={al.alertId}
                          className="flex items-center gap-2 font-mono tabular-nums"
                        >
                          <span
                            className={
                              triggered
                                ? 'font-semibold text-emerald-700'
                                : 'text-slate-700'
                            }
                          >
                            Watching ≤ ${al.targetPrice.toLocaleString()}
                            {triggered ? ' (Reached!)' : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => void onDeleteAlert(al.alertId)}
                            className="text-slate-400 hover:text-rose-600"
                            aria-label="Remove price alert"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Functions 5 & 7: 3-Card Arbitrage + Lifetime $/kWh + Local Tariff 5-Year Payback Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="text-[11px] font-medium text-slate-500">
                    90-Day Arbitrage &amp; Buy Signal
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1">
                    {arbitrage.buySignal}
                  </div>
                  <div className="text-xs font-mono text-slate-600 mt-1 tabular-nums">
                    Store spread ${arbitrage.spreadDollar.toLocaleString()} (
                    {arbitrage.spreadPct}%) · {arbitrage.percentile90d}th pct
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="text-[11px] font-medium text-slate-500">
                    Lifetime Levelized Cost
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900 mt-1 tabular-nums">
                    ${lifecycle.costPerDeliveredKwh.toFixed(3)} / kWh
                  </div>
                  <div className="text-xs font-mono text-slate-600 mt-1 tabular-nums">
                    {lifecycle.lifetimeKwhDelivered.toLocaleString()} kWh est. output
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-slate-500">
                      5-Yr Grid Offset
                    </span>
                    <span className="text-[10px] font-mono text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 tabular-nums">
                      ${utilityRate.toFixed(2)}/kWh
                    </span>
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-700 mt-1 tabular-nums">
                    ${lifecycle.fiveYearUtilityValue.toLocaleString()} value
                  </div>
                  <div className="text-xs font-mono text-slate-600 mt-1 tabular-nums">
                    {payback.breakEvenYearLabel} break-even · vs gen{' '}
                    {lifecycle.fiveYearGasGenSavings >= 0 ? '+' : ''}
                    ${lifecycle.fiveYearGasGenSavings.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Interactive Years to Payback & Break-Even Calculator (Search-Grounded Local Rates) */}
              <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Calculator className="w-4 h-4 text-amber-600 shrink-0" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Years to Payback &amp; Break-Even Calculator
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ground your local utility tariff via Search and adjust system capacity to estimate exact break-even ROI.
                    </p>
                  </div>

                  {(applyFederalCredit || utilityRebatePct > 0) && (
                    <button
                      type="button"
                      onClick={() => setUseIncentiveNetCost((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                        useIncentiveNetCost
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {useIncentiveNetCost
                        ? `Using Net Cost ($${activeUnitCost.toLocaleString()}/unit)`
                        : `Using Gross Cost ($${lowestLanded.toLocaleString()}/unit)`}
                    </button>
                  )}
                </div>

                {/* Location Lookup Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleLookupElectricityRate();
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        placeholder="Enter ZIP, city, or state (e.g. San Diego, CA or 78701)"
                        aria-label="Location for local electricity rate lookup"
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-600"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLookingUpRate}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
                    >
                      {isLookingUpRate ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Searching Rates...
                        </>
                      ) : (
                        <>
                          <Search className="w-3.5 h-3.5" />
                          Ground Rate via Search
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500 mr-1">Quick lookup:</span>
                    {QUICK_RATE_LOCATIONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={isLookingUpRate}
                        onClick={() => void handleLookupElectricityRate(preset)}
                        className="px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:border-amber-500 hover:text-amber-700 transition-colors whitespace-nowrap"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>

                  {rateLookupError && (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      {rateLookupError}
                    </div>
                  )}

                  {groundedRateInfo && (
                    <div className="bg-white border border-emerald-200 rounded-md p-3 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-900">
                          {groundedRateInfo.resolvedLocation} ·{' '}
                          <span className="text-slate-600 font-normal">
                            {groundedRateInfo.utilityContext}
                          </span>
                        </span>
                        <span className="font-mono font-bold text-emerald-700 tabular-nums">
                          ${groundedRateInfo.ratePerKwh.toFixed(3)} / kWh
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {groundedRateInfo.explanation}
                      </p>
                      {groundedRateInfo.sources.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                          <span className="text-slate-500 font-medium">
                            Search sources:
                          </span>
                          {groundedRateInfo.sources.map((src) => (
                            <a
                              key={src.uri}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-800 hover:underline max-w-[220px] truncate"
                            >
                              <span className="truncate">{src.title}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Saved Regional Tariff Presets (Synced to Signed-In Account) */}
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-500 font-medium flex items-center gap-1">
                        <Bookmark className="w-3 h-3 text-amber-600" />
                        Saved Tariffs:
                      </span>
                      {user && user.emailVerified ? (
                        utilityProfiles.length > 0 ? (
                          utilityProfiles.map((prof) => {
                            const isSelected =
                              Math.abs(prof.ratePerKwh - utilityRate) < 0.002;
                            return (
                              <span
                                key={prof.id}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                                  isSelected
                                    ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUtilityRate(prof.ratePerKwh);
                                    setLocationQuery(prof.locationQuery);
                                  }}
                                  className="hover:text-amber-700 whitespace-nowrap font-mono tabular-nums"
                                >
                                  {prof.label} (${prof.ratePerKwh.toFixed(2)})
                                </button>
                                {onDeleteUtilityProfile && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void onDeleteUtilityProfile(prof.id)
                                    }
                                    aria-label={`Remove saved tariff ${prof.label}`}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-slate-500">
                            No saved tariff presets yet.
                          </span>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => void signInWithGoogleForArchive()}
                          className="inline-flex items-center gap-1 text-slate-700 font-semibold hover:text-amber-700"
                        >
                          <LogIn className="w-3 h-3" />
                          Sign in with Google to save regional tariffs
                        </button>
                      )}
                    </div>

                    {user && user.emailVerified && onSaveUtilityProfile && (
                      <button
                        type="button"
                        disabled={savingProfile}
                        onClick={async () => {
                          setSavingProfile(true);
                          try {
                            const label =
                              groundedRateInfo?.resolvedLocation ||
                              locationQuery.trim() ||
                              `Custom $${utilityRate.toFixed(2)} Tariff`;
                            await onSaveUtilityProfile({
                              label,
                              locationQuery:
                                locationQuery.trim() ||
                                groundedRateInfo?.resolvedLocation ||
                                label,
                              utilityContext:
                                groundedRateInfo?.utilityContext ||
                                'Custom Residential Rate',
                              ratePerKwh: utilityRate,
                              isDefault: true,
                            });
                          } finally {
                            setSavingProfile(false);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-800 font-semibold hover:border-amber-500 hover:text-amber-700 disabled:opacity-50 whitespace-nowrap shrink-0"
                      >
                        <Bookmark className="w-3 h-3" />
                        {savingProfile
                          ? 'Saving...'
                          : `Save $${utilityRate.toFixed(2)}/kWh`}
                      </button>
                    )}
                  </div>
                </form>

                {/* Adjustable Capacity, Units, Rate & Utilization Controls */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      Hardware Units
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      step={1}
                      value={paybackUnits}
                      onChange={(e) => handleUnitsChange(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      System Capacity ({capacityDefaults.unitLabel})
                    </span>
                    <input
                      type="number"
                      min={0.2}
                      max={250}
                      step={capacityDefaults.unitLabel === 'kW' ? 0.2 : 0.5}
                      value={paybackCapacity}
                      onChange={(e) =>
                        setPaybackCapacity(
                          Math.max(0.2, Number(e.target.value) || 0.2)
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      Local Rate ($/kWh)
                    </span>
                    <input
                      type="number"
                      min={0.05}
                      max={1.2}
                      step={0.01}
                      value={utilityRate}
                      onChange={(e) =>
                        setUtilityRate(
                          Math.max(0.05, Math.min(1.2, Number(e.target.value) || 0.05))
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-[11px] font-medium text-slate-600">
                      {capacityDefaults.dailyUtilLabel}
                    </span>
                    <input
                      type="number"
                      min={0.25}
                      max={capacityDefaults.unitLabel === 'kWh' ? 2.5 : 8}
                      step={capacityDefaults.unitLabel === 'kWh' ? 0.1 : 0.2}
                      value={dailyUtilization}
                      onChange={(e) =>
                        setDailyUtilization(
                          Math.max(0.25, Number(e.target.value) || 0.25)
                        )
                      }
                      className="w-full px-2.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </label>
                </div>

                {/* Break-Even Output Strip + 10-Year Progress Timeline */}
                <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-[11px] text-slate-400">
                        Estimated Break-Even
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                        {payback.breakEvenYearLabel}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {payback.breakEvenMonths} months · ${totalSystemCost.toLocaleString()} basis
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">
                        Annual Bill Savings
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-400 mt-0.5">
                        ${Math.round(payback.annualSavings).toLocaleString()} / yr
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                        ~${Math.round(payback.monthlySavings).toLocaleString()} / mo offset
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400">
                        Energy Offset
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-white mt-0.5">
                        {payback.dailyKwhOffset.toFixed(1)} kWh/d
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                        {Math.round(payback.annualKwhOffset).toLocaleString()} kWh / yr
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        10-Year Net Gain
                      </div>
                      <div
                        className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                          payback.tenYearNetSavings >= 0
                            ? 'text-emerald-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {payback.tenYearNetSavings >= 0 ? '+' : ''}
                        ${payback.tenYearNetSavings.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                        ${payback.tenYearGrossSavings.toLocaleString()} gross offset
                      </div>
                    </div>
                  </div>

                  {/* 10-Year Break-Even Visual Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>Yr 0 (Purchase)</span>
                      <span className="text-amber-300 font-semibold">
                        Break-even: {payback.breakEvenYearLabel}
                      </span>
                      <span>Yr 10+</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-amber-500 transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(4, (payback.yearsToPayback / 10) * 100)
                          )}%`,
                        }}
                      />
                      <div className="h-full flex-1 bg-emerald-500/80" />
                    </div>
                  </div>
                </div>

                {/* Return on Investment Chart: 1, 5 & 10-Year Cumulative Savings */}
                <RoiProjectionChart
                  systemCost={totalSystemCost}
                  yearOneAnnualSavings={payback.annualSavings}
                  efficiencyPct={product.specs.efficiencyPct}
                  utilityRate={utilityRate}
                  groundedLocation={groundedRateInfo?.resolvedLocation}
                  groundedUtility={groundedRateInfo?.utilityContext}
                  breakEvenYears={payback.yearsToPayback}
                />
              </div>

              {/* Battery Runtime Estimator (for battery & portable storage units) */}
              {isBatteryRuntimeEligible && batteryRuntime && (
                <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <BatteryCharging className="w-4 h-4 text-emerald-700 shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Battery Runtime Estimator
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Calculate continuous backup duration from this unit&apos;s{' '}
                        {(product.specs.capacityWh ?? 0).toLocaleString()} Wh
                        capacity at your wattage load, depth of discharge, and
                        inverter conversion path.
                      </p>
                    </div>

                    <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setRuntimeOutputMode('ac-inverter')}
                        className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                          runtimeOutputMode === 'ac-inverter'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        AC Inverter (90%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRuntimeOutputMode('dc-direct')}
                        className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                          runtimeOutputMode === 'dc-direct'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Direct DC (98%)
                      </button>
                    </div>
                  </div>

                  {/* Quick Appliance Wattage Presets */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500 mr-1 font-medium">
                      Appliance load presets:
                    </span>
                    {RUNTIME_LOAD_PRESETS.map((preset) => {
                      const active = runtimeLoadWatts === preset.watts;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setRuntimeLoadWatts(preset.watts)}
                          className={`px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-amber-50 border-amber-500 text-amber-800 font-semibold'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                          }`}
                        >
                          {preset.label}{' '}
                          <span className="font-mono">({preset.watts}W)</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Load Watts Input + Slider + Unit Count + DoD */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">
                          Continuous Load Power (Watts)
                        </span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {runtimeLoadWatts.toLocaleString()} W
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="range"
                          min={20}
                          max={3500}
                          step={10}
                          value={Math.min(3500, runtimeLoadWatts)}
                          onChange={(e) =>
                            setRuntimeLoadWatts(Number(e.target.value))
                          }
                          aria-label="Continuous load wattage slider"
                          className="flex-1 accent-amber-600"
                        />
                        <div className="relative w-24 shrink-0">
                          <input
                            type="number"
                            min={10}
                            max={15000}
                            step={10}
                            value={runtimeLoadWatts}
                            onChange={(e) =>
                              setRuntimeLoadWatts(
                                Math.max(
                                  10,
                                  Math.min(15000, Number(e.target.value) || 10)
                                )
                              )
                            }
                            aria-label="Continuous wattage load in watts"
                            className="w-full pl-2.5 pr-6 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-400">
                            W
                          </span>
                        </div>
                      </div>
                    </div>

                    <label className="sm:col-span-3 block space-y-1">
                      <span className="text-[11px] font-medium text-slate-600">
                        Battery Units
                      </span>
                      <select
                        value={runtimeUnits}
                        onChange={(e) => setRuntimeUnits(Number(e.target.value))}
                        aria-label="Number of battery units for runtime calculation"
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                      >
                        {[1, 2, 3, 4, 6, 8].map((n) => (
                          <option key={n} value={n}>
                            {n}x ({((product.specs.capacityWh ?? 0) * n / 1000).toFixed(1)} kWh)
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="sm:col-span-3 block space-y-1">
                      <span className="text-[11px] font-medium text-slate-600">
                        Usable Depth (DoD)
                      </span>
                      <select
                        value={runtimeDodPct}
                        onChange={(e) =>
                          setRuntimeDodPct(Number(e.target.value))
                        }
                        aria-label="Battery depth of discharge percentage"
                        className="w-full px-2.5 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                      >
                        <option value={80}>80% Daily Reserve</option>
                        <option value={90}>90% Emergency Max</option>
                        <option value={100}>100% Full Nameplate</option>
                      </select>
                    </label>
                  </div>

                  {/* Estimated Runtime Result Banner */}
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[11px] font-medium text-slate-500">
                            Estimated Runtime at{' '}
                            <span className="font-mono font-semibold text-slate-800">
                              {runtimeLoadWatts.toLocaleString()} W
                            </span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-2 mt-0.5">
                            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                              {batteryRuntime.runtimeDetailedLabel}
                            </span>
                            <span className="text-xs font-mono text-emerald-700 font-semibold tabular-nums">
                              ({batteryRuntime.runtimeShortLabel})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left sm:text-right text-xs space-y-0.5 font-mono tabular-nums">
                        <div className="text-slate-700 font-semibold">
                          {batteryRuntime.usableWh.toLocaleString()} Wh usable{' '}
                          <span className="font-normal text-slate-500">
                            / {batteryRuntime.totalRatedWh.toLocaleString()} Wh
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {batteryRuntime.effectiveEfficiencyPct}% net path
                          efficiency ({runtimeDodPct}% DoD)
                        </div>
                      </div>
                    </div>

                    {!batteryRuntime.withinContinuousLimit && (
                      <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        <Zap className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>
                          Load ({runtimeLoadWatts.toLocaleString()} W) exceeds{' '}
                          {runtimeUnits}x continuous output limit (
                          {batteryRuntime.totalMaxContinuousWatts.toLocaleString()}{' '}
                          W). Add battery units or pair a higher-discharge bank.
                        </span>
                      </div>
                    )}

                    {/* Quick 4-Appliance Reference Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                      {[
                        { label: 'LED Lights', watts: 60 },
                        { label: 'Inverter Fridge', watts: 140 },
                        { label: 'Office + Wi-Fi', watts: 250 },
                        { label: 'Furnace Blower', watts: 550 },
                      ].map((refLoad) => {
                        const refEst = computeBatteryRuntime({
                          capacityWh: product.specs.capacityWh ?? 0,
                          unitCount: runtimeUnits,
                          loadWatts: refLoad.watts,
                          dodPct: runtimeDodPct,
                          batteryEfficiencyPct: product.specs.efficiencyPct,
                          outputMode: runtimeOutputMode,
                        });
                        return (
                          <button
                            key={refLoad.label}
                            type="button"
                            onClick={() => setRuntimeLoadWatts(refLoad.watts)}
                            className="text-left p-2 rounded border border-slate-200 bg-white hover:border-amber-500 transition-colors"
                          >
                            <div className="text-[11px] text-slate-500 truncate">
                              {refLoad.label} ({refLoad.watts}W)
                            </div>
                            <div className="text-xs font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                              {refEst.runtimeDetailedLabel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Energy Density Comparison Chart (Wh vs Weight & Volume across LiFePO4 models) */}
              {isBatteryRuntimeEligible && (
                <EnergyDensityChart currentProduct={product} />
              )}

              {/* Thermal Performance & Predicted Ambient-Temperature Derating Chart + IP Humidity Tooltip */}
              <ThermalPerformanceChart product={product} />

              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    Multi-Platform Price Comparison ({sortedOffers.length} Stores)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Sorted by effective landed total (price + shipping − coupon)
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Store &amp; Channel</th>
                        <th className="py-2.5 px-3">Condition</th>
                        <th className="py-2.5 px-3 text-right">Item</th>
                        <th className="py-2.5 px-3 text-right">Ship</th>
                        <th className="py-2.5 px-3 text-right">Coupon / Code</th>
                        <th className="py-2.5 px-3 text-right">Landed</th>
                        <th className="py-2.5 px-3">Warranty &amp; Rating</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {sortedOffers.map((offer, idx) => {
                        const landed = getOfferLandedPrice(offer);
                        const isLowest = idx === 0;
                        const promoCode = extractPromoCode(offer);
                        const isCopied = copiedMerchantId === offer.merchantId;

                        return (
                          <tr
                            key={offer.merchantId}
                            className={
                              isLowest ? 'bg-emerald-50/40' : 'bg-white'
                            }
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">
                                {offer.merchantName}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {offer.platformCategory} ·{' '}
                                <span
                                  className={
                                    offer.isAuthorizedDealer
                                      ? 'text-emerald-700 font-medium'
                                      : 'text-amber-700 font-medium'
                                  }
                                >
                                  {offer.isAuthorizedDealer
                                    ? 'OEM Authorized'
                                    : '3P Verify Serial'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={
                                  offer.condition === 'New'
                                    ? 'text-slate-700'
                                    : 'text-amber-700 font-semibold'
                                }
                              >
                                {offer.condition}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                              ${offer.price.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                              {offer.shipping === 0
                                ? 'Free'
                                : `$${offer.shipping}`}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {offer.couponDiscount ? (
                                <div className="font-mono tabular-nums text-emerald-700 font-semibold">
                                  -${offer.couponDiscount}
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                              {promoCode && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onCopyPromoCode(
                                      promoCode,
                                      offer.merchantName
                                    );
                                    setCopiedMerchantId(offer.merchantId);
                                    window.setTimeout(
                                      () =>
                                        setCopiedMerchantId((prev) =>
                                          prev === offer.merchantId ? null : prev
                                        ),
                                      1800
                                    );
                                  }}
                                  className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-[10px] font-mono font-semibold text-amber-800 hover:bg-amber-100 whitespace-nowrap"
                                >
                                  {isCopied ? (
                                    <>
                                      <Check className="w-2.5 h-2.5" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-2.5 h-2.5" />
                                      {promoCode}
                                    </>
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                              <span
                                className={`font-bold ${
                                  isLowest
                                    ? 'text-emerald-700'
                                    : 'text-slate-900'
                                }`}
                              >
                                ${landed.toLocaleString()}
                              </span>
                              {isLowest && (
                                <div className="text-[10px] font-sans font-semibold text-emerald-700">
                                  Lowest
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] text-slate-600">
                              <div>{offer.sellerRating}</div>
                              <div>
                                {offer.warrantyNote} · {offer.returnWindow}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                <a
                                  href={buildMerchantOfferUrl(
                                    product,
                                    offer,
                                    'solarbench-modal'
                                  )}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() =>
                                    trackOutboundClickClient({
                                      eventType: 'merchant_click',
                                      productId: product.id,
                                      productName: product.name,
                                      channel: offer.channel,
                                      merchantId: offer.merchantId,
                                      landedPrice: landed,
                                      sourceSection: 'product-modal',
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold border border-slate-200 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                                >
                                  Visit
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onAddToBuild(product.id, offer.merchantId);
                                    onClose();
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border border-slate-300 text-slate-800 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors whitespace-nowrap"
                                >
                                  Use Offer
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <PriceHistoryChart data={product.priceHistory90d} />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">
              Technical Specification Sheet
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 text-sm border border-slate-200 rounded-lg p-5 bg-slate-50/70">
              <div>
                <dt className="text-xs text-slate-500">Nominal Voltage</dt>
                <dd className="font-mono font-medium text-slate-900 mt-0.5">
                  {product.specs.nominalVoltage}
                </dd>
              </div>
              {product.specs.capacityWh !== undefined && (
                <div>
                  <dt className="text-xs text-slate-500">Rated Capacity</dt>
                  <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                    {product.specs.capacityWh.toLocaleString()} Wh
                  </dd>
                </div>
              )}
              {product.specs.powerWatts !== undefined && (
                <div>
                  <dt className="text-xs text-slate-500">Power Rating</dt>
                  <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                    {product.specs.powerWatts.toLocaleString()} W
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Measured Efficiency</dt>
                <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                  {product.specs.efficiencyPct}%
                </dd>
              </div>
              {product.specs.cycleLife !== undefined && (
                <div>
                  <dt className="text-xs text-slate-500">
                    Cycle Life (80% DoD)
                  </dt>
                  <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                    {product.specs.cycleLife.toLocaleString()} cycles
                  </dd>
                </div>
              )}
              {product.specs.maxPvInputVoc !== undefined && (
                <div>
                  <dt className="text-xs text-slate-500">
                    {product.category === 'panels'
                      ? 'Open-Circuit Voc'
                      : 'Max PV Input Voc'}
                  </dt>
                  <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                    {product.specs.maxPvInputVoc} V
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Cell / Topology</dt>
                <dd className="font-medium text-slate-900 mt-0.5">
                  {product.specs.chemistryOrCell}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Certifications</dt>
                <dd className="font-mono text-xs font-medium text-slate-900 mt-0.5">
                  {product.specs.certifications.join(' · ')}
                </dd>
              </div>
              {product.specs.bmsComms && (
                <div>
                  <dt className="text-xs text-slate-500">Communications</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {product.specs.bmsComms}
                  </dd>
                </div>
              )}
              {product.specs.lowTempCutoff !== undefined && (
                <div>
                  <dt className="text-xs text-slate-500">Low-Temp Cutoff</dt>
                  <dd className="font-medium text-slate-900 mt-0.5">
                    {product.specs.lowTempCutoff
                      ? 'Yes (Auto 0°C Protection)'
                      : 'No'}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-slate-500">Weight &amp; Dimensions</dt>
                <dd className="font-mono text-xs font-medium text-slate-900 mt-0.5 tabular-nums">
                  {product.specs.weightLbs} lbs · {product.specs.dimensionsIn} in
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Warranty</dt>
                <dd className="font-mono font-medium text-slate-900 mt-0.5 tabular-nums">
                  {product.specs.warrantyYears} Years
                </dd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
