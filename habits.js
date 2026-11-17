/* Recurrence and completion helpers shared by the habit list, editor, and calendar. */
let habitRefreshTimer = null;
let habitFollowsToday = true;
let habitClockDay = null;
const habitStartCalendars = {};
function habitRule(habit, key) {
  const entry = key && habit.scheduleHistory?.filter(item => item.from <= key).at(-1);
  const source = entry || habit;
  const time = source.time ?? (source.mode === "interval" ? "" : habit.time);
  return {
    mode: source.mode === "interval" ? "interval" : "weekdays",
    cadence: source.cadence === "days" ? "days" : "duration",
    startDate: /^\d{4}-\d{2}-\d{2}$/.test(source.startDate || "") ? source.startDate : "",
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(time || "") ? time : "",
    days: normalizeHabitDays(source.days),
    every: Number.isInteger(source.every) && source.every > 0 ? Math.min(999, source.every) : 1,
    unit: ["minute", "hour", "day", "week"].includes(source.unit) ? source.unit : "day",
    from: entry?.from
  };
}

function habitCompletionRecords(habit) {
  const events = (habit.completionEvents || []).filter(event => event && Number.isFinite(event.at));
  const dated = new Set(events.map(event => event.date));
  const legacy = (habit.completedDates || []).filter(date => !dated.has(date)).map(date => ({
    id: "legacy:" + date, date, at: new Date(date + "T" + (habitRule(habit, date).time || "12:00") + ":00").getTime()
  })).filter(event => Number.isFinite(event.at));
  return [...events, ...legacy].sort((a,b) => a.at - b.at);
}

function intervalHabitStatus(habit, key, now = Date.now()) {
  const rule = habitRule(habit, key);
  const today = dateKey(new Date(now));
  const cutoff = key === today ? now : new Date(key + "T23:59:59.999").getTime();
  const records = habitCompletionRecords(habit).filter(event => event.at <= cutoff);
  if (rule.startDate && key < rule.startDate) {
    const first = new Date(rule.startDate + "T" + (rule.time || "00:00") + ":00");
    if (rule.cadence === "days") while (!rule.days.includes(first.getDay())) first.setDate(first.getDate()+1);
    return {dueAt:first.getTime(), ready:false, done:false, cycleStart:first.getTime(), cycleEnd:first.getTime()};
  }
  if (rule.cadence === "days") {
    const dayStart = new Date(key + "T00:00:00");
    const start = new Date(key + "T" + (rule.time || "00:00") + ":00");
    const end = new Date(dayStart);
    end.setDate(end.getDate() + 1);
    const cycleStart = start.getTime(), cycleEnd = end.getTime();
    const scheduled = rule.days.includes(start.getDay());
    // Changing today's return time must not discard an earlier check-in.
    const completion = scheduled ? records.filter(event => event.at >= dayStart.getTime() && event.at < cycleEnd).at(-1) : undefined;
    const done = Boolean(completion);
    const nextOccurrence = new Date(start);
    do { nextOccurrence.setDate(nextOccurrence.getDate() + 1); } while (!rule.days.includes(nextOccurrence.getDay()));
    const next = new Date(start);
    if (!scheduled || done) {
      do { next.setDate(next.getDate() + 1); } while (!rule.days.includes(next.getDay()));
    }
    return {dueAt:next.getTime(), ready:scheduled && !done && cutoff >= cycleStart,
      done, cycleStart, cycleEnd, nextAt:nextOccurrence.getTime(), completion};
  }
  const duration = rule.every * {minute:60000,hour:3600000,day:86400000,week:604800000}[rule.unit];
  let initial = Math.max(habit.createdAt || now, rule.from ? new Date(rule.from + "T00:00:00").getTime() : 0);
  if (rule.time) initial = new Date(dateKey(new Date(initial)) + "T" + rule.time + ":00").getTime();
  if (rule.startDate) initial = new Date(rule.startDate + "T" + (rule.time || "00:00") + ":00").getTime();
  // Completion fills one fixed window; it never moves the next recurrence.
  const cycle = Math.max(0, Math.floor((cutoff - initial) / duration));
  let cycleStart = initial + cycle * duration;
  let cycleEnd = cycleStart + duration;
  if ((rule.time || rule.startDate) && ["day", "week"].includes(rule.unit)) {
    // Calendar-day intervals keep the chosen local time through daylight-saving changes.
    const days = rule.every * (rule.unit === "week" ? 7 : 1);
    const slot = Math.max(0, Math.floor(daysBetween(dateKey(new Date(initial)), dateKey(new Date(cutoff))) / days));
    const start = new Date(initial);
    start.setDate(start.getDate() + slot * days);
    if (start.getTime() > cutoff && slot > 0) start.setDate(start.getDate() - days);
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    cycleStart = start.getTime();
    cycleEnd = end.getTime();
  }
  const nextAt = cycleEnd;
  if (rule.startDate && ["day", "week"].includes(rule.unit)) {
    const onDate = dateKey(new Date(cycleStart));
    if (onDate !== key) return {dueAt:cutoff < initial ? initial : nextAt, ready:false, done:false, cycleStart, cycleEnd, nextAt};
    const endOfDay = new Date(onDate + "T00:00:00");
    endOfDay.setDate(endOfDay.getDate()+1);
    cycleEnd = endOfDay.getTime();
  }
  const completion = records.filter(event => event.at >= cycleStart && event.at < cycleEnd).at(-1);
  const done = Boolean(completion);
  const dueAt = done ? nextAt : cycleStart;
  return { dueAt, ready: cutoff >= cycleStart && !done, done, cycleStart, cycleEnd, nextAt, completion };
}

