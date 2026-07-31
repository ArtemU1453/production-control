import { animations } from "@/core/theme/theme";

/**
 * AppAnimation — motion tokens. Re-exports the existing framer-motion presets
 * (single source) and adds canonical duration and easing tokens plus a spring
 * preset for micro-interactions. All motion honours the OS "Reduce Motion"
 * setting globally via `<MotionConfig reducedMotion="user">`.
 */
export const AppAnimation = {
  presets: animations,
  duration: {
    /** 120ms — taps, toggles. */
    fast: 0.12,
    /** 200ms — fades. */
    base: 0.2,
    /** 280ms — card entrance. */
    slow: 0.28,
    /** 350ms — screen transitions. */
    screen: 0.35,
  },
  easing: {
    standard: [0.22, 1, 0.36, 1] as const,
    easeOut: "easeOut" as const,
  },
  spring: {
    type: "spring" as const,
    stiffness: 320,
    damping: 30,
  },
  /**
   * Canonical framer-motion transition presets. Feature code uses only these
   * four (`fast`/`normal`/`slow`/`spring`) — never ad-hoc durations. All honour
   * Reduce Motion globally via `<MotionConfig reducedMotion="user">`.
   */
  transition: {
    fast: { duration: 0.12, ease: [0.22, 1, 0.36, 1] as const },
    normal: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
    slow: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
    spring: { type: "spring" as const, stiffness: 320, damping: 30 },
  },
  /** Interactive press feedback (scale) for tappable surfaces. */
  press: {
    whileTap: { scale: 0.98 },
  },
  /** Entrance for list items and cards (fade + slight rise). */
  itemEnter: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  },
} as const;

export type AppDuration = keyof typeof AppAnimation.duration;
export type AppTransition = keyof typeof AppAnimation.transition;
