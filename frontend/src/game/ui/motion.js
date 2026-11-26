/**
 * The canvas cannot read CSS, so the pupil's "reduce motion" setting reaches
 * the game through here. With it on, the buddy stands still instead of
 * hopping, walks are jumps to the end point, and celebrations appear without
 * moving. The React pages honour the same setting in App.css.
 */
const query = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

export const isMotionReduced = () => !!query?.matches;
