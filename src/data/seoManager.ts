import { SolarProduct } from '../types/solar';
import {
  getBestOffer,
  getOfferLandedPrice,
  getUnitMetricValue,
} from './solarCatalog';

function upsertMetaTag(
  attrName: 'name' | 'property',
  attrValue: string,
  content: string
) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector<HTMLMetaElement>(
    `meta[${attrName}="${attrValue}"]`
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonicalLink(href: string) {
  if (typeof document === 'undefined') return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export function buildCanonicalPath(params: {
  activeProduct?: SolarProduct | null;
  compareIds?: string[];
}): string {
  if (params.activeProduct) {
    return `/product/${params.activeProduct.id}`;
  }
  if (params.compareIds && params.compareIds.length >= 2) {
    return `/compare/${encodeURIComponent(params.compareIds.join(','))}`;
  }
  return '/';
}

export function syncDynamicSeo(params: {
  activeProduct: SolarProduct | null;
  comparedProducts: SolarProduct[];
  utilityRate: number;
  includeRefurb: boolean;
}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  const { activeProduct, comparedProducts, utilityRate, includeRefurb } = params;
  const origin = window.location.origin;

  let title =
    'SolarBench — Solar Power Price & Spec Comparison Across 10+ Stores';
  let description =
    'Compare landed solar hardware prices (Item + Freight - Coupons), $/Wh storage density, Local AI 48V UPS compatibility, and 10-year ROI across 30+ SKUs.';
  let canonicalUrl = `${origin}/`;

  if (activeProduct) {
    const bestOffer = getBestOffer(activeProduct, includeRefurb);
    const landed = getOfferLandedPrice(bestOffer);
    const unitVal = getUnitMetricValue(activeProduct, includeRefurb);
    title = `${activeProduct.name} ($${landed.toLocaleString()} · $${unitVal.toFixed(
      2
    )} ${activeProduct.unitMetricType}) | SolarBench`;
    description = `Compare ${activeProduct.offers.length} store offers for ${activeProduct.name} (${activeProduct.sku}). Lowest landed $${landed.toLocaleString()} at ${bestOffer.merchantName} with Sec. 25D net pricing & $${utilityRate.toFixed(
      2
    )}/kWh ROI.`;
    canonicalUrl = `${origin}/product/${activeProduct.id}`;
  } else if (comparedProducts.length >= 2) {
    const names = comparedProducts.map((p) => p.name).join(' vs ');
    title = `${names} — Side-by-Side Spec & $/Wh Audit | SolarBench`;
    description = `Compare ${comparedProducts.length} solar models head-to-head on landed cost, Wh/lb energy density, UL permits, thermal limits, and 10-year ROI.`;
    canonicalUrl = `${origin}/compare/${encodeURIComponent(
      comparedProducts.map((p) => p.id).join(',')
    )}`;
  }

  document.title = title;
  upsertMetaTag('name', 'description', description);
  upsertMetaTag('property', 'og:title', title);
  upsertMetaTag('property', 'og:description', description);
  upsertMetaTag('property', 'og:url', canonicalUrl);
  upsertMetaTag('name', 'twitter:title', title);
  upsertMetaTag('name', 'twitter:description', description);
  upsertCanonicalLink(canonicalUrl);

  const schemaGraph: Record<string, unknown>[] = [];

  if (activeProduct) {
    const landedPrices = activeProduct.offers.map((o) => getOfferLandedPrice(o));
    const lowPrice = Math.min(...landedPrices);
    const highPrice = Math.max(...landedPrices);
    schemaGraph.push({
      '@type': 'Product',
      name: activeProduct.name,
      sku: activeProduct.sku,
      brand: {
        '@type': 'Brand',
        name: activeProduct.brand,
      },
      description: `${activeProduct.summarySpec} — ${activeProduct.benchmark.bmsOrMpptVerdict}`,
      url: canonicalUrl,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: lowPrice.toFixed(2),
        highPrice: highPrice.toFixed(2),
        offerCount: activeProduct.offers.length,
      },
    });
  } else if (comparedProducts.length > 0) {
    schemaGraph.push({
      '@type': 'ItemList',
      name: 'SolarBench Hardware Comparison Matrix',
      numberOfItems: comparedProducts.length,
      itemListElement: comparedProducts.map((p, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: p.name,
        url: `${origin}/product/${p.id}`,
      })),
    });
  }

  schemaGraph.push({
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does SolarBench calculate true landed cost for solar batteries and panels?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Every offer combines item price plus LTL liftgate or parcel freight minus verified promo coupons, displaying normalized $/Wh for storage and $/W for solar panels and inverters.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which solar hardware qualifies for the 30% Section 25D federal tax credit?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Standalone LiFePO4 battery banks >= 3 kWh (3,000 Wh), photovoltaic modules, and permanent residential hybrid inverters qualify under Section 25D when purchased from authorized sellers.',
        },
      },
    ],
  });

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': schemaGraph,
  });

  let script = document.getElementById(
    'solarbench-dynamic-schema'
  ) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = 'solarbench-dynamic-schema';
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = jsonLd;
}
