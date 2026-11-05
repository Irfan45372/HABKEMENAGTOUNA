/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AppState, BrandingConfig, Competition, HarmonyMessage, JalanSehatCoupon, JournalArticle, NavLabelsConfig, ParticipantRegistration, SatkerBannerItem, VideoItem } from './types/hab';
import { DEFAULT_APP_STATE, STORAGE_KEY } from './data/defaultState';
import { HeroScene3D } from './components/HeroScene3D';
import { VenueMap3D } from './components/VenueMap3D';
import { CompetitionSection } from './components/CompetitionSection';
import { ScheduleBaksosSection } from './components/ScheduleBaksosSection';
import { VideoGallerySection } from './components/VideoGallerySection';
import { SatkerBannerSection } from './components/SatkerBannerSection';
import { JalanSehatTwibbonSection } from './components/JalanSehatTwibbonSection';
import { WallOfHarmonySection } from './components/WallOfHarmonySection';
import { JournalSection } from './components/JournalSection';
import { AdminControlModal } from './components/AdminControlModal';
import { WelcomeVoicePlayer } from './components/WelcomeVoicePlayer';
import { Hab81LogoBadge, KemenagLogoImg } from './components/DynamicLogoBadge';
import { BookOpen, Check, Cloud, Edit3, Megaphone, Settings } from 'lucide-react';

