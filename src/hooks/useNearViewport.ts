import { useEffect, useRef, useState } from 'react';

export function useNearViewport<TElement extends Element>() {
  const ref = useRef<TElement | null>(null);
  const [isNearViewport, setIsNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    const element = ref.current;

    if (!element || isNearViewport || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '360px 0px' },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [isNearViewport]);

  return { isNearViewport, ref };
}
