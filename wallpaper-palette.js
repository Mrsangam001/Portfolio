(() => {
  const imageLimit = 40_000_000;
  const optimizedEdge = 2400;
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const hex = (channels) => '#' + channels.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('');
  const difference = (a, b) => Math.hypot(...a.map((channel, index) => channel - b[index]));

  async function validate(file) {
    if (!file?.size) throw new Error('Choose a JPG, PNG, or WebP image.');
    if (file.size > window.PortfolioThemeConfig.maxUploadBytes) throw new Error('Choose an image smaller than 12 MB.');
    const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const ascii = (start, end) => String.fromCharCode(...bytes.slice(start, end));
    let signature;
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) signature = 'image/jpeg';
    if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) signature = 'image/png';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') signature = 'image/webp';
    if (!supportedTypes.includes(signature) || (file.type && file.type !== signature)) {
      throw new Error('Choose a valid JPG, PNG, or WebP image.');
    }
  }

  async function decode(file) {
    if ('createImageBitmap' in window) {
      try {
        const bitmap = await createImageBitmap(file);
        return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
      } catch {
        // Some browser decoders support oriented photos through Image instead.
      }
    }
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { source: image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error('This image could not be opened. Try another file.');
    }
  }

  function sample(source, width, height) {
    const canvas = document.createElement('canvas');
    const scale = 48 / Math.max(width, height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const bins = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 105) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const key = ((r >> 5) * 64) + ((g >> 5) * 8) + (b >> 5);
      const bin = bins.get(key) ?? { channels: [0, 0, 0], count: 0 };
      bin.channels[0] += r;
      bin.channels[1] += g;
      bin.channels[2] += b;
      bin.count += 1;
      bins.set(key, bin);
    }
    const colors = [...bins.values()].map(({ channels, count }) => {
      const average = channels.map((channel) => channel / count);
      const saturation = Math.max(...average) - Math.min(...average);
      return { rgb: average, value: hex(average), count, score: count ** .55 * (28 + saturation) };
    }).sort((a, b) => b.count - a.count);
    if (!colors.length) throw new Error('The image is fully transparent. Pick a wallpaper with visible colors.');
    const total = colors.reduce((sum, item) => sum + item.count, 0);
    const brightness = colors.reduce((sum, item) => sum + window.PortfolioTheme.luminance(item.value) * item.count, 0) / total;
    const ranked = [...colors].sort((a, b) => b.score - a.score);
    const accent = ranked[0];
    const secondary = ranked.find((item) => difference(item.rgb, accent.rgb) > 50) ?? colors[0];
    return { mode: brightness > .43 ? 'light' : 'dark', dominant: colors[0].value, accent: accent.value, secondary: secondary.value };
  }

  async function prepare(file) {
    await validate(file);
    const image = await decode(file);
    try {
      if (!image.width || !image.height || image.width * image.height > imageLimit) {
        throw new Error('Choose an image with 40 megapixels or fewer.');
      }
      const colors = sample(image.source, image.width, image.height);
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, optimizedEdge / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image.source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .88));
      if (!blob) throw new Error('Could not prepare this wallpaper. Try a different image.');
      return { blob, colors };
    } finally {
      image.release();
    }
  }

  window.PortfolioWallpaperPalette = { prepare };
})();
