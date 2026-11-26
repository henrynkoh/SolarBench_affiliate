import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  History,
  LogIn,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  signInWithGoogleForArchive,
  signOutFromArchive,
} from '../lib/firebase';
import {
  createVideoAnalysisNote,
  deleteVideoAnalysisNote,
} from '../services/dailyVideoArchiveService';
import {
  DailyVideoRecord,
  SolarProduct,
  VideoAnalysisFocus,
  VideoAnalysisNote,
} from '../types/solar';

interface DailyVideoArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: DailyVideoRecord[];
  catalog: SolarProduct[];
  nextMidnightIso: string;
  countdownLabel: string;
  user: User | null;
  isAdmin: boolean;
  firestoreSyncedCount: number;
  isGeneratingNext: boolean;
  onGenerateNextDay: () => Promise<void>;
  onSyncFirestoreNow: () => Promise<void>;
  analysisNotes: VideoAnalysisNote[];
  onInspectProduct: (product: SolarProduct) => void;
}

const FOCUS_OPTIONS: VideoAnalysisFocus[] = [
  'Price Velocity',
  'Voice Retention',
  'Margin Spread',
  'Seasonal Demand',
];

export function DailyVideoArchiveModal({
  isOpen,
  onClose,
  videos,
  catalog,
  nextMidnightIso,
  countdownLabel,
  user,
  isAdmin,
  firestoreSyncedCount,
  isGeneratingNext,
  onGenerateNextDay,
  onSyncFirestoreNow,
  analysisNotes,
  onInspectProduct,
}: DailyVideoArchiveModalProps) {
  const [filterTab, setFilterTab] = useState<'all' | 'archived' | 'active'>(
    'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateKey, setSelectedDateKey] = useState<string>(
    videos[0]?.dateKey ?? ''
  );
  const [metricFocus, setMetricFocus] =
    useState<VideoAnalysisFocus>('Price Velocity');
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (videos.length === 0) return;
    if (!videos.some((v) => v.dateKey === selectedDateKey)) {
      setSelectedDateKey(videos[0].dateKey);
    }
  }, [videos, selectedDateKey]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (filterTab === 'archived' && v.status !== 'archived') return false;
      if (filterTab === 'active' && v.status !== 'playing_today') return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          v.dateKey.toLowerCase().includes(q) ||
          v.productName.toLowerCase().includes(q) ||
          v.brand.toLowerCase().includes(q) ||
          v.bestPlatform.toLowerCase().includes(q) ||
          v.campaignHeadline.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [videos, filterTab, searchTerm]);

  const selectedVideo =
    videos.find((v) => v.dateKey === selectedDateKey) ??
    filteredVideos[0] ??
    videos[0] ??
    null;

  const selectedProduct = selectedVideo
    ? catalog.find((p) => p.id === selectedVideo.productId)
    : undefined;

  const selectedPoster =
    selectedProduct?.image ?? selectedVideo?.posterUrl ?? '';

  const notesForSelected = useMemo(() => {
    if (!selectedVideo) return [];
    return analysisNotes.filter(
      (n) => n.videoDateKey === selectedVideo.dateKey
    );
  }, [analysisNotes, selectedVideo]);

  const archivedCount = videos.filter((v) => v.status === 'archived').length;
  const activeCount = videos.filter((v) => v.status === 'playing_today').length;

  const handleSaveAnalysisNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !noteInput.trim()) return;
    setActionError(null);
    setSavingNote(true);
    try {
      await createVideoAnalysisNote({
        videoDateKey: selectedVideo.dateKey,
        productName: selectedVideo.productName,
        metricFocus,
        noteText: noteInput.trim(),
      });
      setNoteInput('');
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to save note.'
      );
    } finally {
      setSavingNote(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setActionError(null);
    try {
      await signInWithGoogleForArchive();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Sign-in cancelled or failed.'
      );
    }
  };

  if (!isOpen) return null;

  const savingsPct =
    selectedVideo && selectedVideo.msrp > 0
      ? Math.round(
          ((selectedVideo.msrp - selectedVideo.lowestLandedPrice) /
            selectedVideo.msrp) *
            100
        )
      : 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-video-archive-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-[1220px] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <Database className="w-3.5 h-3.5" />
              <span>
                24-Hour Midnight Archive &amp; Continuous Daily Video DB
              </span>
            </div>
            <h2
              id="daily-video-archive-title"
              className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5"
            >
              Accumulated Previous Daily Videos ({videos.length})
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Plays 24 hours starting 00:00 each day, archives automatically at
              midnight ({new Date(nextMidnightIso).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
              ), and generates tomorrow&apos;s solo male narrated MP4.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-mono text-slate-700 flex items-center gap-1.5 tabular-nums">
              <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
              <span>Midnight Rollover: {countdownLabel}</span>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => void onGenerateNextDay()}
                disabled={isGeneratingNext}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isGeneratingNext ? 'animate-spin' : ''
                  }`}
                />
                {isGeneratingNext
                  ? 'Generating New Daily MP4...'
                  : 'Rollover & Generate Next Day'}
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-1.5">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => void onSyncFirestoreNow()}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Admin Synced ({firestoreSyncedCount})
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Public Archive ({firestoreSyncedCount})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => void signOutFromArchive()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:text-slate-900 bg-white whitespace-nowrap"
                  title={user.email ?? 'Signed in'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleGoogleSignIn()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In for Notes
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close video archive"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {actionError && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-xs text-rose-700">
            {actionError}
          </div>
        )}

        {/* Main 2-Column Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (5 cols): Accumulated Chronological Video List */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Stored ({videos.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('archived')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterTab === 'archived'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Previous Archived ({archivedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterTab === 'active'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Playing Today ({activeCount})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by date, brand, product, or store..."
                className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
              />
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredVideos.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                  No stored videos match that filter.
                </div>
              ) : (
                filteredVideos.map((vid) => {
                  const isSelected = selectedVideo?.dateKey === vid.dateKey;
                  const noteCount = analysisNotes.filter(
                    (n) => n.videoDateKey === vid.dateKey
                  ).length;

                  return (
                    <button
                      key={vid.dateKey}
                      type="button"
                      onClick={() => setSelectedDateKey(vid.dateKey)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-colors ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-mono font-semibold tabular-nums ${
                            isSelected ? 'text-amber-400' : 'text-amber-700'
                          }`}
                        >
                          {vid.dateKey} ·{' '}
                          {vid.status === 'playing_today'
                            ? 'PLAYING TODAY (24H)'
                            : 'ARCHIVED AT MIDNIGHT'}
                        </span>
                        <span
                          className={`font-mono tabular-nums ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {vid.durationSec}s MP4
                        </span>
                      </div>

                      <div className="text-xs font-bold mt-1 line-clamp-1">
                        {vid.productName}
                      </div>

                      <div
                        className={`text-[11px] mt-1 flex flex-wrap items-center justify-between gap-2 ${
                          isSelected ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        <span className="font-mono tabular-nums">
                          ${vid.lowestLandedPrice.toLocaleString()} ·{' '}
                          {vid.bestPlatform}
                        </span>
                        <span className="text-[11px]">
                          {vid.source === 'firestore' ? 'Firestore DB' : 'Server DB'}
                          {noteCount > 0 ? ` · ${noteCount} note(s)` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column (7 cols): Video Replay + Metrics + Future Analysis Notes */}
          <div className="lg:col-span-7 space-y-5">
            {selectedVideo ? (
              <>
                <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-slate-50/70 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
                      {selectedVideo.status === 'playing_today' ? (
                        <History className="w-4 h-4 text-amber-600" />
                      ) : (
                        <Archive className="w-4 h-4 text-slate-700" />
                      )}
                      <span>
                        {selectedVideo.dateKey} —{' '}
                        {selectedVideo.status === 'playing_today'
                          ? 'Active 24-Hour Playback (00:00–24:00)'
                          : 'Archived After 24-Hour Cycle'}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {selectedVideo.narratorVoice}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {selectedVideo.campaignHeadline}
                  </h3>

                  <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                    <video
                      key={selectedVideo.videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      poster={selectedPoster || undefined}
                      className="w-full h-full object-cover"
                    >
                      <source src={selectedVideo.videoUrl} type="video/mp4" />
                    </video>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[11px] text-slate-500">
                        Lowest Landed
                      </div>
                      <div className="font-mono font-bold text-emerald-700 tabular-nums mt-0.5">
                        ${selectedVideo.lowestLandedPrice.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[11px] text-slate-500">
                        Savings vs MSRP
                      </div>
                      <div className="font-mono font-bold text-amber-700 tabular-nums mt-0.5">
                        -{savingsPct}% (${selectedVideo.msrp.toLocaleString()})
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[11px] text-slate-500">
                        Top Platform
                      </div>
                      <div className="font-semibold text-slate-900 mt-0.5 truncate">
                        {selectedVideo.bestPlatform}
                      </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <div className="text-[11px] text-slate-500">
                        24h Cycle Window
                      </div>
                      <div className="font-mono text-slate-700 text-[11px] mt-0.5">
                        00:00 – 24:00
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 leading-relaxed">
                    <div className="text-[11px] font-bold text-slate-900 mb-1">
                      Solo Male Narrator Voiceover Transcript &amp; Sales Velocity
                    </div>
                    <p>{selectedVideo.scriptSummary}</p>
                    <div className="text-[11px] text-slate-500 font-mono mt-2">
                      Velocity: {selectedVideo.dailyUnitsSoldEstimate}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {selectedProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onInspectProduct(selectedProduct);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-800 hover:border-slate-900 bg-white transition-colors whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Inspect All {selectedProduct.offers.length} Stores
                        </button>
                      )}
                    </div>
                    <a
                      href={selectedVideo.videoUrl}
                      download={`solarbench-daily-${selectedVideo.dateKey}.mp4`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Archived MP4
                    </a>
                  </div>
                </div>

                {/* Historical Analysis Notes Section (Firestore DB) */}
                <div className="border border-slate-200 rounded-xl p-4 sm:p-5 bg-white space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Future Analysis Log ({notesForSelected.length} Notes for{' '}
                        {selectedVideo.dateKey})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Save post-24h pricing spread, demand, or voiceover
                        performance observations to Firestore DB.
                      </p>
                    </div>
                  </div>

                  {user ? (
                    <form
                      onSubmit={(e) => void handleSaveAnalysisNote(e)}
                      className="space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={metricFocus}
                          onChange={(e) =>
                            setMetricFocus(e.target.value as VideoAnalysisFocus)
                          }
                          className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-800"
                        >
                          {FOCUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          placeholder={`Record analytical takeaway for ${selectedVideo.dateKey}...`}
                          maxLength={800}
                          className="flex-1 min-w-[200px] px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
                        />
                        <button
                          type="submit"
                          disabled={savingNote || noteInput.trim().length < 3}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors whitespace-nowrap"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          {savingNote ? 'Saving...' : 'Save Note'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>
                        Sign in with Google to save historical analysis notes to
                        Firestore.
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleGoogleSignIn()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 whitespace-nowrap"
                      >
                        <LogIn className="w-3 h-3" />
                        Sign In
                      </button>
                    </div>
                  )}

                  {notesForSelected.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {notesForSelected.map((note) => (
                        <div
                          key={note.noteId}
                          className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold text-amber-700 text-[11px]">
                              {note.metricFocus} ·{' '}
                              {new Date(note.createdAtIso).toLocaleDateString()}
                            </div>
                            <p className="text-slate-800 mt-0.5">
                              {note.noteText}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void deleteVideoAnalysisNote(note.noteId)
                            }
                            aria-label="Delete note"
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
                No daily videos stored yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
