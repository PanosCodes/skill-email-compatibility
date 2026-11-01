const { chromium } = require("playwright");
const { readFileSync } = require("fs");

const USAGE = "usage: node shoot.js <output-dir> [<url> ...]  (one URL per line on stdin when none are given)";
const WIDTHS = { desktop: 900, mobile: 390, narrow: 320 };

class EmailShots {
  static call(args) {
    return new EmailShots(args).call();
  }

  constructor({ outDir, urls }) {
    if (!outDir || urls.length === 0) throw new Error(USAGE);

    this.outDir = outDir;
    this.urls = urls.map((url) => this.validated(url));
  }

  async call() {
    const browser = await chromium.launch({ headless: true, channel: "chromium" });

    try {
      for (const [name, width] of Object.entries(WIDTHS)) {
        await this.shootAt(browser, name, width);
      }
    } finally {
      await browser.close();
    }
  }

  async shootAt(browser, name, width) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });

    for (const url of this.urls) {
      await this.open(page, url);
      const label = this.labelFor(url);
      console.log(`${name.padEnd(8)} ${label.padEnd(48)} ${await this.overflows(page, width) ? "OVERFLOW" : "ok"}`);
      await page.screenshot({ path: `${this.outDir}/${label}.${name}.png`, fullPage: true });
    }
  }

  validated(url) {
    if (!/^https?:\/\/\S+$/.test(url)) throw new Error(`not a single http(s) URL: ${JSON.stringify(url)}`);

    return url;
  }

  async open(page, url) {
    const response = await page.goto(url);

    if (!response.ok()) throw new Error(`${response.status()} for ${url}`);
  }

  async overflows(page, width) {
    return (await page.evaluate(() => document.documentElement.scrollWidth)) > width;
  }

  labelFor(url) {
    return new URL(url).pathname.replace(/^\/|\/$/g, "").replace(/[^\w-]+/g, "_");
  }
}

function urlsFromStdin() {
  if (process.stdin.isTTY) return [];

  return readFileSync(0, "utf8").split("\n").map((line) => line.trim()).filter(Boolean);
}

const argUrls = process.argv.slice(3);

EmailShots.call({ outDir: process.argv[2], urls: argUrls.length ? argUrls : urlsFromStdin() });
