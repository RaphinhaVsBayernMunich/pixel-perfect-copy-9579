/** Procedurally generated, original ambient sound packs. No copyrighted samples. */
export function startAmbient(pack: "rain" | "forest" | "space", volume = 0.12) {
  const context = new AudioContext();
  const output = context.createGain();
  output.gain.value = Math.min(0.2, Math.max(0, volume));
  output.connect(context.destination);
  const sources: AudioScheduledSourceNode[] = [];
  if (pack === "rain" || pack === "forest") {
    const buffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const samples = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < samples.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.02) / 1.02;
      samples[i] = pack === "rain" ? Math.random() * 2 - 1 : brown * 3;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = pack === "rain" ? 1600 : 700;
    source.connect(filter);
    filter.connect(output);
    source.start();
    sources.push(source);
  }
  if (pack === "forest" || pack === "space")
    for (const frequency of pack === "forest" ? [880, 1320] : [110, 164.81, 220]) {
      const oscillator = context.createOscillator();
      oscillator.frequency.value = frequency;
      const gain = context.createGain();
      gain.gain.value = pack === "forest" ? 0.03 : 0.12;
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.start();
      sources.push(oscillator);
    }
  void context.resume();
  return () => {
    sources.forEach((s) => s.stop());
    void context.close();
  };
}
