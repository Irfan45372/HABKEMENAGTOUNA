import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WelcomeVoiceConfig } from '../types/hab';
import { normalizeAudioUrl } from '../utils/habLogic';
import { Lock, Settings, Volume2, VolumeX } from 'lucide-react';

interface WelcomeVoicePlayerProps {
  config?: WelcomeVoiceConfig;
  isAdminUnlocked?: boolean;
  menuTapTrigger?: number;
  onOpenAdminSettings?: () => void;
  onLockAdmin?: () => void;
}

const DEFAULT_VOICE_CONFIG: WelcomeVoiceConfig = {
  enabled: true,
  mode: 'tts',
  welcomeText:
    'Selamat datang di Portal Resmi Peringatan Hari Amal Bakti ke-81 Kementerian Agama Republik Indonesia, Kantor Kementerian Agama Kabupaten Tojo Una-Una Tahun 2027. Umat Rukun dan Sinergi, Indonesia Damai dan Maju.',
  audioUrl: '',
};

export const WelcomeVoicePlayer: React.FC<WelcomeVoicePlayerProps> = ({
  config,
  isAdminUnlocked = false,
  menuTapTrigger = 0,
  onOpenAdminSettings,
  onLockAdmin,
}) => {
  const voiceConfig = config || DEFAULT_VOICE_CONFIG;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const hasAutoPlayedRef = useRef<boolean>(false);
  const isAttemptingPlayRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Keep reference to utterance so Android Chrome GC does not collect it mid-speech
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Preload voices on Android & desktop browsers
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      try {
        const list = window.speechSynthesis.getVoices();
        if (list && list.length > 0) {
          voicesRef.current = list;
        }
      } catch {
        // Ignore
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', loadVoices);
    };
  }, []);

  const stopPlayback = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch {
      // Ignore audio stop errors
    }
    utteranceRef.current = null;
    isAttemptingPlayRef.current = false;
    setIsPlaying(false);
  }, []);

  const speakText = useCallback(
    (text: string, markAutoPlayedOnStart = true) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const cleanText = text.trim();
      if (!cleanText) return;

      try {
        // On Android Chrome, calling cancel() unconditionally right before speak()
        // can abort the newly queued utterance. Only cancel if actively speaking.
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utteranceRef.current = utterance;
        utterance.lang = 'id-ID';
        utterance.rate = 0.98;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const availableVoices =
          voicesRef.current.length > 0
            ? voicesRef.current
            : window.speechSynthesis.getVoices();

        const indoVoice = availableVoices.find(
          (v) =>
            v.lang.toLowerCase().includes('id-id') ||
            v.lang.toLowerCase().includes('id_') ||
            v.lang.toLowerCase() === 'id' ||
            v.name.toLowerCase().includes('indonesia')
        );
        if (indoVoice) {
          utterance.voice = indoVoice;
        }

        utterance.onstart = () => {
          if (markAutoPlayedOnStart) {
            hasAutoPlayedRef.current = true;
          }
          isAttemptingPlayRef.current = false;
          setIsPlaying(true);
        };
        utterance.onend = () => {
          utteranceRef.current = null;
          isAttemptingPlayRef.current = false;
          setIsPlaying(false);
        };
        utterance.onerror = () => {
          utteranceRef.current = null;
          isAttemptingPlayRef.current = false;
          setIsPlaying(false);
        };

        window.speechSynthesis.speak(utterance);
        // Android Chrome sometimes pauses speechSynthesis engine until resume() is called
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {
        isAttemptingPlayRef.current = false;
        setIsPlaying(false);
      }
    },
    []
  );

  const startPlayback = useCallback(
    (isManualButton = false) => {
      if (!voiceConfig.enabled) return;

      if (isManualButton) {
        stopPlayback();
        hasAutoPlayedRef.current = true;
      } else if (isAttemptingPlayRef.current || isPlaying) {
        return;
      }

      isAttemptingPlayRef.current = true;

      if (voiceConfig.mode === 'audio_url' && voiceConfig.audioUrl.trim()) {
        const streamUrl = normalizeAudioUrl(voiceConfig.audioUrl);
        if (streamUrl) {
          try {
            if (audioRef.current) {
              audioRef.current.pause();
            }
            const audio = new Audio(streamUrl);
            audio.preload = 'auto';
            audioRef.current = audio;
            audio.onplay = () => {
              hasAutoPlayedRef.current = true;
              isAttemptingPlayRef.current = false;
              setIsPlaying(true);
            };
            audio.onended = () => {
              isAttemptingPlayRef.current = false;
              setIsPlaying(false);
            };
            audio.onerror = () => {
              isAttemptingPlayRef.current = false;
              setIsPlaying(false);
              // Fallback to welcomeText if audio URL cannot be loaded
              if (voiceConfig.welcomeText.trim()) {
                speakText(voiceConfig.welcomeText, true);
              }
            };
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  hasAutoPlayedRef.current = true;
                  isAttemptingPlayRef.current = false;
                  setIsPlaying(true);
                })
                .catch(() => {
                  // If blocked on this gesture, allow next tap/click to retry
                  isAttemptingPlayRef.current = false;
                  setIsPlaying(false);
                });
            }
            return;
          } catch {
            isAttemptingPlayRef.current = false;
            setIsPlaying(false);
          }
        }
      }

      if (voiceConfig.welcomeText.trim()) {
        speakText(voiceConfig.welcomeText, true);
      } else {
        isAttemptingPlayRef.current = false;
      }
    },
    [voiceConfig, isPlaying, stopPlayback, speakText]
  );

  // Trigger welcome voice on Android/Desktop user activation gestures (click, touchend, pointerup, keydown)
  // Note: We intentionally DO NOT listen to 'touchstart' because Android Chrome does not grant
  // user activation on 'touchstart' (only on 'touchend' / 'pointerup' / 'click').
  useEffect(() => {
    if (!voiceConfig.enabled) {
      stopPlayback();
      return;
    }

    const hasContent =
      (voiceConfig.mode === 'audio_url' && Boolean(voiceConfig.audioUrl.trim())) ||
      Boolean(voiceConfig.welcomeText.trim());
    if (!hasContent) return;

    const handleUserActivationGesture = () => {
      if (hasAutoPlayedRef.current) return;
      startPlayback(false);
    };

    // Capture phase (true) ensures we catch taps on any menu/button even if stopPropagation() is called
    window.addEventListener('click', handleUserActivationGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener('touchend', handleUserActivationGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener('pointerup', handleUserActivationGesture, {
      capture: true,
      passive: true,
    });
    window.addEventListener('keydown', handleUserActivationGesture, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener('click', handleUserActivationGesture, {
        capture: true,
      });
      window.removeEventListener('touchend', handleUserActivationGesture, {
        capture: true,
      });
      window.removeEventListener('pointerup', handleUserActivationGesture, {
        capture: true,
      });
      window.removeEventListener('keydown', handleUserActivationGesture, {
        capture: true,
      });
    };
  }, [voiceConfig, startPlayback, stopPlayback]);

  // Also trigger if parent explicitly notifies a menu tap and voice hasn't played yet
  useEffect(() => {
    if (menuTapTrigger > 0 && voiceConfig.enabled && !hasAutoPlayedRef.current) {
      startPlayback(false);
    }
  }, [menuTapTrigger, voiceConfig.enabled, startPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

  // Tombol Suara Sambutan HANYA tampil saat Admin telah memasukkan PIN / masuk di Mode Admin
  if (!isAdminUnlocked) return null;

  if (!voiceConfig.enabled) return null;

  const hasContent =
    (voiceConfig.mode === 'audio_url' && Boolean(voiceConfig.audioUrl.trim())) ||
    Boolean(voiceConfig.welcomeText.trim());

  if (!hasContent) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 bg-[#021b15]/95 border border-amber-400/60 rounded-xl p-1.5 shadow-xl">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (isPlaying) {
            stopPlayback();
          } else {
            startPlayback(true);
          }
        }}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
          isPlaying
            ? 'bg-amber-400 text-slate-950'
            : 'bg-[#03251c] hover:bg-emerald-900 text-amber-200'
        }`}
        title={isPlaying ? 'Hentikan Suara Sambutan' : 'Putar Suara Sambutan Resmi HAB ke-81'}
      >
        {isPlaying ? (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span>Hentikan Suara</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            <span>Suara Sambutan</span>
          </>
        )}
      </button>

      {onOpenAdminSettings && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenAdminSettings();
          }}
          className="p-1.5 rounded-lg bg-[#03251c] hover:bg-emerald-900 text-slate-300 hover:text-amber-300 cursor-pointer"
          title="Atur Suara Sambutan di Panel Admin"
          aria-label="Atur Suara Sambutan di Panel Admin"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      )}

      {onLockAdmin && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLockAdmin();
          }}
          className="p-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-300 hover:text-white cursor-pointer"
          title="Kunci Kembali Mode Admin (Sembunyikan Tombol Suara)"
          aria-label="Kunci Kembali Mode Admin"
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
