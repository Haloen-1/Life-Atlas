/* Journal and reminder UI share the atlas state and its JSON backup. */
const journalEl = (id) => document.getElementById(id);
let journalCalendar;

function selectScheduleView(view) {
  const journal = view === "journal";
  journalEl("weeklyView").hidden = journal;
  journalEl("journalView").hidden = !journal;
  document.querySelectorAll("[data-schedule-view]").forEach((button) => {
    const active = button.dataset.scheduleView === view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  if (!journal) return;
  if (!journalCalendar) {
    const host = journalEl("journalDateControl");
    for (const original of [journalEl("habitDate").parentElement, journalEl("habitCalendar")]) {
      const copy = original.cloneNode(true);
      for (const el of [copy, ...copy.querySelectorAll("[id], [aria-controls]")]) {
        if (el.id) el.id = el.id.replace(/^habit/, "journal");
        if (el.hasAttribute("aria-controls")) el.setAttribute("aria-controls", el.getAttribute("aria-controls").replace(/^habit/, "journal"));
      }
      copy.setAttribute("aria-label", "Journal date");
      host.append(copy);
    }
    journalEl("journalDate").value = todayKey();
    journalCalendar = setupHabitCalendar(journalEl("journalDate"), "journal");
    journalEl("journalDate").addEventListener("change", renderJournalEntry);
  }
  renderJournalEntry();
}

function renderJournalEntry() {
  const key = journalEl("journalDate").value;
  const entry = state.journalEntries?.[key] || {};
  journalEl("journalBody").value = entry.body || "";
  journalEl("journalBed").value = entry.bed || "";
  journalEl("journalWake").value = entry.wake || "";
  journalEl("journalSaved").textContent = entry.updatedAt ? "Saved on this device" : "";
  showJournalDuration();
  journalCalendar.sync();
}

function showJournalDuration() {
  const bed = journalEl("journalBed").value, wake = journalEl("journalWake").value;
  journalEl("journalDuration").textContent = bed && wake ? formatDuration(sleepDurationMinutes({ start: bed, end: wake })) : "";
}

function saveJournalEntry() {
  const key = journalEl("journalDate").value;
  state.journalEntries ||= {};
  const entry = { body: journalEl("journalBody").value, bed: journalEl("journalBed").value, wake: journalEl("journalWake").value, updatedAt: Date.now() };
  if (entry.body || entry.bed || entry.wake) state.journalEntries[key] = entry;
  else delete state.journalEntries[key];
  showJournalDuration();
  try { saveState(); journalEl("journalSaved").textContent = "Saved on this device"; }
  catch { journalEl("journalSaved").textContent = "Could not save. Export a backup before closing."; }
}

function setupJournal() {
  journalEl("defaultBlockMinutes").addEventListener("change", () => { state.settings.blockMinutes = Number(journalEl("defaultBlockMinutes").value); saveState(); });
  selectScheduleView("week");
  journalEl("scheduleViews").addEventListener("click", (event) => {
    const view = event.target.closest("[data-schedule-view]")?.dataset.scheduleView;
    if (view) selectScheduleView(view);
  });
  for (const id of ["journalBody", "journalBed", "journalWake"]) journalEl(id).addEventListener("input", saveJournalEntry);
  journalEl("journalTrends").addEventListener("click", openSleepTrendModal);
  const visit = (view) => {
    toggleStudioDrawer(false);
    state.settings.visibleSections.time = true;
    openAppView("time");
    selectScheduleView(view);
    saveState();
  };
  journalEl("workspaceJournal").addEventListener("click", () => visit("journal"));
  journalEl("workspaceWeek").addEventListener("click", () => visit("week"));
  journalEl("workspaceReminders").addEventListener("click", () => setStudioTab("permissions"));
  for (let day = 0; day < 7; day++) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.day = day;
    button.setAttribute("aria-label", weekdayName(day));
    button.textContent = weekdayName(day).slice(0, 1);
    button.addEventListener("click", () => button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true")));
    journalEl("jrDays").append(button);
  }
  journalEl("jrFrequency").addEventListener("change", () => { journalEl("jrDays").hidden = journalEl("jrFrequency").value !== "week"; });
  journalEl("journalReminderForm").addEventListener("submit", saveJournalReminder);
  journalEl("jrExport").addEventListener("click", exportJournalReminder);
  journalEl("jrWindowsExport").addEventListener("click", exportWindowsJournalReminder);
  journalEl("jrTest").addEventListener("click", testJournalReminder);
  const popup = document.createElement("aside");
  popup.id = "journalReminderPopup";
  popup.className = "journal-reminder-popup";
  popup.hidden = true;
  popup.setAttribute("role", "alert");
  popup.innerHTML = '<img src="icon.svg" alt="" width="40" height="40"><div><strong>Life Atlas</strong><p id="journalReminderMessage">A moment for your journal.</p><button class="ghost-button compact" type="button" id="journalReminderOpen">Open journal</button></div><button type="button" class="journal-reminder-close" id="journalReminderDismiss" aria-label="Dismiss journal reminder">&#215;</button>';
  document.body.append(popup);
  journalEl("journalReminderDismiss").addEventListener("click", () => { popup.hidden = true; });
  journalEl("journalReminderOpen").addEventListener("click", () => { popup.hidden = true; visit("journal"); });
  setInterval(checkJournalReminder, 15000);
  window.addEventListener("focus", checkJournalReminder);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) checkJournalReminder(); });
  const openFromNotification = () => { if (location.hash === "#journal") visit("journal"); };
  window.addEventListener("hashchange", openFromNotification);
  navigator.serviceWorker?.addEventListener("message", (event) => { if (event.data === "open-journal") visit("journal"); });
  openFromNotification();
  checkJournalReminder();
}

