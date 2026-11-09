/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { AppState, BrandingConfig, Competition, HarmonyMessage, JalanSehatCoupon, JournalArticle, NavLabelsConfig, ParticipantRegistration, SatkerBannerItem, VenueLocation, VideoItem } from './types/hab';
import { DEFAULT_APP_STATE, STORAGE_KEY } from './data/defaultState';
import { HeroScene3D } from './components/HeroScene3D';
import { VenueMap3D } from './components/VenueMap3D';
import { CompetitionSection } from './components/CompetitionSection';
import { ScheduleBaksosSection } from './components/ScheduleBaksosSection';
import { JalanSehatTwibbonSection } from './components/JalanSehatTwibbonSection';
import { WallOfHarmonySection } from './components/WallOfHarmonySection';

const VideoGallerySection = lazy(() =>
  import('./components/VideoGallerySection').then((m) => ({ default: m.VideoGallerySection }))
);
const SatkerBannerSection = lazy(() =>
  import('./components/SatkerBannerSection').then((m) => ({ default: m.SatkerBannerSection }))
);
import { JournalSection } from './components/JournalSection';
import { AdminControlModal } from './components/AdminControlModal';
import { PanitiaInfoModal } from './components/PanitiaInfoModal';
import { WelcomeVoicePlayer } from './components/WelcomeVoicePlayer';
import { ViewportLazySection } from './components/ViewportLazySection';
import { Hab81LogoBadge, KemenagLogoImg } from './components/DynamicLogoBadge';
import { BookOpen, Check, Cloud, Edit3, Megaphone, Settings, Share2 } from 'lucide-react';

import { validateImportedState } from './utils/habLogic';
import { getAnnouncementSnippetWords, getAnnouncementUrlSlug } from './utils/letterUtils';
import {
  ADMIN_EMAIL,
  auth,
  collection,
  db,
  deleteCouponFromCloud,
  deleteHarmonyMessageFromCloud,
  deleteJournalFromCloud,
  deleteSatkerBannerFromCloud,
  deleteVideoFromCloud,
  doc,
  ensureCollectionsSeededToCloud,
  getDocFromServer,
  handleFirestoreError,
  onAuthStateChanged,
  onSnapshot,
  OperationType,
  saveCouponToCloud,
  saveHarmonyMessageToCloud,
  saveJournalToCloud,
  savePortalConfigToCloud,
  saveRegistrationToCloud,
  saveSatkerBannerToCloud,
  saveVideoToCloud,
  seedInitialStateToCloud,
  syncFullStateToCloud,
  User,
} from './firebase';

const GITHUB_RAW_STATE_URL =
  'https://raw.githubusercontent.com/Irfan45372/HABKEMENAGTOUNA/main/hab81-kemenag-touna-2027-state.json';

