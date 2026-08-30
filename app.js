const STORAGE_KEY = "life-atlas-state-v1";
const TIME_CATEGORIES = {
  sleep: { label: "Sleep", color: "#66706f" },
  food: { label: "Food", color: "#9f6235" },
  focus: { label: "Focus", color: "#365d7e" },
  school: { label: "Academics", color: "#5b6f9c" },
  health: { label: "Health", color: "#4f6f52" },
  personal: { label: "Personal", color: "#8a6f9f" },
  rest: { label: "Rest", color: "#d9a441" },
  other: { label: "Other", color: "#9f6235" }
};

const EVENT_CATEGORIES = {
  school: { label: "Academics", color: 1 },
  exam: { label: "Exam prep", color: 4 },
  practice: { label: "Practice", color: 2 },
  creative: { label: "Creative", color: 0 },
  personal: { label: "Personal", color: 5 },
  health: { label: "Health", color: 2 },
  deadline: { label: "Deadline", color: 3 }
};

const DEFAULT_EVENT_CATEGORY = "school";

const defaultState = {
  selectedTopicId: "root",
  appView: "life",
  navigationHistory: [],
  topicsPlacement: 0,
  collapsedTopicIds: [],
  hiddenExamTopicIds: [],
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedCalendarDate: dateKey(new Date()),
  calendarPlannerOpen: false,
  eventSpanMode: "on",
  eventTimeMode: "none",
  taskFilter: "open",
  taskSearch: "",
  selectedBrainNoteId: null,
  brainNotes: [],
  habits: [],
  financeTransactions: [],
  studyPlans: [],
  timeTrackerDate: dateKey(new Date()),
  timeScheduleSeason: seasonForDate(new Date()),
  timeScheduleDay: new Date().getDay(),
  timeBlocks: [],
  sleepLogs: [],
  topics: [
    {
      id: "root",
      parentId: null,
      title: "Life",
      notes: "",
      createdAt: Date.now()
    }
  ],
  tasks: [],
  exams: []
};

let state = loadState();
let folderModalMode = "add";
let folderModalParentId = "root";
let pendingDeleteTopicId = null;
let pendingRenameExamId = null;
let navHistory = Array.isArray(state.navigationHistory) ? state.navigationHistory : [];
let draggedTopicId = null;
let draggedTaskId = null;
let draggedPriorityPanel = null;
let expandedTaskId = null;
let sidebarDraggedTopicId = null;
let sidebarDropMode = "inside";
let modalDragState = null;
let editingEventId = null;
let draggedHabitId = null;
let editingTimeBlockId = null;
let timeBlockDrag = null;
let timeBlockDraftDays = [];
let sleepTrendRange = "week";
let scheduleUndoStack = [];

const els = {
  addRootTopic: document.querySelector("#addRootTopic"),
  addChildTopic: document.querySelector("#addChildTopic"),
  appNav: document.querySelector(".app-nav"),
  backButton: document.querySelector("#backButton"),
  brainNoteBody: document.querySelector("#brainNoteBody"),
  brainNoteDelete: document.querySelector("#brainNoteDelete"),
  brainNoteForm: document.querySelector("#brainNoteForm"),
  brainNoteList: document.querySelector("#brainNoteList"),
  brainNoteNewTitle: document.querySelector("#brainNoteNewTitle"),
  brainNoteState: document.querySelector("#brainNoteState"),
  brainNoteTitle: document.querySelector("#brainNoteTitle"),
  sidebar: document.querySelector(".sidebar"),
  calendarMonth: document.querySelector("#calendarMonth"),
  calendarMonthStrip: document.querySelector("#calendarMonthStrip"),
  calendarNext: document.querySelector("#calendarNext"),
  calendarPrev: document.querySelector("#calendarPrev"),
  calendarYearInput: document.querySelector("#calendarYearInput"),
  childTopics: document.querySelector("#childTopics"),
  currentKicker: document.querySelector("#currentKicker"),
  currentTitle: document.querySelector("#currentTitle"),
  breadcrumbs: document.querySelector("#breadcrumbs"),
  deleteTopic: document.querySelector("#deleteTopic"),
  enableNotifications: document.querySelector("#enableNotifications"),
  examDay: document.querySelector("#examDay"),
  examForm: document.querySelector("#examForm"),
  examList: document.querySelector("#examList"),
  examMonth: document.querySelector("#examMonth"),
  examName: document.querySelector("#examName"),
  examRenameForm: document.querySelector("#examRenameForm"),
  examRenameModal: document.querySelector("#examRenameModal"),
  examRenameInput: document.querySelector("#examRenameInput"),
  cancelExamRename: document.querySelector("#cancelExamRename"),
  examReminder: document.querySelector("#examReminder"),
  examTime: document.querySelector("#examTime"),
  examYear: document.querySelector("#examYear"),
  exportCalendar: document.querySelector("#exportCalendar"),
  exportData: document.querySelector("#exportData"),
  folderForm: document.querySelector("#folderForm"),
  folderModal: document.querySelector("#folderModal"),
  folderModalKicker: document.querySelector("#folderModalKicker"),
  folderModalTitle: document.querySelector("#folderModalTitle"),
  folderNameInput: document.querySelector("#folderNameInput"),
  folderIconInput: document.querySelector("#folderIconInput"),
  folderColorInput: document.querySelector("#folderColorInput"),
  folderColorSwatch: document.querySelector("#folderColorSwatch"),
  folderColorName: document.querySelector("#folderColorName"),
  folderModalHandle: document.querySelector("#folderModalHandle"),
  habitForm: document.querySelector("#habitForm"),
  habitDate: document.querySelector("#habitDate"),
  habitInput: document.querySelector("#habitInput"),
  habitList: document.querySelector("#habitList"),
  financeAmount: document.querySelector("#financeAmount"),
  financeBalance: document.querySelector("#financeBalance"),
  financeDate: document.querySelector("#financeDate"),
  financeExpenses: document.querySelector("#financeExpenses"),
  financeForm: document.querySelector("#financeForm"),
  financeIncome: document.querySelector("#financeIncome"),
  financeList: document.querySelector("#financeList"),
  financeName: document.querySelector("#financeName"),
  financeSource: document.querySelector("#financeSource"),
  financeType: document.querySelector("#financeType"),
  importData: document.querySelector("#importData"),
  importDataFile: document.querySelector("#importDataFile"),
  cancelFolderModal: document.querySelector("#cancelFolderModal"),
  contentGrid: document.querySelector("#contentGrid"),
  folderPanel: document.querySelector(".folder-panel"),
  taskPanel: document.querySelector(".task-panel"),
  notesPanel: document.querySelector(".notes-panel"),
  deleteModal: document.querySelector("#deleteModal"),
  deleteModalTitle: document.querySelector("#deleteModalTitle"),
  deleteModalCopy: document.querySelector("#deleteModalCopy"),
  cancelDeleteModal: document.querySelector("#cancelDeleteModal"),
  confirmDeleteModal: document.querySelector("#confirmDeleteModal"),
  hideNextExam: document.querySelector("#hideNextExam"),
  nextExamMetric: document.querySelector("#nextExamMetric"),
  nextExam: document.querySelector("#nextExam"),
  openTaskCount: document.querySelector("#openTaskCount"),
  renameTopic: document.querySelector("#renameTopic"),
  showNextExam: document.querySelector("#showNextExam"),
  taskForm: document.querySelector("#taskForm"),
  taskFilter: document.querySelector("#taskFilter"),
  taskInput: document.querySelector("#taskInput"),
  taskList: document.querySelector("#taskList"),
  taskSearch: document.querySelector("#taskSearch"),
  todayTaskList: document.querySelector("#todayTaskList"),
  dayPlanner: document.querySelector("#dayPlanner"),
  sleepRoutineForm: document.querySelector("#sleepRoutineForm"),
  sleepRoutineClear: document.querySelector("#sleepRoutineClear"),
  sleepStart: document.querySelector("#sleepStart"),
  sleepTrendChart: document.querySelector("#sleepTrendChart"),
  sleepTrendClose: document.querySelector("#sleepTrendClose"),
  sleepTrendModal: document.querySelector("#sleepTrendModal"),
  sleepTrendOpen: document.querySelector("#sleepTrendOpen"),
  sleepTrendRange: document.querySelector("#sleepTrendRange"),
  sleepTrendStats: document.querySelector("#sleepTrendStats"),
  wakeTime: document.querySelector("#wakeTime"),
  timeBlockForm: document.querySelector("#timeBlockForm"),
  timeBlockName: document.querySelector("#timeBlockName"),
  timeBlockCategory: document.querySelector("#timeBlockCategory"),
  timeBlockStart: document.querySelector("#timeBlockStart"),
  timeBlockEnd: document.querySelector("#timeBlockEnd"),
  timeBlockEndLabel: document.querySelector("#timeBlockEndLabel"),
  timeBlockSave: document.querySelector("#timeBlockSave"),
  timeBlockCancel: document.querySelector("#timeBlockCancel"),
  timeBlockRepeatDays: document.querySelector("#timeBlockRepeatDays"),
  timeScheduleSeason: document.querySelector("#timeScheduleSeason"),
  timeScheduleDays: document.querySelector("#timeScheduleDays"),
  idealDayLabel: document.querySelector("#idealDayLabel"),
  sleepSummary: document.querySelector("#sleepSummary"),
  idealTimeLane: document.querySelector("#idealTimeLane"),
  eventAdd: document.querySelector("#eventAdd"),
  eventCategoryControls: document.querySelector("#eventCategoryControls"),
  eventClose: document.querySelector("#eventClose"),
  eventColorPalette: document.querySelector("#eventColorPalette"),
  eventComposer: document.querySelector("#eventComposer"),
  eventEnd: document.querySelector("#eventEnd"),
  eventEndLabel: document.querySelector("#eventEndLabel"),
  eventEndTime: document.querySelector("#eventEndTime"),
  eventEndTimeLabel: document.querySelector("#eventEndTimeLabel"),
  eventEndTimeWheel: document.querySelector("#eventEndTimeWheel"),
  eventMinutes: document.querySelector("#eventMinutes"),
  eventMinutesLabel: document.querySelector("#eventMinutesLabel"),
  eventName: document.querySelector("#eventName"),
  eventSpanMode: document.querySelector("#eventSpanMode"),
  eventStart: document.querySelector("#eventStart"),
  eventTime: document.querySelector("#eventTime"),
  eventTimeLabel: document.querySelector("#eventTimeLabel"),
  eventTimeMode: document.querySelector("#eventTimeMode"),
  eventTimeWheel: document.querySelector("#eventTimeWheel"),
  selectedDayTitle: document.querySelector("#selectedDayTitle"),
  studyList: document.querySelector("#studyList"),
  toast: document.querySelector("#toast"),
  toggleNotes: document.querySelector("#toggleNotes"),
  topicCount: document.querySelector("#topicCount"),
  topicNotes: document.querySelector("#topicNotes"),
  notesWorkspace: document.querySelector("#notesWorkspace"),
  topicTree: document.querySelector("#topicTree"),
  subjectTabs: document.querySelector("#subjectTabs"),
  celebration: document.querySelector("#celebration")
};

ensureStateShape();
populateExamSelectors();
populateCalendarControls();
initializeEventDefaults();
render();
registerServiceWorker();
setInterval(checkExamAlerts, 60 * 1000);
document.addEventListener("contextmenu", (event) => event.preventDefault());
document.addEventListener("keydown", handleScheduleUndoShortcut);

els.addRootTopic.addEventListener("click", () => openFolderModal("add", "root"));
els.addChildTopic.addEventListener("click", () => openFolderModal("add", state.selectedTopicId));
els.appNav.querySelectorAll("[data-app-view]").forEach((button) => {
  button.addEventListener("click", () => openAppView(button.dataset.appView));
});
els.backButton.addEventListener("click", goBack);
els.brainNoteForm.addEventListener("submit", addBrainNote);
els.brainNoteTitle.addEventListener("input", updateSelectedBrainNote);
els.brainNoteBody.addEventListener("input", updateSelectedBrainNote);
els.brainNoteState.addEventListener("change", updateSelectedBrainNote);
els.brainNoteDelete.addEventListener("click", deleteSelectedBrainNote);
els.renameTopic.addEventListener("click", renameCurrentTopic);
els.deleteTopic.addEventListener("click", deleteCurrentTopic);
els.folderForm.addEventListener("submit", saveFolderModal);
els.cancelFolderModal.addEventListener("click", closeFolderModal);
els.folderColorInput.addEventListener("change", updateFolderColorPreview);
els.folderModalHandle.addEventListener("pointerdown", startModalDrag);
window.addEventListener("pointermove", moveModalDrag);
window.addEventListener("pointerup", stopModalDrag);
els.folderModal.addEventListener("click", (event) => {
  if (event.target === els.folderModal) closeFolderModal();
});
els.cancelDeleteModal.addEventListener("click", closeDeleteModal);
els.confirmDeleteModal.addEventListener("click", confirmDeleteTopic);
els.deleteModal.addEventListener("click", (event) => {
  if (event.target === els.deleteModal) closeDeleteModal();
});
els.examRenameForm.addEventListener("submit", renameExam);
els.cancelExamRename.addEventListener("click", closeExamRenameModal);
els.examRenameModal.addEventListener("click", (event) => {
  if (event.target === els.examRenameModal) closeExamRenameModal();
});
els.subjectTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  currentTopic().view = button.dataset.view;
  saveState();
  render();
});
els.examMonth.addEventListener("change", updateExamDays);
els.examYear.addEventListener("change", updateExamDays);
els.taskForm.addEventListener("submit", addTask);
els.taskSearch.addEventListener("input", () => {
  state.taskSearch = els.taskSearch.value;
  saveState();
  render();
});
els.taskFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-filter]");
  if (!button) return;
  state.taskFilter = button.dataset.filter;
  saveState();
  render();
});
els.hideNextExam.addEventListener("click", () => {
  if (!state.hiddenExamTopicIds.includes(state.selectedTopicId)) {
    state.hiddenExamTopicIds.push(state.selectedTopicId);
  }
  saveState();
  render();
});
els.showNextExam.addEventListener("click", () => {
  state.hiddenExamTopicIds = state.hiddenExamTopicIds.filter((id) => id !== state.selectedTopicId);
  saveState();
  render();
});
els.examForm.addEventListener("submit", addExam);
els.habitForm.addEventListener("submit", addHabit);
els.habitDate.addEventListener("change", () => renderHabits());
els.financeForm.addEventListener("submit", addFinanceTransaction);
els.sleepRoutineForm.addEventListener("submit", saveSleepRoutine);
els.sleepRoutineClear.addEventListener("click", clearSleepRoutine);
els.sleepTrendOpen.addEventListener("click", openSleepTrendModal);
els.sleepTrendClose.addEventListener("click", closeSleepTrendModal);
els.sleepTrendModal.addEventListener("click", (event) => {
  if (event.target === els.sleepTrendModal) closeSleepTrendModal();
});
els.sleepTrendRange.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sleep-range]");
  if (!button) return;
  sleepTrendRange = button.dataset.sleepRange;
  renderSleepTrendChart();
});
els.timeBlockForm.addEventListener("submit", saveTimeBlock);
els.timeBlockForm.addEventListener("keydown", handleTimeBlockFormEnter);
els.timeBlockCancel.addEventListener("click", resetTimeBlockForm);
els.timeBlockCategory.addEventListener("change", () => {
  if (els.timeBlockCategory.value === "food" && !els.timeBlockName.value.trim()) {
    els.timeBlockName.value = "Food";
  }
  updateTimeBlockEndVisibility();
});
els.timeBlockRepeatDays.addEventListener("click", (event) => {
  const button = event.target.closest("[data-repeat-day]");
  if (!button) return;
  const day = Number(button.dataset.repeatDay);
  timeBlockDraftDays = timeBlockDraftDays.includes(day)
    ? timeBlockDraftDays.filter((item) => item !== day)
    : [...timeBlockDraftDays, day].sort((a, b) => a - b);
  renderTimeBlockRepeatDays();
});
els.timeScheduleSeason.addEventListener("click", (event) => {
  const button = event.target.closest("[data-schedule-season]");
  if (!button) return;
  state.timeScheduleSeason = button.dataset.scheduleSeason;
  saveState();
  renderTimeTracker();
});
els.timeScheduleDays.addEventListener("click", (event) => {
  const button = event.target.closest("[data-schedule-day]");
  if (!button) return;
  state.timeScheduleDay = Number(button.dataset.scheduleDay);
  if (!editingTimeBlockId) timeBlockDraftDays = [state.timeScheduleDay];
  saveState();
  renderTimeTracker();
});
window.addEventListener("pointermove", moveTimeBlock);
window.addEventListener("pointerup", stopTimeBlockDrag);
els.calendarPrev.addEventListener("click", () => changeCalendarMonth(-1));
els.calendarNext.addEventListener("click", () => changeCalendarMonth(1));
els.calendarMonthStrip.addEventListener("click", (event) => {
  const button = event.target.closest("[data-calendar-month]");
  if (!button) return;
  state.calendarMonth = Number(button.dataset.calendarMonth);
  saveState();
  render();
});
els.calendarYearInput.addEventListener("change", () => {
  const year = Math.max(1900, Math.min(2200, Number(els.calendarYearInput.value) || new Date().getFullYear()));
  state.calendarYear = year;
  saveState();
  render();
});
els.eventSpanMode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-span-mode]");
  if (!button) return;
  state.eventSpanMode = button.dataset.spanMode;
  initializeEventDefaults();
  saveState();
  render();
});
els.eventTimeMode.addEventListener("click", (event) => {
  const button = event.target.closest("[data-time-mode]");
  if (!button) return;
  state.eventTimeMode = button.dataset.timeMode;
  initializeEventDefaults();
  saveState();
  render();
});
els.eventStart.addEventListener("change", () => {
  if (!els.eventStart.value) return;
  state.selectedCalendarDate = els.eventStart.value;
  state.calendarPlannerOpen = true;
  if (state.eventSpanMode !== "span") els.eventEnd.value = els.eventStart.value;
  saveState();
  render();
});
els.eventTimeWheel.addEventListener("click", (event) => handleTimeWheelClick(event, "start"));
els.eventEndTimeWheel.addEventListener("click", (event) => handleTimeWheelClick(event, "end"));
els.eventCategoryControls.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-category]");
  if (!button) return;
  setEventStyle(button.dataset.eventCategory, EVENT_CATEGORIES[button.dataset.eventCategory]?.color ?? 1);
});
els.eventColorPalette.addEventListener("click", (event) => {
  const button = event.target.closest("[data-event-color]");
  if (!button) return;
  setEventStyle(selectedEventCategory(), Number(button.dataset.eventColor));
});
els.eventAdd.addEventListener("click", addCalendarEvent);
els.eventClose.addEventListener("click", closeCalendarPlanner);
els.exportCalendar.addEventListener("click", exportCalendar);
els.exportData.addEventListener("click", exportLifeAtlasData);
els.importData.addEventListener("click", () => els.importDataFile.click());
els.importDataFile.addEventListener("change", importLifeAtlasData);
els.enableNotifications.addEventListener("click", requestNotifications);
els.topicNotes.addEventListener("input", () => {
  saveCurrentNotes();
});
els.topicNotes.addEventListener("keydown", handleRichNoteKeydown);
els.toggleNotes.addEventListener("click", toggleNotesPanel);
setupPriorityPanelDrag();

