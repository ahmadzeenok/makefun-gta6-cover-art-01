// Fixed scenes for screenshots: ?shot=editor shows the studio with sample photos
// loaded; ?shot=cover shows the exported cover alone, full-viewport.
// The query can fix every choice, so a screenshot is reproducible:
//   ?shot=cover&layout=hero&grade=sunset&size=1920x1080
//   &photos=boulevard,pier,friends-neon,man-rooftop
//   &title=NEON%20VICE&subtitle=after%20dark%20in%20the%20city
// window.__shotReady is set once the cover is painted and the fonts are ready.

/** The export sizes the studio offers, as [width, height]. */
export const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

/** Parses a shot query into a plain scene config. */
export function shotConfig(query) {
  const shot = query.get('shot') || 'editor';
  const sizeName = (query.get('size') || '').toLowerCase();
  let size = SIZES.square;
  if (sizeName === 'portrait' || sizeName === '1080x1350') size = SIZES.portrait;
  else if (sizeName === 'wide' || sizeName === '1920x1080') size = SIZES.wide;
  else if (sizeName === '1080x1080') size = SIZES.square;
  const photos = (query.get('photos') || query.get('photo') || 'pier')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    shot,
    cover: shot === 'cover',
    layout: query.get('layout') || 'hero',
    grade: query.get('grade') || 'sunset',
    size,
    photos,
    title: query.get('title') ?? query.get('caption') ?? 'NEON VICE',
    subtitle: query.get('subtitle') ?? 'after dark in the city',
  };
}

/** Marks the shot done after two paints and after the webfonts are ready. */
export function markShotReady() {
  const done = () => { window.__shotReady = true; };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      requestAnimationFrame(() => requestAnimationFrame(done));
    });
  } else {
    requestAnimationFrame(() => requestAnimationFrame(done));
  }
}
