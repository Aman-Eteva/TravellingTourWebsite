import { useEffect, type RefObject } from "react";
import { useLocation } from "react-router-dom";

export function useScrollReveal(root: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  useEffect(() => {
    const container = root.current;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!container || preference.matches || !("IntersectionObserver" in window))
      return;
    const seen = new WeakSet<Element>();
    const running = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (preference.matches) continue;
          const siblings = Array.from(
            entry.target.parentElement?.children || [],
          );
          const index = siblings.indexOf(entry.target);
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: "translateY(22px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 620,
              delay: Math.min(index, 3) * 55,
              easing: "cubic-bezier(.2,.75,.25,1)",
              fill: "backwards",
            },
          );
          running.add(animation);
          animation.finished
            .then(() => running.delete(animation))
            .catch(() => running.delete(animation));
        }
      },
      { threshold: 0.08 },
    );
    const collect = () =>
      container
        .querySelectorAll(
          ".section-heading,.tour-card,.destination-card,.quote-card,.mood-card,.story-banner,.stat,.page-heading,.values-grid .panel",
        )
        .forEach((element) => {
          if (!seen.has(element)) {
            seen.add(element);
            observer.observe(element);
          }
        });
    const mutation = new MutationObserver(collect);
    mutation.observe(container, { childList: true, subtree: true });
    collect();
    const change = () => {
      if (preference.matches) {
        observer.disconnect();
        for (const animation of running) animation.cancel();
      }
    };
    preference.addEventListener("change", change);
    return () => {
      observer.disconnect();
      mutation.disconnect();
      preference.removeEventListener("change", change);
      for (const animation of running) animation.cancel();
    };
  }, [pathname, root]);
}
