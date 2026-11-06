/* Recurrence and completion helpers shared by the habit list, editor, and calendar. */
function habitRule(habit, key) {
  const entry = key && habit.scheduleHistory?.filter(item => item.from <= key).at(-1);
  const source = entry || habit;
  return {
    mode: source.mode === "interval" ? "interval" : "weekdays",
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
    id: "legacy:" + date, date, at: new Date(date + "T" + (habit.time || "12:00") + ":00").getTime()
  })).filter(event => Number.isFinite(event.at));
  return [...events, ...legacy].sort((a,b) => a.at - b.at);
}

function intervalHabitStatus(habit, key, now = Date.now()) {
  const rule = habitRule(habit, key);
  const today = dateKey(new Date(now));
  const cutoff = key === today ? now : new Date(key + "T23:59:59.999").getTime();
  const records = habitCompletionRecords(habit).filter(event => event.at <= cutoff);
  const last = records.at(-1);
  const duration = rule.every * {minute:60000,hour:3600000,day:86400000,week:604800000}[rule.unit];
  const initial = Math.max(habit.createdAt || now, rule.from ? new Date(rule.from + "T00:00:00").getTime() : 0);
  const dueAt = last ? Math.max(initial, last.at + duration) : initial;
  const done = records.some(event => event.date === key);
  return { dueAt, ready: dueAt <= cutoff && (key === today || !done), done };
}

function habitIsVisible(habit, key) {
  return habitRule(habit, key).mode === "interval"
    ? intervalHabitStatus(habit, key).ready : isHabitScheduled(habit, key);
}

function habitCanComplete(habit, key) {
  return habitRule(habit, key).mode === "interval" ? intervalHabitStatus(habit, key).ready
    : isHabitScheduled(habit, key) && !(habit.completedDates || []).includes(key);
}

function recordHabitCompletion(habit, key) {
  habit.completedDates ||= [];
  if (!habit.completedDates.includes(key)) habit.completedDates.push(key);
  if (habitRule(habit, key).mode !== "interval") return null;
  const at = key === todayKey() ? Date.now() : new Date(key + "T" + (habit.time || "12:00") + ":00").getTime();
  const event = {id:createId(),date:key,at};
  (habit.completionEvents ||= []).push(event);
  return event.id;
}

function removeHabitCompletion(habit, key, eventId) {
  const records = habitCompletionRecords(habit).filter(event => event.date === key);
  const target = eventId ? records.find(event => event.id === eventId) : records.at(-1);
  if (eventId && !target) return;
  if (habitRule(habit, key).mode === "interval" || eventId) {
    if (target && !target.id.startsWith("legacy:")) habit.completionEvents = (habit.completionEvents || []).filter(event => event.id !== target.id);
    if ((habit.completionEvents || []).some(event => event.date === key)) return;
  }
  habit.completedDates = (habit.completedDates || []).filter(date => date !== key);
}

function setHabitViewAll(value) {
  state.settings.habitsViewAll = value;
  saveState();
  renderHabits();
  document.querySelector("#workspaceHabitViewAll").checked = value;
}

function syncHabitTimingFields(prefix) {
  const interval = document.querySelector("#" + prefix + "Mode").value === "interval";
  document.querySelector("#" + prefix + "Delay").hidden = !interval;
  const amount = document.querySelector("#" + prefix + "Every");
  amount.disabled = !interval;
  amount.required = interval;
  document.querySelector("#" + prefix + "TimeRow").hidden = interval;
  const weekdays = prefix === "habitNew" ? document.querySelector("#habitRepeatDays") : document.querySelector("#habitEditDays");
  weekdays.closest("fieldset").hidden = interval;
}

function readHabitTiming(prefix) {
  const mode = document.querySelector("#" + prefix + "Mode").value;
  const every = document.querySelector("#" + prefix + "Every").valueAsNumber;
  if (mode === "interval" && (!Number.isInteger(every) || every < 1 || every > 999)) return null;
  return {mode, every: Number.isInteger(every) && every > 0 ? every : 1,
    unit: document.querySelector("#" + prefix + "Unit").value,
    time: document.querySelector("#" + prefix + "Time").value};
}

function setupHabitTypes() {
  for (const prefix of ["habitNew", "habitEdit"]) {
    document.querySelector("#" + prefix + "Mode").addEventListener("change", () => syncHabitTimingFields(prefix));
    syncHabitTimingFields(prefix);
  }
  document.querySelector("#habitViewAll").addEventListener("click", () => setHabitViewAll(!state.settings.habitsViewAll));
  document.querySelector("#workspaceHabitViewAll").addEventListener("change", event => setHabitViewAll(event.target.checked));
  const refresh = () => {
    if (state.appView !== "habits" || document.hidden || document.querySelector("dialog[open]")) return;
    const key = selectedHabitDate();
    const visible = state.habits.filter(h => state.settings.habitsViewAll || habitIsVisible(h,key)).map(h => h.id).sort().join(",");
    const current = [...els.habitList.querySelectorAll("[data-habit-id]")].map(el => el.dataset.habitId).sort().join(",");
    const readiness = state.habits.map(h => h.id + ":" + habitCanComplete(h,key)).join(",");
    if (visible !== current || readiness !== els.habitList.dataset.readiness) renderHabits();
  };
  setInterval(refresh, 15000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
}