function setupPriorityPanelDrag() {
  [
    { panel: els.taskPanel, name: "tasks" },
    { panel: els.notesPanel, name: "notes" }
  ].forEach(({ panel, name }) => {
    panel.addEventListener("dragstart", (event) => {
      if (state.appView !== "life" || isSubjectFolder(currentTopic().id)) {
        event.preventDefault();
        return;
      }
      if (event.target.closest(".task-item")) return;
      if (event.target.closest("input, textarea, button, select, form, .notes-editor, .notes-toolbar")) {
        event.preventDefault();
        return;
      }

      draggedPriorityPanel = name;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", name);
      window.requestAnimationFrame(() => panel.classList.add("panel-dragging"));
    });

    panel.addEventListener("dragend", () => {
      draggedPriorityPanel = null;
      panel.classList.remove("panel-dragging");
      clearPriorityDropTargets();
    });

    panel.addEventListener("dragover", (event) => {
      if (!draggedPriorityPanel || draggedPriorityPanel === name) return;
      event.preventDefault();
      clearPriorityDropTargets(panel);
      panel.classList.add("panel-drop-target");
    });

    panel.addEventListener("dragleave", () => {
      panel.classList.remove("panel-drop-target");
    });

    panel.addEventListener("drop", (event) => {
      const panelName = draggedPriorityPanel || event.dataTransfer.getData("text/plain");
      if (!["tasks", "notes"].includes(panelName) || panelName === name) return;
      event.preventDefault();
      currentTopic().focusPanel = panelName;
      draggedPriorityPanel = null;
      clearPriorityDropTargets();
      saveState();
      render();
    });
  });
}

function clearPriorityDropTargets(exceptPanel) {
  [els.taskPanel, els.notesPanel].forEach((panel) => {
    if (panel !== exceptPanel) panel.classList.remove("panel-drop-target");
  });
}

function handleNoteKeydown(event) {
  if (event.key === "Tab") {
    event.preventDefault();
    adjustNoteIndent(event.shiftKey);
    return;
  }

  if (event.key === "Enter") {
    continueNoteBullet(event);
  }
}

function handleRichNoteKeydown(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    addNoteLink();
    return;
  }

  if (event.key === " " && autoformatNoteList()) {
    event.preventDefault();
    saveCurrentNotes();
    return;
  }

  if (event.key === "Tab") {
    event.preventDefault();
    document.execCommand(event.shiftKey ? "outdent" : "indent");
    saveCurrentNotes();
  }
}

function autoformatNoteList() {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount || !selection.isCollapsed || !selection.anchorNode) return false;
  const anchor = selection.anchorNode;
  const anchorElement = anchor.nodeType === Node.ELEMENT_NODE ? anchor : anchor.parentElement;
  if (!els.topicNotes.contains(anchorElement) && anchorElement !== els.topicNotes) return false;
  if (anchorElement?.closest("li")) return false;

  const block = anchorElement?.closest("p, div");
  const markerRange = selection.getRangeAt(0).cloneRange();
  if (block && block !== els.topicNotes) {
    markerRange.selectNodeContents(block);
    markerRange.setEnd(anchor, selection.anchorOffset);
  } else if (anchor.nodeType === Node.TEXT_NODE && anchor.parentElement === els.topicNotes) {
    markerRange.setStart(anchor, 0);
  } else {
    return false;
  }

  const marker = markerRange.toString().trim();
  const command = /^1[.)]$/.test(marker)
    ? "insertOrderedList"
    : /^[-*]$/.test(marker)
      ? "insertUnorderedList"
      : "";
  if (!command) return false;

  markerRange.deleteContents();
  markerRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(markerRange);
  document.execCommand(command);
  return true;
}

function addNoteLink() {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim() || "";
  const existingLink = selectedNoteLink();
  const savedRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
  const text = window.prompt("Link text", existingLink?.textContent || selectedText || "");
  if (!text) return;

  const url = window.prompt("Link URL", existingLink?.getAttribute("href") || "");
  if (!url) return;

  const href = normalizeLinkUrl(url);
  if (savedRange && selection) {
    selection.removeAllRanges();
    selection.addRange(savedRange);
  }
  if (existingLink) {
    existingLink.textContent = text;
    existingLink.setAttribute("href", href);
    existingLink.setAttribute("target", "_blank");
    existingLink.setAttribute("rel", "noopener noreferrer");
  } else if (!selectedText) {
    document.execCommand("insertHTML", false, `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`);
  } else {
    document.execCommand("createLink", false, href);
    selection.anchorNode?.parentElement?.closest("a")?.setAttribute("target", "_blank");
    selection.anchorNode?.parentElement?.closest("a")?.setAttribute("rel", "noopener noreferrer");
  }
  saveCurrentNotes();
}

function selectedNoteLink() {
  const selection = window.getSelection();
  if (!selection || !selection.anchorNode) return null;
  const element = selection.anchorNode.nodeType === Node.ELEMENT_NODE
    ? selection.anchorNode
    : selection.anchorNode.parentElement;
  return element?.closest?.("a") || null;
}

function normalizeLinkUrl(value) {
  const trimmed = String(value || "").trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function toggleNotesPanel() {
  const collapsed = !els.notesPanel.classList.contains("notes-collapsed");
  els.notesPanel.classList.toggle("notes-collapsed", collapsed);
  els.toggleNotes.setAttribute("aria-label", collapsed ? "Expand notes" : "Minimize notes");
  els.toggleNotes.title = collapsed ? "Expand notes" : "Minimize notes";
}

function addBrainNote(event) {
  event.preventDefault();
  const title = els.brainNoteNewTitle.value.trim() || "Untitled scrap";
  const now = Date.now();
  const note = {
    id: createId(),
    title,
    body: "",
    state: "messy",
    createdAt: now,
    updatedAt: now
  };
  state.brainNotes.unshift(note);
  state.selectedBrainNoteId = note.id;
  els.brainNoteNewTitle.value = "";
  saveState();
  renderBrainBoard();
  els.brainNoteBody.focus();
}

function selectBrainNote(noteId) {
  if (!state.brainNotes.some((note) => note.id === noteId)) return;
  state.selectedBrainNoteId = noteId;
  saveState();
  renderBrainBoard();
}

function updateSelectedBrainNote() {
  const note = selectedBrainNote();
  if (!note) return;
  note.title = els.brainNoteTitle.value.trim() || "Untitled scrap";
  note.body = els.brainNoteBody.value;
  note.state = els.brainNoteState.value;
  note.updatedAt = Date.now();
  saveState();
  renderBrainNoteList();
}

function deleteSelectedBrainNote() {
  const note = selectedBrainNote();
  if (!note) return;
  state.brainNotes = state.brainNotes.filter((item) => item.id !== note.id);
  state.selectedBrainNoteId = state.brainNotes[0]?.id || null;
  saveState();
  renderBrainBoard();
}

function selectedBrainNote() {
  return state.brainNotes.find((note) => note.id === state.selectedBrainNoteId) || null;
}

function adjustNoteIndent(outdent) {
  const textarea = els.topicNotes;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end);
  const selectionEnd = lineEnd === -1 ? value.length : lineEnd;
  const before = value.slice(0, lineStart);
  const block = value.slice(lineStart, selectionEnd);
  const after = value.slice(selectionEnd);
  const lines = block.split("\n");
  let delta = 0;

  const updated = lines.map((line) => {
    if (!outdent) {
      delta += 2;
      return `  ${line}`;
    }
    if (line.startsWith("  ")) {
      delta -= 2;
      return line.slice(2);
    }
    if (line.startsWith("\t")) {
      delta -= 1;
      return line.slice(1);
    }
    return line;
  }).join("\n");

  textarea.value = before + updated + after;
  const nextStart = Math.max(lineStart, start + (outdent ? Math.min(0, delta) : 2));
  const nextEnd = Math.max(nextStart, end + delta);
  textarea.setSelectionRange(nextStart, nextEnd);
  saveCurrentNotes();
}

function continueNoteBullet(event) {
  const textarea = els.topicNotes;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const currentLine = value.slice(lineStart, start);
  const match = currentLine.match(/^(\s*)([-*]|\d+[.)])\s(.*)$/);
  if (!match) return;

  event.preventDefault();
  const [, indent, marker, text] = match;
  const beforeLine = value.slice(0, lineStart);
  const afterSelection = value.slice(end);

  if (!text.trim()) {
    textarea.value = beforeLine + indent + afterSelection;
    const nextPosition = beforeLine.length + indent.length;
    textarea.setSelectionRange(nextPosition, nextPosition);
    saveCurrentNotes();
    return;
  }

  const nextMarker = nextNumberedMarker(marker);
  const insert = `\n${indent}${nextMarker} `;
  textarea.value = value.slice(0, start) + insert + afterSelection;
  const nextPosition = start + insert.length;
  renumberFollowingNumberedNotes(textarea, nextPosition, indent, nextMarker);
  textarea.setSelectionRange(nextPosition, nextPosition);
  saveCurrentNotes();
}

function nextNumberedMarker(marker) {
  const match = marker.match(/^(\d+)([.)])$/);
  if (!match) return marker;
  return `${Number(match[1]) + 1}${match[2]}`;
}

function renumberFollowingNumberedNotes(textarea, position, indent, marker) {
  const markerMatch = marker.match(/^(\d+)([.)])$/);
  if (!markerMatch) return;

  const value = textarea.value;
  const nextLineStart = value.indexOf("\n", position);
  if (nextLineStart === -1) return;

  const before = value.slice(0, nextLineStart + 1);
  const lines = value.slice(nextLineStart + 1).split("\n");
  const indentSize = indent.replace(/\t/g, "  ").length;
  let expected = Number(markerMatch[1]) + 1;
  let changed = false;
  let stopped = false;

  const updated = lines.map((line) => {
    if (stopped) return line;
    if (!line.trim()) return line;

    const lineMatch = line.match(/^(\s*)(\d+)([.)])\s(.*)$/);
    const lineIndent = lineMatch?.[1] || line.match(/^(\s*)/)?.[1] || "";
    const lineIndentSize = lineIndent.replace(/\t/g, "  ").length;

    if (lineIndentSize < indentSize) {
      stopped = true;
      return line;
    }
    if (lineIndentSize > indentSize) return line;
    if (!lineMatch || lineMatch[3] !== markerMatch[2]) {
      stopped = true;
      return line;
    }

    const nextLine = `${lineMatch[1]}${expected}${lineMatch[3]} ${lineMatch[4]}`;
    expected += 1;
    if (nextLine !== line) changed = true;
    return nextLine;
  });

  if (changed) textarea.value = before + updated.join("\n");
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return clone(defaultState);

  try {
    const parsed = JSON.parse(saved);
    if (!parsed.topics?.some((topic) => topic.id === "root")) {
      return clone(defaultState);
    }
    return parsed;
  } catch {
    return clone(defaultState);
  }
}