import { validateImportedState } from './utils/habLogic';
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

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.branding && Array.isArray(parsed.competitions)) {
          return parsed as AppState;
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
  const initialStateRef = useRef<AppState>(appState);

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
            branding: data.branding || prev.branding,
            venues: Array.isArray(data.venues) ? data.venues : prev.venues,
            satkerList: Array.isArray(data.satkerList) ? data.satkerList : prev.satkerList,
            competitions: Array.isArray(data.competitions) ? data.competitions : prev.competitions,
            matches: Array.isArray(data.matches) ? data.matches : prev.matches,
            medalStandings: Array.isArray(data.medalStandings)
              ? data.medalStandings
              : prev.medalStandings,
            schedules: Array.isArray(data.schedules) ? data.schedules : prev.schedules,
            baksosMetrics: data.baksosMetrics || prev.baksosMetrics,
          }));
        },
        (err) => handleFirestoreError(err, OperationType.GET, 'portalConfig/main')
      );

      // 2. Subscribe to registrations
      unsubRegs = onSnapshot(
        collection(db, 'registrations'),
        (snap) => {
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
          const items = snap.docs.map((d) => d.data() as JournalArticle);
          items.sort((a, b) => (b.id > a.id ? 1 : -1));
          setAppState((prev) => ({
            ...prev,
            journals: items.length > 0 ? items : prev.journals || DEFAULT_APP_STATE.journals || [],
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
      setTimeout(() => {
        const el = document.getElementById(targetSectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
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
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
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
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleAddCoupon = (coupon: JalanSehatCoupon) => {
    setAppState((prev) => ({
      ...prev,
      coupons: [coupon, ...prev.coupons],
    }));
    void saveCouponToCloud(coupon);
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
      if (updatedItem) {
        void saveCouponToCloud(updatedItem);
      }
      return {
        ...prev,
        coupons: nextCoupons,
      };
    });
  };

  const handleUpdateCoupon = (
    couponId: string,
    updatedFields: Pick<JalanSehatCoupon, 'namaPeserta' | 'satkerAtauUmum' | 'nikAtauNip' | 'noHp'>
  ) => {
    setAppState((prev) => {
      let updatedItem: JalanSehatCoupon | undefined;
      const nextCoupons = prev.coupons.map((c) => {
        if (c.id === couponId) {
          updatedItem = {
            ...c,
            namaPeserta: updatedFields.namaPeserta,
            satkerAtauUmum: updatedFields.satkerAtauUmum,
            nikAtauNip: updatedFields.nikAtauNip,
            noHp: updatedFields.noHp,
          };
          return updatedItem;
        }
        return c;
      });
      if (updatedItem) {
        void saveCouponToCloud(updatedItem);
      }
      return {
        ...prev,
        coupons: nextCoupons,
      };
    });
  };

  const handleDeleteCoupon = (couponId: string) => {
    setAppState((prev) => ({
      ...prev,
      coupons: prev.coupons.filter((c) => c.id !== couponId),
    }));
    void deleteCouponFromCloud(couponId);
  };

  const handleAddHarmonyMessage = (msg: HarmonyMessage) => {
    setAppState((prev) => ({
      ...prev,
      messages: [msg, ...prev.messages],
    }));
    void saveHarmonyMessageToCloud(msg);
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
      if (updatedItem) {
        void saveHarmonyMessageToCloud(updatedItem);
      }
      return {
        ...prev,
        messages: nextMessages,
      };
    });
  };

  const handleDeleteHarmonyMessage = (id: string) => {
    setAppState((prev) => ({
      ...prev,
      messages: prev.messages.filter((m) => m.id !== id),
    }));
    void deleteHarmonyMessageFromCloud(id);
  };

  const handleAddVideo = (video: VideoItem) => {
    setAppState((prev) => ({
      ...prev,
      videos: [video, ...(prev.videos || DEFAULT_APP_STATE.videos || [])],
    }));
    void saveVideoToCloud(video);
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
      if (updatedItem) {
        void saveVideoToCloud(updatedItem);
      }
      return {
        ...prev,
        videos: nextVideos,
      };
    });
  };

  const handleDeleteVideo = (id: string) => {
    setAppState((prev) => {
      const currentVideos = prev.videos || DEFAULT_APP_STATE.videos || [];
      return {
        ...prev,
        videos: currentVideos.filter((v) => v.id !== id),
      };
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
      if (updatedItem) {
        void saveSatkerBannerToCloud(updatedItem);
      }
      return {
        ...prev,
        satkerBanners: nextBanners,
      };
    });
  };

  const handleDeleteSatkerBanner = (id: string) => {
    setAppState((prev) => {
      const currentBanners = prev.satkerBanners || DEFAULT_APP_STATE.satkerBanners || [];
      return {
        ...prev,
        satkerBanners: currentBanners.filter((b) => b.id !== id),
      };
    });
    void deleteSatkerBannerFromCloud(id);
  };

  const handleAddJournal = (article: JournalArticle) => {
    setAppState((prev) => {
      const currentJournals = prev.journals || DEFAULT_APP_STATE.journals || [];
      return {
        ...prev,
        journals: [article, ...currentJournals],
      };
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
      if (updatedItem) {
        void saveJournalToCloud(updatedItem);
      }
      return {
        ...prev,
        journals: nextJournals,
      };
    });
  };

  const handleDeleteJournal = (id: string) => {
    setAppState((prev) => {
      const currentJournals = prev.journals || DEFAULT_APP_STATE.journals || [];
      return {
        ...prev,
        journals: currentJournals.filter((j) => j.id !== id),
      };
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
      void savePortalConfigToCloud(next);
      return next;
    });
  };

  const handleAdminUpdateState = (updater: (prev: AppState) => AppState) => {
    setAppState((prev) => {
      const next = updater(prev);
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
              onClick={() => setIsInlineEditMode(false)}
              className="px-3 py-1 rounded bg-emerald-900 text-white hover:bg-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selesai Edit</span>
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
            <span>{tickerBadgeLabel}</span>
          )}
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee whitespace-nowrap text-slate-200 font-medium">
            <span className="mx-4">{tickerText}</span>
            <span className="mx-4" aria-hidden="true">
              {tickerText}
            </span>
          </div>
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
              }
            }}
            className="flex flex-col leading-tight shrink-0 group"
          >
            <span className="font-display text-lg font-bold tracking-tight text-amber-300 group-hover:text-amber-200 whitespace-nowrap">
              {brandWordmark}
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-emerald-300/95 uppercase whitespace-nowrap">
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
                  }
                }}
                className={`hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                  !isJournalPageOpen ? 'text-white' : 'text-slate-300'
                }`}
              >
                {navLabels.beranda}
              </a>
              <button
                type="button"
                onClick={() => openDedicatedJournalPage()}
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
                  setMenuTapTrigger((prev) => prev + 1);
                  if (isJournalPageOpen) {
                    e.preventDefault();
                    closeDedicatedJournalPage('peta-lokasi');
                  }
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.peta}
              </a>
              <a
                href="#pendaftaran-lomba"
                onClick={(e) => {
                  setMenuTapTrigger((prev) => prev + 1);
                  if (isJournalPageOpen) {
                    e.preventDefault();
                    closeDedicatedJournalPage('pendaftaran-lomba');
                  }
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.lomba}
              </a>
              <a
                href="#jadwal-acara"
                onClick={(e) => {
                  setMenuTapTrigger((prev) => prev + 1);
                  if (isJournalPageOpen) {
                    e.preventDefault();
                    closeDedicatedJournalPage('jadwal-acara');
                  }
                }}
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.jadwal}
              </a>
              <a
                href="#jalan-sehat"
                onClick={(e) => {
                  setMenuTapTrigger((prev) => prev + 1);
                  if (isJournalPageOpen) {
                    e.preventDefault();
                    closeDedicatedJournalPage('jalan-sehat');
                  }
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
              isJournalPageOpen ? closeDedicatedJournalPage('beranda') : openDedicatedJournalPage()
            }
            className={`md:hidden px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isJournalPageOpen
                ? 'bg-emerald-800 text-amber-300 border border-amber-400/60'
                : 'bg-emerald-900 text-amber-300 border border-emerald-700'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isJournalPageOpen ? 'Beranda' : navLabels.jurnal || 'Jurnal'}</span>
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

      {/* Main Content Flow: Dedicated Distraction-Free Journal Mode OR Main Portal */}
      <main className="flex-1">
        {isJournalPageOpen ? (
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

            {/* 2. 2.5D Isometric Interactive Venue Map of Kabupaten Tojo Una-Una */}
            <VenueMap3D
              venues={appState.venues}
              competitions={appState.competitions}
              schedules={appState.schedules}
              selectedVenueId={selectedVenueId}
              onSelectVenue={setSelectedVenueId}
              onJumpToRegister={handleJumpToRegisterFromMap}
            />

            {/* 3. Flexible Competition Registration, Directory, Scoreboard & Medals */}
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

            {/* 4. Dynamic Multi-Category Schedule & Bakti Sosial Impact Dashboard */}
            <ScheduleBaksosSection
              schedules={appState.schedules}
              baksosMetrics={appState.baksosMetrics}
              onFocusVenueOnMap={handleFocusVenueOnMap}
              onOpenAdminTab={handleOpenAdminTab}
            />

            {/* 5. Galeri Video, Dokumentasi & Link YouTube Satker */}
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

            {/* 6. Galeri Spanduk, Banner Ucapan & Foto Persiapan/Kegiatan Satker */}
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

            {/* 7. Jalan Sehat Kerukunan QR Coupon Generator, Lucky Draw Spinner & Twibbon */}
            <JalanSehatTwibbonSection
              branding={appState.branding}
              satkerList={appState.satkerList}
              coupons={appState.coupons}
              onAddCoupon={handleAddCoupon}
              onMarkCouponWinner={handleMarkCouponWinner}
              onUpdateCoupon={handleUpdateCoupon}
              onDeleteCoupon={handleDeleteCoupon}
            />

            {/* 8. Kotak Saran, Aspirasi & Wall of Harmony */}
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
              <div className="text-xs font-bold tracking-wider text-emerald-300 uppercase mt-1">
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
