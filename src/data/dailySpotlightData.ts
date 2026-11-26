export interface DailySpotlightEntry {
  dateLabel: string;
  dayTag: string;
  productId: string;
  sponsorPartner: string;
  campaignHeadline: string;
  youtubeReferenceTitle: string;
  dailyUnitsSoldEstimate: string;
  platformDemandSummary: {
    platform: string;
    rankOrSignal: string;
    landedPrice: number;
    couponOrPromo: string;
    buyerSentiment: string;
  }[];
  vsLegacyComparison: {
    metric: string;
    legacySystem: string;
    featuredSolar: string;
  }[];
  researchTakeaways: string[];
  videoBlueprint: {
    formatLabel: string;
    targetRuntime: string;
    targetWordCount: string;
    pacingWpm: string;
    packaging: {
      titleOptions: string[];
      thumbnailConcept: string;
      descriptionPinnedLinks: string;
      chapters: { time: string; label: string }[];
    };
    voiceoverScript: {
      section: string;
      timestamp: string;
      visualCue: string;
      narration: string;
    }[];
    productionHowTo: {
      step: string;
      title: string;
      details: string;
    }[];
    uploadChecklist: string[];
  };
}

export const DAILY_SPOTLIGHTS: DailySpotlightEntry[] = [
  {
    dateLabel: 'Nov 15, 2026',
    dayTag: "Today's #1 Best Seller",
    productId: 'ecoflow-delta-pro-3',
    sponsorPartner: 'Amazon Official Store · EcoFlow Direct Partner',
    campaignHeadline:
      'STOP Buying $15,000 Gas Standby Generators — 240V Whole-Home Backup for $2,799',
    youtubeReferenceTitle:
      'Inspired by @TheFutureHouseFiles: "STOP Buying $15,000 Generac~"',
    dailyUnitsSoldEstimate: '1,420+ units / 24h across Amazon, eBay & Home Depot',
    platformDemandSummary: [
      {
        platform: 'Amazon',
        rankOrSignal: '#1 Best Seller · Portable Solar Generators (4.8★ / 1,180+)',
        landedPrice: 2749,
        couponOrPromo: 'Clip -$50 Coupon + Prime Free Freight',
        buyerSentiment:
          'Praised for 30dB silent indoor operation and instant 240V transfer switch hookup.',
      },
      {
        platform: 'eBay',
        rankOrSignal: '99.6% Authorized Outlet · 310+ sold this week',
        landedPrice: 2699,
        couponOrPromo: 'Code SOLARFALL (-$50) · Certified Refurb from $2,349',
        buyerSentiment:
          'High conversion from homeowners stacking seasonal promo codes + 2-yr Allstate option.',
      },
      {
        platform: 'Home Depot',
        rankOrSignal: '4.8★ Pro Backup Favorite · Store & Freight Stock',
        landedPrice: 2899,
        couponOrPromo: 'Pro Xtra 2% Credit + 90-Day Return Window',
        buyerSentiment:
          'Contractors bundle with 30A Reliance transfer switches for same-week storm prep.',
      },
      {
        platform: 'ShopSolar / OEM',
        rankOrSignal: 'Bundle Leader · Pairs with 440W Rigid Panels',
        landedPrice: 2889,
        couponOrPromo: '-$60 Direct Email Code + Solar Cable Kit',
        buyerSentiment:
          'Chosen by off-grid cabin buyers building 2,600W dual-MPPT solar arrays.',
      },
    ],
    vsLegacyComparison: [
      {
        metric: 'Upfront Installed Cost',
        legacySystem: '$14,500 – $16,200 (Unit + Pad + Gas Plumbing)',
        featuredSolar: '$2,749 – $3,350 (With 30A Inlet Box)',
      },
      {
        metric: 'After 30% Federal Tax Credit',
        legacySystem: '$14,500 – $16,200 (0% Credit Eligible)',
        featuredSolar: '$1,924 – $2,345 (30% Sec. 25D Eligible w/ >3kWh)',
      },
      {
        metric: 'Operating Noise Level',
        legacySystem: '67 – 74 dB (Lawnmower-loud outdoors)',
        featuredSolar: '30 dB under 2,000W (Whisper quiet indoors)',
      },
      {
        metric: '5-Year Fuel & Oil Maintenance',
        legacySystem: '$2,400 – $4,100 (Oil changes, valves, propane)',
        featuredSolar: '$0 (Recharges from rooftop/portable solar)',
      },
    ],
    researchTakeaways: [
      'Cross-platform price delta today: eBay Authorized ($2,699) and Amazon (-$50 coupon = $2,749) undercut MSRP ($3,699) by up to $1,000.',
      'Over 4,096 Wh capacity qualifies for the 30% Residential Clean Energy Credit when permanently paired with solar.',
      'Dual independent MPPT inputs (150V/15A + 60V/20A) allow mixing high-voltage 440W residential panels with portable arrays.',
    ],
    videoBlueprint: {
      formatLabel: 'Faceless Documentary / Voice-Only Explainer (No Face)',
      targetRuntime: '9 min 15 sec',
      targetWordCount: '~1,380 words',
      pacingWpm: '150 WPM calm authoritative narration',
      packaging: {
        titleOptions: [
          'STOP Buying $15,000 Generac Systems (Do This Instead in 2026)',
          'Why Homeowners Are Dumping $15,000 Gas Generators for This $2,749 Solar Box',
          'The $15,000 Home Backup Trap: Amazon & eBay Solar Price Breakdown',
        ],
        thumbnailConcept:
          'Split clean visual: Left side shows a muted gray standby generator with bold red "$15,000 + GAS" crossed out; Right side shows the EcoFlow DELTA Pro 3 on a clean studio backdrop with crisp white "$2,749 · 240V SILENT" text. Zero face, maximum legibility at mobile size.',
        descriptionPinnedLinks:
          'Compare today’s live landed prices across Amazon, eBay, Home Depot & ShopSolar on SolarBench before buying. Disclosure: Links may earn a commission at zero extra cost.',
        chapters: [
          { time: '0:00', label: 'The $15,000 Standby Generator Trap' },
          { time: '1:15', label: '5-Year Hidden Costs Nobody Mentions' },
          { time: '2:45', label: 'Why 240V LFP Changed Everything' },
          { time: '4:30', label: 'Amazon vs. eBay vs. Distributor Price Audit' },
          { time: '6:30', label: 'How to Wire It Legally for Under $400' },
          { time: '8:10', label: 'Who Still Needs Gas (Honest Cons)' },
        ],
      },
      voiceoverScript: [
        {
          section: '01. Pattern-Interrupt Hook',
          timestamp: '0:00 – 0:45',
          visualCue:
            'Slow zoom on a $15,400 contractor quote PDF, then hard cut to a silent 30dB decibel meter sitting next to the DELTA Pro 3.',
          narration:
            'Every storm season, thousands of homeowners sign a fifteen-thousand-dollar contract for a natural gas standby generator—before realizing they will spend another three thousand dollars on concrete pads, gas line trenching, and annual valve maintenance just to keep it idling outside their bedroom window. Meanwhile, a new wave of 240-volt lithium iron phosphate stations quietly crossed a tipping point this week across Amazon and eBay, dropping under twenty-eight hundred dollars landed. No oil changes. No carbon monoxide. Thirty decibels.',
        },
        {
          section: '02. The $15,000 TCO Breakdown',
          timestamp: '0:45 – 2:45',
          visualCue:
            'Clean animated bar chart comparing 5-year Total Cost of Ownership: Generac ($19,200) vs. 4kWh Solar Backup ($2,345 net after 30% tax credit).',
          narration:
            'Let us look at the real five-year math. A typical whole-home standby installation runs fourteen-five to sixteen-two upfront, and because it burns fossil fuel, it receives zero federal tax credit. Add roughly five hundred dollars a year for weekly self-test fuel, synthetic oil, and technician service calls, and you are nearly twenty grand deep before your second major outage. Compare that to a four-kilowatt-hour 240-volt unit like the EcoFlow DELTA Pro 3. Because it exceeds three kilowatt-hours, it qualifies for the thirty percent Residential Clean Energy Credit—bringing net hardware cost down near nineteen hundred dollars.',
        },
        {
          section: '03. Deep Platform Price Audit (Amazon vs. eBay vs. Distributors)',
          timestamp: '2:45 – 5:15',
          visualCue:
            'Screen capture scrolling through SolarBench’s 10-store comparison table highlighting eBay (-$50 code), Amazon (-$50 coupon), and Home Depot.',
          narration:
            'Here is where daily price tracking actually saves you money. Today’s MSRP sits at thirty-six hundred ninety-nine dollars—never pay MSRP. On Amazon Official, clipping the fifty-dollar page coupon drops landed delivery to twenty-seven forty-nine with free freight. On eBay’s authorized brand outlet, stacking the seasonal code lands at twenty-six ninety-nine, or twenty-three forty-nine if you opt for certified refurbished with a two-year Allstate plan. Meanwhile, Home Depot sits at twenty-eight ninety-nine, which only makes sense if you need local Pro Xtra return convenience.',
        },
        {
          section: '04. Real-World 240V Performance & Transfer Switch Setup',
          timestamp: '5:15 – 7:45',
          visualCue:
            'Wiring diagram overlay showing NEMA L14-30R cord into a 6-circuit manual transfer switch + 150V solar string input diagram.',
          narration:
            'Can a single portable box actually run a two-forty-volt well pump or central air mini-split? Yes—because unlike older twelve-hundred-watt power stations, this outputs four thousand watts of true split-phase two-forty-volt power from a single chassis, with a ten-millisecond UPS switchover. Pair it with a four-hundred-dollar manual transfer switch or generator interlock kit, plug in a thirty-amp cord, and your refrigerator, furnace blower, internet, and well pump stay online. Even better, its dual MPPT solar controllers accept up to twenty-six hundred watts of panels—including a hundred-fifty-volt high-voltage string of residential four-hundred-forty-watt bifacials.',
        },
        {
          section: '05. Honest Limitations & Final Verdict',
          timestamp: '7:45 – 9:15',
          visualCue:
            'Side-by-side checklist of Pros vs. Cons table, ending on the SolarBench comparison URL.',
          narration:
            'Now let us be honest about what it cannot do. At one hundred thirteen pounds, you are rolling it on wheels—not carrying it up two flights of stairs. And if you live in the Pacific Northwest with seven straight days of dark winter storms running a five-ton electric heat pump, a four-kilowatt-hour battery without expansion packs or a small inverter generator backup will run dry overnight. For everyone else seeking silent, zero-maintenance outage protection without lighting fifteen thousand dollars on fire, check the live Amazon, eBay, and distributor price table linked below.',
        },
      ],
      productionHowTo: [
        {
          step: 'Step 01 · Voice Capture (No Face)',
          title: 'Record Dry Documentary Voiceover First',
          details:
            'Use a dynamic mic (Shure SM7B, MV7, or Samson Q2U) 4 inches off-axis in a carpeted room. Record at 48kHz / 24-bit WAV, normalize to -14 LUFS, apply a subtle 80Hz high-pass filter, and trim all breaths tighter than 0.25s so pacing never drags.',
        },
        {
          step: 'Step 02 · Visual Timeline (Zero Camera)',
          title: 'Cut Every 3–4 Seconds Using Screen Captures & Product B-Roll',
          details:
            'Layer 40% clean SolarBench table screen-recordings (zooming into Amazon vs. eBay coupon math), 30% clean studio product shots with Ken Burns slow push-ins, and 30% dark-slate vector charts (TCO bars, 240V interlock diagram, dB meter graphic).',
        },
        {
          step: 'Step 03 · Audio Mix & Retention',
          title: 'Subtle Underscore + Pattern-Interrupt Sound Design',
          details:
            'Place a minimal ambient synth pulse bed at -28dB below the vocal track. Drop the music completely for 1.5 seconds when delivering the "$15,000 vs. $1,924" punchline to force viewer attention.',
        },
        {
          step: 'Step 04 · Monetization & Daily Refresh',
          title: 'Pin Multi-Platform Comparison Links',
          details:
            'Instead of relying on a single Amazon link that goes out of stock, link viewers to your live 10-store SolarBench comparison table plus direct Amazon, eBay, and Signature Solar affiliate redirects.',
        },
      ],
      uploadChecklist: [
        'Export 4K 60fps H.264/HEVC (35–45 Mbps) so spreadsheet numbers and $/Wh text stay razor sharp.',
        'Upload custom 1280×720 thumbnail with max 4 words ("STOP Buying $15,000 Generac") and high-contrast price delta.',
        'Add all 6 chapter timestamps in the description for Google Search Key Moments indexing.',
        'Insert FTC affiliate disclosure in the top 3 lines of the description above the Amazon/eBay/Distributor links.',
        'Set YouTube tags: Generac alternative, EcoFlow DELTA Pro 3, 240V solar generator, whole home battery backup, LiFePO4.',
      ],
    },
  },
  {
    dateLabel: 'Nov 14, 2026',
    dayTag: "Yesterday's #1 DIY Kit",
    productId: 'eg4-6000xp-inverter',
    sponsorPartner: 'Signature Solar · Current Connected Partner',
    campaignHeadline:
      'STOP Paying $30,000 for Grid-Tie Solar — Build a 6,000W 240V Off-Grid Subpanel for $3,697',
    youtubeReferenceTitle:
      'Inspired by @TheFutureHouseFiles: "STOP Buying $15,000 Generac~"',
    dailyUnitsSoldEstimate: '890+ units / 24h across Signature Solar, Current Connected & eBay',
    platformDemandSummary: [
      {
        platform: 'Signature Solar',
        rankOrSignal: '#1 DIY Split-Phase Inverter · 24h TX Dispatch',
        landedPrice: 1385,
        couponOrPromo: 'Free LTL Shipping on Inverter + Rack Bundle',
        buyerSentiment:
          'Top-rated 240V off-grid inverter for cabins, workshops, and critical-loads subpanels.',
      },
      {
        platform: 'Current Connected',
        rankOrSignal: '4.9★ Verified · Same-Day NV Dispatch',
        landedPrice: 1399,
        couponOrPromo: '60-Day Tech Support Return + Wiring Help',
        buyerSentiment:
          'Buyers value US-based commissioning support and closed-loop SOK/EG4 pairing.',
      },
      {
        platform: 'Amazon',
        rankOrSignal: '4.8★ Authorized Storefront',
        landedPrice: 1419,
        couponOrPromo: 'Clip -$35 Coupon · Prime Freight',
        buyerSentiment:
          'Popular for buyers using Amazon Prime card 5% cashback.',
      },
      {
        platform: 'eBay',
        rankOrSignal: '99.6% Positive · Authorized Outlet',
        landedPrice: 1368,
        couponOrPromo: 'Code SOLARFALL (-$45) · Open-Box from $1,189',
        buyerSentiment:
          'Strong bargain hunters stacking eBay coupon codes on bare units.',
      },
    ],
    vsLegacyComparison: [
      {
        metric: 'Installer Turnkey Quote',
        legacySystem: '$28,000 – $34,000 (Contractor 6kW + 10kWh)',
        featuredSolar: '$3,697 (EG4 6000XP + 2× 5.12kWh 48V Racks)',
      },
      {
        metric: 'PV String Voltage Ceiling',
        legacySystem: '150V – 250V (Heavy combiner wiring)',
        featuredSolar: '480V Dual MPPT (8,000W PV on thin 10 AWG)',
      },
      {
        metric: 'Transfer Switch Included',
        legacySystem: 'External $900 – $1,600 ATS Box',
        featuredSolar: 'Built-in 100A Grid/Generator Passthrough',
      },
      {
        metric: '240V Split-Phase Output',
        legacySystem: 'Requires 2× stacked 120V inverters',
        featuredSolar: 'Native 6,000W 120V/240V Single Chassis',
      },
    ],
    researchTakeaways: [
      'Pairing one EG4 6000XP ($1,368–$1,399) with two 48V 100Ah server rack batteries delivers 10.24 kWh at ~$0.36/Wh total system cost.',
      'UL 1741 compliance allows safe connection to manual transfer switches and backup subpanels.',
      '52W idle draw should be noted honestly in voiceover scripts for small-battery buyers.',
    ],
    videoBlueprint: {
      formatLabel: 'Faceless DIY Engineering Breakdown (No Face)',
      targetRuntime: '10 min 05 sec',
      targetWordCount: '~1,510 words',
      pacingWpm: '150 WPM clear technical narration',
      packaging: {
        titleOptions: [
          'STOP Paying $30,000 for Home Solar (The $3,697 DIY Subpanel Blueprint)',
          'Why This $1,399 Inverter Replaced $15,000 Whole-Home Backup Quotes',
          'EG4 6000XP Deep Audit: Amazon vs. eBay vs. Signature Solar Prices',
        ],
        thumbnailConcept:
          'Clean schematic background showing the white wall-mount 6000XP next to a 48V rack battery with bold "$3,697 TOTAL vs $30,000 QUOTE".',
        descriptionPinnedLinks:
          'Full BOM & multi-store landed prices available in the SolarBench System Builder.',
        chapters: [
          { time: '0:00', label: 'The $30,000 Solar Quote Breakdown' },
          { time: '1:40', label: 'Inside the EG4 6000XP Architecture' },
          { time: '4:10', label: 'Multi-Store Price Check (eBay vs. Distributors)' },
          { time: '6:50', label: '480V String Sizing & Wire Savings' },
          { time: '8:45', label: '52W Idle Draw & Off-Grid Caveats' },
        ],
      },
      voiceoverScript: [
        {
          section: '01. Hook & Cost Contrast',
          timestamp: '0:00 – 0:50',
          visualCue:
            'Display $30,000 residential solar quote side-by-side with $1,368 eBay/Signature Solar cart.',
          narration:
            'If a door-to-door solar rep handed you a thirty-thousand-dollar quote just to keep your fridge, well pump, and mini-split running during grid outages, pause before signing. A single six-thousand-watt split-phase off-grid inverter paired with ten kilowatt-hours of UL-listed server rack batteries now prices out under thirty-seven hundred dollars across verified distributors.',
        },
        {
          section: '02. Architecture & 480V MPPT Advantage',
          timestamp: '0:50 – 4:10',
          visualCue:
            'Animated wiring diagram showing 10× 440W panels on two 10 AWG wires into dual 480V MPPT terminals.',
          narration:
            'Why is the 6000XP dominating DIY builds this month? Because its dual four-hundred-eighty-volt MPPT charge controllers let you run ten full-size four-hundred-forty-watt panels in series on standard ten-gauge PV wire—eliminating bulky roof combiner boxes while delivering two-hundred-forty-volt split-phase power natively.',
        },
        {
          section: '03. Platform Price Audit & Honest Cons',
          timestamp: '4:10 – 10:05',
          visualCue:
            'Scroll SolarBench Store Comparison Table + highlight 52W idle draw meter test.',
          narration:
            'Across today’s tracked stores, eBay’s authorized outlet with the seasonal code hits thirteen sixty-eight, while Signature Solar and Current Connected sit at thirteen eighty-five to thirteen ninety-nine with direct technical support. Remember two limitations: it is strictly off-grid—no exporting back to the utility—and its fifty-two-watt idle draw means you want at least ten kilowatt-hours of battery behind it.',
        },
      ],
      productionHowTo: [
        {
          step: 'Step 01 · Screen Capture & Diagrams',
          title: 'Show Exact String Math Visually',
          details:
            'Record SolarBench’s DIY System Builder showing automated Voc headroom checks so viewers see safe cold-weather string limits without guessing.',
        },
        {
          step: 'Step 02 · Voiceover Clarity',
          title: 'Use Direct Second-Person Cost Comparisons',
          details:
            'Anchor every technical spec (480V Voc, 52W idle, 100A breaker) to a real dollar or kilowatt-hour outcome.',
        },
      ],
      uploadChecklist: [
        'Link the pre-configured 48V Off-Grid Cabin BOM CSV in the pinned comment.',
        'Include UL 1741 / NEC interlock safety disclaimer in the description.',
        'Add high-contrast thumbnail comparing $30,000 quote vs. $3,697 hardware.',
      ],
    },
  },
  {
    dateLabel: 'Nov 13, 2026',
    dayTag: 'Nov 13 Top EV/Home Unit',
    productId: 'anker-solix-f3800',
    sponsorPartner: 'Amazon Official Store · Home Depot',
    campaignHeadline:
      '6,000W 240V Backup + Direct EV Charging Without Electrician Markup ($2,699 Landed)',
    youtubeReferenceTitle:
      'Inspired by @TheFutureHouseFiles: "STOP Buying $15,000 Generac~"',
    dailyUnitsSoldEstimate: '760+ units / 24h across Amazon, Walmart & Home Depot',
    platformDemandSummary: [
      {
        platform: 'Amazon',
        rankOrSignal: '4.8★ Top-Rated 6kW Portable Unit',
        landedPrice: 2699,
        couponOrPromo: 'Clip -$50 Coupon + Free Freight',
        buyerSentiment:
          'Homeowners love the native NEMA 14-50 outlet for 240V inlets and EV top-ups.',
      },
      {
        platform: 'eBay',
        rankOrSignal: '99.4% Authorized Outlet',
        landedPrice: 2680,
        couponOrPromo: 'Code SOLARFALL (-$45) · Refurb from $2,299',
        buyerSentiment:
          'Aggressive refurb discounts attract budget emergency buyers.',
      },
      {
        platform: 'Home Depot',
        rankOrSignal: '4.8★ In-Stock Freight',
        landedPrice: 2849,
        couponOrPromo: '90-Day Return Policy',
        buyerSentiment:
          'Strong storm-season pickup demand.',
      },
    ],
    vsLegacyComparison: [
      {
        metric: 'Peak Split-Phase Output',
        legacySystem: '7.5kW – 10kW Portable Gas Gen (Loud)',
        featuredSolar: '6,000W Silent 120V/240V EV-Grade LFP',
      },
      {
        metric: 'EV Level-2 Emergency Port',
        legacySystem: 'Requires neutral-ground bonding plug',
        featuredSolar: 'Built-in NEMA 14-50 EV & Home Port',
      },
    ],
    researchTakeaways: [
      'Lowest $/W among 6,000W rolling portable power stations ($2,680–$2,699).',
      '60V solar input limit requires parallel panel wiring—flag this clearly vs. EcoFlow DELTA Pro 3’s 150V input.',
    ],
    videoBlueprint: {
      formatLabel: 'Faceless Comparison & Price Audit (No Face)',
      targetRuntime: '8 min 40 sec',
      targetWordCount: '~1,300 words',
      pacingWpm: '150 WPM crisp voiceover',
      packaging: {
        titleOptions: [
          'STOP Buying Gas Generators: 6,000W 240V Power on Wheels ($2,699)',
          'Anker SOLIX F3800 vs. $15,000 Standby Systems — Real Math',
        ],
        thumbnailConcept:
          'NEMA 14-50 plug close-up next to the F3800 with "$2,699 · 6,000W 240V" bold caption.',
        descriptionPinnedLinks:
          'Compare Anker SOLIX F3800 vs. EcoFlow DELTA Pro 3 on SolarBench.',
        chapters: [
          { time: '0:00', label: '6,000W From a Rolling Battery' },
          { time: '2:30', label: 'The 60V Solar Input Trade-Off' },
          { time: '5:30', label: 'Amazon vs. eBay Landed Price Check' },
        ],
      },
      voiceoverScript: [
        {
          section: '01. Hook & 6,000W Capability',
          timestamp: '0:00 – 1:10',
          visualCue:
            'Close-up graphic of NEMA 14-50 and L14-30R ports powering a 240V panel.',
          narration:
            'Six thousand watts of split-phase two-forty-volt power used to mean bolting a noisy gas generator to a concrete slab. Today, the Anker SOLIX F3800 delivers that exact output on four caster wheels for under twenty-seven hundred dollars—plus a native NEMA fourteen-fifty port that can even rescue a stranded electric vehicle.',
        },
        {
          section: '02. The 60V MPPT Caveat & Price Table',
          timestamp: '1:10 – 8:40',
          visualCue:
            'Compare 60V max Voc vs. 150V EcoFlow DELTA Pro 3 inside SolarBench Matrix.',
          narration:
            'Before ordering on Amazon or eBay, check one crucial spec: the F3800 caps solar voltage at sixty volts. That means you must wire panels in parallel rather than high-voltage series strings—making it ideal for 12V-class portable panels, whereas long rooftop runs favor EcoFlow’s hundred-fifty-volt input.',
        },
      ],
      productionHowTo: [
        {
          step: 'Step 01 · Highlight Trade-Offs Honestly',
          title: 'Show Parallel vs. Series PV Wiring',
          details:
            'Include a 15-second vector graphic showing why 60V Voc caps series strings—this builds massive viewer trust and lowers return rates.',
        },
      ],
      uploadChecklist: [
        'Pin comparison link between F3800 and DELTA Pro 3.',
        'Upload 1280×720 high-contrast thumbnail without clutter.',
      ],
    },
  },
];
