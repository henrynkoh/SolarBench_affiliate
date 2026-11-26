import {
  ApplianceLoadItem,
  MerchantOffer,
  SolarProduct,
  SystemBuildItem,
} from '../types/solar';
import { getBestOffer, getFilteredOffers, getOfferLandedPrice } from './solarCatalog';

// Function 1: 30% Federal Sec. 25D Clean Energy Credit & Local Utility Rebate Engine
export function isSec25DEligible(product: SolarProduct): boolean {
  if (product.category === 'panels' || product.category === 'inverters' || product.category === 'controllers') {
    return true;
  }
  // Batteries & portable stations qualify for 30% Sec. 25D when capacity >= 3,000 Wh (3 kWh)
  return (product.specs.capacityWh ?? 0) >= 3000;
}

export function getEffectiveNetPrice(
  product: SolarProduct,
  grossLandedPrice: number,
  applyFederalCredit: boolean,
  utilityRebatePct = 0
): number {
  let net = grossLandedPrice;
  if (applyFederalCredit && isSec25DEligible(product)) {
    net = net * 0.7;
  }
  if (utilityRebatePct > 0) {
    net = net * (1 - Math.min(0.3, utilityRebatePct / 100));
  }
  return Math.round(net);
}

// Function 4: Interactive Appliance Load & Days-of-Autonomy Sizing Engine
export const DEFAULT_APPLIANCES: ApplianceLoadItem[] = [
  { id: 'fridge', name: 'Full-Size Inverter Refrigerator', watts: 140, surgeWatts: 650, hoursPerDay: 9, enabled: true, quantity: 1 },
  { id: 'starlink', name: 'Starlink + Fiber Router / Mesh', watts: 65, surgeWatts: 80, hoursPerDay: 24, enabled: true, quantity: 1 },
  { id: 'lights', name: 'LED Home Lighting & Devices', watts: 90, surgeWatts: 100, hoursPerDay: 8, enabled: true, quantity: 1 },
  { id: 'furnace', name: 'Gas Furnace Blower / Hydronic Pump', watts: 480, surgeWatts: 1200, hoursPerDay: 6, enabled: true, quantity: 1 },
  { id: 'well-pump', name: '240V Submersible Well Pump (0.75 HP)', watts: 1100, surgeWatts: 2400, hoursPerDay: 1.5, enabled: false, quantity: 1 },
  { id: 'mini-split', name: '12,000 BTU Inverter Mini-Split AC', watts: 850, surgeWatts: 1200, hoursPerDay: 7, enabled: false, quantity: 1 },
  { id: 'induction', name: 'Induction Cooktop / Microwave', watts: 1500, surgeWatts: 1600, hoursPerDay: 1, enabled: false, quantity: 1 },
  { id: 'local-ai-llm', name: 'Local AI LLM Rig (Dual GPU + NAS)', watts: 850, surgeWatts: 1100, hoursPerDay: 12, enabled: false, quantity: 1 },
];

export interface LoadSizingSummary {
  dailyWh: number;
  continuousPeakWatts: number;
  maxSurgeWatts: number;
  recommendedStorageWh: number;
  recommendedInverterWatts: number;
  recommendedSolarWatts: number;
  needs240V: boolean;
}

export function computeLoadSizing(
  appliances: ApplianceLoadItem[],
  autonomyDays: number,
  peakSunHours: number
): LoadSizingSummary {
  const active = appliances.filter((a) => a.enabled && a.quantity > 0);
  const dailyWh = active.reduce(
    (sum, a) => sum + a.watts * a.hoursPerDay * a.quantity,
    0
  );
  const continuousPeakWatts = active.reduce(
    (sum, a) => sum + a.watts * a.quantity,
    0
  );
  const maxSurgeWatts = active.reduce((max, a) => {
    const itemPeak = a.surgeWatts + (continuousPeakWatts - a.watts * a.quantity) * 0.5;
    return Math.max(max, itemPeak);
  }, continuousPeakWatts);

  // Account for 80% usable LiFePO4 DoD and 90% inverter efficiency
  const recommendedStorageWh = Math.ceil((dailyWh * autonomyDays) / (0.8 * 0.9));
  const recommendedInverterWatts = Math.ceil(Math.max(continuousPeakWatts * 1.25, maxSurgeWatts * 0.85) / 500) * 500;
  // Account for 80% real-world PV derate (temp, wiring, cloud transients)
  const recommendedSolarWatts = Math.ceil(dailyWh / (Math.max(2, peakSunHours) * 0.8));
  const needs240V = active.some((a) => a.id === 'well-pump') || recommendedInverterWatts >= 5000;

  return {
    dailyWh,
    continuousPeakWatts,
    maxSurgeWatts: Math.round(maxSurgeWatts),
    recommendedStorageWh,
    recommendedInverterWatts,
    recommendedSolarWatts,
    needs240V,
  };
}

// Function 5: Real-Time Arbitrage & 90-Day Price Percentile Engine
export interface PriceArbitrageMetrics {
  lowestLanded: number;
  highestLanded: number;
  spreadDollar: number;
  spreadPct: number;
  low90d: number;
  high90d: number;
  percentile90d: number;
  deltaFromLow90d: number;
  buySignal: 'At 90d Low — Buy Now' | 'Near 90d Low' | 'Mid-Range' | 'Wait for Coupon Drop';
}

export function getPriceArbitrageMetrics(
  product: SolarProduct,
  includeRefurb = true
): PriceArbitrageMetrics {
  const offers = getFilteredOffers(product, { includeRefurb });
  const prices = offers.map((o) => getOfferLandedPrice(o));
  const lowestLanded = prices[0] ?? product.msrp;
  const highestLanded = prices[prices.length - 1] ?? lowestLanded;
  const spreadDollar = Math.max(0, highestLanded - lowestLanded);
  const spreadPct =
    highestLanded > 0 ? Math.round((spreadDollar / highestLanded) * 100) : 0;

  const historyPrices = product.priceHistory90d.map((pt) => pt.price);
  const low90d = Math.min(...historyPrices, lowestLanded);
  const high90d = Math.max(...historyPrices, lowestLanded);
  const range = Math.max(1, high90d - low90d);
  const percentile90d = Math.round(((lowestLanded - low90d) / range) * 100);
  const deltaFromLow90d = Math.max(0, lowestLanded - low90d);

  let buySignal: PriceArbitrageMetrics['buySignal'] = 'Mid-Range';
  if (percentile90d <= 12) {
    buySignal = 'At 90d Low — Buy Now';
  } else if (percentile90d <= 35) {
    buySignal = 'Near 90d Low';
  } else if (percentile90d >= 75) {
    buySignal = 'Wait for Coupon Drop';
  }

  return {
    lowestLanded,
    highestLanded,
    spreadDollar,
    spreadPct,
    low90d,
    high90d,
    percentile90d,
    deltaFromLow90d,
    buySignal,
  };
}

// Function 6: Smart Split-Cart Optimizer vs. Single-Store Consolidation
export interface ConsolidatedVendorOption {
  channel: string;
  merchantName: string;
  coveredCount: number;
  totalCount: number;
  totalLanded: number;
  freightNote: string;
}

export function computeSingleStoreConsolidation(
  items: SystemBuildItem[],
  catalog: SolarProduct[]
): ConsolidatedVendorOption[] {
  if (items.length === 0) return [];
  const channelTotals = new Map<
    string,
    { merchantName: string; coveredCount: number; totalLanded: number }
  >();

  const candidateChannels = [
    'Signature Solar',
    'Current Connected',
    'Amazon',
    'eBay',
    'ShopSolar',
    'Home Depot',
  ];

  for (const ch of candidateChannels) {
    let total = 0;
    let covered = 0;
    let sampleName = ch;
    for (const item of items) {
      const product = catalog.find((p) => p.id === item.productId);
      if (!product) continue;
      const match = product.offers
        .filter((o) => o.channel === ch && o.inStock)
        .sort((a, b) => getOfferLandedPrice(a) - getOfferLandedPrice(b))[0];
      if (match) {
        covered += 1;
        sampleName = match.merchantName;
        total += getOfferLandedPrice(match) * item.quantity;
      }
    }
    if (covered === items.length && covered > 0) {
      // Simulate realistic LTL pallet consolidation savings if >1 bulky item from specialty distributor
      const isDistributor =
        ch === 'Signature Solar' || ch === 'Current Connected' || ch === 'ShopSolar';
      const palletDiscount = isDistributor && items.length >= 2 ? 85 : 0;
      channelTotals.set(ch, {
        merchantName: sampleName,
        coveredCount: covered,
        totalLanded: Math.max(0, total - palletDiscount),
      });
    }
  }

  return Array.from(channelTotals.entries())
    .map(([channel, info]) => ({
      channel,
      merchantName: info.merchantName,
      coveredCount: info.coveredCount,
      totalCount: items.length,
      totalLanded: info.totalLanded,
      freightNote:
        channel === 'Signature Solar' || channel === 'Current Connected' || channel === 'ShopSolar'
          ? 'Single-pallet LTL (-$85 combined freight)'
          : 'Single checkout cart',
    }))
    .sort((a, b) => a.totalLanded - b.totalLanded);
}

