import {
  SearchPurpose,
  SizeFootprint,
  SolarProduct,
} from '../types/solar';

export interface ProductInsightMeta {
  sizeFootprint: SizeFootprint;
  purposes: Exclude<SearchPurpose, 'all'>[];
  starRating: number;
  reviewCount: number;
  buyerFollowers: number;
  fastestDeliveryDays: number;
  topReviewExcerpt: string;
  pros: string[];
  cons: string[];
}

export const PURPOSE_LABELS: Record<SearchPurpose, string> = {
  all: 'All Solar Purposes',
  'off-grid-cabin': 'Off-Grid Cabin / Homestead',
  'whole-home-backup': 'Whole-Home Grid Backup',
  'van-rv-marine': 'Van / RV / Marine (12V–24V)',
  'portable-emergency': 'Portable Emergency Backup',
  'high-yield-array': 'High-Yield Rooftop / Ground Array',
  'local-ai-llm': 'Local AI LLM Setup',
};

export const PRODUCT_INSIGHTS: Record<string, ProductInsightMeta> = {
  'eg4-ll-s-48v-100ah': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 1840,
    buyerFollowers: 9420,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Plugged into 6000XP via CAN bus and closed-loop SOC worked on first boot. Zero voltage sag at 90A.',
    pros: [
      'UL 1973 & UL 9540A certified with dual aerosol fire arrestors',
      '7,000-cycle Grade-A EVE prismatic cells with verified 0°C charge cutoff',
      'Plug-and-play CAN/RS485 closed-loop sync with EG4, Victron & Sol-Ark',
    ],
    cons: [
      '98.5 lb steel chassis requires two-person rack installation',
      'No built-in self-heating pads for sub-freezing uninsulated sheds',
    ],
  },
  'eg4-powerpro-wallmount-280ah': {
    sizeFootprint: 'rack-wall',
    purposes: ['whole-home-backup', 'off-grid-cabin', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 920,
    buyerFollowers: 6850,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Replaced three 5kWh rack batteries with one outdoor IP65 wall unit. Integrated breaker saved hours of wiring.',
    pros: [
      '14.34 kWh single enclosure cuts rack cabling & floor footprint by 60%',
      'IP65 weatherproof with internal self-heating and 200A DC breaker',
      '8,000-cycle rating at competitive ~$0.23/Wh UL 9540 price',
    ],
    cons: [
      '286 lb weight demands concrete anchors or heavy structural wall framing',
      'Ships via LTL freight liftgate rather than standard parcel courier',
    ],
  },
  'sok-48v-100ah-pro': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 1120,
    buyerFollowers: 5340,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Opened the top lid to inspect bolted busbars—easiest battery to service long-term if a BMS ever fails.',
    pros: [
      'Field-serviceable bolted busbar lid allows single-cell or BMS swaps',
      'Tight <8mV cell balance delta under Current Connected tech support',
      'UL 1973 & UL 9540 listed with native Victron GX communication',
    ],
    cons: [
      'Slightly deeper 20.1" cabinet requires full-depth 600mm server rack',
      '$50–$80 higher upfront cost than welded-lid budget racks',
    ],
  },
  'pytes-v5-5120': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.8,
    reviewCount: 640,
    buyerFollowers: 3480,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Kept charging smoothly through -10°C mountain mornings in an unheated barn thanks to internal heaters.',
    pros: [
      'Built-in 180W self-heating film enables safe sub-zero charging',
      'Slim 5.5" profile fits compact wall brackets or 3U racks',
      'Dual-port CAN/RS485 native compatibility with Sol-Ark & Schneider',
    ],
    cons: [
      'Higher $/Wh than non-heated server rack alternatives',
      'Fewer third-party marketplace listings than EG4',
    ],
  },
  'ecoworthy-48v-100ah': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'local-ai-llm'],
    starRating: 4.6,
    reviewCount: 1490,
    buyerFollowers: 7810,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Pulled 5,240 Wh on a bench capacity test for under $850 landed. Unbeatable value for off-grid workshops.',
    pros: [
      'Lowest $/Wh among 48V 100Ah server rack batteries ($0.16–$0.17/Wh)',
      'Tested over 102% of rated 5,120 Wh capacity with Bluetooth telemetry',
      'Fast Amazon & eBay 2-day delivery with zero LTL freight fees',
    ],
    cons: [
      'Lacks UL 9540 listing required by strict municipal grid-tie permits',
      '5-year warranty is half the term of EG4, SOK, and Pytes',
    ],
  },
  'ruixu-lithi2-48v-100ah': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'whole-home-backup'],
    starRating: 4.7,
    reviewCount: 530,
    buyerFollowers: 2890,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Included wall-mount bracket and parallel cables made expanding to 15 kWh effortless.',
    pros: [
      'Includes wall-mount brackets, parallel cables, and cold-weather heaters',
      'UL 1973 certified CATL prismatic cells with 10-year warranty',
      'Dual M8 terminals handle daisy-chained high-amperage bus runs',
    ],
    cons: [
      'Shorter dealer track record than Current Connected / Signature Solar',
      '99.2 lb chassis still needs stud-anchored mounting',
    ],
  },
  'litime-12v-230ah-plus': {
    sizeFootprint: 'compact',
    purposes: ['van-rv-marine', 'off-grid-cabin'],
    starRating: 4.8,
    reviewCount: 2410,
    buyerFollowers: 11200,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Runs our 12V fridge, Starlink, and 2000W induction cooktop in a Sprinter van with zero low-temp anxiety.',
    pros: [
      'Compact 44.5 lb Group-8D footprint packs nearly 3 kWh at ~$0.17/Wh',
      '200A continuous BMS easily powers 2,500W 12V mobile inverters',
      'Verified low-temp cutoff protection + 2-day Prime shipping',
    ],
    cons: [
      'No CAN/RS485 closed-loop communication for hybrid home inverters',
      'Requires 4× in series (with balancer) to build a 48V bank',
    ],
  },
  'epoch-12v-300ah-heated': {
    sizeFootprint: 'compact',
    purposes: ['van-rv-marine'],
    starRating: 4.9,
    reviewCount: 480,
    buyerFollowers: 3120,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Mounted in our sailboat bilge locker—IP67 seal and direct Victron Cerbo GX CAN readout are rock solid.',
    pros: [
      'True IP67 waterproof enclosure with internal heater & 11-year warranty',
      'Native Victron VE.Can integration + active 2A cell balancing',
      'UL 1973 & ABYC-compliant marine/RV safety build',
    ],
    cons: [
      'Premium $/Wh (~$0.22/Wh) compared to non-IP67 budget 12V packs',
      '62 lb weight needs tie-down trays for rough off-road trails',
    ],
  },
  'canadian-solar-440w-bifacial': {
    sizeFootprint: 'full-panel',
    purposes: ['high-yield-array', 'off-grid-cabin', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 1680,
    buyerFollowers: 8740,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Ground-mounted 10 in series over light crushed stone—regularly hit 4,700W peak on cool crisp afternoons.',
    pros: [
      'N-Type TOPCon 22.5% efficiency + dual-glass bifacial rear gain',
      '39.4V Voc lets 10 panels wire in one string on 480V–500V MPPTs',
      'Standout ~$0.34/W landed cost on distributor pallet pricing',
    ],
    cons: [
      '50.7 lb glass-on-glass module requires two installers on pitched roofs',
      'Individual single-panel orders incur higher parcel freight surcharges',
    ],
  },
  'rec-alpha-pure-r-430w': {
    sizeFootprint: 'full-panel',
    purposes: ['high-yield-array', 'whole-home-backup'],
    starRating: 4.9,
    reviewCount: 890,
    buyerFollowers: 4610,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Tight roof space forced us to maximize watts per square foot; hot-weather output barely drops in July.',
    pros: [
      'Industry-best -0.24%/°C thermal coefficient & 92% Year-25 guarantee',
      'Lead-free Heterojunction (HJT) cells excel in partial chimney shade',
      '25-year ProTrust product & labor coverage via authorized dealers',
    ],
    cons: [
      'Nearly 2× higher $/W (~$0.65/W) than TOPCon commodity panels',
      'High 59.4V Voc caps series strings at 7 panels on 500V inverters',
    ],
  },
  'qcells-qpeak-duo-405w': {
    sizeFootprint: 'full-panel',
    purposes: ['high-yield-array', 'whole-home-backup'],
    starRating: 4.8,
    reviewCount: 1320,
    buyerFollowers: 5900,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Picked up 12 panels locally without LTL liftgate drama; uniform matte black frame looks sleek on shingles.',
    pros: [
      'US-assembled in Georgia; qualifies for domestic-content incentives',
      'All-black anodized appearance favored by strict HOAs',
      'Fast local big-box pickup & 24h SanTan dispatch',
    ],
    cons: [
      '20.6% mono-PERC efficiency trails newer N-Type TOPCon modules',
      'Single-sided backsheet lacks bifacial ground-mount bonus',
    ],
  },
  'aptos-440w-dna-bifacial': {
    sizeFootprint: 'full-panel',
    purposes: ['high-yield-array', 'off-grid-cabin', 'local-ai-llm'],
    starRating: 4.8,
    reviewCount: 740,
    buyerFollowers: 4180,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Best cost-per-watt bifacial panel in our ground-mount build; survived 65 mph winter gusts easily.',
    pros: [
      '30-year product & linear power warranty with 170 mph wind rating',
      'Lowest $/W N-Type bifacial pricing (~$0.33/W landed)',
      '39.2V Voc pairs cleanly with EG4, Sol-Ark, and SunGoldPower strings',
    ],
    cons: [
      '51 lb dual-glass weight makes solo ladder carries difficult',
      'Lower brand recognition on Amazon/eBay vs Qcells or REC',
    ],
  },
  'jinko-eagle-415w-mono': {
    sizeFootprint: 'full-panel',
    purposes: ['high-yield-array', 'off-grid-cabin'],
    starRating: 4.7,
    reviewCount: 610,
    buyerFollowers: 3250,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Every panel tested slightly above 415W nameplate out of the crate.',
    pros: [
      'Tier-1 N-Type reliability at entry-level ~$0.34/W pricing',
      'Widely stocked across Amazon, eBay, Walmart, and solar warehouses',
      'Low -0.30%/°C heat loss and PID-resistant encapsulation',
    ],
    cons: [
      '415W nameplate lags 440W bifacials for tight roof layouts',
      'Monofacial design misses rear-albedo gains on ground racks',
    ],
  },
  'rich-solar-200w-12v': {
    sizeFootprint: 'compact',
    purposes: ['van-rv-marine', 'portable-emergency'],
    starRating: 4.8,
    reviewCount: 2890,
    buyerFollowers: 12600,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Mounted 4 flat on our camper roof—compact width fits right between the roof vent and A/C unit.',
    pros: [
      'Slim 26.8" width fits Sprinter/Transit roof racks cleanly',
      '24.3V Voc safe for 12V/24V PWM & 100V Victron MPPT controllers',
      'Free 2-day Prime & eBay parcel shipping (no LTL pallet needed)',
    ],
    cons: [
      'Higher ~$0.68/W cost than full-size residential 440W panels',
      '200W per panel limits total roof capacity on small vans',
    ],
  },
  'ecoflow-220w-bifacial-portable': {
    sizeFootprint: 'compact',
    purposes: ['portable-emergency', 'van-rv-marine'],
    starRating: 4.7,
    reviewCount: 1540,
    buyerFollowers: 6430,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Folds into the trunk in 30 seconds and pulls 205W consistently on sunny tailgates.',
    pros: [
      'IP68 waterproof tempered glass folds to compact 20.9 lb carry case',
      '23% cell efficiency plus rear bifacial boost over bright surfaces',
      'Standard MC4 output works with EcoFlow, Bluetti, and Anker',
    ],
    cons: [
      'Expensive ~$1.59/W compared to rigid aluminum-frame panels',
      '2-year warranty is much shorter than 25-year rigid panels',
    ],
  },
  'eg4-6000xp-inverter': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 2150,
    buyerFollowers: 11850,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Powers our entire off-grid cabin including a 240V well pump and mini-split for $1,399.',
    pros: [
      'True 6,000W 120V/240V split-phase with built-in 100A transfer switch',
      'Dual 480V MPPTs (8kW PV) handle long high-voltage solar strings',
      'Unbeatable ~$0.23/W price with UL 1741 certification',
    ],
    cons: [
      'Off-grid only—cannot export surplus power back to utility grid',
      '52W idle draw consumes ~1.25 kWh/day when left on 24/7',
    ],
  },
  'eg4-18kpv-12kw': {
    sizeFootprint: 'rack-wall',
    purposes: ['whole-home-backup', 'off-grid-cabin', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 980,
    buyerFollowers: 7420,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      '200A passthrough meant we backed up the main breaker panel without rewiring a critical-loads subpanel.',
    pros: [
      '12kW continuous output + 200A whole-home grid passthrough',
      '600V MPPT ceiling accepts up to 18kW PV across 3 trackers',
      'NEMA 4X outdoor enclosure saves ~$800 vs Sol-Ark 15K',
    ],
    cons: [
      '112 lb chassis requires two-person lift onto wall cleat',
      'Active cooling fans audible under sustained >8kW loads',
    ],
  },
  'solark-15k-2p': {
    sizeFootprint: 'rack-wall',
    purposes: ['whole-home-backup', 'off-grid-cabin', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 1410,
    buyerFollowers: 8930,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Passed utility net-metering inspection first try; 4ms UPS transfer never even blinked our NAS servers.',
    pros: [
      '15kW output (19.5kW PV) with 200A service-entrance passthrough',
      '4ms UPS transfer + EMP-hardened option & 10-year US phone support',
      'Widely pre-approved by US utilities for UL 1741 SB net metering',
    ],
    cons: [
      'Highest upfront price ($5,690+) in the 48V split-phase class',
      '135 lb weight and 500V PV limit (lower than EG4 18kPV 600V)',
    ],
  },
  'victron-multiplus-ii-48-5000': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'van-rv-marine', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 1760,
    buyerFollowers: 9120,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Starts our 1.5HP deep-well pump with zero flicker while sipping only 18W overnight.',
    pros: [
      'Low-frequency copper toroidal transformer handles 9,000W motor surges',
      'Ultra-low 18W idle consumption saves ~0.8 kWh/day vs HF hybrids',
      'Stackable for 240V split-phase or 3-phase expansion',
    ],
    cons: [
      'No built-in solar MPPT—requires pairing external SmartSolar MPPT',
      'Single unit outputs 120V only (need 2 units for 240V split-phase)',
    ],
  },
  'growatt-spf-5000es': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin'],
    starRating: 4.5,
    reviewCount: 1240,
    buyerFollowers: 5620,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Cheapest way to get 5kW solar in a shop; paired with a 5kW autotransformer for 120V outlets.',
    pros: [
      'Lowest $/W ($0.14/W) for a 5,000W 48V off-grid all-in-one',
      'Operates batteryless during daytime PV production',
      'Lightweight 26.5 lb chassis mounts easily on a single stud',
    ],
    cons: [
      'Native 230V single-phase—requires external autotransformer for US 120V',
      'Lacks UL 1741 listing for permitted residential installs',
    ],
  },
  'sungoldpower-10kw-48v-ul': {
    sizeFootprint: 'rack-wall',
    purposes: ['off-grid-cabin', 'whole-home-backup'],
    starRating: 4.7,
    reviewCount: 830,
    buyerFollowers: 4410,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Runs our garage welder, air compressor, and mini-split simultaneously at half the cost of tier-1 units.',
    pros: [
      '10kW split-phase UL 1741 output for ~$1,700 (~$0.17/W)',
      'Dual 500V MPPTs handle up to 11,000W solar + 200A battery charging',
      '15kW 5-second surge clears heavy workshop inductive starts',
    ],
    cons: [
      'Higher ~75W idle draw than Victron low-frequency inverters',
      'Off-grid / AC-input backup only (no utility grid export)',
    ],
  },
  'ecoflow-delta-pro-3': {
    sizeFootprint: 'compact',
    purposes: ['portable-emergency', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.8,
    reviewCount: 1180,
    buyerFollowers: 7940,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Plugged straight into our 30A generator inlet box during a 3-day storm—whisper quiet at 30dB.',
    pros: [
      'True 120V/240V 4,000W output from a single wheeled portable unit',
      '2,600W dual-MPPT solar input (150V + 60V) charges rapidly',
      'Whisper-quiet 30dB cooling & 10ms UPS switchover',
    ],
    cons: [
      'Higher $/Wh (~$0.67/Wh) than DIY server rack + inverter builds',
      '113.5 lb weight makes stairs awkward despite luggage handle',
    ],
  },
  'ecoflow-delta-2-max': {
    sizeFootprint: 'compact',
    purposes: ['portable-emergency', 'van-rv-marine'],
    starRating: 4.8,
    reviewCount: 3120,
    buyerFollowers: 14800,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Best weight-to-capacity ratio in the 2kWh class; runs our CPAP, fridge, and coffee maker all weekend.',
    pros: [
      '50.7 lb weight is ~12 lbs lighter than rival 2,048 Wh LFP stations',
      'Dual 500W XT60i solar ports recharge 0–100% in ~2.3 sun hours',
      '3,000-cycle LiFePO4 pack with 5-year warranty & fast Amazon shipping',
    ],
    cons: [
      '60V PV ceiling requires parallel panel wiring (no high-V strings)',
      '120V AC only (no native 240V split-phase support)',
    ],
  },
  'bluetti-ac200l': {
    sizeFootprint: 'compact',
    purposes: ['portable-emergency', 'van-rv-marine'],
    starRating: 4.8,
    reviewCount: 1640,
    buyerFollowers: 8210,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      '145V solar input let me wire 3× residential 400W panels in series without expensive combiners.',
    pros: [
      '145V MPPT solar input accepts high-voltage residential panel strings',
      'Built-in 48V DC RV output port + 2,400W AC inverter',
      'Expandable up to 8.1 kWh with B210/B300K expansion packs',
    ],
    cons: [
      '62.4 lb weight is heavier than EcoFlow DELTA 2 Max',
      'Slightly lower 90.4% inverter efficiency on light <100W loads',
    ],
  },
  'bluetti-ac300-b300k': {
    sizeFootprint: 'compact',
    purposes: ['portable-emergency', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.7,
    reviewCount: 940,
    buyerFollowers: 4860,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Modular inverter head + separate battery made carrying it up cabin stairs solo completely doable.',
    pros: [
      'Modular separate inverter head simplifies solo lifting & expansion',
      'Dual 150V MPPTs pull 2,400W solar across residential strings',
      '3,000W pure sine output with 30A RV/transfer-switch outlet',
    ],
    cons: [
      'Requires thick proprietary umbilical cable between inverter and pack',
      '4-year warranty trails 5-year EcoFlow & Anker coverage',
    ],
  },
  'anker-solix-f3800': {
    sizeFootprint: 'compact',
    purposes: ['portable-emergency', 'whole-home-backup', 'local-ai-llm'],
    starRating: 4.8,
    reviewCount: 1350,
    buyerFollowers: 7690,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Backed up our 240V well pump and charged our EV 20 miles during a grid outage via NEMA 14-50.',
    pros: [
      'Massive 6,000W 120V/240V split-phase output in a single rolling box',
      'Direct NEMA 14-50 EV charging port + L14-30R home inlet port',
      'EV-grade LiFePO4 cells with 5-year warranty & wide retail stock',
    ],
    cons: [
      '60V solar input limit restricts series panel strings',
      'Heavy 132.3 lb rolling weight when moving across gravel',
    ],
  },
  'victron-smartsolar-150-100': {
    sizeFootprint: 'compact',
    purposes: ['off-grid-cabin', 'van-rv-marine', 'local-ai-llm'],
    starRating: 4.9,
    reviewCount: 1190,
    buyerFollowers: 6320,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Dead silent, zero fan bearings to wear out, and recovers from passing clouds instantaneously.',
    pros: [
      'Potted fanless aluminum heatsink—zero moving parts to fail',
      '98% peak efficiency with ultra-fast shade MPPT sweep',
      'Native VE.Can + Bluetooth syncs seamlessly with Cerbo GX',
    ],
    cons: [
      'Higher ~$0.09/W cost than budget non-potted MPPT controllers',
      '150V Voc max requires 2S/3S parallel panel wiring on big arrays',
    ],
  },
  'victron-smartsolar-100-50': {
    sizeFootprint: 'compact',
    purposes: ['van-rv-marine'],
    starRating: 4.9,
    reviewCount: 2740,
    buyerFollowers: 13400,
    fastestDeliveryDays: 1,
    topReviewExcerpt:
      'Installed in 15 minutes; VictronConnect Bluetooth app shows exact daily solar harvest history.',
    pros: [
      'Gold-standard reliability for 12V/24V vans, boats, and overland rigs',
      'Built-in Bluetooth with 30-day solar yield history & custom LiFePO4 curves',
      'Fanless 2.9 lb chassis runs cool at full 50A output',
    ],
    cons: [
      '100V Voc ceiling limits series strings to 2–3 mobile panels',
      'No built-in LCD screen (relies on Bluetooth app or external display)',
    ],
  },
  'renogy-rover-60a-mppt': {
    sizeFootprint: 'compact',
    purposes: ['van-rv-marine', 'off-grid-cabin'],
    starRating: 4.6,
    reviewCount: 1920,
    buyerFollowers: 8510,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'Accepts heavy 4 AWG lugs cleanly and gives accurate built-in LCD amps without needing a phone.',
    pros: [
      'Budget-friendly ~$0.06/W MPPT supporting 12V/24V/48V banks',
      'Built-in backlit LCD readout + physical buttons for offline setups',
      '150V Voc rating handles 3× residential panels in series',
    ],
    cons: [
      'Runs warmer at 55A+ than potted Victron cast heatsinks',
      '2-year warranty is shorter than Victron & MidNite 5-year terms',
    ],
  },
  'midnite-classic-150': {
    sizeFootprint: 'compact',
    purposes: ['off-grid-cabin'],
    starRating: 4.8,
    reviewCount: 670,
    buyerFollowers: 3190,
    fastestDeliveryDays: 2,
    topReviewExcerpt:
      'HyperVOC saved our controller during a -28°C cold snap in Montana when array Voc spiked.',
    pros: [
      'HyperVOC cold-weather protection extends safe Voc above 150V',
      'Built-in PV arc-fault and ground-fault detection; Made in USA',
      'Field-serviceable terminal busbar & 96A output up to 72V banks',
    ],
    cons: [
      'Internal cooling fan is louder than passive Victron controllers',
      'Dated dot-matrix menu interface compared to modern apps',
    ],
  },
};

export interface FilterCriteria {
  purpose: SearchPurpose;
  priceRange: 'all' | 'under-250' | '250-1000' | '1000-2500' | '2500-plus';
  sizeRange: 'all' | SizeFootprint;
  volumeRange: 'all' | 'under-1kwh' | '1-3kwh' | '3-6kwh' | '10kwh-plus';
  powerRange: 'all' | '200-600w' | '1000-4000w' | '5000-10000w' | '12000w-plus';
  deliveryNeed: 'all' | 'same-day' | 'fast-2d' | 'standard-5d';
  minBuyers: 0 | 500 | 2000 | 5000;
}

export interface ScoredRecommendation {
  product: SolarProduct;
  score: number; // 1.0 to 10.0
  comparativeRationale: string;
}

export function evaluatePurposeFit(
  product: SolarProduct,
  criteria: FilterCriteria,
  landedPrice: number,
  unitMetric: number
): ScoredRecommendation {
  let score = 6.2;

  // 1. Purpose alignment (+2.2 max)
  if (criteria.purpose === 'all') {
    score += 1.2 + (product.starRating - 4.5) * 2.0;
  } else if (product.purposes[0] === criteria.purpose) {
    score += 2.3;
  } else if (product.purposes.includes(criteria.purpose)) {
    score += 1.6;
  } else {
    score -= 1.2;
  }

  // 2. Star rating & buyer provenance (+0.8 max)
  score += (product.starRating - 4.5) * 1.4;
  if (product.buyerFollowers >= 5000) score += 0.35;
  else if (product.buyerFollowers >= 2000) score += 0.2;

  // 3. Bench teardown & UL certification (+0.45 max)
  if (product.benchmark.verified) score += 0.25;
  if (product.specs.certifications.some((c) => c.startsWith('UL'))) {
    score += 0.2;
  }

  // 4. Value metric boost (+0.45 max)
  if (product.unitMetricType === '$/Wh' && unitMetric <= 0.23) score += 0.35;
  if (product.unitMetricType === '$/W' && unitMetric <= 0.36) score += 0.35;

  // 5. Delivery speed fit
  if (
    criteria.deliveryNeed === 'same-day' &&
    product.fastestDeliveryDays === 1
  ) {
    score += 0.3;
  } else if (
    criteria.deliveryNeed === 'fast-2d' &&
    product.fastestDeliveryDays <= 2
  ) {
    score += 0.2;
  }

  // 6. Local AI LLM Setup suitability bonus (UPS continuity, 48V rack storage, high continuous wattage)
  if (criteria.purpose === 'local-ai-llm') {
    if (product.voltageClass === '48V') score += 0.45;
    if ((product.specs.capacityWh ?? 0) >= 5000) score += 0.3;
    if ((product.specs.powerWatts ?? 0) >= 3000) score += 0.3;
  }

  const clamped = Math.min(9.9, Math.max(4.5, Number(score.toFixed(1))));

  // Construct detailed comparative engineering description explaining score
  const purposeText =
    criteria.purpose === 'all'
      ? 'all-around solar hardware value'
      : criteria.purpose === 'local-ai-llm'
      ? 'home & remote Local AI LLM Setup (continuous GPU inference & UPS uptime)'
      : PURPOSE_LABELS[criteria.purpose].toLowerCase();

  const specHighlight = product.specs.capacityWh
    ? `${(product.specs.capacityWh / 1000).toFixed(2)} kWh (${product.specs.nominalVoltage})`
    : `${product.specs.powerWatts?.toLocaleString() ?? '—'} W (${product.specs.efficiencyPct}% eff)`;

  const deliveryLabel =
    product.fastestDeliveryDays === 1
      ? 'same-day / 24h dispatch'
      : `${product.fastestDeliveryDays}-day delivery`;

  const rationale = `Scores ${clamped}/10 for ${purposeText}: delivers ${specHighlight} at $${landedPrice.toLocaleString()} landed ($${unitMetric.toFixed(2)} ${product.unitMetricType}) with ${deliveryLabel} and ${product.buyerFollowers.toLocaleString()} verified buyers/followers. ${product.benchmark.bmsOrMpptVerdict}`;

  return {
    product,
    score: clamped,
    comparativeRationale: rationale,
  };
}
