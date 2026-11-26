import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  Flame,
  Info,
  ShieldCheck,
  Snowflake,
  Thermometer,
  X,
} from 'lucide-react';
import {
  buildThermalPerformanceProfile,
  evaluateIpHumidityAwareness,
  evaluateThermalAtAmbient,
  ThermalZoneLabel,
} from '../data/solarEconomics';
import { SolarProduct } from '../types/solar';

interface ThermalPerformanceChartProps {
  product: SolarProduct;
}

const CLIMATE_PRESETS: { label: string; ambientC: number }[] = [
  { label: 'Arctic Cold (-15°C / 5°F)', ambientC: -15 },
  { label: 'Freezing Frost (0°C / 32°F)', ambientC: 0 },
  { label: 'STC Nominal (25°C / 77°F)', ambientC: 25 },
  { label: 'Desert Peak (45°C / 113°F)', ambientC: 45 },
];

function getZoneTextStyle(zone: ThermalZoneLabel): string {
  switch (zone) {
    case 'Optimal Window':
      return 'text-emerald-700';
    case 'Self-Heating Active':
    case 'Cold Derate':
    case 'Heat Derate':
    case 'Cold Voc Alert':
      return 'text-amber-700';
    case 'Charge Lockout (<0°C)':
    case 'Thermal Throttle':
      return 'text-rose-700';
  }
}

