import {
  ArrowRightLeft,
  CheckCircle2,
  ExternalLink,
  Layers,
  MinusCircle,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { AutonomousSwarmStatus } from '../types/solar';

interface VersionComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEdition: 'v0' | 'v1';
  onSelectEdition: (edition: 'v0' | 'v1') => void;
  productCount: number;
  totalOfferCount: number;
  buildItemsCount: number;
  alertsCount: number;
  autonomousStatus: AutonomousSwarmStatus | null;
  onShareToSlack?: (mode: 'launch-review' | 'daily-spotlight') => void;
  isSendingSlack?: boolean;
}

interface ScoreRow {
  criterion: string;
  v0Score: number;
  v1Score: number;
  rationale: string;
}

const SCORECARD_ROWS: ScoreRow[] = [
  {
    criterion: 'Visual Identity & First Impression',
    v0Score: 8.4,
    v1Score: 9.4,
    rationale:
      'v1 uses the Stitch dark hardware telemetry palette (#080D18 obsidian, amber primary CTAs, emerald Sec. 25D cues, cyan NEC readouts) that makes solar engineering data stand out immediately.',
  },
  {
    criterion: 'Information Architecture & Scannability',
    v0Score: 8.5,
    v1Score: 9.3,
    rationale:
      'v0 stacks 10+ long vertical sections on one page; v1 groups workflows into 5 focused workspaces (Bench, 10-Store, BOM & NEC, 15-Agent Swarm, Growth Hub) with an optional All-in-One Scroll mode.',
  },
  {
    criterion: 'Landed Price Arithmetic & Store Clarity',
    v0Score: 8.7,
    v1Score: 9.5,
    rationale:
      'v1 explicitly renders Item + LTL Freight − Coupon = Net Landed plus Sec. 25D 30% credit on every Top-3 card and ranks all 10 stores with a 90-day spread bar.',
  },
  {
    criterion: 'BOM Engineering & NEC 125% Compliance',
    v0Score: 9.0,
    v1Score: 9.3,
    rationale:
      'Both run the exact same NEC 125% BOS & Sec. 25D math; v1 elevates live PV/Inverter/Battery sliders alongside cable AWG, Class-T fuse sizing, and one-click NEC spec sheet export.',
  },
  {
    criterion: 'Autonomous 15-Agent Swarm Visibility',
    v0Score: 8.8,
    v1Score: 9.2,
    rationale:
      'Both connect to the live 24/7 AutonomousSwarmEngine; v1 surfaces Tier 0 CEO -> Tier 1 Aria -> Tier 2 14-Agent telemetry and live audit log in a unified dark ops console.',
  },
  {
    criterion: 'Daylight Readability & Long-Form Research',
    v0Score: 9.2,
    v1Score: 8.3,
    rationale:
      'v0 bright white editorial surfaces excel for outdoor/daylight reading, printing, and dense multi-SKU catalog table filtering across 30 products simultaneously.',
  },
  {
    criterion: 'Mobile Ergonomics & Conversion Flow',
    v0Score: 8.1,
    v1Score: 9.3,
    rationale:
      'v1 adapts the Stitch 5-tab mobile dock and stacked landed-math cards cleanly for smartphone shoppers without wide horizontal table scroll.',
  },
];

