import batteryImg from '../assets/images/lifepo4_server_battery_1794734752705.jpg';
import panelImg from '../assets/images/solar_panel_bifacial_1794734751867.jpg';
import inverterImg from '../assets/images/hybrid_solar_inverter_1794734752486.jpg';
import portableImg from '../assets/images/portable_power_station_1794734753467.jpg';
import controllerImg from '../assets/images/mppt_charge_controller_1794734753880.jpg';
import workbenchHeroImg from '../assets/images/hero_solar_workbench_1794734751573.jpg';
import {
  MerchantOffer,
  PlatformChannel,
  SolarCategory,
  SolarProduct,
} from '../types/solar';
import { buildMultiStoreOffers } from './offerMatrixBuilder';
import { PRODUCT_INSIGHTS } from './productInsights';

export const HERO_WORKBENCH_IMAGE = workbenchHeroImg;

export const CATEGORY_LABELS: Record<SolarCategory | 'all', string> = {
  all: 'All Hardware',
  batteries: 'LiFePO4 Batteries',
  panels: 'Solar Panels',
  inverters: 'Hybrid Inverters',
  portable: 'Portable Stations',
  controllers: 'MPPT Controllers',
};

export const MATRIX_CHANNELS: PlatformChannel[] = [
  'Amazon',
  'eBay',
  'Signature Solar',
  'Current Connected',
  'Home Depot',
  'Walmart',
  'ShopSolar',
  'OEM Direct',
];

const RAW_SOLAR_PRODUCTS: Omit<
  SolarProduct,
  | 'sizeFootprint'
  | 'purposes'
  | 'starRating'
  | 'reviewCount'
  | 'buyerFollowers'
  | 'fastestDeliveryDays'
  | 'topReviewExcerpt'
  | 'pros'
  | 'cons'