function ensureStateShape() {
  if (!state.appView) state.appView = "life";
  if (!Array.isArray(state.navigationHistory)) state.navigationHistory = [];
  navHistory = state.navigationHistory;
  if (!Number.isInteger(state.topicsPlacement)) state.topicsPlacement = 0;
  state.topicsPlacement = Math.max(0, Math.min(2, state.topicsPlacement));
  if (!Array.isArray(state.collapsedTopicIds)) state.collapsedTopicIds = [];
  if (!Array.isArray(state.hiddenExamTopicIds)) state.hiddenExamTopicIds = [];
  const now = new Date();
  if (!Number.isInteger(state.calendarYear)) state.calendarYear = now.getFullYear();
  if (!Number.isInteger(state.calendarMonth)) state.calendarMonth = now.getMonth();
  state.calendarMonth = Math.max(0, Math.min(11, state.calendarMonth));
  if (!state.selectedCalendarDate) state.selectedCalendarDate = todayKey();
  state.calendarPlannerOpen = Boolean(state.calendarPlannerOpen);
  if (!["on", "span"].includes(state.eventSpanMode)) state.eventSpanMode = "on";
  if (!["none", "at", "span"].includes(state.eventTimeMode)) state.eventTimeMode = "none";
  if (!state.taskFilter) state.taskFilter = "open";
  if (typeof state.taskSearch !== "string") state.taskSearch = "";
  if (!Array.isArray(state.brainNotes)) state.brainNotes = [];
  state.brainNotes = state.brainNotes
    .filter((note) => note && note.id)
    .map((note) => ({
      id: note.id,
      title: note.title || "Untitled scrap",
      body: note.body || "",
      state: ["messy", "maybe", "keep"].includes(note.state) ? note.state : "messy",
      createdAt: note.createdAt || Date.now(),
      updatedAt: note.updatedAt || note.createdAt || Date.now()
    }));
  if (state.brainNotes.length && !state.brainNotes.some((note) => note.id === state.selectedBrainNoteId)) {
    state.selectedBrainNoteId = [...state.brainNotes].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
  }
  if (!state.brainNotes.length) state.selectedBrainNoteId = null;
  if (!Array.isArray(state.habits)) state.habits = [];
  state.habits.forEach((habit) => {
    if (!Array.isArray(habit.completedDates)) habit.completedDates = [];
    if (!habit.createdAt) habit.createdAt = Date.now();
    if (typeof habit.order !== "number") habit.order = habit.createdAt || Date.now();
  });
  if (!Array.isArray(state.financeTransactions)) state.financeTransactions = [];
  state.financeTransactions = state.financeTransactions
    .filter((item) => item && item.id && item.name && Number(item.amount) > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      amount: Number(item.amount),
      type: item.type === "expense" ? "expense" : "income",
      date: item.date || todayKey(),
      source: item.source || "",
      createdAt: item.createdAt || Date.now()
    }));
  if (!Array.isArray(state.studyPlans)) state.studyPlans = [];
  state.studyPlans.forEach((plan) => {
    if (!plan.start) plan.start = dateKey(new Date(plan.createdAt || Date.now()));
    if (!plan.end) plan.end = plan.until || plan.start;
    if (!plan.until) plan.until = plan.end;
    if (plan.time && !plan.startTime) plan.startTime = plan.time;
    if (!plan.timeMode) plan.timeMode = plan.startTime ? "at" : "none";
    if (!plan.time) plan.time = plan.startTime || "";
    if (!plan.minutes) plan.minutes = null;
    if (!EVENT_CATEGORIES[plan.eventCategory]) plan.eventCategory = DEFAULT_EVENT_CATEGORY;
    if (!Number.isInteger(plan.eventColor) || plan.eventColor < 0 || plan.eventColor > 5) {
      plan.eventColor = EVENT_CATEGORIES[plan.eventCategory]?.color ?? eventColorIndex(plan.id);
    }
  });
  if (!state.timeTrackerDate) state.timeTrackerDate = todayKey();
  if (!["school", "summer"].includes(state.timeScheduleSeason)) state.timeScheduleSeason = seasonForDate(now);
  if (!Number.isInteger(state.timeScheduleDay) || state.timeScheduleDay < 0 || state.timeScheduleDay > 6) {
    state.timeScheduleDay = now.getDay();
  }
  if (!Array.isArray(state.sleepLogs)) state.sleepLogs = [];
  state.sleepLogs = state.sleepLogs
    .filter((log) => log && log.date && log.start && log.end)
    .map((log) => ({
      id: log.id || createId(),
      date: log.date,
      season: ["school", "summer"].includes(log.season) ? log.season : seasonForDate(new Date(`${log.date}T00:00`)),
      start: log.start,
      end: log.end,
      createdAt: log.createdAt || Date.now()
    }));
  if (!Array.isArray(state.timeBlocks)) state.timeBlocks = [];
  state.timeBlocks = state.timeBlocks.filter((block) => block && block.id && block.name);
  state.timeBlocks.forEach((block) => {
    if (!["actual", "ideal"].includes(block.kind)) block.kind = "ideal";
    if (!block.date && block.kind === "actual") block.date = state.timeTrackerDate;
    if (block.kind === "ideal" && (!Number.isInteger(block.dayOfWeek) || block.dayOfWeek < 0 || block.dayOfWeek > 6)) {
      block.dayOfWeek = state.timeScheduleDay;
    }
    if (block.kind === "ideal" && !Array.isArray(block.daysOfWeek)) block.daysOfWeek = [block.dayOfWeek];
    if (block.kind === "ideal") {
      block.daysOfWeek = [...new Set(block.daysOfWeek)]
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
        .sort((a, b) => a - b);
      if (!block.daysOfWeek.length) block.daysOfWeek = [block.dayOfWeek];
    }
    if (block.kind === "ideal" && !["school", "summer"].includes(block.season)) block.season = "school";
    if (!block.category) block.category = "other";
    block.instant = Boolean(block.instant || block.category === "food" && block.end === block.start);
    if (!block.start) block.start = "08:00";
    if (!block.end) block.end = "09:00";
  });
  state.topics.forEach((topic) => {
    if (!("view" in topic)) topic.view = "homework";
    if (!topic.icon) topic.icon = initials(topic.title);
    if (!topic.color) topic.color = "#4f6f52";
    if (!["tasks", "notes"].includes(topic.focusPanel)) topic.focusPanel = "tasks";
    if (typeof topic.order !== "number") topic.order = topic.createdAt || Date.now();
    if (topic.id === "root" && topic.title === "Grand Scheme") topic.title = "Life";
  });
  state.tasks.forEach((task) => {
    if (typeof task.order !== "number") task.order = task.createdAt || Date.now();
    if (!Array.isArray(task.subtasks)) task.subtasks = [];
  });
}

function nextTopicOrder(parentId) {
  const siblings = childrenOf(parentId);
  if (!siblings.length) return Date.now();
  return Math.max(...siblings.map((topic) => topic.order ?? topic.createdAt ?? 0)) + 1;
}

function reorderTopic(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const dragged = state.topics.find((topic) => topic.id === draggedId);
  const target = state.topics.find((topic) => topic.id === targetId);
  if (!dragged || !target || dragged.parentId !== target.parentId) return;

  const siblings = childrenOf(dragged.parentId);
  const withoutDragged = siblings.filter((topic) => topic.id !== draggedId);
  const targetIndex = withoutDragged.findIndex((topic) => topic.id === targetId);
  withoutDragged.splice(targetIndex, 0, dragged);
  withoutDragged.forEach((topic, index) => {
    topic.order = index + 1;
  });

  saveState();
  render();
}