// Function 7: 5-Year Lifecycle $/kWh Delivered & Generator Payback Engine
export interface LifecycleCostMetrics {
  usableKwhPerCycle: number;
  lifetimeKwhDelivered: number;
  costPerDeliveredKwh: number;
  fiveYearUtilityValue: number;
  fiveYearGasGenSavings: number;
  paybackMonthsVsGrid: number;
}

export function getLifecycleCostMetrics(
  product: SolarProduct,
  landedPrice: number,
  utilityRatePerKwh = 0.24
): LifecycleCostMetrics {
  const cycles = product.specs.cycleLife ?? 4000;
  const eff = product.specs.efficiencyPct / 100;
  const rate = Math.max(0.08, Math.min(0.8, utilityRatePerKwh));

  if (product.specs.capacityWh && product.specs.capacityWh > 0) {
    const usableKwhPerCycle = (product.specs.capacityWh / 1000) * 0.8 * eff;
    const lifetimeKwhDelivered = Math.round(usableKwhPerCycle * cycles);
    const costPerDeliveredKwh =
      lifetimeKwhDelivered > 0 ? landedPrice / lifetimeKwhDelivered : 0;
    const fiveYearUtilityValue = Math.round(usableKwhPerCycle * 365 * 5 * rate);
    const fiveYearGasGenSavings = Math.round(
      fiveYearUtilityValue + 2600 - landedPrice
    );
    const monthlyValue = Math.max(1, fiveYearUtilityValue / 60);
    const paybackMonthsVsGrid = Math.max(
      4,
      Math.round(landedPrice / monthlyValue)
    );

    return {
      usableKwhPerCycle,
      lifetimeKwhDelivered,
      costPerDeliveredKwh,
      fiveYearUtilityValue,
      fiveYearGasGenSavings,
      paybackMonthsVsGrid,
    };
  }

  const ratedKw = (product.specs.powerWatts ?? 2000) / 1000;
  const dailyKwh =
    product.category === 'panels' ? ratedKw * 4.8 * 0.85 : ratedKw * 3.5 * eff;
  const lifetimeKwhDelivered = Math.round(dailyKwh * 365 * 10);
  const costPerDeliveredKwh =
    lifetimeKwhDelivered > 0 ? landedPrice / lifetimeKwhDelivered : 0;
  const fiveYearUtilityValue = Math.round(dailyKwh * 365 * 5 * rate);
  const monthlyValue = Math.max(1, fiveYearUtilityValue / 60);

  return {
    usableKwhPerCycle: dailyKwh,
    lifetimeKwhDelivered,
    costPerDeliveredKwh,
    fiveYearUtilityValue,
    fiveYearGasGenSavings: Math.round(fiveYearUtilityValue - landedPrice),
    paybackMonthsVsGrid: Math.max(4, Math.round(landedPrice / monthlyValue)),
  };
}

export interface BomLifecycleRoi {
  estimatedDailyKwh: number;
  fiveYearUtilitySavings: number;
  paybackMonths: number;
  netFiveYearGain: number;
}

export function computeBomLifecycleRoi(
  totalStorageWh: number,
  totalSolarWatts: number,
  totalInverterWatts: number,
  netSystemCost: number,
  utilityRatePerKwh = 0.24
): BomLifecycleRoi | null {
  if (netSystemCost <= 0) return null;
  const solarDaily = (totalSolarWatts / 1000) * 4.6 * 0.85;
  const batteryDaily = (totalStorageWh / 1000) * 0.8;
  const invCap = (Math.max(1000, totalInverterWatts) / 1000) * 5;
  const estimatedDailyKwh =
    solarDaily > 0
      ? Math.min(Math.max(solarDaily, batteryDaily * 0.6), solarDaily + 2)
      : batteryDaily > 0
      ? Math.min(batteryDaily, invCap)
      : invCap * 0.6;

  if (estimatedDailyKwh <= 0) return null;
  const fiveYearUtilitySavings = Math.round(
    estimatedDailyKwh * 365 * 5 * utilityRatePerKwh
  );
  const monthlySavings = Math.max(1, fiveYearUtilitySavings / 60);
  const paybackMonths = Math.max(4, Math.round(netSystemCost / monthlySavings));
  const netFiveYearGain = fiveYearUtilitySavings - netSystemCost;

  return {
    estimatedDailyKwh,
    fiveYearUtilitySavings,
    paybackMonths,
    netFiveYearGain,
  };
}

export interface YearsToPaybackInput {
  systemCost: number;
  category: SolarProduct['category'];
  systemCapacityValue: number; // kWh for batteries/portable, kW for panels/inverters/controllers
  dailyUtilization: number; // cycles/day for batteries/portable, peak sun hours/day for panels/inverters/controllers
  efficiencyPct: number;
  ratePerKwh: number;
}

export interface YearsToPaybackResult {
  dailyKwhOffset: number;
  annualKwhOffset: number;
  annualSavings: number;
  monthlySavings: number;
  yearsToPayback: number;
  breakEvenMonths: number;
  breakEvenYearLabel: string;
  tenYearGrossSavings: number;
  tenYearNetSavings: number;
  fiveYearUtilitySavings: number;
}

export function computeYearsToPayback(
  input: YearsToPaybackInput
): YearsToPaybackResult {
  const cost = Math.max(0, input.systemCost);
  const capacity = Math.max(0.1, input.systemCapacityValue);
  const utilization = Math.max(0.25, input.dailyUtilization);
  const eff = Math.max(0.5, Math.min(1, input.efficiencyPct / 100));
  const rate = Math.max(0.04, Math.min(2, input.ratePerKwh));

  let dailyKwhOffset = 0;
  if (input.category === 'batteries' || input.category === 'portable') {
    // Usable LiFePO4 80% DoD × round-trip efficiency × daily cycles
    dailyKwhOffset = capacity * 0.8 * eff * utilization;
  } else if (input.category === 'panels') {
    // Array kW × peak sun hours × 85% real-world PV derate
    dailyKwhOffset = capacity * utilization * 0.85;
  } else {
    // Inverters & MPPT charge controllers: rated kW × solar window hours × efficiency × 75% load factor
    dailyKwhOffset = capacity * utilization * eff * 0.75;
  }

  const annualKwhOffset = dailyKwhOffset * 365;
  const annualSavings = annualKwhOffset * rate;
  const monthlySavings = annualSavings / 12;
  const yearsToPayback = annualSavings > 0 ? cost / annualSavings : 0;
  const breakEvenMonths = Math.max(1, Math.round(yearsToPayback * 12));
  const breakEvenYearLabel =
    yearsToPayback < 1
      ? `${breakEvenMonths} mo`
      : `${yearsToPayback.toFixed(1)} yrs`;

  const fiveYearUtilitySavings = Math.round(annualSavings * 5);
  const tenYearGrossSavings = Math.round(annualSavings * 10);
  const tenYearNetSavings = Math.round(tenYearGrossSavings - cost);

  return {
    dailyKwhOffset,
    annualKwhOffset,
    annualSavings,
    monthlySavings,
    yearsToPayback,
    breakEvenMonths,
    breakEvenYearLabel,
    tenYearGrossSavings,
    tenYearNetSavings,
    fiveYearUtilitySavings,
  };
}

export interface BulkBatteryScenarioInput {
  baselineSystemCost: number;
  baselineNetSystemCost: number;
  baselineStorageWh: number;
  batteryUnitWh: number;
  batteryUnitLandedCost: number;
  batteryUnitNetCost: number;
  batteryUnitShipping: number;
  currentBatteryUnits: number;
  additionalUnits: number;
  isBatteryCategory: boolean;
}

export interface BulkBatteryScenarioResult {
  additionalUnits: number;
  totalUnitsAfter: number;
  baselineStorageKwh: number;
  totalStorageKwhAfter: number;
  baselineEffectiveCostPerKwh: number | null;
  projectedSystemCost: number;
  projectedNetSystemCost: number;
  projectedEffectiveCostPerKwh: number;
  projectedNetEffectiveCostPerKwh: number;
  projectedAddedCost: number;
  bulkTierDiscountPct: number;
  bulkDiscountSavings: number;
  freightConsolidationSavings: number;
  totalBulkSavings: number;
  costPerKwhReductionDollar: number;
  costPerKwhReductionPct: number;
  marginalCostPerKwh: number;
}

export function getBatteryBulkDiscountPct(totalUnits: number): number {
  if (totalUnits >= 6) return 7;
  if (totalUnits >= 4) return 5;
  if (totalUnits >= 2) return 3;
  return 0;
}

