import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowUpRight, Box, Scale } from 'lucide-react';
import { SOLAR_PRODUCTS } from '../data/solarCatalog';
import {
  BatteryEnergyDensityPoint,
  buildBatteryEnergyDensityDataset,
} from '../data/solarEconomics';
import { SolarProduct } from '../types/solar';

interface EnergyDensityChartProps {
  currentProduct: SolarProduct;
  catalog?: SolarProduct[];
}

type AxisMetric = 'weight' | 'volume';
type ScopeFilter = 'all' | 'batteries' | 'portable';

function formatCompactWh(wh: number): string {
  if (wh >= 10000) return `${(wh / 1000).toFixed(0)}k`;
  if (wh >= 1000) return `${(wh / 1000).toFixed(1)}k`;
  return String(Math.round(wh));
}

function getIsoContours(
  axisMetric: AxisMetric,
  maxX: number,
  maxY: number
): { label: string; slope: number; x2: number; y2: number }[] {
  // slope = Wh per X-unit (Wh/lb in weight mode, Wh/L in volume mode)
  const targets =
    axisMetric === 'weight'
      ? [
          { label: '130 Wh/kg', slope: 130 * 0.45359237 }, // ~58.97 Wh/lb
          { label: '105 Wh/kg', slope: 105 * 0.45359237 }, // ~47.63 Wh/lb
          { label: '80 Wh/kg', slope: 80 * 0.45359237 }, // ~36.29 Wh/lb
        ]
      : [
          { label: '180 Wh/L', slope: 180 },
          { label: '130 Wh/L', slope: 130 },
          { label: '85 Wh/L', slope: 85 },
        ];

  return targets.map((t) => {
    const yAtMaxX = t.slope * maxX;
    if (yAtMaxX <= maxY) {
      return { label: t.label, slope: t.slope, x2: maxX, y2: yAtMaxX };
    }
    return { label: t.label, slope: t.slope, x2: maxY / t.slope, y2: maxY };
  });
}

