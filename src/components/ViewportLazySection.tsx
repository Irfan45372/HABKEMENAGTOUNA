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
 * (or when explicitly forced via navigation / deep-link).
 * When the user scrolls far away from the section, it can unmount heavy DOM/WebGL trees
 * while preserving the measured height so scroll position never jumps.
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
  const [isNearViewport, setIsNearViewport] = useState<boolean>(forceMount);
  const [measuredHeight, setMeasuredHeight] = useState<number>(fallbackMinHeight);

  useEffect(() => {
    if (forceMount) {
      setIsNearViewport(true);
    }
  }, [forceMount]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    let unmountTimer: number | undefined;

    // Observer with generous preload margin (450px above and below screen)
    const observer = new IntersectionObserver(
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

    observer.observe(el);

    return () => {
      if (unmountTimer) window.clearTimeout(unmountTimer);
      observer.disconnect();
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
        children
      ) : (
        <div
          aria-hidden="true"
          className="w-full h-full min-h-[inherit] flex items-center justify-center py-16 px-4 border-t border-emerald-900/40"
        >
          <div className="px-4 py-2 rounded-xl bg-[#03251c]/60 border border-emerald-800/50 text-xs text-emerald-300/80 font-medium">
            Memuat bagian {label} saat dilihat...
          </div>
        </div>
      )}
    </div>
  );
};
