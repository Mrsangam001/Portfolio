// Theme colors are six-digit hex values. A wallpaper is a path relative to index.html.
window.PortfolioThemeConfig = {
  defaultTheme: 'dark-ghost',
  defaultWallpaper: '',
  maxUploadBytes: 12 * 1024 * 1024,
  wallpaper: {
    fit: 'cover', x: 50, y: 50, scale: 100, blur: 0,
    brightness: 100, darkness: 22, opacity: 100, parallax: false,
  },
  themes: {
    'dark-ghost': {
      name: 'Dark Ghost', description: 'Charcoal glass, violet smoke, and cool blue.',
      mode: 'dark', effect: 'fog',
      colors: {
        base: '#090a10', surface: '#12141c', raised: '#1d202d', feature: '#27243c',
        hero: '#202435', spot: '#080a11', text: '#f4f2fc', muted: '#c3c4db',
        accent: '#cbb7ff', secondary: '#a2c8ff',
      },
    },
    midnight: {
      name: 'Midnight Black', description: 'Pure black and quiet grayscale.',
      mode: 'dark', effect: 'still',
      colors: {
        base: '#000000', surface: '#0d0d0d', raised: '#181818', feature: '#242424',
        hero: '#171717', spot: '#000000', text: '#f8f8f8', muted: '#c4c4c4',
        accent: '#eeeeee', secondary: '#c8c8c8',
      },
    },
    cyberpunk: {
      name: 'Cyberpunk Neon', description: 'Electric pink, violet, and blue.',
      mode: 'dark', effect: 'neon',
      colors: {
        base: '#0b0712', surface: '#170e24', raised: '#251434', feature: '#301447',
        hero: '#241139', spot: '#10071c', text: '#fff1fc', muted: '#ead0f4',
        accent: '#ffabea', secondary: '#92c9ff',
      },
    },
    minimal: {
      name: 'Minimal Light', description: 'Soft white surfaces with indigo details.',
      mode: 'light', effect: 'still',
      colors: {
        base: '#f5f5f1', surface: '#ffffff', raised: '#f1f1f8', feature: '#eaeaf7',
        hero: '#f4f3fb', spot: '#e8e9fa', text: '#18172a', muted: '#43425c',
        accent: '#45328a', secondary: '#23547a',
      },
    },
    aurora: {
      name: 'Aurora', description: 'Deep navy with drifting teal and violet light.',
      mode: 'dark', effect: 'aurora',
      colors: {
        base: '#071120', surface: '#101d2e', raised: '#1c2941', feature: '#1c3447',
        hero: '#14293c', spot: '#081421', text: '#ecfbff', muted: '#bfd2ea',
        accent: '#99f3e5', secondary: '#ceb8ff',
      },
    },
  },
};
