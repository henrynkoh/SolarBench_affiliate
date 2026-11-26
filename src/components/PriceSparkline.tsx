import { useState } from 'react';
import { PriceHistoryPoint } from '../types/solar';

interface PriceSparklineProps {
  data: PriceHistoryPoint[];
  width?: number;
  height?: number;
}

export function PriceSparkline({
  data,
  width = 112,
  height = 32,
}: PriceSparklineProps) {
  if (!data || data.length < 2) return null;

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const padY = 4;

  const points = data
    .map((point, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y =
        height - padY - ((point.price - min) / range) * (height - padY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const isLower = lastPrice <= firstPrice;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-label={`90-day price trend from $${firstPrice} to $${lastPrice}`}
    >
      <polyline
        fill="none"
        stroke={isLower ? '#059669' : '#D97706'}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle
        cx={width}
        cy={
          height - padY - ((lastPrice - min) / range) * (height - padY * 2)
        }
        r="2.5"
        fill={isLower ? '#059669' : '#D97706'}
      />
    </svg>
  );
}

export function PriceHistoryChart({ data }: { data: PriceHistoryPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number>(data.length - 1);

  if (!data || data.length < 2) return null;

  const width = 560;
  const height = 160;
  const padX = 16;
  const padY = 20;

  const prices = data.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const coords = data.map((point, idx) => {
    const x = padX + (idx / (data.length - 1)) * (width - padX * 2);
    const y =
      height - padY - ((point.price - min) / range) * (height - padY * 2);
    return { ...point, x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const areaPoints = `${padX},${height - padY} ${polylinePoints} ${
    width - padX
  },${height - padY}`;

  const activePoint = coords[hoveredIdx] ?? coords[coords.length - 1];
  const avgPrice = Math.round(
    prices.reduce((acc, p) => acc + p, 0) / prices.length
  );

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
        <div>
          <p className="text-xs font-medium text-slate-500">
            90-Day Landed Price Index
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg font-semibold text-slate-900 font-mono tabular-nums">
              ${activePoint.price.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500">
              on {activePoint.date}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
          <span>90d High: ${max.toLocaleString()}</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span>90d Avg: ${avgPrice.toLocaleString()}</span>
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span className="text-emerald-700 font-medium">
            90d Low: ${min.toLocaleString()}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-36 select-none"
        role="img"
        aria-label="90-day historical price chart"
      >
        <defs>
          <linearGradient id="priceAreaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          y1={padY}
          x2={width - padX}
          y2={padY}
          stroke="#E2E8F0"
          strokeDasharray="3 3"
        />
        <line
          x1={padX}
          y1={height / 2}
          x2={width - padX}
          y2={height / 2}
          stroke="#E2E8F0"
          strokeDasharray="3 3"
        />
        <line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke="#CBD5E1"
        />

        <polygon fill="url(#priceAreaGrad)" points={areaPoints} />
        <polyline
          fill="none"
          stroke="#059669"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {coords.map((pt, idx) => {
          const isActive = idx === hoveredIdx;
          return (
            <g
              key={pt.date}
              onMouseEnter={() => setHoveredIdx(idx)}
              onClick={() => setHoveredIdx(idx)}
              className="cursor-pointer"
            >
              <rect
                x={pt.x - 24}
                y={0}
                width={48}
                height={height}
                fill="transparent"
              />
              {isActive && (
                <line
                  x1={pt.x}
                  y1={padY}
                  x2={pt.x}
                  y2={height - padY}
                  stroke="#94A3B8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isActive ? 4.5 : 3}
                fill={isActive ? '#059669' : '#FFFFFF'}
                stroke="#059669"
                strokeWidth="2"
              />
            </g>
          );
        })}
      </svg>

      <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1 px-2">
        {coords.map((pt, idx) => (
          <button
            key={pt.date}
            type="button"
            onClick={() => setHoveredIdx(idx)}
            className={`hover:text-slate-900 transition-colors ${
              idx === hoveredIdx ? 'text-slate-900 font-semibold' : ''
            }`}
          >
            {pt.date}
          </button>
        ))}
      </div>
    </div>
  );
}
