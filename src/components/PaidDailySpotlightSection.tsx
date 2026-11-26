import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  Archive,
  Check,
  Copy,
  Download,
  ExternalLink,
  Mic,
  Plus,
  Video,
} from 'lucide-react';
import { DAILY_SPOTLIGHTS } from '../data/dailySpotlightData';
import {
  getBestOffer,
  getOfferLandedPrice,
  getUnitMetricValue,
} from '../data/solarCatalog';
import { auth } from '../lib/firebase';
import {
  checkIsArchiveAdmin,
  subscribePublicDailyVideos,
  subscribeUserVideoAnalyses,
  syncDailyVideosToFirestore,
} from '../services/dailyVideoArchiveService';
import {
  DailySpotlightUpdatePayload,
  DailyVideoRecord,
  DailyVideosApiResponse,
  SocialMockupCard,
  SolarProduct,
  SwarmAgentId,
  VideoAnalysisNote,
} from '../types/solar';
import { DailyVideoArchiveModal } from './DailyVideoArchiveModal';
import { HardwareImage } from './HardwareImage';
import { SampleVideoPlayerCard } from './SampleVideoPlayerCard';
import { SocialMockupFeedPanel } from './SocialMockupFeedPanel';

interface PaidDailySpotlightSectionProps {
  catalog: SolarProduct[];
  onInspectProduct: (product: SolarProduct) => void;
  onAddToBuild: (productId: string, merchantId: string) => void;
  onAskSwarmAgent?: (agentId: SwarmAgentId, directive: string) => void;
  socialFeedCards: SocialMockupCard[];
  onDailyBestSellerChange: (payload: DailySpotlightUpdatePayload) => void;
  onToggleLikeSocialCard: (cardId: string) => void;
  onToggleRepostSocialCard: (cardId: string) => void;
  onDismissSocialCard: (cardId: string) => void;
  onClearSocialFeed: () => void;
  onNotify?: (message: string) => void;
}

type SpotlightTab = 'research' | 'script' | 'howto' | 'upload';

