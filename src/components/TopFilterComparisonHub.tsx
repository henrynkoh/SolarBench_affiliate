import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  GitCompareArrows,
  Minus,
  Plus,
  RotateCcw,
  Star,
  Users,
} from 'lucide-react';
import {
  FilterCriteria,
  PURPOSE_LABELS,
  ScoredRecommendation,
} from '../data/productInsights';
import {
  CATEGORY_LABELS,
  getBestOffer,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import {
  SearchPurpose,
  SizeFootprint,
  SolarProduct,
  SwarmAgentId,
} from '../types/solar';
import { HardwareImage } from './HardwareImage';
import { ShareControl, buildSolarShareUrl } from './ShareControl';

interface TopFilterComparisonHubProps {
  criteria: FilterCriteria;
  onChangeCriteria: (next: FilterCriteria) => void;
  onResetCriteria: () => void;
  topThree: ScoredRecommendation[];
  totalMatchedCount: number;
  includeRefurb: boolean;
  compareIds: string[];
  onToggleCompare: (productId: string) => void;
  onInspectProduct: (product: SolarProduct) => void;
  onAddToBuild: (productId: string, merchantId: string) => void;
  workbenchImage?: string;
  onAskSwarmAgent?: (agentId: SwarmAgentId, directive: string) => void;
}

type FilterKey =
  | 'purpose'
  | 'price'
  | 'size'
  | 'volume'
  | 'power'
  | 'delivery'
  | 'buyers';

const PRICE_LABELS: Record<FilterCriteria['priceRange'], string> = {
  all: 'Any Price',
  'under-250': 'Under $250',
  '250-1000': '$250 – $1,000',
  '1000-2500': '$1,000 – $2,500',
  '2500-plus': '$2,500+',
};

const SIZE_LABELS: Record<FilterCriteria['sizeRange'], string> = {
  all: 'Any Size',
  compact: 'Compact (< 20" / Van)',
  'rack-wall': 'Rack / Wall-Mount',
  'full-panel': 'Full Panel (68"+)',
};

const VOLUME_LABELS: Record<FilterCriteria['volumeRange'], string> = {
  all: 'Any Volume / kWh',
  'under-1kwh': 'Panels & MPPTs (<1 kWh)',
  '1-3kwh': '1 – 3 kWh Storage',
  '3-6kwh': '3 – 6 kWh Storage',
  '10kwh-plus': '10+ kWh Storage',
};

const POWER_LABELS: Record<FilterCriteria['powerRange'], string> = {
  all: 'Any Power (W)',
  '200-600w': '200W – 600W',
  '1000-4000w': '1,000W – 4,000W',
  '5000-10000w': '5,000W – 10,000W',
  '12000w-plus': '12,000W+',
};

const DELIVERY_LABELS: Record<FilterCriteria['deliveryNeed'], string> = {
  all: 'Any Delivery Date',
  'same-day': 'Same-Day / 24h',
  'fast-2d': 'Within 2 Days',
  'standard-5d': 'Within 5 Days',
};

const BUYER_LABELS: Record<FilterCriteria['minBuyers'], string> = {
  0: 'Any Buyers / Followers',
  500: '500+ Buyers',
  2000: '2,000+ Buyers',
  5000: '5,000+ Top Followed',
};

const QUICK_SCENARIOS: {
  label: string;
  criteria: FilterCriteria;
}[] = [
  {
    label: 'Off-Grid Cabin under $1,500',
    criteria: {
      purpose: 'off-grid-cabin',
      priceRange: '1000-2500',
      sizeRange: 'all',
      volumeRange: 'all',
      powerRange: 'all',
      deliveryNeed: 'fast-2d',
      minBuyers: 2000,
    },
  },
  {
    label: 'Whole-Home 12kW+ Backup',
    criteria: {
      purpose: 'whole-home-backup',
      priceRange: '2500-plus',
      sizeRange: 'rack-wall',
      volumeRange: 'all',
      powerRange: '12000w-plus',
      deliveryNeed: 'same-day',
      minBuyers: 2000,
    },
  },
  {
    label: 'Van / RV 12V–24V Fast Ship',
    criteria: {
      purpose: 'van-rv-marine',
      priceRange: 'all',
      sizeRange: 'compact',
      volumeRange: 'all',
      powerRange: 'all',
      deliveryNeed: 'fast-2d',
      minBuyers: 2000,
    },
  },
  {
    label: 'Portable Emergency 2kWh+',
    criteria: {
      purpose: 'portable-emergency',
      priceRange: '1000-2500',
      sizeRange: 'compact',
      volumeRange: '1-3kwh',
      powerRange: '1000-4000w',
      deliveryNeed: 'fast-2d',
      minBuyers: 5000,
    },
  },
  {
    label: 'Local AI LLM Setup (Home / Remote)',
    criteria: {
      purpose: 'local-ai-llm',
      priceRange: 'all',
      sizeRange: 'all',
      volumeRange: 'all',
      powerRange: 'all',
      deliveryNeed: 'fast-2d',
      minBuyers: 2000,
    },
  },
];

export function TopFilterComparisonHub({
  criteria,
  onChangeCriteria,
  onResetCriteria,
  topThree,
  totalMatchedCount,
  includeRefurb,
  compareIds,
  onToggleCompare,
  onInspectProduct,
  onAddToBuild,
  workbenchImage: _workbenchImage,
  onAskSwarmAgent,
}: TopFilterComparisonHubProps) {
  const [openMenu, setOpenMenu] = useState<FilterKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const hasActiveFilter =
    criteria.purpose !== 'all' ||
    criteria.priceRange !== 'all' ||
    criteria.sizeRange !== 'all' ||
    criteria.volumeRange !== 'all' ||
    criteria.powerRange !== 'all' ||
    criteria.deliveryNeed !== 'all' ||
    criteria.minBuyers !== 0;

  const toggleMenu = (key: FilterKey) => {
    setOpenMenu((prev) => (prev === key ? null : key));
  };

  return (
    <section
      className="bg-[#F7F8FA] border-b border-slate-200"
      aria-labelledby="upper-filter-heading"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 space-y-6">
        {/* Compact Upper Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>
                Owned by <strong className="text-slate-700">Agent #03 Atlas</strong> · Purpose-Fit Advisor across Amazon, eBay &amp; 8 Specialty Distributors
              </span>
              {onAskSwarmAgent && (
                <button
                  type="button"
                  onClick={() =>
                    onAskSwarmAgent(
                      'advisor-analyst',
                      `Audit my Top 3 Purpose-Fit matches (${PURPOSE_LABELS[criteria.purpose]}) and verify 48V / UPS & delivery SLAs for CEO approval.`
                    )
                  }
                  className="font-semibold text-amber-700 hover:underline"
                >
                  Dispatch Agent #03
                </button>
              )}
            </div>
            <h2
              id="upper-filter-heading"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 leading-[1.15] mt-1.5 [text-wrap:balance]"
            >
              Filter by solar purpose, specs, and delivery to compare the top 3 matches.
            </h2>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Select your use case, budget, footprint, storage volume, wattage,
              delivery deadline, and buyer threshold below to score and rank the
              top 3 solar products with pros, cons, ratings, and 10-store landed pricing.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-600 bg-white border border-slate-200 rounded-lg px-3.5 py-2 shrink-0">
            Matched Catalog Pool:{' '}
            <strong className="text-slate-900">{totalMatchedCount} SKUs</strong>
          </div>
        </div>

        {/* Horizontal Filtering Navigation Bar */}
        <div
          ref={barRef}
          className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 shadow-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-700 mr-1">
                Quick Scenarios:
              </span>
              {QUICK_SCENARIOS.map((sc) => (
                <button
                  key={sc.label}
                  type="button"
                  onClick={() => {
                    onChangeCriteria(sc.criteria);
                    setOpenMenu(null);
                  }}
                  className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-400 text-slate-700 font-medium transition-colors whitespace-nowrap shrink-0"
                >
                  {sc.label}
                </button>
              ))}
            </div>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  onResetCriteria();
                  setOpenMenu(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset All Filters
              </button>
            )}
          </div>

          {/* 7 Horizontal Interactive Filter Buttons */}
          <div
            className="flex flex-wrap items-center gap-2"
            role="toolbar"
            aria-label="Solar requirement filters"
          >
            {/* 1. Purpose of Search */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('purpose')}
                aria-expanded={openMenu === 'purpose'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.purpose !== 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>
                  Purpose:{' '}
                  {criteria.purpose === 'all'
                    ? 'All'
                    : PURPOSE_LABELS[criteria.purpose]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'purpose' && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {(Object.keys(PURPOSE_LABELS) as SearchPurpose[]).map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          onChangeCriteria({ ...criteria, purpose: key });
                          setOpenMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                      >
                        <span
                          className={
                            criteria.purpose === key ? 'font-bold' : ''
                          }
                        >
                          {PURPOSE_LABELS[key]}
                        </span>
                        {criteria.purpose === key && (
                          <Check className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* 2. Price Range */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('price')}
                aria-expanded={openMenu === 'price'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.priceRange !== 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>Price: {PRICE_LABELS[criteria.priceRange]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'price' && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {(
                    Object.keys(PRICE_LABELS) as FilterCriteria['priceRange'][]
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChangeCriteria({ ...criteria, priceRange: key });
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                    >
                      <span
                        className={
                          criteria.priceRange === key ? 'font-bold' : ''
                        }
                      >
                        {PRICE_LABELS[key]}
                      </span>
                      {criteria.priceRange === key && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Size Range */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('size')}
                aria-expanded={openMenu === 'size'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.sizeRange !== 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>Size: {SIZE_LABELS[criteria.sizeRange]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'size' && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {(
                    ['all', 'compact', 'rack-wall', 'full-panel'] as Array<
                      'all' | SizeFootprint
                    >
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChangeCriteria({ ...criteria, sizeRange: key });
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                    >
                      <span
                        className={
                          criteria.sizeRange === key ? 'font-bold' : ''
                        }
                      >
                        {SIZE_LABELS[key]}
                      </span>
                      {criteria.sizeRange === key && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Volume / Storage Capacity Range */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('volume')}
                aria-expanded={openMenu === 'volume'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.volumeRange !== 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>Volume: {VOLUME_LABELS[criteria.volumeRange]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'volume' && (
                <div className="absolute left-0 top-full mt-1.5 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {(
                    Object.keys(
                      VOLUME_LABELS
                    ) as FilterCriteria['volumeRange'][]
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChangeCriteria({ ...criteria, volumeRange: key });
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                    >
                      <span
                        className={
                          criteria.volumeRange === key ? 'font-bold' : ''
                        }
                      >
                        {VOLUME_LABELS[key]}
                      </span>
                      {criteria.volumeRange === key && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Power Range */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('power')}
                aria-expanded={openMenu === 'power'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.powerRange !== 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>Power: {POWER_LABELS[criteria.powerRange]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'power' && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {(
                    Object.keys(POWER_LABELS) as FilterCriteria['powerRange'][]
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChangeCriteria({ ...criteria, powerRange: key });
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                    >
                      <span
                        className={
                          criteria.powerRange === key ? 'font-bold' : ''
                        }
                      >
                        {POWER_LABELS[key]}
                      </span>
                      {criteria.powerRange === key && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 6. Delivery Dates Needed */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('delivery')}
                aria-expanded={openMenu === 'delivery'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.deliveryNeed !== 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>Delivery: {DELIVERY_LABELS[criteria.deliveryNeed]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'delivery' && (
                <div className="absolute left-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {(
                    Object.keys(
                      DELIVERY_LABELS
                    ) as FilterCriteria['deliveryNeed'][]
                  ).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        onChangeCriteria({ ...criteria, deliveryNeed: key });
                        setOpenMenu(null);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                    >
                      <span
                        className={
                          criteria.deliveryNeed === key ? 'font-bold' : ''
                        }
                      >
                        {DELIVERY_LABELS[key]}
                      </span>
                      {criteria.deliveryNeed === key && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Number of Buyers / Followers */}
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('buyers')}
                aria-expanded={openMenu === 'buyers'}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                  criteria.minBuyers !== 0
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-800 border-slate-300 hover:border-slate-400'
                }`}
              >
                <span>Buyers: {BUYER_LABELS[criteria.minBuyers]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>

              {openMenu === 'buyers' && (
                <div className="absolute left-0 top-full mt-1.5 w-60 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-1.5">
                  {([0, 500, 2000, 5000] as FilterCriteria['minBuyers'][]).map(
                    (key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          onChangeCriteria({ ...criteria, minBuyers: key });
                          setOpenMenu(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-left rounded-md hover:bg-slate-100 text-slate-800"
                      >
                        <span
                          className={
                            criteria.minBuyers === key ? 'font-bold' : ''
                          }
                        >
                          {BUYER_LABELS[key]}
                        </span>
                        {criteria.minBuyers === key && (
                          <Check className="w-3.5 h-3.5 text-amber-600" />
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 3 Matched Picks — Comparative Table (Pros, Cons, Stars, Reviews, 1–10 Purpose Score) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Top 3 Matched Solar Picks — Comparative Evaluation
              </h2>
              <p className="text-xs text-slate-500">
                Showing top {topThree.length} of{' '}
                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                  {totalMatchedCount}
                </span>{' '}
                matching models ranked by Purpose-Fit Score (1–10) for{' '}
                <strong className="text-slate-700">
                  {PURPOSE_LABELS[criteria.purpose]}
                </strong>
              </p>
            </div>
            <a
              href="#catalog"
              className="text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap"
            >
              Jump to Full 10-Store Comparison Table ↓
            </a>
          </div>

          {topThree.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-8 bg-slate-50 text-center">
              <p className="text-sm font-semibold text-slate-900">
                No solar products satisfy every active filter combination
              </p>
              <p className="text-xs text-slate-600 mt-1">
                For example, full-size 68&quot; solar panels do not carry battery
                kWh volume. Clear one or more conflicting filters to see your top
                3 matches.
              </p>
              <button
                type="button"
                onClick={onResetCriteria}
                className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors"
              >
                Reset Requirement Filters
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
              <table className="w-full text-left border-collapse min-w-[1040px] text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                    <th className="py-3 px-4 w-[250px]">
                      Rank &amp; Solar Model
                    </th>
                    <th className="py-3 px-4 w-[135px]">
                      Purpose Score (1–10)
                    </th>
                    <th className="py-3 px-4 w-[175px]">
                      Stars, Reviews &amp; Buyers
                    </th>
                    <th className="py-3 px-4 w-[240px]">Pros</th>
                    <th className="py-3 px-4 w-[205px]">Cons</th>
                    <th className="py-3 px-4">
                      Detailed Comparative Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 align-top">
                  {topThree.map((rec, idx) => {
                    const { product, score, comparativeRationale } = rec;
                    const bestOffer = getBestOffer(product, includeRefurb);
                    const landed = getOfferLandedPrice(bestOffer);
                    const unitVal = getUnitMetricValue(product, includeRefurb);
                    const isCompared = compareIds.includes(product.id);
                    const rankLabel =
                      idx === 0
                        ? '#1 Best Fit'
                        : idx === 1
                        ? '#2 Runner-Up'
                        : '#3 Value Alternative';

                    return (
                      <tr
                        key={product.id}
                        className={
                          idx === 0
                            ? 'bg-emerald-50/25'
                            : 'bg-white hover:bg-slate-50/60'
                        }
                      >
                        {/* Rank & Product Summary */}
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`font-semibold ${
                                idx === 0
                                  ? 'text-emerald-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              {rankLabel}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {CATEGORY_LABELS[product.category]}
                            </span>
                          </div>

                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => onInspectProduct(product)}
                              className="w-14 h-11 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                            >
                              <HardwareImage
                                src={product.image}
                                alt={product.name}
                                title={product.name}
                              />
                            </button>
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => onInspectProduct(product)}
                                className="text-left text-xs font-bold text-slate-900 hover:text-amber-700 transition-colors line-clamp-2"
                              >
                                {product.name}
                              </button>
                              <div className="mt-1 font-mono tabular-nums">
                                <span className="text-sm font-bold text-slate-900">
                                  ${landed.toLocaleString()}
                                </span>
                                <span className="text-[11px] text-amber-700 font-semibold ml-1.5">
                                  ${unitVal.toFixed(2)} {product.unitMetricType}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                Best: {bestOffer.merchantName}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() =>
                                onAddToBuild(product.id, bestOffer.merchantId)
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3 h-3" />
                              Add to Build
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleCompare(product.id)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap ${
                                isCompared
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <GitCompareArrows className="w-3 h-3" />
                              {isCompared ? 'In Matrix' : 'Compare'}
                            </button>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <ShareControl
                              variant="compact-inline"
                              subjectLabel={product.name}
                              shareUrl={buildSolarShareUrl({
                                productId: product.id,
                              })}
                              shareText={`${product.name} (${score.toFixed(1)}/10 fit score) — $${landed.toLocaleString()} ($${unitVal.toFixed(2)} ${product.unitMetricType}) on SolarBench`}
                            />
                          </div>
                        </td>

                        {/* Purpose-Fit Score 1-10 */}
                        <td className="py-4 px-4">
                          <div className="font-mono tabular-nums">
                            <span className="text-2xl font-bold text-slate-900">
                              {score.toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-400 font-semibold">
                              {' '}
                              / 10
                            </span>
                          </div>
                          <div
                            className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2"
                            aria-hidden="true"
                          >
                            <div
                              className={`h-full rounded-full ${
                                score >= 9.0
                                  ? 'bg-emerald-600'
                                  : 'bg-amber-600'
                              }`}
                              style={{ width: `${(score / 10) * 100}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1.5 font-medium">
                            {score >= 9.2
                              ? 'Optimal Requirement Fit'
                              : score >= 8.3
                              ? 'Strong Match'
                              : 'Viable Alternative'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                            Ships in {product.fastestDeliveryDays}d max
                          </div>
                        </td>

                        {/* Stars, Reviews & Buyers / Followers */}
                        <td className="py-4 px-4 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                            <span className="font-mono font-bold text-slate-900 tabular-nums">
                              {product.starRating.toFixed(1)}
                            </span>
                            <span className="text-slate-500 font-mono tabular-nums">
                              ({product.reviewCount.toLocaleString()} reviews)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-700 font-mono tabular-nums">
                            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="font-semibold">
                              {product.buyerFollowers.toLocaleString()}
                            </span>
                            <span className="font-sans text-slate-500">
                              buyers / followers
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 italic leading-relaxed border-t border-slate-100 pt-2">
                            &ldquo;{product.topReviewExcerpt}&rdquo;
                          </p>
                        </td>

                        {/* Pros */}
                        <td className="py-4 px-4">
                          <ul className="space-y-1.5">
                            {product.pros.map((pro) => (
                              <li
                                key={pro}
                                className="flex items-start gap-1.5 text-slate-700 leading-snug"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                                <span>{pro}</span>
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* Cons */}
                        <td className="py-4 px-4">
                          <ul className="space-y-1.5">
                            {product.cons.map((con) => (
                              <li
                                key={con}
                                className="flex items-start gap-1.5 text-slate-600 leading-snug"
                              >
                                <Minus className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                                <span>{con}</span>
                              </li>
                            ))}
                          </ul>
                        </td>

                        {/* Detailed Comparative Description */}
                        <td className="py-4 px-4">
                          <p className="text-slate-700 leading-relaxed">
                            {comparativeRationale}
                          </p>
                          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                            <span className="font-mono">
                              {product.specs.dimensionsIn}&quot; ·{' '}
                              {product.specs.weightLbs} lbs
                            </span>
                            <button
                              type="button"
                              onClick={() => onInspectProduct(product)}
                              className="font-semibold text-amber-700 hover:underline"
                            >
                              View {product.offers.length} Store Offers →
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
