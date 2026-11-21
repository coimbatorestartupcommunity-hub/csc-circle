import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Read portrait image as base64
const portraitPath = '/private/tmp/portrait.png';
const portraitBase64 = fs.readFileSync(portraitPath).toString('base64');
const portraitDataUrl = `data:image/png;base64,${portraitBase64}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Vikash Saravanan - CTO | Coimbatore Startup Community</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,700&display=swap" rel="stylesheet">
<style>
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  body {
    width: 2160px;
    height: 2700px;
    overflow: hidden;
    background-color: #fafbfe;
    /* Clean graph paper grid texture matching original */
    background-image: 
      linear-gradient(to right, rgba(203, 213, 225, 0.45) 1.5px, transparent 1.5px),
      linear-gradient(to bottom, rgba(203, 213, 225, 0.45) 1.5px, transparent 1.5px);
    background-size: 40px 40px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #0f172a;
    position: relative;
  }

  /* Top-left emblem (No CSC reference, 100% Coimbatore Startup Community) */
  .brand-emblem {
    position: absolute;
    top: 90px;
    left: 100px;
    width: 210px;
    height: 210px;
    border-radius: 50%;
    background: #ffffff;
    border: 1.5px solid #cbd5e1;
    box-shadow: 0 10px 25px rgba(15, 23, 42, 0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 16px;
    z-index: 30;
  }
  .brand-emblem .emblem-arrow {
    font-size: 38px;
    line-height: 1;
    color: #0284c7;
    font-weight: 800;
    margin-bottom: 6px;
  }
  .brand-emblem .emblem-title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: 0.8px;
    color: #0f172a;
    line-height: 1.25;
    text-transform: uppercase;
  }
  .brand-emblem .emblem-sub {
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
    margin-top: 4px;
    letter-spacing: 0.5px;
  }

  /* Header Container - Perfectly Centered */
  .header-container {
    position: absolute;
    top: 85px;
    left: 0;
    width: 2160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    z-index: 25;
  }
  .greeting-title {
    font-size: 82px;
    font-weight: 800;
    letter-spacing: -1.5px;
    color: #0f172a;
    line-height: 1;
  }
  .name-script {
    font-family: 'Great Vibes', cursive;
    font-size: 154px;
    font-weight: 400;
    color: #0f172a;
    line-height: 1.05;
    margin-top: -8px;
    margin-bottom: 16px;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.04));
  }

  /* Centered Pill Badge Layout */
  .badge-layout {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: #a3dce5;
    border-radius: 9999px;
    padding: 14px 46px;
    box-shadow: 0 4px 16px rgba(163, 220, 229, 0.45);
    margin: 0 auto;
  }
  .badge-text {
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 3.5px;
    text-transform: uppercase;
    color: #0f172a;
    text-align: center;
    line-height: 1;
  }

  /* Central Arched Photo Frame */
  .arch-wrapper {
    position: absolute;
    top: 505px;
    left: 540px;
    width: 1080px;
    height: 1380px;
    border-top-left-radius: 540px;
    border-top-right-radius: 540px;
    border: 22px solid #fabc05;
    background: #0f172a;
    overflow: hidden;
    box-shadow: 0 25px 60px rgba(0, 0, 0, 0.12);
    z-index: 10;
  }
  .arch-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center 22%;
    display: block;
  }

  /* Callout Labels */
  .callout {
    position: absolute;
    font-size: 37px;
    font-weight: 800;
    line-height: 1.25;
    color: #0f172a;
    z-index: 20;
    letter-spacing: -0.3px;
  }

  /* SVG Arrows Overlay */
  .arrows-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 2160px;
    height: 2700px;
    pointer-events: none;
    z-index: 15;
  }

  /* Bottom Details & Greetings Section */
  .bottom-container {
    position: absolute;
    bottom: 85px;
    left: 130px;
    width: 1900px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    z-index: 25;
  }
  .bottom-divider {
    width: 100%;
    height: 2px;
    background: linear-gradient(to right, transparent, #cbd5e1 15%, #cbd5e1 85%, transparent);
    margin-bottom: 35px;
  }
  .bottom-brand {
    font-size: 44px;
    font-weight: 800;
    letter-spacing: 1.2px;
    color: #0f172a;
    margin-bottom: 18px;
    text-transform: uppercase;
  }
  .bottom-desc {
    font-size: 27px;
    font-weight: 600;
    line-height: 1.6;
    color: #334155;
    max-width: 1720px;
    margin-bottom: 22px;
  }
  .bottom-greeting {
    font-family: 'Great Vibes', cursive;
    font-size: 58px;
    color: #0284c7;
    line-height: 1.2;
  }
</style>
</head>
<body>

  <!-- Top-Left Emblem -->
  <div class="brand-emblem">
    <div class="emblem-arrow">↗</div>
    <div class="emblem-title">Coimbatore<br>Startup<br>Community</div>
    <div class="emblem-sub">estd 2024</div>
  </div>

  <!-- Centered Top Header -->
  <div class="header-container">
    <h1 class="greeting-title">Hi, I'm</h1>
    <div class="name-script">Vikash Saravanan</div>
    <!-- Centered pill badge -->
    <div class="badge-layout">
      <div class="badge-text">Chief Technology Officer</div>
    </div>
  </div>

  <!-- Arch Frame with Perfectly Centered High-Res Portrait -->
  <div class="arch-wrapper">
    <img src="${portraitDataUrl}" class="arch-img" alt="Vikash Saravanan">
  </div>

  <!-- Left Callouts -->
  <div class="callout" style="top: 670px; left: 140px; max-width: 380px;">
    Building Scalable<br>Tech Solutions
  </div>

  <div class="callout" style="top: 1140px; left: 120px; max-width: 400px;">
    Driving digital<br>infrastructure<br>&amp; platforms
  </div>

  <div class="callout" style="top: 1610px; left: 120px; max-width: 400px;">
    Tech strategist &amp;<br>community builder
  </div>

  <!-- Right Callouts -->
  <!-- Top Right: Coimbatore Startup Community (Replaces previous 'CTO & Digital Lead, CSC') -->
  <div class="callout" style="top: 670px; left: 1680px; max-width: 440px;">
    Coimbatore<br>Startup Community
  </div>

  <div class="callout" style="top: 1140px; left: 1680px; max-width: 440px;">
    Founder &amp; CEO,<br>Logic Intelligence<br>Technologies
  </div>

  <div class="callout" style="top: 1610px; left: 1680px; max-width: 440px;">
    AI-driven startup<br>ecosystem enabler
  </div>

  <!-- Curved Hand-Drawn Style SVG Arrows -->
  <svg class="arrows-overlay" viewBox="0 0 2160 2700" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <marker id="arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M 1 1.5 L 8 5 L 1 8.5 z" fill="#0f172a" />
      </marker>
    </defs>

    <!-- Top Left Arrow -->
    <path d="M 450 750 C 530 760, 610 790, 675 840" 
          fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)" />

    <!-- Mid Left Arrow -->
    <path d="M 450 1195 C 480 1195, 505 1205, 532 1215" 
          fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)" />

    <!-- Bottom Left Arrow -->
    <path d="M 450 1665 C 480 1665, 505 1685, 532 1705" 
          fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)" />

    <!-- Top Right Arrow -->
    <path d="M 1670 750 C 1590 760, 1520 790, 1485 840" 
          fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)" />

    <!-- Mid Right Arrow -->
    <path d="M 1670 1195 C 1650 1195, 1635 1205, 1628 1215" 
          fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)" />

    <!-- Bottom Right Arrow -->
    <path d="M 1670 1665 C 1650 1665, 1635 1685, 1628 1705" 
          fill="none" stroke="#0f172a" stroke-width="5" stroke-linecap="round" marker-end="url(#arrowhead)" />
  </svg>

  <!-- Bottom Section: Official Info & Personal Greeting -->
  <div class="bottom-container">
    <div class="bottom-divider"></div>
    <div class="bottom-brand">Coimbatore Startup Community</div>
    <div class="bottom-desc">
      As Chief Technology Officer (CTO), I lead technical development and digital initiatives for the community. Responsibilities include supporting the Coimbatore Startup Community website and digital platforms, as well as providing technical assistance for various community activities and operational needs.
    </div>
    <div class="bottom-greeting">
      Warm greetings from Vikash Saravanan, CTO
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync('/tmp/poster_render.html', html);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 2160, height: 2700 },
    deviceScaleFactor: 1
  });

  await page.goto('file:///tmp/poster_render.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const outDir = '/Users/vikash/Projects/csc-circle/public/posters';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. 4K Master PNG (2160x2700)
  const out4k = path.join(outDir, 'vikash-saravanan-instagram-4k.png');
  await page.screenshot({ path: out4k, type: 'png' });
  console.log('Saved 4K Master:', out4k);

  // 2. Standard Instagram Portrait JPEG (1080x1350)
  const page1080 = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 1
  });
  await page1080.goto('file:///tmp/poster_render.html', { waitUntil: 'networkidle' });
  await page1080.evaluate(() => {
    document.body.style.transform = 'scale(0.5)';
    document.body.style.transformOrigin = 'top left';
    document.body.style.width = '2160px';
    document.body.style.height = '2700px';
  });
  await page1080.waitForTimeout(1000);

  const out1080 = path.join(outDir, 'vikash-saravanan-instagram-1080x1350.jpg');
  await page1080.screenshot({ path: out1080, type: 'jpeg', quality: 95 });
  console.log('Saved 1080x1350:', out1080);

  await browser.close();
})();
