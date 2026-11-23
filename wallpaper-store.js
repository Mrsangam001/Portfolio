(() => {
  const databaseName = 'sangam-portfolio-wallpaper';
  let opening;

  function open() {
    if (!opening) {
      opening = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          reject(new Error('This browser has disabled media storage.'));
          return;
        }
        const request = indexedDB.open(databaseName, 2);
        request.onupgradeneeded = () => {
          const db = request.result;
          for (const name of ['wallpapers', 'music']) {
            if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
          }
        };
        request.onerror = () => reject(request.error);
        request.onblocked = () => reject(new Error('Another tab is blocking media storage.'));
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => { db.close(); opening = null; };
          resolve(db);
        };
      }).catch((error) => { opening = null; throw error; });
    }
    return opening;
  }

  async function transaction(storeName, mode, operation) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const request = operation(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () => reject(tx.error ?? request.error ?? new Error('Media storage was interrupted.'));
      tx.onerror = () => reject(tx.error ?? request.error ?? new Error('Could not access media storage.'));
    });
  }

  const bucket = (name) => ({
    get: (id) => transaction(name, 'readonly', (store) => store.get(id)),
    put: (id, value) => transaction(name, 'readwrite', (store) => store.put(value, id)),
    remove: (id) => transaction(name, 'readwrite', (store) => store.delete(id)),
  });

  window.PortfolioWallpaperStore = bucket('wallpapers');
  window.PortfolioMusicStore = bucket('music');
})();
