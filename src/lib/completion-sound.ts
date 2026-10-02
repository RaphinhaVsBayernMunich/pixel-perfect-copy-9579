/** Original generated chime; no downloaded/licensed game audio. */
export function completionSound(pack: string) {
  if (pack === "silent") return () => {};
  let context: AudioContext | undefined;
  try {
    context = new AudioContext();
    const c = context;
    const notes = pack === "minimal" ? [660] : [440, 554.37, 659.25];
    notes.forEach((frequency, i) => {
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + i * 0.12;
      o.frequency.value = frequency;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t);
      o.stop(t + 0.3);
    });
  } catch {
    /* Audio may be unavailable or blocked by user preference. */
  }
  return () => {
    void context?.close().catch(() => {});
  };
}
