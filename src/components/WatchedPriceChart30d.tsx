import { useId, useMemo, useState } from 'react';
import { Product30DayPriceSummary } from '../data/solarEconomics';

interface WatchedPriceChart30dProps {
  summary: Product30DayPriceSummary;
  targetPrice: number;
  productName: string;
  isTriggered: boolean;
  onApplyTargetPrice?: (newTarget: number) => void;
  compact?: boolean;
}

export function WatchedPriceChart30d({
  summary,
  targetPrice,
  productName,
  isTriggered,
  onApplyTargetPrice,
  compact = false,
}: WatchedPriceChart30dProps) {
  const uid = useId().replace(/:/g, '');
  const { points, low30d, low30dDate, high30d, avg30d, currentPrice, changePct } =
    summary;

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);

  const activeIdx = pinnedIdx ?? hoveredIdx ?? points.length - 1;
  const activePoint = points[activeIdx] ?? points[points.length - 1];

  const width = 540;
  const height = compact ? 72 : 88;
  const padX = 10;
  const padTop = 12;
  const padBottom = 10;

  const chartMath = useMemo(() => {
    const prices = points.map((p) => p.price);
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const rawSpread = Math.max(12, rawMax - rawMin);

    const hasValidTarget = Number.isFinite(targetPrice) && targetPrice > 0;
    const targetInBand =
      hasValidTarget &&
      targetPrice >= rawMin - rawSpread * 1.4 &&
      targetPrice <= rawMax + rawSpread * 1.4;

    const domainBaseMin = targetInBand ? Math.min(rawMin, targetPrice) : rawMin;
    const domainBaseMax = targetInBand ? Math.max(rawMax, targetPrice) : rawMax;
    const baseSpan = Math.max(12, domainBaseMax - domainBaseMin);
    const domainMin = domainBaseMin - baseSpan * 0.12;
    const domainMax = domainBaseMax + baseSpan * 0.12;
    const span = Math.max(1, domainMax - domainMin);

    const plotW = width - padX * 2;
    const plotH = height - padTop - padBottom;

    const coords = points.map((pt, idx) => {
      const x = padX + (idx / Math.max(1, points.length - 1)) * plotW;
      const y = height - padBottom - ((pt.price - domainMin) / span) * plotH;
      return { ...pt, x, y };
    });

    const polylinePoints = coords
      .map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`)
      .join(' ');
    const areaPoints = `${padX},${height - padBottom} ${polylinePoints} ${
      width - padX
    },${height - padBottom}`;

    let targetY: number | null = null;
    if (hasValidTarget) {
      if (targetInBand) {
        targetY =
          height - padBottom - ((targetPrice - domainMin) / span) * plotH;
      } else if (targetPrice < rawMin) {
        targetY = height - padBottom + 2;
      } else {
        targetY = padTop - 2;
      }
    }

    return {
      coords,
      polylinePoints,
      areaPoints,
      targetY,
      targetInBand,
      targetBelowBand: hasValidTarget && !targetInBand && targetPrice < rawMin,
    };
  }, [points, targetPrice, width, height, padX, padTop, padBottom]);

  if (points.length < 2) return null;

  const isDowntrend = changePct <= 0;
  const lineColor = isDowntrend ? '#059669' : '#0284C7';
  const targetColor = isTriggered ? '#059669' : '#D97706';

  const activeCoord =
    chartMath.coords[activeIdx] ?? chartMath.coords[chartMath.coords.length - 1];

  const diffFromTarget = activePoint.price - targetPrice;
  const diffPctFromTarget =
    targetPrice > 0
      ? Math.abs((diffFromTarget / targetPrice) * 100).toFixed(1)
      : '0.0';

  const range30d = Math.max(1, high30d - low30d);
  const targetPercentile = Math.round(((targetPrice - low30d) / range30d) * 100);
  const pctBelow30dLow =
    low30d > 0 ? (((low30d - targetPrice) / low30d) * 100).toFixed(1) : '0.0';

  let justificationText = '';
  if (isTriggered) {
    const savedBelow = Math.max(0, targetPrice - currentPrice);
    justificationText = `Target triggered: Live lowest $${currentPrice.toLocaleString()} is ${
      savedBelow > 0
        ? `$${savedBelow.toLocaleString()} below`
        : 'at'
    } your $${targetPrice.toLocaleString()} watch threshold.`;
  } else if (targetPrice <= low30d) {
    justificationText =
      targetPrice === low30d
        ? `Anchored to 30-day low ($${low30d.toLocaleString()} on ${low30dDate}) across the $${low30d.toLocaleString()}–$${high30d.toLocaleString()} range.`
        : `Target $${targetPrice.toLocaleString()} sits ${pctBelow30dLow}% below the 30-day low ($${low30d.toLocaleString()} on ${low30dDate}).`;
  } else {
    const clampedPct = Math.min(100, Math.max(0, targetPercentile));
    justificationText = `Target $${targetPrice.toLocaleString()} sits at the ${clampedPct}th percentile of the 30-day $${low30d.toLocaleString()}–$${high30d.toLocaleString()} band.`;
  }

  const handleSvgPointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const ratio = Math.min(1, Math.max(0, (relX - padX) / (width - padX * 2)));
    const nearest = Math.round(ratio * (points.length - 1));
    setHoveredIdx(nearest);
  };

  const handleSvgClick = () => {
    const idx = hoveredIdx ?? points.length - 1;
    setPinnedIdx((prev) => (prev === idx ? null : idx));
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = Math.max(0, activeIdx - 1);
      setPinnedIdx(next);
      setHoveredIdx(next);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = Math.min(points.length - 1, activeIdx + 1);
      setPinnedIdx(next);
      setHoveredIdx(next);
    } else if (e.key === 'Escape' && pinnedIdx !== null) {
      e.stopPropagation();
      setPinnedIdx(null);
    }
  };

  const tickIndices = [0, 10, 20, points.length - 1];

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-2">
      {/* Top Bar: Active Day Readout + 30d Summary Metrics */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[11px]">
        <div className="flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
          <span className="font-sans font-semibold text-slate-700">
            30-Day Trend
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="font-semibold text-slate-900">
            {activePoint.date}: ${activePoint.price.toLocaleString()}
          </span>
          {pinnedIdx !== null && (
            <button
              type="button"
              onClick={() => setPinnedIdx(null)}
              className="font-sans text-[10px] text-amber-700 underline hover:text-amber-900"
            >
              Reset
            </button>
          )}
          <span
            className={
              diffFromTarget <= 0 ? 'text-emerald-700' : 'text-slate-500'
            }
          >
            {diffFromTarget === 0
              ? '(At target)'
              : diffFromTarget < 0
              ? `(-$${Math.abs(diffFromTarget).toLocaleString()} / -${diffPctFromTarget}% vs target)`
              : `(+$${diffFromTarget.toLocaleString()} / +${diffPctFromTarget}% above target)`}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums text-slate-600">
          <span>High ${high30d.toLocaleString()}</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>Avg ${avg30d.toLocaleString()}</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-emerald-700 font-semibold">
            Low ${low30d.toLocaleString()}
          </span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span
            className={
              changePct <= 0
                ? 'text-emerald-700 font-semibold'
                : 'text-amber-700 font-semibold'
            }
          >
            {changePct > 0 ? `+${changePct}%` : `${changePct}%`} (30d)
          </span>
        </div>
      </div>

      {/* Interactive 30-Day SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className={`w-full ${
            compact ? 'h-16' : 'h-20'
          } select-none cursor-crosshair focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded`}
          role="img"
          tabIndex={0}
          aria-label={`Interactive 30-day price history chart for ${productName}. Current price $${currentPrice}, target price $${targetPrice}. Use left and right arrow keys to inspect daily prices.`}
          onMouseMove={handleSvgPointerMove}
          onMouseLeave={() => setHoveredIdx(null)}
          onClick={handleSvgClick}
          onKeyDown={handleKeyDown}
        >
          <defs>
            <linearGradient id={`grad-${uid}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.18" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Subtle background horizontal guides */}
          <line
            x1={padX}
            y1={padTop}
            x2={width - padX}
            y2={padTop}
            stroke="#E2E8F0"
            strokeDasharray="2 3"
          />
          <line
            x1={padX}
            y1={(padTop + (height - padBottom)) / 2}
            x2={width - padX}
            y2={(padTop + (height - padBottom)) / 2}
            stroke="#E2E8F0"
            strokeDasharray="2 3"
          />
          <line
            x1={padX}
            y1={height - padBottom}
            x2={width - padX}
            y2={height - padBottom}
            stroke="#CBD5E1"
          />

          {/* Area & 30d Price Polyline */}
          <polygon fill={`url(#grad-${uid})`} points={chartMath.areaPoints} />
          <polyline
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={chartMath.polylinePoints}
          />

          {/* Target Price Reference Line */}
          {chartMath.targetY !== null && (
            <g>
              <line
                x1={padX}
                y1={chartMath.targetY}
                x2={width - padX}
                y2={chartMath.targetY}
                stroke={targetColor}
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              <text
                x={width - padX - 2}
                y={
                  chartMath.targetY > height - 20
                    ? chartMath.targetY - 4
                    : chartMath.targetY + 10
                }
                textAnchor="end"
                fill={targetColor}
                fontSize="9.5"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                fontWeight="600"
              >
                {chartMath.targetBelowBand
                  ? `Target $${targetPrice.toLocaleString()} (-${pctBelow30dLow}% vs 30d low)`
                  : `Target $${targetPrice.toLocaleString()}`}
              </text>
            </g>
          )}

          {/* Active Day Crosshair & Marker */}
          <line
            x1={activeCoord.x}
            y1={padTop - 2}
            x2={activeCoord.x}
            y2={height - padBottom}
            stroke="#64748B"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          <circle
            cx={activeCoord.x}
            cy={activeCoord.y}
            r="5.5"
            fill={lineColor}
            fillOpacity="0.18"
          />
          <circle
            cx={activeCoord.x}
            cy={activeCoord.y}
            r="3"
            fill="#FFFFFF"
            stroke={lineColor}
            strokeWidth="2"
          />
        </svg>

        {/* Clean X-Axis Date Labels */}
        <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-slate-400 px-1 mt-0.5">
          {tickIndices.map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setPinnedIdx(idx)}
              className={`hover:text-slate-800 transition-colors ${
                activeIdx === idx ? 'text-slate-700 font-semibold' : ''
              }`}
            >
              {points[idx]?.date}
            </button>
          ))}
        </div>
      </div>

      {/* Target Justification & One-Click Historical Target Refinement */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-0.5">
        <p className="text-slate-600 leading-snug">{justificationText}</p>

        {onApplyTargetPrice && (
          <div className="flex items-center gap-1.5 shrink-0">
            {pinnedIdx !== null && activePoint.price !== targetPrice && (
              <button
                type="button"
                onClick={() => onApplyTargetPrice(activePoint.price)}
                className="px-2 py-0.5 rounded border border-slate-300 bg-white font-mono tabular-nums text-slate-700 hover:border-amber-500 hover:text-amber-800 transition-colors whitespace-nowrap"
              >
                Use {activePoint.date} (${activePoint.price.toLocaleString()})
              </button>
            )}
            {targetPrice !== low30d && (
              <button
                type="button"
                onClick={() => onApplyTargetPrice(low30d)}
                className="px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 font-mono tabular-nums text-emerald-800 hover:border-emerald-400 transition-colors whitespace-nowrap"
              >
                Snap to 30d Low (${low30d.toLocaleString()})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
