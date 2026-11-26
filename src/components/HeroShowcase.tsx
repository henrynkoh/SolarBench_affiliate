import {
  ArrowRight,
  Bot,
  Calculator,
  CheckCircle2,
  ShieldCheck,
  Table2,
} from 'lucide-react';
import { AutonomousSwarmStatus } from '../types/solar';

interface HeroShowcaseProps {
  workbenchImage: string;
  productCount: number;
  totalOfferCount: number;
  autonomousStatus: AutonomousSwarmStatus | null;
  onOpenRoiCalculator: () => void;
}

export function HeroShowcase({
  workbenchImage,
  productCount,
  totalOfferCount,
  autonomousStatus,
  onOpenRoiCalculator,
}: HeroShowcaseProps) {
  const healthScore = autonomousStatus?.overallHealthScore ?? 100;
  const autopilotOn = autonomousStatus?.autopilotEnabled ?? true;

  return (
    <section
      className="bg-white border-b border-slate-200"
      aria-labelledby="hero-showcase-heading"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left 7 cols: High-Conversion Value Proposition */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-600">
              <span className="font-semibold text-amber-700">
                SOLAR HARDWARE BENCHMARK
              </span>
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
              <span>REAL ITEM + LTL FREIGHT − COUPONS</span>
              <span aria-hidden="true" className="text-slate-300">
                /
              </span>
              <a
                href="#swarm"
                className="text-emerald-700 font-semibold hover:underline"
              >
                {autopilotOn
                  ? `15-Agent Autopilot: ${healthScore}% Verified`
                  : '15-Agent Autopilot Paused'}
              </a>
            </div>

            <h1
              id="hero-showcase-heading"
              className="font-display text-3xl sm:text-4xl lg:text-[2.85rem] font-bold tracking-tight text-slate-900 leading-[1.08] [text-wrap:balance]"
            >
              Stop overpaying $15,000 for solar and backup hardware.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Compare true delivered prices,{' '}
              <span className="font-mono text-slate-900 font-semibold">
                $/Wh
              </span>{' '}
              efficiency, thermal cutoffs, UL permits, and 10-year Sec. 25D payback
              across 10+ marketplaces and specialty solar distributors in seconds.
            </p>

            {/* Primary Conversion Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#top"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap"
              >
                Find Top 3 Matches
                <ArrowRight className="w-4 h-4" />
              </a>

              <a
                href="#catalog"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Table2 className="w-4 h-4 text-amber-400" />
                Browse 10-Store Matrix
              </a>

              <button
                type="button"
                onClick={onOpenRoiCalculator}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:border-slate-900 transition-colors whitespace-nowrap"
              >
                <Calculator className="w-4 h-4 text-emerald-700" />
                10-Yr ROI Calculator
              </button>
            </div>

            {/* Verified Proof Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-slate-200">
              <div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {productCount}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Audited Solar SKUs
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-slate-900 tabular-nums">
                  {totalOfferCount}+
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Live Store Offers
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
                  30%
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Sec. 25D Net Modeling
                </div>
              </div>
              <div>
                <div className="font-mono text-xl font-bold text-amber-700 tabular-nums">
                  15 Bots
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Autonomous Swarm QA
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 cols: Workbench Photography & Trust Card */}
          <div className="lg:col-span-5 space-y-3">
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm">
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img
                  src={workbenchImage}
                  alt="SolarBench hardware testing lab showing 48V LiFePO4 battery, hybrid inverter, and thermal probes"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs border-t border-slate-800">
                <div className="flex items-center gap-2 font-medium text-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>OEM Warranty vs. Refurb Risk Verified</span>
                </div>
                <a
                  href="#daily-spotlight"
                  className="font-mono text-amber-400 font-semibold hover:underline whitespace-nowrap"
                >
                  Today&apos;s #1 Deal →
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href="#builder"
                className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-[#F7F8FA] hover:border-slate-400 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    NEC &amp; Voc Safety Checks
                  </div>
                  <div className="text-slate-600 mt-0.5 leading-snug">
                    Split-cart BOM sizing with cold-weather panel headroom math.
                  </div>
                </div>
              </a>

              <a
                href="#swarm"
                className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-[#F7F8FA] hover:border-slate-400 transition-colors"
              >
                <Bot className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">
                    Autonomous Swarm Fleet
                  </div>
                  <div className="text-slate-600 mt-0.5 leading-snug">
                    Chief Aria + 14 specialists audit prices, videos &amp; SEO 24/7.
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