export function computeBulkBatteryScenario(
  input: BulkBatteryScenarioInput
): BulkBatteryScenarioResult {
  const additionalUnits = Math.max(0, Math.round(input.additionalUnits));
  const totalUnitsAfter = input.currentBatteryUnits + additionalUnits;
  const baselineStorageKwh = input.baselineStorageWh / 1000;
  const addedWh = input.batteryUnitWh * additionalUnits;
  const totalStorageKwhAfter = (input.baselineStorageWh + addedWh) / 1000;

  const baselineEffectiveCostPerKwh =
    baselineStorageKwh > 0
      ? input.baselineSystemCost / baselineStorageKwh
      : null;

  const bulkTierDiscountPct =
    additionalUnits > 0 ? getBatteryBulkDiscountPct(totalUnitsAfter) : 0;
  const grossAddedCost = input.batteryUnitLandedCost * additionalUnits;
  const bulkDiscountSavings = Math.round(
    grossAddedCost * (bulkTierDiscountPct / 100)
  );
  const freightConsolidationSavings =
    additionalUnits > 0
      ? input.batteryUnitShipping > 0
        ? input.batteryUnitShipping * additionalUnits
        : input.isBatteryCategory && additionalUnits >= 2
        ? 45
        : 0
      : 0;

  const totalBulkSavings = bulkDiscountSavings + freightConsolidationSavings;
  const projectedAddedCost = Math.max(0, grossAddedCost - totalBulkSavings);
  const projectedSystemCost = input.baselineSystemCost + projectedAddedCost;

  const netRatio =
    input.batteryUnitLandedCost > 0
      ? input.batteryUnitNetCost / input.batteryUnitLandedCost
      : 1;
  const projectedNetAddedCost = Math.round(projectedAddedCost * netRatio);
  const projectedNetSystemCost =
    input.baselineNetSystemCost + projectedNetAddedCost;

  const projectedEffectiveCostPerKwh =
    totalStorageKwhAfter > 0 ? projectedSystemCost / totalStorageKwhAfter : 0;
  const projectedNetEffectiveCostPerKwh =
    totalStorageKwhAfter > 0
      ? projectedNetSystemCost / totalStorageKwhAfter
      : 0;

  const costPerKwhReductionDollar =
    baselineEffectiveCostPerKwh !== null
      ? Math.max(0, baselineEffectiveCostPerKwh - projectedEffectiveCostPerKwh)
      : 0;
  const costPerKwhReductionPct =
    baselineEffectiveCostPerKwh !== null && baselineEffectiveCostPerKwh > 0
      ? Math.round(
          (costPerKwhReductionDollar / baselineEffectiveCostPerKwh) * 100
        )
      : 0;

  const marginalCostPerKwh =
    addedWh > 0
      ? projectedAddedCost / (addedWh / 1000)
      : input.batteryUnitWh > 0
      ? input.batteryUnitLandedCost / (input.batteryUnitWh / 1000)
      : 0;

  return {
    additionalUnits,
    totalUnitsAfter,
    baselineStorageKwh,
    totalStorageKwhAfter,
    baselineEffectiveCostPerKwh,
    projectedSystemCost,
    projectedNetSystemCost,
    projectedEffectiveCostPerKwh,
    projectedNetEffectiveCostPerKwh,
    projectedAddedCost,
    bulkTierDiscountPct,
    bulkDiscountSavings,
    freightConsolidationSavings,
    totalBulkSavings,
    costPerKwhReductionDollar,
    costPerKwhReductionPct,
    marginalCostPerKwh,
  };
}

export interface BatteryRuntimeInput {
  capacityWh: number;
  unitCount: number;
  loadWatts: number;
  dodPct: number;
  batteryEfficiencyPct: number;
  outputMode: 'ac-inverter' | 'dc-direct';
  maxContinuousWatts?: number;
}

export interface BatteryRuntimeResult {
  totalRatedWh: number;
  usableWh: number;
  effectiveEfficiencyPct: number;
  runtimeHours: number;
  runtimeShortLabel: string;
  runtimeDetailedLabel: string;
  withinContinuousLimit: boolean;
  totalMaxContinuousWatts: number;
}

export function formatRuntimeHours(hours: number): {
  shortLabel: string;
  detailedLabel: string;
} {
  if (!Number.isFinite(hours) || hours <= 0) {
    return { shortLabel: '0m', detailedLabel: '0 minutes' };
  }
  if (hours < 1) {
    const mins = Math.max(1, Math.round(hours * 60));
    return { shortLabel: `${mins}m`, detailedLabel: `${mins} mins` };
  }
  if (hours < 24) {
    const wholeHours = Math.floor(hours);
    const mins = Math.round((hours - wholeHours) * 60);
    const adjustedHours = mins === 60 ? wholeHours + 1 : wholeHours;
    const adjustedMins = mins === 60 ? 0 : mins;
    return {
      shortLabel: `${hours.toFixed(1)} hrs`,
      detailedLabel:
        adjustedMins > 0
          ? `${adjustedHours} hrs ${adjustedMins} mins`
          : `${adjustedHours} hrs`,
    };
  }
  const days = Math.floor(hours / 24);
  const remHours = Math.round(hours % 24);
  return {
    shortLabel: `${hours.toFixed(1)} hrs`,
    detailedLabel:
      remHours > 0
        ? `${days} ${days === 1 ? 'day' : 'days'} ${remHours} hrs`
        : `${days} ${days === 1 ? 'day' : 'days'}`,
  };
}

export function computeBatteryRuntime(
  input: BatteryRuntimeInput
): BatteryRuntimeResult {
  const units = Math.max(1, Math.round(input.unitCount));
  const load = Math.max(1, input.loadWatts);
  const dod = Math.max(10, Math.min(100, input.dodPct)) / 100;
  const cellEff = Math.max(0.7, Math.min(1, input.batteryEfficiencyPct / 100));
  const pathConversion = input.outputMode === 'ac-inverter' ? 0.9 : 0.98;
  const effectiveEfficiencyPct = Number(
    (cellEff * pathConversion * 100).toFixed(1)
  );

  const totalRatedWh = input.capacityWh * units;
  const usableWh = Math.round(totalRatedWh * dod * cellEff * pathConversion);
  const runtimeHours = usableWh / load;
  const formatted = formatRuntimeHours(runtimeHours);
  const totalMaxContinuousWatts = (input.maxContinuousWatts ?? 5000) * units;

  return {
    totalRatedWh,
    usableWh,
    effectiveEfficiencyPct,
    runtimeHours,
    runtimeShortLabel: formatted.shortLabel,
    runtimeDetailedLabel: formatted.detailedLabel,
    withinContinuousLimit: load <= totalMaxContinuousWatts,
    totalMaxContinuousWatts,
  };
}

export interface BatteryEnergyDensityPoint {
  id: string;
  sku: string;
  name: string;
  shortLabel: string;
  brand: string;
  category: 'batteries' | 'portable';
  voltageClass: string;
  capacityWh: number;
  weightLbs: number;
  weightKg: number;
  volumeLiters: number;
  volumeCuFt: number;
  gravimetricWhPerKg: number;
  gravimetricWhPerLb: number;
  volumetricWhPerLiter: number;
  portabilityTier: 'Compact Portable' | 'Field / Van Ready' | 'Rack / Stationary';
}

export function parseDimensionsVolumeLiters(dimensionsIn: string): {
  volumeLiters: number;
  volumeCuFt: number;
} {
  const parts = dimensionsIn
    .split(/[×xX*]/)
    .map((part) => parseFloat(part.replace(/[^0-9.]/g, '')))
    .filter((num) => Number.isFinite(num) && num > 0);

  if (parts.length < 3) {
    return { volumeLiters: 0, volumeCuFt: 0 };
  }

  const cubicInches = parts[0] * parts[1] * parts[2];
  const volumeLiters = Number((cubicInches * 0.016387064).toFixed(1));
  const volumeCuFt = Number((cubicInches / 1728).toFixed(2));
  return { volumeLiters, volumeCuFt };
}

function buildShortBatteryLabel(product: SolarProduct): string {
  const clean = product.name
    .replace('Server Rack Battery', '')
    .replace('Server Rack LiFePO4', '')
    .replace('Portable Power Station', '')
    .replace('Power Station', '')
    .replace('Expandable', '')
    .replace('Modular Solar System', '')
    .replace('Self-Heating', '')
    .replace('AllWeather', '')
    .replace('Wall/Rack LiFePO4', '')
    .replace('Heated Bluetooth IP67', '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > 26 ? `${clean.slice(0, 24).trim()}…` : clean;
}

export function buildBatteryEnergyDensityDataset(
  products: SolarProduct[]
): BatteryEnergyDensityPoint[] {
  return products
    .filter(
      (p) =>
        (p.category === 'batteries' || p.category === 'portable') &&
        (p.specs.capacityWh ?? 0) > 0 &&
        p.specs.weightLbs > 0
    )
    .map((p) => {
      const capacityWh = p.specs.capacityWh ?? 0;
      const weightLbs = p.specs.weightLbs;
      const weightKg = Number((weightLbs * 0.45359237).toFixed(1));
      const { volumeLiters, volumeCuFt } = parseDimensionsVolumeLiters(
        p.specs.dimensionsIn
      );
      const gravimetricWhPerKg =
        weightKg > 0 ? Number((capacityWh / weightKg).toFixed(1)) : 0;
      const gravimetricWhPerLb =
        weightLbs > 0 ? Number((capacityWh / weightLbs).toFixed(1)) : 0;
      const volumetricWhPerLiter =
        volumeLiters > 0 ? Number((capacityWh / volumeLiters).toFixed(1)) : 0;

      let portabilityTier: BatteryEnergyDensityPoint['portabilityTier'] =
        'Rack / Stationary';
      if (weightLbs <= 65) {
        portabilityTier = 'Compact Portable';
      } else if (weightLbs <= 115) {
        portabilityTier = 'Field / Van Ready';
      }

      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        shortLabel: buildShortBatteryLabel(p),
        brand: p.brand,
        category: p.category as 'batteries' | 'portable',
        voltageClass: p.voltageClass,
        capacityWh,
        weightLbs,
        weightKg,
        volumeLiters,
        volumeCuFt,
        gravimetricWhPerKg,
        gravimetricWhPerLb,
        volumetricWhPerLiter,
        portabilityTier,
      };
    });
}