>[] = [
  // =========================================================================
  // 1. LiFePO4 BATTERIES (8 Models)
  // =========================================================================
  {
    id: 'eg4-ll-s-48v-100ah',
    sku: 'EG4-LLS-48100',
    name: 'EG4 LL-S 48V 100Ah Server Rack Battery',
    brand: 'EG4 Electronics',
    category: 'batteries',
    voltageClass: '48V',
    image: batteryImg,
    msrp: 1499,
    summarySpec: '5,120 Wh · 51.2V · 7,000 Cycles · UL 1973 / 9540A',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '51.2V (16S)',
      capacityWh: 5120,
      powerWatts: 5120,
      efficiencyPct: 98.2,
      cycleLife: 7000,
      maxChargeAmps: 100,
      chemistryOrCell: 'Grade-A Prismatic LiFePO4 (EVE)',
      certifications: ['UL 1973', 'UL 9540A', 'UN38.3'],
      lowTempCutoff: true,
      bmsComms: 'CAN / RS485 Closed-Loop',
      weightLbs: 98.5,
      dimensionsIn: '17.4 × 18.5 × 6.1',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Dual internal aerosol fire arrestors, laser-welded busbars, clean epoxy-coated BMS board.',
      thermalResult: '41°C peak terminal temp at continuous 100A discharge',
      bmsOrMpptVerdict:
        'Verified low-temp charge cutoff at 0°C and instant SOC sync with Victron/EG4 inverters.',
    },
    offers: buildMultiStoreOffers('EG4-LLS-48100', {
      baseAnchor: 1149,
      category: 'batteries',
      brand: 'EG4 Electronics',
      warrantyYears: 10,
      weightLbs: 98.5,
      overrides: {
        'Signature Solar': { price: 1149, shipping: 0 },
        'Current Connected': { price: 1179, shipping: 0 },
        Amazon: { price: 1219, couponDiscount: 40, promoLabel: 'Clip -$40 Coupon' },
        eBay: { price: 1189, couponDiscount: 45, promoLabel: 'Code SOLARFALL (-$45)' },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1299 },
      { date: 'Sep 02', price: 1279 },
      { date: 'Sep 17', price: 1249 },
      { date: 'Oct 01', price: 1219 },
      { date: 'Oct 16', price: 1199 },
      { date: 'Nov 01', price: 1169 },
      { date: 'Nov 15', price: 1149 },
    ],
  },
  {
    id: 'eg4-powerpro-wallmount-280ah',
    sku: 'EG4-PP-WM-14300',
    name: 'EG4 PowerPro WallMount AllWeather 48V 280Ah',
    brand: 'EG4 Electronics',
    category: 'batteries',
    voltageClass: '48V',
    image: batteryImg,
    msrp: 3799,
    summarySpec: '14,336 Wh · IP65 Outdoor Heated · 8,000 Cycles · UL 9540',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '51.2V (16S)',
      capacityWh: 14336,
      powerWatts: 10240,
      efficiencyPct: 98.5,
      cycleLife: 8000,
      maxChargeAmps: 200,
      chemistryOrCell: 'Grade-A 280Ah Prismatic LiFePO4',
      certifications: ['UL 1973', 'UL 9540', 'UL 9540A', 'IP65'],
      lowTempCutoff: true,
      bmsComms: 'CAN / RS485 Closed-Loop',
      weightLbs: 286.0,
      dimensionsIn: '35.8 × 21.6 × 10.6',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Built-in 200A DC breaker, quick-connect Amphenol lugs, integrated conduit box & dual heaters.',
      thermalResult: '38°C busbar temp at 180A continuous load',
      bmsOrMpptVerdict:
        'Lowest $/Wh UL 9540 outdoor-rated whole-home storage unit tested.',
    },
    offers: buildMultiStoreOffers('EG4-PP-WM-14300', {
      baseAnchor: 3299,
      category: 'batteries',
      brand: 'EG4 Electronics',
      warrantyYears: 10,
      weightLbs: 286.0,
      overrides: {
        'Signature Solar': { price: 3299, shipping: 0 },
        'Current Connected': { price: 3349, shipping: 0 },
        'eBay Refurb': { price: 2849, shipping: 0, inStock: true },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 3699 },
      { date: 'Sep 02', price: 3599 },
      { date: 'Sep 17', price: 3499 },
      { date: 'Oct 01', price: 3449 },
      { date: 'Oct 16', price: 3399 },
      { date: 'Nov 01', price: 3349 },
      { date: 'Nov 15', price: 3299 },
    ],
  },
  {
    id: 'sok-48v-100ah-pro',
    sku: 'SOK-48V100-PRO',
    name: 'SOK 48V 100Ah PRO Server Rack LiFePO4',
    brand: 'SOK Battery',
    category: 'batteries',
    voltageClass: '48V',
    image: batteryImg,
    msrp: 1450,
    summarySpec: '5,120 Wh · 51.2V · Field-Serviceable Chassis · UL 1973',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '51.2V (16S)',
      capacityWh: 5120,
      powerWatts: 5120,
      efficiencyPct: 98.0,
      cycleLife: 6000,
      maxChargeAmps: 100,
      chemistryOrCell: 'Grade-A Prismatic LiFePO4 (Ganfeng)',
      certifications: ['UL 1973', 'UL 9540', 'IEC 62619'],
      lowTempCutoff: true,
      bmsComms: 'CAN / RS485 / Victron GX',
      weightLbs: 102.0,
      dimensionsIn: '17.4 × 20.1 × 6.1',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Bolted busbars and removable lid allow single-cell or BMS replacement without grinding.',
      thermalResult: '39°C peak terminal temp at 100A sustained load',
      bmsOrMpptVerdict:
        'Active 150mA balancing keeps cell delta under 8mV at top-of-charge.',
    },
    offers: buildMultiStoreOffers('SOK-48V100-PRO', {
      baseAnchor: 1199,
      category: 'batteries',
      brand: 'SOK Battery',
      warrantyYears: 10,
      weightLbs: 102.0,
      overrides: {
        'Current Connected': { price: 1199, shipping: 0 },
        'OEM Direct': { price: 1229, shipping: 0 },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1349 },
      { date: 'Sep 02', price: 1329 },
      { date: 'Sep 17', price: 1299 },
      { date: 'Oct 01', price: 1269 },
      { date: 'Oct 16', price: 1249 },
      { date: 'Nov 01', price: 1219 },
      { date: 'Nov 15', price: 1199 },
    ],
  },
  {
    id: 'pytes-v5-5120',
    sku: 'PYTES-V5-51',
    name: 'Pytes V5 Self-Heating 5.12kWh Battery',
    brand: 'Pytes Energy',
    category: 'batteries',
    voltageClass: '48V',
    image: batteryImg,
    msrp: 1599,
    summarySpec: '5,120 Wh · Internal Heater · 6,000 Cycles · UL 9540',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '51.2V (16S)',
      capacityWh: 5120,
      powerWatts: 5120,
      efficiencyPct: 98.4,
      cycleLife: 6000,
      maxChargeAmps: 100,
      chemistryOrCell: 'Automotive Grade-A LiFePO4',
      certifications: ['UL 1973', 'UL 9540', 'UL 9540A'],
      lowTempCutoff: true,
      bmsComms: 'CAN / RS485 Dual-Port',
      weightLbs: 97.0,
      dimensionsIn: '17.3 × 20.9 × 5.5',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Integrated dual-pad 180W self-heating film warms cells from -15°C to +5°C before charging.',
      thermalResult: '40°C terminal rise at 0.8C continuous discharge',
      bmsOrMpptVerdict:
        'Native Sol-Ark & Schneider closed-loop profile out of the box.',
    },
    offers: buildMultiStoreOffers('PYTES-V5-51', {
      baseAnchor: 1245,
      category: 'batteries',
      brand: 'Pytes Energy',
      warrantyYears: 10,
      weightLbs: 97.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1410 },
      { date: 'Sep 02', price: 1390 },
      { date: 'Sep 17', price: 1360 },
      { date: 'Oct 01', price: 1325 },
      { date: 'Oct 16', price: 1295 },
      { date: 'Nov 01', price: 1260 },
      { date: 'Nov 15', price: 1245 },
    ],
  },
  {
    id: 'ecoworthy-48v-100ah',
    sku: 'EW-LFP48100',
    name: 'Eco-Worthy 48V 100Ah Server Rack Battery',
    brand: 'Eco-Worthy',
    category: 'batteries',
    voltageClass: '48V',
    image: batteryImg,
    msrp: 1099,
    summarySpec: '5,120 Wh · 51.2V · Budget Leader $/Wh · 6,000 Cycles',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '51.2V (16S)',
      capacityWh: 5120,
      powerWatts: 5120,
      efficiencyPct: 97.6,
      cycleLife: 6000,
      maxChargeAmps: 100,
      chemistryOrCell: 'Grade-A Prismatic LiFePO4',
      certifications: ['UN38.3', 'CE', 'IEC 62619'],
      lowTempCutoff: true,
      bmsComms: 'CAN / RS485 + Bluetooth',
      weightLbs: 94.8,
      dimensionsIn: '17.4 × 17.7 × 6.1',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Nov 2026',
      internalBuildNote:
        'Tested at 5,240 Wh usable capacity (102.3% of rating); clean compression frame.',
      thermalResult: '44°C BMS MOSFET temp at 95A continuous load',
      bmsOrMpptVerdict:
        'Best raw $/Wh in 48V class; lacks UL 9540 grid-tie listing.',
    },
    offers: buildMultiStoreOffers('EW-LFP48100', {
      baseAnchor: 849,
      category: 'batteries',
      brand: 'Eco-Worthy',
      warrantyYears: 5,
      weightLbs: 94.8,
      overrides: {
        Amazon: { price: 849, shipping: 0, couponDiscount: 30, promoLabel: 'Clip -$30 Coupon' },
        eBay: { price: 839, shipping: 0, couponDiscount: 25, promoLabel: 'Direct Outlet -$25' },
        'eBay Refurb': { price: 699, shipping: 0, inStock: true },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 969 },
      { date: 'Sep 02', price: 949 },
      { date: 'Sep 17', price: 919 },
      { date: 'Oct 01', price: 899 },
      { date: 'Oct 16', price: 879 },
      { date: 'Nov 01', price: 859 },
      { date: 'Nov 15', price: 849 },
    ],
  },
  {
    id: 'ruixu-lithi2-48v-100ah',
    sku: 'RX-LITHI2-16',
    name: 'Ruixu Lithi2-16 48V 100Ah Wall/Rack LiFePO4',
    brand: 'Ruixu',
    category: 'batteries',
    voltageClass: '48V',
    image: batteryImg,
    msrp: 1299,
    summarySpec: '5,120 Wh · Dual M8 Terminals · Heated · UL 1973',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '51.2V (16S)',
      capacityWh: 5120,
      powerWatts: 5120,
      efficiencyPct: 98.1,
      cycleLife: 6000,
      maxChargeAmps: 100,
      chemistryOrCell: 'Grade-A Prismatic LiFePO4 (CATL)',
      certifications: ['UL 1973', 'UN38.3', 'FCC'],
      lowTempCutoff: true,
      bmsComms: 'CAN / RS485 / Victron / Luxpower',
      weightLbs: 99.2,
      dimensionsIn: '18.9 × 17.5 × 5.8',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Clean silicone-insulated 2 AWG leads, metal cell spacers, and built-in cold-weather heating pads.',
      thermalResult: '40°C MOSFET temp under 100A 1C pull',
      bmsOrMpptVerdict:
        'Strong mid-price contender with wall-mount bracket included.',
    },
    offers: buildMultiStoreOffers('RX-LITHI2-16', {
      baseAnchor: 999,
      category: 'batteries',
      brand: 'Ruixu',
      warrantyYears: 10,
      weightLbs: 99.2,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1149 },
      { date: 'Sep 02', price: 1119 },
      { date: 'Sep 17', price: 1099 },
      { date: 'Oct 01', price: 1069 },
      { date: 'Oct 16', price: 1049 },
      { date: 'Nov 01', price: 1019 },
      { date: 'Nov 15', price: 999 },
    ],
  },
  {
    id: 'litime-12v-230ah-plus',
    sku: 'LT-12V230-PLUS',
    name: 'LiTime 12V 230Ah Plus Low-Temp LiFePO4',
    brand: 'LiTime',
    category: 'batteries',
    voltageClass: '12V/24V',
    image: batteryImg,
    msrp: 699,
    summarySpec: '2,944 Wh · 200A BMS · Low-Temp Cutoff · RV/Marine',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '12.8V (4S)',
      capacityWh: 2944,
      powerWatts: 2560,
      efficiencyPct: 97.8,
      cycleLife: 4000,
      maxChargeAmps: 200,
      chemistryOrCell: 'Grade-A Automotive Prismatic LiFePO4',
      certifications: ['UL 2054', 'UN38.3', 'IP65'],
      lowTempCutoff: true,
      bmsComms: 'Standalone Smart BMS',
      weightLbs: 44.5,
      dimensionsIn: '19.0 × 6.7 × 9.4',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Measured 238Ah (3,046 Wh) at 0.2C bench discharge; neat dual copper shunt paths.',
      thermalResult: '43°C terminal temperature at 180A draw',
      bmsOrMpptVerdict:
        'Benchmark 12V value for camper vans, trolling motors, and 24V sheds.',
    },
    offers: buildMultiStoreOffers('LT-12V230-PLUS', {
      baseAnchor: 499,
      category: 'batteries',
      brand: 'LiTime',
      warrantyYears: 5,
      weightLbs: 44.5,
      overrides: {
        Amazon: { price: 499, shipping: 0, couponDiscount: 20, promoLabel: 'Prime -$20 Coupon' },
        eBay: { price: 489, shipping: 0, couponDiscount: 15, promoLabel: 'Code SOLARFALL (-$15)' },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 589 },
      { date: 'Sep 02', price: 569 },
      { date: 'Sep 17', price: 549 },
      { date: 'Oct 01', price: 539 },
      { date: 'Oct 16', price: 519 },
      { date: 'Nov 01', price: 509 },
      { date: 'Nov 15', price: 499 },
    ],
  },
  {
    id: 'epoch-12v-300ah-heated',
    sku: 'EP-12300-IP67',
    name: 'Epoch Essentials 12V 300Ah Heated Bluetooth IP67',
    brand: 'Epoch Batteries',
    category: 'batteries',
    voltageClass: '12V/24V',
    image: batteryImg,
    msrp: 999,
    summarySpec: '3,840 Wh · IP67 Waterproof · Victron CAN · Heated',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '12.8V (4S)',
      capacityWh: 3840,
      powerWatts: 2560,
      efficiencyPct: 98.1,
      cycleLife: 4500,
      maxChargeAmps: 200,
      chemistryOrCell: 'Grade-A EVE 304Ah Cells',
      certifications: ['UL 1973', 'IP67', 'ABYC Ready'],
      lowTempCutoff: true,
      bmsComms: 'Victron VE.Can + Bluetooth App',
      weightLbs: 62.0,
      dimensionsIn: '20.5 × 10.6 × 8.7',
      warrantyYears: 11,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'True IP67 gasketed marine enclosure with internal heater and active 2A balancer.',
      thermalResult: '37°C internal BMS under sustained 150A draw',
      bmsOrMpptVerdict:
        'Top-tier 12V marine/RV drop-in with Victron Cerbo GX telemetry.',
    },
    offers: buildMultiStoreOffers('EP-12300-IP67', {
      baseAnchor: 849,
      category: 'batteries',
      brand: 'Epoch Batteries',
      warrantyYears: 11,
      weightLbs: 62.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 949 },
      { date: 'Sep 02', price: 929 },
      { date: 'Sep 17', price: 909 },
      { date: 'Oct 01', price: 889 },
      { date: 'Oct 16', price: 869 },
      { date: 'Nov 01', price: 859 },
      { date: 'Nov 15', price: 849 },
    ],
  },

  // =========================================================================
  // 2. SOLAR PANELS (7 Models)
  // =========================================================================
  {
    id: 'canadian-solar-440w-bifacial',
    sku: 'CS-TOPBIHIKU-440',
    name: 'Canadian Solar 440W N-Type TOPCon Bifacial',
    brand: 'Canadian Solar',
    category: 'panels',
    voltageClass: 'High Voltage PV',
    image: panelImg,
    msrp: 215,
    summarySpec: '440 W · 22.5% Eff · 39.4V Voc · Dual-Glass Bifacial',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '32.4V Vmp / 39.4V Voc',
      powerWatts: 440,
      efficiencyPct: 22.5,
      maxPvInputVoc: 39.4,
      chemistryOrCell: 'N-Type TOPCon Monocrystalline (108 Half-Cell)',
      certifications: ['UL 61730', 'IEC 61215', 'Salt Mist Class 6'],
      weightLbs: 50.7,
      dimensionsIn: '67.8 × 44.6 × 1.18',
      warrantyYears: 25,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Measured 431W STC front-side + 68W rear albedo gain over white gravel roof.',
      thermalResult:
        '-0.29%/°C temp coefficient preserves output on 38°C summer arrays',
      bmsOrMpptVerdict:
        'Ideal 10-panel series string Voc (394V) for 500V MPPT hybrid inverters.',
    },
    offers: buildMultiStoreOffers('CS-TOPBIHIKU-440', {
      baseAnchor: 132,
      category: 'panels',
      brand: 'Canadian Solar',
      warrantyYears: 25,
      weightLbs: 50.7,
      overrides: {
        'Signature Solar': { price: 129, shipping: 22 },
        'SanTan Solar': { price: 134, shipping: 19 },
        Amazon: { price: 158, shipping: 0 },
        eBay: { price: 146, shipping: 0 },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 158 },
      { date: 'Sep 02', price: 154 },
      { date: 'Sep 17', price: 149 },
      { date: 'Oct 01', price: 142 },
      { date: 'Oct 16', price: 138 },
      { date: 'Nov 01', price: 133 },
      { date: 'Nov 15', price: 129 },
    ],
  },
  {
    id: 'rec-alpha-pure-r-430w',
    sku: 'REC-430AA-PURE-R',
    name: 'REC Alpha Pure-R 430W Heterojunction Panel',
    brand: 'REC Solar',
    category: 'panels',
    voltageClass: 'High Voltage PV',
    image: panelImg,
    msrp: 345,
    summarySpec: '430 W · 22.3% Eff · 59.4V Voc · Lead-Free HJT',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '50.5V Vmp / 59.4V Voc',
      powerWatts: 430,
      efficiencyPct: 22.3,
      maxPvInputVoc: 59.4,
      chemistryOrCell: 'Heterojunction (HJT) 80 Half-Cut Cells',
      certifications: ['UL 61730', 'IEC 61215', 'Hail 35mm Rated'],
      weightLbs: 47.4,
      dimensionsIn: '68.1 × 44.0 × 1.18',
      warrantyYears: 25,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Ultra-low -0.24%/°C thermal coefficient and 92% warranted output at year 25.',
      thermalResult: 'Top performer in hot-roof shade resilience tests',
      bmsOrMpptVerdict:
        'Higher 59.4V Voc — limit series strings to 7 panels on 500V MPPTs.',
    },
    offers: buildMultiStoreOffers('REC-430AA-PURE-R', {
      baseAnchor: 258,
      category: 'panels',
      brand: 'REC Solar',
      warrantyYears: 25,
      weightLbs: 47.4,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 295 },
      { date: 'Sep 02', price: 289 },
      { date: 'Sep 17', price: 279 },
      { date: 'Oct 01', price: 272 },
      { date: 'Oct 16', price: 268 },
      { date: 'Nov 01', price: 262 },
      { date: 'Nov 15', price: 258 },
    ],
  },
  {
    id: 'qcells-qpeak-duo-405w',
    sku: 'QCELLS-G10-405',
    name: 'Qcells Q.PEAK DUO BLK ML-G10+ 405W',
    brand: 'Qcells',
    category: 'panels',
    voltageClass: 'High Voltage PV',
    image: panelImg,
    msrp: 230,
    summarySpec: '405 W · 20.6% Eff · 37.1V Voc · US-Assembled',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '31.1V Vmp / 37.1V Voc',
      powerWatts: 405,
      efficiencyPct: 20.6,
      maxPvInputVoc: 37.1,
      chemistryOrCell: 'Q.ANTUM DUO Z Mono PERC (132 Half-Cell)',
      certifications: ['UL 61730', 'IEC 61215', 'Domestic Content'],
      weightLbs: 48.5,
      dimensionsIn: '74.0 × 41.1 × 1.26',
      warrantyYears: 25,
    },
    benchmark: {
      verified: true,
      testedDate: 'Aug 2026',
      internalBuildNote:
        'Zero-gap cell layout with anodized black backsheet; built in Dalton, GA.',
      thermalResult: '-0.34%/°C standard PERC thermal profile',
      bmsOrMpptVerdict:
        'Reliable everyday roof panel; widely eligible for domestic content incentives.',
    },
    offers: buildMultiStoreOffers('QCELLS-G10-405', {
      baseAnchor: 145,
      category: 'panels',
      brand: 'Qcells',
      warrantyYears: 25,
      weightLbs: 48.5,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 168 },
      { date: 'Sep 02', price: 164 },
      { date: 'Sep 17', price: 159 },
      { date: 'Oct 01', price: 155 },
      { date: 'Oct 16', price: 149 },
      { date: 'Nov 01', price: 146 },
      { date: 'Nov 15', price: 142 },
    ],
  },
  {
    id: 'aptos-440w-dna-bifacial',
    sku: 'APTOS-DNA108-440',
    name: 'Aptos 440W DNA-108-BF10-440W-DG Bifacial',
    brand: 'Aptos Solar',
    category: 'panels',
    voltageClass: 'High Voltage PV',
    image: panelImg,
    msrp: 210,
    summarySpec: '440 W · 22.5% Eff · 39.2V Voc · Dual-Glass 30-Yr',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '33.0V Vmp / 39.2V Voc',
      powerWatts: 440,
      efficiencyPct: 22.5,
      maxPvInputVoc: 39.2,
      chemistryOrCell: 'N-Type TOPCon Dual-Glass Bifacial',
      certifications: ['UL 61730', 'IEC 61215', '170 mph Wind'],
      weightLbs: 51.0,
      dimensionsIn: '67.8 × 44.6 × 1.18',
      warrantyYears: 30,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Double-glass structural frame resists micro-cracking in heavy snow & ground-mount installs.',
      thermalResult: '-0.29%/°C low thermal degradation',
      bmsOrMpptVerdict:
        'Per-watt bargain for DIY ground mounts when ordered by the pallet.',
    },
    offers: buildMultiStoreOffers('APTOS-DNA108-440', {
      baseAnchor: 126,
      category: 'panels',
      brand: 'Aptos Solar',
      warrantyYears: 30,
      weightLbs: 51.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 152 },
      { date: 'Sep 02', price: 148 },
      { date: 'Sep 17', price: 142 },
      { date: 'Oct 01', price: 138 },
      { date: 'Oct 16', price: 133 },
      { date: 'Nov 01', price: 129 },
      { date: 'Nov 15', price: 126 },
    ],
  },
  {
    id: 'jinko-eagle-415w-mono',
    sku: 'JKM-415N-54HL4',
    name: 'Jinko Eagle 415W N-Type Monocrystalline',
    brand: 'Jinko Solar',
    category: 'panels',
    voltageClass: 'High Voltage PV',
    image: panelImg,
    msrp: 195,
    summarySpec: '415 W · 21.3% Eff · 37.9V Voc · Hot-Spot Free',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '31.5V Vmp / 37.9V Voc',
      powerWatts: 415,
      efficiencyPct: 21.3,
      maxPvInputVoc: 37.9,
      chemistryOrCell: 'N-Type Mono-Si 108 Cell',
      certifications: ['UL 61730', 'IEC 61215', 'PID Resistant'],
      weightLbs: 48.5,
      dimensionsIn: '67.9 × 44.6 × 1.18',
      warrantyYears: 25,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Consistent flash-test ratings averaging +4.2W above nameplate label.',
      thermalResult: '-0.30%/°C thermal coefficient',
      bmsOrMpptVerdict:
        'Widely stocked across regional big-box and marketplace sellers.',
    },
    offers: buildMultiStoreOffers('JKM-415N-54HL4', {
      baseAnchor: 122,
      category: 'panels',
      brand: 'Jinko Solar',
      warrantyYears: 25,
      weightLbs: 48.5,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 145 },
      { date: 'Sep 02', price: 140 },
      { date: 'Sep 17', price: 136 },
      { date: 'Oct 01', price: 132 },
      { date: 'Oct 16', price: 128 },
      { date: 'Nov 01', price: 125 },
      { date: 'Nov 15', price: 122 },
    ],
  },
  {
    id: 'rich-solar-200w-12v',
    sku: 'RS-M200-12V',
    name: 'Rich Solar Mega 200W 12V Monocrystalline',
    brand: 'Rich Solar',
    category: 'panels',
    voltageClass: '12V/24V',
    image: panelImg,
    msrp: 199,
    summarySpec: '200 W · 21.4% Eff · 24.3V Voc · Van / RV Footprint',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '20.4V Vmp / 24.3V Voc',
      powerWatts: 200,
      efficiencyPct: 21.4,
      maxPvInputVoc: 24.3,
      chemistryOrCell: '9BB Monocrystalline PERC',
      certifications: ['IEC 61215', 'CE', 'RoHS'],
      weightLbs: 26.5,
      dimensionsIn: '58.7 × 26.8 × 1.4',
      warrantyYears: 25,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Consistently outputs 188–194W at solar noon in horizontal van-roof mounting.',
      thermalResult: 'Rigid 35mm frame handles 5400Pa snow load',
      bmsOrMpptVerdict:
        'Top pick for 12V/24V van conversions with Victron 100/50 controllers.',
    },
    offers: buildMultiStoreOffers('RS-M200-12V', {
      baseAnchor: 139,
      category: 'panels',
      brand: 'Rich Solar',
      warrantyYears: 25,
      weightLbs: 26.5,
      overrides: {
        Amazon: { price: 139, shipping: 0 },
        eBay: { price: 135, shipping: 0 },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 169 },
      { date: 'Sep 02', price: 165 },
      { date: 'Sep 17', price: 159 },
      { date: 'Oct 01', price: 155 },
      { date: 'Oct 16', price: 149 },
      { date: 'Nov 01', price: 145 },
      { date: 'Nov 15', price: 139 },
    ],
  },
  {
    id: 'ecoflow-220w-bifacial-portable',
    sku: 'EF-220W-BIFACIAL',
    name: 'EcoFlow 220W Bifacial Folding Solar Panel',
    brand: 'EcoFlow',
    category: 'panels',
    voltageClass: '12V/24V',
    image: panelImg,
    msrp: 649,
    summarySpec: '220 W Front / 155W Rear · IP68 Waterproof · MC4',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '18.4V Vmp / 21.8V Voc',
      powerWatts: 220,
      efficiencyPct: 23.0,
      maxPvInputVoc: 21.8,
      chemistryOrCell: 'Tempered Glass Bifacial Monocrystalline',
      certifications: ['IP68', 'CE', 'FCC'],
      weightLbs: 20.9,
      dimensionsIn: '32.3 × 72.0 × 1.0',
      warrantyYears: 2,
    },
    benchmark: {
      verified: true,
      testedDate: 'Aug 2026',
      internalBuildNote:
        'True ETFE + thin glass lamination delivers 212W combined output over concrete.',
      thermalResult: 'Kickstand carry case supports 45° angle deployment',
      bmsOrMpptVerdict:
        'Universal MC4 leads pair directly with EcoFlow, Bluetti, and Anker stations.',
    },
    offers: buildMultiStoreOffers('EF-220W-BIFACIAL', {
      baseAnchor: 349,
      category: 'panels',
      brand: 'EcoFlow',
      warrantyYears: 2,
      weightLbs: 20.9,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 429 },
      { date: 'Sep 02', price: 415 },
      { date: 'Sep 17', price: 399 },
      { date: 'Oct 01', price: 389 },
      { date: 'Oct 16', price: 375 },
      { date: 'Nov 01', price: 359 },
      { date: 'Nov 15', price: 349 },
    ],
  },

  // =========================================================================
  // 3. HYBRID INVERTERS (6 Models)
  // =========================================================================
  {
    id: 'eg4-6000xp-inverter',
    sku: 'EG4-6000XP',
    name: 'EG4 6000XP 48V Split-Phase Off-Grid Inverter',
    brand: 'EG4 Electronics',
    category: 'inverters',
    voltageClass: '48V',
    image: inverterImg,
    msrp: 1599,
    summarySpec: '6,000 W Split-Phase · 8,000W Dual MPPT · 480V Max PV',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '48V DC → 120V/240V AC',
      powerWatts: 6000,
      efficiencyPct: 93.5,
      maxPvInputVoc: 480,
      maxChargeAmps: 125,
      chemistryOrCell: 'High-Frequency Dual-MPPT Transformerless',
      certifications: ['UL 1741', 'CSA C22.2', 'FCC Part 15'],
      bmsComms: 'CAN / RS485 + Wi-Fi Dongle',
      weightLbs: 55.1,
      dimensionsIn: '26.6 × 17.7 × 6.1',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        '52W idle consumption measured at battery terminals; built-in 100A transfer switch.',
      thermalResult: 'Quiet variable fans stay below 48dB under 3kW load',
      bmsOrMpptVerdict:
        'Best value 240V split-phase inverter for off-grid cabins and backup subpanels.',
    },
    offers: buildMultiStoreOffers('EG4-6000XP', {
      baseAnchor: 1399,
      category: 'inverters',
      brand: 'EG4 Electronics',
      warrantyYears: 5,
      weightLbs: 55.1,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1499 },
      { date: 'Sep 02', price: 1499 },
      { date: 'Sep 17', price: 1449 },
      { date: 'Oct 01', price: 1449 },
      { date: 'Oct 16', price: 1399 },
      { date: 'Nov 01', price: 1399 },
      { date: 'Nov 15', price: 1399 },
    ],
  },
  {
    id: 'eg4-18kpv-12kw',
    sku: 'EG4-18KPV-12LV',
    name: 'EG4 18kPV-12LV 12kW Whole-Home Hybrid Inverter',
    brand: 'EG4 Electronics',
    category: 'inverters',
    voltageClass: '48V',
    image: inverterImg,
    msrp: 5499,
    summarySpec: '12,000 W Split-Phase · 18kW PV Input · 200A Passthrough',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '48V DC → 120V/240V AC',
      powerWatts: 12000,
      efficiencyPct: 97.5,
      maxPvInputVoc: 600,
      maxChargeAmps: 250,
      chemistryOrCell: '3× MPPT (600V) NEMA 4X Grid-Interactive',
      certifications: ['UL 1741 SA/SB', 'IEEE 1547', 'UL 9540', 'NEMA 4X'],
      bmsComms: 'CAN / RS485 / Modbus + RSD Transmitter',
      weightLbs: 112.0,
      dimensionsIn: '33.8 × 20.5 × 11.4',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'True 600V MPPT ceiling allows up to 13× 440W panels in a single string.',
      thermalResult: 'IP65 sealed heatsink handles full 12kW without indoor noise',
      bmsOrMpptVerdict:
        'Direct competitor to Sol-Ark 15K at roughly $800 lower landed price.',
    },
    offers: buildMultiStoreOffers('EG4-18KPV-12LV', {
      baseAnchor: 4899,
      category: 'inverters',
      brand: 'EG4 Electronics',
      warrantyYears: 10,
      weightLbs: 112.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 5299 },
      { date: 'Sep 02', price: 5199 },
      { date: 'Sep 17', price: 5099 },
      { date: 'Oct 01', price: 5049 },
      { date: 'Oct 16', price: 4999 },
      { date: 'Nov 01', price: 4949 },
      { date: 'Nov 15', price: 4899 },
    ],
  },
  {
    id: 'solark-15k-2p',
    sku: 'SOLARK-15K-2P',
    name: 'Sol-Ark 15K-2P Whole-Home Hybrid Inverter',
    brand: 'Sol-Ark',
    category: 'inverters',
    voltageClass: '48V',
    image: inverterImg,
    msrp: 6995,
    summarySpec: '15,000 W Split-Phase · 200A Passthrough · NEMA 3R',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '48V DC → 120V/240V AC',
      powerWatts: 15000,
      efficiencyPct: 96.5,
      maxPvInputVoc: 500,
      maxChargeAmps: 275,
      chemistryOrCell: '3× MPPT (19.5kW PV) Grid-Interactive Hybrid',
      certifications: ['UL 1741 SA/SB', 'IEEE 1547', 'UL 9540'],
      bmsComms: 'CAN / RS485 / Modbus TCP',
      weightLbs: 135.0,
      dimensionsIn: '31.9 × 18.3 × 10.9',
      warrantyYears: 10,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Handles 200A whole-home service entrance without an external critical-loads subpanel.',
      thermalResult: '4ms UPS transfer tested with zero server rack reboot',
      bmsOrMpptVerdict:
        'Gold standard for permitted net-metering + EMP-hardened residential installs.',
    },
    offers: buildMultiStoreOffers('SOLARK-15K-2P', {
      baseAnchor: 5690,
      category: 'inverters',
      brand: 'Sol-Ark',
      warrantyYears: 10,
      weightLbs: 135.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 6195 },
      { date: 'Sep 02', price: 5995 },
      { date: 'Sep 17', price: 5895 },
      { date: 'Oct 01', price: 5840 },
      { date: 'Oct 16', price: 5790 },
      { date: 'Nov 01', price: 5720 },
      { date: 'Nov 15', price: 5690 },
    ],
  },
  {
    id: 'victron-multiplus-ii-48-5000',
    sku: 'VIC-PMP482505102',
    name: 'Victron MultiPlus-II 48V 5000VA 120V',
    brand: 'Victron Energy',
    category: 'inverters',
    voltageClass: '48V',
    image: inverterImg,
    msrp: 1580,
    summarySpec: '4,000 W Cont (9,000W Surge) · Low-Freq Toroidal · 18W Idle',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '48V DC → 120V AC (Stackable)',
      powerWatts: 4000,
      efficiencyPct: 95.0,
      maxChargeAmps: 70,
      chemistryOrCell: 'Low-Frequency Toroidal Transformer',
      certifications: ['UL 1741', 'UL 458 Marine', 'CE'],
      bmsComms: 'VE.Bus / Cerbo GX',
      weightLbs: 66.0,
      dimensionsIn: '22.2 × 12.6 × 5.5',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Massive copper toroidal core starts deep-well pumps & 15,000 BTU A/C compressors effortlessly.',
      thermalResult: 'Only 18W no-load idle draw saves 0.8 kWh/day vs HF units',
      bmsOrMpptVerdict:
        'Unmatched surge durability and ultra-low standby draw; requires external MPPT.',
    },
    offers: buildMultiStoreOffers('VIC-PMP482505102', {
      baseAnchor: 1185,
      category: 'inverters',
      brand: 'Victron Energy',
      warrantyYears: 5,
      weightLbs: 66.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1320 },
      { date: 'Sep 02', price: 1295 },
      { date: 'Sep 17', price: 1265 },
      { date: 'Oct 01', price: 1240 },
      { date: 'Oct 16', price: 1215 },
      { date: 'Nov 01', price: 1195 },
      { date: 'Nov 15', price: 1185 },
    ],
  },
  {
    id: 'growatt-spf-5000es',
    sku: 'GRW-SPF5000ES',
    name: 'Growatt SPF 5000ES 5kW 48V Off-Grid Inverter',
    brand: 'Growatt',
    category: 'inverters',
    voltageClass: '48V',
    image: inverterImg,
    msrp: 999,
    summarySpec: '5,000 W · 450V MPPT · Batteryless Capable · Budget 48V',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '48V DC → 230V AC (120V w/ Autotransformer)',
      powerWatts: 5000,
      efficiencyPct: 93.0,
      maxPvInputVoc: 450,
      maxChargeAmps: 100,
      chemistryOrCell: 'High-Frequency Single MPPT (6,000W PV)',
      certifications: ['CE', 'IEC 62109'],
      bmsComms: 'CAN / RS485 + ShineWiFi',
      weightLbs: 26.5,
      dimensionsIn: '19.1 × 13.0 × 4.7',
      warrantyYears: 2,
    },
    benchmark: {
      verified: true,
      testedDate: 'Aug 2026',
      internalBuildNote:
        'Can run directly off PV array in daylight without battery connected; outputs 230V native.',
      thermalResult: 'Continuous 4.8kW tested at 30°C workshop ambient',
      bmsOrMpptVerdict:
        'Cheapest $/W 5kW off-grid inverter; requires autotransformer for US 120V loads.',
    },
    offers: buildMultiStoreOffers('GRW-SPF5000ES', {
      baseAnchor: 679,
      category: 'inverters',
      brand: 'Growatt',
      warrantyYears: 2,
      weightLbs: 26.5,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 789 },
      { date: 'Sep 02', price: 769 },
      { date: 'Sep 17', price: 749 },
      { date: 'Oct 01', price: 729 },
      { date: 'Oct 16', price: 709 },
      { date: 'Nov 01', price: 689 },
      { date: 'Nov 15', price: 679 },
    ],
  },
  {
    id: 'sungoldpower-10kw-48v-ul',
    sku: 'SGP-SP10K48-UL',
    name: 'SunGoldPower 10kW 48V Split-Phase Hybrid UL 1741',
    brand: 'SunGoldPower',
    category: 'inverters',
    voltageClass: '48V',
    image: inverterImg,
    msrp: 2499,
    summarySpec: '10,000 W Split-Phase · Dual 500V MPPT · 200A Charger',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '48V DC → 120V/240V AC',
      powerWatts: 10000,
      efficiencyPct: 93.8,
      maxPvInputVoc: 500,
      maxChargeAmps: 200,
      chemistryOrCell: 'Dual-MPPT (11,000W PV) Split-Phase',
      certifications: ['UL 1741', 'CSA C22.2'],
      bmsComms: 'CAN / RS485 + Wi-Fi',
      weightLbs: 62.0,
      dimensionsIn: '24.4 × 16.5 × 5.7',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'SRNE OEM architecture with solid copper bus terminals and 15kW 5-second surge.',
      thermalResult: 'Dual-fan thermal ramp at 45°C heatsink',
      bmsOrMpptVerdict:
        'Unbeatable $/W for 10kW split-phase off-grid workshops and homesteads.',
    },
    offers: buildMultiStoreOffers('SGP-SP10K48-UL', {
      baseAnchor: 1699,
      category: 'inverters',
      brand: 'SunGoldPower',
      warrantyYears: 5,
      weightLbs: 62.0,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1999 },
      { date: 'Sep 02', price: 1949 },
      { date: 'Sep 17', price: 1899 },
      { date: 'Oct 01', price: 1849 },
      { date: 'Oct 16', price: 1799 },
      { date: 'Nov 01', price: 1749 },
      { date: 'Nov 15', price: 1699 },
    ],
  },

  // =========================================================================
  // 4. PORTABLE POWER STATIONS (5 Models)
  // =========================================================================
  {
    id: 'ecoflow-delta-pro-3',
    sku: 'EF-DP3-4096',
    name: 'EcoFlow DELTA Pro 3 Portable Power Station',
    brand: 'EcoFlow',
    category: 'portable',
    voltageClass: '120V/240V AC',
    image: portableImg,
    msrp: 3699,
    summarySpec: '4,096 Wh · 4,000W 120V/240V · 2,600W Solar Input',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '120V / 240V Split-Phase AC',
      capacityWh: 4096,
      powerWatts: 4000,
      efficiencyPct: 91.5,
      cycleLife: 4000,
      maxPvInputVoc: 150,
      chemistryOrCell: 'Automotive LFP (LiFePO4)',
      certifications: ['UL 2743', 'FCC', 'IP65 Pack'],
      lowTempCutoff: true,
      bmsComms: 'X-Core 3.0 App + CAN Expansion',
      weightLbs: 113.5,
      dimensionsIn: '27.3 × 13.4 × 16.1',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Dual independent MPPT inputs (150V/15A + 60V/20A) pull 2,600W from residential panels.',
      thermalResult: 'Ultra-quiet 30dB under 2,000W load; 10ms UPS switchover',
      bmsOrMpptVerdict:
        'True plug-and-play 240V backup with zero conduit wiring required.',
    },
    offers: buildMultiStoreOffers('EF-DP3-4096', {
      baseAnchor: 2799,
      category: 'portable',
      brand: 'EcoFlow',
      warrantyYears: 5,
      weightLbs: 113.5,
      overrides: {
        Amazon: { price: 2799, shipping: 0 },
        eBay: { price: 2749, shipping: 0, couponDiscount: 50, promoLabel: 'Authorized Refurb/New Promo' },
      },
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 3299 },
      { date: 'Sep 02', price: 3199 },
      { date: 'Sep 17', price: 3099 },
      { date: 'Oct 01', price: 2999 },
      { date: 'Oct 16', price: 2899 },
      { date: 'Nov 01', price: 2849 },
      { date: 'Nov 15', price: 2799 },
    ],
  },
  {
    id: 'ecoflow-delta-2-max',
    sku: 'EF-D2M-2048',
    name: 'EcoFlow DELTA 2 Max 2048Wh Power Station',
    brand: 'EcoFlow',
    category: 'portable',
    voltageClass: '120V/240V AC',
    image: portableImg,
    msrp: 1899,
    summarySpec: '2,048 Wh · 2,400W AC · 1,000W Dual MPPT · 3,000 Cycles',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '120V AC Pure Sine',
      capacityWh: 2048,
      powerWatts: 2400,
      efficiencyPct: 90.8,
      cycleLife: 3000,
      maxPvInputVoc: 60,
      chemistryOrCell: 'LiFePO4 Prismatic',
      certifications: ['UL 2743', 'FCC', 'UN38.3'],
      lowTempCutoff: true,
      bmsComms: 'Wi-Fi / Bluetooth App',
      weightLbs: 50.7,
      dimensionsIn: '19.6 × 9.5 × 12.0',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Measured 1,860 Wh usable AC capacity; dual 500W XT60i solar ports accept parallel panels.',
      thermalResult: '12 lbs lighter than competing 2kWh LiFePO4 stations',
      bmsOrMpptVerdict:
        'Best portable 2kWh weight-to-capacity ratio for camping and outages.',
    },
    offers: buildMultiStoreOffers('EF-D2M-2048', {
      baseAnchor: 1149,
      category: 'portable',
      brand: 'EcoFlow',
      warrantyYears: 5,
      weightLbs: 50.7,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1499 },
      { date: 'Sep 02', price: 1399 },
      { date: 'Sep 17', price: 1349 },
      { date: 'Oct 01', price: 1299 },
      { date: 'Oct 16', price: 1249 },
      { date: 'Nov 01', price: 1199 },
      { date: 'Nov 15', price: 1149 },
    ],
  },
  {
    id: 'bluetti-ac200l',
    sku: 'BLU-AC200L-2048',
    name: 'Bluetti AC200L 2048Wh Expandable Power Station',
    brand: 'Bluetti',
    category: 'portable',
    voltageClass: '120V/240V AC',
    image: portableImg,
    msrp: 1999,
    summarySpec: '2,048 Wh · 2,400W AC · 1,200W Solar (145V Voc)',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '120V AC + 48V DC RV Port',
      capacityWh: 2048,
      powerWatts: 2400,
      efficiencyPct: 90.4,
      cycleLife: 3500,
      maxPvInputVoc: 145,
      chemistryOrCell: 'Prismatic LiFePO4',
      certifications: ['UL 2743', 'cTUVus', 'UN38.3'],
      lowTempCutoff: true,
      bmsComms: 'Bluetooth / Wi-Fi App',
      weightLbs: 62.4,
      dimensionsIn: '16.5 × 11.0 × 14.4',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Measured 1,852 Wh usable AC capacity (90.4% inverter efficiency) at 500W load.',
      thermalResult: '145V PV input lets 3× 400W residential panels run in series',
      bmsOrMpptVerdict:
        'High-voltage MPPT makes it stand out for van and cabin emergency kits.',
    },
    offers: buildMultiStoreOffers('BLU-AC200L-2048', {
      baseAnchor: 1199,
      category: 'portable',
      brand: 'Bluetti',
      warrantyYears: 5,
      weightLbs: 62.4,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 1599 },
      { date: 'Sep 02', price: 1499 },
      { date: 'Sep 17', price: 1399 },
      { date: 'Oct 01', price: 1349 },
      { date: 'Oct 16', price: 1299 },
      { date: 'Nov 01', price: 1249 },
      { date: 'Nov 15', price: 1199 },
    ],
  },
  {
    id: 'bluetti-ac300-b300k',
    sku: 'BLU-AC300-B300K',
    name: 'Bluetti AC300 + B300K Modular Solar System',
    brand: 'Bluetti',
    category: 'portable',
    voltageClass: '120V/240V AC',
    image: portableImg,
    msrp: 2599,
    summarySpec: '2,764 Wh · 3,000W AC · 2,400W Dual MPPT · Modular',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '120V AC (240V with 2nd AC300)',
      capacityWh: 2764,
      powerWatts: 3000,
      efficiencyPct: 91.0,
      cycleLife: 4000,
      maxPvInputVoc: 150,
      chemistryOrCell: 'Modular Prismatic LiFePO4',
      certifications: ['UL 2743', 'cTUVus'],
      lowTempCutoff: true,
      bmsComms: 'Bluetti App + Fusion Box',
      weightLbs: 108.5,
      dimensionsIn: '20.5 × 12.6 × 14.1',
      warrantyYears: 4,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Separate inverter head makes moving 65 lb battery modules solo dramatically easier.',
      thermalResult: 'Dual 150V/12A MPPTs ingest 2,400W solar cleanly',
      bmsOrMpptVerdict:
        'Great modular compromise between portable stations and wall-mount inverters.',
    },
    offers: buildMultiStoreOffers('BLU-AC300-B300K', {
      baseAnchor: 1799,
      category: 'portable',
      brand: 'Bluetti',
      warrantyYears: 4,
      weightLbs: 108.5,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 2199 },
      { date: 'Sep 02', price: 2099 },
      { date: 'Sep 17', price: 1999 },
      { date: 'Oct 01', price: 1949 },
      { date: 'Oct 16', price: 1899 },
      { date: 'Nov 01', price: 1849 },
      { date: 'Nov 15', price: 1799 },
    ],
  },
  {
    id: 'anker-solix-f3800',
    sku: 'ANK-SOLIX-F3800',
    name: 'Anker SOLIX F3800 3,840Wh 6000W Power Station',
    brand: 'Anker SOLIX',
    category: 'portable',
    voltageClass: '120V/240V AC',
    image: portableImg,
    msrp: 3999,
    summarySpec: '3,840 Wh · 6,000W 120V/240V · NEMA 14-50 EV Port',
    unitMetricType: '$/Wh',
    specs: {
      nominalVoltage: '120V / 240V Split-Phase AC',
      capacityWh: 3840,
      powerWatts: 6000,
      efficiencyPct: 91.2,
      cycleLife: 3000,
      maxPvInputVoc: 60,
      chemistryOrCell: 'EV-Grade LiFePO4',
      certifications: ['UL 2743', 'FCC', 'UN38.3'],
      lowTempCutoff: true,
      bmsComms: 'Anker App + Home Power Panel',
      weightLbs: 132.3,
      dimensionsIn: '27.6 × 15.3 × 15.5',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Single unit delivers 6,000W at 240V via NEMA 14-50 & L14-30R; supports Level 2 EV charging.',
      thermalResult: '60V PV ceiling requires parallel panel wiring (no high-V strings)',
      bmsOrMpptVerdict:
        'Highest single-box 240V inverter output on wheels; best paired with 12V-class panels.',
    },
    offers: buildMultiStoreOffers('ANK-SOLIX-F3800', {
      baseAnchor: 2699,
      category: 'portable',
      brand: 'Anker SOLIX',
      warrantyYears: 5,
      weightLbs: 132.3,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 3199 },
      { date: 'Sep 02', price: 3099 },
      { date: 'Sep 17', price: 2999 },
      { date: 'Oct 01', price: 2899 },
      { date: 'Oct 16', price: 2799 },
      { date: 'Nov 01', price: 2749 },
      { date: 'Nov 15', price: 2699 },
    ],
  },

  // =========================================================================
  // 5. MPPT CHARGE CONTROLLERS (4 Models)
  // =========================================================================
  {
    id: 'victron-smartsolar-150-100',
    sku: 'VIC-SCC115110410',
    name: 'Victron SmartSolar MPPT 150/100-Tr VE.Can',
    brand: 'Victron Energy',
    category: 'controllers',
    voltageClass: '48V',
    image: controllerImg,
    msrp: 699,
    summarySpec: '100A Output · 150V Max Voc · 5,800W @ 48V · 98% Eff',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '12V / 24V / 36V / 48V Auto',
      powerWatts: 5800,
      efficiencyPct: 98.0,
      maxPvInputVoc: 150,
      maxChargeAmps: 100,
      chemistryOrCell: 'Ultra-Fast MPPT + Synchronized VE.Can',
      certifications: ['UL 1741', 'IEC 62109', 'IP43 Electronics'],
      bmsComms: 'VE.Can + VE.Direct + Bluetooth',
      weightLbs: 9.9,
      dimensionsIn: '8.5 × 11.6 × 4.0',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Oct 2026',
      internalBuildNote:
        'Potted epoxy electronics + passive cast-aluminum heatsink with zero cooling fans.',
      thermalResult: 'Zero derating up to 40°C ambient; instant shade re-sweep',
      bmsOrMpptVerdict:
        'Industry benchmark for silent, long-life off-grid charge controllers.',
    },
    offers: buildMultiStoreOffers('VIC-SCC115110410', {
      baseAnchor: 534,
      category: 'controllers',
      brand: 'Victron Energy',
      warrantyYears: 5,
      weightLbs: 9.9,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 615 },
      { date: 'Sep 02', price: 599 },
      { date: 'Sep 17', price: 585 },
      { date: 'Oct 01', price: 569 },
      { date: 'Oct 16', price: 555 },
      { date: 'Nov 01', price: 545 },
      { date: 'Nov 15', price: 534 },
    ],
  },
  {
    id: 'victron-smartsolar-100-50',
    sku: 'VIC-SCC110050210',
    name: 'Victron SmartSolar MPPT 100/50 Bluetooth',
    brand: 'Victron Energy',
    category: 'controllers',
    voltageClass: '12V/24V',
    image: controllerImg,
    msrp: 295,
    summarySpec: '50A Output · 100V Max Voc · 1,400W @ 24V · Fanless',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '12V / 24V Auto',
      powerWatts: 1400,
      efficiencyPct: 98.0,
      maxPvInputVoc: 100,
      maxChargeAmps: 50,
      chemistryOrCell: 'Ultra-Fast Fanless MPPT',
      certifications: ['UL 1741', 'IP43 Electronics'],
      bmsComms: 'VE.Direct + Bluetooth Smart',
      weightLbs: 2.9,
      dimensionsIn: '5.1 × 7.3 × 2.8',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'Instant VictronConnect app telemetry, programmable tail current, and zero fan failures.',
      thermalResult: 'Passive fin dissipation holds 50A continuously in vans',
      bmsOrMpptVerdict:
        'Default recommendation for 400W–1,400W 12V/24V van and boat solar arrays.',
    },
    offers: buildMultiStoreOffers('VIC-SCC110050210', {
      baseAnchor: 199,
      category: 'controllers',
      brand: 'Victron Energy',
      warrantyYears: 5,
      weightLbs: 2.9,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 245 },
      { date: 'Sep 02', price: 235 },
      { date: 'Sep 17', price: 229 },
      { date: 'Oct 01', price: 219 },
      { date: 'Oct 16', price: 212 },
      { date: 'Nov 01', price: 205 },
      { date: 'Nov 15', price: 199 },
    ],
  },
  {
    id: 'renogy-rover-60a-mppt',
    sku: 'RNG-CTRL-RVR60',
    name: 'Renogy Rover Li 60A 12V/24V/48V MPPT Controller',
    brand: 'Renogy',
    category: 'controllers',
    voltageClass: '12V/24V',
    image: controllerImg,
    msrp: 299,
    summarySpec: '60A Output · 150V Max Voc · 3,200W @ 48V · 99% Tracking',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '12V / 24V / 36V / 48V Auto',
      powerWatts: 3200,
      efficiencyPct: 97.5,
      maxPvInputVoc: 150,
      maxChargeAmps: 60,
      chemistryOrCell: 'Die-Cast Aluminum MPPT (Negative Ground)',
      certifications: ['FCC Class B', 'CE', 'RoHS'],
      bmsComms: 'RS485 Modbus (BT-1 Compatible)',
      weightLbs: 7.9,
      dimensionsIn: '10.6 × 7.9 × 3.8',
      warrantyYears: 2,
    },
    benchmark: {
      verified: true,
      testedDate: 'Aug 2026',
      internalBuildNote:
        'Large screw terminals accept 4 AWG battery cable; accurate lithium float/absorption presets.',
      thermalResult: 'Runs warm at 55A+ continuous; mount vertically with 6" clearance',
      bmsOrMpptVerdict:
        'Strong $/W value for shed, RV, and starter 24V/48V builds.',
    },
    offers: buildMultiStoreOffers('RNG-CTRL-RVR60', {
      baseAnchor: 189,
      category: 'controllers',
      brand: 'Renogy',
      warrantyYears: 2,
      weightLbs: 7.9,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 239 },
      { date: 'Sep 02', price: 229 },
      { date: 'Sep 17', price: 219 },
      { date: 'Oct 01', price: 209 },
      { date: 'Oct 16', price: 199 },
      { date: 'Nov 01', price: 195 },
      { date: 'Nov 15', price: 189 },
    ],
  },
  {
    id: 'midnite-classic-150',
    sku: 'MNE-CLASSIC-150',
    name: 'MidNite Solar Classic 150 MPPT Charge Controller',
    brand: 'MidNite Solar',
    category: 'controllers',
    voltageClass: '48V',
    image: controllerImg,
    msrp: 849,
    summarySpec: '96A Output · 150V + HyperVOC · Arc Fault · Made in USA',
    unitMetricType: '$/W',
    specs: {
      nominalVoltage: '12V / 24V / 36V / 48V / 72V',
      powerWatts: 4950,
      efficiencyPct: 97.6,
      maxPvInputVoc: 150,
      maxChargeAmps: 96,
      chemistryOrCell: 'Arc-Fault + Ground-Fault Built-In MPPT',
      certifications: ['UL 1741', 'CSA C22.2', 'Made in USA'],
      bmsComms: 'Ethernet / Modbus / WhizBang Jr',
      weightLbs: 11.5,
      dimensionsIn: '14.9 × 5.9 × 4.0',
      warrantyYears: 5,
    },
    benchmark: {
      verified: true,
      testedDate: 'Sep 2026',
      internalBuildNote:
        'HyperVOC extends safe cold-weather non-operating input up to 150V + battery voltage.',
      thermalResult: 'Serviceable internal cooling fan + heavy-duty lug bar',
      bmsOrMpptVerdict:
        'Extreme cold-climate reliability and integrated PV arc-fault protection.',
    },
    offers: buildMultiStoreOffers('MNE-CLASSIC-150', {
      baseAnchor: 685,
      category: 'controllers',
      brand: 'MidNite Solar',
      warrantyYears: 5,
      weightLbs: 11.5,
    }),
    priceHistory90d: [
      { date: 'Aug 18', price: 749 },
      { date: 'Sep 02', price: 735 },
      { date: 'Sep 17', price: 719 },
      { date: 'Oct 01', price: 709 },
      { date: 'Oct 16', price: 699 },
      { date: 'Nov 01', price: 689 },
      { date: 'Nov 15', price: 685 },
    ],
  },
];

