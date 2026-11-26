import { useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  BatteryCharging,
  Bookmark,
  Cable,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Lock,
  LogIn,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  ApplianceLoadItem,
  SavedBuildLineItem,
  SavedSolarBuild,
  SolarProduct,
  SolarQuoteSnapshotRecord,
  SwarmAgentId,
  SystemBuildItem,
} from '../types/solar';
import {
  CATEGORY_LABELS,
  getBestOffer,
  getOfferLandedPrice,
} from '../data/solarCatalog';
import {
  DEFAULT_APPLIANCES,
  LoadSizingSummary,
  calculateBosRequirements,
  collectBomPromoCodes,
  computeBomLifecycleRoi,
  computeBulkBatteryScenario,
  computeLoadSizing,
  computeSingleStoreConsolidation,
  evaluateBomPermitReadiness,
  getEffectiveNetPrice,
} from '../data/solarEconomics';
import {
  buildMerchantOfferUrl,
  trackOutboundClickClient,
} from '../data/affiliateRouting';
import { signInWithGoogleForArchive } from '../lib/firebase';

interface SystemBuilderSectionProps {
  items: SystemBuildItem[];
  catalog: SolarProduct[];
  applyFederalCredit: boolean;
  utilityRebatePct: number;
  user: User | null;
  savedBuilds: SavedSolarBuild[];
  onSaveBuild: (
    name: string,
    totalCost: number,
    totalStorageWh: number,
    totalSolarWatts: number
  ) => Promise<void>;
  onUpdateSavedBuild: (
    buildId: string,
    name: string,
    totalCost: number,
    totalStorageWh: number,
    totalSolarWatts: number
  ) => Promise<void>;
  onLoadSavedBuild: (items: SavedBuildLineItem[]) => void;
  onDeleteSavedBuild: (buildId: string) => Promise<void>;
  onOptimizeBuild: (authorizedOnly: boolean) => void;
  onApplyConsolidatedChannel: (channel: string) => void;
  onApplyLoadSizingToFilter: (summary: LoadSizingSummary) => void;
  onAutoBuildFromSizing: (summary: LoadSizingSummary) => void;
  onCopyPromoBundle: (summaryText: string, count: number) => void;
  onUpdateQty: (productId: string, delta: number) => void;
  onAddBatteryUnits?: (
    productId: string,
    merchantId: string,
    quantity: number
  ) => void;
  onChangeMerchant: (productId: string, merchantId: string) => void;
  onRemoveItem: (productId: string) => void;
  onLoadStarterKit: (kitType: 'cabin-48v' | 'van-24v' | 'whole-home') => void;
  quoteSnapshots?: SolarQuoteSnapshotRecord[];
  onSaveQuoteSnapshot?: (input: {
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
  }) => Promise<void>;
  onDeleteQuoteSnapshot?: (quoteId: number) => Promise<void>;
  onLoadQuoteSnapshot?: (quote: SolarQuoteSnapshotRecord) => void;
  onAskSwarmAgent?: (agentId: SwarmAgentId, directive: string) => void;
  utilityRate?: number;
  onChangeUtilityRate?: (ratePerKwh: number) => void;
  onOpenRoiCalculator?: () => void;
}