function habitIsVisible(habit, key) {
  return habitRule(habit, key).mode === "interval"
    ? intervalHabitStatus(habit, key).ready : habitCanComplete(habit, key);
}

function habitOccurrence(habit, at) {
  const key = dateKey(new Date(at));
  const rule = habitRule(habit, key);
  const dayStart = new Date(key + "T00:00:00").getTime();
  if (rule.mode === "interval") {
    const status = intervalHabitStatus(habit, key, at);
    const effective = rule.from ? new Date(rule.from + "T00:00:00").getTime() : 0;
    return {start:Math.max(status.cycleStart,effective),end:status.cycleEnd,
      next:status.nextAt || status.cycleEnd, valid:status.ready || status.done};
  }
  const end = new Date(dayStart);
  end.setDate(end.getDate()+1);
  const next = new Date(end);
  for (let i=0;i<7;i++) {
    if (habitRule(habit,dateKey(next)).mode === "interval" || habitRule(habit,dateKey(next)).days.includes(next.getDay())) break;
    next.setDate(next.getDate()+1);
  }
  return {start:dayStart,end:end.getTime(),next:next.getTime(),valid:rule.days.includes(new Date(at).getDay())};
}

function nextHabitOccurrence(habit, occurrence) {
  let next = occurrence.next;
  // A rule change can introduce an occurrence before the old rule's next date.
  const change = habit.scheduleHistory?.find(item => {
    const at = new Date(item.from + "T00:00:00").getTime();
    return at > occurrence.start && at <= next;
  });
  if (change) {
    const at = new Date(change.from + "T00:00:00").getTime();
    const rule = habitRule(habit,change.from);
    if (rule.mode === "interval") {
      const status = intervalHabitStatus(habit,change.from,at);
      next = status.ready || status.done ? Math.max(at,status.cycleStart) : status.dueAt;
    } else {
      const day = new Date(at);
      while (!habitRule(habit,dateKey(day)).days.includes(day.getDay())) day.setDate(day.getDate()+1);
      next = day.getTime();
    }
  }
  return next;
}

function intervalHabitStreaks(habit, now = Date.now()) {
  const occurrences = new Map();
  for (const event of habitCompletionRecords(habit)) {
    if (event.at > now) continue;
    const occurrence = habitOccurrence(habit,event.at);
    if (occurrence.valid) occurrences.set(occurrence.start,occurrence);
  }
  const ordered = [...occurrences.values()].sort((a,b)=>a.start-b.start);
  let current=0, best=0, previous;
  for (const occurrence of ordered) {
    current = previous && nextHabitOccurrence(habit,previous) === occurrence.start ? current+1 : 1;
    best = Math.max(best,current);
    previous = occurrence;
  }
  if (previous) {
    const next = nextHabitOccurrence(habit,previous);
    const pending = habitOccurrence(habit,next);
    if (now >= pending.end) current=0;
  }
  return {current,best};
}

function habitCanComplete(habit, key) {
  return habitRule(habit, key).mode === "interval" ? intervalHabitStatus(habit, key).ready
    : isHabitScheduled(habit, key) && !(habit.completedDates || []).includes(key);
}

function recordHabitCompletion(habit, key) {
  habit.completedDates ||= [];
  if (!habit.completedDates.includes(key)) habit.completedDates.push(key);
  const status = habitRule(habit, key).mode === "interval" ? intervalHabitStatus(habit, key) : null;
  const requested = new Date(key + "T" + (habitRule(habit, key).time || "12:00") + ":00").getTime();
  const at = key === todayKey() ? Date.now() : status ? Math.max(status.cycleStart, Math.min(status.cycleEnd - 1, requested)) : requested;
  const event = {id:createId(),date:key,at};
  (habit.completionEvents ||= []).push(event);
  return event.id;
}

