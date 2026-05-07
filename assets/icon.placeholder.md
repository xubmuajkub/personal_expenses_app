# Icon Assets — User Action Required

The following asset files must be created by the user (or a designer / AI image generator) before running `eas build` or `expo prebuild`.

## Required files

| File | Size | Notes |
|------|------|-------|
| `assets/icon.png` | 1024×1024 px | App icon for iOS. Solid background, no rounded corners (the OS clips to shape). |
| `assets/splash.png` | 1284×2778 px (or 2×/3× source) | Centered logo on `#FAF4F4` background. `resizeMode: contain`. |
| `assets/adaptive-icon.png` | 1024×1024 px | Android adaptive icon foreground layer. Keep branding within the 432×432 safe zone so it isn't clipped by the Android icon mask. |

## Configuration

`app.config.ts` already references these paths:

```ts
icon: './assets/icon.png',
splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#FAF4F4' },
android: {
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#FAF4F4',
  },
},
```

Drop the PNG files in `assets/` and the config will pick them up automatically on the next build.

## Quick placeholder (dev only)

If you need a placeholder now, generate a simple icon with ImageMagick:

```bash
magick -size 1024x1024 xc:"#3A37A8" \
  -fill white -pointsize 200 -gravity center -annotate 0 "PE" \
  assets/icon.png
cp assets/icon.png assets/adaptive-icon.png
magick -size 1284x2778 xc:"#FAF4F4" \
  -fill "#3A37A8" -pointsize 120 -gravity center -annotate 0 "Personal Expenses" \
  assets/splash.png
```
