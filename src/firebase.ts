import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  writeBatch,
  getDocs,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AppState,
  BrandingConfig,
  Competition,
  HarmonyMessage,
  JalanSehatCoupon,
  JournalArticle,
  ParticipantRegistration,
  SatkerBannerItem,
  VideoItem,
} from './types/hab';

// Prevent internal @firebase/firestore backoff/quota logs from triggering uncaught console.error overlays
try {
  setLogLevel('silent');
} catch {
  // Ignore if setLogLevel is unavailable
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAIL = 'kakakkuganteng@gmail.com';

const QUOTA_EXHAUSTED_STORAGE_KEY = 'HAB81_FIRESTORE_WRITE_QUOTA_DATE';

// Clear any previous session flag on fresh load so upgrading the database immediately restores writes on refresh
try {
  window.sessionStorage.removeItem(QUOTA_EXHAUSTED_STORAGE_KEY);
} catch {
  // Ignore storage errors
}

let writeQuotaExhausted = false;

function markWriteQuotaExhausted(): void {
  writeQuotaExhausted = true;
}

export function isFirestoreWriteQuotaExhausted(): boolean {
  return writeQuotaExhausted;
}

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code || '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded')
  );
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  if (isQuotaError(error)) {
    markWriteQuotaExhausted();
    console.warn(
      `[Cloud Sync] Kuota tulis harian Firestore (Free Tier) telah penuh untuk hari ini pada path "${path}". Data tetap tersimpan aman di penyimpanan lokal browser dan sinkronisasi cloud akan aktif kembali saat kuota harian di-reset esok hari.`
    );
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData.map((provider) => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Error: ', JSON.stringify(errInfo));
}

/**
 * Strips undefined fields recursively so Firestore setDoc never rejects optional properties.
 */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'portalConfig', 'main'));
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      markWriteQuotaExhausted();
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Please check your Firebase configuration. Client is offline.');
    }
    return false;
  }
}

export async function signInWithGoogleAdmin(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (error) {
    console.warn('Google Sign-In failed:', error);
    return null;
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('Sign-Out failed:', error);
  }
}

export { onAuthStateChanged, onSnapshot, collection, doc, getDocFromServer };
export type { User };

const CHUNK_PREFIX = '__cloud_chunks__:';
const MAX_INLINE_STRING_LEN = 35_000;
const CHUNK_SIZE_CHARS = 600_000;
const attachmentMemoryCache = new Map<string, string>();

export const PENDING_CONFIG_SYNC_KEY = 'HAB81_PENDING_PORTAL_CONFIG_SYNC_TS';

