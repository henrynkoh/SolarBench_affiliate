import { X, Plus } from 'lucide-react';
import { SolarProduct, SwarmAgentId } from '../types/solar';
import {
  CATEGORY_LABELS,
  getBestOffer,
  getLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import {
  evaluateWarrantyAndPermit,
  getEffectiveNetPrice,
  getLifecycleCostMetrics,
  getPriceArbitrageMetrics,
  isSec25DEligible,
} from '../data/solarEconomics';
import { HardwareImage } from './HardwareImage';
import { ShareControl, buildSolarShareUrl } from './ShareControl';

interface ComparisonMatrixProps {
  products: SolarProduct[];
  applyFederalCredit: boolean;
  utilityRebatePct: number;
  onRemove: (id: string) => void;
  onClear: () => void;
  onLoadPreset: (ids: string[]) => void;
  onInspect: (product: SolarProduct) => void;
  onAddToBuild: (productId: string, merchantId: string) => void;
  onAskSwarmAgent?: (agentId: SwarmAgentId, directive: string) => void;
}

const PRESETS: { label: string; ids: string[] }[] = [
  {
    label: '48V Server Rack Batteries',
    ids: [
      'eg4-ll-s-48v-100ah',
      'sok-48v-100ah-pro',
      'pytes-v5-5120',
      'ecoworthy-48v-100ah',
    ],
  },
  {
    label: '400W+ Solar Panels',
    ids: [
      'canadian-solar-440w-bifacial',
      'rec-alpha-pure-r-430w',
      'qcells-qpeak-duo-405w',
    ],
  },
  {
    label: '48V Hybrid Inverters',
    ids: [
      'eg4-6000xp-inverter',
      'solark-15k-2p',
      'victron-multiplus-ii-48-5000',
    ],
  },
  {
    label: 'Portable Stations',
    ids: ['ecoflow-delta-pro-3', 'bluetti-ac200l'],
  },
];

export function ComparisonMatrix({
  products,
  applyFederalCredit,
  utilityRebatePct,
  onRemove,
  onClear,
  onLoadPreset,
  onInspect,
  onAddToBuild,
  onAskSwarmAgent,
}: ComparisonMatrixProps) {
  const minPrice =
    products.length > 0
      ? Math.min(...products.map((p) => getLandedPrice(p)))
      : 0;
  const minUnitMetric =
    products.length > 0
      ? Math.min(...products.map((p) => getUnitMetricValue(p)))
      : 0;
  const maxEff =
    products.length > 0
      ? Math.max(...products.map((p) => p.specs.efficiencyPct))
      : 0;
  const maxWarranty =
    products.length > 0
      ? Math.max(...products.map((p) => p.specs.warrantyYears))
      : 0;

  return (
    <section
      id="compare"
      className="py-14 border-t border-slate-200 bg-white"
      aria-labelledby="compare-heading"
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span>
                Owned by <strong className="text-slate-700">Agent #04 Micron</strong> · Side-by-Side Spec Matrix &amp; Energy Density
              </span>
              {onAskSwarmAgent && (
                <button
                  type="button"
                  onClick={() =>
                    onAskSwarmAgent(
                      'teardown-auditor',
                      'Benchmark top 48V LiFePO4 server-rack banks for Wh/lb energy density, low-temp cutoffs, and IP65 vs IP20 humidity protection.'
                    )
                  }
                  className="font-semibold text-amber-700 hover:underline"
                >
                  Dispatch Agent #04
                </button>
              )}
            </div>
            <h2
              id="compare-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1"
            >
              Hardware Specification &amp; Value Comparison
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onLoadPreset(preset.ids)}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                {preset.label}
              </button>
            ))}
            {products.length > 0 && (
              <>
                <ShareControl
                  variant="inline"
                  subjectLabel="comparison matrix"
                  shareUrl={buildSolarShareUrl({
                    compareIds: products.map((p) => p.id),
                  })}
                  shareText={`Comparing ${products
                    .map(
                      (p) =>
                        `${p.name} ($${getLandedPrice(p).toLocaleString()})`
                    )
                    .join(' vs ')} on SolarBench`}
                />
                <button
                  type="button"
                  onClick={onClear}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="border border-slate-200 rounded-xl p-10 text-center bg-slate-50">
            <p className="text-base font-semibold text-slate-900">
              No hardware models selected for comparison
            </p>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Check &ldquo;Compare&rdquo; on any product row in the catalog above,
              or choose a preset benchmark group to inspect side-by-side metrics.
            </p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-200 align-top">
                  <th className="w-52 p-4 text-xs font-semibold text-slate-500 bg-slate-50">
                    Specification
                  </th>
                  {products.map((product) => (
                    <th key={product.id} className="p-4 min-w-[210px] align-top">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="text-xs font-normal text-slate-500">
                          {product.brand} · {CATEGORY_LABELS[product.category]}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <ShareControl
                            compact
                            subjectLabel={product.name}
                            shareUrl={buildSolarShareUrl({
                              productId: product.id,
                            })}
                            shareText={`${product.name} — $${getLandedPrice(
                              product
                            ).toLocaleString()} ($${getUnitMetricValue(
                              product
                            ).toFixed(2)} ${product.unitMetricType}) on SolarBench`}
                          />
                          <button
                            type="button"
                            onClick={() => onRemove(product.id)}
                            className="p-1 text-slate-400 hover:text-slate-900 rounded transition-colors shrink-0"
                            aria-label={`Remove ${product.name} from comparison`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-3">
                        <HardwareImage
                          src={product.image}
                          alt={product.name}
                          title={product.name}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onInspect(product)}
                        className="text-left text-sm font-bold text-slate-900 hover:text-amber-700 transition-colors line-clamp-2"
                      >
                        {product.name}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Lowest Landed Price
                  </th>
                  {products.map((p) => {
                    const landed = getLandedPrice(p);
                    const net = getEffectiveNetPrice(
                      p,
                      landed,
                      applyFederalCredit,
                      utilityRebatePct
                    );
                    const best = getBestOffer(p);
                    const isBest = products.length > 1 && landed === minPrice;
                    return (
                      <td key={p.id} className="p-4 font-mono tabular-nums">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-base font-bold ${
                              isBest ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            ${landed.toLocaleString()}
                          </span>
                          {isBest && (
                            <span className="text-xs font-sans font-semibold text-emerald-700">
                              Best
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-sans text-slate-500 mt-0.5">
                          at {best.merchantName}
                          {applyFederalCredit && isSec25DEligible(p)
                            ? ` · $${net.toLocaleString()} after 30% Credit`
                            : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    90-Day Arbitrage &amp; Buy Signal
                  </th>
                  {products.map((p) => {
                    const arb = getPriceArbitrageMetrics(p);
                    return (
                      <td key={p.id} className="p-4 text-xs">
                        <div className="font-semibold text-slate-900">
                          {arb.buySignal}
                        </div>
                        <div className="font-mono text-slate-500 tabular-nums mt-0.5">
                          ${arb.spreadDollar.toLocaleString()} spread · 90d low ${arb.low90d.toLocaleString()}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Lifetime $/kWh &amp; Payback
                  </th>
                  {products.map((p) => {
                    const landed = getLandedPrice(p);
                    const life = getLifecycleCostMetrics(p, landed);
                    return (
                      <td key={p.id} className="p-4 font-mono text-xs tabular-nums">
                        <div className="font-semibold text-amber-700">
                          ${life.costPerDeliveredKwh.toFixed(3)} / kWh lifetime
                        </div>
                        <div className="text-slate-500 font-sans mt-0.5">
                          ~{life.paybackMonthsVsGrid} mo grid payback
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Permit &amp; Warranty Guard
                  </th>
                  {products.map((p) => {
                    const report = evaluateWarrantyAndPermit(p);
                    return (
                      <td key={p.id} className="p-4 text-xs">
                        <div
                          className={
                            report.warrantyStatus.startsWith('Full')
                              ? 'font-semibold text-emerald-700'
                              : 'font-semibold text-amber-700'
                          }
                        >
                          {report.warrantyStatus}
                        </div>
                        <div className="text-slate-500 mt-0.5 leading-snug">
                          {report.permitNote}
                        </div>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Normalized Cost Metric
                  </th>
                  {products.map((p) => {
                    const val = getUnitMetricValue(p);
                    const isBest =
                      products.length > 1 &&
                      Math.abs(val - minUnitMetric) < 0.001;
                    return (
                      <td key={p.id} className="p-4 font-mono tabular-nums">
                        <span
                          className={`font-semibold ${
                            isBest ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          ${val.toFixed(2)} {p.unitMetricType}
                        </span>
                        {isBest && (
                          <span className="ml-2 text-xs font-sans font-semibold text-emerald-700">
                            Best Value
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Nominal Voltage
                  </th>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-mono text-xs text-slate-800"
                    >
                      {p.specs.nominalVoltage}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Capacity / Output Rating
                  </th>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-mono tabular-nums text-slate-900"
                    >
                      {p.specs.capacityWh
                        ? `${p.specs.capacityWh.toLocaleString()} Wh`
                        : `${p.specs.powerWatts?.toLocaleString() ?? '—'} W`}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Measured Efficiency
                  </th>
                  {products.map((p) => {
                    const isBest =
                      products.length > 1 &&
                      p.specs.efficiencyPct === maxEff;
                    return (
                      <td
                        key={p.id}
                        className="p-4 font-mono tabular-nums text-slate-900"
                      >
                        <span
                          className={
                            isBest ? 'font-semibold text-emerald-700' : ''
                          }
                        >
                          {p.specs.efficiencyPct}%
                        </span>
                        {isBest && (
                          <span className="ml-2 text-xs font-sans font-semibold text-emerald-700">
                            Best
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Cell / Hardware Topology
                  </th>
                  {products.map((p) => (
                    <td key={p.id} className="p-4 text-xs text-slate-700">
                      {p.specs.chemistryOrCell}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Certifications
                  </th>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 font-mono text-xs text-slate-700"
                    >
                      {p.specs.certifications.join(' · ')}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Warranty
                  </th>
                  {products.map((p) => {
                    const isBest =
                      products.length > 1 &&
                      p.specs.warrantyYears === maxWarranty;
                    return (
                      <td
                        key={p.id}
                        className="p-4 font-mono tabular-nums text-slate-900"
                      >
                        <span
                          className={
                            isBest ? 'font-semibold text-emerald-700' : ''
                          }
                        >
                          {p.specs.warrantyYears} Years
                        </span>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Bench Teardown Note
                  </th>
                  {products.map((p) => (
                    <td
                      key={p.id}
                      className="p-4 text-xs text-slate-600 leading-relaxed"
                    >
                      {p.benchmark.bmsOrMpptVerdict}
                    </td>
                  ))}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Add to System Quote
                  </th>
                  {products.map((p) => {
                    const best = getBestOffer(p);
                    return (
                      <td key={p.id} className="p-4">
                        <button
                          type="button"
                          onClick={() => onAddToBuild(p.id, best.merchantId)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Lowest Offer
                        </button>
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <th className="p-4 text-xs font-semibold text-slate-600 bg-slate-50">
                    Share Finding
                  </th>
                  {products.map((p) => (
                    <td key={p.id} className="p-4">
                      <ShareControl
                        variant="compact-inline"
                        subjectLabel={p.name}
                        shareUrl={buildSolarShareUrl({ productId: p.id })}
                        shareText={`${p.name} — $${getLandedPrice(
                          p
                        ).toLocaleString()} ($${getUnitMetricValue(p).toFixed(
                          2
                        )} ${p.unitMetricType}) on SolarBench`}
                      />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
