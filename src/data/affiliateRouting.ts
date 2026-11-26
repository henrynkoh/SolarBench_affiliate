import { MerchantOffer, PlatformChannel, SolarProduct } from '../types/solar';

const CHANNEL_SEARCH_BASES: Record<PlatformChannel, string> = {
  Amazon: 'https://www.amazon.com/s?k=',
  eBay: 'https://www.ebay.com/sch/i.html?_nkw=',
  'Signature Solar': 'https://signaturesolar.com/search?q=',
  'Current Connected': 'https://www.currentconnected.com/?s=',
  ShopSolar: 'https://shopsolarkits.com/search?q=',
  'Home Depot': 'https://www.homedepot.com/s/',
  Walmart: 'https://www.walmart.com/search?q=',
  'Inverter Supply': 'https://www.invertersupply.com/index.php?main_page=advanced_search_result&keyword=',
  'SanTan Solar': 'https://www.santansolar.com/?s=',
  'altE Store': 'https://www.altestore.com/store/search/?q=',
  'OEM Direct': 'https://www.google.com/search?q=',
};

export function buildMerchantOfferUrl(
  product: SolarProduct,
  offer: MerchantOffer,
  partnerRef = 'solarbench'
): string {
  const query = encodeURIComponent(`${product.brand} ${product.name}`);
  const base =
    CHANNEL_SEARCH_BASES[offer.channel] ?? 'https://www.google.com/search?q=';

  if (offer.channel === 'Home Depot') {
    return `${base}${query}?cm_mmc=${encodeURIComponent(partnerRef)}`;
  }
  if (offer.channel === 'Amazon') {
    return `${base}${query}&tag=${encodeURIComponent(partnerRef + '-20')}`;
  }
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${query}${sep}utm_source=${encodeURIComponent(partnerRef)}&utm_medium=comparison`;
}

export function trackOutboundClickClient(input: {
  eventType: 'merchant_click' | 'affiliate_bom_click' | 'share_click' | 'widget_click';
  productId: string;
  productName: string;
  channel: string;
  merchantId: string;
  landedPrice: number;
  sourceSection: string;
}): void {
  const payload = JSON.stringify(input);
  try {
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.sendBeacon === 'function'
    ) {
      const blob = new Blob([payload], { type: 'application/json' });
      const sent = navigator.sendBeacon('/api/growth/track-click', blob);
      if (sent) return;
    }
  } catch {
    // Fallback to fetch below
  }

  if (typeof fetch !== 'undefined') {
    void fetch('/api/growth/track-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }
}
