(() => {
  const store = window.PortfolioMusicStore;
  const player = document.querySelector('#portfolio-music');
  const title = document.querySelector('#music-track-name');
  const picker = document.querySelector('#music-file');
  const reset = document.querySelector('#music-reset');
  const status = document.querySelector('#music-status');
  const panel = document.querySelector('#music-panel');
  const savedKey = 'selected-track';
  const defaultUrl = player.src;
  const defaultTitle = title.textContent;
  const limit = 20 * 1024 * 1024;
  let activeUrl = '';
  let defaultBlobUrl = '';
  let preparingDefault = false;

  // Native audio controls own playback and seeking. Loading a track leaves it paused.
  player.volume = .35;

  function setTrack(track) {
    const previousUrl = activeUrl;
    activeUrl = track ? URL.createObjectURL(track.file) : '';
    player.pause();
    player.src = activeUrl || defaultBlobUrl || defaultUrl;
    title.textContent = track ? track.name : defaultTitle;
    reset.hidden = !track;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }

  async function prepareDefaultTrack() {
    if (activeUrl || defaultBlobUrl || preparingDefault || !defaultUrl) return;
    preparingDefault = true;
    try {
      const response = await fetch(defaultUrl);
      if (!response.ok) return;
      // A complete local blob stays seekable on file servers without byte ranges.
      defaultBlobUrl = URL.createObjectURL(await response.blob());
      if (!activeUrl && player.paused && player.currentTime === 0) player.src = defaultBlobUrl;
    } catch {
      // The native player can still try its original source.
    } finally {
      preparingDefault = false;
    }
  }

  function verifyAudio(file) {
    const probe = document.createElement('audio');
    const url = URL.createObjectURL(file);
    return new Promise((resolve) => {
      const timeout = setTimeout(() => finish(false), 6500);
      function finish(valid) {
        clearTimeout(timeout);
        probe.onloadedmetadata = null;
        probe.onerror = null;
        probe.removeAttribute('src');
        probe.load();
        URL.revokeObjectURL(url);
        resolve(valid);
      }
      probe.onloadedmetadata = () => finish(Number.isFinite(probe.duration) && probe.duration > 0);
      probe.onerror = () => finish(false);
      probe.preload = 'metadata';
      probe.src = url;
    });
  }

  function setBusy(busy) {
    picker.disabled = busy;
    reset.disabled = busy;
  }

  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    picker.value = '';
    if (!file) return;
    if (!file.size || file.size > limit) {
      status.textContent = 'Choose an audio file between 1 byte and 20 MB.';
      return;
    }
    setBusy(true);
    status.textContent = 'Checking audio…';
    try {
      if (!await verifyAudio(file)) {
        status.textContent = 'This audio file could not be played. Try MP3, WAV, or another format your browser supports.';
        return;
      }
      const track = { file, name: file.name };
      await store.put(savedKey, track);
      setTrack(track);
      status.textContent = 'Track saved in this browser. Press Play to listen.';
    } catch {
      status.textContent = 'This browser could not save the track.';
    } finally {
      setBusy(false);
    }
  });

  reset.addEventListener('click', async () => {
    setBusy(true);
    try {
      await store.remove(savedKey);
      setTrack(null);
      prepareDefaultTrack();
      status.textContent = 'Default track restored.';
    } catch {
      status.textContent = 'This browser could not remove your saved track.';
    } finally {
      setBusy(false);
    }
  });

  player.addEventListener('error', () => {
    status.textContent = 'This track could not be played. Choose another audio file.';
  });
  panel.addEventListener('toggle', () => {
    if (panel.open) prepareDefaultTrack();
  });

  setBusy(true);
  store.get(savedKey)
    .then((track) => {
      if (track?.file instanceof Blob && typeof track.name === 'string') setTrack(track);
    })
    .catch(() => {})
    .finally(() => setBusy(false));
})();