export const SOLAR_PRODUCTS: SolarProduct[] = RAW_SOLAR_PRODUCTS.map(
  (product) => {
    const insight = PRODUCT_INSIGHTS[product.id];
    return {
      ...product,
      sizeFootprint: insight.sizeFootprint,
      purposes: insight.purposes,
      starRating: insight.starRating,
      reviewCount: insight.reviewCount,
      buyerFollowers: insight.buyerFollowers,
      fastestDeliveryDays: insight.fastestDeliveryDays,
      topReviewExcerpt: insight.topReviewExcerpt,
      pros: insight.pros,
      cons: insight.cons,
    };
  }
);

export function getOfferLandedPrice(offer: MerchantOffer): number {
  return Math.max(0, offer.price + offer.shipping - (offer.couponDiscount ?? 0));
}

export function getFilteredOffers(
  product: SolarProduct,
  options?: {
    includeRefurb?: boolean;
    authorizedOnly?: boolean;
    channelFilter?: PlatformChannel | 'all';
  }
): MerchantOffer[] {
  const includeRefurb = options?.includeRefurb ?? true;
  const authorizedOnly = options?.authorizedOnly ?? false;
  const channelFilter = options?.channelFilter ?? 'all';

  return product.offers
    .filter((o) => {
      if (!includeRefurb && o.condition !== 'New') return false;
      if (authorizedOnly && !o.isAuthorizedDealer) return false;
      if (channelFilter !== 'all' && o.channel !== channelFilter) return false;
      return true;
    })
    .sort((a, b) => getOfferLandedPrice(a) - getOfferLandedPrice(b));
}

