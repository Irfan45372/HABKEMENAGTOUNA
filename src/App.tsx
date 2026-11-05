/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { AppState, BrandingConfig, HarmonyMessage, JalanSehatCoupon, NavLabelsConfig, ParticipantRegistration } from './types/hab';
import { DEFAULT_APP_STATE, STORAGE_KEY } from './data/defaultState';
import { HeroScene3D } from './components/HeroScene3D';
import { VenueMap3D } from './components/VenueMap3D';
import { CompetitionSection } from './components/CompetitionSection';
import { ScheduleBaksosSection } from './components/ScheduleBaksosSection';
import { JalanSehatTwibbonSection } from './components/JalanSehatTwibbonSection';
import { WallOfHarmonySection } from './components/WallOfHarmonySection';
import { AdminControlModal } from './components/AdminControlModal';
import { Hab81LogoBadge, KemenagLogoImg } from './components/DynamicLogoBadge';
import { Check, Edit3, Megaphone, Settings } from 'lucide-react';

import { validateImportedState } from './utils/habLogic';

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

  // Automatic initial fetch from GitHub repository if visitor has no local state yet
  useEffect(() => {
    const hasLocal = window.localStorage.getItem(STORAGE_KEY);
    if (hasLocal) return;
    let active = true;
    fetch(`${GITHUB_RAW_STATE_URL}?t=${Date.now()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        const validated = validateImportedState(data);
        if (validated.valid && validated.state) {
          setAppState(validated.state);
        }
      })
      .catch(() => {
        // Silently keep default seed state ifhab81-kemenag-touna-2027-state.json is not yet uploaded to GitHub
      });
    return () => {
      active = false;
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

  const scrollToSection = (sectionId: string) => {
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
      return {
        ...prev,
        satkerList: updatedSatkers,
        registrations: [reg, ...prev.registrations],
      };
    });
  };

  const handleAddCoupon = (coupon: JalanSehatCoupon) => {
    setAppState((prev) => ({
      ...prev,
      coupons: [coupon, ...prev.coupons],
    }));
  };

  const handleMarkCouponWinner = (couponId: string, prizeName: string) => {
    setAppState((prev) => ({
      ...prev,
      coupons: prev.coupons.map((c) =>
        c.id === couponId
          ? { ...c, sudahMenang: true, hadiahDimenangkan: prizeName }
          : c
      ),
    }));
  };

  const handleAddHarmonyMessage = (msg: HarmonyMessage) => {
    setAppState((prev) => ({
      ...prev,
      messages: [msg, ...prev.messages],
    }));
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
    setAppState((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        ...partial,
      },
    }));
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
      return {
        ...prev,
        branding: {
          ...prev.branding,
          navLabels: {
            ...currentNav,
            [key]: value,
          },
        },
      };
    });
  };

  const handleResetDefault = () => {
    setAppState(DEFAULT_APP_STATE);
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
        {/* Zone 1: Single-line Brand Wordmark */}
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
            className="font-display text-lg font-bold tracking-tight text-amber-300 whitespace-nowrap shrink-0"
          >
            {brandWordmark}
          </a>
        )}

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Navigasi Utama Portal HAB ke-81"
          className="hidden md:flex items-center gap-4 lg:gap-6 text-sm font-medium text-slate-200"
        >
          {isInlineEditMode ? (
            <>
              <input
                type="text"
                aria-label="Edit Menu 1"
                value={navLabels.beranda}
                onChange={(e) => handleUpdateNavLabel('beranda', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-28 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 2"
                value={navLabels.peta}
                onChange={(e) => handleUpdateNavLabel('peta', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-28 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 3"
                value={navLabels.lomba}
                onChange={(e) => handleUpdateNavLabel('lomba', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-36 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 4"
                value={navLabels.jadwal}
                onChange={(e) => handleUpdateNavLabel('jadwal', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-32 focus:outline-none"
              />
              <input
                type="text"
                aria-label="Edit Menu 5"
                value={navLabels.kupon}
                onChange={(e) => handleUpdateNavLabel('kupon', e.target.value)}
                className="px-2 py-1 rounded bg-[#03251c] border border-dashed border-amber-400 text-xs text-white w-36 focus:outline-none"
              />
            </>
          ) : (
            <>
              <a
                href="#beranda"
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.beranda}
              </a>
              <a
                href="#peta-lokasi"
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.peta}
              </a>
              <a
                href="#pendaftaran-lomba"
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.lomba}
              </a>
              <a
                href="#jadwal-acara"
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.jadwal}
              </a>
              <a
                href="#jalan-sehat"
                className="hover:text-amber-300 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
              >
                {navLabels.kupon}
              </a>
            </>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAdminTab(0)}
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Panel Admin
          </button>
        </div>
      </header>

      {/* Main Content Flow */}
      <main className="flex-1">
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
          onAddRegistration={handleAddRegistration}
        />

        {/* 4. Dynamic Multi-Category Schedule & Bakti Sosial Impact Dashboard */}
        <ScheduleBaksosSection
          schedules={appState.schedules}
          baksosMetrics={appState.baksosMetrics}
          onFocusVenueOnMap={handleFocusVenueOnMap}
          onOpenAdminTab={handleOpenAdminTab}
        />

        {/* 5. Jalan Sehat Kerukunan QR Coupon Generator, Lucky Draw Spinner & Twibbon */}
        <JalanSehatTwibbonSection
          branding={appState.branding}
          satkerList={appState.satkerList}
          coupons={appState.coupons}
          onAddCoupon={handleAddCoupon}
          onMarkCouponWinner={handleMarkCouponWinner}
        />

        {/* 6. Kotak Saran, Aspirasi & Wall of Harmony */}
        <WallOfHarmonySection
          messages={appState.messages}
          satkerList={appState.satkerList}
          onAddMessage={handleAddHarmonyMessage}
        />
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
              <div className="text-xs text-amber-300">
                {appState.branding.officialSubtitle}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Repositori Resmi: Irfan45372/HABKEMENAGTOUNA · Ikhlas Beramal
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
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

      {/* Quick Admin Control Panel Modal */}
      <AdminControlModal
        isOpen={adminModalOpen}
        initialTab={adminInitialTab}
        appState={appState}
        onClose={() => setAdminModalOpen(false)}
        onUpdateState={setAppState}
        onResetDefault={handleResetDefault}
        onActivateInlineEdit={() => {
          setAdminModalOpen(false);
          setIsInlineEditMode(true);
        }}
      />
    </div>
  );
}
