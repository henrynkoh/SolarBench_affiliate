import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DailySpotlightUpdatePayload,
  SocialMockupCard,
} from '../types/solar';

function buildShareCardFromSpotlight(
  payload: DailySpotlightUpdatePayload,
  sourceKey: string
): SocialMockupCard {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://solarbench.app';
  const shareUrl = `${origin}/product/${encodeURIComponent(payload.productId)}`;
  const savingsVsMsrp = Math.max(0, Math.round(payload.msrp - payload.landedPrice));
  const unitMetricLabel = `$${payload.unitMetricValue.toFixed(2)} ${payload.unitMetricType}`;
  const promoSnippet = payload.promoLabel ? ` (${payload.promoLabel})` : '';
  const savingsSnippet =
    savingsVsMsrp > 0 ? ` — $${savingsVsMsrp.toLocaleString()} below MSRP` : '';

  const twitterText = [
    `Daily #1 Best Seller (${payload.dateLabel}): ${payload.productName}`,
    `Lowest Landed: $${payload.landedPrice.toLocaleString()}${savingsSnippet} at ${payload.bestMerchantName}${promoSnippet}`,
    `Normalized Efficiency: ${unitMetricLabel} · ${payload.isAuthorizedDealer ? 'OEM Authorized' : 'Verified Seller'}`,
    `${shareUrl} #SolarBench #SolarDIY #LiFePO4`,
  ].join('\n');

  const facebookLinkTitle = `${payload.productName} — $${payload.landedPrice.toLocaleString()} Landed (${unitMetricLabel}) | SolarBench`;
  const facebookLinkDescription = `${payload.campaignHeadline} Best verified landed offer at ${payload.bestMerchantName}${promoSnippet}. Includes freight math & 30% Sec. 25D tax credit breakdown.`;

  const facebookText = [
    `[${payload.dayTag} · ${payload.dateLabel}] ${payload.campaignHeadline}`,
    ``,
    `SolarBench Cross-Store Demand Audit: ${payload.dailyUnitsSoldEstimate}.`,
    `Top Verified Offer: $${payload.landedPrice.toLocaleString()} landed at ${payload.bestMerchantName}${promoSnippet} (${unitMetricLabel}).`,
    `Inspect full spec teardown, 90-day price curve, and 10-year utility payback calculator:`,
    shareUrl,
  ].join('\n');

  return {
    id: `social_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    sourceKey,
    productId: payload.productId,
    productName: payload.productName,
    brand: payload.brand,
    sku: payload.sku,
    dateLabel: payload.dateLabel,
    dayTag: payload.dayTag,
    campaignHeadline: payload.campaignHeadline,
    landedPrice: payload.landedPrice,
    msrp: payload.msrp,
    unitMetricLabel,
    bestMerchantName: payload.bestMerchantName,
    promoLabel: payload.promoLabel,
    image: payload.image,
    shareUrl,
    twitterText,
    facebookText,
    facebookLinkTitle,
    facebookLinkDescription,
    triggerReason: payload.triggerReason,
    pushedAtIso: new Date().toISOString(),
    liked: false,
    reposted: false,
    likeCount: 18 + (payload.sku.length % 15),
    repostCount: 5 + (payload.brand.length % 9),
  };
}

export function useDailySpotlightSocialFeed(
  activeSpotlight: DailySpotlightUpdatePayload | null,
  onCardPushed?: (card: SocialMockupCard) => void
) {
  const [feedCards, setFeedCards] = useState<SocialMockupCard[]>([]);
  const lastProcessedKeyRef = useRef<string | null>(null);
  const onCardPushedRef = useRef(onCardPushed);
  onCardPushedRef.current = onCardPushed;

  const pushSpotlightCard = useCallback(
    (payload: DailySpotlightUpdatePayload, forceUnique = false) => {
      const baseKey = [
        payload.dateLabel,
        payload.productId,
        payload.landedPrice,
        payload.bestMerchantName,
        payload.serverVideoDateKey ?? 'static',
        payload.triggerReason,
      ].join('::');

      const sourceKey = forceUnique ? `${baseKey}::${Date.now()}` : baseKey;
      if (!forceUnique && lastProcessedKeyRef.current === baseKey) {
        return null;
      }

      lastProcessedKeyRef.current = baseKey;
      const newCard = buildShareCardFromSpotlight(payload, sourceKey);

      setFeedCards((prev) => [newCard, ...prev].slice(0, 12));
      if (payload.triggerReason !== 'initial') {
        onCardPushedRef.current?.(newCard);
      }
      return newCard;
    },
    []
  );

  useEffect(() => {
    if (!activeSpotlight) return;
    pushSpotlightCard(activeSpotlight, false);
  }, [activeSpotlight, pushSpotlightCard]);

  const toggleLike = useCallback((cardId: string) => {
    setFeedCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              liked: !c.liked,
              likeCount: c.liked ? Math.max(0, c.likeCount - 1) : c.likeCount + 1,
            }
          : c
      )
    );
  }, []);

  const toggleRepost = useCallback((cardId: string) => {
    setFeedCards((prev) =>
      prev.map((c) =>
        c.id === cardId
          ? {
              ...c,
              reposted: !c.reposted,
              repostCount: c.reposted
                ? Math.max(0, c.repostCount - 1)
                : c.repostCount + 1,
            }
          : c
      )
    );
  }, []);

  const dismissCard = useCallback((cardId: string) => {
    setFeedCards((prev) => prev.filter((c) => c.id !== cardId));
  }, []);

  const clearFeed = useCallback(() => {
    setFeedCards([]);
  }, []);

  return {
    feedCards,
    pushSpotlightCard,
    toggleLike,
    toggleRepost,
    dismissCard,
    clearFeed,
  };
}