export function getBestOffer(
  product: SolarProduct,
  includeRefurb = true
): MerchantOffer {
  const list = getFilteredOffers(product, { includeRefurb });
  if (list.length > 0) return list[0];
  return [...product.offers].sort(
    (a, b) => getOfferLandedPrice(a) - getOfferLandedPrice(b)
  )[0];
}

export function getLandedPrice(
  product: SolarProduct,
  includeRefurb = true
): number {
  return getOfferLandedPrice(getBestOffer(product, includeRefurb));
}

export function getPriceSpread(
  product: SolarProduct,
  includeRefurb = true
): { min: number; max: number; spread: number } {
  const list = getFilteredOffers(product, { includeRefurb });
  const pool = list.length > 0 ? list : product.offers;
  const prices = pool.map(getOfferLandedPrice);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, spread: max - min };
}

export function getUnitMetricValue(
  product: SolarProduct,
  includeRefurb = true
): number {
  const landed = getLandedPrice(product, includeRefurb);
  if (product.unitMetricType === '$/Wh' && product.specs.capacityWh) {
    return landed / product.specs.capacityWh;
  }
  if (product.unitMetricType === '$/W' && product.specs.powerWatts) {
    return landed / product.specs.powerWatts;
  }
  return landed;
}

export function get90DayDropPct(product: SolarProduct): number {
  const start = product.priceHistory90d[0]?.price ?? product.msrp;
  const current = getLandedPrice(product, false);
  return Math.round(((start - current) / start) * 100);
}
