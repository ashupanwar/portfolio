import { create } from 'zustand';

export type Tier = 'high' | 'medium' | 'low';

/** Per-tier render budget. Read by <Canvas>, the lights and the post stack. */
export const TIER_SETTINGS = {
  high: { dpr: [1, 2], shadowMapSize: 2048, shadows: true, post: true },
  medium: { dpr: [1, 1.25], shadowMapSize: 1024, shadows: true, post: true },
  low: { dpr: [1, 1], shadowMapSize: 512, shadows: false, post: false },
} as const satisfies Record<Tier, unknown>;

/**
 * Everyone starts at `high` -- there is no reliable signal left to downgrade
 * on. This used to branch on `navigator.deviceMemory` and
 * `hardwareConcurrency`, but those are exactly the APIs Safari nerfs for
 * fingerprinting resistance: `deviceMemory` doesn't exist on iOS at all, and
 * `hardwareConcurrency` is capped well below the chip's real core count. The
 * result was every iPhone reading as weak hardware and getting knocked down
 * to `medium` or `low` regardless of how capable it actually was -- a phone
 * quietly rendering at a lower dpr, with shadows and post both off, while a
 * laptop on the same page got the full budget. There is also no settings UI
 * to opt back up, so a wrong read here was permanent for that visit.
 *
 * This is one small room, not an open world -- `high`'s budget (dpr up to 2,
 * shadows, post) is not a stretch for the phones this site is actually
 * viewed on. `setTier` and the `locked` flag stay in place for a future
 * manual quality toggle, but nothing calls them yet.
 */
function detectTier(): Tier {
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
