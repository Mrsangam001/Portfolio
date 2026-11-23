(() => {
  const theme = window.PortfolioTheme;
  const config = window.PortfolioThemeConfig;
  const store = window.PortfolioWallpaperStore;
  const root = document.documentElement;
  const dialog = document.querySelector('#theme-settings');
  if (typeof dialog.showModal !== 'function') return;

  const form = dialog.querySelector('form');
  const body = dialog.querySelector('.theme-settings-body');
  const gallery = document.querySelector('#theme-gallery');
  const status = document.querySelector('#theme-status');
  const upload = document.querySelector('#wallpaper-upload');
  const uploadLabel = document.querySelector('#wallpaper-upload-label');
  const remove = document.querySelector('#wallpaper-remove');
  const restore = document.querySelector('#wallpaper-restore');
  const controls = document.querySelector('#wallpaper-controls');
  const preview = document.querySelector('#wallpaper-preview-image');
  const caption = document.querySelector('#wallpaper-caption');
  const modeLabel = document.querySelector('#palette-mode');
  const imageLayer = document.querySelector('#wallpaper-image');
  const applyButton = form.querySelector('.theme-apply');
  const closeButton = form.querySelector('[data-theme-close]');
  const opener = document.querySelector('[data-theme-open]');
  const animationSound = form.querySelector('[data-setting="animationSound"]');
  animationSound.disabled = !window.PortfolioSound.supported;
  const colorInputs = [...form.querySelectorAll('[data-color]')];
  const settingInputs = [...form.querySelectorAll('[data-wallpaper], [data-setting]')];
  const osMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let saved = theme.initial;
  let draft = saved;
  let pending;
  let saving = false;
  let preparing = false;
  let resetOnApply = false;
  let paintVersion = 0;
  let uploadVersion = 0;
  let renderedUrl = '';
  let previewUrl = '';
  let parallaxFrame = 0;
  const urls = new Map();
  const restoreJobs = new Map();
  const missingFiles = new Set();

  function message(text = '', error = false) {
    status.textContent = text;
    status.toggleAttribute('data-error', error);
    status.toggleAttribute('data-busy', saving || preparing);
  }

  function release(id) {
    if (urls.has(id)) URL.revokeObjectURL(urls.get(id));
    urls.delete(id);
  }

  function forgetCandidate() {
    if (pending) release(pending.id);
    pending = null;
  }

  function retrieve(id) {
    if (!restoreJobs.has(id)) {
      const job = store.get(id).then((blob) => {
        if (!blob) throw new Error('The saved wallpaper is unavailable.');
        if (saved.wallpaper.id !== id && draft.wallpaper.id !== id) return '';
        const url = URL.createObjectURL(blob);
        urls.set(id, url);
        return url;
      }).catch(() => {
        missingFiles.add(id);
        return '';
      }).finally(() => restoreJobs.delete(id));
      restoreJobs.set(id, job);
    }
    return restoreJobs.get(id);
  }

  function setPreview(url, text) {
    if (url !== previewUrl) {
      previewUrl = url;
      if (url) preview.src = url;
      else preview.removeAttribute('src');
    }
    preview.hidden = !url;
    caption.textContent = text;
  }

  function parallax() {
    parallaxFrame = 0;
    const { motion, wallpaper } = draft;
    const active = Boolean(renderedUrl && wallpaper.parallax && motion && !osMotion.matches);
    const scrollRange = Math.max(1, root.scrollHeight - window.innerHeight);
    const shift = active ? (Math.max(0, Math.min(1, scrollY / scrollRange)) - .5) * 52 * motion / 100 : 0;
    imageLayer.style.setProperty('--wallpaper-shift', `${shift}px`);
  }

  function scheduleParallax() {
    if (!parallaxFrame && renderedUrl && draft.wallpaper.parallax && draft.motion && !osMotion.matches) {
      parallaxFrame = requestAnimationFrame(parallax);
    }
  }

  function paintWallpaper(url, settings) {
    const w = settings.wallpaper;
    if (url !== renderedUrl) {
      renderedUrl = url;
      imageLayer.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : '';
      root.toggleAttribute('data-wallpaper', Boolean(url));
    }
    imageLayer.style.backgroundSize = w.fit === 'fill' ? '100% 100%' : w.fit;
    imageLayer.style.backgroundPosition = `${w.x}% ${w.y}%`;
    imageLayer.style.transformOrigin = `${w.x}% ${w.y}%`;
    const reserve = w.parallax && settings.motion && !osMotion.matches ? 28 : 0;
    imageLayer.style.setProperty('--wallpaper-overscan', `${w.blur * 1.8 + reserve}px`);
    imageLayer.style.setProperty('--wallpaper-scale', String(w.scale / 100));
    imageLayer.style.setProperty('--wallpaper-blur', `${w.blur}px`);
    imageLayer.style.setProperty('--wallpaper-brightness', String(w.brightness / 100));
    root.style.setProperty('--wallpaper-opacity', String(w.opacity / 100));
    root.style.setProperty('--wallpaper-dim', String(w.darkness / 100));
    if (parallaxFrame) cancelAnimationFrame(parallaxFrame);
    parallax();
  }

  function wallpaperView(settings) {
    const w = settings.wallpaper;
    const version = ++paintVersion;
    const defaultUrl = w.source === 'none' ? '' : theme.defaultWallpaper(settings);
    const usesUpload = settings.theme === theme.customTheme && w.source === 'upload';
    const loaded = w.id ? urls.get(w.id) : '';
    paintWallpaper(usesUpload ? loaded ?? '' : defaultUrl, settings);
    if (w.id && !loaded && !missingFiles.has(w.id)) {
      setPreview('', 'Restoring wallpaper…');
      retrieve(w.id).then((url) => {
        if (version !== paintVersion) return;
        paintWallpaper(usesUpload ? url : defaultUrl, settings);
        setPreview(url, url ? w.name : 'Saved wallpaper unavailable. Upload a replacement.');
      });
      return;
    }
    const source = w.id ? loaded ?? '' : defaultUrl;
    setPreview(source, source ? (w.id ? w.name : 'Site wallpaper') : w.id ? 'Saved wallpaper unavailable. Upload a replacement.' : 'No wallpaper selected');
  }

  function syncControls(palette) {
    for (const button of gallery.children) button.setAttribute('aria-pressed', String(button.dataset.themeChoice === draft.theme));
    for (const input of settingInputs) {
      const value = input.dataset.wallpaper ? draft.wallpaper[input.dataset.wallpaper] : draft[input.dataset.setting];
      if (input.type === 'checkbox') input.checked = value;
      else input.value = String(value);
      const output = input.parentElement.querySelector('output');
      if (output) output.textContent = `${value}${input.dataset.unit}`;
    }
    for (const input of colorInputs) input.value = draft.overrides[input.dataset.color] ?? palette.colors[input.dataset.color];
    const wallpaper = draft.wallpaper;
    const hasFile = wallpaper.source === 'upload';
    const siteWallpaper = Boolean(theme.defaultWallpaper(draft));
    remove.hidden = !hasFile && !(siteWallpaper && wallpaper.source !== 'none');
    restore.hidden = !siteWallpaper || wallpaper.source === 'default';
    controls.hidden = !hasFile && !(siteWallpaper && wallpaper.source !== 'none');
    uploadLabel.textContent = preparing ? 'Reading image…' : hasFile ? 'Replace wallpaper' : 'Upload wallpaper';
    upload.disabled = preparing || saving;
    applyButton.disabled = preparing || saving;
    modeLabel.hidden = !wallpaper.colors;
    if (wallpaper.colors) modeLabel.textContent = `${wallpaper.colors.mode} palette`;
    const custom = gallery.querySelector('[data-theme-choice="wallpaper"]');
    custom.style.setProperty('--preview-wash', wallpaper.colors?.dominant ?? config.themes['dark-ghost'].colors.secondary);
    custom.style.setProperty('--swatch-accent', wallpaper.colors?.accent ?? config.themes['dark-ghost'].colors.accent);
  }

  function update(next) {
    draft = theme.normalize(next);
    const palette = theme.apply(draft);
    syncControls(palette);
    wallpaperView(draft);
  }

  function edit(next, text = 'Previewing changes.') {
    resetOnApply = false;
    update(next);
    message(text);
  }

  for (const [id, preset] of [...Object.entries(config.themes), [theme.customTheme, {
    name: 'Custom Wallpaper',
    description: 'Use a palette made from your image.',
    colors: config.themes['dark-ghost'].colors,
  }]]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-card';
    button.dataset.themeChoice = id;
    button.style.setProperty('--swatch-base', preset.colors.base);
    button.style.setProperty('--swatch-raised', preset.colors.raised);
    button.style.setProperty('--swatch-accent', preset.colors.accent);
    button.style.setProperty('--preview-wash', preset.colors.secondary);
    const swatch = document.createElement('span');
    swatch.className = 'theme-swatch';
    swatch.setAttribute('aria-hidden', 'true');
    const label = document.createElement('strong');
    label.textContent = preset.name;
    const description = document.createElement('span');
    description.className = 'theme-card-description';
    description.textContent = preset.description;
    button.append(swatch, label, description);
    button.addEventListener('click', () => {
      if (id === draft.theme) return;
      edit({ ...draft, theme: id, overrides: {} }, id === theme.customTheme && draft.wallpaper.source !== 'upload' ? 'Upload a wallpaper to generate its palette.' : 'Previewing changes.');
    });
    gallery.append(button);
  }

  opener.addEventListener('click', () => {
    resetOnApply = false;
    update(saved);
    message();
    dialog.showModal();
  });
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('cancel', (event) => { if (saving) event.preventDefault(); });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    preparing = false;
    uploadVersion += 1;
    upload.value = '';
    forgetCandidate();
    update(saved);
  });

  opener.hidden = false;

  form.addEventListener('input', (event) => {
    const { target } = event;
    if (target.dataset.color) {
      edit({ ...draft, overrides: { ...draft.overrides, [target.dataset.color]: target.value } });
    } else if (target.dataset.wallpaper) {
      const value = target.type === 'checkbox' ? target.checked : target.type === 'range' ? target.valueAsNumber : target.value;
      edit({ ...draft, wallpaper: { ...draft.wallpaper, [target.dataset.wallpaper]: value } });
    } else if (target.dataset.setting) {
      const value = target.type === 'checkbox' ? target.checked : target.valueAsNumber;
      edit({ ...draft, [target.dataset.setting]: value });
      if (target === animationSound && value && event.isTrusted) window.PortfolioSound.unlock(true);
    }
  });

  upload.addEventListener('change', async () => {
    const file = upload.files[0];
    upload.value = '';
    if (!file) return;
    const version = ++uploadVersion;
    preparing = true;
    syncControls(theme.apply(draft));
    message('Preparing your image and palette…');
    try {
      const { colors, blob } = await window.PortfolioWallpaperPalette.prepare(file);
      if (version !== uploadVersion) return;
      forgetCandidate();
      const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      pending = { id, blob };
      urls.set(id, URL.createObjectURL(blob));
      resetOnApply = false;
      update({ ...draft, theme: theme.customTheme, overrides: {}, wallpaper: { 
        ...draft.wallpaper, source: 'upload', id, colors, name: file.name,
      } });
      message('Wallpaper ready. Apply to save this preview.');
    } catch (error) {
      if (version === uploadVersion) message(error.message || 'Could not prepare that image.', true);
    } finally {
      if (version === uploadVersion) {
        preparing = false;
        status.removeAttribute('data-busy');
        syncControls(theme.apply(draft));
      }
    }
  });

  function discardUpload(source, text) {
    uploadVersion += 1;
    preparing = false;
    forgetCandidate();
    edit({ ...draft, overrides: draft.theme === theme.customTheme ? {} : draft.overrides,
      wallpaper: { ...draft.wallpaper, source, id: null, name: '', colors: null },
    }, text);
  }

  remove.addEventListener('click', () => discardUpload('none', 'Wallpaper removed from the preview. Apply to save.'));
  restore.addEventListener('click', () => discardUpload('default', 'Previewing the site wallpaper.'));
  document.querySelector('#theme-reset-preset').addEventListener('click', () => {
    const defaults = theme.normalize();
    edit({ ...draft, glass: defaults.glass, motion: defaults.motion, overrides: {},
      wallpaper: { ...draft.wallpaper, ...config.wallpaper },
    }, 'Current theme defaults previewed. Apply to save.');
  });
  document.querySelector('#theme-reset-all').addEventListener('click', () => {
    uploadVersion += 1;
    preparing = false;
    forgetCandidate();
    resetOnApply = true;
    update(theme.normalize());
    message('Defaults previewed. Apply to clear your customizations.');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving || preparing) return;
    saving = true;
    body.inert = true;
    closeButton.disabled = true;
    applyButton.disabled = true;
    document.querySelector('#theme-reset-all').disabled = true;
    const next = draft;
    const candidate = pending;
    const oldId = theme.read().wallpaper.id;
    try {
      message('Saving appearance…');
      if (candidate) await store.put(candidate.id, candidate.blob);
      theme.save(next, resetOnApply);
      saved = next;
      pending = null;
      if (oldId && oldId !== saved.wallpaper.id) {
        release(oldId);
        store.remove(oldId).catch(() => {});
      }
      dialog.close();
    } catch {
      if (candidate) store.remove(candidate.id).catch(() => {});
      message('This browser could not save your changes. You can keep previewing or close to restore the saved appearance.', true);
    } finally {
      saving = false;
      status.removeAttribute('data-busy');
      body.inert = false;
      closeButton.disabled = false;
      applyButton.disabled = false;
      document.querySelector('#theme-reset-all').disabled = false;
    }
  });

  window.addEventListener('storage', (event) => {
    if ((event.key === theme.storageKey || event.key === null) && !dialog.open) {
      const previous = saved.wallpaper.id;
      saved = theme.read();
      if (previous && previous !== saved.wallpaper.id) release(previous);
      update(saved);
    }
  });
  window.addEventListener('scroll', scheduleParallax, { passive: true });
  window.addEventListener('resize', scheduleParallax);
  osMotion.addEventListener('change', () => wallpaperView(draft));
  update(saved);
})();