export interface RoiYearPoint {
  year: number;
  label: string;
  annualSavings: number;
  cumulativeSavings: number;
  netPosition: number;
  roiPct: number;
  costRecoveredPct: number;
}

export function buildRoiProjectionSeries(params: {
  systemCost: number;
  yearOneAnnualSavings: number;
  annualUtilityEscalationPct?: number;
}): RoiYearPoint[] {
  const cost = Math.max(0, params.systemCost);
  const baseAnnual = Math.max(0, params.yearOneAnnualSavings);
  const esc = Math.max(0, params.annualUtilityEscalationPct ?? 0) / 100;

  const series: RoiYearPoint[] = [
    {
      year: 0,
      label: 'Yr 0',
      annualSavings: 0,
      cumulativeSavings: 0,
      netPosition: Math.round(-cost),
      roiPct: cost > 0 ? -100 : 0,
      costRecoveredPct: 0,
    },
  ];

  let cumulative = 0;
  for (let yr = 1; yr <= 10; yr += 1) {
    const yrSavings = baseAnnual * Math.pow(1 + esc, yr - 1);
    cumulative += yrSavings;
    const netPosition = cumulative - cost;
    const roiPct =
      cost > 0 ? Math.round(((cumulative - cost) / cost) * 100) : 0;
    const costRecoveredPct =
      cost > 0 ? Math.round((cumulative / cost) * 100) : 0;

    series.push({
      year: yr,
      label: `Yr ${yr}`,
      annualSavings: Math.round(yrSavings),
      cumulativeSavings: Math.round(cumulative),
      netPosition: Math.round(netPosition),
      roiPct,
      costRecoveredPct,
    });
  }

  return series;
}

// Function 8: NEC 125% Balance-of-System (BOS) Wire Gauge, Voltage-Drop, Breaker & Cost Estimator
export interface BosRequirement {
  busVoltage: number;
  runLengthFeet: number;
  maxContinuousDcAmps: number;
  necSizedBreakerAmps: number;
  recommendedWireAwg: string;
  estimatedVoltageDropPct: number;
  pvStringFuseAmps: number;
  transferSwitchSpec: string;
  estimatedBosCost: number;
  bosPartsChecklist: string[];
}

export function calculateBosRequirements(
  items: SystemBuildItem[],
  catalog: SolarProduct[],
  runLengthFeet = 6
): BosRequirement | null {
  if (items.length === 0) return null;

  let busVoltage = 48;
  let totalInverterWatts = 0;
  let panelCount = 0;

  for (const item of items) {
    const p = catalog.find((prod) => prod.id === item.productId);
    if (!p) continue;
    if (p.voltageClass === '12V/24V') busVoltage = 24;
    if (p.specs.nominalVoltage.includes('12.8V')) busVoltage = 12;
    if (
      p.specs.nominalVoltage.includes('48V') ||
      p.specs.nominalVoltage.includes('51.2V')
    ) {
      busVoltage = 48;
    }
    if (p.category === 'inverters' || p.category === 'portable') {
      totalInverterWatts += (p.specs.powerWatts ?? 0) * item.quantity;
    }
    if (p.category === 'panels') {
      panelCount += item.quantity;
    }
  }

  const runFt = Math.max(3, Math.min(25, runLengthFeet));
  const effectiveWatts = Math.max(1500, totalInverterWatts);
  const maxContinuousDcAmps = Math.ceil(effectiveWatts / (busVoltage * 0.92));
  const necRaw = Math.ceil(maxContinuousDcAmps * 1.25);

  const standardBreakers = [60, 80, 100, 125, 150, 175, 200, 250, 300, 400];
  const necSizedBreakerAmps =
    standardBreakers.find((b) => b >= necRaw) ?? Math.ceil(necRaw / 50) * 50;

  // Pick copper cable gauge considering both NEC ampacity and long run length voltage drop
  const table: {
    label: string;
    ohmPer1000Ft: number;
    maxAmps: number;
  }[] = [
    { label: '6 AWG Pure Copper (105°C)', ohmPer1000Ft: 0.395, maxAmps: 75 },
    { label: '4 AWG Pure Copper (105°C)', ohmPer1000Ft: 0.249, maxAmps: 105 },
    { label: '2 AWG Pure Copper (105°C)', ohmPer1000Ft: 0.156, maxAmps: 140 },
    { label: '1/0 AWG Pure Copper (105°C)', ohmPer1000Ft: 0.098, maxAmps: 195 },
    { label: '2/0 AWG Pure Copper (105°C)', ohmPer1000Ft: 0.078, maxAmps: 245 },
    { label: '4/0 AWG Welding Copper (105°C)', ohmPer1000Ft: 0.049, maxAmps: 330 },
    { label: 'Parallel 2/0 AWG Copper Set', ohmPer1000Ft: 0.039, maxAmps: 490 },
  ];

  let picked = table[table.length - 1];
  for (const row of table) {
    if (row.maxAmps < necSizedBreakerAmps) continue;
    const dropV = (2 * runFt * maxContinuousDcAmps * row.ohmPer1000Ft) / 1000;
    const dropPct = (dropV / busVoltage) * 100;
    picked = row;
    if (dropPct <= 2.0) break;
  }

  const exactDropV =
    (2 * runFt * maxContinuousDcAmps * picked.ohmPer1000Ft) / 1000;
  const estimatedVoltageDropPct = Number(
    ((exactDropV / busVoltage) * 100).toFixed(2)
  );

  const pvStringFuseAmps = panelCount > 4 ? 20 : 15;
  const transferSwitchSpec =
    effectiveWatts >= 5000
      ? '50A NEMA SS2-50P Inlet + Interlock or 10-Circuit Transfer Switch'
      : '30A NEMA L14-30P Inlet + 6-Circuit Manual Transfer Switch';

  const cableCost = Math.round(runFt * 2 * (picked.maxAmps >= 200 ? 6.5 : 4.2));
  const breakerCost = necSizedBreakerAmps >= 200 ? 115 : 75;
  const transferCost = effectiveWatts >= 5000 ? 290 : 165;
  const pvBosCost = panelCount > 0 ? 55 + panelCount * 6 : 0;
  const estimatedBosCost = cableCost + breakerCost + transferCost + pvBosCost;

  const bosPartsChecklist = [
    `${runFt * 2}ft Total ${picked.label} + Hydraulic Lugs (~$${cableCost})`,
    `${necSizedBreakerAmps}A Class-T Fuse / DC MCCB Disconnect (~$${breakerCost})`,
    `${transferSwitchSpec} (~$${transferCost})`,
    ...(panelCount > 0
      ? [
          `${pvStringFuseAmps}A MC4 Inline Fuses & 10AWG PV Wire (~$${pvBosCost})`,
        ]
      : []),
  ];

  return {
    busVoltage,
    runLengthFeet: runFt,
    maxContinuousDcAmps,
    necSizedBreakerAmps,
    recommendedWireAwg: picked.label,
    estimatedVoltageDropPct,
    pvStringFuseAmps,
    transferSwitchSpec,
    estimatedBosCost,
    bosPartsChecklist,
  };
}

// Function 9: Verified Authorized-Warranty & UL Permit Risk Screener
export interface WarrantyPermitReport {
  ulReady: boolean;
  certSummary: string;
  warrantyStatus: 'Full OEM Warranty Preserved' | 'Marketplace 3P Risk — Verify Serial';
  permitNote: string;
}

export function evaluateWarrantyAndPermit(
  product: SolarProduct,
  offer?: MerchantOffer
): WarrantyPermitReport {
  const certs = product.specs.certifications;
  const ulReady = certs.some((c) => c.startsWith('UL'));
  const has9540 = certs.some((c) => c.includes('9540'));
  const has1741 = certs.some((c) => c.includes('1741'));

  const targetOffer = offer ?? getBestOffer(product);
  const warrantyStatus = targetOffer.isAuthorizedDealer
    ? 'Full OEM Warranty Preserved'
    : 'Marketplace 3P Risk — Verify Serial';

  let permitNote = 'Off-grid / portable deployment ready.';
  if (has9540) {
    permitNote =
      'UL 9540 ESS ready for residential utility interconnection & AHJ inspection.';
  } else if (has1741) {
    permitNote =
      'UL 1741 SA / IEEE 1547 compliant for net-metering & grid-tie permits.';
  } else if (ulReady) {
    permitNote = 'UL-listed module/battery safety certification verified.';
  }

  return {
    ulReady,
    certSummary: certs.join(' · '),
    warrantyStatus,
    permitNote,
  };
}

