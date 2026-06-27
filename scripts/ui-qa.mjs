import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.env.QA_URL ?? "http://localhost:3000";
const outputDir = "artifacts";

async function inspectPage(page) {
  return page.evaluate(() => {
    const required = [
      ".site-header",
      ".hero-section",
      ".station-scene",
      ".feature-band",
      ".mission-section",
      ".testimonial-section",
      ".launch-card",
      ".site-footer",
    ];
    const missing = required.filter((selector) => !document.querySelector(selector));
    const overflow = [
      ...document.querySelectorAll("a, button, h1, h2, p, strong, span, small"),
    ]
      .filter((el) => {
        if (el.closest(".pixel-mark") || el.closest(".robot")) return false;
        if (el.classList.contains("flag") || el.closest(".newsletter label")) {
          return false;
        }
        return el.scrollWidth > el.clientWidth + 1;
      })
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName,
        className: String(el.className),
        text: el.textContent?.slice(0, 80),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
    const hero = document.querySelector(".hero-section")?.getBoundingClientRect();
    const featureBand = document
      .querySelector(".feature-band")
      ?.getBoundingClientRect();

    return {
      title: document.title,
      missing,
      overflow,
      heroHeight: hero ? Math.round(hero.height) : 0,
      featureTop: featureBand ? Math.round(featureBand.top) : 0,
      featureCards: document.querySelectorAll(".feature-card").length,
      quoteCards: document.querySelectorAll(".quote-card").length,
    };
  });
}

async function runViewport(browser, name, viewport) {
  const page = await browser.newPage({ viewport });
  const consoleMessages = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      });
    }
  });
  page.on("pageerror", (error) => {
    consoleMessages.push({
      type: "pageerror",
      text: error.message,
    });
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForSelector(".site-shell", { timeout: 15_000 });

  const metrics = await inspectPage(page);
  await page.screenshot({
    path: `${outputDir}/tether-${name}.png`,
    fullPage: true,
  });
  await page.close();

  return {
    name,
    metrics,
    consoleMessages,
  };
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const desktop = await runViewport(browser, "desktop", {
    width: 1068,
    height: 1536,
  });
  const mobile = await runViewport(browser, "mobile", {
    width: 390,
    height: 1600,
  });

  const allConsole = [...desktop.consoleMessages, ...mobile.consoleMessages];
  const allOverflow = [
    ...desktop.metrics.overflow,
    ...mobile.metrics.overflow,
  ];
  const missing = [...desktop.metrics.missing, ...mobile.metrics.missing];

  if (allConsole.length) {
    throw new Error(`Console errors: ${JSON.stringify(allConsole)}`);
  }

  if (missing.length) {
    throw new Error(`Missing landing sections: ${JSON.stringify(missing)}`);
  }

  if (allOverflow.length) {
    throw new Error(`Text overflow: ${JSON.stringify(allOverflow)}`);
  }

  if (desktop.metrics.featureCards !== 5 || mobile.metrics.featureCards !== 5) {
    throw new Error("Expected five feature cards in each viewport");
  }

  if (desktop.metrics.quoteCards !== 3 || mobile.metrics.quoteCards !== 3) {
    throw new Error("Expected three testimonial cards in each viewport");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        screenshots: [
          `${outputDir}/tether-desktop.png`,
          `${outputDir}/tether-mobile.png`,
        ],
        desktop: desktop.metrics,
        mobile: mobile.metrics,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