export function EnergyDensityChart({
  currentProduct,
  catalog = SOLAR_PRODUCTS,
}: EnergyDensityChartProps) {
  const clipId = useId();
  const [axisMetric, setAxisMetric] = useState<AxisMetric>('weight');
  const [scope, setScope] = useState<ScopeFilter>('all');
  const [zoomCompact, setZoomCompact] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string>(currentProduct.id);

  useEffect(() => {
    setSelectedId(currentProduct.id);
    setZoomCompact(false);
  }, [currentProduct.id]);

  const allDataset = useMemo(
    () => buildBatteryEnergyDensityDataset(catalog),
    [catalog]
  );

  const currentPoint = useMemo(
    () => allDataset.find((d) => d.id === currentProduct.id) ?? null,
    [allDataset, currentProduct.id]
  );

  const visiblePoints = useMemo(() => {
    return allDataset.filter((d) => {
      if (d.id === currentProduct.id) return true;
      if (scope !== 'all' && d.category !== scope) return false;
      if (zoomCompact && d.capacityWh > 6000) return false;
      return true;
    });
  }, [allDataset, currentProduct.id, scope, zoomCompact]);

  const hasOver6kWh = useMemo(
    () => allDataset.some((d) => d.capacityWh > 6000),
    [allDataset]
  );

  const activePoint: BatteryEnergyDensityPoint | null = useMemo(() => {
    return (
      visiblePoints.find((d) => d.id === selectedId) ??
      currentPoint ??
      visiblePoints[0] ??
      null
    );
  }, [visiblePoints, selectedId, currentPoint]);

  // Rank currentProduct across all LiFePO4 models
  const rankings = useMemo(() => {
    const byWeight = [...allDataset].sort(
      (a, b) => b.gravimetricWhPerKg - a.gravimetricWhPerKg
    );
    const byVolume = [...allDataset].sort(
      (a, b) => b.volumetricWhPerLiter - a.volumetricWhPerLiter
    );
    const weightRank =
      byWeight.findIndex((d) => d.id === currentProduct.id) + 1;
    const volumeRank =
      byVolume.findIndex((d) => d.id === currentProduct.id) + 1;
    return {
      total: allDataset.length,
      weightRank: weightRank > 0 ? weightRank : 1,
      volumeRank: volumeRank > 0 ? volumeRank : 1,
      avgWhPerKg:
        allDataset.length > 0
          ? Number(
              (
                allDataset.reduce((s, d) => s + d.gravimetricWhPerKg, 0) /
                allDataset.length
              ).toFixed(1)
            )
          : 0,
      avgWhPerLiter:
        allDataset.length > 0
          ? Number(
              (
                allDataset.reduce((s, d) => s + d.volumetricWhPerLiter, 0) /
                allDataset.length
              ).toFixed(1)
            )
          : 0,
    };
  }, [allDataset, currentProduct.id]);

  const sortedPeers = useMemo(() => {
    const list = visiblePoints.filter((d) =>
      scope === 'all' ? true : d.category === scope || d.id === currentProduct.id
    );
    return [...list].sort((a, b) =>
      axisMetric === 'weight'
        ? b.gravimetricWhPerKg - a.gravimetricWhPerKg
        : b.volumetricWhPerLiter - a.volumetricWhPerLiter
    );
  }, [visiblePoints, scope, currentProduct.id, axisMetric]);

  if (!currentPoint || allDataset.length === 0) return null;

  // SVG Geometry
  const width = 620;
  const height = 276;
  const padLeft = 52;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const getXVal = (pt: BatteryEnergyDensityPoint) =>
    axisMetric === 'weight' ? pt.weightLbs : pt.volumeLiters;

  const rawMaxX = Math.max(...visiblePoints.map(getXVal), 50);
  const rawMaxY = Math.max(...visiblePoints.map((d) => d.capacityWh), 3000);
  const maxX = Math.ceil((rawMaxX * 1.12) / 10) * 10;
  const maxY = Math.ceil((rawMaxY * 1.14) / 500) * 500;

  const toX = (val: number) =>
    padLeft + Math.min(1, Math.max(0, val / maxX)) * plotW;
  const toY = (wh: number) =>
    padTop + plotH - Math.min(1, Math.max(0, wh / maxY)) * plotH;

  const contours = getIsoContours(axisMetric, maxX, maxY);

  const deltaPctVsCurrent =
    activePoint && currentPoint && activePoint.id !== currentPoint.id
      ? axisMetric === 'weight'
        ? ((activePoint.gravimetricWhPerKg - currentPoint.gravimetricWhPerKg) /
            currentPoint.gravimetricWhPerKg) *
          100
        : ((activePoint.volumetricWhPerLiter -
            currentPoint.volumetricWhPerLiter) /
            currentPoint.volumetricWhPerLiter) *
          100
      : null;

  const batteryCount = allDataset.filter(
    (d) => d.category === 'batteries'
  ).length;
  const portableCount = allDataset.filter(
    (d) => d.category === 'portable'
  ).length;

  return (
    <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {axisMetric === 'weight' ? (
              <Scale className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <Box className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <h3 className="text-sm font-bold text-slate-900">
              Energy Density &amp; Portability Benchmark
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Plots rated capacity (Wh) against{' '}
            {axisMetric === 'weight'
              ? 'chassis weight (lbs / kg)'
              : 'enclosure volume (liters)'}{' '}
            across LiFePO4 battery models. Points higher above diagonal contours
            pack more energy per unit{' '}
            {axisMetric === 'weight' ? 'weight' : 'space'}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Axis Dimension Switch */}
          <div
            className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold shrink-0"
            role="group"
            aria-label="Energy density comparison axis"
          >
            <button
              type="button"
              onClick={() => setAxisMetric('weight')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                axisMetric === 'weight'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wh vs Weight (lbs)
            </button>
            <button
              type="button"
              onClick={() => setAxisMetric('volume')}
              className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                axisMetric === 'volume'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Wh vs Volume (L)
            </button>
          </div>

          {/* Scope Filter */}
          <div
            className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold shrink-0"
            role="group"
            aria-label="Filter LiFePO4 models in chart"
          >
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                scope === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allDataset.length})
            </button>
            <button
              type="button"
              onClick={() => setScope('batteries')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                scope === 'batteries'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Batteries ({batteryCount})
            </button>
            <button
              type="button"
              onClick={() => setScope('portable')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                scope === 'portable'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Portable ({portableCount})
            </button>
          </div>

          {hasOver6kWh && currentPoint.capacityWh <= 6000 && scope !== 'portable' && (
            <button
              type="button"
              onClick={() => setZoomCompact((v) => !v)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                zoomCompact
                  ? 'bg-amber-50 text-amber-800 border-amber-400'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              {zoomCompact ? 'Showing ≤6 kWh' : 'Zoom ≤6 kWh'}
            </button>
          )}
        </div>
      </div>

      {/* 3-Card Metric Summary for Current Product */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
          <div className="text-[11px] font-medium text-slate-500">
            Gravimetric Specific Energy
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {currentPoint.gravimetricWhPerKg}
            </span>
            <span className="text-xs font-mono text-slate-500">Wh/kg</span>
            <span className="text-xs font-mono text-slate-400 tabular-nums ml-auto">
              {currentPoint.gravimetricWhPerLb} Wh/lb
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-1 tabular-nums">
            Rank #{rankings.weightRank} of {rankings.total} · Avg{' '}
            {rankings.avgWhPerKg} Wh/kg
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
          <div className="text-[11px] font-medium text-slate-500">
            Volumetric Energy Density
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {currentPoint.volumetricWhPerLiter}
            </span>
            <span className="text-xs font-mono text-slate-500">Wh/L</span>
            <span className="text-xs font-mono text-slate-400 tabular-nums ml-auto">
              {currentPoint.volumeLiters} L
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-1 tabular-nums">
            Rank #{rankings.volumeRank} of {rankings.total} · Avg{' '}
            {rankings.avgWhPerLiter} Wh/L
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/70">
          <div className="text-[11px] font-medium text-slate-500">
            Portability Footprint Class
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            {currentPoint.portabilityTier}
          </div>
          <div className="text-[11px] font-mono text-slate-600 mt-1 tabular-nums">
            {currentPoint.weightLbs} lbs ({currentPoint.weightKg} kg) ·{' '}
            {currentPoint.volumeCuFt} ft³
          </div>
        </div>
      </div>

      {/* Scatter Plot + Active Telemetry Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
        {activePoint && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span
                className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                  activePoint.id === currentProduct.id
                    ? 'bg-amber-500 ring-2 ring-amber-200'
                    : activePoint.category === 'batteries'
                    ? 'bg-emerald-600'
                    : 'bg-slate-700'
                }`}
              />
              <span className="font-bold text-slate-900 truncate">
                {activePoint.name}
              </span>
              {activePoint.id === currentProduct.id && (
                <span className="text-[11px] font-semibold text-amber-700">
                  (Current Unit)
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums text-[11px] text-slate-700">
              <span>
                <strong className="text-slate-900">
                  {activePoint.capacityWh.toLocaleString()}
                </strong>{' '}
                Wh
              </span>
              <span className="text-slate-300">|</span>
              <span>
                <strong className="text-slate-900">
                  {activePoint.weightLbs} lbs
                </strong>{' '}
                ({activePoint.weightKg} kg)
              </span>
              <span className="text-slate-300">|</span>
              <span>
                <strong className="text-slate-900">
                  {activePoint.volumeLiters} L
                </strong>
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-semibold text-emerald-700">
                {axisMetric === 'weight'
                  ? `${activePoint.gravimetricWhPerKg} Wh/kg (${activePoint.gravimetricWhPerLb} Wh/lb)`
                  : `${activePoint.volumetricWhPerLiter} Wh/L`}
              </span>
              {deltaPctVsCurrent !== null && (
                <>
                  <span className="text-slate-300">|</span>
                  <span
                    className={`font-semibold ${
                      deltaPctVsCurrent >= 0
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {deltaPctVsCurrent >= 0 ? '+' : ''}
                    {deltaPctVsCurrent.toFixed(1)}% vs current
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label={`LiFePO4 energy density scatter plot comparing capacity in watt-hours against ${
            axisMetric === 'weight' ? 'weight in pounds' : 'volume in liters'
          }`}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={padLeft} y={padTop} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Horizontal Y-Axis Gridlines (Capacity Wh) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = maxY * ratio;
            const y = toY(val);
            return (
              <g key={`y-${ratio}`}>
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
                  {formatCompactWh(val)}
                </text>
              </g>
            );
          })}

          {/* Vertical X-Axis Gridlines (Weight lbs or Volume L) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const val = Math.round(maxX * ratio);
            const x = toX(val);
            return (
              <g key={`x-${ratio}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotH}
                  stroke={ratio === 0 ? '#CBD5E1' : '#E2E8F0'}
                  strokeDasharray={ratio === 0 ? undefined : '3 3'}
                />
                <text
                  x={x}
                  y={padTop + plotH + 15}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {val}
                  {axisMetric === 'weight' ? ' lb' : ' L'}
                </text>
              </g>
            );
          })}

          {/* Iso-Density Diagonal Benchmark Rays (Slope = Wh per unit weight/volume) */}
          <g clipPath={`url(#${clipId})`}>
            {contours.map((c) => {
              const x1 = toX(0);
              const y1 = toY(0);
              const x2 = toX(c.x2);
              const y2 = toY(c.y2);
              const labelX = toX(c.x2 * 0.84);
              const labelY = toY(c.y2 * 0.84) - 5;
              return (
                <g key={c.label}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#94A3B8"
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={labelX}
                    y={Math.max(padTop + 11, labelY)}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px] font-mono"
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Axis Titles */}
          <text
            x={padLeft - 8}
            y={padTop - 6}
            textAnchor="end"
            className="fill-slate-600 text-[9px] font-mono font-semibold"
          >
            Wh
          </text>
          <text
            x={padLeft + plotW / 2}
            y={height - 5}
            textAnchor="middle"
            className="fill-slate-600 text-[10px] font-medium"
          >
            {axisMetric === 'weight'
              ? 'Total Unit Weight (lbs) — Lighter is Left'
              : 'Enclosure Volume (Liters) — More Compact is Left'}
          </text>

          {/* Crosshair Guide for Active Inspected Point */}
          {activePoint && (
            <g>
              <line
                x1={toX(getXVal(activePoint))}
                y1={padTop}
                x2={toX(getXVal(activePoint))}
                y2={padTop + plotH}
                stroke="#D97706"
                strokeOpacity="0.4"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1={padLeft}
                y1={toY(activePoint.capacityWh)}
                x2={width - padRight}
                y2={toY(activePoint.capacityWh)}
                stroke="#D97706"
                strokeOpacity="0.4"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            </g>
          )}

          {/* Plot Peer Points First, Active & Current On Top */}
          {[...visiblePoints]
            .sort((a, b) => {
              const scoreA =
                (a.id === currentProduct.id ? 2 : 0) +
                (a.id === activePoint?.id ? 1 : 0);
              const scoreB =
                (b.id === currentProduct.id ? 2 : 0) +
                (b.id === activePoint?.id ? 1 : 0);
              return scoreA - scoreB;
            })
            .map((pt) => {
              const cx = toX(getXVal(pt));
              const cy = toY(pt.capacityWh);
              const isCurrent = pt.id === currentProduct.id;
              const isSelected = activePoint?.id === pt.id;
              const fillColor = isCurrent
                ? '#D97706'
                : pt.category === 'batteries'
                ? '#059669'
                : '#334155';

              const labelNearRightEdge = cx > width - padRight - 115;

              return (
                <g
                  key={pt.id}
                  onMouseEnter={() => setSelectedId(pt.id)}
                  onClick={() => setSelectedId(pt.id)}
                  className="cursor-pointer"
                >
                  <circle cx={cx} cy={cy} r={14} fill="transparent" />
                  {(isCurrent || isSelected) && (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isCurrent ? 10 : 8.5}
                      fill="none"
                      stroke={isCurrent ? '#D97706' : '#0F172A'}
                      strokeOpacity="0.35"
                      strokeWidth="2"
                    />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isCurrent ? 6.5 : isSelected ? 5.5 : 4.5}
                    fill={fillColor}
                    stroke="#FFFFFF"
                    strokeWidth="1.75"
                  />
                  {(isCurrent || isSelected) && (
                    <text
                      x={labelNearRightEdge ? cx - 10 : cx + 10}
                      y={cy + 3.5}
                      textAnchor={labelNearRightEdge ? 'end' : 'start'}
                      className={`text-[10px] font-semibold ${
                        isCurrent ? 'fill-amber-800' : 'fill-slate-900'
                      }`}
                    >
                      {pt.shortLabel}
                    </text>
                  )}
                </g>
              );
            })}
        </svg>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200" />
              Current Unit
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              LiFePO4 Batteries
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              Portable Stations
            </span>
          </div>
          <span className="text-slate-500">
            Click or hover any point to compare density
          </span>
        </div>
      </div>

      {/* Compact Interactive Portability Leaderboard */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-900">
            LiFePO4 Portability Ranking (
            {axisMetric === 'weight'
              ? 'Sorted by Wh/kg Specific Energy'
              : 'Sorted by Wh/L Volumetric Density'}
            )
          </span>
          <span className="text-[11px] text-slate-500">
            Click any model to inspect on chart
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedPeers.map((peer, index) => {
            const isCurrent = peer.id === currentProduct.id;
            const isSelected = activePoint?.id === peer.id;
            const primaryMetric =
              axisMetric === 'weight'
                ? `${peer.gravimetricWhPerKg} Wh/kg`
                : `${peer.volumetricWhPerLiter} Wh/L`;
            const secondaryMetric =
              axisMetric === 'weight'
                ? `${peer.weightLbs} lbs · ${peer.capacityWh.toLocaleString()} Wh`
                : `${peer.volumeLiters} L · ${peer.capacityWh.toLocaleString()} Wh`;

            return (
              <button
                key={peer.id}
                type="button"
                onClick={() => setSelectedId(peer.id)}
                className={`text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/70'
                    : isCurrent
                    ? 'border-amber-300 bg-amber-50/30 hover:border-amber-500'
                    : 'border-slate-200 bg-white hover:border-slate-400'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                      #{index + 1}
                    </span>
                    <span className="font-semibold text-slate-900 truncate">
                      {peer.shortLabel}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 tabular-nums mt-0.5 truncate">
                    {secondaryMetric}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-mono tabular-nums text-emerald-700 flex items-center justify-end gap-0.5">
                    {primaryMetric}
                    {isSelected && (
                      <ArrowUpRight className="w-3 h-3 text-amber-700" />
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isCurrent
                      ? 'Inspecting'
                      : peer.category === 'batteries'
                      ? 'Battery'
                      : 'Portable'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
