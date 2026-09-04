import { create } from 'zustand';

export type Tier = 'high' | 'medium' | 'low';

/** Per-tier render budget. Read by <Canvas>, the lights and the post stack. */
export const TIER_SETTINGS = {
  high: { dpr: [1, 2], shadowMapSize: 2048, shadows: true, post: true },
  medium: { dpr: [1, 1.25], shadowMapSize: 1024, shadows: true, post: true },
  low: { dpr: [1, 1], shadowMapSize: 512, shadows: false, post: false },
} as const satisfies Record<Tier, unknown>;

/**
 * Best-effort guess at what this device can hold 60fps on. Deliberately
 * conservative: self-detection is never right for everyone, which is why the
 * user can always override it.
 *
 * Judged purely on capability (memory, cores), not on input type. A phone
 * and a laptop with the same specs get the same tier -- there used to be a
 * blanket downgrade to `medium` for any coarse (touch) pointer, on the
 * assumption that touch means mobile means weaker hardware, but that
 * conflated "phone" with "underpowered": plenty of phones can hold the same
 * dpr/shadows/post budget a laptop does, and the flat downgrade capped their
 * render resolution well below their own screen's real pixel density,
 * reading as blurry rather than merely conservative.
 */
function detectTier(): Tier {
  if (typeof navigator === 'undefined') return 'medium';

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (memory <= 4 || cores <= 4) return 'low';
  return 'high';
}

interface QualityState {
  tier: Tier;
  /** True once the user picks a tier by hand -- stops the FPS probe overriding them. */
  locked: boolean;
  setTier: (tier: Tier, byUser?: boolean) => void;
}

export const useQuality = create<QualityState>((set) => ({
  tier: detectTier(),
  locked: false,
  setTier: (tier, byUser = false) =>
    set((state) => (state.locked && !byUser ? state : { tier, locked: state.locked || byUser })),
}));

export const useTierSettings = () => TIER_SETTINGS[useQuality((s) => s.tier)];
