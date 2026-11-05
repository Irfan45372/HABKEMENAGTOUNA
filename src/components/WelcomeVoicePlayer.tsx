import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WelcomeVoiceConfig } from '../types/hab';
import { normalizeAudioUrl } from '../utils/habLogic';
import { Settings, Volume2, VolumeX } from 'lucide-react';

interface WelcomeVoicePlayerProps {
  config?: WelcomeVoiceConfig;
  onOpenAdminSettings?: () => void;
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
  onOpenAdminSettings,
}) => {
  const voiceConfig = config || DEFAULT_VOICE_CONFIG;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const hasAutoPlayedRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    setIsPlaying(false);
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const cleanText = text.trim();
    if (!cleanText) return;

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'id-ID';
      utterance.rate = 0.98;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const indoVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes('id-id') ||
          v.lang.toLowerCase().includes('id_') ||
          v.name.toLowerCase().includes('indonesia')
      );
      if (indoVoice) {
        utterance.voice = indoVoice;
      }

      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      setIsPlaying(false);
    }
  }, []);

  const startPlayback = useCallback(() => {
    if (!voiceConfig.enabled) return;

    stopPlayback();

    if (voiceConfig.mode === 'audio_url' && voiceConfig.audioUrl.trim()) {
      const streamUrl = normalizeAudioUrl(voiceConfig.audioUrl);
      if (streamUrl) {
        try {
          const audio = new Audio(streamUrl);
          audioRef.current = audio;
          audio.onplay = () => setIsPlaying(true);
          audio.onended = () => setIsPlaying(false);
          audio.onerror = () => {
            setIsPlaying(false);
            // Fallback to welcomeText if audio URL cannot be loaded
            if (voiceConfig.welcomeText.trim()) {
              speakText(voiceConfig.welcomeText);
            }
          };
          audio.play().catch(() => {
            setIsPlaying(false);
          });
          return;
        } catch {
          setIsPlaying(false);
        }
      }
    }

    if (voiceConfig.welcomeText.trim()) {
      speakText(voiceConfig.welcomeText);
    }
  }, [voiceConfig, stopPlayback, speakText]);

  // Trigger welcome voice once on first visitor interaction
  useEffect(() => {
    if (!voiceConfig.enabled) {
      stopPlayback();
      return;
    }

    const hasContent =
      (voiceConfig.mode === 'audio_url' && Boolean(voiceConfig.audioUrl.trim())) ||
      Boolean(voiceConfig.welcomeText.trim());
    if (!hasContent || hasAutoPlayedRef.current) return;

    const handleFirstInteraction = () => {
      if (hasAutoPlayedRef.current) return;
      hasAutoPlayedRef.current = true;
      startPlayback();
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });

    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [voiceConfig, startPlayback, stopPlayback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, [stopPlayback]);

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
          hasAutoPlayedRef.current = true;
          if (isPlaying) {
            stopPlayback();
          } else {
            startPlayback();
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
    </div>
  );
};