export interface BomPermitSummary {
  totalLines: number;
  ulListedLines: number;
  ess9540Ready: boolean;
  authorizedLines: number;
  riskMerchants: string[];
}

export function evaluateBomPermitReadiness(
  items: SystemBuildItem[],
  catalog: SolarProduct[]
): BomPermitSummary | null {
  if (items.length === 0) return null;
  let ulListedLines = 0;
  let authorizedLines = 0;
  let has9540 = false;
  const riskMerchants: string[] = [];

  for (const item of items) {
    const product = catalog.find((p) => p.id === item.productId);
    if (!product) continue;
    const offer =
      product.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
      getBestOffer(product);
    if (product.specs.certifications.some((c) => c.startsWith('UL'))) {
      ulListedLines += 1;
    }
    if (product.specs.certifications.some((c) => c.includes('9540'))) {
      has9540 = true;
    }
    if (offer.isAuthorizedDealer) {
      authorizedLines += 1;
    } else {
      riskMerchants.push(`${product.brand} via ${offer.merchantName}`);
    }
  }

  return {
    totalLines: items.length,
    ulListedLines,
    ess9540Ready: has9540 && ulListedLines === items.length,
    authorizedLines,
    riskMerchants,
  };
}

// Function 10: Extract Clean Copyable Promo Code & Bundle Active BOM Codes
export function extractPromoCode(offer: MerchantOffer): string | null {
  if (!offer.promoLabel) return null;
  const match = offer.promoLabel.match(/\b([A-Z0-9]{5,14})\b/);
  if (match) return match[1];
  if (offer.couponDiscount && offer.couponDiscount > 0) {
    return `${offer.channel.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)}${offer.couponDiscount}`;
  }
  return null;
}

export interface BomPromoItem {
  merchantName: string;
  productName: string;
  code: string;
  savingsTotal: number;
}

export function collectBomPromoCodes(
  items: SystemBuildItem[],
  catalog: SolarProduct[]
): { entries: BomPromoItem[]; totalCouponSavings: number } {
  const entries: BomPromoItem[] = [];
  let totalCouponSavings = 0;

  for (const item of items) {
    const product = catalog.find((p) => p.id === item.productId);
    if (!product) continue;
    const offer =
      product.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
      getBestOffer(product);
    const code = extractPromoCode(offer);
    const discount = (offer.couponDiscount ?? 0) * item.quantity;
    if (code) {
      entries.push({
        merchantName: offer.merchantName,
        productName: product.name,
        code,
        savingsTotal: discount,
      });
    }
    totalCouponSavings += discount;
  }

  return { entries, totalCouponSavings };
}

export type ThermalZoneLabel =
  | 'Charge Lockout (<0°C)'
  | 'Self-Heating Active'
  | 'Cold Voc Alert'
  | 'Cold Derate'
  | 'Optimal Window'
  | 'Heat Derate'
  | 'Thermal Throttle';

export interface ThermalCurvePoint {
  ambientC: number;
  ambientF: number;
  cellOrPackTempC: number;
  outputRetentionPct: number;
  secondaryPct: number;
  predictedValue: number;
  secondaryValue: number;
  zone: ThermalZoneLabel;
}

export interface ThermalPerformanceProfile {
  mode: 'panel' | 'battery' | 'electronics';
  hasSelfHeating: boolean;
  hasLowTempCutoff: boolean;
  tempCoeffPctPerC: number | null;
  vocCoeffPctPerC: number | null;
  mountingOffsetC: number;
  optimalRangeLabel: string;
  extremeColdSummary: string;
  extremeHeatSummary: string;
  points: ThermalCurvePoint[];
}

export function detectBatterySelfHeating(product: SolarProduct): boolean {
  const haystack = [
    product.name,
    product.summarySpec,
    product.benchmark.internalBuildNote,
    product.benchmark.thermalResult,
  ]
    .join(' ')
    .toLowerCase();
  return (
    haystack.includes('self-heating') ||
    haystack.includes('heated') ||
    haystack.includes('heater') ||
    haystack.includes('heating pad') ||
    haystack.includes('heating film')
  );
}

export function extractPanelTempCoeff(product: SolarProduct): number {
  const match = product.benchmark.thermalResult.match(/(-0\.\d+)\s*%\s*\/\s*°?C/i);
  if (match) {
    const parsed = parseFloat(match[1]);
    if (Number.isFinite(parsed) && parsed < 0 && parsed > -1) {
      return parsed;
    }
  }
  const chem = product.specs.chemistryOrCell.toLowerCase();
  if (chem.includes('heterojunction') || chem.includes('hjt')) return -0.24;
  if (chem.includes('topcon') || chem.includes('n-type')) return -0.29;
  return -0.34;
}

const AMBIENT_GRID_C = [
  -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
];

function computeSingleThermalPoint(
  product: SolarProduct,
  ambientC: number,
  options: {
    mode: 'panel' | 'battery' | 'electronics';
    hasSelfHeating: boolean;
    hasLowTempCutoff: boolean;
    tempCoeffPctPerC: number;
    vocCoeffPctPerC: number;
    mountingOffsetC: number;
  }
): ThermalCurvePoint {
  const ambientF = Math.round((ambientC * 9) / 5 + 32);

  if (options.mode === 'electronics') {
    const ratedWatts = product.specs.powerWatts ?? 5000;
    const isPottedOrIp65 = product.specs.certifications.some((c) =>
      /IP43|IP65|NEMA 4X/i.test(c)
    );
    const heatsinkTempC = Number((ambientC + (isPottedOrIp65 ? 14 : 17)).toFixed(1));
    const derateThreshold = isPottedOrIp65 ? 40 : 35;
    const slopePerC = isPottedOrIp65 ? 2.0 : 2.4;

    const continuousPct =
      ambientC <= derateThreshold
        ? 100
        : Math.max(58, 100 - (ambientC - derateThreshold) * slopePerC);
    const surgePct =
      ambientC <= 30
        ? 100
        : Math.max(48, 100 - (ambientC - 30) * (isPottedOrIp65 ? 1.8 : 2.1));

    const outputRetentionPct = Number(continuousPct.toFixed(1));
    const secondaryPct = Number(surgePct.toFixed(1));
    const predictedValue = Math.round((ratedWatts * outputRetentionPct) / 100);
    const secondaryValue = Math.round((ratedWatts * secondaryPct) / 100);

    let zone: ThermalZoneLabel = 'Optimal Window';
    if (ambientC < 0) {
      zone = 'Cold Derate';
    } else if (ambientC >= 45) {
      zone = 'Thermal Throttle';
    } else if (ambientC > derateThreshold) {
      zone = 'Heat Derate';
    }

    return {
      ambientC,
      ambientF,
      cellOrPackTempC: heatsinkTempC,
      outputRetentionPct,
      secondaryPct,
      predictedValue,
      secondaryValue,
      zone,
    };
  }

  if (options.mode === 'panel') {
    const ratedWatts = product.specs.powerWatts ?? 400;
    const ratedVoc = product.specs.maxPvInputVoc ?? 39;
    const cellTempC = Number((ambientC + options.mountingOffsetC).toFixed(1));
    const deltaCell = cellTempC - 25;
    const pmaxFactor = Math.max(
      0.65,
      Math.min(1.18, 1 + (options.tempCoeffPctPerC / 100) * deltaCell)
    );
    // Open-circuit voltage rises in sub-zero ambient conditions (morning startup cold Voc)
    const coldVocDelta = ambientC - 25;
    const vocFactor = Math.max(
      0.85,
      Math.min(1.22, 1 + (options.vocCoeffPctPerC / 100) * coldVocDelta)
    );

    const outputRetentionPct = Number((pmaxFactor * 100).toFixed(1));
    const secondaryPct = Number((vocFactor * 100).toFixed(1));
    const predictedValue = Math.round(ratedWatts * pmaxFactor);
    const secondaryValue = Number((ratedVoc * vocFactor).toFixed(1));

    let zone: ThermalZoneLabel = 'Optimal Window';
    if (ambientC <= 0) {
      zone = 'Cold Voc Alert';
    } else if (cellTempC >= 65) {
      zone = 'Thermal Throttle';
    } else if (outputRetentionPct < 94) {
      zone = 'Heat Derate';
    }

    return {
      ambientC,
      ambientF,
      cellOrPackTempC: cellTempC,
      outputRetentionPct,
      secondaryPct,
      predictedValue,
      secondaryValue,
      zone,
    };
  }

  // LiFePO4 Battery / Portable Station curve
  const ratedWh = product.specs.capacityWh ?? 5120;
  const ratedContWatts = product.specs.powerWatts ?? ratedWh;
  const packTempC = Number(
    (ambientC + (options.hasSelfHeating && ambientC < 5 ? 8 : 3)).toFixed(1)
  );

  // Discharge usable capacity retention (%)
  let dischargePct = 100;
  if (ambientC < 15) {
    // LiFePO4 internal impedance increases below 15°C; self-heating holds pack warmer
    const effectiveColdGap = options.hasSelfHeating
      ? Math.max(0, 10 - ambientC) * 0.72
      : Math.max(0, 15 - ambientC);
    dischargePct = Math.max(
      options.hasSelfHeating ? 76 : 58,
      100 - Math.pow(effectiveColdGap / 35, 1.15) * 42
    );
  } else if (ambientC > 35) {
    // High-temp thermal management caps sustained output above 40°C
    const heatExcess = ambientC - 35;
    dischargePct = Math.max(70, 100 - Math.pow(heatExcess / 20, 1.35) * 28);
  }

  // Safe Charge Acceptance / Continuous Rate (%)
  let chargePct = 100;
  if (ambientC < 0) {
    if (options.hasSelfHeating) {
      // Uses internal heating pads (~15% energy/time overhead below freezing)
      chargePct = Math.max(68, 90 - Math.abs(ambientC) * 0.9);
    } else if (options.hasLowTempCutoff) {
      // BMS strictly locks out charging below 0°C to protect LiFePO4 anode
      chargePct = 0;
    } else {
      chargePct = 20;
    }
  } else if (ambientC < 10) {
    chargePct = options.hasSelfHeating
      ? 92 + ambientC * 0.8
      : 45 + ambientC * 5.0;
  } else if (ambientC > 40) {
    chargePct = Math.max(45, 100 - (ambientC - 40) * 3.4);
  }

  const outputRetentionPct = Number(dischargePct.toFixed(1));
  const secondaryPct = Number(Math.min(100, Math.max(0, chargePct)).toFixed(1));
  const predictedValue = Math.round((ratedWh * outputRetentionPct) / 100);
  const secondaryValue = Math.round((ratedContWatts * secondaryPct) / 100);

  let zone: ThermalZoneLabel = 'Optimal Window';
  if (ambientC < 0) {
    zone = options.hasSelfHeating
      ? 'Self-Heating Active'
      : 'Charge Lockout (<0°C)';
  } else if (ambientC < 10) {
    zone = 'Cold Derate';
  } else if (ambientC >= 45) {
    zone = 'Thermal Throttle';
  } else if (ambientC > 35) {
    zone = 'Heat Derate';
  }

  return {
    ambientC,
    ambientF,
    cellOrPackTempC: packTempC,
    outputRetentionPct,
    secondaryPct,
    predictedValue,
    secondaryValue,
    zone,
  };
}