function persistStateLocally(state: AppState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const saved =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem('HABKEMENAGTOUNA_81_2027_STATE_V1') ||
        window.localStorage.getItem('HABKEMENAGTOUNA_81_2027_STATE');
      if (saved) {
        const parsed = JSON.parse(saved) as AppState;
        if (parsed && parsed.branding && Array.isArray(parsed.competitions)) {
          const mergedState: AppState = {
            ...DEFAULT_APP_STATE,
            ...parsed,
            branding: {
              ...DEFAULT_APP_STATE.branding,
              ...parsed.branding,
              navLabels: {
                ...DEFAULT_APP_STATE.branding.navLabels!,
                ...(parsed.branding.navLabels || {}),
              },
              welcomeVoice: {
                ...DEFAULT_APP_STATE.branding.welcomeVoice!,
                ...(parsed.branding.welcomeVoice || {}),
              },
            },
            venues:
              Array.isArray(parsed.venues) && parsed.venues.length > 0
                ? parsed.venues
                : DEFAULT_APP_STATE.venues,
            registrations:
              Array.isArray(parsed.registrations) && parsed.registrations.length > 0
                ? parsed.registrations
                : DEFAULT_APP_STATE.registrations,
            coupons:
              Array.isArray(parsed.coupons) && parsed.coupons.length > 0
                ? parsed.coupons
                : DEFAULT_APP_STATE.coupons,
            messages:
              Array.isArray(parsed.messages) && parsed.messages.length > 0
                ? parsed.messages
                : DEFAULT_APP_STATE.messages,
            videos:
              Array.isArray(parsed.videos) && parsed.videos.length > 0
                ? parsed.videos
                : DEFAULT_APP_STATE.videos,
            satkerBanners:
              Array.isArray(parsed.satkerBanners) && parsed.satkerBanners.length > 0
                ? parsed.satkerBanners
                : DEFAULT_APP_STATE.satkerBanners,
            journals:
              Array.isArray(parsed.journals) && parsed.journals.length > 0
                ? parsed.journals
                : DEFAULT_APP_STATE.journals,
          };
          return mergedState;
        }
      }
    } catch {
      // Fallback to default state
    }
    return DEFAULT_APP_STATE;
  });

  const [selectedVenueId, setSelectedVenueId] = useState<string>(
    () => appState.venues[0]?.id || 'venue-kantor-kemenag'
  );
  const [preselectedCompId, setPreselectedCompId] = useState<string | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [adminInitialTab, setAdminInitialTab] = useState<number>(0);
  const [isInlineEditMode, setIsInlineEditMode] = useState<boolean>(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState<boolean>(false);
  const [menuTapTrigger, setMenuTapTrigger] = useState<number>(0);
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isJournalPageOpen, setIsJournalPageOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return Boolean(params.get('jurnal') || params.get('menu') === 'jurnal');
    } catch {
      return false;
    }
  });
  const [selectedJournalId, setSelectedJournalId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('jurnal') || null;
    } catch {
      return null;
    }
  });
  const [panitiaInfoOpen, setPanitiaInfoOpen] = useState<boolean>(false);
  const [isAnnouncementPageOpen, setIsAnnouncementPageOpen] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return (
        params.get('halaman') === 'pengumuman' ||
        params.get('menu') === 'pengumuman' ||
        params.get('info') === 'panitia' ||
        Boolean(params.get('pengumuman'))
      );
    } catch {
      return false;
    }
  });
  const [forcedSectionId, setForcedSectionId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash.replace(/^#/, '');
      if (params.get('lomba') || params.get('menu') === 'lomba') return 'pendaftaran-lomba';
      if (params.get('banner') || params.get('menu') === 'banner') return 'spanduk-satker';
      if (
        params.get('kupon') ||
        params.get('menu') === 'kupon' ||
        params.get('menu') === 'twibbon'
      ) {
        return 'jalan-sehat';
      }
      if (params.get('jadwal') || params.get('menu') === 'jadwal') return 'jadwal-acara';
      if (params.get('menu') === 'peta') return 'peta-lokasi';
      if (hash) return hash;
      return null;
    } catch {
      return null;
    }
  });
  const forcedTimerRef = useRef<number | undefined>(undefined);
  const initialStateRef = useRef<AppState>(appState);

  const wakeAndScrollToSection = (sectionId: string) => {
    setForcedSectionId(sectionId);
    if (forcedTimerRef.current) {
      window.clearTimeout(forcedTimerRef.current);
    }
    forcedTimerRef.current = window.setTimeout(() => {
      setForcedSectionId((prev) => (prev === sectionId ? null : prev));
    }, 4000);

    window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 40);
  };

  // Handle deep-link scrolling on initial load for ?jadwal=, ?lomba=, ?banner=, ?kupon=, ?menu=...
  useEffect(() => {
    if (forcedSectionId && !isJournalPageOpen) {
      const t = window.setTimeout(() => {
        const el = document.getElementById(forcedSectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 220);
      return () => window.clearTimeout(t);
    }
  }, []);

  const openPanitiaInfoModal = () => {
    setMenuTapTrigger((prev) => prev + 1);
    setPanitiaInfoOpen(true);
  };

  const closePanitiaInfoModal = () => {
    setPanitiaInfoOpen(false);
  };

  const openStandaloneAnnouncementPage = () => {
    setMenuTapTrigger((prev) => prev + 1);
    setPanitiaInfoOpen(false);
    setIsJournalPageOpen(false);
    setIsAnnouncementPageOpen(true);
    try {
      const firstAnnouncement =
        appState.branding.runningTextItems[0] ||
        'Pengumuman Resmi Panitia HAB ke-81 Kemenag Kab. Tojo Una-Una Tahun 2027';
      const url = new URL(window.location.href);
      url.search = '';
      url.hash = '';
      url.searchParams.set('halaman', 'pengumuman');
      url.searchParams.set('pengumuman', '1');
      url.searchParams.set('redaksi', getAnnouncementUrlSlug(firstAnnouncement, 6));
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeStandaloneAnnouncementPage = (targetSectionId?: string) => {
    setMenuTapTrigger((prev) => prev + 1);
    setIsAnnouncementPageOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('halaman');
      url.searchParams.delete('menu');
      url.searchParams.delete('info');
      url.searchParams.delete('pengumuman');
      url.searchParams.delete('redaksi');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
    if (targetSectionId) {
      wakeAndScrollToSection(targetSectionId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Sync document title & OpenGraph description with the active Pengumuman Redaksi (4-6 words + full redaksi)
  useEffect(() => {
    try {
      const items = appState.branding.runningTextItems;
      if (!items || items.length === 0) return;

      const params = new URLSearchParams(window.location.search);
      const rawIdx = parseInt(params.get('pengumuman') || '1', 10);
      const targetIdx =
        !Number.isNaN(rawIdx) && rawIdx >= 1 && rawIdx <= items.length ? rawIdx - 1 : 0;
      const activeRedaksi = items[targetIdx] || items[0];
      const snippet6Words = getAnnouncementSnippetWords(activeRedaksi, 6);

      const setMetaContent = (selector: string, content: string) => {
        const el = document.querySelector(selector);
        if (el) el.setAttribute('content', content);
      };

      const ogTitle = `Pengumuman Panitia: ${snippet6Words} — HAB ke-81 Kemenag Touna`;
      const ogDesc = `${activeRedaksi} — Panitia HAB ke-81 Kemenag Kab. Tojo Una-Una Tahun 2027.`;

      if (isAnnouncementPageOpen || panitiaInfoOpen) {
        document.title = ogTitle;
      }
      setMetaContent('meta[property="og:title"]', ogTitle);
      setMetaContent('meta[name="twitter:title"]', ogTitle);
      setMetaContent('meta[property="og:description"]', ogDesc);
      setMetaContent('meta[name="twitter:description"]', ogDesc);
      setMetaContent('meta[name="description"]', ogDesc);
    } catch {
      // Ignore DOM meta update errors
    }
  }, [appState.branding.runningTextItems, isAnnouncementPageOpen, panitiaInfoOpen]);

  // Listen to Firebase Auth state for Cloud Firestore permissions (Admin Mode UI still requires PIN)
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubAuth();
  }, []);

  // Real-time Firebase Firestore synchronization across all visitors & devices
  useEffect(() => {
    let unsubConfig: (() => void) | undefined;
    let unsubRegs: (() => void) | undefined;
    let unsubCoupons: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;
    let unsubVideos: (() => void) | undefined;
    let unsubBanners: (() => void) | undefined;
    let unsubJournals: (() => void) | undefined;
    let cancelled = false;

    async function initFirestoreSync() {
      try {
        const mainRef = doc(db, 'portalConfig', 'main');
        const mainSnap = await getDocFromServer(mainRef);
        if (cancelled) return;

        if (!mainSnap.exists()) {
          // First time initialization: seed Firestore with current state
          await seedInitialStateToCloud(initialStateRef.current);
        } else {
          // Ensure all collections (coupons, registrations, messages, videos, banners, journals)
          // are seeded if any collection is empty, and upgrade old untouched default NIP 1975->1974
          await ensureCollectionsSeededToCloud(initialStateRef.current);
        }
        setFirebaseConnected(true);
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error('Please check your Firebase configuration. Client is offline.');
        }
        // Fallback: check GitHub raw state if Firestore is not reachable yet
        const hasLocal = window.localStorage.getItem(STORAGE_KEY);
        if (!hasLocal) {
          fetch(`${GITHUB_RAW_STATE_URL}?t=${Date.now()}`, { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
              if (cancelled || !data) return;
              const validated = validateImportedState(data);
              if (validated.valid && validated.state) {
                setAppState(validated.state);
              }
            })
            .catch(() => {});
        }
      }

      if (cancelled) return;

      // 1. Subscribe to portalConfig/main
      unsubConfig = onSnapshot(
        doc(db, 'portalConfig', 'main'),
        (snap) => {
          if (!snap.exists()) return;
          setFirebaseConnected(true);
          const data = snap.data();
          setAppState((prev) => ({
            ...prev,
            branding: data.branding
              ? {
                  ...prev.branding,
                  ...data.branding,
                  navLabels: {
                    ...(prev.branding.navLabels || DEFAULT_APP_STATE.branding.navLabels!),
                    ...(data.branding.navLabels || {}),
                  },
                  welcomeVoice: {
                    ...prev.branding.welcomeVoice!,
                    ...(data.branding.welcomeVoice || {}),
                  },
                }
              : prev.branding,
            venues:
              Array.isArray(data.venues) && data.venues.length > 0 ? data.venues : prev.venues,
            satkerList:
              Array.isArray(data.satkerList) && data.satkerList.length > 0
                ? data.satkerList
                : prev.satkerList,
            competitions:
              Array.isArray(data.competitions) && data.competitions.length > 0
                ? data.competitions
                : prev.competitions,
            matches:
              Array.isArray(data.matches) && data.matches.length > 0 ? data.matches : prev.matches,
            medalStandings:
              Array.isArray(data.medalStandings) && data.medalStandings.length > 0
                ? data.medalStandings
                : prev.medalStandings,
            schedules:
              Array.isArray(data.schedules) && data.schedules.length > 0
                ? data.schedules
                : prev.schedules,
            baksosMetrics:
              Array.isArray(data.baksosMetrics) && data.baksosMetrics.length > 0
                ? data.baksosMetrics
                : prev.baksosMetrics,
          }));
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'portalConfig/main')
      );

      // 2. Subscribe to registrations
      unsubRegs = onSnapshot(
        collection(db, 'registrations'),
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => d.data() as ParticipantRegistration);
          items.sort((a, b) => (b.id > a.id ? 1 : -1));
          setAppState((prev) => ({ ...prev, registrations: items }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'registrations')
      );

      // 3. Subscribe to coupons
      unsubCoupons = onSnapshot(
        collection(db, 'coupons'),
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => d.data() as JalanSehatCoupon);
          items.sort((a, b) => (b.nomorKupon > a.nomorKupon ? 1 : -1));
          setAppState((prev) => ({ ...prev, coupons: items }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'coupons')
      );

      // 4. Subscribe to messages
      unsubMessages = onSnapshot(
        collection(db, 'messages'),
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => d.data() as HarmonyMessage);
          items.sort((a, b) => (b.id > a.id ? 1 : -1));
          setAppState((prev) => ({ ...prev, messages: items }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'messages')
      );

      // 5. Subscribe to videos
      unsubVideos = onSnapshot(
        collection(db, 'videos'),
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => d.data() as VideoItem);
          items.sort((a, b) => (b.id > a.id ? 1 : -1));
          setAppState((prev) => ({ ...prev, videos: items }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'videos')
      );

      // 6. Subscribe to satkerBanners
      unsubBanners = onSnapshot(
        collection(db, 'satkerBanners'),
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => d.data() as SatkerBannerItem);
          items.sort((a, b) => (b.id > a.id ? 1 : -1));
          setAppState((prev) => ({ ...prev, satkerBanners: items }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'satkerBanners')
      );

      // 7. Subscribe to journals (Menu Khusus Jurnal & Berita)
      unsubJournals = onSnapshot(
        collection(db, 'journals'),
        (snap) => {
          if (snap.empty) return;
          const items = snap.docs.map((d) => d.data() as JournalArticle);
          items.sort((a, b) => (b.id > a.id ? 1 : -1));
          setAppState((prev) => ({
            ...prev,
            journals: items,
          }));
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'journals')
      );
    }

    initFirestoreSync();

    return () => {
      cancelled = true;
      unsubConfig?.();
      unsubRegs?.();
      unsubCoupons?.();
      unsubMessages?.();
      unsubVideos?.();
      unsubBanners?.();
      unsubJournals?.();
    };
  }, []);

  // Automatic Persistence to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch {
      // Ignore storage quota errors
    }
  }, [appState]);

  // Keyboard shortcut Ctrl + Shift + A to open Admin Control Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setAdminModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const openDedicatedJournalPage = (articleId?: string | null) => {
    setMenuTapTrigger((prev) => prev + 1);
    const allJournals = appState.journals || DEFAULT_APP_STATE.journals || [];
    const targetId =
      articleId !== undefined ? articleId : selectedJournalId || allJournals[0]?.id || null;
    setSelectedJournalId(targetId);
    setIsJournalPageOpen(true);
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      if (targetId) {
        url.searchParams.set('jurnal', targetId);
        url.searchParams.delete('menu');
      } else {
        url.searchParams.set('menu', 'jurnal');
        url.searchParams.delete('jurnal');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore URL update errors
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectJournalArticle = (id: string | null) => {
    setMenuTapTrigger((prev) => prev + 1);
    setSelectedJournalId(id);
    try {
      const url = new URL(window.location.href);
      if (id) {
        url.searchParams.set('jurnal', id);
        url.searchParams.delete('menu');
      } else {
        url.searchParams.set('menu', 'jurnal');
        url.searchParams.delete('jurnal');
      }
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
  };

  const closeDedicatedJournalPage = (targetSectionId?: string) => {
    setMenuTapTrigger((prev) => prev + 1);
    setIsJournalPageOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('jurnal');
      url.searchParams.delete('menu');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // Ignore
    }
    if (targetSectionId) {
      wakeAndScrollToSection(targetSectionId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToSection = (sectionId: string) => {
    setMenuTapTrigger((prev) => prev + 1);
    if (isJournalPageOpen) {
      closeDedicatedJournalPage(sectionId);
      return;
    }
    if (isAnnouncementPageOpen) {
      closeStandaloneAnnouncementPage(sectionId);
      return;
    }
    wakeAndScrollToSection(sectionId);
  };

  const handleAddRegistration = (reg: ParticipantRegistration, newSatkerName?: string) => {
    setAppState((prev) => {
      const updatedSatkers =
        newSatkerName && !prev.satkerList.includes(newSatkerName)
          ? [newSatkerName, ...prev.satkerList]
          : prev.satkerList;
      const next = {
        ...prev,
        satkerList: updatedSatkers,
        registrations: [reg, ...prev.registrations],
      };
      persistStateLocally(next);
      void saveRegistrationToCloud(reg);
      if (newSatkerName && !prev.satkerList.includes(newSatkerName)) {
        void savePortalConfigToCloud(next);
      }
      return next;
    });
  };

  const handleUpdateCompetition = (id: string, partial: Partial<Competition>) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        competitions: prev.competitions.map((c) => (c.id === id ? { ...c, ...partial } : c)),
      };
      persistStateLocally(next);
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleAddCoupon = (coupon: JalanSehatCoupon) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        coupons: [coupon, ...prev.coupons],
      };
      persistStateLocally(next);
      void saveCouponToCloud(coupon);
      return next;
    });
  };

  const handleMarkCouponWinner = (couponId: string, prizeName: string) => {
    setAppState((prev) => {
      let updatedItem: JalanSehatCoupon | undefined;
      const nextCoupons = prev.coupons.map((c) => {
        if (c.id === couponId) {
          updatedItem = { ...c, sudahMenang: true, hadiahDimenangkan: prizeName };
          return updatedItem;
        }
        return c;
      });
      const next = {
        ...prev,
        coupons: nextCoupons,
      };
      persistStateLocally(next);
      if (updatedItem) {
        void saveCouponToCloud(updatedItem);
      }
      return next;
    });
  };

  const handleUpdateCoupon = (
    couponId: string,
    updatedFields: Pick<JalanSehatCoupon, 'namaPeserta' | 'satkerAtauUmum' | 'nikAtauNip' | 'noHp'>,
    fullFallbackCoupon?: JalanSehatCoupon
  ) => {
    setAppState((prev) => {
      let updatedItem: JalanSehatCoupon | undefined;
      const targetId = couponId === 'cpn-preview' ? 'cpn-seed-1' : couponId;
      const nextCoupons = prev.coupons.map((c) => {
        if (c.id === couponId || c.id === targetId) {
          updatedItem = {
            ...c,
            id: targetId,
            namaPeserta: updatedFields.namaPeserta,
            satkerAtauUmum: updatedFields.satkerAtauUmum,
            nikAtauNip: updatedFields.nikAtauNip,
            noHp: updatedFields.noHp,
          };
          return updatedItem;
        }
        return c;
      });
      if (!updatedItem && fullFallbackCoupon) {
        updatedItem = {
          ...fullFallbackCoupon,
          id: targetId,
          namaPeserta: updatedFields.namaPeserta,
          satkerAtauUmum: updatedFields.satkerAtauUmum,
          nikAtauNip: updatedFields.nikAtauNip,
          noHp: updatedFields.noHp,
        };
        nextCoupons.unshift(updatedItem);
      }
      const next = {
        ...prev,
        coupons: nextCoupons,
      };
      persistStateLocally(next);
      if (updatedItem) {
        void saveCouponToCloud(updatedItem);
      }
      return next;
    });
  };

  const handleDeleteCoupon = (couponId: string) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        coupons: prev.coupons.filter((c) => c.id !== couponId),
      };
      persistStateLocally(next);
      return next;
    });
    void deleteCouponFromCloud(couponId);
  };

  const handleAddHarmonyMessage = (msg: HarmonyMessage) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        messages: [msg, ...prev.messages],
      };
      persistStateLocally(next);
      void saveHarmonyMessageToCloud(msg);
      return next;
    });
  };

  const handleUpdateHarmonyMessage = (id: string, partial: Partial<HarmonyMessage>) => {
    setAppState((prev) => {
      let updatedItem: HarmonyMessage | undefined;
      const nextMessages = prev.messages.map((m) => {
        if (m.id === id) {
          updatedItem = { ...m, ...partial };
          return updatedItem;
        }
        return m;
      });
      const next = {
        ...prev,
        messages: nextMessages,
      };
      persistStateLocally(next);
      if (updatedItem) {
        void saveHarmonyMessageToCloud(updatedItem);
      }
      return next;
    });
  };

  const handleDeleteHarmonyMessage = (id: string) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        messages: prev.messages.filter((m) => m.id !== id),
      };
      persistStateLocally(next);
      return next;
    });
    void deleteHarmonyMessageFromCloud(id);
  };

  const handleAddVideo = (video: VideoItem) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        videos: [video, ...(prev.videos || DEFAULT_APP_STATE.videos || [])],
      };
      persistStateLocally(next);
      void saveVideoToCloud(video);
      return next;
    });
  };

  const handleUpdateVideo = (id: string, partial: Partial<VideoItem>) => {
    setAppState((prev) => {
      const currentVideos = prev.videos || DEFAULT_APP_STATE.videos || [];
      let updatedItem: VideoItem | undefined;
      const nextVideos = currentVideos.map((v) => {
        if (v.id === id) {
          updatedItem = { ...v, ...partial };
          return updatedItem;
        }
        return v;
      });
      const next = {
        ...prev,
        videos: nextVideos,
      };
      persistStateLocally(next);
      if (updatedItem) {
        void saveVideoToCloud(updatedItem);
      }
      return next;
    });
  };

  const handleDeleteVideo = (id: string) => {
    setAppState((prev) => {
      const currentVideos = prev.videos || DEFAULT_APP_STATE.videos || [];
      const next = {
        ...prev,
        videos: currentVideos.filter((v) => v.id !== id),
      };
      persistStateLocally(next);
      return next;
    });
    void deleteVideoFromCloud(id);
  };

  const handleAddSatkerBanner = (banner: SatkerBannerItem, newSatkerName?: string) => {
    setAppState((prev) => {
      const updatedSatkers =
        newSatkerName && !prev.satkerList.includes(newSatkerName)
          ? [newSatkerName, ...prev.satkerList]
          : prev.satkerList;
      const currentBanners = prev.satkerBanners || DEFAULT_APP_STATE.satkerBanners || [];
      const next = {
        ...prev,
        satkerList: updatedSatkers,
        satkerBanners: [banner, ...currentBanners],
      };
      persistStateLocally(next);
      void saveSatkerBannerToCloud(banner);
      if (newSatkerName && !prev.satkerList.includes(newSatkerName)) {
        void savePortalConfigToCloud(next);
      }
      return next;
    });
  };

  const handleUpdateSatkerBanner = (id: string, partial: Partial<SatkerBannerItem>) => {
    setAppState((prev) => {
      const currentBanners = prev.satkerBanners || DEFAULT_APP_STATE.satkerBanners || [];
      let updatedItem: SatkerBannerItem | undefined;
      const nextBanners = currentBanners.map((b) => {
        if (b.id === id) {
          updatedItem = { ...b, ...partial };
          return updatedItem;
        }
        return b;
      });
      const next = {
        ...prev,
        satkerBanners: nextBanners,
      };
      persistStateLocally(next);
      if (updatedItem) {
        void saveSatkerBannerToCloud(updatedItem);
      }
      return next;
    });
  };

  const handleDeleteSatkerBanner = (id: string) => {
    setAppState((prev) => {
      const currentBanners = prev.satkerBanners || DEFAULT_APP_STATE.satkerBanners || [];
      const next = {
        ...prev,
        satkerBanners: currentBanners.filter((b) => b.id !== id),
      };
      persistStateLocally(next);
      return next;
    });
    void deleteSatkerBannerFromCloud(id);
  };

  const handleAddJournal = (article: JournalArticle) => {
    setAppState((prev) => {
      const currentJournals = prev.journals || DEFAULT_APP_STATE.journals || [];
      const next = {
        ...prev,
        journals: [article, ...currentJournals],
      };
      persistStateLocally(next);
      return next;
    });
    void saveJournalToCloud(article);
  };

  const handleUpdateJournal = (id: string, partial: Partial<JournalArticle>) => {
    setAppState((prev) => {
      const currentJournals = prev.journals || DEFAULT_APP_STATE.journals || [];
      let updatedItem: JournalArticle | undefined;
      const nextJournals = currentJournals.map((j) => {
        if (j.id === id) {
          updatedItem = { ...j, ...partial };
          return updatedItem;
        }
        return j;
      });
      const next = {
        ...prev,
        journals: nextJournals,
      };
      persistStateLocally(next);
      if (updatedItem) {
        void saveJournalToCloud(updatedItem);
      }
      return next;
    });
  };

  const handleDeleteJournal = (id: string) => {
    setAppState((prev) => {
      const currentJournals = prev.journals || DEFAULT_APP_STATE.journals || [];
      const next = {
        ...prev,
        journals: currentJournals.filter((j) => j.id !== id),
      };
      persistStateLocally(next);
      return next;
    });
    void deleteJournalFromCloud(id);
  };

  const handleFocusVenueOnMap = (venueId: string) => {
    setSelectedVenueId(venueId);
    scrollToSection('peta-lokasi');
  };

  const handleJumpToRegisterFromMap = (compId: string) => {
    setPreselectedCompId(compId);
    scrollToSection('pendaftaran-lomba');
  };

  const handleAddVenue = (venue: VenueLocation) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        venues: [...prev.venues, venue],
      };
      persistStateLocally(next);
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleUpdateVenue = (id: string, partial: Partial<VenueLocation>) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        venues: prev.venues.map((v) => (v.id === id ? { ...v, ...partial } : v)),
      };
      persistStateLocally(next);
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleDeleteVenue = (id: string) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        venues: prev.venues.filter((v) => v.id !== id),
      };
      persistStateLocally(next);
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleOpenAdminTab = (tabIndex: number) => {
    setAdminInitialTab(tabIndex);
    setAdminModalOpen(true);
  };

  const handleUpdateBranding = (partial: Partial<BrandingConfig>) => {
    setAppState((prev) => {
      const next = {
        ...prev,
        branding: {
          ...prev.branding,
          ...partial,
        },
      };
      persistStateLocally(next);
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleUpdateNavLabel = (key: keyof NavLabelsConfig, value: string) => {
    setAppState((prev) => {
      const currentNav: NavLabelsConfig = prev.branding.navLabels || {
        beranda: 'Beranda 3D',
        peta: 'Peta Lokasi',
        lomba: 'Pendaftaran Lomba',
        jadwal: 'Jadwal & Baksos',
        kupon: 'Kupon Jalan Sehat',
      };
      const next = {
        ...prev,
        branding: {
          ...prev.branding,
          navLabels: {
            ...currentNav,
            [key]: value,
          },
        },
      };
      persistStateLocally(next);
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleAdminUpdateState = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
      persistStateLocally(next);
      void syncFullStateToCloud(next, prev);
      return next;
    });
  };

  const handleResetDefault = () => {
    setAppState((prev) => {
      void syncFullStateToCloud(DEFAULT_APP_STATE, prev);
      return DEFAULT_APP_STATE;
    });
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APP_STATE));
    } catch {
      // Ignore
    }
  };

  const navLabels: NavLabelsConfig = appState.branding.navLabels || {
    beranda: 'Beranda 3D',
    peta: 'Peta Lokasi',
    lomba: 'Pendaftaran Lomba',
    jadwal: 'Jadwal & Baksos',
    kupon: 'Kupon Jalan Sehat',
    jurnal: 'Jurnal & Berita',
  };

  const brandWordmark = appState.branding.brandWordmark || 'HABKEMENAGTOUNA';
  const tickerBadgeLabel = appState.branding.tickerBadgeLabel || 'INFO PANITIA';

  const tickerText =
    appState.branding.runningTextItems.length > 0
      ? appState.branding.runningTextItems.join('   ✦   ')
      : 'Selamat Memperingati Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia — Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027.';

  return (
    <div className="min-h-screen bg-[#021b15] text-slate-100 flex flex-col">
      {/* Direct On-Page Admin Text Editing Banner when Active */}
      {isInlineEditMode && (
        <div className="bg-amber-400 text-slate-950 px-4 py-2 text-xs font-bold flex flex-wrap items-center justify-between gap-3 z-50">
          <div className="flex items-center gap-2">
            <Edit3 className="w-4 h-4 shrink-0" />
            <span>
              MODE EDIT TEKS LANGSUNG AKTIF — Klik & ketik langsung pada kotak teks bergaris di halaman ini (otomatis tersimpan).
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAdminTab(4)}
              className="px-3 py-1 rounded bg-[#021b15] text-amber-300 hover:bg-emerald-950 font-semibold cursor-pointer"
            >
              Buka Pengaturan Lengkap (Tab 5)
            </button>
            <button
              type="button"
              onClick={() => {
                void savePortalConfigToCloud(appState);
                setIsInlineEditMode(false);
              }}
              className="px-3.5 py-1 rounded bg-emerald-900 text-white hover:bg-emerald-800 font-bold flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-amber-300" />
              <span>Simpan & Selesai Edit</span>
            </button>
          </div>
        </div>
      )}

      {/* Live Breaking News Ticker Banner */}
      <div
        role="region"
        aria-label="Pengumuman Terkini Panitia HAB ke-81"
        className="bg-[#042f24] border-b border-emerald-800/80 py-1.5 px-4 overflow-hidden flex items-center gap-3 text-xs"
      >
        <div className="flex items-center gap-1.5 text-amber-300 font-bold shrink-0 pr-2 border-r border-emerald-700">
          <Megaphone className="w-3.5 h-3.5" />
          {isInlineEditMode ? (
            <input
              type="text"
              aria-label="Edit Label Info Panitia"
              value={tickerBadgeLabel}
              onChange={(e) => handleUpdateBranding({ tickerBadgeLabel: e.target.value })}
              className="px-1.5 py-0.5 rounded bg-[#021b15] border border-dashed border-amber-400 text-amber-300 text-xs w-28 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={openPanitiaInfoModal}
              className="hover:underline cursor-pointer text-left"
              title="Klik untuk membuka Papan Informasi Panitia & Salin Link Pengumuman"
            >
              {tickerBadgeLabel}
            </button>
          )}
        </div>
        <div
          onClick={openPanitiaInfoModal}
          className="overflow-hidden flex-1 cursor-pointer"
          title="Klik untuk membaca lengkap & membagikan Informasi Panitia ke WhatsApp"
        >
          <div className="animate-marquee whitespace-nowrap text-slate-200 font-medium hover:text-amber-200">
            <span className="mx-4">{tickerText}</span>
            <span className="mx-4" aria-hidden="true">
              {tickerText}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={openStandaloneAnnouncementPage}
            className={`px-2.5 py-1 rounded-md border font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer ${
              isAnnouncementPageOpen
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-[#021b15] hover:bg-emerald-900 border-amber-400/50 text-amber-300'
            }`}
            title="Buka Halaman Web Khusus Pengumuman Panitia Saja (?halaman=pengumuman)"
          >
            <Megaphone className="w-3 h-3" />
            <span>Web Pengumuman</span>
          </button>
          <button
            type="button"
            onClick={openPanitiaInfoModal}
            className="px-2.5 py-1 rounded-md bg-emerald-800/90 hover:bg-emerald-700 border border-amber-400/40 text-amber-300 font-bold text-[11px] flex items-center gap-1 shrink-0 cursor-pointer"
            title="Buka & Bagikan Informasi Panitia ke WhatsApp"
          >
            <Share2 className="w-3 h-3" />
            <span className="hidden sm:inline">Bagikan Info Panitia</span>
            <span className="sm:hidden">Info</span>
          </button>
        </div>
      </div>

      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#021b15]/95 border-b border-emerald-800/80 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark + Sub-header HUMAS */}
        {isInlineEditMode ? (
          <input
            type="text"
            aria-label="Edit Nama Brand Kiri Atas"
            value={brandWordmark}
            onChange={(e) => handleUpdateBranding({ brandWordmark: e.target.value })}
            className="px-2.5 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 font-display text-base font-bold tracking-tight text-amber-300 w-52 focus:outline-none"
          />
        ) : (
          <a
            href="#beranda"
            onClick={(e) => {
              if (isJournalPageOpen) {
                e.preventDefault();
                closeDedicatedJournalPage('beranda');
              } else if (isAnnouncementPageOpen) {
                e.preventDefault();
                closeStandaloneAnnouncementPage('beranda');
              }
            }}
            className="flex flex-col leading-tight shrink-0 group"
          >
            <span className="font-display text-lg font-bold tracking-tight text-amber-300 group-hover:text-amber-200 whitespace-nowrap">
              {brandWordmark}
            </span>
            <span className="text-[7.5px] font-normal tracking-wide text-slate-400/45 uppercase whitespace-nowrap select-none">
              by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
            </span>
          </a>
        )}

        {/* Zone 2: Navigation Links + Dedicated Jurnal Menu */}
        <nav
          aria-label="Navigasi Utama Portal HAB ke-81"
          className="hidden md:flex items-center gap-4 lg:gap-5 text-sm font-medium text-slate-200"
        >
          {isInlineEditMode ? (
            <>
              <input
                type="text"
                aria-label="Edit Menu 1"
                value={navLabels.beranda}
                onChange={(e) => handleUpdateNavLabel('beranda', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-24 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu Jurnal"
                value={navLabels.jurnal || 'Jurnal & Berita'}
                onChange={(e) => handleUpdateNavLabel('jurnal', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-amber-300 w-32 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 2"
                value={navLabels.peta}
                onChange={(e) => handleUpdateNavLabel('peta', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-24 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 3"
                value={navLabels.lomba}
                onChange={(e) => handleUpdateNavLabel('lomba', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-32 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 4"
                value={navLabels.jadwal}
                onChange={(e) => handleUpdateNavLabel('jadwal', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-28 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 5"
                value={navLabels.kupon}
                onChange={(e) => handleUpdateNavLabel('kupon', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-32 focus:outline-none"
              />
            </>
          ) : (
            <>
              <a
                href="#beranda"
                onClick={(e) => {
                  setMenuTapTrigger((prev) => prev + 1);
                  if (isJournalPageOpen) {
                    e.preventDefault();
                    closeDedicatedJournalPage('beranda');
                  } else if (isAnnouncementPageOpen) {
                    e.preventDefault();
                    closeStandaloneAnnouncementPage('beranda');
                  }
                }}
                className={`hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                  !isJournalPageOpen && !isAnnouncementPageOpen ? 'text-white' : 'text-slate-300'
                }`}
              >
                {navLabels.beranda}
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsAnnouncementPageOpen(false);
                  openDedicatedJournalPage();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isJournalPageOpen
                    ? 'bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300/60'
                    : 'bg-emerald-900/90 hover:bg-emerald-800 text-amber-300 border border-emerald-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{navLabels.jurnal || 'Jurnal & Berita'}</span>
              </button>
              <a
                href="#peta-lokasi"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('peta-lokasi');
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.peta}
              </a>
              <a
                href="#pendaftaran-lomba"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('pendaftaran-lomba');
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.lomba}
              </a>
              <a
                href="#jadwal-acara"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('jadwal-acara');
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.jadwal}
              </a>
              <a
                href="#jalan-sehat"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToSection('jalan-sehat');
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.kupon}
              </a>
            </>
          )}
        </nav>

        {/* Zone 3: Mobile Jurnal Shortcut + Primary Action Button */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              isJournalPageOpen
                ? closeDedicatedJournalPage('beranda')
                : isAnnouncementPageOpen
                ? closeStandaloneAnnouncementPage('beranda')
                : openDedicatedJournalPage()
            }
            className={`md:hidden px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isJournalPageOpen || isAnnouncementPageOpen
                ? 'bg-emerald-800 text-amber-300 border border-amber-400/60'
                : 'bg-emerald-900 text-amber-300 border border-emerald-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>
              {isJournalPageOpen || isAnnouncementPageOpen
                ? 'Beranda'
                : navLabels.jurnal || 'Jurnal'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdminTab(0)}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Panel Admin
          </button>
        </div>
      </header>

      {/* Main Content Flow: Dedicated Standalone Pengumuman Page, Dedicated Journal Page, OR Main Portal */}
      <main className="flex-1">
        {isAnnouncementPageOpen ? (
          <PanitiaInfoModal
            isOpen={true}
            isStandalonePage={true}
            branding={appState.branding}
            schedules={appState.schedules}
            adminPin={appState.branding.adminPin}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockAdmin={() => setIsAdminUnlocked(true)}
            onUpdateBranding={handleUpdateBranding}
            onOpenAdminTab={(tabIdx) => handleOpenAdminTab(tabIdx)}
            onClose={() => closeStandaloneAnnouncementPage('beranda')}
            onJumpToSection={scrollToSection}
            onOpenJournal={() => {
              setIsAnnouncementPageOpen(false);
              openDedicatedJournalPage();
            }}
          />
        ) : isJournalPageOpen ? (
          <JournalSection
            journals={appState.journals || DEFAULT_APP_STATE.journals || []}
            satkerList={appState.satkerList}
            selectedJournalId={selectedJournalId}
            onSelectJournalId={handleSelectJournalArticle}
            onBackToPortal={() => closeDedicatedJournalPage('beranda')}
            adminPin={appState.branding.adminPin}
            isAdminUnlocked={isAdminUnlocked}
            onUnlockAdmin={() => setIsAdminUnlocked(true)}
            onAddJournal={handleAddJournal}
            onUpdateJournal={handleUpdateJournal}
            onDeleteJournal={handleDeleteJournal}
          />
        ) : (
          <>
            {/* 1. 3D Hero Section: Jalinan Kerukunan & 3D Emblem Kemenag + Countdown */}
            <ViewportLazySection
              sectionId="beranda"
              label="Beranda 3D HAB ke-81"
              fallbackMinHeight={680}
              forceMount={forcedSectionId === 'beranda' || isInlineEditMode}
            >
              <HeroScene3D
                branding={appState.branding}
                totalCompetitions={appState.competitions.length}
                totalRegistrations={appState.registrations.length}
                totalCoupons={appState.coupons.length}
                isInlineEditMode={isInlineEditMode}
                onUpdateBranding={handleUpdateBranding}
                onNavigateSection={scrollToSection}
                onOpenAdmin={() => handleOpenAdminTab(0)}
                onOpenAdminBranding={() => handleOpenAdminTab(4)}
              />
            </ViewportLazySection>

            {/* 2. Peta GPS Satelit & Titik Koordinat Kegiatan Kabupaten Tojo Una-Una */}
            <ViewportLazySection
              sectionId="peta-lokasi"
              label="Peta GPS Satelit & Titik Koordinat"
              fallbackMinHeight={640}
              forceMount={forcedSectionId === 'peta-lokasi'}
            >
              <VenueMap3D
                venues={appState.venues}
                competitions={appState.competitions}
                schedules={appState.schedules}
                selectedVenueId={selectedVenueId}
                onSelectVenue={setSelectedVenueId}
                onJumpToRegister={handleJumpToRegisterFromMap}
                adminPin={appState.branding.adminPin}
                isAdminUnlocked={isAdminUnlocked}
                onUnlockAdmin={() => setIsAdminUnlocked(true)}
                onAddVenue={handleAddVenue}
                onUpdateVenue={handleUpdateVenue}
                onDeleteVenue={handleDeleteVenue}
                onOpenAdminMapTab={() => handleOpenAdminTab(1)}
              />
            </ViewportLazySection>

            {/* 3. Flexible Competition Registration, Directory, Scoreboard & Medals */}
            <ViewportLazySection
              sectionId="pendaftaran-lomba"
              label="Pendaftaran Lomba & Klasemen"
              fallbackMinHeight={760}
              forceMount={forcedSectionId === 'pendaftaran-lomba' || Boolean(preselectedCompId)}
            >
              <CompetitionSection
                competitions={appState.competitions}
                satkerList={appState.satkerList}
                registrations={appState.registrations}
                matches={appState.matches}
                medalStandings={appState.medalStandings}
                allowCustomProposal={appState.branding.allowCustomCompetitionProposal}
                preselectedCompetitionId={preselectedCompId}
                adminPin={appState.branding.adminPin}
                isAdminUnlocked={isAdminUnlocked}
                onUnlockAdmin={() => setIsAdminUnlocked(true)}
                onUpdateCompetition={handleUpdateCompetition}
                onAddRegistration={handleAddRegistration}
              />
            </ViewportLazySection>

            {/* 4. Dynamic Multi-Category Schedule & Bakti Sosial Impact Dashboard */}
            <ViewportLazySection
              sectionId="jadwal-acara"
              label="Jadwal Acara & Bakti Sosial"
              fallbackMinHeight={620}
              forceMount={forcedSectionId === 'jadwal-acara'}
            >
              <ScheduleBaksosSection
                schedules={appState.schedules}
                baksosMetrics={appState.baksosMetrics}
                onFocusVenueOnMap={handleFocusVenueOnMap}
                onOpenAdminTab={handleOpenAdminTab}
              />
            </ViewportLazySection>

            {/* 5. Galeri Video, Dokumentasi & Link YouTube Satker */}
            <ViewportLazySection
              sectionId="galeri-video"
              label="Galeri Video & Dokumentasi"
              fallbackMinHeight={520}
              forceMount={forcedSectionId === 'galeri-video'}
            >
              <Suspense
                fallback={
                  <div className="py-16 text-center text-xs text-emerald-300/80">
                    Memuat Galeri Video & Dokumentasi...
                  </div>
                }
              >
                <VideoGallerySection
                  videos={appState.videos || DEFAULT_APP_STATE.videos || []}
                  satkerList={appState.satkerList}
                  adminPin={appState.branding.adminPin}
                  isAdminUnlocked={isAdminUnlocked}
                  onUnlockAdmin={() => setIsAdminUnlocked(true)}
                  onAddVideo={handleAddVideo}
                  onUpdateVideo={handleUpdateVideo}
                  onDeleteVideo={handleDeleteVideo}
                  onOpenAdminVideoTab={() => handleOpenAdminTab(3)}
                />
              </Suspense>
            </ViewportLazySection>

            {/* 6. Galeri Spanduk, Banner Ucapan & Foto Persiapan/Kegiatan Satker */}
            <ViewportLazySection
              sectionId="spanduk-satker"
              label="Galeri Spanduk & Banner Satker"
              fallbackMinHeight={640}
              forceMount={forcedSectionId === 'spanduk-satker'}
            >
              <Suspense
                fallback={
                  <div className="py-16 text-center text-xs text-emerald-300/80">
                    Memuat Galeri Spanduk & Banner Satker...
                  </div>
                }
              >
                <SatkerBannerSection
                  banners={appState.satkerBanners || DEFAULT_APP_STATE.satkerBanners || []}
                  satkerList={appState.satkerList}
                  adminPin={appState.branding.adminPin}
                  isAdminUnlocked={isAdminUnlocked}
                  onUnlockAdmin={() => setIsAdminUnlocked(true)}
                  onAddBanner={handleAddSatkerBanner}
                  onUpdateBanner={handleUpdateSatkerBanner}
                  onDeleteBanner={handleDeleteSatkerBanner}
                  onOpenAdminBannerTab={() => handleOpenAdminTab(3)}
                />
              </Suspense>
            </ViewportLazySection>

            {/* 7. Jalan Sehat Kerukunan QR Coupon Generator, Lucky Draw Spinner & Twibbon */}
            <ViewportLazySection
              sectionId="jalan-sehat"
              label="Kupon Jalan Sehat & Twibbon"
              fallbackMinHeight={740}
              forceMount={forcedSectionId === 'jalan-sehat'}
            >
              <JalanSehatTwibbonSection
                branding={appState.branding}
                satkerList={appState.satkerList}
                coupons={appState.coupons}
                adminPin={appState.branding.adminPin}
                isAdminUnlocked={isAdminUnlocked}
                onUnlockAdmin={() => setIsAdminUnlocked(true)}
                onAddCoupon={handleAddCoupon}
                onMarkCouponWinner={handleMarkCouponWinner}
                onUpdateCoupon={handleUpdateCoupon}
                onDeleteCoupon={handleDeleteCoupon}
              />
            </ViewportLazySection>

            {/* 8. Kotak Saran, Aspirasi & Wall of Harmony */}
            <ViewportLazySection
              sectionId="aspirasi-ucapan"
              label="Kotak Aspirasi & Ucapan"
              fallbackMinHeight={560}
              forceMount={forcedSectionId === 'aspirasi-ucapan'}
            >
              <WallOfHarmonySection
                messages={appState.messages}
                satkerList={appState.satkerList}
                adminPin={appState.branding.adminPin}
                isAdminUnlocked={isAdminUnlocked}
                onUnlockAdmin={() => setIsAdminUnlocked(true)}
                onAddMessage={handleAddHarmonyMessage}
                onUpdateMessage={handleUpdateHarmonyMessage}
                onDeleteMessage={handleDeleteHarmonyMessage}
              />
            </ViewportLazySection>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-[#01140f] border-t border-emerald-900/80 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <KemenagLogoImg branding={appState.branding} className="w-11 h-11" />
            <Hab81LogoBadge branding={appState.branding} className="w-11 h-11" />
            <div>
              <div className="font-display text-sm font-bold text-white">
                {appState.branding.officialTitle}
              </div>
              <div className="text-xs text-amber-300 font-semibold">
                {appState.branding.officialSubtitle}
              </div>
              <div className="text-[8px] font-normal tracking-wide text-slate-400/45 uppercase mt-0.5 select-none">
                by HUMAS KEMENTERIAN AGAMA KABUPATEN TOJO UNA UNA
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Repositori Resmi: Irfan45372/HABKEMENAGTOUNA · Ikhlas Beramal
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
            <span
              className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 ${
                firebaseConnected
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
              title="Status Sinkronisasi Database Cloud Firebase"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {firebaseConnected
                  ? 'Firebase Cloud Database Aktif (Real-time)'
                  : 'Menghubungkan Firebase Cloud...'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => handleOpenAdminTab(0)}
              className="px-3.5 py-2 rounded-lg bg-[#03251c] hover:bg-emerald-900 border border-emerald-700 text-amber-300 font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Quick Admin Control Panel (Ctrl+Shift+A)</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Welcome Voice / Audio Greeting Player (Button only visible when Admin PIN is unlocked) */}
      <WelcomeVoicePlayer
        config={appState.branding.welcomeVoice}
        isAdminUnlocked={isAdminUnlocked}
        menuTapTrigger={menuTapTrigger}
        onOpenAdminSettings={() => handleOpenAdminTab(4)}
        onLockAdmin={() => {
          setIsAdminUnlocked(false);
          setIsInlineEditMode(false);
        }}
      />

      {/* Official Panitia Announcements & Deep-Link Directory Modal */}
      <PanitiaInfoModal
        isOpen={panitiaInfoOpen}
        branding={appState.branding}
        schedules={appState.schedules}
        adminPin={appState.branding.adminPin}
        isAdminUnlocked={isAdminUnlocked}
        onUnlockAdmin={() => setIsAdminUnlocked(true)}
        onUpdateBranding={handleUpdateBranding}
        onOpenAdminTab={(tabIdx) => {
          closePanitiaInfoModal();
          handleOpenAdminTab(tabIdx);
        }}
        onClose={closePanitiaInfoModal}
        onOpenStandalonePage={openStandaloneAnnouncementPage}
        onJumpToSection={scrollToSection}
        onOpenJournal={() => openDedicatedJournalPage()}
      />

      {/* Quick Admin Control Panel Modal */}
      <AdminControlModal
        isOpen={adminModalOpen}
        initialTab={adminInitialTab}
        appState={appState}
        firebaseConnected={firebaseConnected}
        currentUser={currentUser}
        isAdminUnlocked={isAdminUnlocked}
        onUnlockAdmin={() => setIsAdminUnlocked(true)}
        onLockAdmin={() => {
          setIsAdminUnlocked(false);
          setIsInlineEditMode(false);
        }}
        onClose={() => setAdminModalOpen(false)}
        onUpdateState={handleAdminUpdateState}
        onResetDefault={handleResetDefault}
        onActivateInlineEdit={() => {
          setAdminModalOpen(false);
          setIsInlineEditMode(true);
        }}
      />
    </div>
  );
}
