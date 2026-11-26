import { Cpu, HardDrive, Server, SlidersHorizontal, Zap } from 'lucide-react';

export type LocalAiServerFilterMode = 'all' | 'rack-48v' | 'compact-ups';

interface LocalAiLlmSectionProps {
  matchedCount: number;
  onFilterSolarForServer: (
    mode: LocalAiServerFilterMode,
    scrollTarget: '#top' | '#catalog'
  ) => void;
}

interface LlmTierSpec {
  tier: string;
  modelScope: string;
  gpuVram: string;
  ramStorage: string;
  powerDraw: string;
  solarServerMatch: string;
  filterMode: LocalAiServerFilterMode;
}

const LLM_HARDWARE_TIERS: LlmTierSpec[] = [
  {
    tier: 'Tier 1 · Compact Home / Remote Edge',
    modelScope: '7B – 14B Q4 / 32B MoE (Single-User Offline Chat & Coding)',
    gpuVram: '1× RTX 4060 Ti 16GB, RTX 3090 24GB, or M4 Pro 24–48GB Unified',
    ramStorage: '32–64 GB DDR5 RAM · 1 TB PCIe Gen4 NVMe SSD',
    powerDraw: '45W–95W idle · 300W–480W load (~2.8–4.5 kWh/day)',
    solarServerMatch: 'Quiet 10ms UPS Portable Station (2–4 kWh) + 800W–1.2kW PV',
    filterMode: 'compact-ups',
  },
  {
    tier: 'Tier 2 · Dual-GPU Home AI Workstation',
    modelScope: '32B – 70B Q4_K_M + Local RAG / Vector DB + Whisper/TTS',
    gpuVram: '2× RTX 3090 / 4090 (48 GB VRAM) or Mac Studio 64–128GB Unified',
    ramStorage: '128 GB ECC/DDR5 RAM · 2–4 TB NVMe RAID1 Mirror',
    powerDraw: '110W–160W idle · 750W–1,100W load (~6.5–10.2 kWh/day)',
    solarServerMatch: '48V 5–6 kW Pure-Sine Inverter + 10–15 kWh Server Rack LiFePO4',
    filterMode: 'rack-48v',
  },
  {
    tier: 'Tier 3 · 24/7 Multi-GPU Remote Server Cluster',
    modelScope: '70B – 405B Quantized + Multi-Agent Inference + NAS + Starlink',
    gpuVram: '4× RTX 3090 / A6000 (96–192 GB VRAM) on Threadripper/EPYC',
    ramStorage: '256 GB+ ECC RAM · 8 TB Enterprise NVMe + 10GbE Switch',
    powerDraw: '240W–350W idle · 1,800W–2,600W peak (+ mini-split cooling)',
    solarServerMatch: '12–15 kW 4ms UPS Hybrid Inverter + 28–43 kWh Heated Bank + 6–8 kW Array',
    filterMode: 'rack-48v',
  },
];

export function LocalAiLlmSection({
  matchedCount,
  onFilterSolarForServer,
}: LocalAiLlmSectionProps) {
  return (
    <div
      id="local-ai-llm-setup"
      className="mt-12 pt-10 border-t border-slate-200 space-y-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="font-mono text-xs font-semibold text-amber-700">
            04. Local AI LLM Setup · Offline Compute &amp; Solar Server Sizing
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            Running Local AI LLMs Offline at Home or Remote Sites
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Offline GPU workstations and inference servers demand clean pure-sine
            power, fast UPS switchover (&le;10 ms) to protect active VRAM state,
            and deep 48V LiFePO4 storage for overnight runs. Use the server specs
            and live solar filters below to match power hardware to your compute rig.
          </p>
        </div>

        {/* Interactive Home Server Solar Filter Tool */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="font-semibold text-slate-800 inline-flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
              Filter Solar Hardware as Home AI Server Platform
            </span>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              {matchedCount} Compatible SKUs
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onFilterSolarForServer('all', '#catalog')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors whitespace-nowrap shrink-0"
            >
              <Server className="w-3.5 h-3.5" />
              Filter All Server-Ready Solar ({matchedCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterSolarForServer('rack-48v', '#catalog')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:border-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              48V Rack &amp; UPS Hybrids
            </button>
            <button
              type="button"
              onClick={() => onFilterSolarForServer('compact-ups', '#catalog')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-800 hover:border-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-700" />
              Quiet Home-Office UPS (&le;10ms)
            </button>
            <button
              type="button"
              onClick={() => onFilterSolarForServer('all', '#top')}
              className="text-xs font-semibold text-amber-700 hover:underline px-1.5 whitespace-nowrap shrink-0"
            >
              Score Top 3 for Local AI &uarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Compute + Solar Pairing Spec Table */}
      <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[920px] text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
              <th className="py-3 px-4">Server Tier &amp; Offline Model Scope</th>
              <th className="py-3 px-4">Recommended GPU / Unified Memory</th>
              <th className="py-3 px-4">System RAM &amp; NVMe Storage</th>
              <th className="py-3 px-4">Continuous Power &amp; Daily Wh</th>
              <th className="py-3 px-4">Solar Server Platform Match</th>
              <th className="py-3 px-4 text-right">Apply Filter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 align-top">
            {LLM_HARDWARE_TIERS.map((row) => (
              <tr key={row.tier} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="font-bold text-slate-900">{row.tier}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {row.modelScope}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-800 font-medium">
                  {row.gpuVram}
                </td>
                <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                  <div className="inline-flex items-start gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{row.ramStorage}</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-800 tabular-nums text-[11px]">
                  {row.powerDraw}
                </td>
                <td className="py-3.5 px-4 text-emerald-800 font-medium">
                  {row.solarServerMatch}
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() =>
                      onFilterSolarForServer(row.filterMode, '#catalog')
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-colors"
                  >
                    Filter Matching Hardware
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Three Key Server-Solar Reliability Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div className="font-semibold text-slate-900">
            1. Zero-Reboot UPS Switchover (&le;10 ms)
          </div>
          <p className="text-slate-600 leading-relaxed mt-1">
            Modern 1000W–1600W ATX 3.0 GPU power supplies require pure sine wave
            output and sub-10ms transfer times (e.g., Sol-Ark 4ms, EcoFlow 10ms)
            to avoid kernel panics during grid brownouts.
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div className="font-semibold text-slate-900">
            2. 19&quot; 3U Server Rack Compatibility
          </div>
          <p className="text-slate-600 leading-relaxed mt-1">
            48V 5.12 kWh LiFePO4 modules (EG4 LL-S, SOK PRO, Pytes V5) fit the
            same standard 19-inch server cabinets as 4U GPU chassis and 10GbE
            switches, sharing grounded busbars cleanly.
          </p>
        </div>
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
          <div className="font-semibold text-slate-900">
            3. Low-Idle Inverters &amp; Thermal Headroom
          </div>
          <p className="text-slate-600 leading-relaxed mt-1">
            For 24/7 always-on RAG agents or home endpoints, prioritize low
            no-load standby draw (Victron 18W vs. 52–75W HF hybrids) and size
            5–10 kWh storage to cover overnight inference plus cooling.
          </p>
        </div>
      </div>
    </div>
  );
}