export function buildThermalPerformanceProfile(
  product: SolarProduct,
  options?: { roofMounted?: boolean }
): ThermalPerformanceProfile | null {
  const mode: ThermalPerformanceProfile['mode'] =
    product.category === 'panels'
      ? 'panel'
      : product.category === 'batteries' || product.category === 'portable'
      ? 'battery'
      : 'electronics';

  const hasSelfHeating = mode === 'battery' ? detectBatterySelfHeating(product) : false;
  const hasLowTempCutoff = Boolean(product.specs.lowTempCutoff);
  const tempCoeffPctPerC = mode === 'panel' ? extractPanelTempCoeff(product) : -0.3;
  const vocCoeffPctPerC = mode === 'panel' ? -0.27 : 0;
  const mountingOffsetC =
    mode === 'panel' ? (options?.roofMounted === false ? 18 : 26) : mode === 'electronics' ? 15 : 3;

  const points = AMBIENT_GRID_C.map((ambientC) =>
    computeSingleThermalPoint(product, ambientC, {
      mode,
      hasSelfHeating,
      hasLowTempCutoff,
      tempCoeffPctPerC,
      vocCoeffPctPerC,
      mountingOffsetC,
    })
  );

  if (mode === 'panel') {
    const freezePt = points.find((p) => p.ambientC === -15) ?? points[0];
    const heatPt = points.find((p) => p.ambientC === 45) ?? points[points.length - 1];
    return {
      mode: 'panel',
      hasSelfHeating: false,
      hasLowTempCutoff: false,
      tempCoeffPctPerC,
      vocCoeffPctPerC,
      mountingOffsetC,
      optimalRangeLabel: '0°C to 25°C ambient (highest PV harvest)',
      extremeColdSummary: `At -15°C (5°F), output reaches ${freezePt.predictedValue}W (${freezePt.outputRetentionPct}% STC) while cold Voc spikes to ${freezePt.secondaryValue}V (+${(freezePt.secondaryPct - 100).toFixed(1)}%).`,
      extremeHeatSummary: `At 45°C (113°F) ambient (${heatPt.cellOrPackTempC}°C cell), thermal derating drops peak output to ${heatPt.predictedValue}W (${heatPt.outputRetentionPct}% STC).`,
      points,
    };
  }

  if (mode === 'electronics') {
    const coldPt = points.find((p) => p.ambientC === -10) ?? points[0];
    const heatPt = points.find((p) => p.ambientC === 45) ?? points[points.length - 1];
    const isOutdoorSealed = product.specs.certifications.some((c) =>
      /IP43|IP65|NEMA 4X|NEMA 3R/i.test(c)
    );
    return {
      mode: 'electronics',
      hasSelfHeating: false,
      hasLowTempCutoff: false,
      tempCoeffPctPerC: null,
      vocCoeffPctPerC: null,
      mountingOffsetC,
      optimalRangeLabel: '0°C to 40°C (32°F to 104°F) · Full rated amps',
      extremeColdSummary: isOutdoorSealed
        ? `Solid-state power stages hold 100% capacity (${coldPt.predictedValue.toLocaleString()}W) in freezing ambient, though dawn condensation requires sealed conduit glands.`
        : `Open-frame electronics sustain ${coldPt.predictedValue.toLocaleString()}W in sub-zero air, but rapid morning warm-up creates dew-point condensation risk on unsealed boards.`,
      extremeHeatSummary: `Above 35–40°C ambient, MOSFET/IGBT thermal protection derates continuous output to ${heatPt.predictedValue.toLocaleString()}W (${heatPt.outputRetentionPct}%) at 45°C unless active airflow is provided.`,
      points,
    };
  }

  const coldPt = points.find((p) => p.ambientC === -10) ?? points[0];
  const heatPt = points.find((p) => p.ambientC === 45) ?? points[points.length - 1];

  return {
    mode: 'battery',
    hasSelfHeating,
    hasLowTempCutoff,
    tempCoeffPctPerC: null,
    vocCoeffPctPerC: null,
    mountingOffsetC,
    optimalRangeLabel: '15°C to 35°C (59°F to 95°F) · Zero derate',
    extremeColdSummary: hasSelfHeating
      ? `Integrated heating pads keep cells above freezing down to -15°C; expect ${coldPt.outputRetentionPct}% discharge (${coldPt.predictedValue.toLocaleString()} Wh) and ${coldPt.secondaryPct}% net charge rate at -10°C.`
      : `0°C (32°F) BMS low-temp charge lock prevents lithium plating: solar/AC charging halts (0%) below freezing while discharge holds ${coldPt.outputRetentionPct}% (${coldPt.predictedValue.toLocaleString()} Wh) at -10°C.`,
    extremeHeatSummary: `Above 40°C (104°F), BMS throttles charge/discharge current (${heatPt.secondaryPct}% at 45°C) and caps usable capacity to ${heatPt.outputRetentionPct}% to protect cell longevity.`,
    points,
  };
}

export function evaluateThermalAtAmbient(
  product: SolarProduct,
  ambientC: number,
  options?: { roofMounted?: boolean }
): ThermalCurvePoint | null {
  const mode: ThermalPerformanceProfile['mode'] =
    product.category === 'panels'
      ? 'panel'
      : product.category === 'batteries' || product.category === 'portable'
      ? 'battery'
      : 'electronics';
  const clampedC = Math.max(-20, Math.min(55, ambientC));
  return computeSingleThermalPoint(product, clampedC, {
    mode,
    hasSelfHeating: mode === 'battery' ? detectBatterySelfHeating(product) : false,
    hasLowTempCutoff: Boolean(product.specs.lowTempCutoff),
    tempCoeffPctPerC: mode === 'panel' ? extractPanelTempCoeff(product) : -0.3,
    vocCoeffPctPerC: mode === 'panel' ? -0.27 : 0,
    mountingOffsetC:
      mode === 'panel' ? (options?.roofMounted === false ? 18 : 26) : mode === 'electronics' ? 15 : 3,
  });
}

export interface IpHumidityAssessment {
  ratingBadge: string;
  enclosureClass: 'sealed' | 'potted-hybrid' | 'open-frame';
  humidityRiskLabel: string;
  unitImplication: string;
  openControllerGuidance: string;
  sealedBatteryGuidance: string;
}

