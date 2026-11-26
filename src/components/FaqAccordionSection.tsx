import { useState } from 'react';
import { ChevronDown, HelpCircle, ShieldCheck, Sun, Wrench } from 'lucide-react';
import { SwarmAgentId } from '../types/solar';

type FaqCategory = 'all' | 'installation' | 'battery-safety' | 'maintenance';

interface FaqItem {
  id: string;
  category: Exclude<FaqCategory, 'all'>;
  categoryLabel: string;
  question: string;
  answer: string;
  keyTakeaway: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'panel-voc-sizing',
    category: 'installation',
    categoryLabel: 'Solar Panel Installation',
    question:
      'How do I size solar panel string voltage (Voc) so winter cold does not damage my MPPT inverter?',
    answer:
      'Solar panel Open-Circuit Voltage (Voc) rises as ambient temperatures drop—typically +0.25% to +0.35% per °C below 25°C. Always multiply the array series Voc by a cold-weather safety factor (typically 1.15× to 1.25× depending on your record low temperature per NEC 690.7) and confirm the adjusted figure stays strictly below your inverter or MPPT charge controller maximum PV input (e.g., stay under ~415V on a 500V MPPT). When series Voc gets close to the limit, split panels into two equal parallel strings (e.g., 2× 6S instead of 1× 12S).',
    keyTakeaway: 'Keep cold-adjusted series Voc at least 15–20% below MPPT max voltage.',
  },
  {
    id: 'roof-vs-ground-bifacial',
    category: 'installation',
    categoryLabel: 'Solar Panel Installation',
    question:
      'Should I mount bifacial solar panels on a roof or a ground-mount rack?',
    answer:
      'Bifacial N-Type TOPCon panels generate an extra 10% to 22% rear-side yield when sunlight reflects off light-colored ground surfaces (crushed limestone, white gravel, concrete, or snow). Elevated ground mounts allow optimal tilt angles, unrestricted rear airflow for cooler cell operation, and easy snow/dust cleaning without roof penetrations. Flush-mounted rooftop arrays still perform reliably with high front-side efficiency, though rear bifacial gain is minimal (~2–4%) unless tilted over a white membrane roof.',
    keyTakeaway: 'Ground mounts maximize bifacial rear gain and simplify seasonal cleaning.',
  },
  {
    id: 'permits-rapid-shutdown',
    category: 'installation',
    categoryLabel: 'Solar Panel Installation',
    question:
      'When are UL 1741, UL 9540, and Module-Level Rapid Shutdown (NEC 690.12) required?',
    answer:
      'If your panels are mounted on a residential dwelling and/or your inverter interconnects with a utility grid (net-metering or hybrid zero-export), local AHJ building departments generally require UL 1741 SA/SB grid compliance, UL 9540 Energy Storage System (ESS) certification pairing the inverter and battery, and NEC 690.12 rapid shutdown transmitters/receivers on the roof. Off-grid sheds, ground arrays away from dwellings, RV/van conversions, and portable power stations typically avoid utility interconnection permits.',
    keyTakeaway: 'Check UL 9540 ESS pairing before purchasing hardware for permitted home installs.',
  },
  {
    id: 'lifepo4-vs-nmc-safety',
    category: 'battery-safety',
    categoryLabel: 'LiFePO4 Battery Safety',
    question:
      'Why is LiFePO4 chemistry safer than NMC lithium-ion for indoor home and server rack storage?',
    answer:
      'Lithium Iron Phosphate (LiFePO4) cells feature strong covalent P–O chemical bonds that resist thermal breakdown up to roughly 270°C—compared to ~150°C for standard NMC/NCA cobalt cells—and do not release free oxygen gas during cell failure. For indoor basements, utility closets, or garage walls, look for UL 1973 (stationary battery safety) and UL 9540A (cell-level thermal runaway propagation testing), along with built-in aerosol fire arrestors or metal rack enclosures.',
    keyTakeaway: 'Prioritize UL 1973 and UL 9540A listings for indoor residential battery banks.',
  },
  {
    id: 'lifepo4-cold-charging',
    category: 'battery-safety',
    categoryLabel: 'LiFePO4 Battery Safety',
    question:
      'Can LiFePO4 batteries be charged below freezing (0°C / 32°F)?',
    answer:
      'Never charge a standard LiFePO4 battery when internal cell temperatures are below 0°C (32°F), as cold charging causes permanent metallic lithium plating on the anode, reducing capacity and risking internal shorts. You can safely discharge LiFePO4 batteries down to around -20°C (-4°F). For unheated cabins, sheds, or outdoor walls, choose models with verified BMS low-temperature charge cutoff and integrated internal heating pads that warm cells above +5°C before accepting charge current.',
    keyTakeaway: 'Verify low-temp charge cutoff (0°C) or internal self-heating for cold climates.',
  },
  {
    id: 'class-t-fuse-wiring',
    category: 'battery-safety',
    categoryLabel: 'LiFePO4 Battery Safety',
    question:
      'Why do 48V LiFePO4 banks require Class-T fuses instead of standard automotive breakers?',
    answer:
      'Prismatic LiFePO4 banks have ultra-low internal resistance and can deliver massive short-circuit fault currents (5,000A–20,000A+) within milliseconds during a dead short. Standard automotive ANL fuses or cheap DC breakers can weld shut or fail to extinguish a 48V–58V DC arc. Installing a Class-T fuse (rated 20,000A AIC) or UL-listed DC MCCB within 12–18 inches of the positive busbar—sized at 125% of continuous inverter DC draw per NEC—protects cables and BMS MOSFETs reliably.',
    keyTakeaway: 'Use a 20kA-AIC Class-T fuse or UL-listed DC MCCB sized at 125% continuous amps.',
  },
  {
    id: 'annual-system-maintenance',
    category: 'maintenance',
    categoryLabel: 'System Maintenance',
    question:
      'What annual maintenance does a solar + LiFePO4 backup system require?',
    answer:
      'Solar + LiFePO4 systems require far less upkeep than lead-acid banks or gas generators. Once or twice a year: (1) use a calibrated torque wrench (with insulated handle) to verify battery lug, busbar, and breaker terminal tightness after thermal cycling; (2) gently rinse solar panels with deionized or soft water to clear pollen, bird droppings, or dust; (3) inspect outdoor MC4 connectors and conduit seals for UV wear; and (4) check inverter/BMS firmware logs for cell-voltage delta (<15 mV at full charge).',
    keyTakeaway: 'Check DC terminal torque annually, rinse panel grime, and audit BMS cell balance.',
  },
  {
    id: 'parallel-battery-balancing',
    category: 'maintenance',
    categoryLabel: 'System Maintenance',
    question:
      'How do I keep multiple parallel 48V LiFePO4 batteries balanced over time?',
    answer:
      'Wire every parallel battery to shared positive and negative copper busbars using identical cable lengths and gauge (or a diagonal feed across the busbar) so each pack sees equal resistance during high-current charge/discharge. Connect closed-loop CAN/RS485 communication cables between battery packs and the inverter, and ensure the bank reaches 100% absorption voltage (typically 55.2V–56.0V for 16S LiFePO4) at least every 2–4 weeks so the internal BMS passive/active balancers can equalize cell groups and resync State of Charge (SOC).',
    keyTakeaway: 'Use equal-length busbar leads and reach 100% charge periodically for SOC sync.',
  },
  {
    id: 'lifespan-cycles-degradation',
    category: 'maintenance',
    categoryLabel: 'System Maintenance',
    question:
      'How long do LiFePO4 batteries and solar panels last in real-world daily cycling?',
    answer:
      'Grade-A prismatic LiFePO4 batteries rated for 6,000–8,000 cycles at 80% Depth of Discharge deliver 15+ years of daily cycling before reaching 80% residual capacity—and continue working reliably for years afterward. N-Type TOPCon and HJT solar panels degrade slowly (~0.25%–0.40% per year), typically retaining 87% to 92% of original nameplate output after 25–30 years. Keeping batteries within 10°C–30°C and avoiding prolonged 100% float stress maximizes longevity.',
    keyTakeaway: 'Expect 15+ years from Grade-A LiFePO4 banks and 25–30 years from Tier-1 panels.',
  },
];