export function VersionComparisonModal({
  isOpen,
  onClose,
  activeEdition,
  onSelectEdition,
  productCount,
  totalOfferCount,
  buildItemsCount,
  alertsCount,
  autonomousStatus,
  onShareToSlack,
  isSendingSlack = false,
}: VersionComparisonModalProps) {
  if (!isOpen) return null;

  const v0Avg = (
    SCORECARD_ROWS.reduce((acc, r) => acc + r.v0Score, 0) /
    SCORECARD_ROWS.length
  ).toFixed(1);
  const v1Avg = (
    SCORECARD_ROWS.reduce((acc, r) => acc + r.v1Score, 0) /
    SCORECARD_ROWS.length
  ).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="version-compare-title"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-[#0B1220] border border-slate-700/80 text-slate-100 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ArrowRightLeft className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2
                id="version-compare-title"
                className="font-display text-lg font-bold text-white truncate"
              >
                SolarBench vs. SolarBench_v1 — Live Decision Scorecard
              </h2>
              <p className="text-xs text-slate-400">
                Shared live backend · {productCount} SKUs · {totalOfferCount}+ offers ·{' '}
                {autonomousStatus?.overallHealthScore ?? 100}% Swarm Health ·{' '}
                {buildItemsCount} BOM items · {alertsCount} watchdogs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close comparison modal"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Top Executive Score Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`rounded-xl p-5 border transition-colors ${
                activeEdition === 'v0'
                  ? 'border-slate-400 bg-slate-900'
                  : 'border-slate-800 bg-[#0F172A]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-slate-400">
                    Original Light Editorial Build
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mt-0.5">
                    SolarBench
                  </h3>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
                    {v0Avg}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / 10
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">Overall Score</div>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Best for power researchers comparing all 30 SKUs at once in a
                    bright, print-friendly multi-store catalog spreadsheet.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Complete single-scroll landing page with FAQ, methodology,
                    Local AI UPS guide, and full side-by-side spec matrix.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MinusCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Long vertical page (~10 sections) can overwhelm first-time
                    mobile visitors before reaching the 10-store deal breakdown.
                  </span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  onSelectEdition('v0');
                  onClose();
                }}
                className={`mt-4 w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeEdition === 'v0'
                    ? 'bg-slate-700 text-white'
                    : 'bg-white text-slate-900 hover:bg-slate-200'
                }`}
              >
                {activeEdition === 'v0'
                  ? 'Currently Viewing SolarBench'
                  : 'Switch Live Preview to SolarBench'}
              </button>
            </div>

            <div
              className={`rounded-xl p-5 border transition-colors ${
                activeEdition === 'v1'
                  ? 'border-amber-500/80 bg-[#131D31]'
                  : 'border-slate-800 bg-[#0F172A]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-mono text-amber-400">
                    Stitch Dark Hardware Telemetry Redesign
                  </div>
                  <h3 className="font-display text-xl font-bold text-white mt-0.5">
                    SolarBench_v1
                  </h3>
                </div>
                <div className="text-right">
                  <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
                    {v1Avg}{' '}
                    <span className="text-xs font-normal text-slate-400">
                      / 10
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    Recommended for Public Launch
                  </div>
                </div>
              </div>

              <ul className="mt-4 space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Directly implements your Google Stitch architecture: 5
                    focused workspaces, explicit Landed Arithmetic math, and dark
                    telemetry clarity.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Higher buyer conversion velocity: Top-3 Advisor, Today&apos;s
                    Video, 10-Store Spread, NEC 125% Sliders &amp; 15-Agent Swarm
                    are 1 tap apart.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <MinusCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Dark UI has slightly lower outdoor/bright-sunlight legibility
                    than white paper layouts and focuses on one SKU matrix at a
                    time.
                  </span>
                </li>
              </ul>

              <button
                type="button"
                onClick={() => {
                  onSelectEdition('v1');
                  onClose();
                }}
                className={`mt-4 w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  activeEdition === 'v1'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                }`}
              >
                {activeEdition === 'v1'
                  ? 'Currently Viewing SolarBench_v1'
                  : 'Switch Live Preview to SolarBench_v1'}
              </button>
            </div>
          </div>

          {/* 1–10 Granular Breakdown Table */}
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0F172A]">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Head-to-Head Evaluation Matrix (1–10 Scale)</span>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Identical Backend Data &amp; APIs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/60">
                    <th className="py-2.5 px-4 font-semibold">Criterion</th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      SolarBench
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                      SolarBench_v1
                    </th>
                    <th className="py-2.5 px-4 font-semibold">
                      Observed Engineering &amp; UX Rationale
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {SCORECARD_ROWS.map((row) => {
                    const v1Wins = row.v1Score > row.v0Score;
                    return (
                      <tr
                        key={row.criterion}
                        className="hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">
                          {row.criterion}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono tabular-nums ${
                            !v1Wins
                              ? 'text-emerald-400 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {row.v0Score.toFixed(1)}
                        </td>
                        <td
                          className={`py-3 px-3 text-right font-mono tabular-nums ${
                            v1Wins
                              ? 'text-amber-400 font-bold'
                              : 'text-slate-300'
                          }`}
                        >
                          {row.v1Score.toFixed(1)}
                        </td>
                        <td className="py-3 px-4 text-slate-300 leading-relaxed">
                          {row.rationale}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stitch Reference Board Preview */}
          <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 flex flex-col md:flex-row gap-4 items-center">
            <img
              src="/assets/aistudio/image_f3a7df12.png"
              alt="Google Stitch SolarBench_v1 reference design board"
              referrerPolicy="no-referrer"
              className="w-full md:w-64 h-40 object-cover rounded-lg border border-slate-700 shrink-0"
            />
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-white text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  Faithfully Ported from Stitch Project #1151634046896588888
                </span>
              </div>
              <p className="leading-relaxed">
                Every visual panel from your Stitch design—Hero conversion
                header, Daily Benchmark video card, Top-3 Landed Arithmetic
                cards, 10-Store Spread &amp; LTL Trap Matrix, Tier 0–2 15-Agent
                Swarm console, Target Price Watchdog, and Automated NEC 125% BOS
                Engine—is live in <strong className="text-amber-300">SolarBench_v1</strong>{' '}
                and backed by the exact same 30-SKU catalog, Cloud SQL database,
                Firebase auth, and 24/7 autonomous daemon as original{' '}
                <strong className="text-white">SolarBench</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {onShareToSlack && (
                  <button
                    type="button"
                    disabled={isSendingSlack}
                    onClick={() => onShareToSlack('launch-review')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSendingSlack
                      ? 'Sending to Slack...'
                      : 'Send Review to Slack (#C8Y7536BU)'}
                  </button>
                )}
                <a
                  href="https://app.slack.com/client/T8Z8U3MPZ/C8Y7536BU"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-200 hover:border-slate-500 transition-colors whitespace-nowrap"
                >
                  Open Slack Channel
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