export function evaluateIpHumidityAwareness(
  product: SolarProduct
): IpHumidityAssessment {
  const certsJoined = product.specs.certifications.join(' ');
  const buildJoined = `${product.benchmark.internalBuildNote} ${product.benchmark.thermalResult}`;

  const ipMatch = certsJoined.match(/IP\d{2}/i);
  const nemaMatch = certsJoined.match(/NEMA\s*[0-9A-Z]+/i);

  let ratingBadge = 'IP20 / NEMA 1 (Indoor Vented)';
  let enclosureClass: IpHumidityAssessment['enclosureClass'] = 'open-frame';

  if (ipMatch) {
    const code = ipMatch[0].toUpperCase();
    if (code === 'IP67' || code === 'IP68') {
      ratingBadge = `${code} (Submersion & Vapor Sealed)`;
      enclosureClass = 'sealed';
    } else if (code === 'IP65') {
      ratingBadge =
        product.category === 'portable'
          ? 'IP65 Pack / Vented Inverter Ports'
          : 'IP65 (Dust-Tight & Water-Jet Sealed)';
      enclosureClass = product.category === 'portable' ? 'potted-hybrid' : 'sealed';
    } else if (code === 'IP43') {
      ratingBadge = 'IP43 Electronics / IP22 Exposed Lugs';
      enclosureClass = 'potted-hybrid';
    } else {
      ratingBadge = `${code} (Protected Indoor Chassis)`;
    }
  } else if (nemaMatch) {
    const nema = nemaMatch[0].toUpperCase();
    if (nema.includes('4X')) {
      ratingBadge = `${nema} / IP65 Sealed Outdoor`;
      enclosureClass = 'sealed';
    } else if (nema.includes('3R')) {
      ratingBadge = `${nema} (Rain-Shielded Vented)`;
      enclosureClass = 'potted-hybrid';
    }
  } else if (product.category === 'panels') {
    ratingBadge = 'IP68 Junction Box / Outdoor Module';
    enclosureClass = 'sealed';
  }

  let humidityRiskLabel = 'Elevated — Keep >80% RH Moisture Out';
  if (enclosureClass === 'sealed') {
    humidityRiskLabel = 'Low Internal Risk (Sealed Enclosure)';
  } else if (enclosureClass === 'potted-hybrid') {
    humidityRiskLabel = 'Moderate — Protect Exposed Terminals';
  }

  let unitImplication = '';
  if (product.category === 'controllers') {
    unitImplication =
      enclosureClass === 'potted-hybrid' || /potted/i.test(buildJoined)
        ? 'Epoxy-potted PCB electronics resist condensation on internal MOSFETs, but the bottom screw terminals remain IP22 open-frame—apply dielectric grease and install drip loops in >75% RH sheds or marine lockers.'
        : 'Open-frame / fan-vented MPPT chassis draws ambient air directly across heatsinks and gate drivers. In high-humidity or coastal air, non-condensing (<85% RH) indoor placement or conformal-coated cabinets prevent PCB corrosion and fault trips.';
  } else if (product.category === 'batteries' || product.category === 'portable') {
    unitImplication =
      enclosureClass === 'sealed'
        ? 'Gasketed IP65/IP67 battery enclosure seals prismatic cells and BMS against humid air, rain, and salt spray; still grease exterior M8/Amphenol power studs and leave convective airflow clearance because sealed packs cannot dump heat internally.'
        : 'Vented indoor server-rack / portable enclosure (IP20) relies on dry ambient air for fan cooling. Keep in conditioned utility rooms (<75% RH) to avoid BMS balance-lead corrosion and cold-morning condensation on steel busbars.';
  } else if (product.category === 'panels') {
    unitImplication =
      'Dual-glass / tempered laminate and IP68 potted junction boxes block continuous humidity and salt mist; verify MC4 connectors lock flush with dielectric O-rings so capillary moisture cannot wick into DC home-run wiring.';
  } else {
    unitImplication =
      enclosureClass === 'sealed'
        ? 'Sealed NEMA 4X / IP65 heatsink isolates control boards from humid outdoor air while transferring IGBT heat externally—keep rear aluminum fins unobstructed.'
        : 'Ventilated indoor inverter chassis pulls room air through high-voltage power stages; mount away from damp basements, coastal salt air, or uninsulated garages prone to dew-point condensation.';
  }

  return {
    ratingBadge,
    enclosureClass,
    humidityRiskLabel,
    unitImplication,
    openControllerGuidance:
      'Open-frame or fan-vented MPPT controllers (IP20–IP43) expose PCB traces, copper lugs, and cooling paths to ambient air—in >75% RH coastal/tropical or unheated sheds, dawn dew-point swings cause tracking corrosion and ground-faults unless potted or housed in a dry cabinet.',
    sealedBatteryGuidance:
      'Sealed LiFePO4 packs (IP65 / IP67) isolate cells and BMS electronics from moisture, vapor, and salt spray via perimeter gaskets and pressure vents—trading internal airflow for humidity immunity, which requires exterior stud anti-corrosion grease and external heat clearance.',
  };
}

export interface SystemGridParityInput {
  systemBuildCost: number;
  totalStorageWh: number;
  totalSolarWatts: number;
  totalInverterWatts: number;
  utilityRatePerKwh: number;
  peakSunHoursPerDay?: number;
  annualUtilityEscalationPct?: number;
  annualPvDegradationPct?: number;
  selfConsumptionPct?: number;
  analysisHorizonYears?: number;
}

export interface SystemGridParityYearPoint {
  year: number;
  label: string;
  utilityRateAtYear: number;
  annualKwh: number;
  annualSavings: number;
  cumulativeSavings: number;
  remainingBalance: number;
  netPosition: number;
  costRecoveredPct: number;
  roiPct: number;
  lcoeVsGridSpread: number;
}

export interface SystemGridParityResult {
  evaluatedCost: number;
  estimatedDailyKwh: number;
  yearOneAnnualKwh: number;
  yearOneAnnualSavings: number;
  monthlyAverageSavings: number;
  horizonYears: number;
  horizonTotalKwh: number;
  systemLcoePerKwh: number;
  gridParityAchievedImmediate: boolean;
  gridParitySpreadPerKwh: number;
  gridParityYear: number | null;
  gridParityStatusLabel: string;
  costRecoveryYears: number | null;
  costRecoveryMonths: number | null;
  costRecoveryYearsFlat: number | null;
  estimatedRecoveryDateLabel: string;
  tenYearCumulativeSavings: number;
  tenYearNetProfit: number;
  tenYearRoiPct: number;
  horizonCumulativeSavings: number;
  horizonNetProfit: number;
  horizonRoiPct: number;
  schedule: SystemGridParityYearPoint[];
}

