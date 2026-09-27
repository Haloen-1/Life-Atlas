const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
const artifacts = path.join(root, "test-artifacts");
fs.mkdirSync(artifacts, { recursive: true });
const allowed = new Set(["index.html", "app.js", "styles.css", "controls.js", "controls.css", "area-map.js",
  "vendor/d3.v7.min.js", "manifest.json", "sw.js", "icon.svg"]);
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, "http://localhost").pathname).replace(/^\//, "") || "index.html";
  if (!allowed.has(name)) { response.writeHead(404); response.end(); return; }
  response.setHeader("Content-Type", types[path.extname(name)] || "application/octet-stream");
  response.end(fs.readFileSync(path.join(root, name)));
});
let browser;
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe" });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, reducedMotion: "reduce", serviceWorkers: "block" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error("App error:", error.message); });
  await page.goto("http://127.0.0.1:" + server.address().port);
  await page.waitForSelector("#childTopics .empty", { state: "attached" });
  assert.equal(await page.locator(".atlas-select-trigger").count(), await page.locator("select").count());

  await page.locator("#addRootTopic").click();
  await page.locator("#folderModal .atlas-select-trigger").click();
  await page.locator("#atlas-select-menu [role=option]").filter({ hasText: "Indigo" }).click();
  assert.equal(await page.locator("#folderColorInput").inputValue(), "#5b6f9c");
  await page.locator("#folderNameInput").fill("Photography");
  await page.locator("#folderForm button[type=submit]").click();
  await page.waitForSelector("#folderModal[hidden]", { state: "attached" });
  await page.locator("#addRootTopic").click();
  assert.match(await page.locator("#folderModal .atlas-select-trigger").innerText(), /Sage/);
  await page.locator("#cancelFolderModal").click();
  await page.locator("#studioLauncher").click();
  await page.locator("[data-studio-tab=settings]").click();
  await page.locator("#studioDrawer .atlas-select-trigger").click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("body").getAttribute("data-theme"), "night");
  await page.locator("#studioDrawer .atlas-select-trigger").click();
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  const before = await page.locator("#studioDrawer").boundingBox();
  const handle = await page.locator("#workspaceResize").boundingBox();
  await page.mouse.move(handle.x + 12, handle.y + 12);
  await page.mouse.down();
  await page.mouse.move(handle.x + 120, handle.y - 60, { steps: 8 });
  await page.mouse.up();
  const after = await page.locator("#studioDrawer").boundingBox();
  assert(after.width > before.width + 70, "workspace width grows");
  await page.locator("#studioLauncher").click();
  await page.waitForSelector("#studioDrawer[hidden]", { state: "attached" });
  await page.locator("#studioLauncher").click();
  await page.waitForSelector("#studioDrawer.is-open");
  assert.equal(Math.round((await page.locator("#studioDrawer").boundingBox()).width), Math.round(after.width));
  await page.screenshot({ path: path.join(artifacts, "workspace.png") });
  await page.locator("#studioLauncher").click();

  await page.locator('.app-nav [data-app-view="habits"]').click();
  for (const day of [0, 2, 4, 6]) await page.locator('[data-habit-day="' + day + '"]').click();
  await page.locator("#habitInput").fill("Walk outside");
  await page.locator("#habitForm button[type=submit]").click();
  assert.deepEqual(await page.evaluate(() => state.habits[0].days), [1, 3, 5]);
  await page.locator("#habitInput").fill("Read a page");
  await page.locator("#habitForm button[type=submit]").click();
  const cards = page.locator(".habit-card");
  const a = await cards.nth(0).boundingBox(), b = await cards.nth(1).boundingBox();
  await page.mouse.move(a.x + 80, a.y + 25);
  await page.mouse.down();
  await page.mouse.move(b.x + 80, b.y + 25, { steps: 12 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => [...state.habits].sort((a,b) => a.order - b.order)[0].name), "Read a page");
  await page.screenshot({ path: path.join(artifacts, "habits.png") });
  const streaks = await page.evaluate(() => {
    const original = todayKey;
    todayKey = () => "2026-09-28";
    try {
      const habit = { days: [1, 3, 5], createdAt: new Date("2026-09-20T12:00").getTime(),
        completedDates: ["2026-09-21", "2026-09-23", "2026-09-25"] };
      return { current: habitStreak(habit), best: bestHabitStreak(habit),
        off: isHabitMissedOnDate(habit, "2026-09-26"), missed: isHabitMissedOnDate(habit, "2026-09-18"),
        scheduledMiss: isHabitMissedOnDate({ ...habit, completedDates: [] }, "2026-09-25"),
        repaired: habitStreak({ ...habit, completedDates: ["2026-09-21", "2026-09-25"] }),
        legacy: normalizeHabitDays(undefined).length };
    } finally { todayKey = original; }
  });
  assert.deepEqual(streaks, { current: 3, best: 3, off: false, missed: false, scheduledMiss: true, repaired: 1, legacy: 7 });

  await page.locator('.app-nav [data-app-view="life"]').click();
  await page.locator('#subjectTabs [data-view="homework"]').click();
  await page.locator("#taskInput").fill("First step");
  await page.locator("#taskForm button[type=submit]").click();
  await page.locator("#taskInput").fill("Second step");
  await page.locator("#taskForm button[type=submit]").click();
  const taskA = await page.locator("#taskList > .task-item").nth(0).boundingBox();
  const taskB = await page.locator("#taskList > .task-item").nth(1).boundingBox();
  const taskOrder = await page.locator("#taskList > .task-item").evaluateAll((rows) => rows.map((row) => row.dataset.taskId));
  await page.mouse.move(taskA.x + 90, taskA.y + 22);
  await page.mouse.down();
  await page.mouse.move(taskB.x + 90, taskB.y + 22, { steps: 10 });
  await page.mouse.up();
  assert.deepEqual(await page.locator("#taskList > .task-item").evaluateAll((rows) => rows.map((row) => row.dataset.taskId)), taskOrder.reverse());
  assert.equal(await page.locator(".task-item.expanded").count(), 0, "drag does not open task details");

  await page.evaluate(() => {
    const make = (id, parentId, title) => ({ id, parentId, title, notes: "A small next step", createdAt: 1 });
    state.topics = [make("root", null, "Life"), make("a", "root", "Academics"), make("b", "root", "Creative"), make("c", "root", "Wellbeing"),
      make("a1", "a", "Biology"), make("a2", "a", "French"), make("b1", "b", "Photography"), make("b2", "b", "Writing"),
      make("c1", "c", "Movement"), make("c2", "c", "Rest")];
    state.selectedTopicId = "root"; state.appView = "map"; render();
  });
  await page.waitForFunction(() => document.querySelectorAll(".map-node").length === 10);
  await page.waitForTimeout(100);
  assert.equal(await page.locator("#mapViewport").evaluate((el) => getComputedStyle(el).overflow), "hidden");
  const initial = await page.locator(".map-layer").getAttribute("transform");
  await page.locator("#mapZoomIn").click();
  await page.waitForTimeout(100);
  assert.notEqual(await page.locator(".map-layer").getAttribute("transform"), initial);
  await page.locator("#mapFit").click();
  await page.locator("[data-map-orientation=vertical]").click();
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(artifacts, "map-vertical.png") });
  await page.locator("[data-map-orientation=horizontal]").click();
  await page.waitForTimeout(100);
  const node = await page.locator('.map-node[aria-label="Open Biology"]').boundingBox();
  await page.mouse.move(node.x + node.width / 2, node.y + node.height / 2);
  await page.mouse.down();
  await page.mouse.move(node.x + node.width / 2 + 35, node.y + node.height / 2 + 55, { steps: 10 });
  await page.mouse.up();
  assert.equal(await page.evaluate(() => state.appView), "map", "node drag does not open area");
  assert(await page.evaluate(() => !!state.mapPositions.horizontal.a1));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#mapReset").click();
  await page.waitForTimeout(350);
  const liveNode = await page.locator('.map-node[aria-label="Open Biology"]').boundingBox();
  await page.mouse.move(liveNode.x + liveNode.width / 2, liveNode.y + liveNode.height / 2);
  await page.mouse.down();
  await page.mouse.move(liveNode.x + liveNode.width / 2 + 75, liveNode.y + liveNode.height / 2 + 35, { steps: 10 });
  const held = await page.locator('.map-node[aria-label="Open Biology"]').getAttribute("transform");
  await page.mouse.up();
  await page.waitForTimeout(900);
  const settled = await page.locator('.map-node[aria-label="Open Biology"]').getAttribute("transform");
  assert.notEqual(held, settled, "physics settles after release");
  assert(!settled.includes("NaN"), "physics has finite positions");
  await page.screenshot({ path: path.join(artifacts, "map-horizontal.png") });

  await page.evaluate(() => { state.appView = "life"; state.collapsedTopicIds = []; render(); });
  const treeA = await page.locator('.tree-item[data-topic-id="a1"] > .tree-row').boundingBox();
  const treeB = await page.locator('.tree-item[data-topic-id="a2"] > .tree-row').boundingBox();
  await page.mouse.move(treeA.x + 55, treeA.y + 16);
  await page.mouse.down();
  await page.mouse.move(treeB.x + 55, treeB.y + treeB.height - 1, { steps: 10 });
  await page.mouse.up();
  assert.deepEqual(await page.evaluate(() => childrenOf("a").map((topic) => topic.id)), ["a2", "a1"], "nested sidebar reorder");
  await page.evaluate(() => { state.appView = "map"; render(); });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "mobile page has no horizontal overflow");
  assert(await page.locator("#mapViewport").evaluate((el) => el.getBoundingClientRect().bottom <= innerHeight + 1), "entire map fits mobile height");
  await page.screenshot({ path: path.join(artifacts, "map-mobile.png") });
  await page.reload();
  await page.locator("#studioLauncher").click();
  await page.locator("[data-studio-tab=settings]").click();
  await page.locator("#studioDrawer .atlas-select-trigger").click();
  await page.waitForSelector("#atlas-select-menu");
  const popup = await page.locator("#atlas-select-menu").boundingBox();
  assert(popup.x >= 0 && popup.x + popup.width <= 390, "mobile menu stays within viewport");
  assert.deepEqual(errors, [], "no app errors");
  console.log("PASS: custom selects, workspace resize, habits/reorder/streaks, map gestures, persistence, and mobile layout.");
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  server.close();
});
