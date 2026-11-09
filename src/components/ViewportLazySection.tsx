import React, { useEffect, useRef, useState } from 'react';

interface ViewportLazySectionProps {
  sectionId: string;
  label: string;
  fallbackMinHeight?: number;
  forceMount?: boolean;
  unmountWhenFarOffscreen?: boolean;
  children: React.ReactNode;
}

/**
 * Renders its children only when the section is near or inside the user's viewport
 * (or when explicitly forced via navigation / deep-link), and applies a smooth,
 * hardware-accelerated fade-in + subtle upward transition as it enters the user's view.
 */
export const ViewportLazySection: React.FC<ViewportLazySectionProps> = ({
  sectionId,
  label,
  fallbackMinHeight = 420,
  forceMount = false,
  unmountWhenFarOffscreen = true,
  children,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState<boolean>(
    forceMount || sectionId === 'beranda'
  );
  const [isVisibleInViewport, setIsVisibleInViewport] = useState<boolean>(
    forceMount || sectionId === 'beranda'
  );
  const [measuredHeight, setMeasuredHeight] = useState<number>(fallbackMinHeight);

  useEffect(() => {
    if (forceMount) {
      setIsNearViewport(true);
      const raf = window.requestAnimationFrame(() => {
        setIsVisibleInViewport(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [forceMount]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      setIsVisibleInViewport(true);
      return;
    }

    let unmountTimer: number | undefined;

    // 1. Preload & Lifecycle Observer (450px margin above/below screen)
    const mountObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;

        if (entry.isIntersecting) {
          if (unmountTimer) {
            window.clearTimeout(unmountTimer);
            unmountTimer = undefined;
          }
          setIsNearViewport(true);
        } else if (unmountWhenFarOffscreen && !forceMount) {
          // Do not unmount if the user currently has an input/form focused inside this section
          const activeEl = document.activeElement;
          if (activeEl && el.contains(activeEl)) {
            return;
          }

          // Record current height before unmounting so page height stays stable
          const rect = el.getBoundingClientRect();
          if (rect.height > 120) {
            setMeasuredHeight(Math.round(rect.height));
          }

          setIsVisibleInViewport(false);

          // Small debounce before closing off-screen section to avoid flicker during fast scroll
          unmountTimer = window.setTimeout(() => {
            const currentActive = document.activeElement;
            if (currentActive && el.contains(currentActive)) return;
            setIsNearViewport(false);
          }, 350);
        }
      },
      {
        root: null,
        rootMargin: '450px 0px 450px 0px',
        threshold: 0.01,
      }
    );

    // 2. Visual Fade-In Reveal Observer (triggers when section enters the visible viewport)
    const revealObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          setIsVisibleInViewport(true);
        } else if (!forceMount) {
          // Reset fade state only when completely outside the visible viewport
          const rect = entry.boundingClientRect;
          const vh = window.innerHeight || document.documentElement.clientHeight;
          if (rect.bottom < -60 || rect.top > vh + 60) {
            setIsVisibleInViewport(false);
          }
        }
      },
      {
        root: null,
        rootMargin: '-35px 0px -35px 0px',
        threshold: 0.04,
      }
    );

    mountObserver.observe(el);
    revealObserver.observe(el);

    return () => {
      if (unmountTimer) window.clearTimeout(unmountTimer);
      mountObserver.disconnect();
      revealObserver.disconnect();
    };
  }, [forceMount, unmountWhenFarOffscreen]);

  const shouldRender = forceMount || isNearViewport;

  return (
    <div
      ref={wrapperRef}
      id={shouldRender ? undefined : sectionId}
      style={shouldRender ? undefined : { minHeight: `${measuredHeight}px` }}
      className="w-full"
    >
      {shouldRender ? (
        <div
          className={`viewport-section-reveal ${
            isVisibleInViewport ? 'viewport-section-visible' : ''
          }`}
        >
          {children}
        </div>
      ) : (
        <div
          aria-hidden="true"
          className="w-full h-full min-h-[inherit] flex items-center justify-center py-16 px-4 border-t border-emerald-900/40"
        >
          <div className="px-4 py-2 rounded-xl bg-[#03251c]/60 border border-emerald-800/50 text-xs text-emerald-300/80 font-medium animate-pulse">
            Memuat bagian {label} saat dilihat...
          </div>
        </div>
      )}
    </div>
  );
};
