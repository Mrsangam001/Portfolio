# Sangam Kumar · Software Engineering Portfolio

A responsive, single page portfolio with animated project panels, five selectable color themes, custom wallpaper support, an in browser music player, and contact links.

## View the portfolio

**Local preview:** [http://127.0.0.1:4173/](http://127.0.0.1:4173/)

The preview is available while the local web server is running. To serve the site yourself, use any static web server with the `dist/` directory as its document root. Browser storage and uploads work best over HTTP or HTTPS.

For example, run this from the project folder if Python is installed:

```sh
python -m http.server 4173 --directory dist
```

Then open `http://127.0.0.1:4173/`.

## Portfolio sections

- **About** — Introduction, portrait, education, and professional profiles.
- **Projects** — AI Meeting Minutes and Restaurant Order Management.
- **Skills** — Programming, web development, databases, and tools.
- **Experience and education** — Internship, academic qualifications, and campus activities.
- **Contact** — Email, phone, professional profiles, and a message that opens as a draft in your email app.

The closing panel echoes the animated opening. The mobile menu, social links, email shortcut, Q&A, and appearance controls work on small screens.

## Themes and wallpapers

Open **Appearance** with the half circle icon in the bottom dock. Choose a preset, preview a wallpaper, adjust colors or motion, and select **Apply theme** to save your choices.

The five built in themes are Dark Ghost, Midnight Black, Cyberpunk Neon, Minimal Light, and Aurora. Uploaded JPG, PNG, and WebP wallpapers are analyzed in your browser and saved to its local database. Set wallpaper position, fit, brightness, blur, overlay, opacity, and parallax. Visitors' wallpaper uploads stay private to their browser.

## Music and animation sounds

Open **Appearance → Music player** to play the included original ambient instrumental or choose an audio file from your device. Music is paused by default. To save your chosen track in this browser across visits, choose an audio file up to 20 MB. Select **Use default track** to remove your selection. Clearing the browser's site data removes local saved audio.

To enable the softly synthesized scroll cues, open **Appearance → Colors and motion**, check **Animation sounds**, and select **Apply theme**. Cues respect reduced motion and the animation intensity setting.

To ship your own default track with the website, copy an audio file you may distribute into `dist/assets/`. Update the audio `src` and track name in [dist/index.html](dist/index.html), then deploy `dist/` with the audio file.

## Run locally

The portfolio is a static website built with HTML, CSS, and JavaScript. It has no framework, package installation, or build step.

1. Clone this repository.
2. Start a static web server from the project folder and use `dist/` as its document root.
3. Open the address shown by your web server.

Deploy the contents of `dist/` to a static hosting provider. Keep the HTML, stylesheets, scripts, fonts, and images in their original paths. On Vercel, set the project root to this repository and set **Output Directory** to `dist`. The profile image must be present in the repository at `dist/assets/sangam-portrait.png`. The site uses this root path to load it consistently at the deployed domain. To confirm a deployment includes it, open `https://your-domain/assets/sangam-portrait.png` directly and check that the image loads.

## Customize the site

The main files are:

| File | Purpose |
| --- | --- |
| [dist/index.html](dist/index.html) | Portfolio content, links, theme panel, and music player |
| [dist/styles.css](dist/styles.css) | Layout, type, breakpoints, and page animations |
| [dist/site.js](dist/site.js) | Navigation, scroll scenes, Q&A, and contact interactions |
| [dist/theme-config.js](dist/theme-config.js) | Default theme, wallpaper, color presets, and image limit |
| [dist/theme-bootstrap.js](dist/theme-bootstrap.js) | Saved settings, theme tokens, and contrast adjustments |
| [dist/theme-settings.js](dist/theme-settings.js) | Theme preview, wallpaper controls, and preference saving |
| [dist/animation-sound.js](dist/animation-sound.js) | Optional animated scroll sounds |
| [dist/music-player.js](dist/music-player.js) | Music playback, upload, and browser storage |
| [dist/assets/](dist/assets/) | Site images, fonts, and the included music track |

To add a theme, add a theme entry to the `themes` object in [dist/theme-config.js](dist/theme-config.js). Give it a unique key, label, description, color palette, dark or light mode, and supported visual effect. The theme selector reads theme entries from this configuration.

To make a permanent wallpaper the default, add the image to `dist/assets/wallpapers/` and update `defaultWallpaper` in `dist/theme-config.js` to its path relative to `dist/index.html`. Change `defaultTheme` in the same file to choose the starting theme.

The display typeface uses Impact when available and includes [Anton](https://github.com/google/fonts/tree/main/ofl/anton) as a fallback. Its SIL Open Font License is included at [dist/assets/Anton-OFL.txt](dist/assets/Anton-OFL.txt).

The provided portrait is a transparent cutout based on the portfolio owner's supplied photograph.

## Accessibility and privacy

- The mobile layout supports touch navigation and respects the device's reduced motion preference.
- Audio only plays after the visitor presses the native music player controls.
- Animation sounds and music selection can be disabled or reset independently.
- Visitor wallpapers and music stay in the visitor's browser. They are never uploaded to the website.
- Contact messages open in the visitor's email application for review.

## License

No project wide software license has been assigned. The bundled Anton typeface has its own license in `dist/assets/Anton-OFL.txt`. Make sure you have permission to redistribute any music or other assets you add before publishing the site.

