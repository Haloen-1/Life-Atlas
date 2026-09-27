/* Keep native selects as the form/data layer, with one accessible custom popup above them. */
(() => {
  const records = new Map();
  let menu = null;
  let opened = null;
  let activeIndex = 0;
  let search = "";
  let searchTimer;

  function labelFor(select) {
    return select.getAttribute("aria-label") || select.labels?.[0]?.childNodes[0]?.textContent.trim() || select.id.replace(/([A-Z])/g, " $1");
  }

  window.syncAtlasSelects = function syncAtlasSelects() {
    records.forEach((button, select) => {
      button.querySelector(".select-label").textContent = select.selectedOptions[0]?.textContent || "Choose";
      button.disabled = select.disabled;
      button.setAttribute("aria-label", labelFor(select) + ": " + button.textContent);
    });
  };

  window.closeAtlasSelect = function closeAtlasSelect(focus = false) {
    if (!opened) return;
    const button = records.get(opened);
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-activedescendant");
    if (menu.matches(":popover-open")) menu.hidePopover();
    menu.hidden = true;
    opened = null;
    if (focus) button.focus();
  };

  function highlight(index) {
    if (!opened) return;
    const options = [...opened.options];
    activeIndex = Math.max(0, Math.min(options.length - 1, index));
    menu.querySelectorAll("[role=option]").forEach((option, i) => option.classList.toggle("highlighted", i === activeIndex));
    records.get(opened).setAttribute("aria-activedescendant", "atlas-option-" + activeIndex);
    menu.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  function choose(index) {
    if (!opened || !opened.options[index] || opened.options[index].disabled) return;
    const select = opened;
    select.selectedIndex = index;
    closeAtlasSelect(true);
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
    syncAtlasSelects();
  }

  function positionMenu() {
    if (!opened) return;
    const box = records.get(opened).getBoundingClientRect();
    if (!box.width || box.bottom < 0 || box.top > innerHeight) { closeAtlasSelect(); return; }
    const availableBelow = innerHeight - box.bottom - 14;
    const availableAbove = box.top - 14;
    const below = availableBelow >= Math.min(280, opened.options.length * 37) || availableBelow >= availableAbove;
    const height = Math.min(300, Math.max(80, below ? availableBelow : availableAbove));
    menu.style.width = Math.min(innerWidth - 24, Math.max(180, box.width)) + "px";
    menu.style.maxHeight = height + "px";
    menu.style.left = Math.max(12, Math.min(box.left, innerWidth - parseFloat(menu.style.width) - 12)) + "px";
    menu.style.top = below ? box.bottom + 6 + "px" : "auto";
    menu.style.bottom = below ? "auto" : innerHeight - box.top + 6 + "px";
  }

  function open(select) {
    if (opened === select) { closeAtlasSelect(); return; }
    closeAtlasSelect();
    syncAtlasSelects();
    opened = select;
    menu.replaceChildren();
    menu.setAttribute("aria-label", labelFor(select));
    [...select.options].forEach((option, index) => {
      const row = document.createElement("div");
      row.id = "atlas-option-" + index;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(option.selected));
      row.setAttribute("aria-disabled", String(option.disabled));
      row.textContent = option.textContent;
      row.addEventListener("pointermove", () => highlight(index));
      row.addEventListener("pointerdown", (event) => event.preventDefault());
      row.addEventListener("click", () => choose(index));
      menu.appendChild(row);
    });
    const button = records.get(select);
    button.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    menu.showPopover?.();
    positionMenu();
    highlight(select.selectedIndex);
  }

  window.setupCustomSelects = function setupCustomSelects() {
    menu = document.createElement("div");
    menu.id = "atlas-select-menu";
    menu.className = "atlas-select-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("popover", "manual");
    menu.hidden = true;
    document.body.appendChild(menu);
    document.querySelectorAll("select").forEach((select) => {
      const wrapper = document.createElement("span");
      wrapper.className = "atlas-select";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "atlas-select-trigger";
      button.setAttribute("role", "combobox");
      button.setAttribute("aria-haspopup", "listbox");
      button.setAttribute("aria-controls", menu.id);
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = '<span class="select-label"></span><span class="select-chevron" aria-hidden="true"></span>';
      select.before(wrapper);
      wrapper.append(select, button);
      select.classList.add("atlas-native-select");
      select.tabIndex = -1;
      select.setAttribute("aria-hidden", "true");
      records.set(select, button);
      button.addEventListener("click", () => open(select));
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape") { event.preventDefault(); closeAtlasSelect(true); return; }
        if (event.key === "Tab") { closeAtlasSelect(); return; }
        if (["Enter", " "].includes(event.key)) {
          event.preventDefault();
          if (opened === select) choose(activeIndex); else open(select);
          return;
        }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault();
          if (opened !== select) open(select);
          else highlight(event.key === "Home" ? 0 : event.key === "End" ? select.options.length - 1 : activeIndex + (event.key === "ArrowDown" ? 1 : -1));
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          if (opened !== select) open(select);
          clearTimeout(searchTimer);
          search += event.key.toLowerCase();
          const index = [...select.options].findIndex((option) => option.textContent.toLowerCase().startsWith(search));
          if (index >= 0) highlight(index);
          searchTimer = setTimeout(() => { search = ""; }, 500);
        }
      });
      select.addEventListener("change", syncAtlasSelects);
      select.addEventListener("invalid", (event) => { event.preventDefault(); button.focus(); open(select); });
      new MutationObserver(syncAtlasSelects).observe(select, { childList: true, subtree: true, attributes: true });
    });
    document.addEventListener("pointerdown", (event) => {
      if (opened && !menu.contains(event.target) && !records.get(opened).contains(event.target)) closeAtlasSelect();
    });
    document.addEventListener("scroll", (event) => { if (opened && !menu.contains(event.target)) positionMenu(); }, true);
    window.addEventListener("resize", () => closeAtlasSelect());
    document.addEventListener("reset", () => requestAnimationFrame(syncAtlasSelects));
    syncAtlasSelects();
  };
})();