function bindBlockSelection(lane, range) {
  lane.onpointerdown = (event) => {
    if (!event.isPrimary || event.button !== 0 || event.target.closest(".time-block")) return;
    const pointer = event.pointerId;
    const minute = (y) => {
      const rect = lane.getBoundingClientRect();
      return Math.max(range.start, Math.min(range.end, snapTimeMinutes(range.start + (y - rect.top) / rect.height * (range.end - range.start))));
    };
    const anchor = minute(event.clientY);
    let a, b;
    const preview = document.createElement("div");
    preview.className = "schedule-selection";
    const update = (y) => {
      const current = minute(y);
      a = Math.min(anchor, current, range.end - 5);
      b = Math.max(a + 5, current, anchor);
      if (current === anchor) b = Math.min(range.end, a + (state.settings.blockMinutes || 60));
      preview.style.top = (a - range.start) / (range.end - range.start) * 100 + "%";
      preview.style.height = (b - a) / (range.end - range.start) * 100 + "%";
      preview.textContent = formatMinute(a) + " - " + formatMinute(b % 1440);
    };
    const clear = () => {
      lane.onpointermove = lane.onpointerup = lane.onpointercancel = lane.onlostpointercapture = null;
      preview.remove();
      if (lane.hasPointerCapture(pointer)) lane.releasePointerCapture(pointer);
    };
    event.preventDefault();
    lane.setPointerCapture(pointer);
    lane.append(preview);
    update(event.clientY);
    lane.onpointermove = (e) => { if (e.pointerId === pointer) update(e.clientY); };
    lane.onpointerup = (e) => { if (e.pointerId === pointer) { update(e.clientY); clear(); beginNewTimeBlock(a, b); } };
    lane.onpointercancel = lane.onlostpointercapture = clear;
  };
}

function reminderDefaults() {
  return { enabled: false, inApp: true, catchUp: true, openTarget: location.protocol === "file:" ? "laptop" : "website", time: "20:30", frequency: "day", interval: 1, days: [new Date().getDay()], start: todayKey(), end: "" };
}