export function computeSystemGridParityAndRecovery(
  input: SystemGridParityInput
): SystemGridParityResult {
  const cost = Math.max(0, Number(input.systemBuildCost) || 0);
  const rate = Math.max(0.05, Math.min(2.0, Number(input.utilityRatePerKwh) || 0.24));
  const psh = Math.max(2.0, Math.min(8.0, Number(input.peakSunHoursPerDay) || 4.6));
  const esc = Math.max(0, Math.min(12, Number(input.annualUtilityEscalationPct) ?? 3.0)) / 100;
  const deg = Math.max(0, Math.min(3, Number(input.annualPvDegradationPct) ?? 0.5)) / 100;
  const selfUse = Math.max(0.4, Math.min(1, (Number(input.selfConsumptionPct) || 95) / 100));
  const horizonYears = Math.max(10, Math.min(30, Math.round(input.analysisHorizonYears ?? 25)));

  const pvKw = Math.max(0, input.totalSolarWatts) / 1000;
  const storageKwh = Math.max(0, input.totalStorageWh) / 1000;
  const invKw = Math.max(0, input.totalInverterWatts) / 1000;

  // Estimate usable daily grid-offset energy:
  // If PV panels are present, harvest drives daily kWh (with storage allowing near-full self-consumption).
  // If storage-only TOU arbitrage (0W PV), usable LiFePO4 cycling drives daily offset.
  let baseDailyKwh = 0;
  if (pvKw > 0) {
    const pvYield = pvKw * psh * 0.85;
    const storageBoost = storageKwh > 0 ? Math.min(1, selfUse + 0.05) : Math.min(0.8, selfUse);
    baseDailyKwh = pvYield * storageBoost;
  } else if (storageKwh > 0) {
    const capLimit = invKw > 0 ? invKw * 4.5 : storageKwh;
    baseDailyKwh = Math.min(storageKwh * 0.8 * 0.92, capLimit) * selfUse;
  } else if (invKw > 0) {
    baseDailyKwh = invKw * 3.5 * 0.88 * selfUse;
  }

  const estimatedDailyKwh = Number(baseDailyKwh.toFixed(2));
  const yearOneAnnualKwh = Math.round(estimatedDailyKwh * 365);
  const yearOneAnnualSavings = Math.round(yearOneAnnualKwh * rate);
  const monthlyAverageSavings = Number((yearOneAnnualSavings / 12).toFixed(0));

  // Build up to 30-year simulation so we can measure exact payback even beyond Year 10
  const simMaxYears = Math.max(horizonYears, 30);
  const schedule: SystemGridParityYearPoint[] = [
    {
      year: 0,
      label: 'Yr 0',
      utilityRateAtYear: rate,
      annualKwh: 0,
      annualSavings: 0,
      cumulativeSavings: 0,
      remainingBalance: Math.round(cost),
      netPosition: Math.round(-cost),
      costRecoveredPct: cost > 0 ? 0 : 100,
      roiPct: cost > 0 ? -100 : 0,
      lcoeVsGridSpread: 0,
    },
  ];

  let cumulativeSavings = 0;
  let horizonTotalKwh = 0;
  let costRecoveryYears: number | null = cost === 0 ? 0 : null;

  // Track cumulative flat-rate recovery too
  let flatCumulative = 0;
  let costRecoveryYearsFlat: number | null = cost === 0 ? 0 : null;

  for (let yr = 1; yr <= simMaxYears; yr += 1) {
    const degradationFactor = Math.pow(1 - deg, yr - 1);
    const annualKwh = yearOneAnnualKwh * degradationFactor;
    const utilityRateAtYear = rate * Math.pow(1 + esc, yr - 1);
    const annualSavings = annualKwh * utilityRateAtYear;
    const prevCumulative = cumulativeSavings;
    cumulativeSavings += annualSavings;

    const prevFlat = flatCumulative;
    flatCumulative += annualKwh * rate;

    if (yr <= horizonYears) {
      horizonTotalKwh += annualKwh;
    }

    if (costRecoveryYears === null && cost > 0 && cumulativeSavings >= cost) {
      const span = Math.max(1, cumulativeSavings - prevCumulative);
      const frac = (cost - prevCumulative) / span;
      costRecoveryYears = Number((yr - 1 + frac).toFixed(2));
    }

    if (costRecoveryYearsFlat === null && cost > 0 && flatCumulative >= cost) {
      const span = Math.max(1, flatCumulative - prevFlat);
      const frac = (cost - prevFlat) / span;
      costRecoveryYearsFlat = Number((yr - 1 + frac).toFixed(2));
    }

    if (yr <= horizonYears) {
      const remainingBalance = Math.max(0, Math.round(cost - cumulativeSavings));
      const netPosition = Math.round(cumulativeSavings - cost);
      const costRecoveredPct =
        cost > 0 ? Math.min(999, Math.round((cumulativeSavings / cost) * 100)) : 100;
      const roiPct = cost > 0 ? Math.round(((cumulativeSavings - cost) / cost) * 100) : 0;

      schedule.push({
        year: yr,
        label: `Yr ${yr}`,
        utilityRateAtYear: Number(utilityRateAtYear.toFixed(3)),
        annualKwh: Math.round(annualKwh),
        annualSavings: Math.round(annualSavings),
        cumulativeSavings: Math.round(cumulativeSavings),
        remainingBalance,
        netPosition,
        costRecoveredPct,
        roiPct,
        lcoeVsGridSpread: 0,
      });
    }
  }

  const systemLcoePerKwh =
    horizonTotalKwh > 0 && cost > 0 ? Number((cost / horizonTotalKwh).toFixed(3)) : 0;

  // Populate per-year spread vs system LCOE
  for (const pt of schedule) {
    pt.lcoeVsGridSpread = Number((pt.utilityRateAtYear - systemLcoePerKwh).toFixed(3));
  }

  const gridParitySpreadPerKwh = Number((rate - systemLcoePerKwh).toFixed(3));
  const gridParityAchievedImmediate =
    systemLcoePerKwh > 0 ? systemLcoePerKwh <= rate : cost === 0;

  let gridParityYear: number | null = gridParityAchievedImmediate ? 0 : null;
  if (!gridParityAchievedImmediate && systemLcoePerKwh > 0 && esc > 0) {
    // rate * (1 + esc)^y = systemLcoePerKwh  =>  y = ln(LCOE / rate) / ln(1 + esc)
    const rawYear = Math.log(systemLcoePerKwh / rate) / Math.log(1 + esc);
    if (Number.isFinite(rawYear) && rawYear > 0 && rawYear <= 30) {
      gridParityYear = Number(rawYear.toFixed(1));
    }
  }

  let gridParityStatusLabel = 'Below Grid Cost on Day 1';
  if (yearOneAnnualKwh === 0) {
    gridParityStatusLabel = 'Add PV Panels or Storage to Model Output';
  } else if (gridParityAchievedImmediate) {
    gridParityStatusLabel = `Grid Parity Achieved ($${systemLcoePerKwh.toFixed(3)} vs $${rate.toFixed(3)}/kWh)`;
  } else if (gridParityYear !== null) {
    gridParityStatusLabel = `Reaches Grid Parity in Year ${gridParityYear.toFixed(1)}`;
  } else {
    gridParityStatusLabel = `Above Saved Rate ($${systemLcoePerKwh.toFixed(3)} vs $${rate.toFixed(3)}/kWh)`;
  }

  const costRecoveryMonths =
    costRecoveryYears !== null ? Math.max(1, Math.round(costRecoveryYears * 12)) : null;

  let estimatedRecoveryDateLabel = '> 30 Years';
  if (costRecoveryMonths !== null) {
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + costRecoveryMonths);
    estimatedRecoveryDateLabel = targetDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  const year10Point = schedule.find((s) => s.year === 10) ?? schedule[schedule.length - 1];
  const horizonEndPoint = schedule[schedule.length - 1];

  return {
    evaluatedCost: Math.round(cost),
    estimatedDailyKwh,
    yearOneAnnualKwh,
    yearOneAnnualSavings,
    monthlyAverageSavings,
    horizonYears,
    horizonTotalKwh: Math.round(horizonTotalKwh),
    systemLcoePerKwh,
    gridParityAchievedImmediate,
    gridParitySpreadPerKwh,
    gridParityYear,
    gridParityStatusLabel,
    costRecoveryYears,
    costRecoveryMonths,
    costRecoveryYearsFlat,
    estimatedRecoveryDateLabel,
    tenYearCumulativeSavings: year10Point?.cumulativeSavings ?? 0,
    tenYearNetProfit: year10Point?.netPosition ?? 0,
    tenYearRoiPct: year10Point?.roiPct ?? 0,
    horizonCumulativeSavings: horizonEndPoint?.cumulativeSavings ?? 0,
    horizonNetProfit: horizonEndPoint?.netPosition ?? 0,
    horizonRoiPct: horizonEndPoint?.roiPct ?? 0,
    schedule,
  };
}

// Function 11: 30-Day Daily Price Series & Target Justification Metrics
export interface Product30DayPoint {
  dayIndex: number;
  date: string;
  price: number;
  isToday: boolean;
}

export interface Product30DayPriceSummary {
  points: Product30DayPoint[];
  low30d: number;
  low30dDate: string;
  high30d: number;
  high30dDate: string;
  avg30d: number;
  startPrice: number;
  currentPrice: number;
  changeDollar: number;
  changePct: number;
}

function hashProductSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getProduct30DayPriceSeries(
  product: SolarProduct,
  includeRefurb = true
): Product30DayPriceSummary {
  const currentPrice = getOfferLandedPrice(getBestOffer(product, includeRefurb));
  const history = product.priceHistory90d ?? [];
  const tail = history.slice(-3);

  const pStart = tail[0]?.price ?? Math.round(currentPrice * 1.06);
  const pMid = tail[Math.floor(tail.length / 2)]?.price ?? Math.round((pStart + currentPrice) / 2);
  const pRecent = tail[tail.length - 1]?.price ?? currentPrice;

  const seed = hashProductSeed(product.id);
  const totalDays = 30;
  const anchorEndDate = new Date();
  const points: Product30DayPoint[] = [];

  for (let i = 0; i < totalDays; i += 1) {
    const dt = new Date(anchorEndDate);
    dt.setDate(anchorEndDate.getDate() - (totalDays - 1 - i));
    const dateLabel =
      i === totalDays - 1
        ? 'Today'
        : dt.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

    let basePrice: number;
    if (i <= 14) {
      const t = i / 14;
      basePrice = pStart + (pMid - pStart) * t;
    } else if (i <= 27) {
      const t = (i - 14) / 13;
      basePrice = pMid + (pRecent - pMid) * t;
    } else {
      const t = (i - 27) / 2;
      basePrice = pRecent + (currentPrice - pRecent) * t;
    }

    let price: number;
    if (i === totalDays - 1) {
      price = currentPrice;
    } else if (i === 0) {
      price = Math.round(pStart);
    } else if (i === 14) {
      price = Math.round(pMid);
    } else {
      // Deterministic micro-fluctuation (promo code tests / freight shifts) ~ +/-1.3%
      const wave1 = Math.sin((i + (seed % 11)) * 0.72);
      const wave2 = Math.cos((i * 1.35 + (seed % 7)) * 0.48);
      const jitterPct = (wave1 * 0.0085) + (wave2 * 0.0045);
      price = Math.max(10, Math.round(basePrice * (1 + jitterPct)));
    }

    points.push({
      dayIndex: i,
      date: dateLabel,
      price,
      isToday: i === totalDays - 1,
    });
  }

  let lowPt = points[0];
  let highPt = points[0];
  let sum = 0;

  for (const pt of points) {
    sum += pt.price;
    if (pt.price < lowPt.price) lowPt = pt;
    if (pt.price > highPt.price) highPt = pt;
  }

  const avg30d = Math.round(sum / points.length);
  const startPrice = points[0].price;
  const changeDollar = currentPrice - startPrice;
  const changePct =
    startPrice > 0 ? Number(((changeDollar / startPrice) * 100).toFixed(1)) : 0;

  return {
    points,
    low30d: lowPt.price,
    low30dDate: lowPt.date,
    high30d: highPt.price,
    high30dDate: highPt.date,
    avg30d,
    startPrice,
    currentPrice,
    changeDollar,
    changePct,
  };
}
