import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  DailyVideoRecord,
  VideoAnalysisFocus,
  VideoAnalysisNote,
} from '../types/solar';

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function timestampToIso(ts: unknown, fallback = ''): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    return (ts as Timestamp).toDate().toISOString();
  }
  return fallback;
}

export function subscribePublicDailyVideos(
  onData: (videos: DailyVideoRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const pathForOnSnapshot = 'dailyVideos';
  const q = query(
    collection(db, pathForOnSnapshot),
    where('visibility', '==', 'public')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const records: DailyVideoRecord[] = snapshot.docs.map((snap) => {
        const d = snap.data();
        return {
          dateKey: String(d.dateKey ?? snap.id),
          productId: String(d.productId ?? ''),
          productName: String(d.productName ?? ''),
          brand: String(d.brand ?? ''),
          sku: String(d.sku ?? ''),
          campaignHeadline: String(d.campaignHeadline ?? ''),
          status: d.status === 'archived' ? 'archived' : 'playing_today',
          visibility: 'public',
          windowStartIso: String(d.windowStartIso ?? ''),
          windowEndIso: String(d.windowEndIso ?? ''),
          videoUrl: String(d.videoUrl ?? ''),
          posterUrl: String(d.posterUrl ?? ''),
          narratorVoice: String(d.narratorVoice ?? 'Charon · Solo Male'),
          durationSec: Number(d.durationSec ?? 28),
          bestPlatform: String(d.bestPlatform ?? ''),
          lowestLandedPrice: Number(d.lowestLandedPrice ?? 0),
          msrp: Number(d.msrp ?? 0),
          dailyUnitsSoldEstimate: String(d.dailyUnitsSoldEstimate ?? ''),
          scriptSummary: String(d.scriptSummary ?? ''),
          ownerId: String(d.ownerId ?? ''),
          source: 'firestore',
        };
      });

      records.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      onData(records);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, pathForOnSnapshot);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

const ADMIN_EMAIL = 'henrynkoh@gmail.com';

export async function checkIsArchiveAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.emailVerified) return false;
  if (user.email?.toLowerCase() === ADMIN_EMAIL) return true;
  try {
    const snap = await getDoc(doc(db, 'admins', sanitizeId(user.uid)));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function syncDailyVideosToFirestore(
  records: DailyVideoRecord[],
  existingFirestoreMap: Map<string, DailyVideoRecord>
): Promise<number> {
  const user = auth.currentUser;
  if (!(await checkIsArchiveAdmin(user)) || !user) {
    return 0;
  }

  let syncedCount = 0;

  for (const record of records) {
    const existing = existingFirestoreMap.get(record.dateKey);
    const docPath = `dailyVideos/${record.dateKey}`;

    if (!existing) {
      const payload: Record<string, unknown> = {
        dateKey: clampString(record.dateKey, 10),
        productId: clampString(record.productId, 80),
        productName: clampString(record.productName, 160),
        brand: clampString(record.brand, 60),
        sku: clampString(record.sku, 60),
        campaignHeadline: clampString(record.campaignHeadline, 200),
        status: record.status,
        visibility: 'public',
        windowStartIso: clampString(record.windowStartIso, 40),
        windowEndIso: clampString(record.windowEndIso, 40),
        videoUrl: clampString(record.videoUrl, 260),
        posterUrl: clampString(record.posterUrl, 260),
        narratorVoice: clampString(record.narratorVoice, 60),
        durationSec: Math.max(1, Math.min(3600, Number(record.durationSec) || 28)),
        bestPlatform: clampString(record.bestPlatform, 60),
        lowestLandedPrice: Math.max(0, Number(record.lowestLandedPrice) || 0),
        msrp: Math.max(0, Number(record.msrp) || 0),
        dailyUnitsSoldEstimate: clampString(record.dailyUnitsSoldEstimate, 160),
        scriptSummary: clampString(record.scriptSummary, 1200),
        ownerId: sanitizeId(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (record.status === 'archived') {
        payload.archivedAt = serverTimestamp();
      }

      try {
        await setDoc(doc(db, 'dailyVideos', record.dateKey), payload);
        syncedCount += 1;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, docPath);
      }
    } else if (
      existing.status === 'playing_today' &&
      record.status === 'archived'
    ) {
      try {
        await updateDoc(doc(db, 'dailyVideos', record.dateKey), {
          status: 'archived',
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        syncedCount += 1;
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, docPath);
      }
    }
  }

  return syncedCount;
}

export function subscribeUserVideoAnalyses(
  userId: string,
  onData: (notes: VideoAnalysisNote[]) => void,
  onError?: (err: Error) => void
): () => void {
  const pathForOnSnapshot = 'videoAnalyses';
  const q = query(
    collection(db, pathForOnSnapshot),
    where('ownerId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: VideoAnalysisNote[] = snapshot.docs.map((snap) => {
        const d = snap.data();
        return {
          noteId: String(d.noteId ?? snap.id),
          videoDateKey: String(d.videoDateKey ?? ''),
          productName: String(d.productName ?? ''),
          metricFocus: (d.metricFocus as VideoAnalysisFocus) ?? 'Price Velocity',
          noteText: String(d.noteText ?? ''),
          ownerId: String(d.ownerId ?? ''),
          createdAtIso: timestampToIso(d.createdAt, new Date().toISOString()),
        };
      });

      notes.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
      onData(notes);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, pathForOnSnapshot);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function createVideoAnalysisNote(input: {
  videoDateKey: string;
  productName: string;
  metricFocus: VideoAnalysisFocus;
  noteText: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    throw new Error('Sign in with a verified Google account to save analysis notes.');
  }

  const noteId = sanitizeId(
    `note_${input.videoDateKey}_${Date.now().toString(36)}`
  );
  const docPath = `videoAnalyses/${noteId}`;

  try {
    await setDoc(doc(db, 'videoAnalyses', noteId), {
      noteId,
      videoDateKey: clampString(input.videoDateKey, 10),
      productName: clampString(input.productName, 160),
      metricFocus: input.metricFocus,
      noteText: clampString(input.noteText, 800),
      ownerId: sanitizeId(user.uid),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}

export async function deleteVideoAnalysisNote(noteId: string): Promise<void> {
  const safeId = sanitizeId(noteId);
  const docPath = `videoAnalyses/${safeId}`;
  try {
    await deleteDoc(doc(db, 'videoAnalyses', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}
