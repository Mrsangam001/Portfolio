(() => {
  const config = window.PortfolioThemeConfig;
  const storageKey = 'sangam.portfolio.appearance.v1';
  const customTheme = 'wallpaper';
  const root = document.documentElement;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const defaultTheme = Object.hasOwn(config.themes, config.defaultTheme) ? config.defaultTheme : 'dark-ghost';
  const color = (value) => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : null;
  const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, Math.round(value))) : fallback;
  const rgb = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  const linear = (value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
  const luminance = (hex) => rgb(hex).reduce((total, channel, index) => total + linear(channel / 255) * [.2126, .7152, .0722][index], 0);
  const contrast = (a, b) => {
    const x = luminance(a);
    const y = luminance(b);
    return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
  };
  const mix = (start, end, ratio) => '#' + rgb(start).map((channel, index) => {
    const target = parseInt(end.slice(1 + 2 * index, 3 + 2 * index), 16);
    return Math.round(channel + (target - channel) * ratio).toString(16).padStart(2, '0');
  }).join('');

  function normalize(input = {}) {
    input = input && typeof input === 'object' ? input : {};
    const wallpaper = input.wallpaper ?? {};
    const overrides = input.overrides ?? {};
    const colors = wallpaper.colors;
    const validColors = colors && color(colors.dominant) && color(colors.accent) && color(colors.secondary);
    const id = typeof wallpaper.id === 'string' && /^[\w-]{1,96}$/.test(wallpaper.id) ? wallpaper.id : null;
    const source = wallpaper.source === 'upload' && id && validColors ? 'upload' : wallpaper.source === 'none' ? 'none' : 'default';
    const w = config.wallpaper;

    return {
      theme: input.theme === customTheme || Object.hasOwn(config.themes, input.theme) ? input.theme : defaultTheme,
      glass: number(input.glass, 48, 0, 100),
      motion: number(input.motion, 65, 0, 100),
      animationSound: input.animationSound === true,
      overrides: { accent: color(overrides.accent), text: color(overrides.text), surface: color(overrides.surface) },
      wallpaper: {
        source,
        id: source === 'upload' ? id : null,
        name: source === 'upload' && typeof wallpaper.name === 'string' ? wallpaper.name.slice(0, 120) : '',
        colors: source === 'upload' ? {
          mode: colors.mode === 'light' ? 'light' : 'dark',
          dominant: color(colors.dominant), accent: color(colors.accent), secondary: color(colors.secondary),
        } : null,
        fit: ['cover', 'contain', 'fill'].includes(wallpaper.fit) ? wallpaper.fit : w.fit,
        x: number(wallpaper.x, w.x, 0, 100),
        y: number(wallpaper.y, w.y, 0, 100),
        scale: number(wallpaper.scale, w.scale, 75, 180),
        blur: number(wallpaper.blur, w.blur, 0, 20),
        brightness: number(wallpaper.brightness, w.brightness, 40, 145),
        darkness: number(wallpaper.darkness, w.darkness, 0, 85),
        opacity: number(wallpaper.opacity, w.opacity, 0, 100),
        parallax: typeof wallpaper.parallax === 'boolean' ? wallpaper.parallax : w.parallax,
      },
    };
  }

  function read() {
    try {
      return normalize(JSON.parse(localStorage.getItem(storageKey)));
    } catch {
      return normalize();
    }
  }

  function save(settings, reset = false) {
    if (reset) localStorage.removeItem(storageKey);
    else localStorage.setItem(storageKey, JSON.stringify(normalize(settings)));
  }

  function safeForeground(preferred, surfaces, target, light) {
    if (surfaces.every((surface) => contrast(preferred, surface) >= target)) return preferred;
    const extreme = light ? '#07080d' : '#ffffff';
    for (let step = 1; step < 32; step += 1) {
      const next = mix(preferred, extreme, step / 32);
      if (surfaces.every((surface) => contrast(next, surface) >= target)) return next;
    }
    return extreme;
  }

  function safeSurface(preferred, light) {
    const extreme = light ? '#ffffff' : '#000000';
    for (let step = 0; step < 24; step += 1) {
      const next = mix(preferred, extreme, step / 24);
      if (light ? luminance(next) >= .79 : luminance(next) <= .058) return next;
    }
    return extreme;
  }

  function palette(settings) {
    const seed = settings.theme === customTheme ? settings.wallpaper.colors : null;
    const fallback = seed ? (seed.mode === 'light' ? 'minimal' : 'dark-ghost') : defaultTheme;
    const preset = config.themes[settings.theme] ?? config.themes[fallback];
    const light = (seed?.mode ?? preset.mode) === 'light';
    const mode = light ? 'light' : 'dark';
    const colors = { ...preset.colors };
    const surfaces = ['base', 'surface', 'raised', 'feature', 'hero', 'spot'];
    for (const key of surfaces) {
      if (seed) colors[key] = mix(colors[key], seed.dominant, light ? .12 : .18);
      if (settings.overrides.surface) colors[key] = mix(colors[key], settings.overrides.surface, key === 'surface' ? .78 : .42);
      colors[key] = safeSurface(colors[key], light);
    }
    let alpha = .97 - settings.glass * .0023;
    const backgroundExtreme = light ? '#000000' : '#ffffff';
    // Include the worst possible wallpaper pixel and a small tint allowance.
    const sampleBackgrounds = () => surfaces.flatMap((key) => [
      colors[key], mix(colors[key], backgroundExtreme, 1 - alpha * .94),
    ]);
    const readableExtreme = light ? '#07080d' : '#ffffff';
    let backgrounds = sampleBackgrounds();
    while (alpha < 1 && backgrounds.some((background) => contrast(readableExtreme, background) < 4.65)) {
      alpha = Math.min(1, alpha + .0125);
      backgrounds = sampleBackgrounds();
    }
    colors.text = safeForeground(settings.overrides.text ?? colors.text, backgrounds, 4.55, light);
    colors.muted = safeForeground(colors.muted, backgrounds, 4.55, light);
    colors.accent = safeForeground(settings.overrides.accent ?? seed?.accent ?? colors.accent, backgrounds, 4.55, light);
    colors.secondary = safeForeground(seed?.secondary ?? colors.secondary, backgrounds, 4.55, light);
    colors.edge = safeForeground(mix(colors.surface, colors.text, .42), backgrounds, 3.05, light);
    colors.on = contrast(colors.accent, '#ffffff') >= contrast(colors.accent, '#000000') ? '#ffffff' : '#000000';
    colors.form = light ? colors.feature : mix('#ffffff', colors.accent, .19);
    colors.formInk = safeForeground(light ? colors.text : colors.base, [colors.form], 4.55, true);
    colors.formMuted = safeForeground(mix(colors.formInk, colors.form, .29), [colors.form], 4.55, true);
    colors.formEdge = safeForeground(mix(colors.formInk, colors.form, .46), [colors.form], 3.05, true);
    return { colors, backgrounds, mode, alpha, effect: settings.theme === customTheme ? 'still' : preset.effect };
  }

  let currentPalette;
  let paletteKey;
  function apply(settings) {
    const signature = JSON.stringify([settings.theme, settings.glass, settings.overrides, settings.wallpaper.colors]);
    if (signature !== paletteKey) {
      paletteKey = signature;
      currentPalette = palette(settings);
      const { colors, mode, alpha, effect } = currentPalette;
      root.dataset.theme = settings.theme;
      root.dataset.themeEffect = effect;
      root.style.colorScheme = mode;
      for (const [key, value] of Object.entries(colors)) root.style.setProperty(`--tone-${key}`, value);
      root.style.setProperty('--glass-opacity', `${alpha * 100}%`);
      root.style.setProperty('--glass-blur', `${Math.round(settings.glass / 7)}px`);
      themeMeta.content = colors.base;
    }
    if (root.dataset.motionLevel !== String(settings.motion)) {
      root.dataset.motionLevel = String(settings.motion);
      root.style.setProperty('--theme-motion', String(settings.motion / 100));
      window.dispatchEvent(new Event('portfolio-motion-change'));
    }
    if (root.hasAttribute('data-animation-sound') !== settings.animationSound) {
      root.toggleAttribute('data-animation-sound', settings.animationSound);
      window.dispatchEvent(new Event('portfolio-sound-change'));
    }
    return currentPalette;
  }

  function defaultWallpaper(settings) {
    return config.themes[settings.theme]?.wallpaper ?? config.defaultWallpaper;
  }

  const initial = read();
  apply(initial);
  const firstWallpaper = initial.wallpaper.source !== 'none' && (initial.theme !== customTheme || initial.wallpaper.source !== 'upload')
    ? defaultWallpaper(initial) : '';
  if (firstWallpaper) {
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.href = firstWallpaper;
    document.head.append(preload);
  }

  window.PortfolioTheme = { customTheme, storageKey, initial, normalize, read, save, palette, apply, defaultWallpaper, luminance, contrast };
})();
