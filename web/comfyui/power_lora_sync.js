// Live editor mirror for the Power Lora Loader's lora_config input.
//
// The Python side already syncs at generation time (a connected lora_config
// input is applied instead of the node's own rows). This adds the *visual*
// half: when a node's lora_config input is wired from another loader, its lora
// rows are rebuilt to match the source so the two loaders look synchronized in
// the editor. Disconnecting restores the node's own rows.
//
// Source may be another "Power Lora Loader (rgthree)" or the standalone
// "PowerLoraPlus" node (whose rows live in a loras_data JSON widget).
import { app } from "../../scripts/app.js";

const RG_TYPE = "Power Lora Loader (rgthree)";
const KNOWN_SOURCES = new Set([RG_TYPE, "PowerLoraPlus"]);

function nodeType(n) {
  return (n && (n.comfyClass || n.type)) || "";
}

// rgthree lora rows: custom widgets named lora_* whose value is {on,lora,...}.
function readRgthreeRows(node) {
  return (node.widgets || [])
    .filter((w) => w && w.value && typeof w.value.lora === "string" && /^lora_/.test(w.name || ""))
    .map((w) => ({ ...w.value }));
}

// Read rows from whatever kind of source node is connected.
function readSourceRows(src) {
  // PowerLoraPlus keeps its rows as JSON in a loras_data widget.
  const d = (src.widgets || []).find((w) => w && w.name === "loras_data");
  if (d && typeof d.value === "string") {
    try {
      let v = JSON.parse(d.value);
      if (typeof v === "string") v = JSON.parse(v);
      const arr = Array.isArray(v) ? v : v && v.loras;
      if (Array.isArray(arr))
        return arr.filter((r) => r && typeof r.lora === "string").map((r) => ({ ...r }));
    } catch (e) {}
  }
  return readRgthreeRows(src);
}

function getSource(node) {
  const input = (node.inputs || []).find((i) => i.name === "lora_config");
  if (!input || input.link == null) return null;
  const link = app.graph.links[input.link];
  if (!link) return null;
  const src = app.graph.getNodeById(link.origin_id);
  if (!src || !KNOWN_SOURCES.has(nodeType(src))) return null;
  return src;
}

// Normalize a row to rgthree's widget value shape.
function normRow(r) {
  const row = { on: r.on !== false, lora: r.lora, strength: r.strength != null ? r.strength : 1 };
  if (r.strengthTwo != null) row.strengthTwo = r.strengthTwo;
  return row;
}

// Rebuild the node's lora widgets from `rows` using rgthree's own configure().
function rebuild(node, rows) {
  node.configure({ widgets_values: rows.map(normRow) });
  if (app.graph) app.graph.setDirtyCanvas(true, true);
}

function scheduleRebuild(node, rows) {
  if (node.__pls_pending) return;
  node.__pls_pending = true;
  setTimeout(() => {
    node.__pls_pending = false;
    try { rebuild(node, rows); } catch (e) {}
  }, 0);
}

function maybeSync(node) {
  const src = getSource(node);
  if (!src) {
    if (node.__pls_driven) {
      const own = node.__pls_own || [];
      node.__pls_driven = false;
      node.__pls_key = null;
      node.__pls_own = null;
      scheduleRebuild(node, own);   // restore the node's own rows
    }
    return;
  }
  const rows = readSourceRows(src);
  const key = JSON.stringify(rows);
  if (key === node.__pls_key) return;          // unchanged → nothing to do
  if (!node.__pls_driven) {                     // first time driven: cache own rows
    node.__pls_own = readRgthreeRows(node);
    node.__pls_driven = true;
  }
  node.__pls_key = key;
  scheduleRebuild(node, rows);
}

app.registerExtension({
  name: "rgthree.power.lora.sync",
  // rgthree overrides the node class (OVERRIDDEN_SERVER_NODES), so patching the
  // nodeType prototype in beforeRegisterNodeDef misses the real instances.
  // Patch each instance directly via nodeCreated (override-agnostic).
  nodeCreated(node) {
    if (nodeType(node) !== RG_TYPE || node.__pls_hooked) return;
    node.__pls_hooked = true;
    const onDraw = node.onDrawForeground;
    node.onDrawForeground = function (ctx) {
      try { maybeSync(this); } catch (e) {}
      return onDraw ? onDraw.apply(this, arguments) : undefined;
    };
  },
});