function removeHabitCompletion(habit, key, eventId) {
  if (!eventId && habitRule(habit, key).mode === "interval") {
    const completion = intervalHabitStatus(habit, key).completion;
    if (!completion) return;
    key = completion.date;
    eventId = completion.id;
  }
  const records = habitCompletionRecords(habit).filter(event => event.date === key);
  const target = eventId ? records.find(event => event.id === eventId) : records.at(-1);
  if (eventId && !target) return;
  if (habitRule(habit, key).mode === "interval" || eventId) {
    if (target && !target.id.startsWith("legacy:")) habit.completionEvents = (habit.completionEvents || []).filter(event => event.id !== target.id);
    if ((habit.completionEvents || []).some(event => event.date === key)) return;
  } else if (habit.completionEvents) {
    habit.completionEvents = habit.completionEvents.filter(event => event.date !== key);
  }
  habit.completedDates = (habit.completedDates || []).filter(date => date !== key);
}

function setHabitViewAll(value) {
  state.settings.habitsViewAll = value;
  saveState();
  renderHabitChange(renderHabits);
  document.querySelector("#workspaceHabitViewAll").checked = value;
}

function syncHabitTimingFields(prefix) {
  const interval = document.querySelector("#" + prefix + "Mode").value === "interval";
  const selectedDays = document.querySelector("#" + prefix + "Cadence").value === "days";
  document.querySelector("#" + prefix + "CadenceRow").hidden = !interval;
  document.querySelector("#" + prefix + "Delay").hidden = !interval || selectedDays;
  const amount = document.querySelector("#" + prefix + "Every");
  amount.disabled = !interval || selectedDays;
  amount.required = interval && !selectedDays;
  document.querySelector("#" + prefix + "TimeRow").hidden = false;
  document.querySelector("#" + prefix + "StartRow").hidden = !interval;
  habitStartCalendars[prefix]?.sync();
  if (!document.querySelector("#" + prefix + "StartDate").value) document.querySelector("#" + prefix + "StartDateButton").textContent = "Choose date";
  const weekdays = prefix === "habitNew" ? document.querySelector("#habitRepeatDays") : document.querySelector("#habitEditDays");
  weekdays.closest("fieldset").hidden = interval && !selectedDays;
}

function readHabitTiming(prefix) {
  const mode = document.querySelector("#" + prefix + "Mode").value;
  const every = document.querySelector("#" + prefix + "Every").valueAsNumber;
  const cadence = document.querySelector("#" + prefix + "Cadence").value;
  if (mode === "interval" && cadence !== "days" && (!Number.isInteger(every) || every < 1 || every > 999)) return null;
  return {mode, cadence, startDate: document.querySelector("#" + prefix + "StartDate").value,
    every: Number.isInteger(every) && every > 0 ? every : 1,
    unit: document.querySelector("#" + prefix + "Unit").value,
    time: document.querySelector("#" + prefix + "Time").value};
}

function setupHabitTypes() {
  habitClockDay = todayKey();
  for (const prefix of ["habitNew", "habitEdit"]) {
    const row = document.createElement("div");
    row.id = prefix + "StartRow";
    row.className = "habit-start-date";
    const p = prefix + "Start";
    row.innerHTML = `<span>Start date (optional)</span><input type="hidden" id="${p}Date">
      <div class="habit-date-toolbar">
        <button type="button" id="${p}PreviousDay" aria-label="Previous start day">&#8249;</button>
        <button type="button" id="${p}DateButton" aria-haspopup="dialog" aria-controls="${p}Calendar" aria-expanded="false">Choose date</button>
        <button type="button" id="${p}NextDay" aria-label="Next start day">&#8250;</button>
        <button type="button" id="${p}Today">Today</button>
        <button type="button" id="${p}Clear" aria-label="Clear start date" title="Clear start date">&#215;</button>
      </div>
      <div class="habit-calendar" id="${p}Calendar" popover="auto" role="dialog" aria-label="Choose habit start date">
        <div class="habit-calendar-heading">
          <button type="button" data-calendar-action="previous" aria-label="Previous month">&#8249;</button>
          <button type="button" id="${p}CalendarHeading"></button>
          <button type="button" data-calendar-action="next" aria-label="Next month">&#8250;</button>
        </div><div id="${p}CalendarGrid"></div>
        <div class="habit-calendar-footer"><button type="button" data-calendar-action="today">Today</button><button type="button" data-calendar-action="close">Close</button></div>
      </div>`;
    document.querySelector("#" + prefix + "TimeRow").after(row);
    const input = document.querySelector("#" + p + "Date");
    habitStartCalendars[prefix] = setupHabitCalendar(input, p);
    input.addEventListener("change", () => syncHabitTimingFields(prefix));
    document.querySelector("#" + p + "Clear").addEventListener("click", () => { input.value = ""; syncHabitTimingFields(prefix); });
    document.querySelector("#" + prefix + "Mode").addEventListener("change", () => syncHabitTimingFields(prefix));
    document.querySelector("#" + prefix + "Cadence").addEventListener("change", () => syncHabitTimingFields(prefix));
    syncHabitTimingFields(prefix);
  }
  document.querySelector("#habitViewAll").addEventListener("click", () => setHabitViewAll(!state.settings.habitsViewAll));
  document.querySelector("#workspaceHabitViewAll").addEventListener("change", event => setHabitViewAll(event.target.checked));
  els.habitDate.addEventListener("change", () => { habitFollowsToday = selectedHabitDate() === todayKey(); });
  window.addEventListener("focus", refreshHabitClock);
  document.addEventListener("visibilitychange", refreshHabitClock);
  document.querySelector("#habitEditDialog").addEventListener("close", refreshHabitClock);
}