window.setupWorkspaceResize = function setupWorkspaceResize(drawer, handle, getSize, saveSize) {
  function apply(size) {
    if (!size) return;
    drawer.style.width = Math.max(280, Math.min(innerWidth - 36, size.width)) + "px";
    drawer.style.height = Math.max(240, Math.min(innerHeight - 100, size.height)) + "px";
  }
  apply(getSize());
  let drag = null;
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const box = drawer.getBoundingClientRect();
    drag = { x: event.clientX, y: event.clientY, width: box.width, height: box.height };
    handle.setPointerCapture(event.pointerId);
    drawer.classList.add("resizing");
  });
  handle.addEventListener("pointermove", (event) => {
    if (drag) apply({ width: drag.width + event.clientX - drag.x, height: drag.height - event.clientY + drag.y });
  });
  const end = () => {
    if (!drag) return;
    drag = null;
    drawer.classList.remove("resizing");
    const box = drawer.getBoundingClientRect();
    saveSize({ width: box.width, height: box.height });
  };
  handle.addEventListener("pointerup", end);
  handle.addEventListener("pointercancel", end);
  handle.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const box = drawer.getBoundingClientRect();
    const size = { width: box.width + (event.key === "ArrowRight" ? 24 : event.key === "ArrowLeft" ? -24 : 0),
      height: box.height + (event.key === "ArrowUp" ? 24 : event.key === "ArrowDown" ? -24 : 0) };
    apply(size);
    saveSize({ width: drawer.offsetWidth, height: drawer.offsetHeight });
  });
  window.addEventListener("resize", () => apply(getSize()));
};

/* Pointer gestures reuse the app's existing reorder rules without a native browser drag session. */
window.setupPointerReordering = function setupPointerReordering() {
  let drag = null;
  let ignoreClickUntil = 0;
  const selector = ".habit-card[draggable=true], .folder-card[draggable=true], .task-item[draggable=true], .tree-item[draggable=true]";
  function emit(type, target, event) {
    return target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true,
      clientX: event.clientX, clientY: event.clientY, dataTransfer: drag.transfer }));
  }
  document.addEventListener("dragstart", (event) => {
    if (event.isTrusted && event.target.closest(selector)) event.preventDefault();
  }, true);
  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const source = event.target.closest(selector);
    if (!source || event.target.closest("input, textarea, select, [contenteditable=true], .subtask")) return;
    if (event.target.closest("button") && !event.target.closest(".tree-row")) return;
    drag = { source, origin: event.target, x: event.clientX, y: event.clientY,
      transfer: new DataTransfer(), started: false, target: null, pointerId: event.pointerId };
  });
  document.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.started) {
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 7) return;
      if (!emit("dragstart", drag.origin, event)) { drag = null; return; }
      drag.started = true;
      closeAtlasSelect();
      document.body.classList.add("atlas-dragging");
      const box = drag.source.getBoundingClientRect();
      drag.ghost = drag.source.cloneNode(true);
      drag.ghost.removeAttribute("id");
      drag.ghost.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      drag.ghost.classList.add("atlas-drag-ghost");
      drag.ghost.setAttribute("aria-hidden", "true");
      drag.ghost.inert = true;
      drag.ghost.style.width = Math.min(box.width, 360) + "px";
      document.body.appendChild(drag.ghost);
      drag.source.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    drag.ghost.style.left = Math.max(8, Math.min(event.clientX + 14, innerWidth - drag.ghost.offsetWidth - 8)) + "px";
    drag.ghost.style.top = Math.max(8, Math.min(event.clientY + 12, innerHeight - drag.ghost.offsetHeight - 8)) + "px";
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(selector);
    const sameKind = target && ["habit-card", "folder-card", "task-item", "tree-item"]
      .some((name) => target.classList.contains(name) && drag.source.classList.contains(name));
    if (drag.target && drag.target !== target) emit("dragleave", drag.target, event);
    drag.target = sameKind && target !== drag.source ? target : null;
    if (drag.target) emit("dragover", drag.target, event);
    // Keep long lists usable at either edge while dragging.
    let scroller = document.elementFromPoint(event.clientX, event.clientY);
    while (scroller && scroller !== document.body) {
      if (scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY)) break;
      scroller = scroller.parentElement;
    }
    scroller = scroller || document.scrollingElement;
    const box = scroller === document.body ? { top: 0, bottom: innerHeight } : scroller.getBoundingClientRect();
    scroller.scrollTop += event.clientY < box.top + 40 ? -12 : event.clientY > box.bottom - 40 ? 12 : 0;
  }, { passive: false });
  function finish(event, cancel) {
    if (!drag) return;
    if (drag.started) {
      ignoreClickUntil = performance.now() + 350;
      if (!cancel && drag.target) emit("drop", drag.target, event);
      emit("dragend", drag.origin, event);
      drag.ghost.remove();
      document.body.classList.remove("atlas-dragging");
      if (drag.source.hasPointerCapture(drag.pointerId)) drag.source.releasePointerCapture(drag.pointerId);
    }
    drag = null;
  }
  document.addEventListener("pointerup", (event) => finish(event, false));
  document.addEventListener("pointercancel", (event) => finish(event, true));
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") finish(event, true); });
  window.addEventListener("blur", (event) => finish(event, true));
  document.addEventListener("click", (event) => {
    if (performance.now() < ignoreClickUntil && event.target.closest(selector)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
};
