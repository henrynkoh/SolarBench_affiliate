import {
  MerchantOffer,
  PlatformCategory,
  PlatformChannel,
  SolarCategory,
} from '../types/solar';

export interface StoreTemplateInput {
  baseAnchor: number;
  category: SolarCategory;
  brand: string;
  warrantyYears: number;
  weightLbs: number;
  /** Optional explicit overrides keyed by PlatformChannel */
  overrides?: Partial<
    Record<
      PlatformChannel | 'eBay Refurb',
      {
        price?: number;
        shipping?: number;
        couponDiscount?: number;
        promoLabel?: string;
        inStock?: boolean;
        leadTime?: string;
        condition?: 'New' | 'Refurbished' | 'Open-Box';
      }
    >
  >;
}

const CHANNEL_META: Record<
  PlatformChannel,
  {
    platformCategory: PlatformCategory;
    defaultReturn: string;
    authorized: boolean;
  }
> = {
  Amazon: {
    platformCategory: 'Marketplace',
    defaultReturn: '30-Day Amazon Return',
    authorized: true,
  },
  eBay: {
    platformCategory: 'Marketplace',
    defaultReturn: '30-Day eBay Money Back',
    authorized: false,
  },
  'Signature Solar': {
    platformCategory: 'Specialty Distributor',
    defaultReturn: '30-Day Specialty Return',
    authorized: true,
  },
  'Current Connected': {
    platformCategory: 'Specialty Distributor',
    defaultReturn: '60-Day Tech Support Return',
    authorized: true,
  },
  ShopSolar: {
    platformCategory: 'Specialty Distributor',
    defaultReturn: '30-Day Distributor Return',
    authorized: true,
  },
  'Home Depot': {
    platformCategory: 'Big-Box Retail',
    defaultReturn: '90-Day In-Store / Freight Return',
    authorized: true,
  },
  Walmart: {
    platformCategory: 'Marketplace',
    defaultReturn: '30-Day Walmart Return',
    authorized: false,
  },
  'Inverter Supply': {
    platformCategory: 'Specialty Distributor',
    defaultReturn: '30-Day Restock Policy',
    authorized: true,
  },
  'SanTan Solar': {
    platformCategory: 'Specialty Distributor',
    defaultReturn: '30-Day Pallet Guarantee',
    authorized: true,
  },
  'altE Store': {
    platformCategory: 'Specialty Distributor',
    defaultReturn: '30-Day Distributor Return',
    authorized: true,
  },
  'OEM Direct': {
    platformCategory: 'Manufacturer Direct',
    defaultReturn: '30-Day Direct Guarantee',
    authorized: true,
  },
};

