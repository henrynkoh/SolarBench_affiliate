import {
  collection,
  deleteDoc,
  doc,
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
  PriceAlertRecord,
  SavedBuildLineItem,
  SavedSolarBuild,
} from '../types/solar';

const LOCAL_ALERTS_KEY = 'solarbench_local_price_alerts_v1';
const LOCAL_BUILDS_KEY = 'solarbench_local_saved_builds_v1';

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function timestampToIso(ts: unknown, fallback: string): string {
  if (ts && typeof ts === 'object' && 'toDate' in ts) {
    return (ts as Timestamp).toDate().toISOString();
  }
  return fallback;
}

export function loadLocalPriceAlerts(): PriceAlertRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ALERTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalPriceAlerts(alerts: PriceAlertRecord[]): void {
  try {
    localStorage.setItem(LOCAL_ALERTS_KEY, JSON.stringify(alerts));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadLocalSavedBuilds(): SavedSolarBuild[] {
  try {
    const raw = localStorage.getItem(LOCAL_BUILDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalSavedBuilds(builds: SavedSolarBuild[]): void {
  try {
    localStorage.setItem(LOCAL_BUILDS_KEY, JSON.stringify(builds));
  } catch {
    // Ignore storage quota errors
  }
}

export function subscribeUserPriceAlerts(
  userId: string,
  onData: (alerts: PriceAlertRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  const pathForOnSnapshot = 'priceAlerts';
  const q = query(
    collection(db, pathForOnSnapshot),
    where('ownerId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PriceAlertRecord[] = snapshot.docs.map((snap) => {
        const d = snap.data();
        return {
          alertId: String(d.alertId ?? snap.id),
          productId: String(d.productId ?? ''),
          productName: String(d.productName ?? ''),
          brand: String(d.brand ?? ''),
          targetPrice: Number(d.targetPrice ?? 0),
          lowestLandedAtCreation: Number(d.lowestLandedAtCreation ?? 0),
          ownerId: String(d.ownerId ?? ''),
          createdAtIso: timestampToIso(d.createdAt, new Date().toISOString()),
        };
      });
      items.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
      onData(items);
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

export async function createPriceAlert(input: {
  productId: string;
  productName: string;
  brand: string;
  targetPrice: number;
  lowestLandedAtCreation: number;
}): Promise<PriceAlertRecord> {
  const user = auth.currentUser;
  const alertId = sanitizeId(
    `alert_${input.productId}_${Date.now().toString(36)}`
  );
  const nowIso = new Date().toISOString();

  if (!user || !user.emailVerified) {
    const localRecord: PriceAlertRecord = {
      alertId,
      productId: clampString(input.productId, 80),
      productName: clampString(input.productName, 160),
      brand: clampString(input.brand, 60),
      targetPrice: Math.max(1, Math.min(100000, Number(input.targetPrice) || 1)),
      lowestLandedAtCreation: Math.max(0, Number(input.lowestLandedAtCreation) || 0),
      ownerId: 'local-session',
      createdAtIso: nowIso,
    };
    const next = [localRecord, ...loadLocalPriceAlerts()];
    saveLocalPriceAlerts(next);
    return localRecord;
  }

  const docPath = `priceAlerts/${alertId}`;
  const payload = {
    alertId,
    productId: clampString(input.productId, 80),
    productName: clampString(input.productName, 160),
    brand: clampString(input.brand, 60),
    targetPrice: Math.max(1, Math.min(100000, Number(input.targetPrice) || 1)),
    lowestLandedAtCreation: Math.max(0, Number(input.lowestLandedAtCreation) || 0),
    ownerId: sanitizeId(user.uid),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'priceAlerts', alertId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  return {
    alertId: payload.alertId,
    productId: payload.productId,
    productName: payload.productName,
    brand: payload.brand,
    targetPrice: payload.targetPrice,
    lowestLandedAtCreation: payload.lowestLandedAtCreation,
    ownerId: payload.ownerId,
    createdAtIso: nowIso,
  };
}

export async function updatePriceAlertTarget(
  alertId: string,
  targetPrice: number
): Promise<void> {
  const safePrice = Math.max(1, Math.min(100000, Number(targetPrice) || 1));
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    const updated = loadLocalPriceAlerts().map((a) =>
      a.alertId === alertId ? { ...a, targetPrice: safePrice } : a
    );
    saveLocalPriceAlerts(updated);
    return;
  }

  const safeId = sanitizeId(alertId);
  const docPath = `priceAlerts/${safeId}`;
  try {
    await updateDoc(doc(db, 'priceAlerts', safeId), {
      targetPrice: safePrice,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deletePriceAlert(alertId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    const filtered = loadLocalPriceAlerts().filter((a) => a.alertId !== alertId);
    saveLocalPriceAlerts(filtered);
    return;
  }

  const safeId = sanitizeId(alertId);
  const docPath = `priceAlerts/${safeId}`;
  try {
    await deleteDoc(doc(db, 'priceAlerts', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export function subscribeUserSavedBuilds(
  userId: string,
  onData: (builds: SavedSolarBuild[]) => void,
  onError?: (err: Error) => void
): () => void {
  const pathForOnSnapshot = 'savedBuilds';
  const q = query(
    collection(db, pathForOnSnapshot),
    where('ownerId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedSolarBuild[] = snapshot.docs.map((snap) => {
        const d = snap.data();
        const rawList = Array.isArray(d.items) ? d.items : [];
        return {
          buildId: String(d.buildId ?? snap.id),
          buildName: String(d.buildName ?? ''),
          totalCost: Number(d.totalCost ?? 0),
          totalStorageWh: Number(d.totalStorageWh ?? 0),
          totalSolarWatts: Number(d.totalSolarWatts ?? 0),
          items: rawList.map((entry: Record<string, unknown>) => ({
            productId: String(entry.productId ?? ''),
            quantity: Number(entry.quantity ?? 1),
            selectedMerchantId: String(entry.selectedMerchantId ?? ''),
          })),
          ownerId: String(d.ownerId ?? ''),
          createdAtIso: timestampToIso(d.createdAt, new Date().toISOString()),
        };
      });
      items.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
      onData(items);
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

export async function createSavedSolarBuild(input: {
  buildName: string;
  items: SavedBuildLineItem[];
  totalCost: number;
  totalStorageWh: number;
  totalSolarWatts: number;
}): Promise<SavedSolarBuild> {
  const user = auth.currentUser;
  const buildId = sanitizeId(`build_${Date.now().toString(36)}`);
  const nowIso = new Date().toISOString();
  const boundedItems = input.items.slice(0, 30).map((item) => ({
    productId: clampString(item.productId, 80),
    quantity: Math.max(1, Math.min(999, Number(item.quantity) || 1)),
    selectedMerchantId: clampString(item.selectedMerchantId, 80),
  }));

  if (!user || !user.emailVerified) {
    const localRecord: SavedSolarBuild = {
      buildId,
      buildName: clampString(input.buildName, 120),
      items: boundedItems,
      totalCost: Math.max(0, Number(input.totalCost) || 0),
      totalStorageWh: Math.max(0, Number(input.totalStorageWh) || 0),
      totalSolarWatts: Math.max(0, Number(input.totalSolarWatts) || 0),
      ownerId: 'local-session',
      createdAtIso: nowIso,
    };
    const next = [localRecord, ...loadLocalSavedBuilds()];
    saveLocalSavedBuilds(next);
    return localRecord;
  }

  const docPath = `savedBuilds/${buildId}`;
  const payload = {
    buildId,
    buildName: clampString(input.buildName, 120),
    items: boundedItems,
    totalCost: Math.max(0, Number(input.totalCost) || 0),
    totalStorageWh: Math.max(0, Number(input.totalStorageWh) || 0),
    totalSolarWatts: Math.max(0, Number(input.totalSolarWatts) || 0),
    ownerId: sanitizeId(user.uid),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'savedBuilds', buildId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }

  return {
    buildId: payload.buildId,
    buildName: payload.buildName,
    items: payload.items,
    totalCost: payload.totalCost,
    totalStorageWh: payload.totalStorageWh,
    totalSolarWatts: payload.totalSolarWatts,
    ownerId: payload.ownerId,
    createdAtIso: nowIso,
  };
}

export async function updateSavedSolarBuild(
  buildId: string,
  input: {
    buildName: string;
    items: SavedBuildLineItem[];
    totalCost: number;
    totalStorageWh: number;
    totalSolarWatts: number;
  }
): Promise<void> {
  const user = auth.currentUser;
  const boundedItems = input.items.slice(0, 30).map((item) => ({
    productId: clampString(item.productId, 80),
    quantity: Math.max(1, Math.min(999, Number(item.quantity) || 1)),
    selectedMerchantId: clampString(item.selectedMerchantId, 80),
  }));
  const cleanName = clampString(input.buildName, 120);
  const safeCost = Math.max(0, Number(input.totalCost) || 0);
  const safeStorage = Math.max(0, Number(input.totalStorageWh) || 0);
  const safeSolar = Math.max(0, Number(input.totalSolarWatts) || 0);

  if (!user || !user.emailVerified) {
    const updated = loadLocalSavedBuilds().map((b) =>
      b.buildId === buildId
        ? {
            ...b,
            buildName: cleanName,
            items: boundedItems,
            totalCost: safeCost,
            totalStorageWh: safeStorage,
            totalSolarWatts: safeSolar,
          }
        : b
    );
    saveLocalSavedBuilds(updated);
    return;
  }

  const safeId = sanitizeId(buildId);
  const docPath = `savedBuilds/${safeId}`;
  try {
    await updateDoc(doc(db, 'savedBuilds', safeId), {
      buildName: cleanName,
      items: boundedItems,
      totalCost: safeCost,
      totalStorageWh: safeStorage,
      totalSolarWatts: safeSolar,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, docPath);
  }
}

export async function deleteSavedSolarBuild(buildId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    const filtered = loadLocalSavedBuilds().filter((b) => b.buildId !== buildId);
    saveLocalSavedBuilds(filtered);
    return;
  }

  const safeId = sanitizeId(buildId);
  const docPath = `savedBuilds/${safeId}`;
  try {
    await deleteDoc(doc(db, 'savedBuilds', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

export async function syncLocalBuyerDataToFirestore(
  userId: string
): Promise<{ syncedAlerts: number; syncedBuilds: number }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || user.uid !== userId) {
    return { syncedAlerts: 0, syncedBuilds: 0 };
  }

  const localAlerts = loadLocalPriceAlerts();
  const localBuilds = loadLocalSavedBuilds();
  let syncedAlerts = 0;
  let syncedBuilds = 0;

  for (const a of localAlerts) {
    const alertId = sanitizeId(a.alertId || `alert_${Date.now().toString(36)}`);
    const docPath = `priceAlerts/${alertId}`;
    try {
      await setDoc(doc(db, 'priceAlerts', alertId), {
        alertId,
        productId: clampString(a.productId, 80),
        productName: clampString(a.productName, 160),
        brand: clampString(a.brand, 60),
        targetPrice: Math.max(1, Math.min(100000, Number(a.targetPrice) || 1)),
        lowestLandedAtCreation: Math.max(
          0,
          Number(a.lowestLandedAtCreation) || 0
        ),
        ownerId: sanitizeId(userId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      syncedAlerts += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  for (const b of localBuilds) {
    if (!Array.isArray(b.items) || b.items.length === 0) continue;
    const buildId = sanitizeId(b.buildId || `build_${Date.now().toString(36)}`);
    const docPath = `savedBuilds/${buildId}`;
    try {
      await setDoc(doc(db, 'savedBuilds', buildId), {
        buildId,
        buildName: clampString(b.buildName, 120),
        items: b.items.slice(0, 30).map((item) => ({
          productId: clampString(item.productId, 80),
          quantity: Math.max(1, Math.min(999, Number(item.quantity) || 1)),
          selectedMerchantId: clampString(item.selectedMerchantId, 80),
        })),
        totalCost: Math.max(0, Number(b.totalCost) || 0),
        totalStorageWh: Math.max(0, Number(b.totalStorageWh) || 0),
        totalSolarWatts: Math.max(0, Number(b.totalSolarWatts) || 0),
        ownerId: sanitizeId(userId),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      syncedBuilds += 1;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, docPath);
    }
  }

  if (syncedAlerts > 0) saveLocalPriceAlerts([]);
  if (syncedBuilds > 0) saveLocalSavedBuilds([]);
  return { syncedAlerts, syncedBuilds };
}
