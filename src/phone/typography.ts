/**
 * Inter, self-hosted as .woff (troika parses ttf/otf/woff but NOT woff2).
 *
 * iOS uses SF Pro Display, which Apple's licence does not allow us to
 * redistribute, so this is the closest freely-licensable stand-in -- Inter was
 * drawn as a neutral UI grotesque in the same tradition and matches SF closely
 * at the clock's size, particularly the flat-sided digits and tight apertures.
 *
 * Lives apart from screens.tsx so app screens can share it without importing
 * from the module that renders them.
 */
export const FONT = '/fonts/inter-latin-400-normal.woff';
export const FONT_SEMIBOLD = '/fonts/inter-latin-600-normal.woff';

export const WHITE = '#ffffff';
/** iOS Notes' yellow, used for its nav accents. */
export const NOTES_YELLOW = '#e0a92a';
