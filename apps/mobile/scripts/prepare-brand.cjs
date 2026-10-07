// Native packaging only: contain the supplied PNG on launcher canvases.
// The original transparent MedCore artwork is never redrawn or overwritten.
const { generateImageAsync, generateImageBackgroundAsync, compositeImagesAsync } = require('@expo/image-utils');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const projectRoot = resolve(__dirname, '..');
(async () => {
  const { source: foreground } = await generateImageAsync({ projectRoot, cacheType: 'medcore-brand' }, {
    src: resolve(projectRoot, 'assets/brand/MedCore_Badge_Logo.png'), width: 640, height: 640,
    resizeMode: 'contain', backgroundColor: 'transparent'
  });
  for (const [filename, backgroundColor] of [['app-icon.png', '#F5F8F7'], ['adaptive-icon.png', 'transparent']]) {
    const background = await generateImageBackgroundAsync({ width: 1024, height: 1024, backgroundColor });
    const canvas = await compositeImagesAsync({ foreground, background, x: 192, y: 192 });
    const destination = resolve(projectRoot, 'assets/brand', filename);
    writeFileSync(destination, canvas);
    if (filename === 'app-icon.png') {
      const { source: opaque } = await generateImageAsync({ projectRoot, cacheType: 'medcore-brand-opaque' }, {
        src: destination, width: 1024, height: 1024, resizeMode: 'contain', backgroundColor, removeTransparency: true
      });
      writeFileSync(destination, opaque);
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
