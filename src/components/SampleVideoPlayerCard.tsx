import { useEffect, useRef, useState } from 'react';
import { Archive, CalendarClock, Download, Play, Square, Volume2 } from 'lucide-react';

interface SampleVideoPlayerCardProps {
  title: string;
  posterImage: string;
  narrationSample: string;
  videoUrl?: string;
  archiveCount?: number;
  countdownLabel?: string;
  onOpenArchive?: () => void;
}

const PREFERRED_SOLO_MALE_VOICES = [
  'google uk english male',
  'microsoft guy',
  'microsoft andrew',
  'microsoft brian',
  'microsoft steffan',
  'microsoft christopher',
  'microsoft davis',
  'microsoft eric',
  'microsoft ryan',
  'microsoft george',
  'microsoft david',
  'microsoft mark',
  'daniel',
  'alex',
  'aaron',
  'arthur',
  'matthew',
  'fred',
  'rishi',
];

const KNOWN_FEMALE_VOICE_TOKENS = [
  'female',
  'woman',
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'veena',
  'fiona',
  'zira',
  'hazel',
  'susan',
  'aria',
  'jenny',
  'michelle',
  'ava',
  'emma',
  'sonia',
  'libby',
  'natasha',
  'clara',
  'google us english',
  'google uk english female',
  'kate',
  'serena',
  'allison',
  'cathy',
  'eva',
];

function selectSoloMaleVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const englishVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith('en')
  );
  const pool = englishVoices.length > 0 ? englishVoices : voices;
  if (pool.length === 0) return null;

  const isFemale = (name: string) =>
    KNOWN_FEMALE_VOICE_TOKENS.some((token) => name.includes(token));

  for (const target of PREFERRED_SOLO_MALE_VOICES) {
    const found = pool.find((v) => v.name.toLowerCase().includes(target));
    if (found) return found;
  }

  const explicitMale = pool.find((v) => {
    const lower = v.name.toLowerCase();
    return (
      !isFemale(lower) &&
      /\b(male|man|guy|david|daniel|mark|alex|george|matthew|andrew|brian|ryan|paul|james|richard|thomas|oliver|liam|christopher|eric|davis)\b/i.test(
        lower
      )
    );
  });
  if (explicitMale) return explicitMale;

  const nonFemale = pool.find((v) => !isFemale(v.name.toLowerCase()));
  return nonFemale ?? pool[0];
}

function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const current = window.speechSynthesis.getVoices();
    if (current.length > 0) {
      resolve(current);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, 350);
  });
}

export function SampleVideoPlayerCard({
  title,
  posterImage,
  narrationSample,
  videoUrl = '/videos/stop-buying-15000-generac-sample.mp4',
  archiveCount = 0,
  countdownLabel,
  onOpenArchive,
}: SampleVideoPlayerCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingVoice, setIsLoadingVoice] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const stopAllNarration = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (videoRef.current) {
      videoRef.current.muted = false;
    }
    setIsLoadingVoice(false);
    setIsSpeaking(false);
  };

  useEffect(() => {
    return () => {
      stopAllNarration();
    };
  }, []);

  useEffect(() => {
    setVideoError(false);
  }, [videoUrl]);

  const speakWithMaleBrowserVoice = async () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const voices = await getAvailableVoices();
    const maleVoice = selectSoloMaleVoice(voices);

    const utterance = new SpeechSynthesisUtterance(narrationSample);
    if (maleVoice) {
      utterance.voice = maleVoice;
    }
    utterance.lang = maleVoice?.lang || 'en-US';
    utterance.rate = 0.90;
    utterance.pitch = 0.80;
    utterance.onend = () => stopAllNarration();
    utterance.onerror = () => stopAllNarration();

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleToggleVoiceover = async () => {
    if (isSpeaking || isLoadingVoice) {
      stopAllNarration();
      return;
    }

    stopAllNarration();
    setIsLoadingVoice(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/tts/narrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: narrationSample }),
        signal: controller.signal,
      });

      const contentType = response.headers.get('Content-Type') ?? '';
      if (response.ok && contentType.includes('audio/')) {
        const blob = await response.blob();
        if (controller.signal.aborted) return;

        const objectUrl = URL.createObjectURL(blob);
        audioUrlRef.current = objectUrl;

        const audio = new Audio(objectUrl);
        audioRef.current = audio;

        audio.onended = () => {
          stopAllNarration();
        };
        audio.onerror = () => {
          stopAllNarration();
        };

        if (videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }

        setIsLoadingVoice(false);
        setIsSpeaking(true);
        await audio.play();
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
    }

    if (!controller.signal.aborted) {
      setIsLoadingVoice(false);
      await speakWithMaleBrowserVoice();
    }
  };

  const handlePlayPreview = () => {
    stopAllNarration();
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.volume = 1;
      videoRef.current.play().catch(() => {});
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-900">
          Sample Video Preview
        </span>
        <span className="text-[11px] text-slate-500 font-mono">
          1280×720 MP4 · Voice-Only
        </span>
      </div>

      <p className="text-xs text-slate-600 leading-snug">{title}</p>

      <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
        {videoError ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-300 text-xs space-y-2">
            <Play className="w-6 h-6 text-amber-400" />
            <span>Sample video file unavailable in preview environment.</span>
          </div>
        ) : (
          <video
            key={videoUrl}
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster={posterImage}
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleVoiceover}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              isSpeaking || isLoadingVoice
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-slate-900 text-white hover:bg-amber-600'
            }`}
          >
            {isSpeaking || isLoadingVoice ? (
              <>
                <Square className="w-3 h-3" />
                Stop Voiceover
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                Play 150 WPM Voiceover
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePlayPreview}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-700 hover:border-slate-400 transition-colors whitespace-nowrap"
          >
            <Play className="w-3 h-3" />
            Play Video
          </button>
        </div>

        <a
          href={videoUrl}
          download={videoUrl.split('/').pop() || 'solarbench-daily-spotlight.mp4'}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          Download MP4
        </a>
      </div>

      {onOpenArchive && (
        <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono tabular-nums">
            <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              24h Midnight Cycle{countdownLabel ? ` · ${countdownLabel}` : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenArchive}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-900 hover:bg-slate-200 transition-colors whitespace-nowrap"
          >
            <Archive className="w-3.5 h-3.5 text-amber-600" />
            Previous Videos Archive ({archiveCount})
          </button>
        </div>
      )}
    </div>
  );
}
