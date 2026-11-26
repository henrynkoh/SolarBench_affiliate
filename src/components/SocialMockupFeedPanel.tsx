import { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  Repeat2,
  Share2,
  Trash2,
} from 'lucide-react';
import { SocialMockupCard } from '../types/solar';
import { trackOutboundClickClient } from '../data/affiliateRouting';
import { HardwareImage } from './HardwareImage';

function TwitterXIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M22.675 0H1.325C.593 0 0 .593 0 1.325v21.351C0 23.407.593 24 1.325 24H12.82v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116c.73 0 1.323-.593 1.323-1.325V1.325C24 .593 23.407 0 22.675 0z" />
    </svg>
  );
}

interface SocialMockupFeedPanelProps {
  cards: SocialMockupCard[];
  onToggleLike: (cardId: string) => void;
  onToggleRepost: (cardId: string) => void;
  onDismissCard: (cardId: string) => void;
  onClearFeed: () => void;
  onNotify?: (message: string) => void;
  compactHeader?: boolean;
}

type FeedFilter = 'both' | 'twitter' | 'facebook';

function formatPushTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTriggerLabel(
  reason: SocialMockupCard['triggerReason']
): string {
  if (reason === 'daily-rotation') return 'Auto-pushed · 24h Best-Seller Rotation';
  if (reason === 'override-update') return 'Auto-pushed · #1 Best-Seller Update';
  if (reason === 'selection-change') return 'Auto-pushed · Winner Switch';
  return 'Auto-pushed · Active #1 Pick';
}

