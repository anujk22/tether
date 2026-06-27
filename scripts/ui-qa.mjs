import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const url = process.env.QA_URL ?? "http://localhost:3000";
const outputDir = "artifacts";

async function inspectPage(page) {
  return page.evaluate(() => {
    const panels = [...document.querySelectorAll(".console-panel")].map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        className: el.className,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    });
    const overflow = [
      ...document.querySelectorAll("button, h1, h2, p, strong, span, code"),
    ]
      .filter(
        (el) =>
          el.scrollWidth > el.clientWidth + 1 &&
          !el.closest(".trace-row") &&
          !el.closest(".diff-row") &&
          !el.closest(".action-card"),
      )
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName,
        className: String(el.className),
        text: el.textContent?.slice(0, 80),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));

    return {
      title: document.title,
      panels,
      overflow,
      hasRecorderRows: document.querySelectorAll(".trace-row").length > 0,
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
  await page.waitForSelector(".console-grid", { timeout: 15_000 });

  if (name === "desktop") {
    await page.getByRole("button", { name: /Simulate retry (x|×)3/i }).click();
    await page.waitForFunction(
      () => document.body.innerText.includes("proposal_count=1") === false,
      { timeout: 1_000 },
    ).catch(() => {});
    await page.waitForTimeout(1_200);
  }

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
    width: 1440,
    height: 950,
  });
  const mobile = await runViewport(browser, "mobile", {
    width: 390,
    height: 844,
  });

  const allConsole = [...desktop.consoleMessages, ...mobile.consoleMessages];
  const allOverflow = [
    ...desktop.metrics.overflow,
    ...mobile.metrics.overflow,
  ];

  if (allConsole.length) {
    throw new Error(`Console errors: ${JSON.stringify(allConsole)}`);
  }

  if (allOverflow.length) {
    throw new Error(`Text overflow: ${JSON.stringify(allOverflow)}`);
  }

  if (!desktop.metrics.hasRecorderRows || !mobile.metrics.hasRecorderRows) {
    throw new Error("Flight Recorder rendered without trace rows");
  }

  if (desktop.metrics.panels.length < 4 || mobile.metrics.panels.length < 4) {
    throw new Error("Expected four console panels in each viewport");
  }

  const desktopRecorder = desktop.metrics.panels.find((panel) =>
    panel.className.includes("recorder-panel"),
  );

  if (!desktopRecorder || desktopRecorder.height < 180) {
    throw new Error(
      `Desktop Flight Recorder height below 180px: ${desktopRecorder?.height}`,
    );
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
        overflow: allOverflow,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