function formatCountdown(targetIso: string): string {
  const diffMs = Math.max(0, new Date(targetIso).getTime() - Date.now());
  const totalSec = Math.floor(diffMs / 1000);
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

export function PaidDailySpotlightSection({
  catalog,
  onInspectProduct,
  onAddToBuild,
  onAskSwarmAgent,
  socialFeedCards,
  onDailyBestSellerChange,
  onToggleLikeSocialCard,
  onToggleRepostSocialCard,
  onDismissSocialCard,
  onClearSocialFeed,
  onNotify,
}: PaidDailySpotlightSectionProps) {
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<SpotlightTab>('research');
  const [copiedScript, setCopiedScript] = useState(false);
  const [overrideProductId, setOverrideProductId] = useState<string | null>(null);
  const [triggerReason, setTriggerReason] =
    useState<DailySpotlightUpdatePayload['triggerReason']>('initial');

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [serverVideos, setServerVideos] = useState<DailyVideoRecord[]>([]);
  const [firestoreVideos, setFirestoreVideos] = useState<DailyVideoRecord[]>(
    []
  );
  const [analysisNotes, setAnalysisNotes] = useState<VideoAnalysisNote[]>([]);
  const [nextMidnightIso, setNextMidnightIso] = useState<string>(() => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return d.toISOString();
  });
  const [countdownLabel, setCountdownLabel] = useState<string>(() => {
    const d = new Date();
    d.setHours(24, 0, 0, 0);
    return formatCountdown(d.toISOString());
  });
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGeneratingNext, setIsGeneratingNext] = useState(false);

  const loadServerVideos = useCallback(async () => {
    try {
      const res = await fetch('/api/daily-videos');
      if (!res.ok) return;
      const data = (await res.json()) as DailyVideosApiResponse;
      setServerVideos(
        data.allVideos.map((v) => ({ ...v, source: 'server' }))
      );
      if (data.nextMidnightIso) {
        setNextMidnightIso(data.nextMidnightIso);
      }
    } catch {
      // Keep existing state if server temporarily unreachable
    }
  }, []);

  useEffect(() => {
    void loadServerVideos();
    const poll = setInterval(() => {
      void loadServerVideos();
    }, 60_000);
    return () => clearInterval(poll);
  }, [loadServerVideos]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownLabel(formatCountdown(nextMidnightIso));
      if (Date.now() >= new Date(nextMidnightIso).getTime()) {
        void loadServerVideos();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [nextMidnightIso, loadServerVideos]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    const unsubVideos = subscribePublicDailyVideos((docs) => {
      setFirestoreVideos(docs);
    });
    return () => {
      unsubAuth();
      unsubVideos();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAnalysisNotes([]);
      return;
    }
    let active = true;
    void checkIsArchiveAdmin(user).then((admin) => {
      if (active) setIsAdmin(admin);
    });
    const unsubNotes = subscribeUserVideoAnalyses(user.uid, (notes) => {
      setAnalysisNotes(notes);
    });
    return () => {
      active = false;
      unsubNotes();
    };
  }, [user]);

  const firestoreMap = useMemo(() => {
    const map = new Map<string, DailyVideoRecord>();
    for (const v of firestoreVideos) {
      map.set(v.dateKey, v);
    }
    return map;
  }, [firestoreVideos]);

  const mergedVideos = useMemo(() => {
    const map = new Map<string, DailyVideoRecord>();
    for (const v of serverVideos) {
      map.set(v.dateKey, v);
    }
    for (const v of firestoreVideos) {
      const serverMatch = map.get(v.dateKey);
      map.set(v.dateKey, {
        ...serverMatch,
        ...v,
        status: serverMatch?.status === 'archived' ? 'archived' : v.status,
        source: 'firestore',
      });
    }
    return Array.from(map.values()).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
  }, [serverVideos, firestoreVideos]);

  const handleSyncFirestoreNow = useCallback(async () => {
    if (!isAdmin || serverVideos.length === 0) return;
    await syncDailyVideosToFirestore(serverVideos, firestoreMap);
  }, [isAdmin, serverVideos, firestoreMap]);

  useEffect(() => {
    if (isAdmin && serverVideos.length > 0) {
      void syncDailyVideosToFirestore(serverVideos, firestoreMap).catch(
        () => {}
      );
    }
  }, [isAdmin, serverVideos, firestoreMap]);

  const handleGenerateNextDay = useCallback(async () => {
    if (!isAdmin) return;
    setIsGeneratingNext(true);
    try {
      const res = await fetch('/api/daily-videos/generate-next', {
        method: 'POST',
      });
      if (!res.ok) return;
      const data = (await res.json()) as DailyVideosApiResponse;
      const nextList = data.allVideos.map((v) => ({
        ...v,
        source: 'server' as const,
      }));
      setServerVideos(nextList);
      if (data.nextMidnightIso) {
        setNextMidnightIso(data.nextMidnightIso);
      }
      setOverrideProductId(null);
      setSelectedDayIdx(0);
      setTriggerReason('daily-rotation');
      await syncDailyVideosToFirestore(nextList, firestoreMap).catch(
        () => {}
      );
    } finally {
      setIsGeneratingNext(false);
    }
  }, [isAdmin, firestoreMap]);

  const entry = DAILY_SPOTLIGHTS[selectedDayIdx] ?? DAILY_SPOTLIGHTS[0];
  const activeServerVideo =
    serverVideos.find((v) => v.status === 'playing_today') ?? null;

  const effectiveProductId =
    overrideProductId ??
    (selectedDayIdx === 0 && activeServerVideo?.productId
      ? activeServerVideo.productId
      : entry.productId);

  const product =
    catalog.find((p) => p.id === effectiveProductId) ??
    catalog.find((p) => p.id === entry.productId) ??
    catalog[0];
  const bestOffer = getBestOffer(product, true);
  const lowestLanded = getOfferLandedPrice(bestOffer);
  const unitMetric = getUnitMetricValue(product, true);

  const matchingStoredVideo =
    mergedVideos.find(
      (v) =>
        v.productId === product.id ||
        (selectedDayIdx === 0 && v.status === 'playing_today')
    ) ?? null;

  const effectiveHeadline =
    product.id === entry.productId
      ? entry.campaignHeadline
      : matchingStoredVideo?.campaignHeadline ??
        `#1 Daily Best Seller: ${product.name} — $${lowestLanded.toLocaleString()} Verified Landed ($${unitMetric.toFixed(
          2
        )} ${product.unitMetricType})`;

  const effectiveDayTag =
    overrideProductId !== null
      ? 'Updated #1 Best Seller'
      : selectedDayIdx === 0 && activeServerVideo?.productId === product.id
      ? 'Live 24h Auto-Rotation'
      : entry.dayTag;

  const effectiveDateLabel =
    selectedDayIdx === 0 && matchingStoredVideo?.dateKey
      ? matchingStoredVideo.dateKey
      : entry.dateLabel;

  const effectiveUnitsEstimate =
    product.id === entry.productId
      ? entry.dailyUnitsSoldEstimate
      : matchingStoredVideo?.dailyUnitsSoldEstimate ??
        `${Math.max(420, Math.round(product.buyerFollowers / 8)).toLocaleString()}+ buyers · Verified 10-Store Audit`;

  const livePlatformRows = useMemo(() => {
    if (product.id === entry.productId) {
      return entry.platformDemandSummary;
    }
    const sorted = [...product.offers].sort(
      (a, b) => getOfferLandedPrice(a) - getOfferLandedPrice(b)
    );
    return sorted.slice(0, 4).map((offer, idx) => ({
      platform: offer.merchantName,
      rankOrSignal: `${idx === 0 ? '#1 Lowest Landed · ' : ''}${offer.sellerRating} (${offer.condition})`,
      landedPrice: getOfferLandedPrice(offer),
      couponOrPromo:
        offer.promoLabel ||
        (offer.shipping === 0
          ? 'Free LTL / Parcel Freight'
          : `+$${offer.shipping} Verified Freight`),
      buyerSentiment: offer.isAuthorizedDealer
        ? `OEM ${product.specs.warrantyYears}-yr Warranty Eligible · ${offer.leadTime}`
        : `${offer.warrantyNote} · ${offer.returnWindow}`,
    }));
  }, [product, entry]);

  useEffect(() => {
    onDailyBestSellerChange({
      dateLabel: effectiveDateLabel,
      dayTag: effectiveDayTag,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      sku: product.sku,
      campaignHeadline: effectiveHeadline,
      landedPrice: lowestLanded,
      msrp: product.msrp,
      unitMetricValue: unitMetric,
      unitMetricType: product.unitMetricType,
      bestMerchantName: bestOffer.merchantName,
      promoLabel: bestOffer.promoLabel,
      dailyUnitsSoldEstimate: effectiveUnitsEstimate,
      image: product.image,
      isAuthorizedDealer: bestOffer.isAuthorizedDealer,
      triggerReason,
      serverVideoDateKey: matchingStoredVideo?.dateKey,
    });
  }, [
    effectiveDateLabel,
    effectiveUnitsEstimate,
    effectiveDayTag,
    effectiveHeadline,
    product.id,
    product.name,
    product.brand,
    product.sku,
    product.msrp,
    product.unitMetricType,
    product.image,
    lowestLanded,
    unitMetric,
    bestOffer.merchantName,
    bestOffer.promoLabel,
    bestOffer.isAuthorizedDealer,
    triggerReason,
    matchingStoredVideo?.dateKey,
    onDailyBestSellerChange,
  ]);

  const buildFullScriptText = () => {
    const header = `${entry.campaignHeadline}\nReference Format: ${entry.youtubeReferenceTitle}\nFormat: ${entry.videoBlueprint.formatLabel} (${entry.videoBlueprint.targetRuntime}, ${entry.videoBlueprint.pacingWpm})\n\n`;
    const body = entry.videoBlueprint.voiceoverScript
      .map(
        (seg) =>
          `[${seg.timestamp}] ${seg.section}\nVISUAL CUE: ${seg.visualCue}\nVOICEOVER:\n${seg.narration}`
      )
      .join('\n\n---\n\n');
    return header + body;
  };

  const handleCopyScript = async () => {
    try {
      await navigator.clipboard.writeText(buildFullScriptText());
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2500);
    } catch {
      setCopiedScript(false);
    }
  };

  const handleDownloadBrief = () => {
    const bp = entry.videoBlueprint;
    const text = [
      `SOLARBENCH DAILY SPONSORED BRIEF — ${entry.dateLabel}`,
      `Featured #1 Best-Selling Product: ${product.name} (${product.sku})`,
      `Sponsor Partner: ${entry.sponsorPartner}`,
      `Daily Sales Signal: ${entry.dailyUnitsSoldEstimate}`,
      ``,
      `YOUTUBE TITLE OPTIONS:`,
      ...bp.packaging.titleOptions.map((t, i) => `  ${i + 1}. ${t}`),
      ``,
      `THUMBNAIL BLUEPRINT (NO FACE):`,
      `  ${bp.packaging.thumbnailConcept}`,
      ``,
      `HOW TO PRODUCE (VOICE-ONLY):`,
      ...bp.productionHowTo.map(
        (s) => `  - ${s.step} — ${s.title}\n    ${s.details}`
      ),
      ``,
      `FULL VOICEOVER SCRIPT:`,
      buildFullScriptText(),
      ``,
      `UPLOAD CHECKLIST:`,
      ...bp.uploadChecklist.map((c) => `  [ ] ${c}`),
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `solarbench-daily-video-brief-${product.sku.toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      id="daily-spotlight"
      className="py-12 border-t border-slate-200 bg-[#F7F8FA]"
      aria-labelledby="daily-spotlight-heading"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5 cols): Daily Selection Feed & Production Metrics */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                <span>
                  Owned by <strong className="text-slate-700">Agent #10 Beacon</strong> · Daily Cross-Platform Velocity Spotlight
                </span>
                {onAskSwarmAgent && (
                  <button
                    type="button"
                    onClick={() =>
                      onAskSwarmAgent(
                        'spotlight-producer',
                        `Audit today’s #1 Spotlight deal (${product.name}) for 24h sales velocity, 10-yr ROI, and open full teardown verification.`
                      )
                    }
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    Dispatch Agent #10
                  </button>
                )}
              </div>
              <h2
                id="daily-spotlight-heading"
                className="text-2xl font-bold text-slate-900 mt-1"
              >
                Daily #1 Best-Seller &amp; Faceless Video Brief
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                Every 24 hours, SolarBench audits unit velocity, coupon drops,
                and verified reviews across Amazon, eBay, Home Depot, and
                specialty solar dealers to feature one top-selling product—paired
                with a complete voice-only production playbook modeled on
                high-retention home energy explainers.
              </p>
            </div>

            {/* Daily Archive Switcher */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-700">
                  Select Daily Audited Winner
                </div>
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline whitespace-nowrap"
                >
                  <Archive className="w-3 h-3" />
                  Stored Video DB ({mergedVideos.length})
                </button>
              </div>
              <div className="space-y-2">
                {DAILY_SPOTLIGHTS.map((item, idx) => {
                  const p =
                    catalog.find((prod) => prod.id === item.productId) ??
                    catalog[0];
                  const active = idx === selectedDayIdx;
                  return (
                    <button
                      key={item.dateLabel}
                      type="button"
                      onClick={() => {
                        setOverrideProductId(null);
                        setSelectedDayIdx(idx);
                        setTriggerReason('selection-change');
                        setActiveTab('research');
                      }}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        active
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span
                          className={
                            active
                              ? 'text-amber-400 font-semibold'
                              : 'text-amber-700 font-semibold'
                          }
                        >
                          {item.dateLabel} · {item.dayTag}
                        </span>
                        <span
                          className={`font-mono tabular-nums ${
                            active ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {p.starRating.toFixed(1)}★
                        </span>
                      </div>
                      <div className="text-xs font-bold mt-1 line-clamp-1">
                        {p.name}
                      </div>
                      <div
                        className={`text-[11px] mt-0.5 line-clamp-1 ${
                          active ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.dailyUnitsSoldEstimate}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Instant Update Daily #1 Best Seller Trigger (Auto-pushes to Twitter/Facebook Feed) */}
              <div className="pt-3 border-t border-slate-100 space-y-1.5">
                <label
                  htmlFor="daily-bestseller-updater"
                  className="block text-[11px] font-semibold text-slate-600"
                >
                  Update Daily #1 Best Seller SKU (Auto-pushes Twitter &amp; Facebook Card)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="daily-bestseller-updater"
                    value={product.id}
                    onChange={(e) => {
                      setOverrideProductId(e.target.value);
                      setTriggerReason('override-update');
                    }}
                    className="flex-1 min-w-0 bg-[#F7F8FA] border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
                  >
                    {catalog.slice(0, 12).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (${getOfferLandedPrice(getBestOffer(p, true)).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Video Spec Summary */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-amber-600" />
                  Faceless Production Spec
                </span>
                <span className="text-[11px] text-slate-500">
                  Voice Only · No Camera
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                <div>
                  <div className="text-slate-500">Target Runtime</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {entry.videoBlueprint.targetRuntime}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Script Volume</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {entry.videoBlueprint.targetWordCount}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Narration Pacing</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {entry.videoBlueprint.pacingWpm}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Reference Format</div>
                  <div className="font-medium text-slate-900 mt-0.5 truncate">
                    @TheFutureHouseFiles
                  </div>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleDownloadBrief}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 transition-colors whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Full Production Brief (.txt)
                </button>
              </div>
            </div>

            {/* Sample Video Player Placed Directly Below Faceless Production Spec Card */}
            <SampleVideoPlayerCard
              title={effectiveHeadline}
              posterImage={product.image}
              videoUrl={
                matchingStoredVideo?.videoUrl ??
                '/videos/stop-buying-15000-generac-sample.mp4'
              }
              narrationSample={
                product.id === entry.productId
                  ? entry.videoBlueprint.voiceoverScript
                      .slice(0, 2)
                      .map((s) => s.narration)
                      .join(' ')
                  : matchingStoredVideo?.scriptSummary ??
                    `${product.name} drops to $${lowestLanded.toLocaleString()} landed at ${bestOffer.merchantName}. Compare all ${product.offers.length} stores on SolarBench.`
              }
              archiveCount={mergedVideos.length}
              countdownLabel={countdownLabel}
              onOpenArchive={() => setArchiveOpen(true)}
            />
          </div>

          {/* Right Column (7 cols — Bottom-Right Paid Ads & Daily Deep-Research Spotlight) */}
          <aside
            className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
            aria-label="Sponsored daily top-selling solar product and video blueprint"
          >
            {/* Paid Placement Disclosure Strip */}
            <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-medium">
                <span className="font-bold text-amber-400">
                  Sponsored Paid Ad
                </span>{' '}
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>{' '}
                <span>{effectiveDateLabel} #1 Best-Selling Solar Pick</span>{' '}
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>{' '}
                <span className="text-slate-300">
                  {product.id === entry.productId
                    ? entry.sponsorPartner
                    : `${bestOffer.merchantName} · ${product.brand}`}
                </span>
              </div>
              <div className="text-[11px] font-mono text-slate-300 tabular-nums">
                {effectiveUnitsEstimate}
              </div>
            </div>

            {/* Featured Sponsored Product Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <button
                  type="button"
                  onClick={() => onInspectProduct(product)}
                  className="w-full sm:w-44 aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                >
                  <HardwareImage
                    src={product.image}
                    alt={product.name}
                    title={product.name}
                  />
                </button>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="text-xs text-slate-500">
                    {product.brand} · {product.sku} ·{' '}
                    <span className="text-slate-700 font-medium">
                      {entry.youtubeReferenceTitle}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {effectiveHeadline}
                  </h3>

                  <div className="flex flex-wrap items-baseline gap-3 pt-1">
                    <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      ${lowestLanded.toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-400 line-through font-mono tabular-nums">
                      MSRP ${product.msrp.toLocaleString()}
                    </span>
                    <span className="text-xs font-mono font-semibold text-amber-700 tabular-nums">
                      ${unitMetric.toFixed(2)} {product.unitMetricType}
                    </span>
                    <span className="text-xs font-medium text-emerald-700">
                      Best Today: {bestOffer.merchantName}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        onAddToBuild(product.id, bestOffer.merchantId)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Claim Best Deal in Build
                    </button>
                    <button
                      type="button"
                      onClick={() => onInspectProduct(product)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-slate-300 text-slate-800 hover:border-slate-900 transition-colors whitespace-nowrap"
                    >
                      Inspect All {product.offers.length} Stores
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Tabs inside Bottom-Right Paid Ads Panel */}
            <div className="px-5 sm:px-6 pt-3 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'research', label: 'Daily Platform Research' },
                  { id: 'script', label: 'Voice-Only Script (No Face)' },
                  { id: 'howto', label: 'How To Make Video' },
                  { id: 'upload', label: 'YouTube Upload & Packaging' },
                ] as { id: SpotlightTab; label: string }[]
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'border-amber-600 text-slate-900 bg-white rounded-t-md'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Area */}
            <div className="p-5 sm:p-6 space-y-5">
              {activeTab === 'research' && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-2">
                      Daily Multi-Platform Demand &amp; Price Audit
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                            <th className="py-2 px-3">Platform</th>
                            <th className="py-2 px-3">Sales Rank &amp; Rating</th>
                            <th className="py-2 px-3 text-right">Landed</th>
                            <th className="py-2 px-3">Promo / Buyer Takeaway</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {livePlatformRows.map((row) => (
                            <tr key={row.platform}>
                              <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                                {row.platform}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {row.rankOrSignal}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums whitespace-nowrap">
                                ${row.landedPrice.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">
                                <div className="font-medium text-amber-700">
                                  {row.couponOrPromo}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {row.buyerSentiment}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 mb-2">
                      Cost &amp; Performance vs. $15,000 Legacy System
                    </h4>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                            <th className="py-2 px-3">Comparison Metric</th>
                            <th className="py-2 px-3">Legacy $15k Gas / Quote</th>
                            <th className="py-2 px-3">Today&apos;s Solar Pick</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {entry.vsLegacyComparison.map((row) => (
                            <tr key={row.metric}>
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {row.metric}
                              </td>
                              <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                                {row.legacySystem}
                              </td>
                              <td className="py-2 px-3 text-emerald-700 font-semibold font-mono text-[11px]">
                                {row.featuredSolar}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-700 border-t border-slate-100 pt-3">
                    {entry.researchTakeaways.map((note) => (
                      <li key={note} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeTab === 'script' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-slate-600">
                      <strong className="text-slate-900">
                        Voice-Only Narration Script
                      </strong>{' '}
                      · {entry.videoBlueprint.targetRuntime} ·{' '}
                      {entry.videoBlueprint.targetWordCount}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
                    >
                      {copiedScript ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          Copied Script
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy Full Script
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {entry.videoBlueprint.voiceoverScript.map((block) => (
                      <div
                        key={block.section}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50/70 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">
                            {block.section}
                          </span>
                          <span className="font-mono text-amber-700 font-semibold tabular-nums">
                            {block.timestamp}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded px-2.5 py-1.5">
                          <strong className="text-slate-800">
                            On-Screen Visual (No Face):
                          </strong>{' '}
                          {block.visualCue}
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed">
                          {block.narration}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'howto' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Video className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Step-by-step workflow to produce a high-retention,
                      voice-only faceless video matching{' '}
                      <strong className="text-slate-900">
                        @TheFutureHouseFiles
                      </strong>
                    </span>
                  </div>

                  <div className="space-y-3">
                    {entry.videoBlueprint.productionHowTo.map((item) => (
                      <div
                        key={item.step}
                        className="border border-slate-200 rounded-lg p-4 bg-slate-50/60"
                      >
                        <div className="font-mono text-[11px] font-semibold text-amber-700">
                          {item.step}
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1">
                          {item.details}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'upload' && (
                <div className="space-y-4">
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-2">
                    <div className="text-xs font-bold text-slate-900">
                      High-CTR Title Formulas
                    </div>
                    <ul className="space-y-1 text-xs text-slate-700">
                      {entry.videoBlueprint.packaging.titleOptions.map(
                        (title, i) => (
                          <li key={title} className="font-medium">
                            {i + 1}. {title}
                          </li>
                        )
                      )}
                    </ul>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/60 space-y-1.5">
                    <div className="text-xs font-bold text-slate-900">
                      Faceless Thumbnail Blueprint
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {entry.videoBlueprint.packaging.thumbnailConcept}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                      <div className="text-xs font-bold text-slate-900">
                        Chapter Timestamps
                      </div>
                      <ul className="space-y-1 text-xs font-mono text-slate-700">
                        {entry.videoBlueprint.packaging.chapters.map((ch) => (
                          <li key={ch.time}>
                            <span className="text-amber-700 font-semibold">
                              {ch.time}
                            </span>{' '}
                            <span className="font-sans">{ch.label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
                      <div className="text-xs font-bold text-slate-900">
                        Upload &amp; Monetization Checklist
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {entry.videoBlueprint.uploadChecklist.map((item) => (
                          <li key={item} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>

        {/* Auto-Pushed Twitter / X & Facebook Mock-Up Feed */}
        <div className="mt-8">
          <SocialMockupFeedPanel
            cards={socialFeedCards}
            onToggleLike={onToggleLikeSocialCard}
            onToggleRepost={onToggleRepostSocialCard}
            onDismissCard={onDismissSocialCard}
            onClearFeed={onClearSocialFeed}
            onNotify={onNotify}
          />
        </div>
      </div>

      <DailyVideoArchiveModal
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
        videos={mergedVideos}
        catalog={catalog}
        nextMidnightIso={nextMidnightIso}
        countdownLabel={countdownLabel}
        user={user}
        isAdmin={isAdmin}
        firestoreSyncedCount={firestoreVideos.length}
        isGeneratingNext={isGeneratingNext}
        onGenerateNextDay={handleGenerateNextDay}
        onSyncFirestoreNow={handleSyncFirestoreNow}
        analysisNotes={analysisNotes}
        onInspectProduct={onInspectProduct}
      />
    </section>
  );
}