function moveTopicHierarchy(draggedId, targetId, mode) {
  if (!draggedId || !targetId || draggedId === "root" || draggedId === targetId) return;

  const dragged = state.topics.find((topic) => topic.id === draggedId);
  const target = state.topics.find((topic) => topic.id === targetId);
  if (!dragged || !target || descendantIds(dragged.id).includes(target.id)) return;

  if (mode === "inside") {
    dragged.parentId = target.id;
    dragged.order = nextTopicOrder(target.id);
  } else {
    const parentId = target.parentId;
    if (!parentId) return;
    dragged.parentId = parentId;
    const siblings = childrenOf(parentId).filter((topic) => topic.id !== dragged.id);
    const targetIndex = siblings.findIndex((topic) => topic.id === target.id);
    const insertAt = mode === "before" ? targetIndex : targetIndex + 1;
    siblings.splice(insertAt, 0, dragged);
    siblings.forEach((topic, index) => {
      topic.order = index + 1;
    });
  }

  saveState();
  render();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function exportLifeAtlasData() {
  saveCurrentNotes();
  const backup = {
    app: "Life Atlas",
    version: 1,
    exportedAt: new Date().toISOString(),
    page: location.href,
    storageKey: STORAGE_KEY,
    data: state
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  downloadTextFile(`life-atlas-backup-${stamp}.json`, JSON.stringify(backup, null, 2), "application/json");
  showToast("Life Atlas backup exported.");
}

async function importLifeAtlasData(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const imported = parsed.data || parsed;
    if (!isValidLifeAtlasState(imported)) {
      showToast("That file does not look like a Life Atlas backup.");
      return;
    }
    if (!window.confirm("Import this backup? This replaces the current Life Atlas data in this browser.")) return;

    localStorage.setItem(`${STORAGE_KEY}-before-import`, JSON.stringify(state));
    state = imported;
    ensureStateShape();
    saveState();
    render();
    showToast("Backup imported.");
  } catch {
    showToast("Backup import failed. Try a Life Atlas JSON file.");
  }
}

function isValidLifeAtlasState(value) {
  return Boolean(value
    && Array.isArray(value.topics)
    && value.topics.some((topic) => topic.id === "root")
    && Array.isArray(value.tasks)
    && Array.isArray(value.habits)
    && Array.isArray(value.studyPlans));
}

function downloadTextFile(filename, text, type = "text/plain") {
  const blob = new Blob([text], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function saveCurrentNotes() {
  currentTopic().notes = normalizeNoteHtml(els.topicNotes.innerHTML);
  saveState();
}

function normalizeNoteHtml(value) {
  const container = document.createElement("div");
  container.innerHTML = String(value || "");
  container.querySelectorAll("script, style").forEach((node) => node.remove());
  container.querySelectorAll("a").forEach((link) => {
    link.setAttribute("target", "_blank");
    link.setAttribute("rel", "noopener noreferrer");
  });
  return container.innerHTML;
}

function noteHtml(value) {
  const raw = String(value || "");
  if (/<[a-z][\s\S]*>/i.test(raw)) return normalizeNoteHtml(raw);
  return escapeHtml(raw).replace(/\n/g, "<br>");
}

function currentTopic() {
  return state.topics.find((topic) => topic.id === state.selectedTopicId) || state.topics[0];
}

function childrenOf(topicId) {
  return state.topics
    .filter((topic) => topic.parentId === topicId)
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
}

function descendantIds(topicId) {
  const ids = [topicId];
  childrenOf(topicId).forEach((child) => ids.push(...descendantIds(child.id)));
  return ids;
}

function selectTopic(topicId, remember = true, options = {}) {
  if (state.selectedTopicId === topicId && state.appView === "life") return;
  if (remember) pushHistory();
  const previousTopicId = state.selectedTopicId;
  state.appView = "life";
  state.selectedTopicId = topicId;
  if (options.collapsePrevious && previousTopicId !== "root" && childrenOf(previousTopicId).length && !isCollapsed(previousTopicId)) {
    state.collapsedTopicIds.push(previousTopicId);
  }
  saveState();
  render();
}

function openAppView(appView) {
  if (!appView || appView === state.appView) return;
  pushHistory();
  state.appView = appView;
  saveState();
  render();
}

function pushHistory() {
  const last = navHistory[navHistory.length - 1];
  const next = {
    appView: state.appView || "life",
    selectedTopicId: state.selectedTopicId
  };

  if (last && last.appView === next.appView && last.selectedTopicId === next.selectedTopicId) return;
  navHistory.push(next);
  state.navigationHistory = navHistory.slice(-50);
  navHistory = state.navigationHistory;
}

function goBack() {
  const previous = navHistory.pop();
  if (previous) {
    state.appView = previous.appView || "life";
    state.selectedTopicId = state.topics.some((topic) => topic.id === previous.selectedTopicId)
      ? previous.selectedTopicId
      : "root";
  } else if (state.appView !== "life") {
    state.appView = "life";
  } else {
    const parentId = currentTopic().parentId;
    if (!parentId) return;
    state.selectedTopicId = parentId;
  }
  state.navigationHistory = navHistory;
  saveState();
  render();
}

function canGoBack() {
  return navHistory.length > 0 || state.appView !== "life" || Boolean(currentTopic().parentId);
}

function topicPath(topicId) {
  const path = [];
  let topic = state.topics.find((item) => item.id === topicId);

  while (topic) {
    path.unshift(topic);
    topic = state.topics.find((item) => item.id === topic.parentId);
  }

  return path;
}

function isSubjectFolder(topicId) {
  const path = topicPath(topicId);
  const academicIndex = path.findIndex((topic) => ["academic subjects", "school subjects"].includes(topic.title.toLowerCase()));
  return academicIndex >= 0 && path.length > academicIndex + 1;
}

function expandAncestors(topicId) {
  const ancestorIds = topicPath(topicId).map((topic) => topic.id);
  state.collapsedTopicIds = state.collapsedTopicIds.filter((id) => !ancestorIds.includes(id));
}

function isCollapsed(topicId) {
  return state.collapsedTopicIds.includes(topicId);
}

function toggleCollapsed(topicId) {
  if (isCollapsed(topicId)) {
    state.collapsedTopicIds = state.collapsedTopicIds.filter((id) => id !== topicId);
  } else {
    state.collapsedTopicIds.push(topicId);
  }

  saveState();
  render();
}

function addTopic(parentId, name) {
  const topic = {
    id: createId(),
    parentId,
    title: name.trim(),
    notes: "",
    icon: normalizeIcon(els.folderIconInput.value, name),
    color: selectedFolderColor(),
    order: nextTopicOrder(parentId),
    createdAt: Date.now()
  };

  state.topics.push(topic);
  saveState();
  render();
  showToast("Area added.");
}

function renameCurrentTopic() {
  const topic = currentTopic();
  openFolderModal("rename", topic.parentId || "root", topic.title);
}

function openFolderModal(mode, parentId, initialName = "") {
  const topic = mode === "rename" ? currentTopic() : null;
  folderModalMode = mode;
  folderModalParentId = parentId;
  els.folderModalKicker.textContent = mode === "rename" ? "Rename area" : "New area";
  els.folderModalTitle.textContent = mode === "rename" ? "Rename this area" : "Name this life area";
  els.folderNameInput.value = initialName;
  els.folderIconInput.value = topic?.icon || initials(initialName);
  setFolderColor(topic?.color || "#4f6f52");
  updateFolderColorPreview();
  resetModalPosition();
  els.folderModal.hidden = false;
  window.setTimeout(() => els.folderNameInput.focus(), 0);
}

function closeFolderModal() {
  els.folderModal.hidden = true;
  els.folderNameInput.value = "";
  resetModalPosition();
}

function updateFolderColorPreview() {
  const option = els.folderColorInput.selectedOptions[0];
  els.folderColorSwatch.style.background = selectedFolderColor();
  els.folderColorName.textContent = option?.textContent || "Sage";
}

function selectedFolderColor() {
  return els.folderColorInput.value || "#4f6f52";
}

function setFolderColor(color) {
  const known = Array.from(els.folderColorInput.options).some((option) => option.value === color);
  els.folderColorInput.value = known ? color : "#4f6f52";
}

function startModalDrag(event) {
  if (event.button !== 0) return;
  const rect = els.folderForm.getBoundingClientRect();
  modalDragState = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top
  };
  els.folderForm.style.position = "fixed";
  els.folderForm.style.margin = "0";
  event.preventDefault();
}

function moveModalDrag(event) {
  if (!modalDragState) return;
  const left = event.clientX - modalDragState.offsetX;
  const top = event.clientY - modalDragState.offsetY;
  els.folderForm.style.left = `${left}px`;
  els.folderForm.style.top = `${top}px`;
}

function stopModalDrag() {
  modalDragState = null;
}

function resetModalPosition() {
  modalDragState = null;
  els.folderForm.style.position = "";
  els.folderForm.style.left = "";
  els.folderForm.style.top = "";
  els.folderForm.style.margin = "";
}

function saveFolderModal(event) {
  event.preventDefault();
  const name = els.folderNameInput.value.trim();
  if (!name) return;

  if (folderModalMode === "rename") {
    const topic = currentTopic();
    topic.title = name;
    topic.icon = normalizeIcon(els.folderIconInput.value, name);
    topic.color = selectedFolderColor();
    showToast("Area renamed.");
  } else {
    addTopic(folderModalParentId, name);
  }

  saveState();
  closeFolderModal();
  render();
}

function deleteCurrentTopic() {
  deleteTopic(currentTopic().id);
}

function deleteTopic(topicId) {
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) return;

  if (topic.id === "root") {
    showToast("Life stays at the top.");
    return;
  }

  pendingDeleteTopicId = topic.id;
  els.deleteModalTitle.textContent = `Remove "${topic.title}"?`;
  els.deleteModalCopy.textContent = "This also removes its smaller areas, tasks, notes, and exams.";
  els.deleteModal.hidden = false;
}

function closeDeleteModal() {
  pendingDeleteTopicId = null;
  els.deleteModal.hidden = true;
}

function confirmDeleteTopic() {
  const topic = state.topics.find((item) => item.id === pendingDeleteTopicId);
  if (!topic) {
    closeDeleteModal();
    return;
  }

  const ids = descendantIds(topic.id);
  state.topics = state.topics.filter((item) => !ids.includes(item.id));
  state.tasks = state.tasks.filter((task) => !ids.includes(task.topicId));
  state.exams = state.exams.filter((exam) => !ids.includes(exam.topicId));
  state.collapsedTopicIds = state.collapsedTopicIds.filter((id) => !ids.includes(id));
  if (ids.includes(state.selectedTopicId)) {
    state.selectedTopicId = topic.parentId || "root";
  }
  saveState();
  closeDeleteModal();
  render();
  showToast("Area deleted.");
}

function addTask(event) {
  event.preventDefault();
  const text = els.taskInput.value.trim();
  if (!text) return;

  state.tasks.push({
    id: createId(),
    topicId: state.selectedTopicId,
    text,
    done: false,
    order: nextTaskOrder(state.selectedTopicId),
    subtasks: [],
    createdAt: Date.now()
  });

  els.taskInput.value = "";
  saveState();
  render();
}

function toggleTask(taskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;

  task.done = !task.done;
  saveState();
  render();

  const row = document.querySelector(`[data-task-id="${taskId}"]`);
  row?.classList.add("pop");
  if (task.done) celebrate();
}

function visibleTaskMatches(task) {
  const filter = state.taskFilter || "open";
  const query = (state.taskSearch || "").trim().toLowerCase();
  if (filter === "open" && task.done) return false;
  if (filter === "done" && !task.done) return false;
  if (!query) return true;
  const haystack = [
    task.text,
    topicTitle(task.topicId),
    ...(task.subtasks || []).map((subtask) => subtask.text)
  ].join(" ").toLowerCase();
  return haystack.includes(query);
}

function toggleTaskDetails(taskId) {
  expandedTaskId = expandedTaskId === taskId ? null : taskId;
  render();
}

function deleteTask(taskId) {
  state.tasks = state.tasks.filter((task) => task.id !== taskId);
  saveState();
  render();
}

function nextTaskOrder(topicId) {
  if (!state.tasks.length) return Date.now();
  return Math.min(...state.tasks.map((task) => task.order ?? task.createdAt ?? 0)) - 1;
}

function reorderTask(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const dragged = state.tasks.find((task) => task.id === draggedId);
  const target = state.tasks.find((task) => task.id === targetId);
  if (!dragged || !target || dragged.topicId !== target.topicId) return;

  const siblings = state.tasks
    .filter((task) => task.topicId === dragged.topicId)
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  const withoutDragged = siblings.filter((task) => task.id !== draggedId);
  const targetIndex = withoutDragged.findIndex((task) => task.id === targetId);
  withoutDragged.splice(targetIndex, 0, dragged);
  withoutDragged.forEach((task, index) => {
    task.order = index + 1;
  });

  saveState();
  render();
}

function addSubtask(event, taskId) {
  event.preventDefault();
  const input = event.currentTarget.querySelector("input");
  const text = input.value.trim();
  if (!text) return;

  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  task.subtasks.push({
    id: createId(),
    text,
    done: false,
    createdAt: Date.now()
  });

  saveState();
  render();
}

function toggleSubtask(taskId, subtaskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  const subtask = task?.subtasks?.find((item) => item.id === subtaskId);
  if (!subtask) return;
  subtask.done = !subtask.done;
  saveState();
  render();
}

function deleteSubtask(taskId, subtaskId) {
  const task = state.tasks.find((item) => item.id === taskId);
  if (!task) return;
  task.subtasks = task.subtasks.filter((item) => item.id !== subtaskId);
  saveState();
  render();
}

function addHabit(event) {
  event.preventDefault();
  const name = els.habitInput.value.trim();
  if (!name) return;

  state.habits.push({
    id: createId(),
    name,
    completedDates: [],
    order: nextHabitOrder(),
    createdAt: Date.now()
  });

  els.habitInput.value = "";
  saveState();
  render();
}

function selectedHabitDate() {
  return els.habitDate.value || todayKey();
}

function toggleHabit(habitId, key = selectedHabitDate()) {
  const habit = state.habits.find((item) => item.id === habitId);
  if (!habit) return;

  habit.completedDates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
  if (habit.completedDates.includes(key)) {
    habit.completedDates = habit.completedDates.filter((date) => date !== key);
  } else {
    habit.completedDates.push(key);
    if (key === todayKey()) celebrate();
  }

  saveState();
  render();
}

function deleteHabit(habitId) {
  state.habits = state.habits.filter((habit) => habit.id !== habitId);
  saveState();
  render();
}

function nextHabitOrder() {
  if (!state.habits.length) return Date.now();
  return Math.max(...state.habits.map((habit) => habit.order ?? habit.createdAt ?? 0)) + 1;
}

function reorderHabit(draggedId, targetId) {
  if (!draggedId || !targetId || draggedId === targetId) return;

  const habits = [...state.habits].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  const draggedIndex = habits.findIndex((habit) => habit.id === draggedId);
  const targetIndex = habits.findIndex((habit) => habit.id === targetId);
  if (draggedIndex < 0 || targetIndex < 0) return;

  const [moved] = habits.splice(draggedIndex, 1);
  habits.splice(targetIndex, 0, moved);
  habits.forEach((habit, index) => {
    habit.order = index + 1;
  });
  saveState();
  render();
}

function addFinanceTransaction(event) {
  event.preventDefault();
  const name = els.financeName.value.trim();
  const amount = Number(els.financeAmount.value);
  if (!name || !Number.isFinite(amount) || amount <= 0) return;

  state.financeTransactions.push({
    id: createId(),
    name,
    amount,
    type: els.financeType.value === "expense" ? "expense" : "income",
    date: els.financeDate.value || todayKey(),
    source: els.financeSource.value.trim(),
    createdAt: Date.now()
  });

  els.financeName.value = "";
  els.financeAmount.value = "";
  els.financeSource.value = "";
  els.financeDate.value = todayKey();
  saveState();
  render();
}

function deleteFinanceTransaction(id) {
  state.financeTransactions = state.financeTransactions.filter((item) => item.id !== id);
  saveState();
  render();
}

function addCalendarEvent() {
  const name = els.eventName.value.trim();
  const start = els.eventStart.value || state.selectedCalendarDate || todayKey();
  const end = state.eventSpanMode === "span" ? (els.eventEnd.value || start) : start;
  const timeMode = state.eventTimeMode || "none";
  const startTime = timeMode === "none" ? "" : els.eventTime.value;
  let endTime = timeMode === "span" ? els.eventEndTime.value : "";
  if (!name || !start) return;
  if ((timeMode === "at" || timeMode === "span") && !startTime) return;
  if (timeMode === "span" && (!endTime || (start === end && endTime <= startTime))) {
    endTime = nextTimeValue(startTime, 60);
  }

  const existing = editingEventId ? state.studyPlans.find((plan) => plan.id === editingEventId) : null;
  const eventData = {
    id: existing?.id || createId(),
    topicId: existing?.topicId || state.selectedTopicId,
    name,
    start: start <= end ? start : end,
    end: end >= start ? end : start,
    until: end >= start ? end : start,
    timeMode,
    startTime,
    endTime,
    minutes: timeMode === "at" ? Number(els.eventMinutes.value) || null : null,
    time: startTime,
    eventCategory: selectedEventCategory(),
    eventColor: selectedEventColor(),
    createdAt: existing?.createdAt || Date.now()
  };

  if (existing) {
    Object.assign(existing, eventData);
  } else {
    state.studyPlans.push(eventData);
  }

  clearEventForm();
  state.calendarPlannerOpen = false;
  saveState();
  render();
}

function deleteStudyPlan(planId) {
  state.studyPlans = state.studyPlans.filter((plan) => plan.id !== planId);
  if (editingEventId === planId) {
    editingEventId = null;
    state.calendarPlannerOpen = false;
  }
  saveState();
  render();
}

function addExam(event) {
  event.preventDefault();
  const name = els.examName.value.trim();
  const when = selectedExamDateTime();
  if (!name || !when) return;

  state.exams.push({
    id: createId(),
    topicId: state.selectedTopicId,
    name,
    when,
    reminderDays: Number(els.examReminder.value),
    alertedAt: null,
    createdAt: Date.now()
  });

  els.examForm.reset();
  populateExamSelectors();
  els.examReminder.value = "7";
  saveState();
  render();
  showToast("Exam added. Export it to Calendar for iPhone and laptop alerts.");
}

function selectedExamDateTime() {
  const month = Number(els.examMonth.value);
  const day = Number(els.examDay.value);
  const year = Number(els.examYear.value);
  const time = els.examTime.value;
  if (!month || !day || !year || !time) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${time}`;
}

function populateExamSelectors() {
  const now = new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  els.examMonth.innerHTML = months
    .map((month, index) => `<option value="${index + 1}">${month}</option>`)
    .join("");
  els.examYear.innerHTML = Array.from({ length: 6 }, (_, index) => {
    const year = now.getFullYear() + index;
    return `<option value="${year}">${year}</option>`;
  }).join("");
  els.examTime.innerHTML = buildTimeOptions();

  els.examMonth.value = String(now.getMonth() + 1);
  els.examYear.value = String(now.getFullYear());
  updateExamDays(now.getDate());
  els.examTime.value = "08:00";
}

function populateCalendarControls() {
  renderCalendarMonthStrip();
  renderTimeWheel(els.eventTimeWheel, "18:00");
  renderTimeWheel(els.eventEndTimeWheel, "19:00");
}

function renderCalendarMonthStrip() {
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(2026, index, 1))
  );
  els.calendarMonthStrip.innerHTML = months
    .map((month, index) => `<button type="button" data-calendar-month="${index}" class="${index === state.calendarMonth ? "active" : ""}">${month}</button>`)
    .join("");
}

function initializeEventDefaults() {
  const selected = editingEventId ? (els.eventStart.value || state.selectedCalendarDate || todayKey()) : (state.selectedCalendarDate || todayKey());
  const timeMode = state.eventTimeMode || "none";
  els.eventStart.value = selected;
  els.eventEnd.value = els.eventEnd.value || selected;
  els.eventEnd.min = selected;
  els.eventEndLabel.hidden = state.eventSpanMode !== "span";
  els.eventSpanMode.querySelectorAll("[data-span-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.spanMode === state.eventSpanMode);
  });
  els.eventTimeMode.querySelectorAll("[data-time-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.timeMode === timeMode);
  });
  els.eventTimeLabel.hidden = timeMode === "none";
  els.eventEndTimeLabel.hidden = timeMode !== "span";
  els.eventMinutesLabel.hidden = timeMode !== "at";
  if (timeMode !== "none" && !els.eventTime.value) setTimePickerValue("start", "18:00");
  if (timeMode === "span" && !els.eventEndTime.value) setTimePickerValue("end", nextTimeValue(els.eventTime.value || "18:00", 60));
  syncTimeWheel(els.eventTimeWheel, els.eventTime.value || "18:00");
  syncTimeWheel(els.eventEndTimeWheel, els.eventEndTime.value || nextTimeValue(els.eventTime.value || "18:00", 60));
}

function changeCalendarMonth(delta) {
  const date = new Date(state.calendarYear, state.calendarMonth + delta, 1);
  state.calendarYear = date.getFullYear();
  state.calendarMonth = date.getMonth();
  saveState();
  render();
}

function selectCalendarDate(key) {
  if (state.selectedCalendarDate === key && state.calendarPlannerOpen) {
    closeCalendarPlanner();
    return;
  }

  clearEventForm();
  state.selectedCalendarDate = key;
  state.calendarPlannerOpen = true;
  const date = new Date(`${key}T00:00`);
  state.calendarYear = date.getFullYear();
  state.calendarMonth = date.getMonth();
  saveState();
  render();
}

function closeCalendarPlanner() {
  clearEventForm();
  state.calendarPlannerOpen = false;
  saveState();
  render();
}

function openEventEditor(planId, key) {
  const plan = state.studyPlans.find((item) => item.id === planId);
  if (!plan) return;
  const start = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
  const end = plan.end || plan.until || start;

  editingEventId = plan.id;
  state.selectedCalendarDate = key || start;
  state.calendarPlannerOpen = true;
  state.eventSpanMode = start !== end ? "span" : "on";
  state.eventTimeMode = plan.timeMode || (eventStartTime(plan) ? "at" : "none");

  els.eventName.value = plan.name || "";
  els.eventStart.value = start;
  els.eventEnd.value = end;
  els.eventMinutes.value = plan.minutes || "";
  setEventStyle(plan.eventCategory || DEFAULT_EVENT_CATEGORY, eventDisplayColor(plan));
  setTimePickerValue("start", eventStartTime(plan) || "18:00");
  setTimePickerValue("end", eventEndTime(plan) || nextTimeValue(eventStartTime(plan) || "18:00", 60));
  saveState();
  render();
}

function clearEventForm() {
  editingEventId = null;
  els.eventName.value = "";
  els.eventStart.value = "";
  els.eventEnd.value = "";
  els.eventMinutes.value = "";
  els.eventTime.value = "";
  els.eventEndTime.value = "";
  state.eventTimeMode = "none";
  state.eventSpanMode = "on";
  setEventStyle(DEFAULT_EVENT_CATEGORY, EVENT_CATEGORIES[DEFAULT_EVENT_CATEGORY].color);
}

function setEventStyle(category, color) {
  const safeCategory = EVENT_CATEGORIES[category] ? category : DEFAULT_EVENT_CATEGORY;
  const safeColor = Number.isInteger(color) && color >= 0 && color <= 5
    ? color
    : EVENT_CATEGORIES[safeCategory].color;

  els.eventCategoryControls.querySelectorAll("[data-event-category]").forEach((button) => {
    button.classList.toggle("active", button.dataset.eventCategory === safeCategory);
  });
  els.eventColorPalette.querySelectorAll("[data-event-color]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.eventColor) === safeColor);
  });
}

function selectedEventCategory() {
  return els.eventCategoryControls.querySelector("[data-event-category].active")?.dataset.eventCategory || DEFAULT_EVENT_CATEGORY;
}

function selectedEventColor() {
  const value = Number(els.eventColorPalette.querySelector("[data-event-color].active")?.dataset.eventColor);
  return Number.isInteger(value) ? value : EVENT_CATEGORIES[selectedEventCategory()].color;
}

function updateExamDays(preferredDay = Number(els.examDay.value) || 1) {
  const month = Number(els.examMonth.value);
  const year = Number(els.examYear.value);
  const days = new Date(year, month, 0).getDate();
  const selected = Math.min(preferredDay, days);

  els.examDay.innerHTML = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    return `<option value="${day}">${day}</option>`;
  }).join("");
  els.examDay.value = String(selected);
}

function buildTimeOptions() {
  const options = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    for (let minuteValue = 0; minuteValue < 60; minuteValue += 5) {
      const minute = String(minuteValue).padStart(2, "0");
      const value = `${String(hour).padStart(2, "0")}:${minute}`;
      const hour12 = hour % 12 || 12;
      const suffix = hour < 12 ? "AM" : "PM";
      options.push(`<option value="${value}">${hour12}:${minute} ${suffix}</option>`);
    }
  }
  return options.join("");
}

function renderTimeWheel(wheel, value) {
  const parsed = parseTimeValue(value);
  const hours = Array.from({ length: 12 }, (_, index) => index + 1);
  const minutes = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
  const minuteCycles = Array.from({ length: 3 }, () => minutes).flat();
  const periods = ["AM", "PM"];

  wheel.innerHTML = `
    <div class="time-wheel-column" data-time-part="hour">
      ${hours.map((hour) => `<button type="button" data-value="${hour}">${hour}</button>`).join("")}
    </div>
    <div class="time-wheel-column" data-time-part="minute">
      ${minuteCycles.map((minute, index) => `<button type="button" data-value="${minute}" data-cycle="${Math.floor(index / minutes.length)}">${minute}</button>`).join("")}
    </div>
    <div class="time-wheel-column" data-time-part="period">
      ${periods.map((period) => `<button type="button" data-value="${period}">${period}</button>`).join("")}
    </div>
  `;
  syncTimeWheel(wheel, toTimeValue(parsed.hour12, parsed.minute, parsed.period));
}

function handleTimeWheelClick(event, picker) {
  const button = event.target.closest("[data-value]");
  if (!button) return;

  const part = button.closest("[data-time-part]")?.dataset.timePart;
  const wheel = picker === "end" ? els.eventEndTimeWheel : els.eventTimeWheel;
  preserveTimeWheelScroll(wheel, () => {
    updateTimeWheelPart(picker, part, button.dataset.value, { center: false });
  });
}

function preserveTimeWheelScroll(wheel, action) {
  const positions = Array.from(wheel.querySelectorAll(".time-wheel-column")).map((column) => ({
    column,
    scrollTop: column.scrollTop
  }));
  action();
  const restore = () => {
    positions.forEach(({ column, scrollTop }) => {
      column.scrollTop = scrollTop;
    });
  };
  restore();
  window.requestAnimationFrame(restore);
}

function updateTimeWheelPart(picker, part, nextValue, options = {}) {
  const input = picker === "end" ? els.eventEndTime : els.eventTime;
  const current = parseTimeValue(input.value || (picker === "end" ? "19:00" : "18:00"));

  if (part === "hour") current.hour12 = Number(nextValue);
  if (part === "minute") current.minute = nextValue;
  if (part === "period") current.period = nextValue;

  const timeValue = toTimeValue(current.hour12, current.minute, current.period);
  setTimePickerValue(picker, timeValue, options);

  if (picker === "start" && (state.eventTimeMode || "none") === "span" && (!els.eventEndTime.value || els.eventEndTime.value <= timeValue)) {
    setTimePickerValue("end", nextTimeValue(timeValue, 60));
  }
}

function setTimePickerValue(picker, value, options = {}) {
  const shouldCenter = options.center !== false;
  if (picker === "end") {
    els.eventEndTime.value = value;
    syncTimeWheel(els.eventEndTimeWheel, value, { center: shouldCenter });
  } else {
    els.eventTime.value = value;
    syncTimeWheel(els.eventTimeWheel, value, { center: shouldCenter });
  }
}

function syncTimeWheel(wheel, value, options = {}) {
  const shouldCenter = options.center !== false;
  const parsed = parseTimeValue(value);
  const selected = {
    hour: String(parsed.hour12),
    minute: parsed.minute,
    period: parsed.period
  };

  wheel.querySelectorAll("[data-time-part]").forEach((column) => {
    const part = column.dataset.timePart;
    let centerButton = null;
    column.querySelectorAll("[data-value]").forEach((button) => {
      const active = button.dataset.value === selected[part];
      button.classList.toggle("active", active);
      if (active && shouldCenter && (!centerButton || button.dataset.cycle === "1")) {
        centerButton = button;
      }
    });
    if (centerButton) centerTimeWheelButton(centerButton);
  });
}

function centerTimeWheelButton(button) {
  const column = button.closest(".time-wheel-column");
  if (!column) return;
  const target = button.offsetTop - (column.clientHeight - button.offsetHeight) / 2;
  column.scrollTop = Math.max(0, target);
}

function parseTimeValue(value) {
  const [hourValue = "18", minuteValue = "00"] = String(value || "18:00").split(":");
  const hour24 = Number(hourValue);
  const minute = Math.min(55, Math.max(0, Math.round(Number(minuteValue) / 5) * 5));
  return {
    hour12: hour24 % 12 || 12,
    minute: String(minute).padStart(2, "0"),
    period: hour24 < 12 ? "AM" : "PM"
  };
}

function toTimeValue(hour12, minute, period) {
  let hour = Number(hour12) % 12;
  if (period === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function nextTimeValue(value, minutesToAdd) {
  const [hour = "18", minute = "00"] = String(value || "18:00").split(":");
  const date = new Date(2026, 0, 1, Number(hour), Number(minute));
  date.setMinutes(date.getMinutes() + minutesToAdd);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function deleteExam(examId) {
  state.exams = state.exams.filter((exam) => exam.id !== examId);
  saveState();
  render();
}

function openExamRenameModal(examId) {
  const exam = state.exams.find((item) => item.id === examId);
  if (!exam) return;

  pendingRenameExamId = exam.id;
  els.examRenameInput.value = exam.name;
  els.examRenameModal.hidden = false;
  window.setTimeout(() => els.examRenameInput.focus(), 0);
}

function closeExamRenameModal() {
  pendingRenameExamId = null;
  els.examRenameModal.hidden = true;
  els.examRenameInput.value = "";
}

function renameExam(event) {
  event.preventDefault();
  const exam = state.exams.find((item) => item.id === pendingRenameExamId);
  const name = els.examRenameInput.value.trim();
  if (!exam || !name) return;

  exam.name = name;
  saveState();
  closeExamRenameModal();
  render();
  showToast("Exam renamed.");
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    showToast("This browser does not support notifications.");
    return;
  }

  const result = await Notification.requestPermission();
  showToast(result === "granted" ? "Alerts enabled while this app is open." : "Alerts were not enabled.");
  checkExamAlerts();
}

function checkExamAlerts() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const now = Date.now();
  state.exams.forEach((exam) => {
    const examTime = new Date(exam.when).getTime();
    const reminderTime = examTime - exam.reminderDays * 24 * 60 * 60 * 1000;
    const alreadyToday = exam.alertedAt && now - exam.alertedAt < 18 * 60 * 60 * 1000;

    if (now >= reminderTime && now < examTime && !alreadyToday) {
      new Notification(`Upcoming exam: ${exam.name}`, {
        body: `${formatDateTime(exam.when)} in ${topicTitle(exam.topicId)}`
      });
      exam.alertedAt = now;
      saveState();
    }
  });
}

function exportCalendar() {
  const upcoming = state.exams
    .filter((exam) => new Date(exam.when).getTime() > Date.now())
    .sort((a, b) => new Date(a.when) - new Date(b.when));
  const upcomingEvents = state.studyPlans
    .filter((plan) => new Date(`${plan.end || plan.until || plan.start}T23:59`).getTime() > Date.now())
    .sort((a, b) => `${a.start || ""}${a.time || ""}`.localeCompare(`${b.start || ""}${b.time || ""}`));

  if (!upcoming.length && !upcomingEvents.length) {
    showToast("Add an exam or calendar event first.");
    return;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Life Atlas//Exam Tracker//EN"
  ];

  upcoming.forEach((exam) => {
    const start = new Date(exam.when);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${exam.id}@life-atlas`,
      `DTSTAMP:${icsDate(new Date())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeIcs(exam.name)}`,
      `DESCRIPTION:${escapeIcs(`Life Atlas area: ${topicTitle(exam.topicId)}`)}`,
      "BEGIN:VALARM",
      `TRIGGER:-P${exam.reminderDays}D`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeIcs(`Prepare for ${exam.name}`)}`,
      "END:VALARM",
      "END:VEVENT"
    );
  });

  upcomingEvents.forEach((plan) => {
    const startDate = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
    const endDate = plan.end || plan.until || startDate;
    const eventLines = [
      "BEGIN:VEVENT",
      `UID:${plan.id}@life-atlas`,
      `DTSTAMP:${icsDate(new Date())}`,
      `SUMMARY:${escapeIcs(plan.name)}`,
      `DESCRIPTION:${escapeIcs(`Life Atlas area: ${topicTitle(plan.topicId)}`)}`
    ];

    if (eventStartTime(plan)) {
      const startTime = eventStartTime(plan);
      const endTime = eventEndTime(plan) || startTime;
      const start = new Date(`${startDate}T${startTime}`);
      const end = plan.timeMode === "span"
        ? new Date(`${endDate}T${endTime}`)
        : new Date(new Date(`${endDate}T${startTime}`).getTime() + (Number(plan.minutes) || 30) * 60 * 1000);
      eventLines.push(
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT15M",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcs(plan.name)}`,
        "END:VALARM"
      );
    } else {
      const allDayEnd = new Date(`${endDate}T00:00`);
      allDayEnd.setDate(allDayEnd.getDate() + 1);
      eventLines.push(
        `DTSTART;VALUE=DATE:${compactDate(startDate)}`,
        `DTEND;VALUE=DATE:${compactDate(dateKey(allDayEnd))}`
      );
    }

    eventLines.push("END:VEVENT");
    lines.push(...eventLines);
  });

  lines.push("END:VCALENDAR");

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "life-atlas-exams.ics";
  link.click();
  URL.revokeObjectURL(url);
  showToast("Calendar file exported with exams and events.");
}