function renderReminderSettings() {
  const r = { ...reminderDefaults(), ...state.settings.journalReminder };
  journalEl("jrEnabled").checked = r.enabled;
  journalEl("jrInApp").checked = r.inApp !== false;
  journalEl("jrCatchUp").checked = r.catchUp !== false;
  journalEl("jrOpenTarget").value = r.openTarget;
  for (const [id, value] of [["jrTime",r.time],["jrInterval",r.interval],["jrFrequency",r.frequency],["jrStart",r.start],["jrEnd",r.end]]) journalEl(id).value = value;
  journalEl("jrDays").hidden = r.frequency !== "week";
  journalEl("jrDays").querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(r.days.includes(Number(b.dataset.day)))));
  const permission = window.Notification?.permission;
  journalEl("jrStatus").textContent = permission === "denied" ? "Desktop alerts are blocked. In-app reminders remain available." : permission !== "granted" ? "Desktop permission is not enabled. Test reminder can request it." : "Desktop permission is allowed. Windows notification banners and Do not disturb still apply.";
  syncAtlasSelects();
}

function readReminderForm() {
  if (!journalEl("journalReminderForm").reportValidity()) return null;
  const r = { enabled: journalEl("jrEnabled").checked, inApp: journalEl("jrInApp").checked, catchUp: journalEl("jrCatchUp").checked,
    openTarget: journalEl("jrOpenTarget").value,
    time: journalEl("jrTime").value, frequency: journalEl("jrFrequency").value,
    interval: journalEl("jrInterval").valueAsNumber, start: journalEl("jrStart").value, end: journalEl("jrEnd").value,
    days: [...journalEl("jrDays").querySelectorAll('[aria-pressed="true"]')].map(b => Number(b.dataset.day)) };
  if (r.end && r.end < r.start || r.frequency === "week" && !r.days.length) {
    journalEl("jrStatus").textContent = r.end && r.end < r.start ? "End date must be on or after the start." : "Choose at least one weekday.";
    return null;
  }
  return r;
}

async function saveJournalReminder(event) {
  event.preventDefault();
  const r = readReminderForm();
  if (!r) return;
  let blocked = false;
  if (r.enabled) {
    try {
      const permission = window.Notification?.permission;
      blocked = !permission || (permission === "default" ? await Notification.requestPermission() : permission) !== "granted";
    } catch { blocked = true; }
  }
  state.settings.journalReminder = r;
  saveState(); renderReminderSettings();
  journalEl("jrStatus").textContent = blocked ? "Schedule saved. Desktop permission is blocked; in-app reminders are still enabled if selected." : r.enabled ? "Reminder saved. Browser reminders require Life Atlas to be open; use a Windows or calendar reminder when closed." : "Schedule saved. Reminders are off.";
  checkJournalReminder();
}

function reminderMatches(r, date) {
  if (date < r.start || r.end && date > r.end) return false;
  const first = new Date(r.start + "T12:00"), day = new Date(date + "T12:00");
  const ordinal = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
  const days = ordinal(day) - ordinal(first);
  if (r.frequency === "day") return days % r.interval === 0;
  if (r.frequency === "week") return Math.floor((days + first.getDay()) / 7) % r.interval === 0 && r.days.includes(day.getDay());
  const months = (day.getFullYear() - first.getFullYear()) * 12 + day.getMonth() - first.getMonth();
  return day.getDate() === first.getDate() && months % (r.interval * (r.frequency === "year" ? 12 : 1)) === 0;
}

let journalNotifying = false;
function showJournalReminderPopup(test = false) {
  const popup = journalEl("journalReminderPopup");
  journalEl("journalReminderMessage").textContent = test ? "Your reminder preview." : "A moment for your journal.";
  popup.hidden = false;
  if (state.settings.gentleMotion !== false && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    popup.getAnimations().forEach(animation => animation.cancel());
    popup.animate([{opacity:0,transform:"translateX(24px)"},{opacity:1,transform:"none"}],
      {duration:240,easing:"cubic-bezier(.2,.8,.2,1)"});
  }
}

async function deliverJournalReminder(r, test = false) {
  let visible = false, desktop = false;
  if (r.inApp !== false && !document.hidden) { showJournalReminderPopup(test); visible = true; }
  if (window.Notification?.permission === "granted") {
    const options = {body:test ? "Your journal reminder is ready." : "A moment for your journal.",tag:test ? "life-atlas-journal-test" : "life-atlas-journal",
      icon:"icon.svg",data:{journal:true}};
    try {
      const reg = location.protocol !== "file:" && await navigator.serviceWorker?.getRegistration();
      if (reg?.active) await reg.showNotification("Life Atlas Journal",options);
      else {
        const alert = new Notification("Life Atlas Journal",options);
        alert.onclick = () => { window.focus(); openAppView("time"); selectScheduleView("journal"); alert.close(); };
      }
      desktop = true;
    } catch {
      journalEl("jrStatus").textContent = "Windows notification delivery failed. Check site permissions and Windows notification settings.";
    }
  }
  return {visible,desktop};
}

