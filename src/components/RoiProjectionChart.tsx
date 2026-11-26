import { useState } from 'react';
import { CheckCircle2, Globe, TrendingUp } from 'lucide-react';
import { buildRoiProjectionSeries } from '../data/solarEconomics';

interface RoiProjectionChartProps {
  systemCost: number;
  yearOneAnnualSavings: number;
  efficiencyPct: number;
  utilityRate: number;
  groundedLocation?: string | null;
  groundedUtility?: string | null;
  breakEvenYears: number;
}

function formatCompactDollar(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 10000) return `$${(value / 1000).toFixed(0)}k`;
  if (abs >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${Math.round(value)}`;
}

export function RoiProjectionChart({
  systemCost,
  yearOneAnnualSavings,
  efficiencyPct,
  utilityRate,
  groundedLocation,
  groundedUtility,
  breakEvenYears,
}: RoiProjectionChartProps) {
  const [hoveredYear, setHoveredYear] = useState<number>(10);
  const [escalationPct, setEscalationPct] = useState<0 | 3>(0);

  const series = buildRoiProjectionSeries({
    systemCost,
    yearOneAnnualSavings,
    annualUtilityEscalationPct: escalationPct,
  });

  const width = 600;
  const height = 190;
  const padLeft = 52;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const maxY = Math.max(
    systemCost * 1.15,
    series[series.length - 1]?.cumulativeSavings ?? 0,
    100
  );

  const toX = (yr: number) => padLeft + (yr / 10) * plotW;
  const toY = (val: number) =>
    padTop + plotH - Math.min(1, Math.max(0, val / maxY)) * plotH;

  const coords = series.map((pt) => ({
    ...pt,
    x: toX(pt.year),
    y: toY(pt.cumulativeSavings),
  }));

  const polylinePoints = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPoints = `${toX(0).toFixed(1)},${(padTop + plotH).toFixed(1)} ${polylinePoints} ${toX(10).toFixed(1)},${(padTop + plotH).toFixed(1)}`;
  const costLineY = toY(systemCost);

  const activePoint = coords[hoveredYear] ?? coords[10];
  const milestoneYears = [1, 5, 10] as const;

  const effectiveBreakEvenYear =
    escalationPct === 0
      ? breakEvenYears
      : (() => {
          const hit = series.find(
            (pt, idx) => idx > 0 && pt.cumulativeSavings >= systemCost
          );
          if (!hit) return breakEvenYears;
          const prev = series[hit.year - 1];
          const span = Math.max(1, hit.cumulativeSavings - prev.cumulativeSavings);
          return (
            hit.year -
            1 +
            (systemCost - prev.cumulativeSavings) / span
          );
        })();

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
            <h4 className="text-sm font-bold text-slate-900">
              Return on Investment (1, 5 &amp; 10-Year Cumulative Savings)
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
            <span>
              Modeled at{' '}
              <strong className="font-mono text-slate-800">
                {efficiencyPct}%
              </strong>{' '}
              measured efficiency &amp;{' '}
              <strong className="font-mono text-slate-800">
                ${utilityRate.toFixed(3)}/kWh
              </strong>
            </span>
            {groundedLocation ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <Globe className="w-3 h-3 shrink-0" />
                Search-grounded ({groundedLocation}
                {groundedUtility ? ` · ${groundedUtility}` : ''})
              </span>
            ) : (
              <span className="text-slate-500">
                (Use Search lookup above to ground your local utility rate)
              </span>
            )}
          </div>
        </div>

        <div
          className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 text-[11px] font-semibold shrink-0"
          role="group"
          aria-label="Utility rate escalation assumption"
        >
          <button
            type="button"
            onClick={() => setEscalationPct(0)}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              escalationPct === 0
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            0% Flat Rate
          </button>
          <button
            type="button"
            onClick={() => setEscalationPct(3)}
            className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
              escalationPct === 3
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            +3%/yr Grid Inflation
          </button>
        </div>
      </div>

      {/* Selected Year Readout Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs">
        <div className="flex items-center gap-2 font-mono tabular-nums">
          <span className="font-bold text-slate-900">{activePoint.label}:</span>
          <span className="font-bold text-emerald-700">
            ${activePoint.cumulativeSavings.toLocaleString()} cumulative savings
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[11px]">
          <span
            className={
              activePoint.netPosition >= 0
                ? 'font-semibold text-emerald-700'
                : 'font-semibold text-amber-700'
            }
          >
            Net: {activePoint.netPosition >= 0 ? '+' : ''}$
            {activePoint.netPosition.toLocaleString()}
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-700 font-semibold">
            {activePoint.year === 0
              ? 'Initial Investment'
              : activePoint.netPosition >= 0
              ? `${activePoint.roiPct}% Net ROI`
              : `${activePoint.costRecoveredPct}% Cost Recovered`}
          </span>
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-48 select-none"
        role="img"
        aria-label="1, 5, and 10 year cumulative return on investment chart"
      >
        <defs>
          <linearGradient id="roiSavingsArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-Axis Gridlines & Labels */}
        {[0, 0.5, 1].map((ratio) => {
          const val = maxY * ratio;
          const y = toY(val);
          return (
            <g key={ratio}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={ratio === 0 ? '#CBD5E1' : '#E2E8F0'}
                strokeDasharray={ratio === 0 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                className="fill-slate-500 text-[10px] font-mono"
              >
                {formatCompactDollar(val)}
              </text>
            </g>
          );
        })}

        {/* Hardware Cost Break-Even Reference Line */}
        {systemCost > 0 && (
          <g>
            <line
              x1={padLeft}
              y1={costLineY}
              x2={width - padRight}
              y2={costLineY}
              stroke="#D97706"
              strokeWidth="1.5"
              strokeDasharray="5 4"
            />
            <text
              x={width - padRight}
              y={Math.max(padTop + 10, costLineY - 5)}
              textAnchor="end"
              className="fill-amber-700 text-[10px] font-mono font-semibold"
            >
              Cost Basis: ${systemCost.toLocaleString()}
            </text>
          </g>
        )}

        {/* Cumulative Savings Area & Line */}
        <polygon fill="url(#roiSavingsArea)" points={areaPoints} />
        <polyline
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Break-even intersection marker if within 10 years */}
        {effectiveBreakEvenYear > 0 && effectiveBreakEvenYear <= 10 && (
          <g>
            <circle
              cx={toX(effectiveBreakEvenYear)}
              cy={costLineY}
              r="5"
              fill="#D97706"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Interactive Points (Yr 0..Yr 10) with 1, 5, 10 Year Emphasis */}
        {coords.map((pt) => {
          const isMilestone =
            pt.year === 1 || pt.year === 5 || pt.year === 10;
          const isActive = pt.year === hoveredYear;
          return (
            <g
              key={pt.year}
              onMouseEnter={() => setHoveredYear(pt.year)}
              onClick={() => setHoveredYear(pt.year)}
              className="cursor-pointer"
            >
              <rect
                x={pt.x - 20}
                y={padTop}
                width={40}
                height={plotH}
                fill="transparent"
              />
              {isActive && (
                <line
                  x1={pt.x}
                  y1={padTop}
                  x2={pt.x}
                  y2={padTop + plotH}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 5.5 : isMilestone ? 4 : 2.5}
                fill={
                  isActive
                    ? '#059669'
                    : isMilestone
                    ? '#FFFFFF'
                    : '#059669'
                }
                stroke="#059669"
                strokeWidth={isMilestone || isActive ? 2 : 1}
              />
              {(isMilestone || pt.year === 0) && (
                <text
                  x={pt.x}
                  y={height - 6}
                  textAnchor="middle"
                  className={`text-[10px] font-mono ${
                    isActive
                      ? 'fill-slate-900 font-bold'
                      : 'fill-slate-600 font-medium'
                  }`}
                >
                  {pt.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* 1, 5, and 10-Year Milestone Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {milestoneYears.map((yr) => {
          const pt = series[yr];
          const isSelected = hoveredYear === yr;
          const paidOff = pt.netPosition >= 0;
          return (
            <button
              key={yr}
              type="button"
              onClick={() => setHoveredYear(yr)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                isSelected
                  ? 'border-emerald-600 bg-white ring-1 ring-emerald-600/20'
                  : 'border-slate-200 bg-white hover:border-slate-400'
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {yr === 1 ? '1-Year Milestone' : `${yr}-Year Cumulative`}
                </span>
                {paidOff && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                )}
              </div>
              <div className="font-mono text-base font-bold text-emerald-700 tabular-nums mt-1">
                ${pt.cumulativeSavings.toLocaleString()}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-slate-600 mt-0.5">
                {paidOff ? (
                  <span className="text-emerald-700 font-semibold">
                    +${pt.netPosition.toLocaleString()} net ({pt.roiPct}% ROI)
                  </span>
                ) : (
                  <span>
                    {pt.costRecoveredPct}% recovered · $
                    {Math.abs(pt.netPosition).toLocaleString()} left
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
