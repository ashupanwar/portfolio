import { useCamera } from '../store/useCamera';

/**
 * Returns to the establishing shot from any close-up.
 *
 * A real DOM button rather than something in the scene: it is chrome, not part
 * of the room, and this way it stays crisp, keyboard-reachable and screen-reader
 * visible for free. Rendered always and faded rather than mounted on demand, so
 * it animates out as well as in.
 */
export function BackButton() {
  const shot = useCamera((state) => state.shot);
  const goTo = useCamera((state) => state.goTo);

  const visible = shot !== 'establishing';

  return (
    <button
      type="button"
      onClick={() => goTo('establishing')}
      // Hidden from tab order and pointers when faded out, so an invisible
      // button can never swallow a click or trap focus.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={`absolute left-5 top-5 z-10 inline-flex items-center gap-2 rounded-lg border border-white/15
        bg-black/55 px-3.5 py-2 text-sm font-medium tracking-wide text-white/85 backdrop-blur-md
        transition duration-500 ease-out hover:border-white/25 hover:bg-black/70 hover:text-white
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60
        ${visible ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-2 opacity-0'}`}
    >
      <span aria-hidden="true">←</span>
      Back
    </button>
  );
}