export function SystemBuilderSection({
  items,
  catalog,
  applyFederalCredit,
  utilityRebatePct,
  user,
  savedBuilds,
  onSaveBuild,
  onUpdateSavedBuild,
  onLoadSavedBuild,
  onDeleteSavedBuild,
  onOptimizeBuild,
  onApplyConsolidatedChannel,
  onApplyLoadSizingToFilter,
  onAutoBuildFromSizing,
  onCopyPromoBundle,
  onUpdateQty,
  onAddBatteryUnits,
  onChangeMerchant,
  onRemoveItem,
  onLoadStarterKit,
  quoteSnapshots = [],
  onSaveQuoteSnapshot,
  onDeleteQuoteSnapshot,
  onLoadQuoteSnapshot,
  onAskSwarmAgent,
  utilityRate,
  onChangeUtilityRate,
  onOpenRoiCalculator,
}: SystemBuilderSectionProps) {
  const [exportedNote, setExportedNote] = useState(false);
  const [permitExportedNote, setPermitExportedNote] = useState(false);
  const [copiedBomId, setCopiedBomId] = useState<string | null>(null);
  const [buildNameInput, setBuildNameInput] = useState('');
  const [savingBuild, setSavingBuild] = useState(false);
  const [quoteTitleInput, setQuoteTitleInput] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);
  const [showSizingCalc, setShowSizingCalc] = useState(false);
  const [appliances, setAppliances] =
    useState<ApplianceLoadItem[]>(DEFAULT_APPLIANCES);
  const [autonomyDays, setAutonomyDays] = useState(2);
  const [peakSunHours, setPeakSunHours] = useState(4.5);
  const [bosRunFeet, setBosRunFeet] = useState(6);
  const [includeBosInTotal, setIncludeBosInTotal] = useState(false);
  const [localGridRatePerKwh, setLocalGridRatePerKwh] = useState(0.24);
  const gridRatePerKwh = utilityRate ?? localGridRatePerKwh;
  const setGridRatePerKwh = (nextRate: number) => {
    setLocalGridRatePerKwh(nextRate);
    onChangeUtilityRate?.(nextRate);
  };
  const [extraBatteryUnits, setExtraBatteryUnits] = useState(2);
  const [selectedBatteryIdForScale, setSelectedBatteryIdForScale] =
    useState<string>('');

  const resolvedRows = items
    .map((item) => {
      const product = catalog.find((p) => p.id === item.productId);
      if (!product) return null;
      const offer =
        product.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
        getBestOffer(product);
      const bestOffer = getBestOffer(product);
      const unitLanded = getOfferLandedPrice(offer);
      const bestUnitLanded = getOfferLandedPrice(bestOffer);
      const lineTotal = unitLanded * item.quantity;
      const netLineTotal =
        getEffectiveNetPrice(
          product,
          unitLanded,
          applyFederalCredit,
          utilityRebatePct
        ) * item.quantity;

      return {
        item,
        product,
        offer,
        bestOffer,
        unitLanded,
        bestUnitLanded,
        lineTotal,
        netLineTotal,
        bestLineTotal: bestUnitLanded * item.quantity,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const bosReq = calculateBosRequirements(items, catalog, bosRunFeet);
  const bosAddon = includeBosInTotal && bosReq ? bosReq.estimatedBosCost : 0;

  const selectedTotal =
    resolvedRows.reduce((s, r) => s + r.lineTotal, 0) + bosAddon;
  const netSelectedTotal =
    resolvedRows.reduce((s, r) => s + r.netLineTotal, 0) + bosAddon;
  const optimalTotal =
    resolvedRows.reduce((s, r) => s + r.bestLineTotal, 0) + bosAddon;

  const totalStorageWh = resolvedRows.reduce(
    (s, r) =>
      r.product.category === 'batteries' || r.product.category === 'portable'
        ? s + (r.product.specs.capacityWh ?? 0) * r.item.quantity
        : s,
    0
  );
  const totalSolarWatts = resolvedRows.reduce(
    (s, r) =>
      r.product.category === 'panels'
        ? s + (r.product.specs.powerWatts ?? 0) * r.item.quantity
        : s,
    0
  );
  const totalInverterWatts = resolvedRows.reduce(
    (s, r) =>
      r.product.category === 'inverters' || r.product.category === 'portable'
        ? s + (r.product.specs.powerWatts ?? 0) * r.item.quantity
        : s,
    0
  );

  // Electrical engineering compatibility checks
  const batteries = resolvedRows.filter(
    (r) => r.product.category === 'batteries'
  );
  const inverters = resolvedRows.filter(
    (r) => r.product.category === 'inverters'
  );
  const panels = resolvedRows.filter((r) => r.product.category === 'panels');
  const controllers = resolvedRows.filter(
    (r) => r.product.category === 'controllers'
  );

  const has48VBattery = batteries.some((b) => b.product.voltageClass === '48V');
  const has48VInverter = inverters.some((i) => i.product.voltageClass === '48V');
  const hasLowVoltController = controllers.some(
    (c) => c.product.specs.maxPvInputVoc && c.product.specs.maxPvInputVoc <= 150
  );
  const totalPanelVocSeries = panels.reduce(
    (acc, p) => acc + (p.product.specs.maxPvInputVoc ?? 0) * p.item.quantity,
    0
  );

  const diagnostics: { status: 'ok' | 'warn'; title: string; detail: string }[] =
    [];

  if (batteries.length > 0 && inverters.length > 0) {
    if (has48VBattery && has48VInverter) {
      diagnostics.push({
        status: 'ok',
        title: 'DC Bus Voltage Match: 48V Nominal',
        detail:
          'Battery bank and inverter operate on matching 48V (51.2V LiFePO4) DC architecture.',
      });
    } else {
      diagnostics.push({
        status: 'warn',
        title: 'DC Bus Voltage Mismatch Check',
        detail:
          'Verify battery bank nominal voltage matches your selected inverter DC input.',
      });
    }
  }

  if (panels.length > 0 && inverters.length > 0) {
    const maxInvVoc = Math.max(
      ...inverters.map((i) => i.product.specs.maxPvInputVoc ?? 0)
    );
    if (maxInvVoc > 0) {
      if (totalPanelVocSeries <= maxInvVoc * 0.9) {
        diagnostics.push({
          status: 'ok',
          title: `Single-String Voc Safe (${totalPanelVocSeries.toFixed(0)}V / ${maxInvVoc}V Max)`,
          detail:
            '10%+ cold-weather Voc headroom preserved for winter morning voltage spikes.',
        });
      } else {
        diagnostics.push({
          status: 'warn',
          title: `Split Into 2+ Parallel Strings (${totalPanelVocSeries.toFixed(0)}V Series Voc)`,
          detail: `Single-string Voc approaches or exceeds ${maxInvVoc}V inverter MPPT limit; wire in 2S/2P groups.`,
        });
      }
    }
  } else if (
    panels.length > 0 &&
    hasLowVoltController &&
    totalPanelVocSeries > 135
  ) {
    diagnostics.push({
      status: 'warn',
      title: `Wire Panels in 2S/3S Parallel (${totalPanelVocSeries.toFixed(0)}V total Voc)`,
      detail:
        '150V standalone MPPT charge controllers require parallel strings so Voc stays below ~130V in cold weather.',
    });
  }

  if (totalSolarWatts > 0 && totalStorageWh > 0) {
    const sunHoursToFull = totalStorageWh / (totalSolarWatts * 0.85);
    diagnostics.push({
      status: sunHoursToFull <= 6 ? 'ok' : 'warn',
      title: `Estimated Solar Recharge: ${sunHoursToFull.toFixed(1)} Peak Sun Hours`,
      detail: `${totalSolarWatts.toLocaleString()}W array charging ${(totalStorageWh / 1000).toFixed(2)} kWh bank at 85% real-world derate.`,
    });
  }

  const loadSummary = computeLoadSizing(appliances, autonomyDays, peakSunHours);
  const consolidatedOptions = computeSingleStoreConsolidation(items, catalog);
  const bomPermit = evaluateBomPermitReadiness(items, catalog);
  const bomPromos = collectBomPromoCodes(items, catalog);
  const bomRoi = computeBomLifecycleRoi(
    totalStorageWh,
    totalSolarWatts,
    totalInverterWatts,
    netSelectedTotal,
    gridRatePerKwh
  );

  // Bulk Battery Scaling & Effective $/kWh Calculator state resolution
  const buildStorageRows = resolvedRows.filter(
    (r) =>
      (r.product.category === 'batteries' || r.product.category === 'portable') &&
      (r.product.specs.capacityWh ?? 0) > 0
  );
  const catalogBatteries = catalog.filter(
    (p) => p.category === 'batteries' && (p.specs.capacityWh ?? 0) > 0
  );
  const activeBuildBatteryRow =
    buildStorageRows.find((r) => r.product.id === selectedBatteryIdForScale) ??
    buildStorageRows[0] ??
    null;
  const fallbackCatalogBattery =
    catalogBatteries.find((p) => p.id === selectedBatteryIdForScale) ??
    catalogBatteries[0] ??
    null;

  const scaleBatteryProduct =
    activeBuildBatteryRow?.product ?? fallbackCatalogBattery;
  const scaleBatteryOffer =
    activeBuildBatteryRow?.offer ??
    (scaleBatteryProduct ? getBestOffer(scaleBatteryProduct) : null);
  const scaleBatteryUnitLanded = scaleBatteryOffer
    ? getOfferLandedPrice(scaleBatteryOffer)
    : 0;
  const scaleBatteryUnitNet = scaleBatteryProduct
    ? getEffectiveNetPrice(
        scaleBatteryProduct,
        scaleBatteryUnitLanded,
        applyFederalCredit,
        utilityRebatePct
      )
    : 0;

  const bulkScenario =
    scaleBatteryProduct && scaleBatteryOffer
      ? computeBulkBatteryScenario({
          baselineSystemCost: selectedTotal,
          baselineNetSystemCost: netSelectedTotal,
          baselineStorageWh: totalStorageWh,
          batteryUnitWh: scaleBatteryProduct.specs.capacityWh ?? 0,
          batteryUnitLandedCost: scaleBatteryUnitLanded,
          batteryUnitNetCost: scaleBatteryUnitNet,
          batteryUnitShipping: scaleBatteryOffer.shipping,
          currentBatteryUnits: activeBuildBatteryRow?.item.quantity ?? 0,
          additionalUnits: extraBatteryUnits,
          isBatteryCategory: scaleBatteryProduct.category === 'batteries',
        })
      : null;

  const bulkTierCurve =
    scaleBatteryProduct && scaleBatteryOffer
      ? [1, 2, 4, 6].map((addCount) =>
          computeBulkBatteryScenario({
            baselineSystemCost: selectedTotal,
            baselineNetSystemCost: netSelectedTotal,
            baselineStorageWh: totalStorageWh,
            batteryUnitWh: scaleBatteryProduct.specs.capacityWh ?? 0,
            batteryUnitLandedCost: scaleBatteryUnitLanded,
            batteryUnitNetCost: scaleBatteryUnitNet,
            batteryUnitShipping: scaleBatteryOffer.shipping,
            currentBatteryUnits: activeBuildBatteryRow?.item.quantity ?? 0,
            additionalUnits: addCount,
            isBatteryCategory: scaleBatteryProduct.category === 'batteries',
          })
        )
      : [];

  const toggleAppliance = (id: string) => {
    setAppliances((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const updateApplianceHours = (id: string, hours: number) => {
    setAppliances((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, hoursPerDay: Math.max(0.5, Math.min(24, hours)) } : a
      )
    );
  };

  const handleSaveBuildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resolvedRows.length === 0) return;
    const label =
      buildNameInput.trim() ||
      `Solar Kit (${(totalStorageWh / 1000).toFixed(1)} kWh / ${(totalSolarWatts / 1000).toFixed(1)} kW)`;
    setSavingBuild(true);
    try {
      await onSaveBuild(label, selectedTotal, totalStorageWh, totalSolarWatts);
      setBuildNameInput('');
    } finally {
      setSavingBuild(false);
    }
  };

  const handleCopySavedBomSummary = (build: SavedSolarBuild) => {
    const lines = build.items
      .map((item) => {
        const p = catalog.find((c) => c.id === item.productId);
        return p ? `${item.quantity}x ${p.name}` : `${item.quantity}x ${item.productId}`;
      })
      .join(' | ');
    const text = `${build.buildName} ($${build.totalCost.toLocaleString()} · ${(build.totalStorageWh / 1000).toFixed(1)} kWh · ${(build.totalSolarWatts / 1000).toFixed(1)} kW PV): ${lines}`;
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text);
    }
    setCopiedBomId(build.buildId);
    window.setTimeout(
      () => setCopiedBomId((prev) => (prev === build.buildId ? null : prev)),
      1800
    );
  };

  const handleExportCsv = () => {
    const header =
      'SKU,Product,Category,Quantity,Selected Merchant,Unit Price,Shipping,Landed Line Total\n';
    const lines = resolvedRows.map(
      (r) =>
        `"${r.product.sku}","${r.product.name}","${CATEGORY_LABELS[r.product.category]}",${r.item.quantity},"${r.offer.merchantName}",${r.offer.price},${r.offer.shipping},${r.lineTotal}`
    );
    if (includeBosInTotal && bosReq) {
      lines.push(
        `"BOS-NEC-${bosReq.busVoltage}V","NEC 125% BOS Kit (${bosReq.recommendedWireAwg} · ${bosReq.necSizedBreakerAmps}A Breaker)","Balance of System",1,"Estimated Hardware Kit",${bosReq.estimatedBosCost},0,${bosReq.estimatedBosCost}`
      );
    }
    const blob = new Blob([header + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solarbench-system-quote.csv';
    a.click();
    URL.revokeObjectURL(url);
    setExportedNote(true);
    setTimeout(() => setExportedNote(false), 3000);
  };

  const handleExportPermitSheet = () => {
    const lines: string[] = [
      'SOLARBENCH ENGINEERING & AHJ PERMIT SPEC SUMMARY',
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      '',
      `Total Storage: ${(totalStorageWh / 1000).toFixed(2)} kWh`,
      `Total PV Array: ${(totalSolarWatts / 1000).toFixed(2)} kW`,
      `Inverter Capacity: ${(totalInverterWatts / 1000).toFixed(2)} kW`,
      `Selected Landed Total: $${selectedTotal.toLocaleString()}`,
      `Net Post-Incentive Total: $${netSelectedTotal.toLocaleString()}`,
      '',
      'EQUIPMENT & CERTIFICATIONS:',
      ...resolvedRows.map(
        (r) =>
          `- ${r.item.quantity}x ${r.product.name} (${r.product.sku}) | Vendor: ${r.offer.merchantName} (${r.offer.isAuthorizedDealer ? 'OEM Authorized' : '3P Marketplace'}) | Certs: ${r.product.specs.certifications.join(', ')}`
      ),
    ];
    if (bosReq) {
      lines.push(
        '',
        `NEC 125% BALANCE OF SYSTEM (${bosReq.busVoltage}V DC · ${bosReq.runLengthFeet}ft 1-Way Run):`,
        `- Max Continuous DC Amps: ${bosReq.maxContinuousDcAmps} A`,
        `- NEC 125% Main Breaker: ${bosReq.necSizedBreakerAmps} A`,
        `- Cable Gauge: ${bosReq.recommendedWireAwg} (Est. ${bosReq.estimatedVoltageDropPct}% drop)`,
        `- PV String Fuse: ${bosReq.pvStringFuseAmps} A`,
        `- AC Transfer Spec: ${bosReq.transferSwitchSpec}`,
        `- Est. BOS Cost: ~$${bosReq.estimatedBosCost}`
      );
    }
    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'solarbench-ahj-permit-spec.txt';
    a.click();
    URL.revokeObjectURL(url);
    setPermitExportedNote(true);
    setTimeout(() => setPermitExportedNote(false), 3000);
  };

  return (
    <section
      id="builder"
      className="py-14 border-t border-slate-200 bg-[#F7F8FA]"
      aria-labelledby="builder-heading"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>
                Owned by <strong className="text-slate-700">Agent #09 Forge</strong> (BOM) · <strong className="text-slate-700">Agent #06 Ampere</strong> (Runtime) · <strong className="text-slate-700">Agent #08 Shield</strong> (Permits)
              </span>
              {onAskSwarmAgent && (
                <button
                  type="button"
                  onClick={() =>
                    onAskSwarmAgent(
                      'bom-allocator',
                      'Audit my current System Builder BOM across all 10 merchants, verify UL permit/OEM warranty safety, and propose the lowest landed split-cart allocation for CEO sign-off.'
                    )
                  }
                  className="font-semibold text-amber-700 hover:underline"
                >
                  Dispatch Agent #09
                </button>
              )}
            </div>
            <h2
              id="builder-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1"
            >
              DIY Solar System Cost &amp; Compatibility Builder
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSizingCalc((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                showSizingCalc
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              Appliance Load Sizing
              {showSizingCalc ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {onOpenRoiCalculator && (
              <button
                type="button"
                onClick={onOpenRoiCalculator}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-emerald-700 text-white hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                ROI Calculator
              </button>
            )}

            <span className="text-xs text-slate-500 ml-1">Starter Kits:</span>
            <button
              type="button"
              onClick={() => onLoadStarterKit('cabin-48v')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-400 text-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              48V Off-Grid Cabin (10.2 kWh)
            </button>
            <button
              type="button"
              onClick={() => onLoadStarterKit('whole-home')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-400 text-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              15kW Whole-Home Backup
            </button>
            <button
              type="button"
              onClick={() => onLoadStarterKit('van-24v')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:border-slate-400 text-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              Compact Portable / Van Kit
            </button>
          </div>
        </div>

        {/* Function 4: Collapsible Appliance Load & Days-of-Autonomy Sizing Calculator */}
        {showSizingCalc && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Daily Appliance Load &amp; Autonomy Sizing Calculator
                </h3>
                <p className="text-xs text-slate-500">
                  Select household loads to size your required battery bank (80% DoD), continuous/surge inverter rating, and PV solar array.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  Autonomy:
                  <select
                    value={autonomyDays}
                    onChange={(e) => setAutonomyDays(Number(e.target.value))}
                    className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50 font-mono font-semibold"
                  >
                    {[1, 2, 3, 4, 5].map((d) => (
                      <option key={d} value={d}>
                        {d} {d === 1 ? 'Day' : 'Days'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 font-medium text-slate-700">
                  Sun Hours:
                  <select
                    value={peakSunHours}
                    onChange={(e) => setPeakSunHours(Number(e.target.value))}
                    className="border border-slate-200 rounded-md px-2 py-1 bg-slate-50 font-mono font-semibold"
                  >
                    {[3, 3.5, 4, 4.5, 5, 6].map((h) => (
                      <option key={h} value={h}>
                        {h}h / day
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {appliances.map((app) => (
                  <div
                    key={app.id}
                    className={`px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs ${
                      app.enabled ? 'bg-white' : 'bg-slate-50/70 text-slate-400'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 cursor-pointer min-w-[210px] flex-1">
                      <input
                        type="checkbox"
                        checked={app.enabled}
                        onChange={() => toggleAppliance(app.id)}
                        className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-600"
                      />
                      <span
                        className={
                          app.enabled
                            ? 'font-medium text-slate-900'
                            : 'text-slate-500'
                        }
                      >
                        {app.name}
                      </span>
                    </label>

                    <div className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="text-slate-500">
                        {app.watts}W (surge {app.surgeWatts}W)
                      </span>
                      <label className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0.5}
                          max={24}
                          step={0.5}
                          disabled={!app.enabled}
                          value={app.hoursPerDay}
                          onChange={(e) =>
                            updateApplianceHours(
                              app.id,
                              Number(e.target.value)
                            )
                          }
                          aria-label={`Hours per day for ${app.name}`}
                          className="w-14 px-1.5 py-1 text-right border border-slate-200 rounded bg-slate-50 text-slate-900 disabled:opacity-40"
                        />
                        <span className="text-slate-500">h/d</span>
                      </label>
                      <span className="w-16 text-right font-semibold text-slate-800">
                        {app.enabled
                          ? `${Math.round(app.watts * app.hoursPerDay)} Wh`
                          : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-500">Daily Energy Load</div>
                    <div className="font-mono text-base font-bold text-slate-900 tabular-nums mt-0.5">
                      {(loadSummary.dailyWh / 1000).toFixed(2)} kWh/day
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Required Bank ({autonomyDays}d)</div>
                    <div className="font-mono text-base font-bold text-amber-700 tabular-nums mt-0.5">
                      {(loadSummary.recommendedStorageWh / 1000).toFixed(1)} kWh
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">
                      Inverter Size (Surge {loadSummary.maxSurgeWatts}W)
                    </div>
                    <div className="font-mono text-base font-bold text-slate-900 tabular-nums mt-0.5">
                      {(loadSummary.recommendedInverterWatts / 1000).toFixed(1)}{' '}
                      kW {loadSummary.needs240V ? '240V' : '120V'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Recommended PV Array</div>
                    <div className="font-mono text-base font-bold text-emerald-700 tabular-nums mt-0.5">
                      {(loadSummary.recommendedSolarWatts / 1000).toFixed(2)} kW
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    disabled={loadSummary.dailyWh === 0}
                    onClick={() => onAutoBuildFromSizing(loadSummary)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Build Matching Kit
                  </button>
                  <button
                    type="button"
                    disabled={loadSummary.dailyWh === 0}
                    onClick={() => onApplyLoadSizingToFilter(loadSummary)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Filter Catalog to Match
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {resolvedRows.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-base font-semibold text-slate-900">
                    Your solar bill of materials is empty
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    Add panels, batteries, or inverters from the catalog, run
                    the Appliance Load Sizing calculator above, or load a starter
                    kit.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Hardware Component</th>
                        <th className="py-3 px-4">Retailer Offer</th>
                        <th className="py-3 px-4">Qty</th>
                        <th className="py-3 px-4 text-right">Landed Line</th>
                        <th className="py-3 px-4 text-right">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {resolvedRows.map((row) => (
                        <tr key={row.product.id}>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">
                              {row.product.name}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {CATEGORY_LABELS[row.product.category]} ·{' '}
                              {row.product.specs.nominalVoltage} ·{' '}
                              <span
                                className={
                                  row.offer.isAuthorizedDealer
                                    ? 'text-emerald-700 font-medium'
                                    : 'text-amber-700 font-medium'
                                }
                              >
                                {row.offer.isAuthorizedDealer
                                  ? 'OEM Authorized'
                                  : '3P Marketplace'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <select
                              aria-label={`Select merchant for ${row.product.name}`}
                              value={row.offer.merchantId}
                              onChange={(e) =>
                                onChangeMerchant(row.product.id, e.target.value)
                              }
                              className="text-xs border border-slate-300 rounded-md px-2.5 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-600"
                            >
                              {[...row.product.offers]
                                .sort(
                                  (a, b) =>
                                    getOfferLandedPrice(a) -
                                    getOfferLandedPrice(b)
                                )
                                .map((o) => (
                                  <option key={o.merchantId} value={o.merchantId}>
                                    {o.merchantName} ({o.condition}) — $
                                    {getOfferLandedPrice(o).toLocaleString()}
                                  </option>
                                ))}
                            </select>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="inline-flex items-center border border-slate-200 rounded-md">
                              <button
                                type="button"
                                onClick={() => onUpdateQty(row.product.id, -1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                                aria-label={`Decrease quantity of ${row.product.name}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-8 text-center font-mono text-xs font-semibold tabular-nums">
                                {row.item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => onUpdateQty(row.product.id, 1)}
                                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                                aria-label={`Increase quantity of ${row.product.name}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                            <div>${row.lineTotal.toLocaleString()}</div>
                            {(applyFederalCredit || utilityRebatePct > 0) &&
                              row.netLineTotal < row.lineTotal && (
                                <div className="text-[11px] font-medium text-emerald-700">
                                  Net ${row.netLineTotal.toLocaleString()}
                                </div>
                              )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <a
                                href={buildMerchantOfferUrl(
                                  row.product,
                                  row.offer,
                                  'solarbench-bom'
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() =>
                                  trackOutboundClickClient({
                                    eventType: 'affiliate_bom_click',
                                    productId: row.product.id,
                                    productName: row.product.name,
                                    channel: row.offer.channel,
                                    merchantId: row.offer.merchantId,
                                    landedPrice: row.unitLanded,
                                    sourceSection: 'system-builder',
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:border-amber-600 hover:text-amber-700 transition-colors whitespace-nowrap"
                                title={`Buy at ${row.offer.merchantName}`}
                              >
                                Buy
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(row.product.id)}
                                className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors"
                                aria-label={`Remove ${row.product.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bulk Battery Scaling & Effective Cost-per-kWh Simulator */}
            {resolvedRows.length > 0 &&
              scaleBatteryProduct &&
              bulkScenario && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BatteryCharging className="w-4 h-4 text-amber-600 shrink-0" />
                        Bulk Battery Scaling &amp; Effective $/kWh Impact
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Simulate adding battery units to see how volume discounts, LTL pallet consolidation, and fixed-hardware amortization lower your effective $/kWh.
                      </p>
                    </div>

                    {scaleBatteryOffer && extraBatteryUnits > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onAddBatteryUnits) {
                            onAddBatteryUnits(
                              scaleBatteryProduct.id,
                              scaleBatteryOffer.merchantId,
                              extraBatteryUnits
                            );
                          } else if (activeBuildBatteryRow) {
                            onUpdateQty(
                              activeBuildBatteryRow.product.id,
                              extraBatteryUnits
                            );
                          }
                          setExtraBatteryUnits(0);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Apply +{extraBatteryUnits} Units to Build
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-medium text-slate-600">
                        {activeBuildBatteryRow
                          ? 'Scale BOM Battery:'
                          : 'Simulate Adding:'}
                      </span>
                      {buildStorageRows.length > 1 || !activeBuildBatteryRow ? (
                        <select
                          aria-label="Select battery model to scale"
                          value={scaleBatteryProduct.id}
                          onChange={(e) =>
                            setSelectedBatteryIdForScale(e.target.value)
                          }
                          className="border border-slate-300 rounded-md px-2.5 py-1 bg-white text-slate-900 font-medium text-xs max-w-[280px]"
                        >
                          {(activeBuildBatteryRow
                            ? buildStorageRows.map((r) => r.product)
                            : catalogBatteries
                          ).map((bp) => (
                            <option key={bp.id} value={bp.id}>
                              {bp.name} (
                              {((bp.specs.capacityWh ?? 0) / 1000).toFixed(2)}{' '}
                              kWh)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-semibold text-slate-900">
                          {scaleBatteryProduct.name} (
                          {(
                            (scaleBatteryProduct.specs.capacityWh ?? 0) / 1000
                          ).toFixed(2)}{' '}
                          kWh · Qty {activeBuildBatteryRow.item.quantity})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-500 mr-1">
                        Add Units:
                      </span>
                      {[0, 1, 2, 3, 4, 6].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setExtraBatteryUnits(count)}
                          className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border transition-colors whitespace-nowrap ${
                            extraBatteryUnits === count
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500'
                          }`}
                        >
                          +{count}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={0}
                        max={12}
                        step={1}
                        value={extraBatteryUnits}
                        onChange={(e) =>
                          setExtraBatteryUnits(
                            Math.max(0, Math.min(12, Math.round(Number(e.target.value) || 0)))
                          )
                        }
                        aria-label="Custom additional battery units"
                        className="w-14 px-2 py-1 text-xs font-mono text-center bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-600 tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Primary Impact Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-900 text-white">
                      <div className="text-[11px] text-slate-400">
                        Effective System $/kWh
                      </div>
                      <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-0.5">
                        $
                        {bulkScenario.projectedEffectiveCostPerKwh.toFixed(0)}
                        /kWh
                      </div>
                      <div className="text-[11px] font-mono tabular-nums mt-0.5 flex items-center gap-1 text-emerald-400">
                        {bulkScenario.costPerKwhReductionDollar > 0 ? (
                          <>
                            <TrendingDown className="w-3 h-3 shrink-0" />
                            -${bulkScenario.costPerKwhReductionDollar.toFixed(0)}
                            /kWh (-{bulkScenario.costPerKwhReductionPct}%)
                          </>
                        ) : bulkScenario.baselineEffectiveCostPerKwh !== null ? (
                          <span className="text-slate-400">
                            Baseline: $
                            {bulkScenario.baselineEffectiveCostPerKwh.toFixed(0)}
                            /kWh
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            Add units to preview
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="text-[11px] text-slate-500">
                        Total Stored Capacity
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {bulkScenario.totalStorageKwhAfter.toFixed(2)} kWh
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-600 mt-0.5">
                        {bulkScenario.totalUnitsAfter} battery{' '}
                        {bulkScenario.totalUnitsAfter === 1 ? 'unit' : 'units'}{' '}
                        (from {bulkScenario.baselineStorageKwh.toFixed(2)} kWh)
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                      <div className="text-[11px] text-slate-500">
                        Projected System Total
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        ${bulkScenario.projectedSystemCost.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-slate-600 mt-0.5">
                        {extraBatteryUnits > 0
                          ? `+$${bulkScenario.projectedAddedCost.toLocaleString()} added`
                          : 'Current BOM cost'}
                        {(applyFederalCredit || utilityRebatePct > 0) &&
                        bulkScenario.projectedNetSystemCost <
                          bulkScenario.projectedSystemCost
                          ? ` · Net $${bulkScenario.projectedNetSystemCost.toLocaleString()}`
                          : ''}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg border border-slate-200 bg-emerald-50/70">
                      <div className="text-[11px] text-emerald-800 font-medium">
                        Bulk &amp; Freight Savings
                      </div>
                      <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
                        {bulkScenario.totalBulkSavings > 0
                          ? `-$${bulkScenario.totalBulkSavings.toLocaleString()}`
                          : '$0'}
                      </div>
                      <div className="text-[11px] font-mono tabular-nums text-emerald-800 mt-0.5">
                        {bulkScenario.bulkTierDiscountPct > 0
                          ? `${bulkScenario.bulkTierDiscountPct}% vol (-$${bulkScenario.bulkDiscountSavings})`
                          : '2+ units unlock 3–7%'}
                        {bulkScenario.freightConsolidationSavings > 0
                          ? ` + $${bulkScenario.freightConsolidationSavings} LTL`
                          : ''}
                      </div>
                    </div>
                  </div>

                  {/* Multi-Tier Bulk Comparison Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {bulkTierCurve.map((tier) => {
                      const isSelected =
                        extraBatteryUnits === tier.additionalUnits;
                      return (
                        <button
                          key={tier.additionalUnits}
                          type="button"
                          onClick={() =>
                            setExtraBatteryUnits(tier.additionalUnits)
                          }
                          className={`text-left p-2.5 rounded-lg border transition-colors ${
                            isSelected
                              ? 'border-amber-600 bg-amber-50/70'
                              : 'border-slate-200 bg-white hover:border-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                            <span>+{tier.additionalUnits} Battery</span>
                            {tier.bulkTierDiscountPct > 0 && (
                              <span className="font-mono text-emerald-700">
                                -{tier.bulkTierDiscountPct}%
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                            ${tier.projectedEffectiveCostPerKwh.toFixed(0)}/kWh
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {tier.totalStorageKwhAfter.toFixed(1)} kWh · $
                            {tier.projectedSystemCost.toLocaleString()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Function 8: NEC 125% BOS Wire Gauge, Voltage Drop, Breaker & Parts Estimator */}
            {bosReq && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Cable className="w-4 h-4 text-amber-600" />
                    NEC 125% Balance-of-System (BOS) Wire Gauge, Voltage-Drop &amp; Parts BOM
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 text-slate-600">
                      1-Way Run:
                      <select
                        value={bosRunFeet}
                        onChange={(e) => setBosRunFeet(Number(e.target.value))}
                        className="font-mono font-semibold border border-slate-200 rounded px-1.5 py-0.5 bg-slate-50 text-slate-900"
                      >
                        {[3, 6, 10, 15, 25].map((ft) => (
                          <option key={ft} value={ft}>
                            {ft} ft
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="inline-flex items-center gap-1.5 font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeBosInTotal}
                        onChange={(e) => setIncludeBosInTotal(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-amber-600"
                      />
                      Include Est. BOS (+${bosReq.estimatedBosCost})
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">
                      Peak DC Draw ({bosReq.busVoltage}V)
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                      {bosReq.maxContinuousDcAmps} A DC
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">NEC 125% DC Breaker</div>
                    <div className="font-mono font-bold text-amber-700 text-sm mt-0.5 tabular-nums">
                      {bosReq.necSizedBreakerAmps} A Class-T / MCCB
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">
                      Battery Cable ({bosReq.estimatedVoltageDropPct}% drop)
                    </div>
                    <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                      {bosReq.recommendedWireAwg}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-slate-500">Est. BOS Hardware Cost</div>
                    <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5 tabular-nums">
                      ~${bosReq.estimatedBosCost.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 pt-1">
                  {bosReq.bosPartsChecklist.map((line) => (
                    <div key={line} className="font-mono text-[11px]">
                      · {line}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Function 3: Saved Solar Builds (Firestore DB / Cloud Sync + Overwrite & Share) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-amber-600" />
                  Saved Solar Builds ({savedBuilds.length})
                </h3>
                {!user ? (
                  <button
                    type="button"
                    onClick={() => void signInWithGoogleForArchive()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-amber-700"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign in to sync across devices
                  </button>
                ) : (
                  <span className="text-xs text-emerald-700 font-medium">
                    Synced to Firestore ({user.email})
                  </span>
                )}
              </div>

              <form
                onSubmit={(e) => void handleSaveBuildSubmit(e)}
                className="flex flex-col sm:flex-row gap-2"
              >
                <input
                  type="text"
                  value={buildNameInput}
                  onChange={(e) => setBuildNameInput(e.target.value)}
                  placeholder="Name this BOM (e.g. Homestead 48V Backup v2)..."
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
                <button
                  type="submit"
                  disabled={savingBuild || resolvedRows.length === 0}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                >
                  {savingBuild ? 'Saving...' : 'Save Current Build'}
                </button>
              </form>

              {savedBuilds.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {savedBuilds.map((b) => (
                    <div
                      key={b.buildId}
                      className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-white"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {b.buildName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5">
                          ${b.totalCost.toLocaleString()} ·{' '}
                          {(b.totalStorageWh / 1000).toFixed(1)} kWh ·{' '}
                          {(b.totalSolarWatts / 1000).toFixed(1)} kW PV ·{' '}
                          {b.items.length} SKUs
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onLoadSavedBuild(b.items)}
                          className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap"
                        >
                          Load BOM
                        </button>
                        <button
                          type="button"
                          disabled={resolvedRows.length === 0}
                          onClick={() =>
                            void onUpdateSavedBuild(
                              b.buildId,
                              b.buildName,
                              selectedTotal,
                              totalStorageWh,
                              totalSolarWatts
                            )
                          }
                          title="Overwrite this saved build with current BOM"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-xs font-medium text-slate-700 hover:border-amber-500 hover:text-amber-700 disabled:opacity-40 whitespace-nowrap"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Update
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopySavedBomSummary(b)}
                          title="Copy shareable BOM summary"
                          className="p-1 rounded border border-slate-200 text-slate-500 hover:text-slate-900"
                        >
                          {copiedBomId === b.buildId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-700" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteSavedBuild(b.buildId)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          aria-label={`Delete saved build ${b.buildName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Locked Hardware Quote Snapshots (Account Audit Ledger) */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-600" />
                  Locked Price Quotes ({quoteSnapshots.length})
                </h3>
                {!user || !user.emailVerified ? (
                  <button
                    type="button"
                    onClick={() => void signInWithGoogleForArchive()}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-amber-700"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign in to archive locked quotes
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Price-stamped snapshots for {user.email}
                  </span>
                )}
              </div>

              {user && user.emailVerified && onSaveQuoteSnapshot && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (resolvedRows.length === 0) return;
                    const quoteTitle =
                      quoteTitleInput.trim() ||
                      `Quote ${new Date().toLocaleDateString()} (${resolvedRows.length} SKUs)`;
                    setSavingQuote(true);
                    try {
                      await onSaveQuoteSnapshot({
                        quoteTitle,
                        totalLandedCost: selectedTotal,
                        totalStorageWh,
                        totalSolarWatts,
                        utilityRateSnapshot: gridRatePerKwh,
                        items: resolvedRows.map((row) => ({
                          productId: row.product.id,
                          productName: row.product.name,
                          merchantId: row.offer.merchantId,
                          quantity: row.item.quantity,
                          unitLandedPrice: row.unitLanded,
                        })),
                      });
                      setQuoteTitleInput('');
                    } finally {
                      setSavingQuote(false);
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    value={quoteTitleInput}
                    onChange={(e) => setQuoteTitleInput(e.target.value)}
                    placeholder="Quote label (e.g. Q2 Cabin 48V Verified Quote)..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                  />
                  <button
                    type="submit"
                    disabled={savingQuote || resolvedRows.length === 0}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    {savingQuote ? 'Locking...' : 'Lock Price Quote'}
                  </button>
                </form>
              )}

              {quoteSnapshots.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {quoteSnapshots.map((quote) => (
                    <div
                      key={quote.id}
                      className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs bg-white"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {quote.quoteTitle}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5">
                          ${quote.totalLandedCost.toLocaleString()} landed ·{' '}
                          {(quote.totalStorageWh / 1000).toFixed(1)} kWh ·{' '}
                          {(quote.totalSolarWatts / 1000).toFixed(1)} kW PV · @ $
                          {quote.utilityRateSnapshot.toFixed(2)}/kWh ·{' '}
                          {quote.items.length} line items
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {onLoadQuoteSnapshot && (
                          <button
                            type="button"
                            onClick={() => onLoadQuoteSnapshot(quote)}
                            className="px-2.5 py-1 rounded border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap"
                          >
                            Restore Quote
                          </button>
                        )}
                        {onDeleteQuoteSnapshot && (
                          <button
                            type="button"
                            onClick={() => void onDeleteQuoteSnapshot(quote.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                            aria-label={`Delete quote ${quote.quoteTitle}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                System Summary &amp; Landed Cost
              </h3>

              <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-200">
                <div>
                  <div className="text-xs text-slate-500">Storage</div>
                  <div className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {(totalStorageWh / 1000).toFixed(2)} kWh
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">PV Array</div>
                  <div className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {(totalSolarWatts / 1000).toFixed(2)} kW
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Inverter</div>
                  <div className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                    {(totalInverterWatts / 1000).toFixed(1)} kW
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-600">
                    {includeBosInTotal && bosReq
                      ? 'Hardware + BOS Total'
                      : 'Selected Sellers Total'}
                  </span>
                  <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                    ${selectedTotal.toLocaleString()}
                  </span>
                </div>
                {(applyFederalCredit || utilityRebatePct > 0) &&
                  netSelectedTotal < selectedTotal && (
                    <div className="flex items-baseline justify-between text-xs font-semibold text-emerald-700">
                      <span>
                        Net After{' '}
                        {applyFederalCredit ? '30% Sec. 25D' : ''}
                        {applyFederalCredit && utilityRebatePct > 0
                          ? ' + '
                          : ''}
                        {utilityRebatePct > 0
                          ? `${utilityRebatePct}% Utility`
                          : ''}
                      </span>
                      <span className="font-mono text-sm tabular-nums">
                        ${netSelectedTotal.toLocaleString()} (Save $
                        {(selectedTotal - netSelectedTotal).toLocaleString()})
                      </span>
                    </div>
                  )}
                {selectedTotal > optimalTotal && (
                  <div className="flex items-baseline justify-between text-xs text-emerald-700">
                    <span>Cheapest Split-Merchant Total</span>
                    <span className="font-mono font-semibold tabular-nums">
                      ${optimalTotal.toLocaleString()} (Save $
                      {(selectedTotal - optimalTotal).toLocaleString()})
                    </span>
                  </div>
                )}
                {totalStorageWh > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-baseline justify-between text-xs text-slate-500">
                      <span>Total System Cost per Stored kWh</span>
                      <span className="font-mono tabular-nums font-semibold text-slate-800">
                        ${(selectedTotal / (totalStorageWh / 1000)).toFixed(0)}
                        /kWh
                      </span>
                    </div>
                    {bulkScenario && extraBatteryUnits > 0 && (
                      <div className="flex items-baseline justify-between text-[11px] font-mono tabular-nums text-emerald-700">
                        <span>
                          With +{extraBatteryUnits} battery{' '}
                          {extraBatteryUnits === 1 ? 'unit' : 'units'} (
                          {bulkScenario.totalStorageKwhAfter.toFixed(1)} kWh)
                        </span>
                        <span className="font-bold">
                          ${bulkScenario.projectedEffectiveCostPerKwh.toFixed(0)}
                          /kWh (-{bulkScenario.costPerKwhReductionPct}%)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Function 7: Whole-System 5-Year Grid Tariff ROI & Payback */}
              {bomRoi && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">
                      System 5-Year Grid ROI
                    </span>
                    <select
                      aria-label="Local utility electricity rate"
                      value={gridRatePerKwh}
                      onChange={(e) => setGridRatePerKwh(Number(e.target.value))}
                      className="font-mono text-[11px] border border-slate-200 rounded bg-white px-1.5 py-0.5 text-slate-700"
                    >
                      {![0.14, 0.24, 0.35, 0.45].some(
                        (v) => Math.abs(v - gridRatePerKwh) < 0.002
                      ) && (
                        <option value={gridRatePerKwh}>
                          ${gridRatePerKwh.toFixed(2)}/kWh (Saved)
                        </option>
                      )}
                      <option value={0.14}>$0.14/kWh (Avg)</option>
                      <option value={0.24}>$0.24/kWh (Peak)</option>
                      <option value={0.35}>$0.35/kWh (Coastal)</option>
                      <option value={0.45}>$0.45/kWh (CA/HI)</option>
                    </select>
                  </div>
                  <div className="flex items-baseline justify-between font-mono tabular-nums">
                    <span className="text-slate-600">5-Yr Utility Offset</span>
                    <span className="font-bold text-emerald-700">
                      ${bomRoi.fiveYearUtilitySavings.toLocaleString()} (~
                      {bomRoi.paybackMonths} mo payback)
                    </span>
                  </div>
                  {onOpenRoiCalculator && (
                    <button
                      type="button"
                      onClick={onOpenRoiCalculator}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-emerald-300 bg-white text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors whitespace-nowrap"
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Open Full ROI &amp; Grid Parity Calculator
                    </button>
                  )}
                </div>
              )}

              {/* Function 6: Smart Split-Cart Optimizer + 1-Click Consolidated Pallet Distributors */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Smart Cart &amp; Freight Optimizer
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={resolvedRows.length === 0}
                    onClick={() => onOptimizeBuild(false)}
                    className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Lowest Split-Store
                  </button>
                  <button
                    type="button"
                    disabled={resolvedRows.length === 0}
                    onClick={() => onOptimizeBuild(true)}
                    className="px-2.5 py-2 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    Authorized OEM Only
                  </button>
                </div>

                {consolidatedOptions.slice(0, 3).map((opt) => (
                  <div
                    key={opt.channel}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">
                        {opt.channel} · ${opt.totalLanded.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {opt.freightNote}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onApplyConsolidatedChannel(opt.channel)}
                      className="px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      Use Store
                    </button>
                  </div>
                ))}
              </div>

              {/* Function 10: One-Click Copy All Active BOM Promo Codes */}
              {bomPromos.entries.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const summary = bomPromos.entries
                      .map(
                        (e) =>
                          `${e.merchantName}: ${e.code}${e.savingsTotal > 0 ? ` (-$${e.savingsTotal})` : ''}`
                      )
                      .join(' | ');
                    onCopyPromoBundle(summary, bomPromos.entries.length);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy All {bomPromos.entries.length} Active Promo Codes (-$
                  {bomPromos.totalCouponSavings.toLocaleString()})
                </button>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={resolvedRows.length === 0}
                  onClick={handleExportCsv}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exportedNote ? 'CSV Saved' : 'Download CSV'}
                </button>
                <button
                  type="button"
                  disabled={resolvedRows.length === 0}
                  onClick={handleExportPermitSheet}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  <FileText className="w-3.5 h-3.5" />
                  {permitExportedNote ? 'Spec Saved' : 'Permit Spec (.txt)'}
                </button>
              </div>
            </div>

            {/* Function 9 & Electrical Compatibility Check */}
            {(diagnostics.length > 0 || bomPermit) && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Electrical, Permit &amp; Warranty Audit
                </h3>
                {bomPermit && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                        UL &amp; Permit Readiness
                      </span>
                      <span className="font-mono">
                        {bomPermit.ulListedLines}/{bomPermit.totalLines} UL Listed
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600">
                      <span>OEM Authorized Sellers</span>
                      <span
                        className={`font-mono font-semibold ${
                          bomPermit.authorizedLines === bomPermit.totalLines
                            ? 'text-emerald-700'
                            : 'text-amber-700'
                        }`}
                      >
                        {bomPermit.authorizedLines}/{bomPermit.totalLines} Verified
                      </span>
                    </div>
                    {bomPermit.riskMerchants.length > 0 && (
                      <div className="text-[11px] text-amber-700">
                        Verify serial warranty: {bomPermit.riskMerchants[0]}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {diagnostics.map((d) => (
                    <div key={d.title} className="flex items-start gap-2.5">
                      {d.status === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            d.status === 'ok'
                              ? 'text-emerald-800'
                              : 'text-amber-800'
                          }`}
                        >
                          {d.title}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {d.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
