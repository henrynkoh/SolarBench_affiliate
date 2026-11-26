import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Bookmark,
  Calculator,
  CalendarCheck2,
  CheckCircle2,
  Loader2,
  LogIn,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  SavedSolarBuild,
  SolarProduct,
  SolarQuoteSnapshotRecord,
  SystemBuildItem,
  UtilityRateProfileRecord,
} from '../types/solar';
import { getBestOffer, getOfferLandedPrice } from '../data/solarCatalog';
import {
  computeSystemGridParityAndRecovery,
  getEffectiveNetPrice,
} from '../data/solarEconomics';
import { signInWithGoogleForArchive } from '../lib/firebase';

interface RoiCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildItems: SystemBuildItem[];
  catalog: SolarProduct[];
  savedBuilds: SavedSolarBuild[];
  quoteSnapshots: SolarQuoteSnapshotRecord[];
  applyFederalCredit: boolean;
  utilityRebatePct: number;
  savedUtilityRate: number;
  savedUtilityLabel?: string;
  utilityProfiles: UtilityRateProfileRecord[];
  user: User | null;
  onApplyUtilityRate: (ratePerKwh: number, label?: string) => void;
  onSaveUtilityProfile?: (input: {
    label: string;
    locationQuery: string;
    utilityContext: string;
    ratePerKwh: number;
    isDefault?: boolean;
  }) => Promise<void>;
  onJumpToBuilder?: () => void;
}

interface GroundedRateResponse {
  ratePerKwh: number;
  resolvedLocation: string;
  utilityContext: string;
  explanation: string;
}

const RATE_PRESETS: { label: string; rate: number }[] = [
  { label: '$0.14 US Avg', rate: 0.14 },
  { label: '$0.24 Peak', rate: 0.24 },
  { label: '$0.35 Coastal', rate: 0.35 },
  { label: '$0.45 CA / HI', rate: 0.45 },
];