export function SocialMockupFeedPanel({
  cards,
  onToggleLike,
  onToggleRepost,
  onDismissCard,
  onClearFeed,
  onNotify,
  compactHeader = false,
}: SocialMockupFeedPanelProps) {
  const [filter, setFilter] = useState<FeedFilter>('both');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (
    key: string,
    text: string,
    card: SocialMockupCard,
    platformLabel: string
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      trackOutboundClickClient({
        eventType: 'share_click',
        productId: card.productId,
        productName: card.productName,
        channel: platformLabel,
        merchantId: 'social-mockup-feed',
        landedPrice: card.landedPrice,
        sourceSection: 'paid-ads-social-hook',
      });
      onNotify?.(`Copied ${platformLabel} share card for ${card.productName}.`);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      onNotify?.('Clipboard permission blocked by browser.');
    }
  };

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
      aria-label="Auto-pushed Twitter and Facebook share card mock-up feed"
    >
      {/* Top Feed Toolbar */}
      <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Webhook Reactive Hook · Agent #10 Beacon + Agent #13 Courier
          </div>
          <h3
            className={`${
              compactHeader ? 'text-sm' : 'text-base'
            } font-bold text-slate-900 mt-0.5`}
          >
            Auto-Pushed Twitter / X &amp; Facebook Share Feed (
            <span className="font-mono tabular-nums">{cards.length}</span>)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="tablist"
            aria-label="Filter social feed preview by network"
            className="inline-flex items-center p-0.5 bg-slate-200/70 rounded-lg border border-slate-200"
          >
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'both'}
              onClick={() => setFilter('both')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === 'both'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'twitter'}
              onClick={() => setFilter('twitter')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === 'twitter'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TwitterXIcon className="w-3 h-3" />
              Twitter / X
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === 'facebook'}
              onClick={() => setFilter('facebook')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                filter === 'facebook'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FacebookIcon className="w-3 h-3 text-blue-600" />
              Facebook
            </button>
          </div>

          {cards.length > 0 && (
            <button
              type="button"
              onClick={onClearFeed}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-slate-400 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
            >
              Clear Feed
            </button>
          )}
        </div>
      </div>

      {/* Empty State or Populated Social Mock-Up Stream */}
      {cards.length === 0 ? (
        <div className="p-8 text-center space-y-1.5">
          <p className="text-sm font-semibold text-slate-900">
            No auto-pushed social share cards in the mock-up feed yet
          </p>
          <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
            Switch or update the Daily #1 Best Seller in the Paid Ads panel above—the reactive hook automatically builds and pushes a fresh Twitter/X post and Facebook link card here.
          </p>
        </div>
      ) : (
        <div className="p-5 space-y-5 max-h-[680px] overflow-y-auto bg-[#F7F8FA]">
          {cards.map((card, idx) => {
            const savings = Math.max(0, Math.round(card.msrp - card.landedPrice));
            const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
              card.twitterText
            )}`;
            const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              card.shareUrl
            )}&quote=${encodeURIComponent(card.facebookText)}`;
            const showTwitter = filter === 'both' || filter === 'twitter';
            const showFacebook = filter === 'both' || filter === 'facebook';

            return (
              <article
                key={card.id}
                className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
              >
                {/* Unboxed Trigger Metadata Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 text-xs text-slate-500">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-semibold text-amber-700">
                      {idx === 0 ? 'Latest Push' : `Push #${cards.length - idx}`}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatTriggerLabel(card.triggerReason)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatPushTime(card.pushedAtIso)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDismissCard(card.id)}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-red-600 transition-colors"
                    aria-label={`Remove social mock-up card for ${card.productName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>

                <div
                  className={`grid gap-4 ${
                    filter === 'both'
                      ? 'grid-cols-1 lg:grid-cols-2'
                      : 'grid-cols-1'
                  }`}
                >
                  {/* Twitter / X Mock-up Card */}
                  {showTwitter && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between gap-3">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 font-display font-bold text-xs">
                              SB
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                SolarBench Hardware Lab
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono truncate">
                                @SolarBench · {card.dateLabel}
                              </div>
                            </div>
                          </div>
                          <TwitterXIcon className="w-4 h-4 text-slate-900 shrink-0" />
                        </div>

                        <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                          {card.twitterText}
                        </p>

                        {/* Twitter Summary Card With Image */}
                        <a
                          href={card.shareUrl}
                          className="block border border-slate-200 rounded-lg overflow-hidden hover:border-slate-400 transition-colors"
                        >
                          <div className="flex items-center gap-3 p-2.5 bg-[#F7F8FA]">
                            <div className="w-20 aspect-[4/3] rounded overflow-hidden bg-slate-100 shrink-0">
                              <HardwareImage
                                src={card.image}
                                alt={card.productName}
                                title={card.productName}
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="text-[11px] font-mono text-slate-500 truncate">
                                solarbench.app/product/{card.productId}
                              </div>
                              <div className="text-xs font-bold text-slate-900 truncate">
                                {card.productName}
                              </div>
                              <div className="text-[11px] font-mono tabular-nums text-emerald-700 font-semibold">
                                ${card.landedPrice.toLocaleString()} Landed
                                {savings > 0 ? ` (-$${savings.toLocaleString()} MSRP)` : ''}
                              </div>
                            </div>
                          </div>
                        </a>
                      </div>

                      {/* Twitter Mock Interactive Controls */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <div className="flex items-center gap-4 font-mono tabular-nums text-[11px]">
                          <button
                            type="button"
                            onClick={() => onToggleLike(card.id)}
                            className={`inline-flex items-center gap-1 transition-colors ${
                              card.liked
                                ? 'text-rose-600 font-semibold'
                                : 'hover:text-rose-600'
                            }`}
                          >
                            <Heart className="w-3.5 h-3.5" />
                            <span>{card.likeCount}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleRepost(card.id)}
                            className={`inline-flex items-center gap-1 transition-colors ${
                              card.reposted
                                ? 'text-emerald-700 font-semibold'
                                : 'hover:text-emerald-700'
                            }`}
                          >
                            <Repeat2 className="w-3.5 h-3.5" />
                            <span>{card.repostCount}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                `tw-${card.id}`,
                                card.twitterText,
                                card,
                                'Twitter / X'
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:border-slate-400 text-[11px] font-semibold text-slate-800 whitespace-nowrap"
                          >
                            {copiedId === `tw-${card.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Tweet
                              </>
                            )}
                          </button>
                          <a
                            href={twitterHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackOutboundClickClient({
                                eventType: 'share_click',
                                productId: card.productId,
                                productName: card.productName,
                                channel: 'Twitter / X',
                                merchantId: 'social-mockup-feed',
                                landedPrice: card.landedPrice,
                                sourceSection: 'paid-ads-social-hook',
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-semibold whitespace-nowrap"
                          >
                            Post to X
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Facebook Mock-up Share Card */}
                  {showFacebook && (
                    <div className="border border-slate-200 rounded-xl p-4 bg-white flex flex-col justify-between gap-3">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <FacebookIcon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 truncate">
                                SolarBench — Solar Price &amp; Spec Index
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                <span>{card.dateLabel}</span>
                                <span aria-hidden="true">·</span>
                                <Globe className="w-3 h-3" />
                                <span>Public</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[11px] font-mono text-blue-700 font-semibold shrink-0">
                            Facebook Card
                          </span>
                        </div>

                        <p className="text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                          {card.facebookText}
                        </p>

                        {/* OpenGraph Facebook Link Preview */}
                        <a
                          href={card.shareUrl}
                          className="block border border-slate-200 rounded-lg overflow-hidden hover:border-blue-400 transition-colors"
                        >
                          <div className="aspect-[16/9] w-full bg-slate-100 overflow-hidden">
                            <HardwareImage
                              src={card.image}
                              alt={card.productName}
                              title={card.productName}
                            />
                          </div>
                          <div className="p-3 bg-[#F7F8FA] border-t border-slate-200 space-y-1">
                            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wide truncate">
                              SOLARBENCH.APP · {card.bestMerchantName}
                            </div>
                            <div className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                              {card.facebookLinkTitle}
                            </div>
                            <div className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                              {card.facebookLinkDescription}
                            </div>
                          </div>
                        </a>
                      </div>

                      {/* Facebook Mock Interactive Controls */}
                      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <button
                          type="button"
                          onClick={() => onToggleLike(card.id)}
                          className={`inline-flex items-center gap-1 font-mono tabular-nums text-[11px] transition-colors ${
                            card.liked
                              ? 'text-blue-700 font-semibold'
                              : 'hover:text-blue-700'
                          }`}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span>{card.likeCount} Reactions</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(
                                `fb-${card.id}`,
                                card.facebookText,
                                card,
                                'Facebook'
                              )
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 hover:border-blue-400 text-[11px] font-semibold text-slate-800 whitespace-nowrap"
                          >
                            {copiedId === `fb-${card.id}` ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-700" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy Post
                              </>
                            )}
                          </button>
                          <a
                            href={facebookHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackOutboundClickClient({
                                eventType: 'share_click',
                                productId: card.productId,
                                productName: card.productName,
                                channel: 'Facebook',
                                merchantId: 'social-mockup-feed',
                                landedPrice: card.landedPrice,
                                sourceSection: 'paid-ads-social-hook',
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-semibold whitespace-nowrap"
                          >
                            <Share2 className="w-3 h-3" />
                            Share on FB
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
