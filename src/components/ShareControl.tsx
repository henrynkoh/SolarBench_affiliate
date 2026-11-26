import { useEffect, useRef, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { trackOutboundClickClient } from '../data/affiliateRouting';

export function buildSolarShareUrl(params: {
  productId?: string;
  compareIds?: string[];
}): string {
  if (typeof window === 'undefined') return 'https://solarbench.app';
  const url = new URL(window.location.origin + '/');
  if (params.productId) {
    url.searchParams.set('product', params.productId);
  }
  if (params.compareIds && params.compareIds.length > 0) {
    url.searchParams.set('compare', params.compareIds.join(','));
    url.hash = 'compare';
  }
  return url.toString();
}

function copyTextSafe(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(text).catch(() => {
      fallbackExecCopy(text);
    });
    return;
  }
  fallbackExecCopy(text);
}

function fallbackExecCopy(text: string) {
  if (typeof document === 'undefined') return;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch {
    // Ignore copy failures in restricted contexts
  }
  document.body.removeChild(textarea);
}

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

interface ShareControlProps {
  shareUrl: string;
  shareText: string;
  subjectLabel: string;
  variant?: 'menu' | 'inline' | 'compact-inline';
  align?: 'left' | 'right';
  compact?: boolean;
  onCopied?: (url: string) => void;
}

export function ShareControl({
  shareUrl,
  shareText,
  subjectLabel,
  variant = 'menu',
  align = 'right',
  compact = false,
  onCopied,
}: ShareControlProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = 196;
      const menuHeight = 122;
      const rawLeft = align === 'right' ? rect.right - menuWidth : rect.left;
      const clampedLeft = Math.max(
        12,
        Math.min(window.innerWidth - menuWidth - 12, rawLeft)
      );
      const openAbove = rect.bottom + menuHeight + 12 > window.innerHeight;
      const top = openAbove
        ? Math.max(12, rect.top - menuHeight - 6)
        : rect.bottom + 6;
      setMenuCoords({ top, left: clampedLeft });
    };

    updatePosition();

    const handleOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, align]);

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    shareText
  )}&url=${encodeURIComponent(shareUrl)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    shareUrl
  )}&quote=${encodeURIComponent(shareText)}`;

  const handleCopyLink = () => {
    copyTextSafe(shareUrl);
    setCopied(true);
    trackOutboundClickClient({
      eventType: 'share_click',
      productId: subjectLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'share',
      productName: subjectLabel,
      channel: 'Direct Share',
      merchantId: 'share',
      landedPrice: 0,
      sourceSection: 'share-control',
    });
    onCopied?.(shareUrl);
    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  if (variant === 'inline') {
    return (
      <div
        className="inline-flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label={`Share ${subjectLabel}`}
      >
        <span className="text-xs font-medium text-slate-500 mr-0.5 inline-flex items-center gap-1">
          <Share2 className="w-3.5 h-3.5" />
          Share:
        </span>
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share ${subjectLabel} on Twitter`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
        >
          <TwitterXIcon className="w-3 h-3" />
          Twitter
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share ${subjectLabel} on Facebook`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <FacebookIcon className="w-3 h-3 text-blue-600" />
          Facebook
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={`Copy share link for ${subjectLabel}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Link2 className="w-3.5 h-3.5" />
              Copy Link
            </>
          )}
        </button>
      </div>
    );
  }

  if (variant === 'compact-inline') {
    return (
      <div
        className="inline-flex flex-wrap items-center gap-1"
        role="group"
        aria-label={`Share ${subjectLabel}`}
      >
        <a
          href={twitterHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share ${subjectLabel} on Twitter`}
          title="Share on Twitter / X"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:border-slate-400 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
        >
          <TwitterXIcon className="w-3 h-3" />
          <span>Twitter</span>
        </a>
        <a
          href={facebookHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share ${subjectLabel} on Facebook`}
          title="Share on Facebook"
          className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0"
        >
          <FacebookIcon className="w-3 h-3 text-blue-600" />
          <span>Facebook</span>
        </a>
        <button
          type="button"
          onClick={handleCopyLink}
          aria-label={`Copy share link for ${subjectLabel}`}
          title="Copy direct link"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-white text-slate-700 border-slate-200 hover:border-amber-500 hover:text-amber-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Link2 className="w-3 h-3" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label={`Share ${subjectLabel}`}
        title={`Share ${subjectLabel}`}
        className={
          compact
            ? 'inline-flex items-center gap-1 p-1.5 rounded-md border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors shrink-0'
            : 'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0'
        }
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-700" />
        ) : (
          <Share2 className="w-3.5 h-3.5" />
        )}
        {!compact && <span>{copied ? 'Copied' : 'Share'}</span>}
      </button>

      {open && menuCoords && (
        <div
          style={{ top: menuCoords.top, left: menuCoords.left }}
          className="fixed z-50 w-[196px] rounded-lg border border-slate-200 bg-white shadow-xl p-1.5 space-y-1"
          role="menu"
          aria-label={`Share options for ${subjectLabel}`}
        >
          <a
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors"
          >
            <TwitterXIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Share on Twitter / X</span>
          </a>
          <a
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            role="menuitem"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <FacebookIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Share on Facebook</span>
          </a>
          <button
            type="button"
            onClick={() => {
              handleCopyLink();
              window.setTimeout(() => setOpen(false), 700);
            }}
            role="menuitem"
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-colors text-left"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="text-emerald-700 font-semibold">
                  Link Copied!
                </span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Copy Product Link</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