function formatCompactCurrency(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 10000) return `$${(val / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `$${(val / 1000).toFixed(1)}k`;
  return `$${Math.round(val)}`;
}

export function RoiCalculatorModal({
  isOpen,
  onClose,
  buildItems,
  catalog,
  savedBuilds,
  quoteSnapshots,
  applyFederalCredit,
  utilityRebatePct,
  savedUtilityRate,
  savedUtilityLabel,
  utilityProfiles,
  user,
  onApplyUtilityRate,
  onSaveUtilityProfile,
  onJumpToBuilder,
}: RoiCalculatorModalProps) {
  const [sourceId, setSourceId] = useState<string>('active-bom');
  const [rateInput, setRateInput] = useState<number>(savedUtilityRate);
  const [activeRateLabel, setActiveRateLabel] = useState<string>(
    savedUtilityLabel || 'Saved Rate'
  );
  const [useNetAfterIncentives, setUseNetAfterIncentives] = useState<boolean>(
    applyFederalCredit || utilityRebatePct > 0
  );
  const [extraInstallCost, setExtraInstallCost] = useState<number>(0);
  const [peakSunHours, setPeakSunHours] = useState<number>(4.6);
  const [escalationPct, setEscalationPct] = useState<number>(3.0);
  const [selfConsumptionPct, setSelfConsumptionPct] = useState<number>(95);
  const [horizonYears, setHorizonYears] = useState<number>(25);
  const [hoveredYear, setHoveredYear] = useState<number>(10);

  // Custom override state when sourceId === 'custom'
  const [customBuildCost, setCustomBuildCost] = useState<number>(6800);
  const [customPvKw, setCustomPvKw] = useState<number>(4.4);
  const [customStorageKwh, setCustomStorageKwh] = useState<number>(10.24);
  const [customInverterKw, setCustomInverterKw] = useState<number>(6.0);

  // Location lookup state
  const [locationQuery, setLocationQuery] = useState('');
  const [lookingUpRate, setLookingUpRate] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [groundedInfo, setGroundedInfo] = useState<GroundedRateResponse | null>(
    null
  );
  const [savingRateCloud, setSavingRateCloud] = useState(false);

  // Sync local rate & incentive defaults whenever modal opens or saved rate updates externally
  useEffect(() => {
    if (!isOpen) return;
    setRateInput(savedUtilityRate);
    setActiveRateLabel(savedUtilityLabel || 'Saved Utility Rate');
  }, [isOpen, savedUtilityRate, savedUtilityLabel]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (hoveredYear > horizonYears) {
      setHoveredYear(horizonYears);
    }
  }, [horizonYears, hoveredYear]);

  // Compute Active BOM Metrics directly from System Builder items
  const activeBomStats = useMemo(() => {
    let grossCost = 0;
    let netCost = 0;
    let storageWh = 0;
    let solarWatts = 0;
    let inverterWatts = 0;
    let itemCount = 0;

    for (const item of buildItems) {
      const product = catalog.find((p) => p.id === item.productId);
      if (!product) continue;
      const offer =
        product.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
        getBestOffer(product);
      const unitLanded = getOfferLandedPrice(offer);
      const unitNet = getEffectiveNetPrice(
        product,
        unitLanded,
        applyFederalCredit,
        utilityRebatePct
      );
      grossCost += unitLanded * item.quantity;
      netCost += unitNet * item.quantity;
      itemCount += item.quantity;

      if (product.category === 'batteries' || product.category === 'portable') {
        storageWh += (product.specs.capacityWh ?? 0) * item.quantity;
      }
      if (product.category === 'panels') {
        solarWatts += (product.specs.powerWatts ?? 0) * item.quantity;
      }
      if (product.category === 'inverters' || product.category === 'portable') {
        inverterWatts += (product.specs.powerWatts ?? 0) * item.quantity;
      }
    }

    return {
      grossCost,
      netCost,
      storageWh,
      solarWatts,
      inverterWatts,
      itemCount,
    };
  }, [buildItems, catalog, applyFederalCredit, utilityRebatePct]);

  // Resolve selected system build (Active BOM, Saved Build, Locked Quote, or Custom)
  const resolvedSystem = useMemo(() => {
    if (sourceId.startsWith('saved:')) {
      const buildId = sourceId.slice('saved:'.length);
      const found = savedBuilds.find((b) => b.buildId === buildId);
      if (found) {
        const net = applyFederalCredit
          ? Math.round(found.totalCost * 0.7 * (1 - utilityRebatePct / 100))
          : Math.round(found.totalCost * (1 - utilityRebatePct / 100));
        return {
          label: `Saved Build: ${found.buildName}`,
          grossCost: found.totalCost,
          netCost: net,
          storageWh: found.totalStorageWh,
          solarWatts: found.totalSolarWatts,
          inverterWatts: Math.max(5000, found.totalSolarWatts),
        };
      }
    }

    if (sourceId.startsWith('quote:')) {
      const quoteId = Number(sourceId.slice('quote:'.length));
      const found = quoteSnapshots.find((q) => q.id === quoteId);
      if (found) {
        const net = applyFederalCredit
          ? Math.round(
              found.totalLandedCost * 0.7 * (1 - utilityRebatePct / 100)
            )
          : Math.round(
              found.totalLandedCost * (1 - utilityRebatePct / 100)
            );
        return {
          label: `Locked Quote: ${found.quoteTitle}`,
          grossCost: found.totalLandedCost,
          netCost: net,
          storageWh: found.totalStorageWh,
          solarWatts: found.totalSolarWatts,
          inverterWatts: Math.max(5000, found.totalSolarWatts),
        };
      }
    }

    if (sourceId === 'custom') {
      const net = applyFederalCredit
        ? Math.round(customBuildCost * 0.7 * (1 - utilityRebatePct / 100))
        : Math.round(customBuildCost * (1 - utilityRebatePct / 100));
      return {
        label: 'Custom System Build',
        grossCost: customBuildCost,
        netCost: net,
        storageWh: Math.round(customStorageKwh * 1000),
        solarWatts: Math.round(customPvKw * 1000),
        inverterWatts: Math.round(customInverterKw * 1000),
      };
    }

    return {
      label: `Current System Builder BOM (${activeBomStats.itemCount} units)`,
      grossCost: activeBomStats.grossCost,
      netCost: activeBomStats.netCost,
      storageWh: activeBomStats.storageWh,
      solarWatts: activeBomStats.solarWatts,
      inverterWatts: activeBomStats.inverterWatts,
    };
  }, [
    sourceId,
    savedBuilds,
    quoteSnapshots,
    activeBomStats,
    applyFederalCredit,
    utilityRebatePct,
    customBuildCost,
    customStorageKwh,
    customPvKw,
    customInverterKw,
  ]);

  const effectiveHardwareCost = useNetAfterIncentives
    ? resolvedSystem.netCost
    : resolvedSystem.grossCost;
  const totalEvaluatedCost = Math.max(0, effectiveHardwareCost + extraInstallCost);
  const grossTotalWithExtra = Math.max(
    0,
    resolvedSystem.grossCost + extraInstallCost
  );

  const analysis = useMemo(
    () =>
      computeSystemGridParityAndRecovery({
        systemBuildCost: totalEvaluatedCost,
        totalStorageWh: resolvedSystem.storageWh,
        totalSolarWatts: resolvedSystem.solarWatts,
        totalInverterWatts: resolvedSystem.inverterWatts,
        utilityRatePerKwh: rateInput,
        peakSunHoursPerDay: peakSunHours,
        annualUtilityEscalationPct: escalationPct,
        selfConsumptionPct,
        analysisHorizonYears: horizonYears,
      }),
    [
      totalEvaluatedCost,
      resolvedSystem.storageWh,
      resolvedSystem.solarWatts,
      resolvedSystem.inverterWatts,
      rateInput,
      peakSunHours,
      escalationPct,
      selfConsumptionPct,
      horizonYears,
    ]
  );

  // Also compute gross payback if incentives are active so we can show exact months saved
  const grossComparisonAnalysis = useMemo(
    () =>
      computeSystemGridParityAndRecovery({
        systemBuildCost: grossTotalWithExtra,
        totalStorageWh: resolvedSystem.storageWh,
        totalSolarWatts: resolvedSystem.solarWatts,
        totalInverterWatts: resolvedSystem.inverterWatts,
        utilityRatePerKwh: rateInput,
        peakSunHoursPerDay: peakSunHours,
        annualUtilityEscalationPct: escalationPct,
        selfConsumptionPct,
        analysisHorizonYears: horizonYears,
      }),
    [
      grossTotalWithExtra,
      resolvedSystem.storageWh,
      resolvedSystem.solarWatts,
      resolvedSystem.inverterWatts,
      rateInput,
      peakSunHours,
      escalationPct,
      selfConsumptionPct,
      horizonYears,
    ]
  );

  if (!isOpen) return null;

  const incentiveMonthsSaved =
    useNetAfterIncentives &&
    grossComparisonAnalysis.costRecoveryMonths !== null &&
    analysis.costRecoveryMonths !== null &&
    grossTotalWithExtra > totalEvaluatedCost
      ? Math.max(
          0,
          grossComparisonAnalysis.costRecoveryMonths - analysis.costRecoveryMonths
        )
      : 0;

  const handleLookupRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = locationQuery.trim();
    if (!q) {
      setLookupError('Enter a city, state, or ZIP code to ground local utility tariffs.');
      return;
    }
    setLookingUpRate(true);
    setLookupError(null);
    try {
      const res = await fetch('/api/electricity-rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: q }),
      });
      const data = (await res.json()) as Partial<GroundedRateResponse> & {
        error?: string;
      };
      if (!res.ok || typeof data.ratePerKwh !== 'number') {
        throw new Error(
          data.error || 'Could not retrieve utility rate for that location.'
        );
      }
      const nextRate = Number(data.ratePerKwh.toFixed(3));
      const resolvedLoc = data.resolvedLocation || q;
      setRateInput(nextRate);
      setActiveRateLabel(resolvedLoc);
      setGroundedInfo({
        ratePerKwh: nextRate,
        resolvedLocation: resolvedLoc,
        utilityContext: data.utilityContext || 'Local Residential Tariff',
        explanation:
          data.explanation || 'Residential tariff retrieved via Search.',
      });
      onApplyUtilityRate(nextRate, resolvedLoc);
    } catch (err) {
      setLookupError(
        err instanceof Error ? err.message : 'Unable to look up local tariff.'
      );
    } finally {
      setLookingUpRate(false);
    }
  };

  const handlePersistUtilityRate = async () => {
    const cleanLabel =
      groundedInfo?.resolvedLocation ||
      locationQuery.trim() ||
      activeRateLabel ||
      `Saved $${rateInput.toFixed(2)}/kWh`;

    onApplyUtilityRate(rateInput, cleanLabel);

    if (user && user.emailVerified && onSaveUtilityProfile) {
      setSavingRateCloud(true);
      try {
        await onSaveUtilityProfile({
          label: cleanLabel,
          locationQuery: locationQuery.trim() || cleanLabel,
          utilityContext:
            groundedInfo?.utilityContext || 'Saved ROI Utility Benchmark',
          ratePerKwh: rateInput,
          isDefault: true,
        });
      } finally {
        setSavingRateCloud(false);
      }
    }
  };

  // Chart geometry
  const width = 680;
  const height = 220;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 30;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxY = Math.max(
    analysis.evaluatedCost * 1.2,
    analysis.schedule[analysis.schedule.length - 1]?.cumulativeSavings ?? 0,
    1000
  );

  const toX = (yr: number) => padLeft + (yr / horizonYears) * plotW;
  const toY = (val: number) =>
    padTop + plotH - Math.min(1, Math.max(0, val / maxY)) * plotH;

  const chartCoords = analysis.schedule.map((pt) => ({
    ...pt,
    x: toX(pt.year),
    y: toY(pt.cumulativeSavings),
  }));

  const polylinePoints = chartCoords
    .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ');
  const areaPoints = `${toX(0).toFixed(1)},${(padTop + plotH).toFixed(1)} ${polylinePoints} ${toX(horizonYears).toFixed(1)},${(padTop + plotH).toFixed(1)}`;
  const costLineY = toY(analysis.evaluatedCost);

  const activeChartPoint =
    chartCoords.find((c) => c.year === hoveredYear) ??
    chartCoords[chartCoords.length - 1];

  const milestoneYears = Array.from(
    new Set([1, 3, 5, 10, 15, 20, horizonYears].filter((y) => y <= horizonYears))
  ).sort((a, b) => a - b);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roi-calc-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-amber-700 inline-flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5" />
                Agent #07 Ledger · ROI &amp; Grid Parity Modeler
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                Saved Tariff: ${rateInput.toFixed(3)}/kWh
              </span>
            </div>
            <h2
              id="roi-calc-title"
              className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5"
            >
              System Cost Recovery &amp; Grid Parity Calculator
            </h2>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onJumpToBuilder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onJumpToBuilder();
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                Edit System BOM
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close ROI calculator"
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Workspace Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Row 1: Primary Inputs — System Build Source & Saved Utility Rate */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left: System Build Cost Selector */}
            <div className="lg:col-span-6 border border-slate-200 rounded-xl p-4 bg-white space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="roi-build-source"
                    className="text-xs font-bold text-slate-900"
                  >
                    1. System Build Cost Source
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseNetAfterIncentives((v) => !v)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                      useNetAfterIncentives
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {useNetAfterIncentives
                      ? `Net Post-Incentive (${applyFederalCredit ? '30% Sec. 25D' : 'Rebate'})`
                      : 'Using Gross Landed Cost'}
                  </button>
                </div>

                <select
                  id="roi-build-source"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                >
                  <option value="active-bom">
                    Active System Builder BOM (${activeBomStats.grossCost.toLocaleString()} · {(activeBomStats.solarWatts / 1000).toFixed(1)} kW PV · {(activeBomStats.storageWh / 1000).toFixed(1)} kWh)
                  </option>
                  {savedBuilds.map((b) => (
                    <option key={b.buildId} value={`saved:${b.buildId}`}>
                      Saved Build: {b.buildName} (${b.totalCost.toLocaleString()} · {(b.totalSolarWatts / 1000).toFixed(1)} kW PV)
                    </option>
                  ))}
                  {quoteSnapshots.map((q) => (
                    <option key={q.id} value={`quote:${q.id}`}>
                      Locked Quote: {q.quoteTitle} (${q.totalLandedCost.toLocaleString()})
                    </option>
                  ))}
                  <option value="custom">Custom System Cost &amp; Sizing</option>
                </select>

                {sourceId === 'custom' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-600">Build Cost ($)</span>
                      <input
                        type="number"
                        min={100}
                        max={250000}
                        step={100}
                        value={customBuildCost}
                        onChange={(e) =>
                          setCustomBuildCost(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-md bg-slate-50 focus:bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-600">PV Array (kW)</span>
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.2}
                        value={customPvKw}
                        onChange={(e) =>
                          setCustomPvKw(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-md bg-slate-50 focus:bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-600">Storage (kWh)</span>
                      <input
                        type="number"
                        min={0}
                        max={200}
                        step={0.5}
                        value={customStorageKwh}
                        onChange={(e) =>
                          setCustomStorageKwh(Math.max(0, Number(e.target.value) || 0))
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-md bg-slate-50 focus:bg-white"
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-[11px] text-slate-600">Inverter (kW)</span>
                      <input
                        type="number"
                        min={0.5}
                        max={50}
                        step={0.5}
                        value={customInverterKw}
                        onChange={(e) =>
                          setCustomInverterKw(Math.max(0.5, Number(e.target.value) || 0.5))
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono tabular-nums border border-slate-200 rounded-md bg-slate-50 focus:bg-white"
                      />
                    </label>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <div className="text-slate-500">Evaluated Cost</div>
                    <div className="font-mono text-base font-bold text-slate-900 tabular-nums mt-0.5">
                      ${totalEvaluatedCost.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">PV / Inverter</div>
                    <div className="font-mono text-sm font-semibold text-slate-800 tabular-nums mt-1">
                      {(resolvedSystem.solarWatts / 1000).toFixed(2)} kW /{' '}
                      {(resolvedSystem.inverterWatts / 1000).toFixed(1)} kW
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Battery Bank</div>
                    <div className="font-mono text-sm font-semibold text-slate-800 tabular-nums mt-1">
                      {(resolvedSystem.storageWh / 1000).toFixed(2)} kWh
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <label className="flex items-center gap-2 text-slate-600">
                  <span>BOS / Permit / Install Add-on ($):</span>
                  <input
                    type="number"
                    min={0}
                    max={50000}
                    step={50}
                    value={extraInstallCost}
                    onChange={(e) =>
                      setExtraInstallCost(Math.max(0, Number(e.target.value) || 0))
                    }
                    aria-label="Additional BOS or installation cost in USD"
                    className="w-24 px-2 py-1 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-md text-slate-900"
                  />
                </label>
                {resolvedSystem.netCost < resolvedSystem.grossCost && (
                  <span className="font-mono text-[11px] text-emerald-700 tabular-nums">
                    Gross ${resolvedSystem.grossCost.toLocaleString()} → Net $
                    {resolvedSystem.netCost.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Saved Utility Rate & Local Lookup */}
            <div className="lg:col-span-6 border border-slate-200 rounded-xl p-4 bg-white space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    2. Saved Utility Electricity Rate ($/kWh)
                  </span>
                  <button
                    type="button"
                    disabled={savingRateCloud}
                    onClick={() => void handlePersistUtilityRate()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    <Bookmark className="w-3 h-3" />
                    {savingRateCloud
                      ? 'Saving...'
                      : `Save $${rateInput.toFixed(2)}/kWh Rate`}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-32 shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500">
                      $
                    </span>
                    <input
                      type="number"
                      min={0.05}
                      max={1.2}
                      step={0.01}
                      value={rateInput}
                      onChange={(e) => {
                        const val = Math.max(
                          0.05,
                          Math.min(1.2, Number(e.target.value) || 0.05)
                        );
                        setRateInput(val);
                        setActiveRateLabel('Custom Rate');
                        onApplyUtilityRate(val, 'Custom Rate');
                      }}
                      aria-label="Utility electricity rate in dollars per kWh"
                      className="w-full pl-6 pr-10 py-1.5 text-sm font-mono font-bold tabular-nums bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono text-slate-500">
                      /kWh
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {RATE_PRESETS.map((preset) => {
                      const active = Math.abs(rateInput - preset.rate) < 0.005;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setRateInput(preset.rate);
                            setActiveRateLabel(preset.label);
                            onApplyUtilityRate(preset.rate, preset.label);
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-mono font-semibold border transition-colors whitespace-nowrap ${
                            active
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500'
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Search-grounded tariff lookup */}
                <form
                  onSubmit={(e) => void handleLookupRate(e)}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <div className="relative flex-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Lookup local utility rate (e.g. 92101 or Austin, TX)"
                      aria-label="City, state, or ZIP for utility rate lookup"
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={lookingUpRate}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    {lookingUpRate ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Lookup...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        Lookup Tariff
                      </>
                    )}
                  </button>
                </form>

                {lookupError && (
                  <p className="text-[11px] text-amber-800">{lookupError}</p>
                )}
                {groundedInfo && (
                  <div className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5">
                    Grounded <strong>{groundedInfo.resolvedLocation}</strong> (
                    {groundedInfo.utilityContext}) at{' '}
                    <span className="font-mono font-bold">
                      ${groundedInfo.ratePerKwh.toFixed(3)}/kWh
                    </span>
                  </div>
                )}
              </div>

              {/* Saved Regional Tariff Presets from Account */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-slate-500 font-medium">
                    Saved Profiles:
                  </span>
                  {user && user.emailVerified ? (
                    utilityProfiles.length > 0 ? (
                      utilityProfiles.map((prof) => {
                        const selected =
                          Math.abs(prof.ratePerKwh - rateInput) < 0.003;
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => {
                              setRateInput(prof.ratePerKwh);
                              setActiveRateLabel(prof.label);
                              setLocationQuery(prof.locationQuery);
                              onApplyUtilityRate(prof.ratePerKwh, prof.label);
                            }}
                            className={`px-2 py-0.5 rounded border font-mono tabular-nums transition-colors whitespace-nowrap ${
                              selected
                                ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                                : 'bg-white border-slate-200 text-slate-700 hover:border-amber-500'
                            }`}
                          >
                            {prof.label} (${prof.ratePerKwh.toFixed(2)})
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-slate-500">
                        Click Save Rate above to store a preset.
                      </span>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => void signInWithGoogleForArchive()}
                      className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-amber-700"
                    >
                      <LogIn className="w-3 h-3" />
                      Saved locally · Sign in to sync profiles
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Fine-Tuning Assumptions Strip */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <label className="block space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Peak Sun Hours / Day</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {peakSunHours.toFixed(1)}h
                </span>
              </div>
              <input
                type="range"
                min={3.0}
                max={6.5}
                step={0.1}
                value={peakSunHours}
                onChange={(e) => setPeakSunHours(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Grid Inflation / Yr</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  +{escalationPct.toFixed(1)}%/yr
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={0.5}
                value={escalationPct}
                onChange={(e) => setEscalationPct(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </label>

            <label className="block space-y-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Self-Consumption</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {selfConsumptionPct}%
                </span>
              </div>
              <input
                type="range"
                min={60}
                max={100}
                step={5}
                value={selfConsumptionPct}
                onChange={(e) => setSelfConsumptionPct(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
            </label>

            <div className="space-y-1">
              <div className="text-slate-600">LCOE &amp; Projection Horizon</div>
              <div className="grid grid-cols-3 gap-1">
                {[15, 20, 25].map((yrs) => (
                  <button
                    key={yrs}
                    type="button"
                    onClick={() => setHorizonYears(yrs)}
                    className={`py-1 rounded text-xs font-mono font-semibold border transition-colors ${
                      horizonYears === yrs
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {yrs} Yrs
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Primary Verdict KPI Strip (Cost Recovery + Grid Parity) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <CalendarCheck2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Full System Cost Recovery
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-amber-400 mt-1">
                {analysis.costRecoveryYears !== null
                  ? `${analysis.costRecoveryYears.toFixed(1)} yrs`
                  : '> 30 yrs'}
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-300 mt-1">
                {analysis.costRecoveryMonths !== null
                  ? `${analysis.costRecoveryMonths} mos · Est. ${analysis.estimatedRecoveryDateLabel}`
                  : 'Increase PV or utility rate'}
              </div>
              {incentiveMonthsSaved > 0 && (
                <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  {incentiveMonthsSaved} mos faster w/ incentives
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                Grid Parity ({horizonYears}-Yr LCOE)
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                ${analysis.systemLcoePerKwh.toFixed(3)}/kWh
              </div>
              <div
                className={`text-xs font-semibold mt-1 flex items-center gap-1 ${
                  analysis.gridParityAchievedImmediate
                    ? 'text-emerald-700'
                    : analysis.gridParityYear !== null
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}
              >
                {analysis.gridParityAchievedImmediate ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Day-1 Parity (-$
                    {Math.abs(analysis.gridParitySpreadPerKwh).toFixed(3)}/kWh)
                  </>
                ) : analysis.gridParityYear !== null ? (
                  <>Parity in Year {analysis.gridParityYear.toFixed(1)}</>
                ) : (
                  <>Above ${rateInput.toFixed(2)}/kWh grid rate</>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200">
              <div className="text-[11px] text-slate-500">
                Year-1 Utility Bill Offset
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1">
                ${analysis.yearOneAnnualSavings.toLocaleString()}/yr
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-600 mt-1">
                ~${analysis.monthlyAverageSavings.toLocaleString()}/mo ·{' '}
                {analysis.yearOneAnnualKwh.toLocaleString()} kWh
              </div>
              {analysis.costRecoveryYearsFlat !== null && escalationPct > 0 && (
                <div className="text-[11px] font-mono text-slate-500 mt-1">
                  0% flat payoff: {analysis.costRecoveryYearsFlat.toFixed(1)} yrs
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-[11px] font-medium text-emerald-900">
                {horizonYears}-Yr Cumulative Net Profit
              </div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-800 mt-1">
                {analysis.horizonNetProfit >= 0 ? '+' : ''}$
                {analysis.horizonNetProfit.toLocaleString()}
              </div>
              <div className="text-xs font-mono tabular-nums text-emerald-800 mt-1">
                {analysis.horizonRoiPct}% ROI · 10-Yr Net:{' '}
                {analysis.tenYearNetProfit >= 0 ? '+' : ''}$
                {analysis.tenYearNetProfit.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Row 4: Interactive Cost Recovery & Break-Even Curve */}
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Cumulative Cost Recovery Curve (Yr 0 – Yr {horizonYears})
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hover or click any year marker to inspect remaining payoff balance, annual utility tariff, and cumulative ROI.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono tabular-nums flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-900">
                  {activeChartPoint.label}:
                </span>
                <span className="font-semibold text-emerald-700">
                  ${activeChartPoint.cumulativeSavings.toLocaleString()} saved
                </span>
                <span className="text-slate-300">|</span>
                <span
                  className={
                    activeChartPoint.netPosition >= 0
                      ? 'font-semibold text-emerald-700'
                      : 'font-semibold text-amber-700'
                  }
                >
                  {activeChartPoint.netPosition >= 0
                    ? `Net +$${activeChartPoint.netPosition.toLocaleString()} (${activeChartPoint.roiPct}% ROI)`
                    : `$${activeChartPoint.remainingBalance.toLocaleString()} unrecovered (${activeChartPoint.costRecoveredPct}%)`}
                </span>
              </div>
            </div>

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-52 select-none"
              role="img"
              aria-label="Solar system cost recovery and cumulative utility savings chart"
            >
              <defs>
                <linearGradient id="roiModalArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const val = maxY * ratio;
                const y = toY(val);
                return (
                  <g key={ratio}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={width - padRight}
                      y2={y}
                      stroke={ratio === 0 ? '#CBD5E1' : '#E2E8F0'}
                      strokeDasharray={ratio === 0 ? undefined : '3 3'}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="fill-slate-500 text-[10px] font-mono"
                    >
                      {formatCompactCurrency(val)}
                    </text>
                  </g>
                );
              })}

              {/* System Build Cost Basis Line */}
              {analysis.evaluatedCost > 0 && (
                <g>
                  <line
                    x1={padLeft}
                    y1={costLineY}
                    x2={width - padRight}
                    y2={costLineY}
                    stroke="#D97706"
                    strokeWidth="1.5"
                    strokeDasharray="5 4"
                  />
                  <text
                    x={width - padRight}
                    y={Math.max(padTop + 10, costLineY - 5)}
                    textAnchor="end"
                    className="fill-amber-700 text-[10px] font-mono font-semibold"
                  >
                    Build Cost Basis: ${analysis.evaluatedCost.toLocaleString()}
                  </text>
                </g>
              )}

              <polygon fill="url(#roiModalArea)" points={areaPoints} />
              <polyline
                fill="none"
                stroke="#059669"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {/* Exact Break-Even / Full Recovery Intersection Marker */}
              {analysis.costRecoveryYears !== null &&
                analysis.costRecoveryYears > 0 &&
                analysis.costRecoveryYears <= horizonYears && (
                  <g>
                    <line
                      x1={toX(analysis.costRecoveryYears)}
                      y1={costLineY}
                      x2={toX(analysis.costRecoveryYears)}
                      y2={padTop + plotH}
                      stroke="#D97706"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={toX(analysis.costRecoveryYears)}
                      cy={costLineY}
                      r="5.5"
                      fill="#D97706"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                    <text
                      x={Math.min(
                        width - padRight - 40,
                        Math.max(padLeft + 40, toX(analysis.costRecoveryYears))
                      )}
                      y={Math.max(padTop + 12, costLineY - 10)}
                      textAnchor="middle"
                      className="fill-amber-800 text-[10px] font-mono font-bold"
                    >
                      Payoff Yr {analysis.costRecoveryYears.toFixed(1)}
                    </text>
                  </g>
                )}

              {chartCoords.map((pt) => {
                const isMajor =
                  pt.year === 0 ||
                  pt.year === 5 ||
                  pt.year === 10 ||
                  pt.year === 15 ||
                  pt.year === 20 ||
                  pt.year === horizonYears;
                const isActive = pt.year === hoveredYear;
                return (
                  <g
                    key={pt.year}
                    onMouseEnter={() => setHoveredYear(pt.year)}
                    onClick={() => setHoveredYear(pt.year)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={pt.x - 10}
                      y={padTop}
                      width={20}
                      height={plotH}
                      fill="transparent"
                    />
                    {isActive && (
                      <line
                        x1={pt.x}
                        y1={padTop}
                        x2={pt.x}
                        y2={padTop + plotH}
                        stroke="#94A3B8"
                        strokeWidth="1"
                        strokeDasharray="2 2"
                      />
                    )}
                    {(isMajor || isActive) && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isActive ? 5 : 3.5}
                        fill={isActive ? '#059669' : '#FFFFFF'}
                        stroke="#059669"
                        strokeWidth={2}
                      />
                    )}
                    {isMajor && (
                      <text
                        x={pt.x}
                        y={height - 8}
                        textAnchor="middle"
                        className={`text-[10px] font-mono ${
                          isActive
                            ? 'fill-slate-900 font-bold'
                            : 'fill-slate-500 font-medium'
                        }`}
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Row 5: Payback Milestone Ledger Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-900">
                Payback &amp; Grid Parity Milestone Schedule
              </span>
              <span className="font-mono text-slate-500 tabular-nums">
                System LCOE: ${analysis.systemLcoePerKwh.toFixed(3)}/kWh · Grid Base: $
                {rateInput.toFixed(3)}/kWh (+{escalationPct.toFixed(1)}%/yr)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-2.5 px-4">Year</th>
                    <th className="py-2.5 px-4 text-right">Grid Rate</th>
                    <th className="py-2.5 px-4 text-right">Grid Parity Margin</th>
                    <th className="py-2.5 px-4 text-right">Annual Offset</th>
                    <th className="py-2.5 px-4 text-right">Cumulative Saved</th>
                    <th className="py-2.5 px-4 text-right">Cost Recovery / Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                  {milestoneYears.map((yr) => {
                    const pt = analysis.schedule.find((s) => s.year === yr);
                    if (!pt) return null;
                    const recovered = pt.netPosition >= 0;
                    const parityOk = pt.lcoeVsGridSpread >= 0;
                    return (
                      <tr
                        key={yr}
                        className={`hover:bg-slate-50 transition-colors ${
                          hoveredYear === yr ? 'bg-amber-50/40' : ''
                        }`}
                        onMouseEnter={() => setHoveredYear(yr)}
                      >
                        <td className="py-2.5 px-4 font-sans font-semibold text-slate-900">
                          Year {pt.year}
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700">
                          ${pt.utilityRateAtYear.toFixed(3)}/kWh
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-semibold ${
                            parityOk ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          {parityOk ? '+' : ''}$
                          {pt.lcoeVsGridSpread.toFixed(3)}/kWh
                        </td>
                        <td className="py-2.5 px-4 text-right text-slate-700">
                          {pt.annualKwh.toLocaleString()} kWh (${pt.annualSavings.toLocaleString()})
                        </td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900">
                          ${pt.cumulativeSavings.toLocaleString()}
                        </td>
                        <td
                          className={`py-2.5 px-4 text-right font-semibold ${
                            recovered ? 'text-emerald-700' : 'text-slate-600'
                          }`}
                        >
                          {recovered
                            ? `+$${pt.netPosition.toLocaleString()} (${pt.roiPct}% ROI)`
                            : `${pt.costRecoveredPct}% ($${pt.remainingBalance.toLocaleString()} left)`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