export function ThermalPerformanceChart({
  product,
}: ThermalPerformanceChartProps) {
  const gradId = useId();
  const tooltipId = useId();
  const tooltipContainerRef = useRef<HTMLDivElement | null>(null);

  const [selectedAmbientC, setSelectedAmbientC] = useState<number>(25);
  const [unitScale, setUnitScale] = useState<'C' | 'F'>('C');
  const [roofMounted, setRoofMounted] = useState<boolean>(true);
  const [ipTooltipHover, setIpTooltipHover] = useState<boolean>(false);
  const [ipTooltipPinned, setIpTooltipPinned] = useState<boolean>(false);

  const ipTooltipOpen = ipTooltipHover || ipTooltipPinned;

  useEffect(() => {
    setIpTooltipHover(false);
    setIpTooltipPinned(false);
  }, [product.id]);

  useEffect(() => {
    if (!ipTooltipPinned) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        tooltipContainerRef.current &&
        !tooltipContainerRef.current.contains(e.target as Node)
      ) {
        setIpTooltipPinned(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIpTooltipPinned(false);
        setIpTooltipHover(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [ipTooltipPinned]);

  const profile = useMemo(
    () => buildThermalPerformanceProfile(product, { roofMounted }),
    [product, roofMounted]
  );

  const activePoint = useMemo(
    () =>
      evaluateThermalAtAmbient(product, selectedAmbientC, { roofMounted }),
    [product, selectedAmbientC, roofMounted]
  );

  const ipAssessment = useMemo(
    () => evaluateIpHumidityAwareness(product),
    [product]
  );

  if (!profile || !activePoint) return null;

  const isPanel = profile.mode === 'panel';
  const isBattery = profile.mode === 'battery';
  const isElectronics = profile.mode === 'electronics';

  const width = 620;
  const height = 228;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 22;
  const padBottom = 34;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minC = -20;
  const maxC = 55;
  const minY = 0;
  const maxY = isPanel ? 125 : 110;

  const toX = (c: number) =>
    padLeft + ((c - minC) / (maxC - minC)) * plotW;
  const toY = (pct: number) =>
    padTop + plotH - ((pct - minY) / (maxY - minY)) * plotH;

  const primaryPolyline = profile.points
    .map(
      (pt) =>
        `${toX(pt.ambientC).toFixed(1)},${toY(pt.outputRetentionPct).toFixed(1)}`
    )
    .join(' ');
  const primaryArea = `${toX(minC).toFixed(1)},${(padTop + plotH).toFixed(
    1
  )} ${primaryPolyline} ${toX(maxC).toFixed(1)},${(padTop + plotH).toFixed(1)}`;

  const secondaryPolyline = profile.points
    .map(
      (pt) =>
        `${toX(pt.ambientC).toFixed(1)},${toY(pt.secondaryPct).toFixed(1)}`
    )
    .join(' ');

  const formatTemp = (c: number) => {
    if (unitScale === 'C') return `${c}°C`;
    const f = Math.round((c * 9) / 5 + 32);
    return `${f}°F`;
  };

  const yTicks = isPanel ? [0, 50, 75, 100, 120] : [0, 25, 50, 75, 100];
  const xTicks = [-20, -10, 0, 15, 25, 35, 45, 55];

  return (
    <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
      {/* Header & Controls */}
      <div
        ref={tooltipContainerRef}
        className="relative flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-600 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900">
              Thermal Performance &amp; Extreme-Climate Derating
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isPanel
              ? `Predicted PV wattage and cold-weather Voc shift using ${profile.tempCoeffPctPerC}%/°C cell temperature coefficient.`
              : isBattery
              ? profile.hasSelfHeating
                ? 'Predicted LiFePO4 discharge retention and self-heated charge acceptance across -20°C to 55°C ambient.'
                : 'Predicted LiFePO4 discharge retention and 0°C BMS charge cutoff across -20°C to 55°C ambient.'
              : 'Predicted continuous power output and surge headroom across -20°C to 55°C ambient operating temperatures.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* IP-Rating & High-Humidity Awareness Tooltip Trigger */}
          <button
            type="button"
            onClick={() => setIpTooltipPinned((v) => !v)}
            onMouseEnter={() => setIpTooltipHover(true)}
            onMouseLeave={() => setIpTooltipHover(false)}
            onFocus={() => setIpTooltipHover(true)}
            onBlur={() => setIpTooltipHover(false)}
            aria-expanded={ipTooltipOpen}
            aria-describedby={ipTooltipOpen ? tooltipId : undefined}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              ipAssessment.enclosureClass === 'sealed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-400'
                : ipAssessment.enclosureClass === 'potted-hybrid'
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:border-amber-400'
                : 'bg-sky-50 text-sky-900 border-sky-200 hover:border-sky-400'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 shrink-0" />
            <span>IP &amp; Humidity: {ipAssessment.ratingBadge.split(' ')[0]}</span>
            <Info className="w-3 h-3 opacity-75 shrink-0" />
          </button>

          {ipTooltipOpen && (
            <div
              id={tooltipId}
              role="tooltip"
              onMouseEnter={() => setIpTooltipHover(true)}
              onMouseLeave={() => setIpTooltipHover(false)}
              className="absolute right-0 top-full pt-2 z-30 w-full sm:w-[29rem] max-w-full"
            >
              <div className="bg-slate-900 text-slate-100 border border-slate-700 rounded-lg shadow-xl p-4 space-y-3 text-left">
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      IP-Rating &amp; High-Humidity Awareness
                    </div>
                    <div className="text-[11px] font-mono text-amber-300 mt-0.5">
                      {ipAssessment.ratingBadge} · {ipAssessment.humidityRiskLabel}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIpTooltipPinned(false);
                      setIpTooltipHover(false);
                    }}
                    className="text-slate-400 hover:text-white p-0.5 rounded"
                    aria-label="Close IP rating humidity tooltip"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  {ipAssessment.unitImplication}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-md p-2.5 space-y-1">
                    <div className="text-[11px] font-semibold text-sky-300">
                      Open-Frame Controllers (IP20–IP43)
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {ipAssessment.openControllerGuidance}
                    </p>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700 rounded-md p-2.5 space-y-1">
                    <div className="text-[11px] font-semibold text-emerald-300">
                      Sealed Battery Units (IP65 / IP67)
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {ipAssessment.sealedBatteryGuidance}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                  IP Code Key: 1st digit = solids/dust (2 finger-safe, 6 dust-tight) · 2nd digit = moisture (0 none, 3 spray, 5 water jets, 7 immersion)
                </div>
              </div>
            </div>
          )}

          {isPanel && (
            <div
              className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold shrink-0"
              role="group"
              aria-label="Solar panel mounting airflow"
            >
              <button
                type="button"
                onClick={() => setRoofMounted(true)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                  roofMounted
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Roof Mount (+26°C)
              </button>
              <button
                type="button"
                onClick={() => setRoofMounted(false)}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                  !roofMounted
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ground Rack (+18°C)
              </button>
            </div>
          )}

          <div
            className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold shrink-0"
            role="group"
            aria-label="Temperature scale unit"
          >
            <button
              type="button"
              onClick={() => setUnitScale('C')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                unitScale === 'C'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              °C
            </button>
            <button
              type="button"
              onClick={() => setUnitScale('F')}
              className={`px-2 py-1 rounded transition-colors whitespace-nowrap shrink-0 ${
                unitScale === 'F'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              °F
            </button>
          </div>
        </div>
      </div>

      {/* Climate Quick Presets + Ambient Slider */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-slate-500 mr-1">Climate presets:</span>
          {CLIMATE_PRESETS.map((preset) => {
            const active = selectedAmbientC === preset.ambientC;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setSelectedAmbientC(preset.ambientC)}
                className={`px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-amber-50 border-amber-500 text-amber-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label
            htmlFor="thermal-ambient-slider"
            className="text-xs font-medium text-slate-700 whitespace-nowrap shrink-0"
          >
            Simulated Ambient Temp:
          </label>
          <input
            id="thermal-ambient-slider"
            type="range"
            min={-20}
            max={55}
            step={1}
            value={selectedAmbientC}
            onChange={(e) => setSelectedAmbientC(Number(e.target.value))}
            className="flex-1 accent-amber-600"
          />
          <span className="text-xs font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap shrink-0">
            {selectedAmbientC}°C ({activePoint.ambientF}°F)
          </span>
        </div>

        {/* Live Telemetry Readout Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200 rounded-md px-3 py-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 font-mono tabular-nums">
            <span>
              <span className="text-slate-500">
                {isPanel
                  ? 'Est. Output:'
                  : isBattery
                  ? 'Usable Cap:'
                  : 'Cont. Output:'}
              </span>{' '}
              <strong className="text-emerald-700">
                {isBattery
                  ? `${activePoint.predictedValue.toLocaleString()} Wh (${activePoint.outputRetentionPct}%)`
                  : `${activePoint.predictedValue.toLocaleString()} W (${activePoint.outputRetentionPct}%)`}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              <span className="text-slate-500">
                {isPanel
                  ? 'Est. Voc:'
                  : isBattery
                  ? 'Charge Rate:'
                  : 'Surge Limit:'}
              </span>{' '}
              <strong
                className={
                  isBattery && activePoint.secondaryPct === 0
                    ? 'text-rose-700'
                    : 'text-amber-700'
                }
              >
                {isPanel
                  ? `${activePoint.secondaryValue} V (${activePoint.secondaryPct}% STC)`
                  : `${activePoint.secondaryPct}% (${activePoint.secondaryValue.toLocaleString()} W max)`}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">
              {isPanel
                ? 'Cell Temp:'
                : isBattery
                ? 'Pack Temp:'
                : 'Heatsink:'}{' '}
              <strong className="text-slate-900">
                {formatTemp(activePoint.cellOrPackTempC)}
              </strong>
            </span>
          </div>

          <span
            className={`text-[11px] font-semibold whitespace-nowrap ${getZoneTextStyle(
              activePoint.zone
            )}`}
          >
            {activePoint.zone}
          </span>
        </div>

        {/* Interactive SVG Derating Chart */}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label={`Predicted thermal derating chart for ${product.name} from -20°C to 55°C`}
        >
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Climate Zone Shaded Bands */}
          {isBattery && (
            <>
              <rect
                x={toX(-20)}
                y={padTop}
                width={toX(0) - toX(-20)}
                height={plotH}
                fill={profile.hasSelfHeating ? '#FEF3C7' : '#FFE4E6'}
                fillOpacity="0.45"
              />
              <rect
                x={toX(15)}
                y={padTop}
                width={toX(35) - toX(15)}
                height={plotH}
                fill="#D1FAE5"
                fillOpacity="0.35"
              />
              <rect
                x={toX(40)}
                y={padTop}
                width={toX(55) - toX(40)}
                height={plotH}
                fill="#FEF3C7"
                fillOpacity="0.45"
              />
            </>
          )}

          {isPanel && (
            <>
              <rect
                x={toX(35)}
                y={padTop}
                width={toX(55) - toX(35)}
                height={plotH}
                fill="#FEF3C7"
                fillOpacity="0.45"
              />
              <rect
                x={toX(-20)}
                y={padTop}
                width={toX(0) - toX(-20)}
                height={plotH}
                fill="#E0F2FE"
                fillOpacity="0.45"
              />
            </>
          )}

          {isElectronics && (
            <>
              <rect
                x={toX(0)}
                y={padTop}
                width={toX(35) - toX(0)}
                height={plotH}
                fill="#D1FAE5"
                fillOpacity="0.3"
              />
              <rect
                x={toX(38)}
                y={padTop}
                width={toX(55) - toX(38)}
                height={plotH}
                fill="#FEF3C7"
                fillOpacity="0.45"
              />
            </>
          )}

          {/* Y-Axis Gridlines */}
          {yTicks.map((tick) => {
            const y = toY(tick);
            return (
              <g key={`ty-${tick}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke={tick === 100 ? '#94A3B8' : '#E2E8F0'}
                  strokeDasharray={tick === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* X-Axis Gridlines */}
          {xTicks.map((degC) => {
            const x = toX(degC);
            return (
              <g key={`tx-${degC}`}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + plotH}
                  stroke={degC === 0 || degC === 25 ? '#CBD5E1' : '#E2E8F0'}
                  strokeDasharray={degC === 0 ? '4 2' : '2 3'}
                />
                <text
                  x={x}
                  y={padTop + plotH + 15}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {formatTemp(degC)}
                </text>
              </g>
            );
          })}

          <text
            x={toX(0) + 4}
            y={padTop + 11}
            className="fill-slate-500 text-[9px] font-mono"
          >
            {unitScale === 'C' ? '0°C Freeze' : '32°F Freeze'}
          </text>

          {/* Primary & Secondary Curves */}
          <polygon fill={`url(#${gradId})`} points={primaryArea} />
          <polyline
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPolyline}
          />
          <polyline
            fill="none"
            stroke="#D97706"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={secondaryPolyline}
          />

          {/* Interactive Clickable Sample Nodes */}
          {profile.points.map((pt) => {
            const cx = toX(pt.ambientC);
            return (
              <g
                key={pt.ambientC}
                onMouseEnter={() => setSelectedAmbientC(pt.ambientC)}
                onClick={() => setSelectedAmbientC(pt.ambientC)}
                className="cursor-pointer"
              >
                <rect
                  x={cx - 12}
                  y={padTop}
                  width={24}
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Active Scrubber Crosshair */}
          <line
            x1={toX(activePoint.ambientC)}
            y1={padTop}
            x2={toX(activePoint.ambientC)}
            y2={padTop + plotH}
            stroke="#0F172A"
            strokeWidth="1.25"
            strokeDasharray="3 2"
          />
          <circle
            cx={toX(activePoint.ambientC)}
            cy={toY(activePoint.outputRetentionPct)}
            r="5"
            fill="#059669"
            stroke="#FFFFFF"
            strokeWidth="2"
          />
          <circle
            cx={toX(activePoint.ambientC)}
            cy={toY(activePoint.secondaryPct)}
            r="4.5"
            fill="#D97706"
            stroke="#FFFFFF"
            strokeWidth="1.75"
          />

          <text
            x={padLeft + plotW / 2}
            y={height - 4}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            Ambient Temperature ({unitScale === 'C' ? '°C' : '°F'}) — Hover or
            drag slider to inspect operating point
          </text>
        </svg>

        {/* Legend Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="w-3 h-0.5 bg-emerald-600 inline-block" />
              {isPanel
                ? 'Predicted PV Power (% STC)'
                : isBattery
                ? 'Usable Discharge Capacity (%)'
                : 'Continuous Rated Output (%)'}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-600 inline-block" />
              {isPanel
                ? 'Cold Open-Circuit Voc (% STC)'
                : isBattery
                ? 'Safe Charge Acceptance (%)'
                : 'Peak Surge / Charge Headroom (%)'}
            </span>
          </div>
          <span className="text-slate-500 font-mono text-[10px]">
            {profile.optimalRangeLabel}
          </span>
        </div>
      </div>

      {/* Extreme Cold & Extreme Heat Guidance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Snowflake className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              Extreme Cold Climate Behavior
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              -15°C / 5°F
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {profile.extremeColdSummary}
          </p>
        </div>

        <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              Extreme Heat Climate Behavior
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              +45°C / 113°F
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {profile.extremeHeatSummary}
          </p>
        </div>
      </div>

      {/* Conditional Safety / MPPT Sizing Notice */}
      {isPanel && selectedAmbientC <= 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            Cold-weather Voc sizing note: at {formatTemp(selectedAmbientC)},
            each panel rises to{' '}
            <strong className="font-mono">{activePoint.secondaryValue}V Voc</strong>.
            Ensure total series-string Voc remains below your inverter/MPPT
            maximum cold-morning voltage ceiling.
          </span>
        </div>
      )}

      {isBattery && selectedAmbientC < 0 && !profile.hasSelfHeating && (
        <div className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <span>
            Freezing charge lockout active below 0°C (32°F): this pack does not
            include integrated heating pads, so the BMS will halt solar/AC
            charging until cell temperature warms above freezing.
          </span>
        </div>
      )}
    </div>
  );
}
