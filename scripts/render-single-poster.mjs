import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const baseImagePath = '/private/tmp/clean_base_flawless.png';
const baseImageBase64 = fs.readFileSync(baseImagePath).toString('base64');
const baseImageDataUrl = `data:image/png;base64,${baseImageBase64}`;

const generatePoster = async (fontSize = 29.5, fontWeight = 700, topPos = 421) => {
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
    width: 1600px;
    height: 2000px;
    overflow: hidden;
    position: relative;
    background: #ffffff;
    font-family: 'Poppins', sans-serif;
  }
  .base-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 1600px;
    height: 2000px;
    display: block;
    z-index: 1;
  }
  .top-left-block {
    position: absolute;
    top: ${topPos}px;
    left: 46px;
    max-width: 530px;
    color: #0f172a;
    font-size: ${fontSize}px;
    font-weight: ${fontWeight};
    line-height: 1.25;
    z-index: 10;
    letter-spacing: -0.2px;
    white-space: nowrap;
  }
  .bottom-paragraph {
    position: absolute;
    top: 1646px;
    left: 170px;
    width: 1260px;
    text-align: center;
    font-size: 28px;
    font-weight: 400;
    line-height: 1.95;
    color: #111827;
    z-index: 10;
    letter-spacing: 0.1px;
  }
</style>
</head>
<body>
  <img src="${baseImageDataUrl}" class="base-image" alt="Base">

  <!-- Top-left Block - 3 Lines, Bold, Perfectly Size-Matched to Top-Right Block -->
  <div class="top-left-block">
    Chief Technology Officer (CTO),<br>
    Coimbatore Startup<br>
    Community
  </div>

  <!-- Bottom Paragraph -->
  <p class="bottom-paragraph">
    As Chief Technology Officer (CTO), Vikash Saravanan leads technical development on digital initiatives for the community. His responsibilities include supporting the community website and digital platforms, as well as providing technical assistance for various community activities and operational needs.
  </p>
</body>
</html>`;

  fs.writeFileSync('/tmp/render_single_poster.html', html);

  const browser = await chromium.launch();
  
  // 1. Native High-Resolution 1600x2000 PNG
  const page = await browser.newPage({
    viewport: { width: 1600, height: 2000 },
    deviceScaleFactor: 1
  });
  await page.goto('file:///tmp/render_single_poster.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const outDir = '/Users/vikash/Projects/csc-circle/public/posters';
  const outPath1600 = path.join(outDir, 'vikash-saravanan-cto-matched-bold-29px.png');
  await page.screenshot({ path: outPath1600, type: 'png' });
  console.log(`Saved: ${outPath1600}`);

  // 2. 4K Ultra-HD Master (3200x4000, 2x scale)
  const page4k = await browser.newPage({
    viewport: { width: 1600, height: 2000 },
    deviceScaleFactor: 2
  });
  await page4k.goto('file:///tmp/render_single_poster.html', { waitUntil: 'networkidle' });
  await page4k.waitForTimeout(600);
  const outPath4k = path.join(outDir, 'vikash-saravanan-cto-matched-bold-29px-4k.png');
  await page4k.screenshot({ path: outPath4k, type: 'png' });
  console.log(`Saved 4K Master: ${outPath4k}`);

  // 3. Instagram Feed Ready (1080x1350 JPEG)
  const pageInsta = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1
  });
  await pageInsta.goto('file:///tmp/render_single_poster.html', { waitUntil: 'networkidle' });
  await pageInsta.evaluate(() => {
    document.body.style.transform = 'scale(0.675)';
    document.body.style.transformOrigin = 'top left';
    document.body.style.width = '1600px';
    document.body.style.height = '2000px';
  });
  await pageInsta.waitForTimeout(600);
  const outPathInsta = path.join(outDir, 'vikash-saravanan-cto-matched-bold-29px-instagram.jpg');
  await pageInsta.screenshot({ path: outPathInsta, type: 'jpeg', quality: 95 });
  console.log(`Saved Instagram 1080x1350: ${outPathInsta}`);

  await browser.close();
};

generatePoster(29.5, 700, 421);
