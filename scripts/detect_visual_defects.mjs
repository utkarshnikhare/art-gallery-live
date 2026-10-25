import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const executablePath = fs.existsSync(chromePath) ? chromePath : edgePath;

const LIVE_URL = 'https://utkarshnikhare.github.io/art-gallery-live/';

async function inspectDefects() {
  console.log('--- DETECTING VISUAL DEFECTS ON LIVE DEPLOYMENT ---');

  const browser = await puppeteer.launch({
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(LIVE_URL, { waitUntil: 'networkidle0' });

  // 1. Check for text displaying NaN or undefined or null
  const badTextStrings = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('body *'));
    const bad = [];
    for (const el of all) {
      if (el.children.length === 0 && el.textContent) {
        const txt = el.textContent.trim();
        if (txt === 'NaN' || txt === 'undefined' || txt === 'null' || txt.includes('NaN ') || txt.includes('undefined ')) {
          bad.push({ tag: el.tagName, class: el.className, text: txt });
        }
      }
    }
    return bad;
  });
  console.log('1. Broken/Unrendered Text (NaN, undefined, null):', badTextStrings);

  // 2. Check for broken images
  const brokenImages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('img'))
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => ({ src: img.src, alt: img.alt }));
  });
  console.log('2. Broken Images:', brokenImages);

  // 3. Check for clipped / overflowing buttons
  const clippedControls = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, input, select'));
    const clipped = [];
    for (const b of buttons) {
      if (b.scrollWidth > b.clientWidth + 2) {
        clipped.push({ tag: b.tagName, class: b.className, text: b.textContent?.trim(), scrollWidth: b.scrollWidth, clientWidth: b.clientWidth });
      }
    }
    return clipped;
  });
  console.log('3. Clipped Form Controls/Buttons:', clippedControls);

  // 4. Check for unreadable / low contrast text
  const lowContrastText = await page.evaluate(() => {
    // Check elements with direct text
    const textEls = Array.from(document.querySelectorAll('h1, h2, h3, h4, p, span, button, th, td'));
    const whiteOnWhite = [];
    for (const el of textEls) {
      if (el.children.length === 0 && el.textContent?.trim()) {
        const style = window.getComputedStyle(el);
        const color = style.color;
        // Check if color is white on white background
        if (color === 'rgb(255, 255, 255)') {
          let parent = el.parentElement;
          let parentBg = window.getComputedStyle(parent).backgroundColor;
          while (parent && (parentBg === 'rgba(0, 0, 0, 0)' || parentBg === 'transparent')) {
            parent = parent.parentElement;
            if (parent) parentBg = window.getComputedStyle(parent).backgroundColor;
          }
          if (parentBg === 'rgb(255, 255, 255)' || parentBg === 'rgb(247, 248, 250)') {
            whiteOnWhite.push({ text: el.textContent.trim(), tag: el.tagName, class: el.className, parentBg });
          }
        }
      }
    }
    return whiteOnWhite;
  });
  console.log('4. White-on-White Unreadable Text:', lowContrastText);

  // 5. Test each tab for bad text
  const tabs = ['#ws-tab-inventory', '#ws-tab-sales', '#ws-tab-collectors', '#ws-tab-exhibitions', '#ws-tab-pricing', '#ws-tab-certificates', '#ws-tab-licensing', '#ws-tab-marketing', '#ws-tab-catalog', '#ws-tab-backup'];
  for (const tab of tabs) {
    const btn = await page.$(tab);
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 200));
      const badInTab = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll('.workspace-main-content *'));
        const bad = [];
        for (const el of all) {
          if (el.children.length === 0 && el.textContent) {
            const txt = el.textContent.trim();
            if (txt === 'NaN' || txt === 'undefined' || txt === 'null') {
              bad.push({ tag: el.tagName, class: el.className, text: txt });
            }
          }
        }
        return bad;
      });
      if (badInTab.length > 0) {
        console.error(`⚠️ Found bad text in tab ${tab}:`, badInTab);
      }
    }
  }

  await browser.close();
  console.log('--- DEFECT DETECTION COMPLETE ---');
}

inspectDefects().catch(console.error);
