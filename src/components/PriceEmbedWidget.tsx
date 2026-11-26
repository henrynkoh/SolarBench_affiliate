import { ExternalLink, ShieldCheck } from 'lucide-react';
import { SolarProduct } from '../types/solar';
import {
  CATEGORY_LABELS,
  get90DayDropPct,
  getFilteredOffers,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import {
  buildMerchantOfferUrl,
  trackOutboundClickClient,
} from '../data/affiliateRouting';

interface PriceEmbedWidgetProps {
  product: SolarProduct;
}

export function PriceEmbedWidget({ product }: PriceEmbedWidgetProps) {
  const offers = getFilteredOffers(product, {
    includeRefurb: true,
    authorizedOnly: false,
  }).slice(0, 3);
  const bestOffer = offers[0];
  const lowestLanded = getOfferLandedPrice(bestOffer);
  const unitVal = getUnitMetricValue(product, true);
  const dropPct = get90DayDropPct(product);
  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?product=${encodeURIComponent(product.id)}`
      : `/?product=${encodeURIComponent(product.id)}`;

  return (
    <div className="min-h-screen bg-[#F7F8FA] p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono text-amber-400 font-semibold">
              SOLARBENCH LIVE LANDED INDEX
            </div>
            <h1 className="text-sm font-bold text-white leading-snug mt-0.5">
              {product.name}
            </h1>
          </div>
          <div className="text-right font-mono tabular-nums shrink-0">
            <div className="text-lg font-bold text-emerald-400">
              ${lowestLanded.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-300">
              ${unitVal.toFixed(2)} {product.unitMetricType}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>
              {product.brand} · {CATEGORY_LABELS[product.category]}
            </span>
            {dropPct > 0 && (
              <span className="font-mono font-semibold text-emerald-700">
                -{dropPct}% vs 90d avg
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {offers.map((offer, idx) => {
              const landed = getOfferLandedPrice(offer);
              const href = buildMerchantOfferUrl(product, offer, 'solarbench-widget');
              return (
                <a
                  key={offer.merchantId}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackOutboundClickClient({
                      eventType: 'widget_click',
                      productId: product.id,
                      productName: product.name,
                      channel: offer.channel,
                      merchantId: offer.merchantId,
                      landedPrice: landed,
                      sourceSection: 'embed-widget',
                    })
                  }
                  className={`flex items-center justify-between px-3 py-2.5 text-xs hover:bg-amber-50/70 transition-colors ${
                    idx === 0 ? 'bg-emerald-50/40' : 'bg-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      {offer.merchantName}
                      {offer.isAuthorizedDealer && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {offer.condition} ·{' '}
                      {offer.shipping === 0
                        ? 'Free shipping'
                        : `+$${offer.shipping} shipping`}
                      {offer.couponDiscount ? ` · -$${offer.couponDiscount} coupon` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                    <span
                      className={`font-bold ${
                        idx === 0 ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      ${landed.toLocaleString()}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </a>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-500">
            <span>Item + Freight − Verified Coupons</span>
            <a
              href={fullUrl}
              target="_top"
              className="font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
            >
              Open Full Specs &amp; ROI
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
