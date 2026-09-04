import { useEffect, useRef, useState } from 'react';
import { useProgress } from '@react-three/drei';

/**
 * How far the wave's crest travels, in the SVG's own coordinate space, as
 * the on-screen fill goes from 0 to 100 -- from the letters' own baseline
 * (y=112) up to just inside their cap-height (y=22). The letters themselves
 * span roughly y=26 to y=112 at the sizing below.
 *
 * Deliberately confined to that span rather than starting below the letters
 * entirely: the wave's ripple (see the `d` attributes below) only reads as
 * motion where it overlaps the clipped letter shapes, and it has amplitude
 * to spare either side of its crest line. Travelling the *whole* distance
 * between the letters' own top and bottom means the rippling band is inside
 * the clip -- visibly moving -- at every progress value, not just while the
 * crest happens to be passing through on its way from somewhere off-screen.
 */
const WAVE_Y_AT_0 = 112;
const WAVE_Y_AT_100 = 22;

/**
 * The fill's climb rate while still loading, in percent per second, as a
 * function of how far it's already climbed -- not a single constant. An
 * asymptotic ease toward a fixed cap (the previous approach here) has a
 * velocity that decays toward zero the closer it gets, and on any load
 * slower than that decay's own time constant, it reads as reaching the cap
 * and *stopping* dead rather than merely slowing down -- exactly the
 * "loads a little, then freezes" the wave shouldn't do. Every bracket here
 * has a floor well above zero instead, so however long the real load takes,
 * the fill is still visibly, if slowly, advancing the entire time -- it
 * only reads as "nearly done and barely moving," never as stopped.
 */
function trickleVelocity(current: number): number {
  if (current < 20) return 25;
  if (current < 50) return 12;
  if (current < 80) return 5;
  if (current < 92) return 1.6;
  return 0.4;
}
/** Ultimate ceiling for the trickle -- never reached in practice (at the
 *  0.4%/s floor above it's a slow crawl, not a stop, for many seconds
 *  before it would matter), but a hard stop rather than an unbounded climb
 *  guards against ever reading as "done" before loading actually is. */
const TRICKLE_CAP = 97;
/** Fixed time the final climb to 100 takes once loading's actually done,
 *  in seconds -- a proper start-to-end tween rather than another asymptotic
 *  approach, so it always completes in a bounded time no matter how far
 *  short of 100 the trickle phase left off. */
const FINISH_DURATION = 0.6;

/**
 * The site's initial loader: "ASHU" filled by a rising, animated water wave,
 * visible only inside the letterforms via an SVG clip path. Reads
 * `useProgress` from drei, which tracks THREE's shared default loading
 * manager -- the same one every `useGLTF`/`useTexture` call in the scene
 * registers with -- so this works without any manual wiring to the model
 * loads themselves, wherever in the tree they happen.
 */
