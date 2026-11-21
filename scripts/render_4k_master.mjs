import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const baseImagePath = '/tmp/master_4k_base.png';
const baseImageBase64 = fs.readFileSync(baseImagePath).toString('base64');
const baseImageDataUrl = `data:image/png;base64,${baseImageBase64}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 3200px;
    height: 4000px;
    overflow: hidden;
    position: relative;
    background: #ffffff;
    font-family: 'Poppins', sans-serif;
  }
  .base-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 3200px;
    height: 4000px;
    display: block;
    z-index: 1;
  }
  .top-left-block {
    position: absolute;
    top: 842px;
    left: 92px;
    max-width: 1060px;
    color: #0f172a;
    font-size: 59px;
    font-weight: 700;
    line-height: 1.25;
    z-index: 10;
    letter-spacing: -0.4px;
    white-space: nowrap;
  }
  .bottom-paragraph {
    position: absolute;
    top: 3296px;
    left: 300px;
    width: 2600px;
    text-align: center;
    font-size: 56px;
    font-weight: 400;
    line-height: 1.95;
    color: #111827;
    z-index: 10;
    letter-spacing: 0.2px;
  }
</style>
</head>
<body>
  <img src="${baseImageDataUrl}" class="base-image" alt="Base">

  <!-- Top-left Block - 3 Lines, Bold, Perfectly Size-Matched -->
  <div class="top-left-block">
    Chief Technology Officer (CTO),<br>
    Coimbatore Startup<br>
    Community
  </div>

  <!-- Bottom Paragraph with Exact Text, Tone and Layout -->
  <p class="bottom-paragraph">
    As Chief Technology Officer (CTO), Vikash leads technical development<br>
    and digital initiatives for the community. His responsibilities include<br>
    supporting the community website and digital platforms, as well as<br>
    providing technical assistance for various community activities and<br>
    operational needs.
  </p>
</body>
</html>`;

fs.writeFileSync('/tmp/render_4k_master.html', html);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 3200, height: 4000 },
  deviceScaleFactor: 1
});

await page.goto('file:///tmp/render_4k_master.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const outDir = '/Users/vikash/Projects/csc-circle/public/posters';
// Master single image output
const outPath4k = path.join(outDir, 'vikash-saravanan-cto-matched-bold-29px-4k.png');
await page.screenshot({ path: outPath4k, type: 'png' });
console.log(`Saved single 4K Ultra-HD Master image: ${outPath4k}`);

await browser.close();