async function testJournalReminder() {
  const button = journalEl("jrTest");
  button.disabled = true;
  try {
    try { if (window.Notification?.permission === "default") await Notification.requestPermission(); } catch {}
    const result = await deliverJournalReminder({inApp:journalEl("jrInApp").checked},true);
    journalEl("jrStatus").textContent = result.desktop
      ? "Test sent to Windows. If no banner appears, check Windows Notifications and Do not disturb."
      : result.visible ? "In-app test shown. Desktop alerts need browser and Windows permission."
      : "No notification could be shown. Enable the in-app popup or allow desktop notifications.";
  } catch { journalEl("jrStatus").textContent = "The test could not request desktop permission. Check site notification settings."; }
  finally { button.disabled = false; }
}

async function checkJournalReminder(now = new Date()) {
  if (!(now instanceof Date)) now = new Date();
  const r = state.settings.journalReminder;
  if (!r?.enabled || journalNotifying) return;
  const date = dateKey(now), due = new Date(date + "T" + r.time);
  if (!reminderMatches(r, date) || now < due || r.catchUp === false && now - due >= 60000) return;
  const slot = date + "T" + r.time, key = STORAGE_KEY + "-journal-delivered";
  if (localStorage.getItem(key) === slot) return;
  journalNotifying = true;
  try {
    const result = await deliverJournalReminder(r);
    if (result.visible || result.desktop) localStorage.setItem(key, slot);
  } catch { journalEl("jrStatus").textContent = "Desktop delivery failed. Check Windows and site notification permissions."; }
  finally { journalNotifying = false; }
}

function exportJournalReminder() {
  const r = readReminderForm();
  if (!r) return;
  const first = new Date(r.start + "T12:00");
  // Weekly DTSTART must be an occurrence of the rule, including for multi-week intervals.
  while (!reminderMatches(r, dateKey(first))) {
    first.setDate(first.getDate() + 1);
    if (r.end && dateKey(first) > r.end) { journalEl("jrStatus").textContent = "No occurrences in this date range."; return; }
  }
  const freq = { day:"DAILY", week:"WEEKLY", month:"MONTHLY", year:"YEARLY" }[r.frequency];
  let rule = "FREQ=" + freq + ";INTERVAL=" + r.interval;
  if (r.frequency === "week") rule += ";WKST=SU;BYDAY=" + r.days.map(i => ["SU","MO","TU","WE","TH","FR","SA"][i]).join(",");
  if (r.end) rule += ";UNTIL=" + r.end.replaceAll("-","") + "T235959";
  const lines = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Life Atlas//Journal//EN","BEGIN:VEVENT","UID:journal-" + createId() + "@lifeatlas",
    "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g,"").split(".")[0] + "Z","DTSTART:" + dateKey(first).replaceAll("-","") + "T" + r.time.replace(":","") + "00",
    "DURATION:PT5M","SUMMARY:Life Atlas Journal","RRULE:" + rule,"BEGIN:VALARM","ACTION:DISPLAY","TRIGGER:PT0M","DESCRIPTION:Journal reminder","END:VALARM","END:VEVENT","END:VCALENDAR",""];
  downloadTextFile("life-atlas-journal-reminder.ics", lines.join("\r\n"), "text/calendar");
}

function exportWindowsJournalReminder() {
  const reminder = readReminderForm();
  if (!reminder) return;
  const url = new URL(reminder.openTarget === "website" && location.protocol !== "https:" ? "https://lifeatlas.uk/" : location.href);
  url.hash = "journal";
  url.search = "";
  downloadTextFile("life-atlas-windows-reminder.json", JSON.stringify({
    app:"Life Atlas",version:1,url:url.href,reminder
  },null,2),"application/json");
  journalEl("jrStatus").textContent = "Windows schedule exported. Open Windows setup and select this file to install or update closed-app alerts.";
}
