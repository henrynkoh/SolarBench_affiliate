import { Fragment, useState } from 'react';
import {
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  GitCompareArrows,
  Plus,
} from 'lucide-react';
import { PlatformChannel, SolarProduct, SwarmAgentId } from '../types/solar';
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
  getPriceArbitrageMetrics,
  isSec25DEligible,
} from '../data/solarEconomics';
import {
  buildMerchantOfferUrl,
  trackOutboundClickClient,
} from '../data/affiliateRouting';
import { HardwareImage } from './HardwareImage';
import { ShareControl, buildSolarShareUrl } from './ShareControl';

interface StoreComparisonTableProps {
  products: SolarProduct[];
  includeRefurb: boolean;
  authorizedOnly: boolean;
  applyFederalCredit: boolean;
  utilityRebatePct: number;
  compareIds: string[];
  watchedProductIds: string[];
  onToggleCompare: (productId: string) => void;
  onInspectProduct: (product: SolarProduct) => void;
  onAddToBuild: (productId: string, merchantId: string) => void;
  onCopyPromoCode: (code: string, merchantName: string) => void;
  onWatchProduct: (product: SolarProduct) => void;
  onAskSwarmAgent?: (agentId: SwarmAgentId, directive: string) => void;
}

export function StoreComparisonTable({
  products,
  includeRefurb,
  authorizedOnly,
  applyFederalCredit,
  utilityRebatePct,
  compareIds,
  watchedProductIds,
  onToggleCompare,
  onInspectProduct,
  onAddToBuild,
  onCopyPromoCode,
  onWatchProduct,
  onAskSwarmAgent,
}: StoreComparisonTableProps) {
  const [expandedIds, setExpandedIds] = useState<string[]>([
    products[0]?.id ?? 'eg4-ll-s-48v-100ah',
  ]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getBestChannelOffer = (
    product: SolarProduct,
    channel: PlatformChannel
  ) => {
    const matches = getFilteredOffers(product, {
      includeRefurb,
      authorizedOnly,
      channelFilter: channel,
    });
    return matches[0] ?? null;
  };

  const handleCopy = (key: string, code: string, merchantName: string) => {
    onCopyPromoCode(code, merchantName);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 1800);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          <strong className="font-semibold text-slate-900">
            Agent #02 Vector · Cross-Store Arbitrage Matrix
          </strong>{' '}
          · Comparing{' '}
          {applyFederalCredit || utilityRebatePct > 0
            ? 'net post-incentive price'
            : 'landed price (item + shipping − coupon)'}{' '}
          across {MATRIX_CHANNELS.length} major platforms per SKU
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            Click any row&apos;s <strong className="text-slate-700">10 Stores</strong> button for 1-click coupon codes, permit certs &amp; warranty risk
          </span>
          {onAskSwarmAgent && (
            <button
              type="button"
              onClick={() =>
                onAskSwarmAgent(
                  'arbitrage-scout',
                  'Audit cross-store price spreads across all 10 merchants and flag the largest landed freight + coupon arbitrage savings.'
                )
              }
              className="font-semibold text-amber-700 hover:underline whitespace-nowrap"
            >
              Dispatch Agent #02
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1160px] text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
              <th className="py-3 px-3.5 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 min-w-[270px]">
                Solar Hardware &amp; Metric
              </th>
              <th className="py-3 px-2.5 text-right whitespace-nowrap">
                {applyFederalCredit || utilityRebatePct > 0
                  ? 'Net / Spread'
                  : 'Best & 90d'}
              </th>
              {MATRIX_CHANNELS.map((ch) => (
                <th
                  key={ch}
                  className="py-3 px-2.5 text-right whitespace-nowrap"
                >
                  {ch}
                </th>
              ))}
              <th className="py-3 px-3 text-right whitespace-nowrap">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200">
            {products.map((product) => {
              const isExpanded = expandedIds.includes(product.id);
              const isCompared = compareIds.includes(product.id);
              const bestOverall = getBestOffer(product, includeRefurb);
              const lowestGross = getOfferLandedPrice(bestOverall);
              const lowestDisplay = getEffectiveNetPrice(
                product,
                lowestGross,
                applyFederalCredit,
                utilityRebatePct
              );
              const arb = getPriceArbitrageMetrics(product, includeRefurb);
              const unitVal = getUnitMetricValue(product, includeRefurb);
              const sec25dOk = isSec25DEligible(product);
              const allOffers = getFilteredOffers(product, {
                includeRefurb,
                authorizedOnly,
              });

              return (
                <Fragment key={product.id}>
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3.5 sticky left-0 z-10 bg-white border-r border-slate-200">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onInspectProduct(product)}
                          className="w-12 h-9 rounded overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                        >
                          <HardwareImage
                            src={product.image}
                            alt={product.name}
                            title={product.name}
                          />
                        </button>
                        <div className="min-w-0">
                          <div className="text-[11px] text-slate-500 truncate">
                            {product.brand} · {CATEGORY_LABELS[product.category]}
                            {applyFederalCredit
                              ? sec25dOk
                                ? ' · 25D -30%'
                                : ' · <3kWh No 25D'
                              : ''}
                          </div>
                          <button
                            type="button"
                            onClick={() => onInspectProduct(product)}
                            className="text-left text-xs font-bold text-slate-900 hover:text-amber-700 transition-colors line-clamp-1"
                          >
                            {product.name}
                          </button>
                          <div className="font-mono text-[11px] text-amber-700 font-semibold tabular-nums mt-0.5">
                            ${unitVal.toFixed(2)} {product.unitMetricType} ·{' '}
                            <span className="text-slate-500 font-normal">
                              {product.specs.nominalVoltage}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        ${lowestDisplay.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-emerald-700 font-sans font-medium">
                        {arb.deltaFromLow90d === 0
                          ? `90d Low · $${arb.spreadDollar} sp`
                          : `+$${arb.deltaFromLow90d} vs Low · $${arb.spreadDollar} sp`}
                      </div>
                    </td>

                    {MATRIX_CHANNELS.map((ch) => {
                      const offer = getBestChannelOffer(product, ch);
                      if (!offer) {
                        return (
                          <td
                            key={ch}
                            className="py-3 px-2.5 text-right text-slate-300 font-mono"
                          >
                            —
                          </td>
                        );
                      }
                      const landedGross = getOfferLandedPrice(offer);
                      const landedDisplay = getEffectiveNetPrice(
                        product,
                        landedGross,
                        applyFederalCredit,
                        utilityRebatePct
                      );
                      const isLowestCell = landedGross === lowestGross;
                      return (
                        <td
                          key={ch}
                          className={`py-3 px-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                            isLowestCell ? 'bg-emerald-50/60' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onAddToBuild(product.id, offer.merchantId)
                            }
                            title={`Add ${offer.merchantName} ($${landedGross.toLocaleString()} gross) to System Build`}
                            className="text-right group w-full"
                          >
                            <div
                              className={`font-semibold group-hover:underline ${
                                isLowestCell
                                  ? 'text-emerald-700 font-bold'
                                  : 'text-slate-800'
                              }`}
                            >
                              ${landedDisplay.toLocaleString()}
                            </div>
                            <div className="text-[10px] font-sans text-slate-500 truncate max-w-[96px] ml-auto">
                              {isLowestCell
                                ? 'Lowest'
                                : offer.condition !== 'New'
                                ? offer.condition
                                : offer.couponDiscount
                                ? `-$${offer.couponDiscount} cpn`
                                : offer.shipping === 0
                                ? 'Free ship'
                                : `+$${offer.shipping} ship`}
                            </div>
                          </button>
                        </td>
                      );
                    })}

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleExpand(product.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                          aria-expanded={isExpanded}
                        >
                          {allOffers.length} Stores
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onWatchProduct(product)}
                          className={`p-1.5 rounded-md border transition-colors ${
                            watchedProductIds.includes(product.id)
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : 'bg-white text-slate-500 border-slate-200 hover:border-amber-400 hover:text-amber-700'
                          }`}
                          aria-label={`Set price alert for ${product.name}`}
                          title="Set Target Price Alert"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleCompare(product.id)}
                          className={`p-1.5 rounded-md border transition-colors ${
                            isCompared
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                          }`}
                          aria-label={
                            isCompared
                              ? `Remove ${product.name} from compare matrix`
                              : `Add ${product.name} to compare matrix`
                          }
                          title="Compare Specs Side-by-Side"
                        >
                          {isCompared ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <GitCompareArrows className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <ShareControl
                          compact
                          subjectLabel={product.name}
                          shareUrl={buildSolarShareUrl({ productId: product.id })}
                          shareText={`${product.name} — $${lowestGross.toLocaleString()} lowest landed ($${unitVal.toFixed(2)} ${product.unitMetricType}) at ${bestOverall.merchantName} on SolarBench`}
                        />
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Multi-Store Sub-Table for this exact SKU */}
                  {isExpanded && (
                    <tr className="bg-slate-50/90">
                      <td colSpan={MATRIX_CHANNELS.length + 3} className="p-4">
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                          <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-bold text-slate-900">
                              All {allOffers.length} Distribution Offers for{' '}
                              {product.name}
                            </div>
                            <div className="text-[11px] text-slate-600">
                              {arb.buySignal} · 90d Range: $
                              {arb.low90d.toLocaleString()}–$
                              {arb.high90d.toLocaleString()} · Certs:{' '}
                              {product.specs.certifications.join(' · ')}
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                                  <th className="py-2 px-3">
                                    Store / Platform
                                  </th>
                                  <th className="py-2 px-3">Condition</th>
                                  <th className="py-2 px-3 text-right">
                                    List Price
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    Shipping
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    Coupon &amp; Code
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    {applyFederalCredit || utilityRebatePct > 0
                                      ? 'Net After Credit'
                                      : 'Landed Total'}
                                  </th>
                                  <th className="py-2 px-3">Seller Rating</th>
                                  <th className="py-2 px-3">
                                    OEM Warranty &amp; Risk
                                  </th>
                                  <th className="py-2 px-3 text-right">
                                    Build Quote
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {allOffers.map((offer, idx) => {
                                  const landed = getOfferLandedPrice(offer);
                                  const displayPrice = getEffectiveNetPrice(
                                    product,
                                    landed,
                                    applyFederalCredit,
                                    utilityRebatePct
                                  );
                                  const isLowest = idx === 0;
                                  const promoCode = extractPromoCode(offer);
                                  const copyKey = `${product.id}-${offer.merchantId}`;
                                  return (
                                    <tr
                                      key={offer.merchantId}
                                      className={
                                        isLowest
                                          ? 'bg-emerald-50/40'
                                          : 'bg-white'
                                      }
                                    >
                                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                                        <div>{offer.merchantName}</div>
                                        {offer.promoLabel && (
                                          <div className="text-[11px] font-normal text-amber-700">
                                            {offer.promoLabel}
                                          </div>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span
                                          className={
                                            offer.condition === 'New'
                                              ? 'text-slate-700'
                                              : 'text-amber-700 font-medium'
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
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        <div className="flex items-center justify-end gap-1.5">
                                          <span className="text-emerald-700">
                                            {offer.couponDiscount
                                              ? `-$${offer.couponDiscount}`
                                              : '—'}
                                          </span>
                                          {promoCode && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleCopy(
                                                  copyKey,
                                                  promoCode,
                                                  offer.merchantName
                                                )
                                              }
                                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-semibold hover:bg-amber-100"
                                            >
                                              {copiedKey === copyKey ? (
                                                <Check className="w-2.5 h-2.5" />
                                              ) : (
                                                <Copy className="w-2.5 h-2.5" />
                                              )}
                                              {promoCode}
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                        <span
                                          className={`font-bold ${
                                            isLowest
                                              ? 'text-emerald-700'
                                              : 'text-slate-900'
                                          }`}
                                        >
                                          ${displayPrice.toLocaleString()}
                                        </span>
                                        {isLowest && (
                                          <span className="ml-1.5 font-sans text-[10px] font-semibold text-emerald-700">
                                            Lowest
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">
                                        <div>{offer.sellerRating}</div>
                                        <div className="text-[11px] text-slate-500">
                                          {offer.inStock
                                            ? offer.leadTime
                                            : 'Limited / Backordered'}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-slate-600">
                                        <div
                                          className={
                                            offer.isAuthorizedDealer
                                              ? 'text-emerald-800 font-medium'
                                              : 'text-amber-700 font-medium'
                                          }
                                        >
                                          {offer.isAuthorizedDealer
                                            ? `OEM Valid · ${offer.warrantyNote}`
                                            : `3P Risk · ${offer.warrantyNote}`}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                          {offer.returnWindow}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-right">
                                        <div className="inline-flex items-center justify-end gap-1.5">
                                          <a
                                            href={buildMerchantOfferUrl(
                                              product,
                                              offer,
                                              'solarbench-table'
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
                                                sourceSection: 'store-matrix',
                                              })
                                            }
                                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-[11px] font-semibold border border-slate-200 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                                            title={`Visit ${offer.merchantName}`}
                                          >
                                            Visit
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onAddToBuild(
                                                product.id,
                                                offer.merchantId
                                              )
                                            }
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors whitespace-nowrap"
                                          >
                                            <Plus className="w-3 h-3" />
                                            Add Offer
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
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
