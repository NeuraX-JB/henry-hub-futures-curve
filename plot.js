// Responsive, dependency-free chart for historical settlements and paired spreads.
(() => {
  "use strict";

  const ns = "http://www.w3.org/2000/svg";
  const activeCharts = new WeakMap();
  const palette = ["#087c76", "#b96837", "#4b6592"];
  const ink = "#49656a";
  const grid = "#dae5e3";
  const font = "Inter, 'Segoe UI', Arial, sans-serif";
  let nextId = 0;

  function svgNode(name, attrs = {}, content) {
    const element = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) {
      if (value !== undefined && value !== null) element.setAttribute(key, String(value));
    }
    if (content !== undefined) element.textContent = content;
    return element;
  }

  function label(svg, x, y, text, attrs = {}) {
    svg.append(svgNode("text", {
      x, y, fill: ink, "font-family": font, "font-size": 11.5,
      "font-weight": 500, ...attrs
    }, text));
  }

  function tickScale(low, high, includeZero) {
    if (includeZero) {
      low = Math.min(low, 0);
      high = Math.max(high, 0);
    }
    // Keep the axis arithmetic finite, including opposing prices close to Number.MAX_VALUE.
    const maxAbs = Math.max(Math.abs(low), Math.abs(high));
    const exponent = maxAbs >= 1e7 ? Math.floor(Math.log10(maxAbs)) : 0;
    const divisor = 10 ** exponent;
    const a = low / divisor;
    const b = high / divisor;
    const span = Math.max(b - a, 0.001 / divisor, Math.max(Math.abs(a), Math.abs(b)) * 0.001);
    const center = (a + b) / 2;
    const floor = includeZero && low === 0 ? 0 : center - span * 0.58;
    const ceiling = includeZero && high === 0 && low < 0 ? 0 : center + span * 0.58;
    const raw = (ceiling - floor) / 4.5;
    const magnitude = 10 ** Math.floor(Math.log10(raw));
    const factor = [1, 2, 2.5, 5, 10].find(item => item >= raw / magnitude) || 10;
    const step = magnitude * factor;
    const first = Math.floor(floor / step + 1e-10);
    const last = Math.ceil(ceiling / step - 1e-10);
    const count = Math.max(2, Math.min(12, last - first + 1));
    const ticks = Array.from({length: count}, (_, offset) => (first + offset) * step);
    return {min: ticks[0], max: ticks[ticks.length - 1], ticks, step, divisor, exponent};
  }

  function tickText(n, step) {
    const precision = Math.min(6, Math.max(2, Math.ceil(-Math.log10(step) - 1e-9)));
    // A 0.025 spacing needs three places even though its exponent is -2.
    const extra = Math.abs(step * (10 ** precision) - Math.round(step * (10 ** precision))) > 1e-7;
    return (Math.abs(n) < Math.abs(step) * 1e-6 ? 0 : n).toFixed(Math.min(7, precision + Number(extra)));
  }

  function addMarker(target, x, y, i, radius, color) {
    if (i % 2 === 1) {
      const r = radius * 1.12;
      target.append(svgNode("path", {
        d: 'M' + x + ' ' + (y-r) + ' L' + (x+r) + ' ' + y + ' L' + x + ' ' + (y+r) + ' L' + (x-r) + ' ' + y + ' Z',
        fill: "#ffffff", stroke: color, "stroke-width": 1.8
      }));
    } else {
      target.append(svgNode("circle", {cx: x, cy: y, r: radius, fill: "#ffffff", stroke: color, "stroke-width": 2}));
    }
  }

  function showEmpty(host, text) {
    const empty = document.createElement("div");
    empty.style.cssText = "box-sizing:border-box;min-height:210px;display:grid;place-items:center;padding:32px;color:#49656a;text-align:center;font:500 15px/1.55 " + font;
    empty.textContent = text || "No paired prices are available for this selection.";
    host.replaceChildren(empty);
  }

  function paint(state, width) {
    const host = state.host;
    const restoreFocus = host.contains(document.activeElement);
    const cfg = state.cfg;
    const labels = cfg.labels || [];
    const series = cfg.series || [];
    const n = labels.length;
    let low = Infinity;
    let high = -Infinity;
    for (const s of series) {
      for (let i = 0; i < n; i++) {
        const v = s.values[i];
        if (Number.isFinite(v)) {
          low = Math.min(low, v);
          high = Math.max(high, v);
        }
      }
    }
    if (!n || low === Infinity) {
      showEmpty(host, cfg.empty);
      return;
    }

    const w = Math.max(width, 180);
    const h = w < 480 ? 245 : w < 800 ? 276 : 295;
    const scale = tickScale(low, high, cfg.zero);
    const yLabels = scale.ticks.map(t => tickText(t, scale.step));
    const left = Math.max(39, ...yLabels.map(text => text.length * 7.7 + 10));
    const right = w - (w < 440 ? 16 : 26);
    const top = 34;
    const bottom = h - (cfg.xLabel ? 50 : 28);
    const hasPositions = Array.isArray(cfg.xPositions) && cfg.xPositions.length === n
      && cfg.xPositions.every((value, i, items) => Number.isFinite(value) && (!i || value > items[i-1]));
    const raw = hasPositions ? cfg.xPositions : labels.map((_, i) => i);
    const positions = raw.map(x => n === 1 ? (left + right) / 2 : left + (x - raw[0]) / (raw[n-1] - raw[0]) * (right-left));
    const scaledY = v => bottom - (v-scale.min) / (scale.max-scale.min) * (bottom-top);
    const toY = v => scaledY(v / scale.divisor);
    const defaultFormat = v => v.toFixed(3);
    const format = typeof cfg.formatValue === "function" ? cfg.formatValue : defaultFormat;

    const shell = document.createElement("div");
    shell.style.cssText = "position:relative;width:100%;min-width:0;line-height:1.3";
    const svg = svgNode("svg", {
      viewBox: '0 0 ' + w + ' ' + h, width: "100%", height: h, role: "group", tabindex: "0",
      "aria-label": [cfg.yLabel || "Value", cfg.xLabel ? "by " + cfg.xLabel : "", "Interactive chart. Use left and right arrow keys to inspect individual points."].filter(Boolean).join(". "),
      style: "display:block;overflow:visible;touch-action:pan-y;font-variant-numeric:tabular-nums"
    });
    shell.append(svg);
    host.replaceChildren(shell);

    const gradientId = "hh-plot-fill-" + state.id;
    const defs = svgNode("defs");
    const gradient = svgNode("linearGradient", {id: gradientId, x1: 0, y1: 0, x2: 0, y2: 1, gradientUnits: "objectBoundingBox"});
    gradient.append(
      svgNode("stop", {offset: "0%", "stop-color": series[0]?.color || palette[0], "stop-opacity": 0.095}),
      svgNode("stop", {offset: "100%", "stop-color": series[0]?.color || palette[0], "stop-opacity": 0.008})
    );
    defs.append(gradient);
    svg.append(defs);

    const axisTitle = [cfg.yLabel, scale.exponent ? "× 10^" + scale.exponent : ""].filter(Boolean).join(" ");
    if (axisTitle) label(svg, left, 14, axisTitle, {"font-size": 12, "font-weight": 600});
    scale.ticks.forEach((v, i) => {
      const y = scaledY(v);
      const zeroLine = cfg.zero && Math.abs(v) < scale.step / 100;
      svg.append(svgNode("line", {
        x1: left, x2: right, y1: y, y2: y, stroke: zeroLine ? "#849c9b" : grid,
        "stroke-width": zeroLine ? 1.35 : 1, "stroke-dasharray": zeroLine ? "4 4" : undefined
      }));
      label(svg, left - 9, y + 3.6, yLabels[i], {"text-anchor": "end"});
    });

    // Greedy placement in pixel space also works for irregularly spaced observations.
    const estimate = value => Array.from(String(value)).length * 6.35;
    const firstWidth = estimate(labels[0]);
    const lastWidth = estimate(labels[n - 1]);
    let lastEnd = -Infinity;
    for (let i = 0; i < n; i++) {
      const final = i === n-1;
      const anchor = n === 1 ? "middle" : i === 0 ? "start" : final ? "end" : "middle";
      const lx = positions[i];
      const size = estimate(labels[i]);
      const start = anchor === "start" ? lx : anchor === "end" ? lx-size : lx-size/2;
      const end = start + size;
      if (!final && i > 0 && (start < lastEnd + 15 || end > right - lastWidth - 15)) continue;
      if (final && i > 0 && right - lastWidth < left + firstWidth && w < 300) continue;
      label(svg, lx, bottom + 19, labels[i], {"text-anchor": anchor, "font-size": w < 420 ? 10.5 : 11.5});
      lastEnd = end;
    }
    if (cfg.xLabel) label(svg, (left+right)/2, h-4, cfg.xLabel, {"text-anchor": "middle", "font-size": 12});

    series.forEach((s, si) => {
      const color = s.color || palette[si % palette.length];
      let run = [];
      const runs = [];
      const flush = () => { if (run.length) runs.push(run); run = []; };
      for (let i = 0; i < n; i++) {
        if (Number.isFinite(s.values[i])) run.push([positions[i], toY(s.values[i])]);
        else if (!cfg.connectNulls) flush();
      }
      flush();
      const sparseMarkers = runs.reduce((sum, r) => sum + r.length, 0) <= 22;
      for (const points of runs) {
        const path = points.map(([x,y], index) => (index ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2)).join(" ");
        if (!si && points.length > 1) {
          const baseline = cfg.zero ? toY(0) : bottom;
          const area = path + " L" + points[points.length-1][0] + " " + baseline + " L" + points[0][0] + " " + baseline + " Z";
          svg.append(svgNode("path", {d: area, fill: "url(#" + gradientId + ")", stroke: "none"}));
        }
        if (points.length > 1) {
          svg.append(svgNode("path", {
            d: path, stroke: color, fill: "none", "stroke-width": si === 0 ? 2.8 : 2.45,
            "stroke-linecap": "round", "stroke-linejoin": "round", "stroke-dasharray": s.dash || (si % 2 ? "6 5" : undefined)
          }));
        }
        if (sparseMarkers || points.length === 1) {
          for (const [x,y] of points) addMarker(svg, x, y, si, 3.15, color);
        }
      }
    });

    const cursor = svgNode("g", {"pointer-events": "none", visibility: "hidden", "aria-hidden": true});
    const guide = svgNode("line", {y1: top, y2: bottom, stroke: "#72908d", "stroke-dasharray": "3 4"});
    const dots = svgNode("g");
    cursor.append(guide, dots);
    svg.append(cursor);

    const tooltip = document.createElement("div");
    tooltip.style.cssText = "display:none;position:absolute;z-index:2;pointer-events:none;box-sizing:border-box;max-width:calc(100% - 10px);background:#132f33;color:#f7fbfa;border:1px solid #244449;border-radius:7px;padding:9px 11px;font:500 12px/1.45 " + font + ";box-shadow:0 3px 12px #193a3d22;white-space:normal";
    tooltip.setAttribute("aria-hidden", "true");
    const live = document.createElement("span");
    live.setAttribute("role", "status");
    live.style.cssText = "position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
    shell.append(tooltip, live);
    let selected = Math.min(state.selected ?? -1, n - 1);

    function inspect(index, announce) {
      if (index < 0 || index >= n) return;
      selected = index;
      state.selected = index;
      const px = positions[index];
      cursor.setAttribute("visibility", "visible");
      guide.setAttribute("x1", px);
      guide.setAttribute("x2", px);
      dots.replaceChildren();
      const title = document.createElement("strong");
      title.style.cssText = "display:block;margin-bottom:3px;font-size:12px;color:#fff";
      title.textContent = labels[index];
      tooltip.replaceChildren(title);
      const spoken = [String(labels[index]), cfg.xLabel || "", cfg.yLabel || ""].filter(Boolean);
      series.forEach((s, si) => {
        const v = s.values[index];
        if (Number.isFinite(v)) addMarker(dots, px, toY(v), si, 4.8, s.color || palette[si % palette.length]);
        const text = Number.isFinite(v) ? format(v) : "—";
        const row = document.createElement("div");
        row.style.cssText = "display:flex;align-items:baseline;justify-content:space-between;gap:14px;margin-top:2px";
        const name = document.createElement("span");
        name.style.color = "#d4e4e1";
        name.textContent = s.name;
        const value = document.createElement("b");
        value.style.cssText = "font-variant-numeric:tabular-nums;white-space:nowrap";
        value.textContent = text;
        row.append(name, value);
        tooltip.append(row);
        spoken.push(String(s.name) + " " + (Number.isFinite(v) ? text : "unavailable"));
      });
      if (announce) live.textContent = spoken.join(", ");
      tooltip.style.display = "block";
      const tw = tooltip.offsetWidth;
      const maxLeft = Math.max(5, w-tw-5);
      tooltip.style.left = Math.max(5, Math.min(maxLeft, px + tw + 14 > w ? px-tw-10 : px+10)) + "px";
      tooltip.style.top = Math.min(top+9, Math.max(0, h-tooltip.offsetHeight-8)) + "px";
    }

    function hide() {
      tooltip.style.display = "none";
      cursor.setAttribute("visibility", "hidden");
    }

    function inspectPointer(event) {
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (event.clientX - rect.left) * w / rect.width;
      const y = (event.clientY - rect.top) * h / rect.height;
      if (x < left - 10 || x > right + 10 || y < top - 16 || y > bottom + 18) {
        hide();
        return;
      }
      let a = 0, b = n - 1;
      while (a < b) {
        const mid = Math.floor((a+b)/2);
        if (positions[mid] < x) a = mid + 1;
        else b = mid;
      }
      const index = a > 0 && Math.abs(x-positions[a-1]) <= Math.abs(x-positions[a]) ? a-1 : a;
      if (selected !== index || tooltip.style.display === "none") inspect(index, false);
    }

    svg.addEventListener("pointermove", inspectPointer);
    svg.addEventListener("pointerdown", inspectPointer);
    svg.addEventListener("pointerleave", event => { if (event.pointerType !== "touch") hide(); });
    svg.addEventListener("focus", () => inspect(Math.max(0, selected), true));
    svg.addEventListener("blur", hide);
    svg.addEventListener("keydown", event => {
      let next;
      switch (event.key) {
        case "ArrowLeft": next = Math.max(0, selected-1); break;
        case "ArrowRight": next = Math.min(n-1, selected+1); break;
        case "Home": next = 0; break;
        case "End": next = n-1; break;
        case "Escape": hide(); return;
        default: return;
      }
      event.preventDefault();
      inspect(next, true);
    });
    if (restoreFocus) svg.focus({preventScroll:true});
  }

  function draw(host, config) {
    if (!host) return;
    let state = activeCharts.get(host);
    if (!state) {
      state = {host, cfg: config, id: ++nextId, width: 0, frame: null};
      activeCharts.set(host, state);
      if (typeof ResizeObserver === "function") {
        state.observer = new ResizeObserver(entries => {
          const width = Math.round(entries[entries.length - 1].contentRect.width);
          if (width <= 0 || width === state.width) return;
          if (state.frame !== null) cancelAnimationFrame(state.frame);
          state.frame = requestAnimationFrame(() => {
            state.frame = null;
            if (!host.isConnected || width === state.width) return;
            state.width = width;
            paint(state, width);
          });
        });
        state.observer.observe(host);
      }
    }
    if (state.cfg !== config) state.selected = -1;
    state.cfg = config;
    const width = Math.round(host.clientWidth || host.getBoundingClientRect().width) || 640;
    state.width = width;
    paint(state, width);
  }

  globalThis.CurvePlot = Object.freeze({draw});
})();

