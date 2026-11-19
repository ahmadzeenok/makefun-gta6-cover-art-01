// Fixed scenes for screenshots: ?shot=editor shows the studio with sample
// photos loaded; ?shot=cover shows the exported cover alone, full-viewport.
// The query pins every choice, so a screenshot is reproducible:
//
//   ?shot=cover&layout=hero&grade=sunset&size=1920x1080
//   &photos=boulevard,pier,friends-neon,man-rooftop
//   &title=NEON%20VICE&subtitle=after%20dark%20in%20the%20city
//
// window.__shotReady is set once the cover is painted and the webfonts are
// ready, so a screenshot script can wait on it.

/** The export sizes the studio offers, as [width, height]. */
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

/** Resolves a size name from the query to one of the three export sizes. */
function sizeFromQuery(name) {
  const n = (name || '').toLowerCase();
  if (n === 'portrait' || n === '1080x1350') return SIZES.portrait;
  if (n === 'wide' || n === '1920x1080') return SIZES.wide;
  return SIZES.square;
}

/** Parses a shot query into a plain scene config. */
export function shotConfig(query) {
  const shot = query.get('shot') || 'editor';
  const photos = (query.get('photos') || query.get('photo') || 'pier')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    shot,
    cover: shot === 'cover',
    layout: query.get('layout') || 'hero',
    grade: query.get('grade') || 'sunset',
    size: sizeFromQuery(query.get('size')),
    photos,
    title: query.get('title') ?? query.get('caption') ?? 'NEON VICE',
    subtitle: query.get('subtitle') ?? 'after dark in the city',
  };
}

/** Signals the shot is done, after two paints and after the fonts are ready. */
export function markShotReady() {
  const done = () => { window.__shotReady = true; };
  const twoFrames = () => requestAnimationFrame(() => requestAnimationFrame(done));
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(twoFrames);
  } else {
    twoFrames();
  }
}