export function buildMultiStoreOffers(
  skuSeed: string,
  input: StoreTemplateInput
): MerchantOffer[] {
  const { baseAnchor, category, brand, warrantyYears, weightLbs, overrides } =
    input;

  const isHeavyFreight = weightLbs >= 65 || category === 'panels';
  const freightFee = category === 'panels' ? 22 : isHeavyFreight ? 55 : 0;

  // Deterministic pseudo-random offset from SKU string for realistic spread
  let hash = 0;
  for (let i = 0; i < skuSeed.length; i++) {
    hash = (hash * 31 + skuSeed.charCodeAt(i)) % 1000;
  }

  const pct = (delta: number) => Math.round(baseAnchor * (1 + delta));

  const offers: MerchantOffer[] = [];

  const pushOffer = (
    channel: PlatformChannel,
    merchantId: string,
    merchantName: string,
    price: number,
    shipping: number,
    opts?: {
      couponDiscount?: number;
      promoLabel?: string;
      sellerRating?: string;
      leadTime?: string;
      inStock?: boolean;
      condition?: 'New' | 'Refurbished' | 'Open-Box';
      authorizedOverride?: boolean;
      warrantyNoteOverride?: string;
    }
  ) => {
    const key =
      opts?.condition && opts.condition !== 'New' ? 'eBay Refurb' : channel;
    const ov = overrides?.[key];
    const meta = CHANNEL_META[channel];
    const isAuth = opts?.authorizedOverride ?? meta.authorized;

    offers.push({
      merchantId,
      merchantName,
      channel,
      platformCategory: meta.platformCategory,
      condition: ov?.condition ?? opts?.condition ?? 'New',
      price: ov?.price ?? price,
      shipping: ov?.shipping ?? shipping,
      couponDiscount: ov?.couponDiscount ?? opts?.couponDiscount ?? 0,
      promoLabel: ov?.promoLabel ?? opts?.promoLabel,
      sellerRating: opts?.sellerRating ?? '99.2% Positive',
      returnWindow: meta.defaultReturn,
      inStock: ov?.inStock ?? opts?.inStock ?? true,
      leadTime: ov?.leadTime ?? opts?.leadTime ?? 'Ships in 1–2 days',
      warrantyNote:
        opts?.warrantyNoteOverride ??
        (isAuth
          ? `${warrantyYears}-yr Full OEM Warranty`
          : `${Math.min(2, warrantyYears)}-yr Seller / Allstate`),
      isAuthorizedDealer: isAuth,
    });
  };

  // 1. Amazon
  const amzCoupon = baseAnchor >= 1000 ? 50 : baseAnchor >= 300 ? 15 : 0;
  pushOffer(
    'Amazon',
    'amazon',
    `Amazon (${brand} Official)`,
    pct(0.03 + (hash % 4) * 0.01),
    0,
    {
      couponDiscount: amzCoupon,
      promoLabel: amzCoupon > 0 ? `Clip -$${amzCoupon} Coupon` : 'Prime Free Ship',
      sellerRating: '4.8/5 (1,420+ reviews)',
      leadTime: isHeavyFreight ? 'Prime LTL 3–4 days' : 'Prime 2-day delivery',
    }
  );

  // 2. eBay New (Authorized Brand Store)
  const ebayCoupon = baseAnchor >= 900 ? 45 : baseAnchor >= 250 ? 18 : 10;
  pushOffer(
    'eBay',
    'ebay-new',
    `eBay (${brand} Authorized Outlet)`,
    pct(0.01 + ((hash >> 2) % 4) * 0.01),
    0,
    {
      couponDiscount: ebayCoupon,
      promoLabel: `Code SOLARFALL (-$${ebayCoupon})`,
      sellerRating: '99.6% Positive (8,900+)',
      leadTime: 'Ships in 24h via FedEx/UPS',
      authorizedOverride: true,
    }
  );

  // 3. eBay Certified Refurbished / Open-Box
  pushOffer(
    'eBay',
    'ebay-refurb',
    'eBay (Certified Refurb / Open-Box)',
    pct(-0.14 - ((hash >> 3) % 4) * 0.015),
    0,
    {
      condition: 'Refurbished',
      promoLabel: '2-Yr Allstate Included',
      sellerRating: '99.1% Positive (3,110)',
      leadTime: 'Limited Stock · Ships in 2 days',
      inStock: hash % 5 !== 0,
      authorizedOverride: false,
      warrantyNoteOverride: '2-yr Allstate Refurb Plan',
    }
  );

  // 4. Signature Solar
  pushOffer(
    'Signature Solar',
    'sig-solar',
    'Signature Solar',
    pct(-0.01 + ((hash >> 1) % 3) * 0.01),
    category === 'panels' ? 22 : 0,
    {
      promoLabel:
        category === 'panels'
          ? 'Pallet discount at 10+ panels'
          : 'Free LTL on $2,000+ orders',
      sellerRating: '4.9/5 (4,800+ Verified)',
      leadTime: 'Ships in 24h (TX Warehouse)',
    }
  );

  // 5. Current Connected
  pushOffer(
    'Current Connected',
    'curr-conn',
    'Current Connected',
    pct(0.0 + ((hash >> 2) % 3) * 0.01),
    0,
    {
      promoLabel: 'Free Shipping + Tech Concierge',
      sellerRating: '4.9/5 (1,950+ Verified)',
      leadTime: 'Same-day dispatch (NV)',
    }
  );

  // 6. ShopSolar
  pushOffer(
    'ShopSolar',
    'shop-solar',
    'ShopSolar',
    pct(0.02 + ((hash >> 4) % 3) * 0.01),
    category === 'batteries' ? 35 : 0,
    {
      couponDiscount: baseAnchor >= 1200 ? 35 : 0,
      promoLabel: baseAnchor >= 1200 ? '-$35 Kit Rebate' : 'Free Tech Call',
      sellerRating: '4.8/5 (2,600+ Verified)',
      leadTime: 'Ships in 2–4 days',
    }
  );

  // 7. Home Depot
  pushOffer(
    'Home Depot',
    'home-depot',
    'The Home Depot (Online / Pro)',
    pct(0.06 + ((hash >> 3) % 3) * 0.015),
    0,
    {
      promoLabel: 'Pro Xtra 2% Credit Eligible',
      sellerRating: '4.7/5 (920+ reviews)',
      leadTime: 'Free store pickup / 4 days',
    }
  );

  // 8. Walmart Marketplace
  pushOffer(
    'Walmart',
    'walmart',
    'Walmart Marketplace',
    pct(0.04 + ((hash >> 2) % 4) * 0.01),
    0,
    {
      promoLabel: 'Walmart+ Free Delivery',
      sellerRating: '4.5/5 (410+ reviews)',
      leadTime: 'Ships in 3–5 days',
      authorizedOverride: false,
    }
  );

  // 9. Specialty Distributor #4 (SanTan Solar for panels, Inverter Supply otherwise)
  if (category === 'panels') {
    pushOffer(
      'SanTan Solar',
      'santan',
      'SanTan Solar',
      pct(-0.02),
      19,
      {
        promoLabel: 'Bulk Pallet Pricing Ready',
        sellerRating: '4.9/5 (3,200+ Verified)',
        leadTime: 'Ships in 24–48h (AZ / GA)',
      }
    );
  } else {
    pushOffer(
      'Inverter Supply',
      'inv-supply',
      'Inverter Supply',
      pct(0.015),
      freightFee > 0 ? 35 : 0,
      {
        promoLabel: 'Commercial Liftgate Included',
        sellerRating: '4.8/5 (780+ Verified)',
        leadTime: 'Ships in 1–3 days',
      }
    );
  }

  // 10. OEM Direct
  pushOffer(
    'OEM Direct',
    'oem-direct',
    `${brand} Official Store`,
    pct(0.05),
    0,
    {
      couponDiscount: baseAnchor >= 1500 ? 60 : 0,
      promoLabel: baseAnchor >= 1500 ? 'Direct Email -$60 Code' : 'Direct Warranty Reg',
      sellerRating: '4.9/5 (OEM Direct)',
      leadTime: 'Ships in 2–3 days',
    }
  );

  return offers;
}