function nextLifeEvent() {
  const now = Date.now();
  const today = todayKey();
  const exams = state.exams.map((exam) => ({
    name: exam.name,
    when: exam.when,
    sortTime: new Date(exam.when).getTime()
  }));
  const events = state.studyPlans.map((plan) => {
    const start = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
    const startTime = eventStartTime(plan);
    const when = startTime ? `${start}T${startTime}` : `${start}T00:00`;
    return {
      name: plan.name,
      when,
      sortTime: new Date(when).getTime(),
      allDay: !startTime,
      start
    };
  });

  return [...exams, ...events]
    .filter((item) => item.allDay ? item.start >= today : item.sortTime > now)
    .sort((a, b) => a.sortTime - b.sortTime)[0] || null;
}

function render() {
  const topic = currentTopic();
  const appView = state.appView || "life";
  document.body.dataset.appView = appView;
  const subjectMode = isSubjectFolder(topic.id);
  const view = subjectMode ? topic.view || "topics" : "";
  const ids = descendantIds(topic.id);
  const visibleTasks = state.tasks
    .filter((task) => ids.includes(task.topicId))
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  const visibleExams = state.exams
    .filter((exam) => appView === "exams" || ids.includes(exam.topicId))
    .sort((a, b) => new Date(a.when) - new Date(b.when));
  const next = nextLifeEvent();

  els.currentTitle.textContent = appView === "life" ? topic.title : titleForAppView(appView);
  els.currentKicker.textContent = appView === "life" ? "Current area" : "Current section";
  els.breadcrumbs.hidden = appView !== "life";
  els.backButton.disabled = !canGoBack();
  els.deleteTopic.disabled = topic.id === "root" || appView !== "life";
  els.renameTopic.hidden = appView !== "life";
  els.deleteTopic.hidden = appView !== "life";
  if (document.activeElement !== els.topicNotes) {
    els.topicNotes.innerHTML = noteHtml(topic.notes || "");
  }
  els.openTaskCount.textContent = state.tasks.filter((task) => !task.done).length;
  els.topicCount.textContent = String(state.topics.length - 1);
  els.nextExam.textContent = next ? `${next.name} - ${shortDate(next.when)}` : "None";
  const examTileHidden = state.hiddenExamTopicIds.includes(topic.id) || appView !== "life";
  els.nextExamMetric.hidden = examTileHidden;
  els.showNextExam.hidden = appView !== "life" || !state.hiddenExamTopicIds.includes(topic.id);
  els.taskSearch.value = state.taskSearch || "";
  els.taskFilter.querySelectorAll("[data-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === (state.taskFilter || "open"));
  });
  els.sidebar.classList.toggle("section-mode", appView !== "life");
  els.contentGrid.dataset.appView = appView;
  els.contentGrid.classList.toggle("folder-focus", appView === "life" && topic.id !== "root" && !subjectMode);
  els.contentGrid.classList.toggle("subject-mode", appView === "life" && subjectMode);
  els.contentGrid.dataset.view = view;
  els.contentGrid.dataset.focusPanel = topic.focusPanel || "tasks";
  applyTopicsPlacement();
  els.subjectTabs.hidden = appView !== "life" || !subjectMode;
  els.subjectTabs.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelector(".task-panel h3").textContent = subjectMode ? "Homework" : "Tasks";
  els.appNav.querySelectorAll("[data-app-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.appView === appView);
  });

  renderTree();
  renderBreadcrumbs(topic.id);
  renderChildren(topic.id);
  renderTasks(visibleTasks, topic.id);
  renderExams(visibleExams);
  renderHabits();
  renderFinance();
  renderCalendar();
  renderTimeTracker();
  renderBrainBoard();
}

function applyTopicsPlacement() {
  const focusPanel = currentTopic().focusPanel === "notes" ? "notes" : "tasks";
  const orders = focusPanel === "notes"
    ? { folder: 1, notes: 2, task: 3 }
    : { folder: 1, task: 2, notes: 3 };

  els.folderPanel.style.order = orders.folder;
  els.taskPanel.style.order = orders.task;
  els.notesPanel.style.order = orders.notes;
  els.taskPanel.classList.toggle("primary-panel", focusPanel === "tasks");
  els.notesPanel.classList.toggle("primary-panel", focusPanel === "notes");
}

function titleForAppView(appView) {
  return {
    calendar: "Calendar",
    brain: "Blabber Board",
    finance: "Money",
    time: "Schedule",
    habits: "Habit Tracker",
    exams: "Big Exams"
  }[appView] || "Life";
}

function renderBreadcrumbs(topicId) {
  els.breadcrumbs.innerHTML = "";
  topicPath(topicId).forEach((topic, index, path) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = topic.title;
    button.addEventListener("click", () => selectTopic(topic.id));
    els.breadcrumbs.appendChild(button);

    if (index < path.length - 1) {
      const separator = document.createElement("span");
      separator.textContent = "/";
      els.breadcrumbs.appendChild(separator);
    }
  });
}

function renderTree() {
  els.topicTree.innerHTML = "";
  renderTreeBranch("root", 0);
}