function scheduleHabitRefresh() {
  clearTimeout(habitRefreshTimer);
  if (state.appView !== "habits") return;
  const now = Date.now();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  let due = Math.min(next.getTime(), now + 60000);
  if (selectedHabitDate() === todayKey()) {
    for (const habit of state.habits) {
      if (habitRule(habit, todayKey()).mode !== "interval") continue;
      const status = intervalHabitStatus(habit, todayKey(), now);
      if (status.dueAt > now) due = Math.min(due, status.dueAt);
    }
  }
  habitRefreshTimer = setTimeout(refreshHabitClock, Math.max(16, due - now + 5));
}

function refreshHabitClock() {
  if (state.appView !== "habits") return;
  if (document.hidden || document.querySelector("dialog[open]")) { scheduleHabitRefresh(); return; }
  const changedDay = habitFollowsToday && selectedHabitDate() === habitClockDay && habitClockDay !== todayKey();
  habitClockDay = todayKey();
  if (changedDay) els.habitDate.value = todayKey();
  const key = selectedHabitDate();
  const visible = state.habits.filter(h => state.settings.habitsViewAll || habitIsVisible(h,key)).map(h => h.id).sort().join(",");
  const current = [...els.habitList.querySelectorAll("[data-habit-id]")].map(el => el.dataset.habitId).sort().join(",");
  const readiness = state.habits.map(h => h.id + ":" + habitCanComplete(h,key)).join(",");
  if (changedDay || visible !== current || readiness !== els.habitList.dataset.readiness) renderHabitChange(renderHabits);
  else scheduleHabitRefresh();
}

function renderHabitChange(update) {
  const animate = state.appView === "habits" && state.settings.gentleMotion !== false
    && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const before = new Map();
  if (animate) els.habitList.querySelectorAll(".habit-card").forEach(card => {
    const rect = card.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight) return;
    const style = getComputedStyle(card);
    before.set(card.dataset.habitId, {rect, done:card.classList.contains("done"), clone:card.cloneNode(true),
      background:style.backgroundColor, border:style.border, padding:style.padding, columns:style.gridTemplateColumns});
  });
  update();
  if (!animate) return;
  els.habitList.querySelectorAll(".habit-card").forEach(card => {
    const prior = before.get(card.dataset.habitId);
    if (!prior) {
      card.animate([{opacity:0,transform:"translateY(5px)"},{opacity:1,transform:"none"}], {duration:180,easing:"ease-out"});
      return;
    }
    before.delete(card.dataset.habitId);
    const rect = card.getBoundingClientRect();
    if (prior.rect.top !== rect.top) card.animate([{transform:`translateY(${prior.rect.top-rect.top}px)`},{transform:"none"}], {duration:180,easing:"ease-out"});
    if (!prior.done && card.classList.contains("done")) card.animate([{backgroundColor:prior.background},{backgroundColor:getComputedStyle(card).backgroundColor}], {duration:180});
  });
  for (const {rect,clone,background,border,padding,columns} of before.values()) {
    const habit = state.habits.find(item => item.id === clone.dataset.habitId);
    const completed = habit && (habitRule(habit, selectedHabitDate()).mode === "interval"
      ? intervalHabitStatus(habit, selectedHabitDate()).done : habit.completedDates.includes(selectedHabitDate()));
    if (completed) clone.querySelector('[data-action="toggle"]').textContent = "Done";
    clone.className = "habit-exit-ghost";
    clone.removeAttribute("data-habit-id");
    clone.inert = true;
    clone.setAttribute("aria-hidden","true");
    Object.assign(clone.style, {left:rect.left+"px",top:rect.top+"px",width:rect.width+"px",height:rect.height+"px",background,border,padding,gridTemplateColumns:columns});
    document.body.append(clone);
    clone.animate([{opacity:1,transform:"none"},{opacity:0,transform:"translateY(-4px) scale(.98)"}], {duration:160,easing:"ease-out"})
      .finished.then(() => clone.remove(), () => clone.remove());
  }
}
