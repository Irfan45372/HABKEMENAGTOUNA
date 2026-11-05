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
  getDocFromServer,
  onSnapshot,
  writeBatch,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  AppState,
  HarmonyMessage,
  JalanSehatCoupon,
  JournalArticle,
  ParticipantRegistration,
  SatkerBannerItem,
  VideoItem,
} from './types/hab';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAIL = 'kakakkuganteng@gmail.com';

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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
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
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration. Client is offline.');
    }
    return false;
  }
}

export async function signInWithGoogleAdmin(): Promise<User | null> {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return res.user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    return null;
  }
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out failed:', error);
  }
}

export { onAuthStateChanged, onSnapshot, collection, doc, getDocFromServer };
export type { User };

export async function savePortalConfigToCloud(state: AppState): Promise<void> {
  const path = 'portalConfig/main';
  try {
    const payload = stripUndefined({
      branding: state.branding,
      venues: state.venues,
      satkerList: state.satkerList,
      competitions: state.competitions,
      matches: state.matches,
      medalStandings: state.medalStandings,
      schedules: state.schedules,
      baksosMetrics: state.baksosMetrics,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'portalConfig', 'main'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveRegistrationToCloud(reg: ParticipantRegistration): Promise<void> {
  const path = `registrations/${reg.id}`;
  try {
    await setDoc(doc(db, 'registrations', reg.id), stripUndefined(reg));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteRegistrationFromCloud(id: string): Promise<void> {
  const path = `registrations/${id}`;
  try {
    await deleteDoc(doc(db, 'registrations', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCouponToCloud(coupon: JalanSehatCoupon): Promise<void> {
  const path = `coupons/${coupon.id}`;
  try {
    await setDoc(doc(db, 'coupons', coupon.id), stripUndefined(coupon));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCouponFromCloud(id: string): Promise<void> {
  const path = `coupons/${id}`;
  try {
    await deleteDoc(doc(db, 'coupons', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveHarmonyMessageToCloud(msg: HarmonyMessage): Promise<void> {
  const path = `messages/${msg.id}`;
  try {
    await setDoc(doc(db, 'messages', msg.id), stripUndefined(msg));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteHarmonyMessageFromCloud(id: string): Promise<void> {
  const path = `messages/${id}`;
  try {
    await deleteDoc(doc(db, 'messages', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveVideoToCloud(video: VideoItem): Promise<void> {
  const path = `videos/${video.id}`;
  try {
    await setDoc(doc(db, 'videos', video.id), stripUndefined(video));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVideoFromCloud(id: string): Promise<void> {
  const path = `videos/${id}`;
  try {
    await deleteDoc(doc(db, 'videos', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSatkerBannerToCloud(banner: SatkerBannerItem): Promise<void> {
  const path = `satkerBanners/${banner.id}`;
  try {
    await setDoc(doc(db, 'satkerBanners', banner.id), stripUndefined(banner));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSatkerBannerFromCloud(id: string): Promise<void> {
  const path = `satkerBanners/${id}`;
  try {
    await deleteDoc(doc(db, 'satkerBanners', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveJournalToCloud(journal: JournalArticle): Promise<void> {
  const path = `journals/${journal.id}`;
  try {
    await setDoc(doc(db, 'journals', journal.id), stripUndefined(journal));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteJournalFromCloud(id: string): Promise<void> {
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
  try {
    await savePortalConfigToCloud(state);
    const batch = writeBatch(db);
    for (const reg of state.registrations || []) {
      batch.set(doc(db, 'registrations', reg.id), stripUndefined(reg));
    }
    for (const coupon of state.coupons || []) {
      batch.set(doc(db, 'coupons', coupon.id), stripUndefined(coupon));
    }
    for (const msg of state.messages || []) {
      batch.set(doc(db, 'messages', msg.id), stripUndefined(msg));
    }
    for (const video of state.videos || []) {
      batch.set(doc(db, 'videos', video.id), stripUndefined(video));
    }
    for (const banner of state.satkerBanners || []) {
      batch.set(doc(db, 'satkerBanners', banner.id), stripUndefined(banner));
    }
    for (const journal of state.journals || []) {
      batch.set(doc(db, 'journals', journal.id), stripUndefined(journal));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedInitialStateToCloud');
  }
}

/**
 * Synchronizes full AppState changes from AdminControlModal (including added/updated/deleted items)
 * to Firestore collections.
 */
export async function syncFullStateToCloud(newState: AppState, prevState?: AppState): Promise<void> {
  try {
    await savePortalConfigToCloud(newState);

    const syncCollection = async <T extends { id: string }>(
      colName: string,
      newItems: T[],
      oldItems?: T[]
    ) => {
      const newIds = new Set(newItems.map((i) => i.id));
      // Write new or changed items
      for (const item of newItems) {
        const prevItem = oldItems?.find((o) => o.id === item.id);
        if (!prevItem || JSON.stringify(prevItem) !== JSON.stringify(item)) {
          await setDoc(doc(db, colName, item.id), stripUndefined(item));
        }
      }
      // Delete removed items
      if (oldItems) {
        for (const oldItem of oldItems) {
          if (!newIds.has(oldItem.id)) {
            await deleteDoc(doc(db, colName, oldItem.id));
          }
        }
      } else {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
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