const CATEGORY_TABS: {
  id: FaqCategory;
  label: string;
}[] = [
  { id: 'all', label: 'All Topics (9)' },
  { id: 'installation', label: 'Solar Panel Installation' },
  { id: 'battery-safety', label: 'LiFePO4 Battery Safety' },
  { id: 'maintenance', label: 'System Maintenance' },
];

interface FaqAccordionSectionProps {
  onAskSwarmAgent?: (agentId: SwarmAgentId, directive: string) => void;
}

export function FaqAccordionSection({
  onAskSwarmAgent,
}: FaqAccordionSectionProps = {}) {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory>('all');
  const [openIds, setOpenIds] = useState<string[]>([
    'panel-voc-sizing',
    'lifepo4-vs-nmc-safety',
  ]);

  const visibleItems =
    selectedCategory === 'all'
      ? FAQ_ITEMS
      : FAQ_ITEMS.filter((item) => item.category === selectedCategory);

  const toggleItem = (id: string) => {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const allVisibleOpen =
    visibleItems.length > 0 &&
    visibleItems.every((item) => openIds.includes(item.id));

  const handleToggleAllVisible = () => {
    if (allVisibleOpen) {
      const visibleSet = new Set(visibleItems.map((i) => i.id));
      setOpenIds((prev) => prev.filter((id) => !visibleSet.has(id)));
    } else {
      setOpenIds((prev) =>
        Array.from(new Set([...prev, ...visibleItems.map((i) => i.id)]))
      );
    }
  };

  const getCategoryIcon = (cat: FaqItem['category']) => {
    if (cat === 'installation') {
      return <Sun className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (cat === 'battery-safety') {
      return <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />;
    }
    return <Wrench className="w-4 h-4 text-slate-700 shrink-0" />;
  };

  return (
    <section
      id="faq"
      className="py-14 bg-[#F7F8FA] border-t border-slate-200"
      aria-labelledby="faq-heading"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>
                Owned by <strong className="text-slate-700">Agent #05 Kelvin</strong> · Thermal &amp; Installation Safety Knowledge Base
              </span>
              {onAskSwarmAgent && (
                <button
                  type="button"
                  onClick={() =>
                    onAskSwarmAgent(
                      'thermal-safety',
                      'Review cold-weather Voc, LiFePO4 freezing cutoffs, and IP20 vs IP65 humidity enclosure safeguards for my current build.'
                    )
                  }
                  className="font-semibold text-amber-700 hover:underline ml-1"
                >
                  Dispatch Agent #05
                </button>
              )}
            </div>
            <h2
              id="faq-heading"
              className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1"
            >
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Practical answers covering solar array installation, LiFePO4 thermal and electrical safety, and multi-year system maintenance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex flex-wrap items-center gap-1.5"
              role="tablist"
              aria-label="Filter FAQ topics"
            >
              {CATEGORY_TABS.map((tab) => {
                const active = selectedCategory === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedCategory(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleToggleAllVisible}
              className="px-3 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-400 transition-colors whitespace-nowrap shrink-0"
            >
              {allVisibleOpen ? 'Collapse All' : 'Expand All'}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 overflow-hidden">
          {visibleItems.map((item) => {
            const isOpen = openIds.includes(item.id);
            const panelId = `faq-panel-${item.id}`;
            const buttonId = `faq-btn-${item.id}`;

            return (
              <div key={item.id} className="transition-colors">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      {getCategoryIcon(item.category)}
                      <div className="min-w-0">
                        <div className="text-[11px] font-medium text-slate-500">
                          {item.categoryLabel}
                        </div>
                        <span className="text-sm sm:text-base font-semibold text-slate-900 block mt-0.5">
                          {item.question}
                        </span>
                      </div>
                    </div>

                    <ChevronDown
                      className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-amber-700' : ''
                      }`}
                    />
                  </button>
                </h3>

                {isOpen && (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="px-5 pb-5 pt-1 sm:pl-12 space-y-2.5 bg-slate-50/40"
                  >
                    <p className="text-sm text-slate-700 leading-relaxed max-w-4xl">
                      {item.answer}
                    </p>
                    <div className="text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-1.5 inline-block">
                      Key takeaway: {item.keyTakeaway}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