function renderTreeBranch(topicId, depth) {
  const topic = state.topics.find((item) => item.id === topicId);
  if (!topic) return;
  const children = childrenOf(topic.id);
  const collapsed = isCollapsed(topic.id);

  const item = document.createElement("div");
  item.className = "tree-item tree-indent";
  item.style.setProperty("--depth", depth);
  item.dataset.topicId = topic.id;
  item.draggable = topic.id !== "root";
  item.addEventListener("dragstart", (event) => {
    if (topic.id === "root" || event.target.closest("button") !== button) {
      event.preventDefault();
      return;
    }
    sidebarDraggedTopicId = topic.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", topic.id);
    window.requestAnimationFrame(() => item.classList.add("sidebar-dragging"));
  });
  item.addEventListener("dragend", () => {
    sidebarDraggedTopicId = null;
    item.classList.remove("sidebar-dragging");
    clearSidebarDropStates();
  });
  item.addEventListener("dragover", (event) => {
    if (!sidebarDraggedTopicId || sidebarDraggedTopicId === topic.id) return;
    event.preventDefault();
    clearSidebarDropStates();
    const rect = item.getBoundingClientRect();
    const offset = event.clientY - rect.top;
    sidebarDropMode = offset < rect.height * 0.25 ? "before" : offset > rect.height * 0.75 ? "after" : "inside";
    item.classList.add(`drop-${sidebarDropMode}`);
  });
  item.addEventListener("drop", (event) => {
    event.preventDefault();
    const draggedId = sidebarDraggedTopicId || event.dataTransfer.getData("text/plain");
    clearSidebarDropStates();
    sidebarDraggedTopicId = null;
    moveTopicHierarchy(draggedId, topic.id, sidebarDropMode);
  });

  const collapseButton = document.createElement("button");
  collapseButton.type = "button";
  collapseButton.className = "tree-collapse";
  collapseButton.setAttribute("aria-label", collapsed ? `Expand ${topic.title}` : `Collapse ${topic.title}`);
  const canCollapse = children.length > 0;
  collapseButton.textContent = canCollapse ? (collapsed ? ">" : "v") : "";
  collapseButton.disabled = !canCollapse;
  collapseButton.addEventListener("click", () => toggleCollapsed(topic.id));
  item.appendChild(collapseButton);

  const button = document.createElement("button");
  button.type = "button";
  button.className = `tree-row${topic.id !== "root" ? " draggable-row" : ""}${topic.id === state.selectedTopicId ? " active" : ""}`;
  button.addEventListener("click", () => selectTopic(topic.id));
  button.innerHTML = `
    <span class="area-badge" style="background:${escapeHtml(topic.color || "#4f6f52")}" aria-hidden="true">${escapeHtml(topic.icon || initials(topic.title))}</span>
    <span class="tree-title">${escapeHtml(topic.title)}</span>
    <span class="tree-count">${children.length}</span>
  `;
  item.appendChild(button);

  if (topic.id !== "root") {
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "tree-delete";
    deleteButton.setAttribute("aria-label", `Delete ${topic.title}`);
    deleteButton.textContent = "x";
    deleteButton.addEventListener("click", () => deleteTopic(topic.id));
    item.appendChild(deleteButton);
  } else {
    item.appendChild(document.createElement("span"));
  }

  els.topicTree.appendChild(item);

  if (!collapsed) {
    children.forEach((child) => renderTreeBranch(child.id, depth + 1));
  }
}

function clearSidebarDropStates() {
  els.topicTree.querySelectorAll(".drop-before, .drop-after, .drop-inside").forEach((item) => {
    item.classList.remove("drop-before", "drop-after", "drop-inside");
  });
}

function renderChildren(topicId) {
  const children = childrenOf(topicId);
  els.childTopics.innerHTML = "";
  els.childTopics.classList.toggle("compact-empty", !children.length);

  if (!children.length) {
    els.childTopics.innerHTML = `<div class="empty">Nothing inside yet. Add a smaller area to start shaping this part of life.</div>`;
    return;
  }

  children.forEach((child) => {
    const card = document.createElement("article");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.className = "folder-card";
    card.draggable = true;
    card.dataset.topicId = child.id;
    card.addEventListener("click", () => selectTopic(child.id, true, { collapsePrevious: true }));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter") selectTopic(child.id, true, { collapsePrevious: true });
    });
    card.addEventListener("dragstart", (event) => {
      draggedTopicId = child.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", child.id);
      window.requestAnimationFrame(() => {
        card.classList.add("dragging");
      });
    });
    card.addEventListener("dragend", () => {
      draggedTopicId = null;
      card.classList.remove("dragging");
      els.childTopics.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedTopicId && draggedTopicId !== child.id) {
        els.childTopics.querySelectorAll(".drag-over").forEach((item) => {
          if (item !== card) item.classList.remove("drag-over");
        });
        card.classList.add("drag-over");
      }
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      els.childTopics.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
      reorderTopic(draggedTopicId || event.dataTransfer.getData("text/plain"), child.id);
      draggedTopicId = null;
    });
    card.innerHTML = `
      <button class="folder-delete" type="button" aria-label="Delete ${escapeHtml(child.title)}">x</button>
      <span class="area-badge" style="background:${escapeHtml(child.color || "#4f6f52")}" aria-hidden="true">${escapeHtml(child.icon || initials(child.title))}</span>
      <strong>${escapeHtml(child.title)}</strong>
      <span class="folder-note">${escapeHtml(notePreview(child.notes))}</span>
      <span class="folder-meta">${state.tasks.filter((task) => task.topicId === child.id && !task.done).length} tasks</span>
    `;
    card.querySelector(".folder-delete").addEventListener("click", (event) => {
      event.stopPropagation();
      deleteTopic(child.id);
    });
    els.childTopics.appendChild(card);
  });
}

function renderTasks(tasks, currentTopicId) {
  els.taskList.innerHTML = "";
  const shownTasks = tasks.filter(visibleTaskMatches);

  if (!shownTasks.length) {
    els.taskList.innerHTML = `<li class="empty">No tasks here yet. Add one small next action.</li>`;
    return;
  }

  const nextTaskId = shownTasks.find((task) => !task.done)?.id;

  shownTasks.forEach((task) => {
    const isNextStep = task.id === nextTaskId;
    const expanded = expandedTaskId === task.id;
    const item = document.createElement("li");
    item.className = `task-item${task.done ? " done" : ""}${isNextStep ? " next-step" : ""}${expanded ? " expanded" : ""}`;
    item.dataset.taskId = task.id;
    item.draggable = true;
    item.innerHTML = `
      <button class="check-button" type="button" aria-label="${task.done ? "Mark incomplete" : "Complete task"}">${task.done ? "Done" : ""}</button>
      <div class="task-body" role="button" tabindex="0" aria-label="Open task details">
        <span class="task-text">${isNextStep ? '<span class="task-badge">Next step</span>' : ""}${escapeHtml(displayTaskText(task, currentTopicId))}</span>
        <ul class="subtask-list" ${expanded ? "" : "hidden"}>
          ${(task.subtasks || []).map((subtask) => `
            <li class="subtask${subtask.done ? " done" : ""}" data-subtask-id="${subtask.id}">
              <button class="subtask-check" type="button" aria-label="${subtask.done ? "Mark bullet incomplete" : "Complete bullet"}"></button>
              <span>${escapeHtml(subtask.text)}</span>
              <button class="subtask-delete" type="button" aria-label="Delete bullet">x</button>
            </li>
          `).join("")}
        </ul>
        <form class="subtask-form" ${expanded ? "" : "hidden"}>
          <input type="text" placeholder="Mini bullet point" autocomplete="off" />
          <button type="submit">Add</button>
        </form>
      </div>
      <button class="delete-button" type="button" aria-label="Delete task">x</button>
    `;

    item.querySelector(".check-button").addEventListener("click", () => toggleTask(task.id));
    item.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
    item.addEventListener("click", (event) => {
      if (event.target.closest("button, input, form, .subtask")) return;
      toggleTaskDetails(task.id);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter") toggleTaskDetails(task.id);
    });
    item.querySelector(".subtask-form")?.addEventListener("submit", (event) => addSubtask(event, task.id));
    item.querySelectorAll(".subtask").forEach((subtaskItem) => {
      const subtaskId = subtaskItem.dataset.subtaskId;
      subtaskItem.querySelector(".subtask-check").addEventListener("click", () => toggleSubtask(task.id, subtaskId));
      subtaskItem.querySelector(".subtask-delete").addEventListener("click", () => deleteSubtask(task.id, subtaskId));
    });
    item.addEventListener("dragstart", (event) => {
      if (event.target.closest("input, button")) {
        event.preventDefault();
        return;
      }
      draggedTaskId = task.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", task.id);
      window.requestAnimationFrame(() => item.classList.add("dragging"));
    });
    item.addEventListener("dragend", () => {
      draggedTaskId = null;
      item.classList.remove("dragging");
      els.taskList.querySelectorAll(".drag-over").forEach((row) => row.classList.remove("drag-over"));
    });
    item.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedTaskId && draggedTaskId !== task.id) item.classList.add("drag-over");
    });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", (event) => {
      event.preventDefault();
      item.classList.remove("drag-over");
      reorderTask(draggedTaskId || event.dataTransfer.getData("text/plain"), task.id);
      draggedTaskId = null;
    });
    els.taskList.appendChild(item);
  });
}

function displayTaskText(task, currentTopicId) {
  if (!currentTopicId || task.topicId === currentTopicId) return task.text;
  return `${topicTitle(task.topicId)} - ${task.text}`;
}

function renderExams(exams) {
  els.examList.innerHTML = "";

  if (!exams.length) {
    els.examList.innerHTML = `<div class="empty">Add big exams here. Export them to Calendar for iPhone and laptop reminders.</div>`;
    return;
  }

  exams.forEach((exam) => {
    const card = document.createElement("article");
    card.className = "exam-card";
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(exam.name)}</strong>
        <time>${formatDateTime(exam.when)}</time>
        <span>${exam.reminderDays} day reminder / ${escapeHtml(topicTitle(exam.topicId))}</span>
      </div>
      <div class="row-actions">
        <button class="ghost-button" type="button" data-action="rename">Rename</button>
        <button class="delete-button" type="button" data-action="delete" aria-label="Delete exam">x</button>
      </div>
    `;
    card.querySelector('[data-action="rename"]').addEventListener("click", () => openExamRenameModal(exam.id));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteExam(exam.id));
    els.examList.appendChild(card);
  });
}

function renderHabits() {
  els.habitList.innerHTML = "";
  if (!els.habitDate.value) els.habitDate.value = todayKey();
  const selectedDate = selectedHabitDate();
  const selectedLabel = selectedDate === todayKey() ? "today" : shortDate(selectedDate);

  if (!state.habits.length) {
    els.habitList.innerHTML = `<div class="empty">No habits yet. Add one daily rhythm to track.</div>`;
    return;
  }

  const orderedHabits = [...state.habits].sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  orderedHabits.forEach((habit, index) => {
    const completedDates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
    const done = completedDates.includes(selectedDate);
    const currentStreak = habitStreak(completedDates);
    const bestStreak = bestHabitStreak(completedDates);
    const card = document.createElement("article");
    card.className = `habit-card${done ? " done" : ""}`;
    card.draggable = true;
    card.dataset.habitId = habit.id;
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(habit.name)}</strong>
        <span>${done ? `Done ${selectedLabel}` : `Not marked ${selectedLabel}`} / Current ${currentStreak} / Best ${bestStreak}</span>
      </div>
      <div class="row-actions">
        <button type="button" data-action="toggle">${done ? "Done" : "Check"}</button>
        <button type="button" data-action="delete">x</button>
      </div>
    `;
    card.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleHabit(habit.id, selectedDate));
    card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteHabit(habit.id));
    card.addEventListener("dragstart", (event) => {
      if (event.target.closest("button")) {
        event.preventDefault();
        return;
      }
      draggedHabitId = habit.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", habit.id);
      window.requestAnimationFrame(() => card.classList.add("dragging"));
    });
    card.addEventListener("dragend", () => {
      draggedHabitId = null;
      card.classList.remove("dragging");
      els.habitList.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (draggedHabitId && draggedHabitId !== habit.id) {
        els.habitList.querySelectorAll(".drag-over").forEach((item) => {
          if (item !== card) item.classList.remove("drag-over");
        });
        card.classList.add("drag-over");
      }
    });
    card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drag-over");
      reorderHabit(draggedHabitId || event.dataTransfer.getData("text/plain"), habit.id);
      draggedHabitId = null;
    });
    els.habitList.appendChild(card);
  });
}