export function markPendingPortalConfigSync(isoTimestamp: string | null): void {
  try {
    if (isoTimestamp) {
      window.localStorage.setItem(PENDING_CONFIG_SYNC_KEY, isoTimestamp);
    } else {
      window.localStorage.removeItem(PENDING_CONFIG_SYNC_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getPendingPortalConfigSync(): string | null {
  try {
    return window.localStorage.getItem(PENDING_CONFIG_SYNC_KEY);
  } catch {
    return null;
  }
}

function computeStableHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

async function offloadLargeString(pathHint: string, rawStr: string): Promise<string> {
  if (!rawStr || rawStr.startsWith(CHUNK_PREFIX) || rawStr.length <= MAX_INLINE_STRING_LEN) {
    return rawStr;
  }
  const safeHint = pathHint.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  const fingerprint = computeStableHash(
    `${rawStr.length}:${rawStr.slice(0, 128)}:${rawStr.slice(-128)}`
  );
  const docPrefix = `att_${safeHint}_${fingerprint}`;
  const totalChunks = Math.ceil(rawStr.length / CHUNK_SIZE_CHARS);
  const pointer = `${CHUNK_PREFIX}${docPrefix}:${totalChunks}:${rawStr.length}`;

  if (attachmentMemoryCache.get(pointer) === rawStr) {
    return pointer;
  }

  try {
    for (let i = 0; i < totalChunks; i++) {
      const slice = rawStr.slice(i * CHUNK_SIZE_CHARS, (i + 1) * CHUNK_SIZE_CHARS);
      const chunkDocId = `${docPrefix}_c${i}`;
      await setDoc(doc(db, 'portalConfig', chunkDocId), {
        branding: {},
        competitions: [],
        schedules: [],
        chunkData: slice,
        updatedAt: new Date().toISOString(),
      });
    }
    attachmentMemoryCache.set(pointer, rawStr);
    return pointer;
  } catch (err) {
    console.warn('[Cloud Sync] Offload attachment failed for', pathHint, err);
    // Never leave a >1MB inline string inside portalConfig/main or the entire config save will fail
    if (rawStr.length > 750_000) {
      return '';
    }
    return rawStr;
  }
}

async function offloadLargeFieldsRecursively(value: unknown, pathHint: string): Promise<unknown> {
  if (typeof value === 'string') {
    if (value.length > MAX_INLINE_STRING_LEN) {
      return offloadLargeString(pathHint, value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (let i = 0; i < value.length; i++) {
      out.push(await offloadLargeFieldsRecursively(value[i], `${pathHint}_${i}`));
    }
    return out;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const idSuffix = typeof record.id === 'string' ? `_${record.id}` : '';
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      out[k] = await offloadLargeFieldsRecursively(v, `${pathHint}${idSuffix}_${k}`);
    }
    return out;
  }
  return value;
}

async function resolveCloudChunkPointer(value: string): Promise<string> {
  if (!value || !value.startsWith(CHUNK_PREFIX)) return value;
  const cached = attachmentMemoryCache.get(value);
  if (cached) return cached;

  try {
    const raw = value.slice(CHUNK_PREFIX.length);
    const parts = raw.split(':');
    const docPrefix = parts[0];
    const totalChunks = parseInt(parts[1] || '1', 10);
    if (!docPrefix || Number.isNaN(totalChunks) || totalChunks < 1) return value;

    const chunks: string[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkDocId = `${docPrefix}_c${i}`;
      const snap = await getDoc(doc(db, 'portalConfig', chunkDocId));
      if (!snap.exists()) return value;
      const chunkData = snap.data()?.chunkData;
      if (typeof chunkData !== 'string') return value;
      chunks.push(chunkData);
    }
    const full = chunks.join('');
    attachmentMemoryCache.set(value, full);
    return full;
  } catch {
    return value;
  }
}

async function hydrateChunkPointersRecursively(value: unknown): Promise<unknown> {
  if (typeof value === 'string') {
    if (value.startsWith(CHUNK_PREFIX)) {
      return resolveCloudChunkPointer(value);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item) => hydrateChunkPointersRecursively(item)));
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const entries = await Promise.all(
      Object.entries(record).map(async ([k, v]) => [k, await hydrateChunkPointersRecursively(v)])
    );
    return Object.fromEntries(entries);
  }
  return value;
}

export async function hydratePortalConfigData(
  rawData: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const cloned = stripUndefined(rawData);
  return (await hydrateChunkPointersRecursively(cloned)) as Record<string, unknown>;
}

export async function savePortalConfigToCloud(state: AppState): Promise<boolean> {
  const updatedAt = state.updatedAt || new Date().toISOString();
  markPendingPortalConfigSync(updatedAt);
  if (writeQuotaExhausted) return false;
  const path = 'portalConfig/main';
  try {
    const rawPayload = stripUndefined({
      branding: state.branding,
      venues: state.venues || [],
      satkerList: state.satkerList || [],
      competitions: state.competitions || [],
      matches: state.matches || [],
      medalStandings: state.medalStandings || [],
      schedules: state.schedules || [],
      baksosMetrics: state.baksosMetrics || [],
      collectionsSeededV2: true,
      updatedAt,
    });

    const compactPayload = (await offloadLargeFieldsRecursively(
      rawPayload,
      'cfg'
    )) as Record<string, unknown>;

    await setDoc(doc(db, 'portalConfig', 'main'), compactPayload);
    if (getPendingPortalConfigSync() === updatedAt) {
      markPendingPortalConfigSync(null);
    }
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

export async function saveRegistrationToCloud(reg: ParticipantRegistration): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `registrations/${reg.id}`;
  try {
    await setDoc(doc(db, 'registrations', reg.id), stripUndefined(reg));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRegistrationFromCloud(id: string): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `registrations/${id}`;
  try {
    await deleteDoc(doc(db, 'registrations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCouponToCloud(coupon: JalanSehatCoupon): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `coupons/${coupon.id}`;
  try {
    await setDoc(doc(db, 'coupons', coupon.id), stripUndefined(coupon));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCouponFromCloud(id: string): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `coupons/${id}`;
  try {
    await deleteDoc(doc(db, 'coupons', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveHarmonyMessageToCloud(msg: HarmonyMessage): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), stripUndefined(msg));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteHarmonyMessageFromCloud(id: string): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `messages/${id}`;
  try {
    await deleteDoc(doc(db, 'messages', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveVideoToCloud(video: VideoItem): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `videos/${video.id}`;
  try {
    await setDoc(doc(db, 'videos', video.id), stripUndefined(video));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVideoFromCloud(id: string): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `videos/${id}`;
  try {
    await deleteDoc(doc(db, 'videos', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSatkerBannerToCloud(banner: SatkerBannerItem): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `satkerBanners/${banner.id}`;
  try {
    await setDoc(doc(db, 'satkerBanners', banner.id), stripUndefined(banner));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSatkerBannerFromCloud(id: string): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `satkerBanners/${id}`;
  try {
    await deleteDoc(doc(db, 'satkerBanners', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveJournalToCloud(journal: JournalArticle): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `journals/${journal.id}`;
  try {
    await setDoc(doc(db, 'journals', journal.id), stripUndefined(journal));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJournalFromCloud(id: string): Promise<void> {
  if (writeQuotaExhausted) return;
  const path = `journals/${id}`;
  try {
    await deleteDoc(doc(db, 'journals', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Seeds Firestore when portalConfig/main does not exist yet.
 */
export async function seedInitialStateToCloud(state: AppState): Promise<void> {
  if (writeQuotaExhausted) return;
  try {
    await savePortalConfigToCloud(state);
    await ensureCollectionsSeededToCloud(state);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedInitialStateToCloud');
  }
}

/**
 * Ensures each collection in Firestore has initial seed data if that collection is currently empty,
 * while NEVER overwriting any existing documents modified by Admin or Users.
 */
export async function ensureCollectionsSeededToCloud(state: AppState): Promise<void> {
  if (writeQuotaExhausted) return;
  try {
    const collectionsToCheck: Array<{
      name: string;
      items: Array<{ id: string }>;
    }> = [
      { name: 'registrations', items: state.registrations || [] },
      { name: 'coupons', items: state.coupons || [] },
      { name: 'messages', items: state.messages || [] },
      { name: 'videos', items: state.videos || [] },
      { name: 'satkerBanners', items: state.satkerBanners || [] },
      { name: 'journals', items: state.journals || [] },
    ];

    const batch = writeBatch(db);
    let hasWrites = false;

    for (const col of collectionsToCheck) {
      if (col.items.length === 0) continue;
      const snap = await getDocs(collection(db, col.name));
      if (snap.empty) {
        for (const item of col.items) {
          batch.set(doc(db, col.name, item.id), stripUndefined(item));
          hasWrites = true;
        }
      }
    }

    if (hasWrites) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'ensureCollectionsSeededToCloud');
  }
}

/**
 * Synchronizes full AppState changes from AdminControlModal (including added/updated/deleted items)
 * to Firestore collections.
 */
export async function syncFullStateToCloud(newState: AppState, prevState?: AppState): Promise<void> {
  if (writeQuotaExhausted) return;
  try {
    await savePortalConfigToCloud(newState);

    const syncCollection = async <T extends { id: string }>(
      colName: string,
      newItems: T[],
      oldItems?: T[]
    ) => {
      if (writeQuotaExhausted) return;
      const newIds = new Set(newItems.map((i) => i.id));
      // Write new or changed items
      for (const item of newItems) {
        if (writeQuotaExhausted) return;
        const prevItem = oldItems?.find((o) => o.id === item.id);
        if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
          await setDoc(doc(db, colName, item.id), stripUndefined(item));
        }
      }
      // Delete removed items
      if (oldItems) {
        for (const oldItem of oldItems) {
          if (writeQuotaExhausted) return;
          if (!newIds.has(oldItem.id)) {
            await deleteDoc(doc(db, colName, oldItem.id));
          }
        }
      } else {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          if (writeQuotaExhausted) return;
          if (!newIds.has(d.id)) {
            await deleteDoc(doc(db, colName, d.id));
          }
        }
      }
    };

    await Promise.all([
      syncCollection('registrations', newState.registrations || [], prevState?.registrations),
      syncCollection('coupons', newState.coupons || [], prevState?.coupons),
      syncCollection('messages', newState.messages || [], prevState?.messages),
      syncCollection('videos', newState.videos || [], prevState?.videos),
      syncCollection('satkerBanners', newState.satkerBanners || [], prevState?.satkerBanners),
      syncCollection('journals', newState.journals || [], prevState?.journals),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'syncFullStateToCloud');
  }
}