export function Loader() {
  const { progress, active } = useProgress();
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  // `progress` itself is choppy, not continuous -- drei reports it as
  // loaded/total over whatever's registered with the loading manager so
  // far, which jumps in a handful of big steps as each model file finishes
  // rather than climbing smoothly, and a handful of large glTFs means a
  // handful of big jumps. Chasing that value directly (even eased) means
  // sitting still between jumps and then visibly accelerating at each one,
  // which reads as choppy rather than smooth. `displayProgress` ignores
  // that jumpiness: while still loading it climbs on its own timeline, at
  // `trickleVelocity`'s always-nonzero rate, independent of exactly when
  // each asset happens to finish, so it's always visibly climbing no matter
  // how long that takes -- then, once loading genuinely finishes, it tweens
  // the rest of the way to 100 over a fixed duration.
  const [displayProgress, setDisplayProgress] = useState(0);
  const doneRef = useRef(false);
  doneRef.current = !active && progress >= 100;
  const displayRef = useRef(0);
  // Set once, the first tick after loading finishes -- where the finish
  // tween starts from and when. Without capturing a fixed start point, a
  // finish tween re-targeted at 100 every frame from the *current* value
  // would jump the instant it began (the trickle phase's own target,
  // TRICKLE_CAP, is up to 8 points short of it) instead of climbing
  // smoothly from wherever the trickle actually left off.
  const finishRef = useRef<{ value: number; time: number } | null>(null);

  useEffect(() => {
    let raf = requestAnimationFrame(tick);
    let last = performance.now();

    function tick(now: number) {
      const dt = (now - last) / 1000;
      last = now;

      const current = displayRef.current;
      let next: number;

      if (doneRef.current) {
        finishRef.current ??= { value: current, time: now };
        const t = Math.min(1, (now - finishRef.current.time) / 1000 / FINISH_DURATION);
        // Smoothstep, not ease-out: ease-out cubic has its *fastest* instant
        // right at t=0, so the first frame of the tween was itself a visible
        // jump whenever the trickle phase left a wide gap to close. Zero
        // velocity at both ends here means the tween instead ramps up
        // gently and eases back down, with no abrupt step anywhere in it.
        const eased = t * t * (3 - 2 * t);
        next = finishRef.current.value + (100 - finishRef.current.value) * eased;
      } else {
        // A step proportional to elapsed time (frame-rate independent),
        // at whatever rate the current fill level's own bracket allows --
        // see `trickleVelocity`'s own comment for why this, not an
        // asymptotic ease, is what keeps it always visibly moving.
        next = Math.min(TRICKLE_CAP, current + trickleVelocity(current) * dt);
      }

      displayRef.current = next;
      setDisplayProgress(next);
      raf = requestAnimationFrame(tick);
    }

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    // Gated on the *displayed* fill catching up too, not just the real
    // load finishing -- otherwise a fast load can finish and start fading
    // out while the wave is still visibly mid-rise, cutting the animation
    // off before it ever reads as complete.
    if (active || progress < 100 || displayProgress < 99.5) return;
    // A short pause at 100% so the fill reads as "done" rather than just
    // stopping, then fade the whole overlay out before unmounting it.
    const pause = setTimeout(() => setFading(true), 300);
    const unmount = setTimeout(() => setVisible(false), 300 + 500);
    return () => {
      clearTimeout(pause);
      clearTimeout(unmount);
    };
  }, [active, progress, displayProgress]);

  if (!visible) return null;

  // Both wave paths are drawn with their crest at local y=20 (see the `d`
  // attributes below); translating their shared group by this offset moves
  // that crest to the interpolated target y for the current progress. The
  // clip path is what turns "a rectangle rising" into "the letters filling
  // up".
  const crestY = WAVE_Y_AT_0 + ((WAVE_Y_AT_100 - WAVE_Y_AT_0) * displayProgress) / 100;
  const waveOffset = crestY - 20;

  return (
    <div
      role="status"
      aria-label={`Loading, ${Math.round(progress)}%`}
      className={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-[#08070a]
        transition-opacity duration-500 ease-out ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <svg viewBox="0 0 400 150" className="w-[min(78vw,480px)]" aria-hidden="true">
        <defs>
          <clipPath id="ashu-letters">
            <text
              x="200"
              y="112"
              textAnchor="middle"
              fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
              fontWeight="900"
              fontSize="120"
              letterSpacing="2"
            >
              ASHU
            </text>
          </clipPath>
        </defs>

        {/* Faint always-visible outline, so the name reads even at 0% --
            without it there's nothing on screen until the wave arrives. */}
        <text
          x="200"
          y="112"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
          fontWeight="900"
          fontSize="120"
          letterSpacing="2"
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1.5"
        >
          ASHU
        </text>

        <g clipPath="url(#ashu-letters)">
          {/* No CSS transition here -- displayProgress is already eased
              every frame in JS above, so a second, independent transition
              on top of it would fight that instead of smoothing it. */}
          <g style={{ transform: `translateY(${waveOffset}px)` }}>
            {/* Each path repeats every 160 units. Wave A scrolls -160 to 0,
                wave B scrolls 0 to +160 -- opposite directions, so the local
                x range the 400-wide viewBox needs covered over one cycle
                isn't the same for both: wave A needs [0, 560], wave B needs
                [-160, 400]. Drawing both from -200 to 640 covers either
                requirement with margin to spare, so neither path's own start
                or end edge -- where it simply stops, leaving nothing drawn
                past it -- ever scrolls into the letters. (A tighter, direction-
                specific span previously left wave B's own start edge exposed
                inside the "A" as its cycle closed.) */}
            <g className="loader-wave-scroll-a">
              <path
                d="M-200,20 Q-160,-6 -120,20 T-40,20 T40,20 T120,20 T200,20 T280,20 T360,20 T440,20 T520,20 T600,20 T680,20 V150 H-200 Z"
                fill="#3b82f6"
              />
            </g>
            <g className="loader-wave-scroll-b" opacity="0.65">
              <path
                d="M-200,26 Q-160,4 -120,26 T-40,26 T40,26 T120,26 T200,26 T280,26 T360,26 T440,26 T520,26 T600,26 T680,26 V150 H-200 Z"
                fill="#60a5fa"
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
