(() => {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const enabled = () => root.hasAttribute('data-animation-sound') &&
    root.dataset.motionLevel !== '0' && !reducedMotion.matches && !document.hidden;

  // Frequency, end frequency, delay, duration, and peak gain for each voice.
  const cues = {
    sweep: [[178, 96, 0, .27, .065], [352, 198, .035, .2, .018]],
    project: [[392, 392, 0, .19, .036], [587, 587, .055, .24, .026]],
    close: [[349, 349, 0, .19, .028], [262, 262, .055, .28, .044]],
  };

  let context;
  let output;
  let lastCue = -Infinity;

  function syncOutput() {
    if (output) output.gain.setTargetAtTime(enabled() ? 1 : 0, context.currentTime, .015);
  }

  function play(cue, preview = false) {
    const voices = cues[cue];
    if (!voices || !enabled() || context?.state !== 'running' ||
      (!preview && document.querySelector('dialog[open]'))) return;
    const start = context.currentTime;
    if (!preview && start - lastCue < .4) return;
    lastCue = start;

    for (const [pitch, endPitch, delay, duration, level] of voices) {
      const at = start + delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.setValueAtTime(pitch, at);
      oscillator.frequency.exponentialRampToValueAtTime(endPitch, at + duration);
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(level, at + .035);
      gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      oscillator.connect(gain);
      gain.connect(output);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + duration + .015);
    }
  }

  async function unlock(preview = false) {
    if (!Audio || !enabled()) return;
    try {
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.connect(context.destination);
      }
      if (context.state !== 'running') await context.resume();
      if (preview) play('project', true);
    } catch {
      // A browser can decline or interrupt audio. A later gesture can retry.
    }
  }

  function onGesture(event) {
    if (event.isTrusted && context?.state !== 'running') unlock();
  }

  window.addEventListener('click', onGesture);
  window.addEventListener('keydown', onGesture);
  window.addEventListener('portfolio-sound-change', syncOutput);
  window.addEventListener('portfolio-motion-change', syncOutput);
  reducedMotion.addEventListener('change', syncOutput);
  document.addEventListener('visibilitychange', syncOutput);
  window.PortfolioSound = { supported: Boolean(Audio), play, unlock };
})();
