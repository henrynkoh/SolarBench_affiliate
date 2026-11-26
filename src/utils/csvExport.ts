import {
  CATEGORY_LABELS,
  MATRIX_CHANNELS,
  getBestOffer,
  getFilteredOffers,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import {
  extractPromoCode,
  getEffectiveNetPrice,
  getLifecycleCostMetrics,
  getPriceArbitrageMetrics,
  isSec25DEligible,
} from '../data/solarEconomics';
import { PlatformChannel, SolarProduct } from '../types/solar';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Prevent CSV spreadsheet formula injection when values begin with formula triggers
  if (/^[=+\-@\t\r]/.test(str) && typeof value === 'string') {
    str = `'${str}`;
  }
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ExportCatalogCsvOptions {
  products: SolarProduct[];
  includeRefurb: boolean;
  authorizedOnly: boolean;
  selectedChannel: PlatformChannel | 'all';
  applyFederalCredit: boolean;
  utilityRebatePct: number;
}

export function buildFilteredCatalogCsv(options: ExportCatalogCsvOptions): string {
  const {
    products,
    includeRefurb,
    authorizedOnly,
    selectedChannel,
    applyFederalCredit,
    utilityRebatePct,
  } = options;

  const hasIncentives = applyFederalCredit || utilityRebatePct > 0;
  const priceLabelSuffix = hasIncentives ? 'Net ($)' : 'Landed ($)';

  const headers = [
    'SKU',
    'Brand',
    'Product Name',
    'Category',
    'Voltage Class',
    'Nominal Voltage',
    'Capacity (Wh)',
    'Power (W)',
    'Efficiency (%)',
    'MSRP ($)',
    'Best Store',
    'Offer Condition',
    'Best Landed Gross ($)',
    'Effective Net After Credit ($)',
    'Sec 25D Eligible',
    'Best Promo Code',
    'Unit Metric',
    'Unit Cost ($)',
    '90d Low ($)',
    'Delta vs 90d Low ($)',
    'Store Spread ($)',
    'Store Spread (%)',
    '5-Yr $/Delivered kWh',
    'Fastest Delivery (Days)',
    'UL Certified',
    'Certifications',
    'Star Rating',
    'Buyer Followers',
    ...MATRIX_CHANNELS.map((ch) => `${ch} ${priceLabelSuffix}`),
  ];

  const rows = products.map((product) => {
    const filteredOffers = getFilteredOffers(product, {
      includeRefurb,
      authorizedOnly,
      channelFilter: selectedChannel,
    });
    const bestOffer =
      filteredOffers[0] ?? getBestOffer(product, includeRefurb);
    const grossLanded = getOfferLandedPrice(bestOffer);
    const effectiveNet = getEffectiveNetPrice(
      product,
      grossLanded,
      applyFederalCredit,
      utilityRebatePct
    );
    const arb = getPriceArbitrageMetrics(product, includeRefurb);
    const unitCost = getUnitMetricValue(product, includeRefurb);
    const lifecycle = getLifecycleCostMetrics(product, effectiveNet);
    const promoCode = extractPromoCode(bestOffer) ?? '';
    const ulCertified = product.specs.certifications.some((c) =>
      c.startsWith('UL')
    );

    const channelCells = MATRIX_CHANNELS.map((channel) => {
      if (selectedChannel !== 'all' && selectedChannel !== channel) {
        return '';
      }
      const match = getFilteredOffers(product, {
        includeRefurb,
        authorizedOnly,
        channelFilter: channel,
      })[0];
      if (!match) return '';
      const offerGross = getOfferLandedPrice(match);
      return getEffectiveNetPrice(
        product,
        offerGross,
        applyFederalCredit,
        utilityRebatePct
      );
    });

    return [
      product.sku,
      product.brand,
      product.name,
      CATEGORY_LABELS[product.category],
      product.voltageClass,
      product.specs.nominalVoltage,
      product.specs.capacityWh ?? '',
      product.specs.powerWatts ?? '',
      product.specs.efficiencyPct,
      product.msrp,
      bestOffer.merchantName,
      bestOffer.condition,
      grossLanded,
      effectiveNet,
      isSec25DEligible(product) ? 'Yes' : 'No',
      promoCode,
      product.unitMetricType,
      unitCost.toFixed(2),
      arb.low90d,
      arb.deltaFromLow90d,
      arb.spreadDollar,
      `${arb.spreadPct}%`,
      lifecycle.costPerDeliveredKwh.toFixed(3),
      product.fastestDeliveryDays,
      ulCertified ? 'Yes' : 'No',
      product.specs.certifications.join(' | '),
      product.starRating.toFixed(1),
      product.buyerFollowers,
      ...channelCells,
    ];
  });

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];

  // Include UTF-8 BOM for clean spreadsheet encoding
  return `\uFEFF${csvLines.join('\r\n')}`;
}

export function downloadFilteredCatalogCsv(
  options: ExportCatalogCsvOptions
): string {
  const csvContent = buildFilteredCatalogCsv(options);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `solarbench-filtered-budget-${dateStamp}.csv`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return filename;
}
