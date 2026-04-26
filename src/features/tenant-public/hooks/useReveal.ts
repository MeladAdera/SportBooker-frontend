import { useEffect, useRef } from 'react';

/**
 * Reveals an element on first viewport entry by toggling `data-revealed="true"`.
 * Pair with the `.landing-reveal` class in `src/index.css` to fade + slide in.
 *
 * Respects `prefers-reduced-motion` because the underlying CSS transition is
 * already disabled by the global reduced-motion block in `src/index.css`.
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      node.dataset.revealed = 'true';
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}
