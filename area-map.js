/* D3 owns the simulation and gestures; app state owns area content and saved positions. */
window.createAreaMap = function createAreaMap(svgElement, options) {
  const d3 = window.d3;
  const svg = d3.select(svgElement);
  const layer = svg.append("g").attr("class", "map-layer");
  const edgeLayer = layer.append("g");
  const nodeLayer = layer.append("g");
  let simulation = null;
  let nodes = [];
  let orientation = "horizontal";
  let signature = "";
  let zoomTransform = d3.zoomIdentity;
  let active = false;
  let fitPending = false;
  const width = 172;
  const height = 66;
  const reduced = () => !options.motion() || matchMedia("(prefers-reduced-motion: reduce)").matches;
  function sizeViewport() {
    const viewport = svgElement.parentElement;
    const top = viewport.getBoundingClientRect().top;
    viewport.style.height = Math.max(240, innerHeight - top - 18) + "px";
  }

  const zoom = d3.zoom().scaleExtent([0.08, 2.5])
    .filter((event) => !event.button && (event.type === "wheel" || !event.target.closest(".map-node")))
    .on("start", () => svgElement.classList.add("map-panning"))
    .on("zoom", (event) => {
      zoomTransform = event.transform;
      layer.attr("transform", zoomTransform);
    })
    .on("end", () => svgElement.classList.remove("map-panning"));
  svg.call(zoom).on("dblclick.zoom", null);

  function draw() {
    nodeLayer.selectAll(".map-node").attr("transform", (node) => `translate(${node.x},${node.y})`);
    edgeLayer.selectAll("path").attr("d", (link) => {
      const a = link.source;
      const b = link.target;
      if (orientation === "horizontal") {
        const x1 = a.x + width / 2, x2 = b.x - width / 2, mid = (x1 + x2) / 2;
        return `M${x1},${a.y} C${mid},${a.y} ${mid},${b.y} ${x2},${b.y}`;
      }
      const y1 = a.y + height / 2, y2 = b.y - height / 2, mid = (y1 + y2) / 2;
      return `M${a.x},${y1} C${a.x},${mid} ${b.x},${mid} ${b.x},${y2}`;
    });
  }

  function fit() {
    if (!nodes.length || !active) return;
    const rect = svgElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x0 = d3.min(nodes, (n) => n.x) - width / 2 - 38;
    const y0 = d3.min(nodes, (n) => n.y) - height / 2 - 38;
    const x1 = d3.max(nodes, (n) => n.x) + width / 2 + 38;
    const y1 = d3.max(nodes, (n) => n.y) + height / 2 + 38;
    const scale = Math.max(0.08, Math.min(1.15, rect.width / (x1 - x0), rect.height / (y1 - y0)));
    const transform = d3.zoomIdentity.translate(rect.width / 2, rect.height / 2)
      .scale(scale).translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    svg.interrupt().transition().duration(reduced() ? 0 : 260).call(zoom.transform, transform);
  }

  function update(data) {
    const wasActive = active;
    active = data.active;
    if (!active) { simulation?.stop(); return; }
    const nextSignature = JSON.stringify([data.topics, data.orientation, data.showNotes, data.positions]);
    if (signature === nextSignature) {
      if (!reduced()) simulation?.alpha(0.1).restart();
      if (!wasActive) requestAnimationFrame(() => { sizeViewport(); fit(); });
      return;
    }
    signature = nextSignature;
    simulation?.stop();
    orientation = data.orientation;
    // A tree layout supplies distinct depth and branch targets instead of a single central attraction.
    const byId = new Map(data.topics.map((topic) => [topic.id, { ...topic, children: [] }]));
    const roots = [];
    byId.forEach((topic) => {
      let cursor = byId.get(topic.parentId);
      const seen = new Set([topic.id]);
      while (cursor && !seen.has(cursor.id)) { seen.add(cursor.id); cursor = byId.get(cursor.parentId); }
      if (cursor || !byId.has(topic.parentId)) roots.push(topic);
      else byId.get(topic.parentId).children.push(topic);
    });
    const hierarchy = d3.hierarchy({ id: "__atlas__", children: roots });
    d3.tree().nodeSize(orientation === "horizontal" ? [105, 270] : [205, 170])(hierarchy);
    nodes = hierarchy.descendants().filter((n) => n.depth > 0).map((n) => {
      const value = data.positions[n.data.id];
      const saved = value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : null;
      const tx = orientation === "horizontal" ? (n.depth - 1) * 270 : saved?.x ?? n.x;
      const ty = orientation === "horizontal" ? saved?.y ?? n.x : (n.depth - 1) * 170;
      return { ...n.data, tx, ty, x: saved?.x ?? tx, y: saved?.y ?? ty };
    });
    const nodeById = new Map(nodes.map((n) => [n.id, n]));
    const links = nodes.filter((n) => nodeById.has(n.parentId))
      .map((n) => ({ source: nodeById.get(n.parentId), target: n }));
    edgeLayer.selectAll("path").data(links, (d) => d.target.id).join("path").attr("class", "map-edge");
    const groups = nodeLayer.selectAll("g").data(nodes, (d) => d.id).join((enter) => {
      const group = enter.append("g").attr("class", "map-node").attr("tabindex", 0).attr("role", "button");
      group.append("rect").attr("class", "map-node-body").attr("x", -width / 2).attr("y", -height / 2)
        .attr("width", width).attr("height", height).attr("rx", 8);
      group.append("circle").attr("class", "map-node-dot").attr("cx", -width / 2 + 17).attr("cy", -10).attr("r", 5);
      group.append("text").attr("class", "map-node-title").attr("x", -width / 2 + 30).attr("y", -5);
      group.append("text").attr("class", "map-node-note").attr("x", -width / 2 + 12).attr("y", 17);
      group.append("circle").attr("class", "map-note-mark").attr("cx", width / 2 - 9).attr("cy", -height / 2 + 9).attr("r", 3);
      group.append("title");
      return group;
    });
    groups.attr("aria-label", (n) => `Open ${n.title}`)
      .classed("selected", (n) => n.id === data.selectedId);
    groups.select(".map-node-dot").attr("fill", (n) => n.color || "#4f6f52");
    groups.select(".map-node-title").text((n) => n.title.length > 17 ? n.title.slice(0, 16) + "..." : n.title);
    groups.select(".map-node-note").text((n) => data.showNotes ? (n.note || "").slice(0, 25) : "");
    groups.select(".map-note-mark").attr("display", (n) => n.note ? null : "none");
    groups.select("title").text((n) => n.title + (n.note ? "\n" + n.note : ""));
    groups.on("click", (event, n) => { if (!event.defaultPrevented) options.onOpen(n.id); })
      .on("keydown", (event, n) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); options.onOpen(n.id); }
      });
    simulation = d3.forceSimulation(nodes)
      .force("links", d3.forceLink(links).distance(orientation === "horizontal" ? 270 : 170).strength(0.035))
      .force("repel", d3.forceManyBody().strength(-180).distanceMax(550))
      .force("collision", d3.forceCollide(orientation === "horizontal" ? 52 : 94).iterations(3))
      .force("hierarchyX", d3.forceX((n) => n.tx).strength(orientation === "horizontal" ? 0.28 : 0.055))
      .force("hierarchyY", d3.forceY((n) => n.ty).strength(orientation === "vertical" ? 0.28 : 0.055))
      .velocityDecay(0.48).alphaDecay(0.035).on("tick", draw).stop();
    simulation.tick(100);
    draw();
    groups.call(d3.drag().container(() => layer.node()).clickDistance(5)
      .on("start", function(event, n) {
        d3.select(this).classed("dragging", true);
        document.body.classList.add("atlas-dragging");
        n.fx = n.x; n.fy = n.y;
        if (!reduced()) simulation.alphaTarget(0.14).restart();
      })
      .on("drag", (event, n) => {
        n.fx = event.x; n.fy = event.y; n.x = event.x; n.y = event.y;
        if (reduced()) simulation.tick(1);
        draw();
      })
      .on("end", function(event, n) {
        d3.select(this).classed("dragging", false);
        document.body.classList.remove("atlas-dragging");
        options.onMove(n.id, { x: n.x, y: n.y });
        // Keep the user's branch position while retaining a depth attraction.
        if (orientation === "horizontal") n.ty = n.y; else n.tx = n.x;
        n.fx = null; n.fy = null;
        simulation.force("hierarchyX").x((item) => item.tx);
        simulation.force("hierarchyY").y((item) => item.ty);
        simulation.alphaTarget(0);
        if (reduced()) { simulation.tick(100); draw(); } else simulation.alpha(0.35).restart();
      }));
    requestAnimationFrame(() => { sizeViewport(); fit(); });
  }
  new ResizeObserver(() => {
    if (!active || fitPending) return;
    fitPending = true;
    requestAnimationFrame(() => { fitPending = false; sizeViewport(); fit(); });
  }).observe(svgElement);
  window.addEventListener("resize", () => { if (active) { sizeViewport(); fit(); } });
  svgElement.parentElement.addEventListener("keydown", (event) => {
    if (event.target !== svgElement && event.target.closest(".map-node")) return;
    const moves = { ArrowLeft: [60, 0], ArrowRight: [-60, 0], ArrowUp: [0, 60], ArrowDown: [0, -60] };
    if (moves[event.key]) {
      event.preventDefault();
      svg.call(zoom.translateBy, moves[event.key][0] / zoomTransform.k, moves[event.key][1] / zoomTransform.k);
    }
  });
  return {
    update, fit,
    scaleBy(factor) { svg.interrupt().transition().duration(reduced() ? 0 : 160).call(zoom.scaleBy, factor); },
    reset() { signature = ""; }
  };
};