function renderFinance() {
  if (!els.financeDate.value) els.financeDate.value = todayKey();
  const transactions = [...state.financeTransactions].sort((a, b) =>
    (b.date || "").localeCompare(a.date || "") || (b.createdAt || 0) - (a.createdAt || 0)
  );
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const balance = income - expenses;

  els.financeBalance.textContent = formatMoney(balance);
  els.financeIncome.textContent = formatMoney(income);
  els.financeExpenses.textContent = formatMoney(expenses);
  els.financeList.innerHTML = "";

  if (!transactions.length) {
    els.financeList.innerHTML = `<div class="empty">No money logged yet. Add income or expenses as they happen.</div>`;
    return;
  }

  transactions.forEach((item) => {
    const card = document.createElement("article");
    card.className = `finance-card ${item.type}`;
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(shortDate(item.date || todayKey()))}${item.source ? ` / ${escapeHtml(item.source)}` : ""}</span>
      </div>
      <div class="finance-card-side">
        <b>${item.type === "expense" ? "-" : "+"}${formatMoney(item.amount)}</b>
        <button type="button" aria-label="Delete money entry">x</button>
      </div>
    `;
    card.querySelector("button").addEventListener("click", () => deleteFinanceTransaction(item.id));
    els.financeList.appendChild(card);
  });
}

function renderBrainBoard() {
  if (!state.brainNotes.length) {
    state.selectedBrainNoteId = null;
  } else if (!selectedBrainNote()) {
    state.selectedBrainNoteId = [...state.brainNotes].sort((a, b) => b.updatedAt - a.updatedAt)[0].id;
  }

  renderBrainNoteList();
  const note = selectedBrainNote();
  const disabled = !note;
  els.brainNoteTitle.disabled = disabled;
  els.brainNoteBody.disabled = disabled;
  els.brainNoteState.disabled = disabled;
  els.brainNoteDelete.disabled = disabled;

  if (!note) {
    els.brainNoteTitle.value = "";
    els.brainNoteBody.value = "";
    els.brainNoteState.value = "messy";
    els.brainNoteBody.placeholder = "Add a scrap on the left, then dump the thought before it has to make sense.";
    return;
  }

  if (document.activeElement !== els.brainNoteTitle) els.brainNoteTitle.value = note.title;
  if (document.activeElement !== els.brainNoteBody) els.brainNoteBody.value = note.body;
  if (document.activeElement !== els.brainNoteState) els.brainNoteState.value = note.state;
  els.brainNoteBody.placeholder = "Dump it here. It does not have to be useful yet.";
}

function renderBrainNoteList() {
  const orderedNotes = [...state.brainNotes].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!orderedNotes.length) {
    els.brainNoteList.innerHTML = `<div class="empty">No scraps yet.</div>`;
    return;
  }

  els.brainNoteList.innerHTML = "";
  orderedNotes.forEach((note) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `brain-file${note.id === state.selectedBrainNoteId ? " active" : ""}`;
    button.innerHTML = `
      <span class="brain-file-state">${escapeHtml(note.state)}</span>
      <strong>${escapeHtml(note.title || "Untitled scrap")}</strong>
      <small>${escapeHtml(brainPreview(note.body))}</small>
    `;
    button.addEventListener("click", () => selectBrainNote(note.id));
    els.brainNoteList.appendChild(button);
  });
}

function renderCalendar() {
  const today = todayKey();
  const selectedKey = state.selectedCalendarDate || today;
  renderCalendarMonth();
  renderCalendarMonthStrip();
  initializeEventDefaults();
  els.dayPlanner.hidden = !state.calendarPlannerOpen;
  els.calendarYearInput.value = String(state.calendarYear);
  els.selectedDayTitle.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(`${selectedKey}T00:00`));
  els.eventAdd.textContent = editingEventId ? "Save event" : "Add event";
  const selectedPlans = state.studyPlans
    .filter((plan) => eventCoversDate(plan, selectedKey))
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));

  els.todayTaskList.innerHTML = "";
  const openTasks = state.tasks
    .filter((task) => !task.done)
    .sort((a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt));
  if (!openTasks.length) {
    els.todayTaskList.innerHTML = `<li class="empty">No open tasks right now.</li>`;
  } else {
    openTasks.slice(0, 12).forEach((task) => {
      const item = document.createElement("li");
      item.className = "task-item";
      item.innerHTML = `
        <button class="check-button" type="button" aria-label="Complete task"></button>
        <span class="task-text">${escapeHtml(task.text)} <span class="folder-meta">/ ${escapeHtml(topicTitle(task.topicId))}</span></span>
        <button class="delete-button" type="button" aria-label="Delete task">x</button>
      `;
      item.querySelector(".check-button").addEventListener("click", () => toggleTask(task.id));
      item.querySelector(".delete-button").addEventListener("click", () => deleteTask(task.id));
      els.todayTaskList.appendChild(item);
    });
  }

  els.studyList.innerHTML = "";
  if (!selectedPlans.length) {
    els.studyList.innerHTML = `<div class="empty">No events on this day yet.</div>`;
    return;
  }

  selectedPlans.forEach((plan) => {
    const card = document.createElement("article");
    card.className = `study-card event-color-${eventDisplayColor(plan)}`;
    card.dataset.eventId = plan.id;
    card.innerHTML = `
      <div>
        <strong>${escapeHtml(plan.name)}</strong>
        <span>${escapeHtml(eventCategoryLabel(plan))} / ${escapeHtml(eventMetaLabel(plan))}</span>
      </div>
      <div class="row-actions">
        <button type="button" data-action="delete">x</button>
      </div>
    `;
    card.addEventListener("click", (event) => {
      if (event.target.closest("button")) return;
      openEventEditor(plan.id, selectedKey);
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", () => deleteStudyPlan(plan.id));
    els.studyList.appendChild(card);
  });
}

function renderTimeTracker() {
  if (!editingTimeBlockId && !els.timeBlockStart.value) {
    els.timeBlockStart.value = "08:00";
    els.timeBlockEnd.value = "09:00";
    els.timeBlockCategory.value = "focus";
  }
  if (!editingTimeBlockId && !timeBlockDraftDays.length) timeBlockDraftDays = [state.timeScheduleDay];
  updateTimeBlockEndVisibility();
  const ideal = state.timeBlocks.filter((block) => block.kind === "ideal" && block.season === state.timeScheduleSeason);
  const scheduleEntries = [];
  const previousDay = (state.timeScheduleDay + 6) % 7;
  const sleepBlock = ideal.find((block) => isSleepBoundary(block)
    && blockRepeatsOn(block, state.timeScheduleDay)
  );
  ideal.filter((block) => !isSleepBoundary(block)).forEach((block) => {
    const segments = timeBlockSegments(block);
    if (blockRepeatsOn(block, state.timeScheduleDay) && segments[0]) {
      scheduleEntries.push({ block, segment: segments[0] });
    }
    if (segments.length > 1 && blockRepeatsOn(block, previousDay)) {
      scheduleEntries.push({ block, segment: segments[1] });
    }
  });
  scheduleEntries.sort((a, b) => a.segment.start - b.segment.start);

  const seasonLabel = state.timeScheduleSeason === "summer" ? "Summer" : "Academic year";
  els.idealDayLabel.textContent = `${seasonLabel} / ${weekdayName(state.timeScheduleDay)}`;
  els.timeScheduleSeason.querySelectorAll("[data-schedule-season]").forEach((button) => {
    button.classList.toggle("active", button.dataset.scheduleSeason === state.timeScheduleSeason);
  });
  els.timeScheduleDays.querySelectorAll("[data-schedule-day]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.scheduleDay) === state.timeScheduleDay);
  });
  const visibleWindow = sleepBlock
    ? { start: minutesFromTime(sleepBlock.end), end: minutesFromTime(sleepBlock.start) }
    : { start: 0, end: 1440 };
  renderSleepRoutine(sleepBlock);
  renderSleepSummary(sleepBlock);
  renderTimeBlockRepeatDays();
  renderTimeLane(els.idealTimeLane, scheduleEntries, visibleWindow);
}

function renderSleepRoutine(block) {
  els.sleepStart.value = block?.start || "21:00";
  els.wakeTime.value = block?.end || "07:00";
  els.sleepRoutineClear.hidden = !block;
}

function saveSleepRoutine(event) {
  event.preventDefault();
  const start = els.sleepStart.value;
  const end = els.wakeTime.value;
  if (!start || !end) return;
  if (minutesFromTime(end) >= minutesFromTime(start)) {
    showToast("Sleep should run from night into the next morning.");
    return;
  }
  rememberScheduleState();
  upsertSleepLog(start, end);
  const days = [...Array(7).keys()];
  state.timeBlocks = state.timeBlocks.filter((block) => !(
    block.kind === "ideal"
    && block.season === state.timeScheduleSeason
    && isSleepBoundary(block)
    && daysForTimeBlock(block).some((day) => days.includes(day))
  ));
  state.timeBlocks.push({
    id: createId(),
    name: "Sleep",
    kind: "ideal",
    category: "sleep",
    instant: false,
    start,
    end,
    date: null,
    season: state.timeScheduleSeason,
    dayOfWeek: 0,
    daysOfWeek: days,
    createdAt: Date.now()
  });
  saveState();
  renderTimeTracker();
}

function clearSleepRoutine() {
  rememberScheduleState();
  state.timeBlocks = state.timeBlocks.filter((block) => !(block.kind === "ideal"
    && block.season === state.timeScheduleSeason
    && isSleepBoundary(block)
  ));
  saveState();
  renderTimeTracker();
}

function upsertSleepLog(start, end) {
  const today = todayKey();
  const existing = state.sleepLogs.find((log) => log.date === today && log.season === state.timeScheduleSeason);
  const data = {
    date: today,
    season: state.timeScheduleSeason,
    start,
    end,
    createdAt: Date.now()
  };
  if (existing) {
    Object.assign(existing, data);
  } else {
    state.sleepLogs.push({ id: createId(), ...data });
  }
}

function openSleepTrendModal() {
  renderSleepTrendChart();
  els.sleepTrendModal.hidden = false;
}

function closeSleepTrendModal() {
  els.sleepTrendModal.hidden = true;
}

function renderSleepTrendChart() {
  const logs = sleepTrendLogs();
  els.sleepTrendRange.querySelectorAll("[data-sleep-range]").forEach((button) => {
    button.classList.toggle("active", button.dataset.sleepRange === sleepTrendRange);
  });
  els.sleepTrendChart.innerHTML = "";
  if (!logs.length) {
    els.sleepTrendStats.innerHTML = `<span>No sleep logs yet.</span><span>Save your sleep and wake time to start the chart.</span>`;
    els.sleepTrendChart.innerHTML = `<div class="empty sleep-empty">No chart yet</div>`;
    return;
  }
  const average = Math.round(logs.reduce((total, log) => total + sleepDurationMinutes(log), 0) / logs.length);
  const latest = logs[logs.length - 1];
  els.sleepTrendStats.innerHTML = `
    <span><strong>${escapeHtml(formatDuration(average))}</strong> average</span>
    <span><strong>${escapeHtml(formatTime(latest.start))}</strong> latest sleep</span>
    <span><strong>${escapeHtml(formatTime(latest.end))}</strong> latest wake</span>
  `;
  logs.forEach((log) => {
    const row = document.createElement("article");
    row.className = "sleep-trend-row";
    const duration = sleepDurationMinutes(log);
    const width = Math.max(12, Math.min(100, (duration / 600) * 100));
    row.innerHTML = `
      <span>${escapeHtml(shortDate(log.date))}</span>
      <div class="sleep-trend-track">
        <div class="sleep-trend-bar" style="width:${width}%"></div>
      </div>
      <strong>${escapeHtml(formatDuration(duration))}</strong>
      <small>${escapeHtml(formatTime(log.start))} - ${escapeHtml(formatTime(log.end))}</small>
    `;
    els.sleepTrendChart.appendChild(row);
  });
}

function sleepTrendLogs() {
  const logs = [...state.sleepLogs].sort((a, b) => a.date.localeCompare(b.date));
  if (sleepTrendRange === "all") return logs;
  const days = sleepTrendRange === "month" ? 30 : 7;
  const start = new Date(`${todayKey()}T00:00`);
  start.setDate(start.getDate() - days + 1);
  const startKey = dateKey(start);
  return logs.filter((log) => log.date >= startKey);
}

function renderSleepSummary(block) {
  els.sleepSummary.innerHTML = "";
  if (!block) return;
  const summary = document.createElement("span");
  summary.textContent = `Sleep ${formatTime(block.start)} - ${formatTime(block.end)}`;
  els.sleepSummary.append(summary);
}

function renderTimeLane(lane, entries, visibleWindow) {
  lane.innerHTML = "";
  const visibleMinutes = visibleWindow.end - visibleWindow.start;
  const laneHeight = Math.max(360, (visibleMinutes / 60) * 52);
  lane.style.height = `${laneHeight}px`;
  lane.dataset.windowStart = String(visibleWindow.start);
  lane.dataset.windowEnd = String(visibleWindow.end);
  lane.dataset.laneHeight = String(laneHeight);

  for (let minute = Math.ceil(visibleWindow.start / 60) * 60; minute < visibleWindow.end; minute += 60) {
    const marker = document.createElement("div");
    marker.className = "time-hour-marker";
    marker.style.top = `${((minute - visibleWindow.start) / visibleMinutes) * laneHeight}px`;
    marker.innerHTML = `<span>${escapeHtml(formatMinute(minute).replace(":00", ""))}</span>`;
    lane.appendChild(marker);
  }

  const renderedBlocks = [];
  entries.forEach(({ block, segment }) => {
    const clipped = {
      start: Math.max(segment.start, visibleWindow.start),
      end: Math.min(segment.end, visibleWindow.end)
    };
    if (clipped.end > clipped.start) {
      const element = createTimeBlockElement(block, clipped, visibleWindow, laneHeight);
      lane.appendChild(element);
      renderedBlocks.push({ block, element });
    }
  });
  arrangeInstantTimeBlocks(renderedBlocks);
  lane.onclick = (event) => {
    if (event.target.closest(".time-block")) return;
    const rect = lane.getBoundingClientRect();
    const start = snapTimeMinutes(visibleWindow.start + ((event.clientY - rect.top) / rect.height) * visibleMinutes);
    beginNewTimeBlock(start);
  };
}

function arrangeInstantTimeBlocks(renderedBlocks) {
  const overlapsVertically = (first, second) => {
    const firstTop = first.offsetTop;
    const secondTop = second.offsetTop;
    return firstTop < secondTop + second.offsetHeight && secondTop < firstTop + first.offsetHeight;
  };

  renderedBlocks.filter(({ block }) => block.instant).forEach(({ element }) => {
    const collisions = renderedBlocks.filter(({ element: other }) => (
      other !== element && overlapsVertically(element, other)
    ));
    if (!collisions.length) return;
    element.classList.add("instant-shifted");
    collisions.forEach(({ block, element: other }) => {
      if (!block.instant) other.classList.add("beside-instant");
    });
  });
}

function createTimeBlockElement(block, segment, visibleWindow, laneHeight) {
  const item = document.createElement("article");
  const meta = timeCategory(block.category);
  const overnight = timeBlockSegments(block).length > 1;
  item.className = `time-block${overnight ? " overnight" : ""}${block.instant ? " instant" : ""}`;
  item.dataset.timeBlockId = block.id;
  item.style.setProperty("--block-color", meta.color);
  const timeLabel = block.instant ? formatTime(block.start) : `${formatTime(block.start)} - ${formatTime(block.end)}`;
  item.title = `${timeLabel} / ${block.name} / ${meta.label}`;
  positionTimeElement(item, segment.start, segment.end, visibleWindow, laneHeight);
  item.innerHTML = `
    <button class="time-block-delete" type="button" aria-label="Delete ${escapeHtml(block.name)}">x</button>
    <div class="time-block-line">
      <span class="time-block-time">${escapeHtml(timeLabel)}</span>
      <strong>${escapeHtml(block.name)}</strong>
      <span class="time-block-category">${escapeHtml(meta.label)}</span>
    </div>
    <span class="time-resize-handle" aria-hidden="true"></span>
  `;
  item.querySelector(".time-block-delete").addEventListener("pointerdown", (event) => event.stopPropagation());
  item.querySelector(".time-block-delete").addEventListener("click", (event) => {
    event.stopPropagation();
    deleteTimeBlock(block.id);
  });
  if (overnight) {
    item.addEventListener("click", (event) => {
      if (!event.target.closest("button")) openTimeBlockEditor(block.id);
    });
  } else {
    item.addEventListener("pointerdown", (event) => startTimeBlockDrag(event, block, item));
  }
  return item;
}

function positionTimeElement(element, start, end, visibleWindow, laneHeight) {
  const visibleMinutes = visibleWindow.end - visibleWindow.start;
  element.style.top = `${((start - visibleWindow.start) / visibleMinutes) * laneHeight}px`;
  element.style.height = `${Math.max(22, ((end - start) / visibleMinutes) * laneHeight)}px`;
}

function startTimeBlockDrag(event, block, element) {
  if (event.button !== 0 || event.target.closest("button")) return;
  event.preventDefault();
  const resize = Boolean(event.target.closest(".time-resize-handle"));
  const lane = element.closest(".time-lane");
  const visibleWindow = {
    start: Number(lane.dataset.windowStart),
    end: Number(lane.dataset.windowEnd)
  };
  timeBlockDrag = {
    block,
    element,
    mode: resize ? "resize" : "move",
    startY: event.clientY,
    originalStart: minutesFromTime(block.start),
    originalEnd: minutesFromTime(block.end),
    nextStart: minutesFromTime(block.start),
    nextEnd: minutesFromTime(block.end),
    visibleWindow,
    laneHeight: Number(lane.dataset.laneHeight),
    moved: false
  };
  element.classList.add("moving");
}

function moveTimeBlock(event) {
  if (!timeBlockDrag) return;
  const visibleMinutes = timeBlockDrag.visibleWindow.end - timeBlockDrag.visibleWindow.start;
  const delta = snapTimeDelta(((event.clientY - timeBlockDrag.startY) / timeBlockDrag.laneHeight) * visibleMinutes);
  if (Math.abs(event.clientY - timeBlockDrag.startY) > 3) timeBlockDrag.moved = true;

  if (timeBlockDrag.mode === "resize") {
    timeBlockDrag.nextEnd = Math.max(
      timeBlockDrag.originalStart + 5,
      Math.min(timeBlockDrag.visibleWindow.end, timeBlockDrag.originalEnd + delta)
    );
  } else {
    const duration = timeBlockDrag.block.instant ? 0 : timeBlockDrag.originalEnd - timeBlockDrag.originalStart;
    timeBlockDrag.nextStart = Math.max(
      timeBlockDrag.visibleWindow.start,
      Math.min(timeBlockDrag.visibleWindow.end - duration, timeBlockDrag.originalStart + delta)
    );
    timeBlockDrag.nextEnd = timeBlockDrag.nextStart + duration;
  }

  positionTimeElement(
    timeBlockDrag.element,
    timeBlockDrag.nextStart,
    timeBlockDrag.nextEnd,
    timeBlockDrag.visibleWindow,
    timeBlockDrag.laneHeight
  );
  const label = timeBlockDrag.element.querySelector(".time-block-time");
  label.textContent = timeBlockDrag.block.instant
    ? formatMinute(timeBlockDrag.nextStart)
    : `${formatMinute(timeBlockDrag.nextStart)} - ${formatMinute(timeBlockDrag.nextEnd)}`;
}

function stopTimeBlockDrag() {
  if (!timeBlockDrag) return;
  const drag = timeBlockDrag;
  timeBlockDrag = null;
  drag.element.classList.remove("moving");
  if (!drag.moved) {
    openTimeBlockEditor(drag.block.id);
    return;
  }
  rememberScheduleState();
  drag.block.start = timeValueFromMinutes(drag.nextStart);
  drag.block.end = timeValueFromMinutes(drag.nextEnd);
  saveState();
  renderTimeTracker();
}

function beginNewTimeBlock(start = 480) {
  resetTimeBlockForm();
  els.timeBlockStart.value = timeValueFromMinutes(Math.min(1435, start));
  els.timeBlockEnd.value = timeValueFromMinutes(Math.min(1435, start + 60));
  els.timeBlockName.focus();
}

function handleTimeBlockFormEnter(event) {
  if (event.key !== "Enter" || event.isComposing) return;
  if (event.target.closest("button, textarea")) return;
  event.preventDefault();
  els.timeBlockForm.requestSubmit();
}

function saveTimeBlock(event) {
  event.preventDefault();
  const name = els.timeBlockName.value.trim();
  const start = minutesFromTime(els.timeBlockStart.value);
  const instant = els.timeBlockCategory.value === "food";
  const end = instant ? start : minutesFromTime(els.timeBlockEnd.value);
  if (!name || !els.timeBlockStart.value || (!instant && !els.timeBlockEnd.value)) return;
  if (!instant && end === start) {
    showToast("Choose two different times. Overnight blocks can end the next morning.");
    return;
  }
  if (!timeBlockDraftDays.length) {
    showToast("Choose at least one day for this block.");
    return;
  }

  const existing = editingTimeBlockId && state.timeBlocks.find((block) => block.id === editingTimeBlockId);
  rememberScheduleState();
  const data = {
    name,
    kind: "ideal",
    category: els.timeBlockCategory.value,
    instant,
    start: timeValueFromMinutes(snapTimeMinutes(start)),
    end: timeValueFromMinutes(snapTimeMinutes(end)),
    date: null,
    season: existing?.season || state.timeScheduleSeason,
    dayOfWeek: timeBlockDraftDays[0],
    daysOfWeek: [...timeBlockDraftDays]
  };
  if (existing) {
    Object.assign(existing, data);
  } else {
    state.timeBlocks.push({ id: createId(), ...data, createdAt: Date.now() });
  }
  saveState();
  resetTimeBlockForm();
  renderTimeTracker();
}

function openTimeBlockEditor(id) {
  const block = state.timeBlocks.find((item) => item.id === id);
  if (!block) return;
  editingTimeBlockId = id;
  els.timeBlockName.value = block.name;
  els.timeBlockCategory.value = block.category;
  els.timeBlockStart.value = block.start;
  els.timeBlockEnd.value = block.end;
  updateTimeBlockEndVisibility();
  timeBlockDraftDays = daysForTimeBlock(block);
  renderTimeBlockRepeatDays();
  els.timeBlockSave.textContent = "Save block";
  els.timeBlockCancel.hidden = false;
  els.timeBlockName.focus();
}

function resetTimeBlockForm() {
  editingTimeBlockId = null;
  els.timeBlockForm.reset();
  els.timeBlockCategory.value = "focus";
  els.timeBlockStart.value = "08:00";
  els.timeBlockEnd.value = "09:00";
  timeBlockDraftDays = [state.timeScheduleDay];
  renderTimeBlockRepeatDays();
  els.timeBlockSave.textContent = "Add block";
  els.timeBlockCancel.hidden = true;
  updateTimeBlockEndVisibility();
}

function deleteTimeBlock(id) {
  rememberScheduleState();
  state.timeBlocks = state.timeBlocks.filter((block) => block.id !== id);
  if (editingTimeBlockId === id) resetTimeBlockForm();
  saveState();
  renderTimeTracker();
}

function rememberScheduleState() {
  scheduleUndoStack.push({
    timeBlocks: clone(state.timeBlocks),
    sleepLogs: clone(state.sleepLogs)
  });
  if (scheduleUndoStack.length > 30) scheduleUndoStack.shift();
}

function handleScheduleUndoShortcut(event) {
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z" || event.shiftKey) return;
  if (state.appView !== "time") return;
  if (event.target.closest("input, textarea, select, [contenteditable='true']")) return;
  const previous = scheduleUndoStack.pop();
  if (!previous) {
    showToast("No schedule changes to undo.");
    return;
  }
  event.preventDefault();
  state.timeBlocks = clone(previous.timeBlocks);
  state.sleepLogs = clone(previous.sleepLogs || []);
  editingTimeBlockId = null;
  timeBlockDrag = null;
  saveState();
  resetTimeBlockForm();
  renderTimeTracker();
  showToast("Schedule change undone.");
}

function daysForTimeBlock(block) {
  if (Array.isArray(block.daysOfWeek) && block.daysOfWeek.length) return [...block.daysOfWeek];
  return [Number.isInteger(block.dayOfWeek) ? block.dayOfWeek : state.timeScheduleDay];
}

function blockRepeatsOn(block, day) {
  return daysForTimeBlock(block).includes(day);
}

function isSleepBoundary(block) {
  return block.category === "sleep" && minutesFromTime(block.end) < minutesFromTime(block.start);
}

function renderTimeBlockRepeatDays() {
  els.timeBlockRepeatDays.querySelectorAll("[data-repeat-day]").forEach((button) => {
    button.classList.toggle("active", timeBlockDraftDays.includes(Number(button.dataset.repeatDay)));
  });
}

function updateTimeBlockEndVisibility() {
  const instant = els.timeBlockCategory.value === "food";
  els.timeBlockEndLabel.hidden = instant;
  els.timeBlockEnd.required = !instant;
}

function timeBlockSegments(block) {
  const start = minutesFromTime(block.start);
  const end = minutesFromTime(block.end);
  if (block.instant) return [{ start, end: Math.min(1440, start + 5) }];
  if (end > start) return [{ start, end }];
  if (end < start) return [{ start, end: 1440 }, { start: 0, end }];
  return [];
}

function snapTimeMinutes(value) {
  return Math.max(0, Math.min(1440, Math.round(value / 5) * 5));
}

function snapTimeDelta(value) {
  return Math.round(value / 5) * 5;
}

function timeValueFromMinutes(value) {
  const bounded = Math.max(0, Math.min(1435, value));
  const hour = Math.floor(bounded / 60);
  const minute = bounded % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function timeCategory(key) {
  return TIME_CATEGORIES[key] || TIME_CATEGORIES.other;
}

function weekdayName(day) {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day] || "Monday";
}

function seasonForDate(date) {
  const month = date.getMonth();
  return month >= 5 && month <= 7 ? "summer" : "school";
}

function renderCalendarMonth() {
  const year = state.calendarYear || new Date().getFullYear();
  const month = Number.isInteger(state.calendarMonth) ? state.calendarMonth : new Date().getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  const monthName = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(first);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  els.calendarMonth.innerHTML = `<h4 class="calendar-title">${monthName}</h4>`;
  dayNames.forEach((day) => {
    const label = document.createElement("div");
    label.className = "calendar-day-name";
    label.textContent = day;
    els.calendarMonth.appendChild(label);
  });

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = dateKey(date);
    const cell = document.createElement("div");
    const rangeClass = calendarRangeClass(key);
    cell.className = `calendar-cell${date.getMonth() !== month ? " muted" : ""}${rangeClass ? ` ${rangeClass}` : ""}${key === todayKey() ? " today" : ""}${key === state.selectedCalendarDate && state.calendarPlannerOpen ? " selected" : ""}`;
    cell.tabIndex = 0;
    cell.setAttribute("role", "button");
    cell.setAttribute("aria-label", `Plan ${shortDate(key)}`);
    cell.innerHTML = `<span class="calendar-date">${date.getDate()}</span>`;
    cell.addEventListener("click", () => selectCalendarDate(key));
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter") selectCalendarDate(key);
    });

    const items = calendarItemsForDate(key);
    const eventItems = items.filter((item) => item.type === "event");
    renderRangeEdgeButtons(cell, key, eventItems);

    items.slice(0, 5).forEach((item) => {
      const chip = document.createElement("span");
      chip.className = `calendar-chip ${item.type}`;
      chip.textContent = item.label;
      if (item.type === "event") {
        chip.classList.add(`event-color-${item.color}`);
        chip.setAttribute("role", "button");
        chip.tabIndex = 0;
        chip.addEventListener("click", (event) => {
          event.stopPropagation();
          openEventEditor(item.id, key);
        });
        chip.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.stopPropagation();
            openEventEditor(item.id, key);
          }
        });
      }
      cell.appendChild(chip);
    });

    els.calendarMonth.appendChild(cell);
  }
}

function renderRangeEdgeButtons(cell, key, eventItems) {
  const starts = eventItems.filter((item) => item.start === key);
  const ends = eventItems.filter((item) => item.end === key);
  [...starts.map((item) => ({ item, side: "start" })), ...ends.map((item) => ({ item, side: "end" }))].forEach(({ item, side }, index) => {
    const edge = document.createElement("button");
    edge.type = "button";
    edge.className = `event-range-edge ${side === "start" ? "edge-start" : "edge-end"} event-color-${item.color}`;
    edge.style.setProperty("--edge-offset", `${index * 17}px`);
    edge.setAttribute("aria-label", `Edit ${item.name}`);
    edge.title = item.name;
    edge.addEventListener("click", (event) => {
      event.stopPropagation();
      openEventEditor(item.id, key);
    });
    cell.appendChild(edge);
  });
}

function calendarRangeClass(key) {
  const ranges = state.studyPlans
    .map((plan) => {
      const start = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
      const end = plan.end || plan.until || start;
      return { start, end, color: eventDisplayColor(plan) };
    })
    .filter((range) => range.start !== range.end && key >= range.start && key <= range.end);

  if (!ranges.length) return "";
  const starts = ranges.some((range) => range.start === key);
  const ends = ranges.some((range) => range.end === key);
  return `range-day range-color-${ranges[0].color}${starts ? " range-start" : ""}${ends ? " range-end" : ""}`;
}

function eventColorIndex(value) {
  return Array.from(String(value || "")).reduce((total, char) => total + char.charCodeAt(0), 0) % 5;
}

function eventDisplayColor(plan) {
  if (Number.isInteger(plan.eventColor) && plan.eventColor >= 0 && plan.eventColor <= 5) return plan.eventColor;
  if (EVENT_CATEGORIES[plan.eventCategory]) return EVENT_CATEGORIES[plan.eventCategory].color;
  return eventColorIndex(plan.id);
}

function eventCategoryLabel(plan) {
  return EVENT_CATEGORIES[plan.eventCategory]?.label || EVENT_CATEGORIES[DEFAULT_EVENT_CATEGORY].label;
}

function calendarItemsForDate(key) {
  const items = [];
  const today = todayKey();

  if (key === today) {
    state.tasks.filter((task) => !task.done).forEach((task) => {
      items.push({ type: "task", label: `Task: ${task.text}` });
    });
  }

  state.habits.forEach((habit) => {
    if (isHabitMissedOnDate(habit, key)) {
      items.push({ type: "habit-missed", label: `Missed: ${habit.name}` });
    }
  });

  state.exams.forEach((exam) => {
    if (dateKey(new Date(exam.when)) === key) {
      items.push({ type: "exam", label: `Exam: ${exam.name}` });
    }
  });

  state.studyPlans.forEach((plan) => {
    if (eventCoversDate(plan, key)) {
      const start = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
      const end = plan.end || plan.until || start;
      items.push({
        type: "event",
        id: plan.id,
        name: plan.name,
        start,
        end,
        color: eventDisplayColor(plan),
        label: `${eventTimeLabel(plan) ? `${eventTimeLabel(plan)} ` : ""}${plan.name}`
      });
    }
  });

  return items;
}

function eventCoversDate(plan, key) {
  const start = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
  const end = plan.end || plan.until || start;
  return key >= start && key <= end;
}

function eventDateLabel(plan) {
  const start = plan.start || dateKey(new Date(plan.createdAt || Date.now()));
  const end = plan.end || plan.until || start;
  if (start === end) return `on ${shortDate(start)}`;
  return `${shortDate(start)} to ${shortDate(end)}`;
}

function eventMetaLabel(plan) {
  const pieces = [];
  const timeLabel = eventTimeLabel(plan);
  if (timeLabel) pieces.push(timeLabel);
  if ((plan.timeMode || "none") === "at" && plan.minutes) pieces.push(`${plan.minutes} min`);
  pieces.push(eventDateLabel(plan));
  return pieces.join(" / ");
}

function eventTimeLabel(plan) {
  const startTime = eventStartTime(plan);
  if (!startTime) return "";
  const endTime = eventEndTime(plan);
  if ((plan.timeMode || "at") === "span" && endTime) {
    return `${formatTime(startTime)} to ${formatTime(endTime)}`;
  }
  return formatTime(startTime);
}

function eventStartTime(plan) {
  return plan.startTime || plan.time || "";
}

function eventEndTime(plan) {
  return plan.endTime || "";
}

function celebrate() {
  const colors = ["#4f6f52", "#d9a441", "#bd654f", "#5b6f9c", "#20231f"];
  els.celebration.innerHTML = "";

  for (let i = 0; i < 34; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = `${Math.random() * 18}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 160}ms`;
    els.celebration.appendChild(piece);
  }

  window.setTimeout(() => {
    els.celebration.innerHTML = "";
  }, 1200);
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2400);
}

function topicTitle(topicId) {
  return state.topics.find((topic) => topic.id === topicId)?.title || "Life";
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function notePreview(value) {
  const text = stripHtml(value).trim();
  if (!text) return "No notes yet";
  return text.length > 86 ? `${text.slice(0, 83)}...` : text;
}

function brainPreview(value) {
  const text = stripHtml(value).trim();
  if (!text) return "blank scrap";
  return text.length > 72 ? `${text.slice(0, 69)}...` : text;
}

function stripHtml(value) {
  const container = document.createElement("div");
  container.innerHTML = String(value || "");
  return (container.textContent || container.innerText || String(value || "")).replace(/\s+/g, " ");
}

function shortDate(value) {
  const date = String(value).includes("T") ? new Date(value) : new Date(`${value}T00:00`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatMoney(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatTime(value) {
  const [hourValue, minute = "00"] = String(value).split(":");
  const hour = Number(hourValue);
  const suffix = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

function minutesFromTime(value) {
  const [hour = "0", minute = "0"] = String(value || "00:00").split(":");
  return Number(hour) * 60 + Number(minute);
}

function formatMinute(value) {
  const hour = Math.floor(value / 60) % 24;
  const minute = value % 60;
  return formatTime(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
}

function sleepDurationMinutes(log) {
  const start = minutesFromTime(log.start);
  const end = minutesFromTime(log.end);
  return end > start ? end - start : end + 1440 - start;
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function compactDate(key) {
  return String(key).replace(/-/g, "");
}

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function todayKey() {
  return dateKey(new Date());
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function habitStreak(completedDates) {
  const set = new Set(completedDates);
  let streak = 0;
  const cursor = new Date(`${todayKey()}T00:00`);

  while (set.has(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function bestHabitStreak(completedDates) {
  const dates = [...new Set(completedDates)].sort();
  let best = 0;
  let current = 0;
  let previous = null;

  dates.forEach((key) => {
    if (previous && daysBetween(previous, key) === 1) {
      current += 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    previous = key;
  });

  return best;
}

function isHabitMissedOnDate(habit, key) {
  if (key >= todayKey()) return false;
  if (!habitStartedByDate(habit, key)) return false;
  return !new Set(habit.completedDates || []).has(key);
}

function habitStartedByDate(habit, key) {
  const created = dateKey(new Date(habit.createdAt || Date.now()));
  return key >= created;
}

function daysBetween(a, b) {
  const start = new Date(`${a}T00:00`);
  const end = new Date(`${b}T00:00`);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function initials(value) {
  const words = String(value || "Life").trim().split(/\s+/);
  return words.slice(0, 2).map((word) => word[0] || "").join("").toUpperCase() || "LA";
}

function normalizeIcon(value, fallback) {
  const icon = String(value || "").trim().slice(0, 2).toUpperCase();
  return icon || initials(fallback);
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (window.location.protocol === "file:") return;

  navigator.serviceWorker.register("./sw.js").catch(() => {
    showToast("Offline mode could not be enabled in this browser.");
  });
}
