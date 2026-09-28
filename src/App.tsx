import { useEffect, useRef, useState } from "react";
import { PRESETS, simulate, type FSM, type StateNode, type Transition } from "./fsm";
import AuthPanel from "./AuthPanel";
import SaveFsm, { type FsmSaveConfig } from "./SaveFsm";

const SVW = 900, SVH = 380;
const R = 32;
let counter = 1;
const nid = (p: string) => `${p}${counter++}_${Math.random().toString(36).slice(2, 6)}`;

function initialFsm(): FSM {
  return structuredClone(PRESETS[0].fsm);
}

export default function App() {
  const [fsm, setFsm] = useState<FSM>(initialFsm);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<{ from: string; x: number; y: number } | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{ from: string; to: string } | null>(null);
  const [symbolInput, setSymbolInput] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const [input, setInput] = useState("1101");
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof simulate> | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; ox: number; oy: number; moved: boolean } | null>(null);
  const wiring = useRef<string | null>(null);

  function toSvg(clientX: number, clientY: number) {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (clientX - r.left) * (SVW / r.width), y: (clientY - r.top) * (SVH / r.height) };
  }

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const p = toSvg(e.clientX, e.clientY);
      if (drag.current) {
        const d = drag.current;
        setFsm((f) => ({ ...f, states: f.states.map((s) => s.id === d.id ? { ...s, x: p.x - d.ox, y: p.y - d.oy } : s) }));
        d.moved = true;
      } else if (wiring.current) {
        setPending({ from: wiring.current, x: p.x, y: p.y });
      }
    };
    const up = (e: PointerEvent) => {
      if (drag.current) {
        const d = drag.current;
        if (!d.moved) setSelected(d.id);
        drag.current = null;
      }
      if (wiring.current) {
        const p = toSvg(e.clientX, e.clientY);
        const target = fsm.states.find((s) => Math.hypot(s.x - p.x, s.y - p.y) <= R + 8);
        if (target) {
          setPendingTarget({ from: wiring.current, to: target.id });
          setSymbolInput("");
        }
        wiring.current = null;
        setPending(null);
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  }, [fsm.states]);

  function addState() {
    setFsm((f) => {
      // First free spot on a grid, so a new state never lands on top of an existing one.
      let x = 140, y = 100;
      search: for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 7; col++) {
          const cx = 140 + col * 110, cy = 100 + row * 90;
          if (f.states.every((st) => Math.hypot(st.x - cx, st.y - cy) > 80)) { x = cx; y = cy; break search; }
        }
      }
      const n: StateNode = { id: nid("S"), name: `S${counter}`, x, y };
      return { ...f, states: [...f.states, n] };
    });
  }
  function startDrag(id: string, e: React.PointerEvent) {
    const s = fsm.states.find((s) => s.id === id)!;
    const p = toSvg(e.clientX, e.clientY);
    drag.current = { id, ox: p.x - s.x, oy: p.y - s.y, moved: false };
  }
  function startWire(id: string, e: React.PointerEvent) {
    e.stopPropagation();
    wiring.current = id;
    const p = toSvg(e.clientX, e.clientY);
    setPending({ from: id, x: p.x, y: p.y });
  }
  function confirmTransition() {
    if (!pendingTarget) return;
    // The simulator reads the input one character at a time, so every symbol is a single character.
    // "01" or "0,1" both mean the two symbols 0 and 1.
    const syms = Array.from(new Set(symbolInput.split(",").flatMap((s) => Array.from(s.trim())).filter((c) => c.trim())));
    if (syms.length === 0) { setPendingTarget(null); return; }
    setFsm((f) => {
      const existing = f.transitions.find((t) => t.from === pendingTarget.from && t.to === pendingTarget.to);
      if (existing) {
        return { ...f, transitions: f.transitions.map((t) => t.id === existing.id
          ? { ...t, symbols: Array.from(new Set([...t.symbols, ...syms])) } : t) };
      }
      return { ...f, transitions: [...f.transitions, { id: nid("t"), from: pendingTarget.from, to: pendingTarget.to, symbols: syms }] };
    });
    setPendingTarget(null);
  }
  function deleteState(id: string) {
    setFsm((f) => ({
      states: f.states.filter((s) => s.id !== id),
      transitions: f.transitions.filter((t) => t.from !== id && t.to !== id),
    }));
    setSelected(null);
    // A live sim result's path can reference the state being removed — stale otherwise,
    // same as the reset already done on clearAll/loadPreset/SaveFsm's onLoad.
    setResult(null);
    setStepIdx(0);
  }
  function toggleAccept(id: string) {
    setFsm((f) => ({ ...f, states: f.states.map((s) => s.id === id ? { ...s, accept: !s.accept } : s) }));
  }
  function setStart(id: string) {
    setFsm((f) => ({ ...f, states: f.states.map((s) => ({ ...s, start: s.id === id })) }));
  }
  function commitRename(id: string) {
    const name = renameValue.trim();
    if (name) setFsm((f) => ({ ...f, states: f.states.map((s) => s.id === id ? { ...s, name } : s) }));
    setRenaming(null);
  }
  function loadPreset(id: string) {
    const p = PRESETS.find((p) => p.id === id)!;
    counter += 1000;
    setFsm(structuredClone(p.fsm));
    setSelected(null); setResult(null); setStepIdx(0);
  }
  function clearAll() {
    setFsm({ states: [], transitions: [] });
    setSelected(null); setResult(null); setStepIdx(0);
  }

  function exportPng() {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Same reason as Logic Circuit Simulator's export: the live styling comes from index.css
    // classnames, invisible to a serialized standalone SVG, so inline the rules it actually uses.
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      .snode { fill:#1a1428; stroke:#3a2f52; stroke-width:1.5; }
      .snode.sel { stroke:#fbbf24; stroke-width:2.5; }
      .snode.current { fill:#2e2408; stroke:#fbbf24; stroke-width:3; }
      .saccept { fill:none; stroke:#3a2f52; stroke-width:1.5; }
      .snode.current + .saccept { stroke:#fbbf24; }
      .slabel { fill:#e8e2f4; font-size:14px; font-weight:600; text-anchor:middle; dominant-baseline:central; font-family:'Space Grotesk',sans-serif; }
      .tlabel { font-size:12px; font-family:ui-monospace,monospace; text-anchor:middle; }
      .port { fill:#0a0714; stroke:#8b7bb8; stroke-width:2; }
    `;
    clone.insertBefore(style, clone.firstChild);
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", String(SVW));
    bg.setAttribute("height", String(SVH));
    bg.setAttribute("fill", "#0a0714");
    clone.insertBefore(bg, clone.firstChild);

    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = SVW * scale;
      canvas.height = SVH * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "state-machine.png";
        a.click();
        URL.revokeObjectURL(a.href);
      });
    };
    img.src = url;
  }

  const hasStart = fsm.states.some((s) => s.start);

  function runAll() {
    if (!hasStart) return;
    const r = simulate(fsm, input);
    setResult(r);
    setStepIdx(Math.max(0, r.path.length - 1));
  }
  function stepOnce() {
    if (!hasStart) return;
    if (!result) { setResult(simulate(fsm, input)); setStepIdx(0); return; }
    setStepIdx((i) => Math.min(i + 1, result.path.length - 1));
  }
  function resetSim() { setResult(null); setStepIdx(0); }

  const currentStateId = result ? result.path[stepIdx] : fsm.states.find((s) => s.start)?.id;

  return (
    <div className="app">
      <header>
        <div className="mark">Ω</div>
        <div>
          <h1>STATE MACHINE DESIGNER</h1>
          <p>Build finite-state automata, drag transitions, feed in a string, watch it accept or reject</p>
        </div>
        <div className="badges">
          <AuthPanel />
          <div className="badge-links">
            <a className="labbench-badge" href="https://labbench-hub.vercel.app/" target="_blank" rel="noopener noreferrer">⚡ LabBench</a>
            <a className="src" href="https://dhananjay-kumar-seth.vercel.app/" target="_blank" rel="noopener noreferrer">ECE Portfolio · Dhananjay Seth</a>
          </div>
        </div>
      </header>

      <div className="palette">
        <span className="p-label">EDIT</span>
        <button onClick={addState}>+ Add State</button>
        <span className="sep" />
        <span className="p-label">PRESETS</span>
        {PRESETS.map((p) => (
          <button key={p.id} className="preset" onClick={() => loadPreset(p.id)} title={p.description}>{p.name}</button>
        ))}
        <button className="clear" onClick={clearAll}>Clear</button>
        <span className="sep" />
        <button className="export" onClick={exportPng}>⬇ PNG</button>
      </div>

      <div className="palette">
        <SaveFsm
          config={{ fsm }}
          onLoad={(c: FsmSaveConfig) => { setFsm(c.fsm); setSelected(null); setResult(null); setStepIdx(0); }}
        />
      </div>

      <div className="stage">
        <svg ref={svgRef} viewBox={`0 0 ${SVW} ${SVH}`} className="board" onPointerDown={() => setSelected(null)}>
          <defs>
            <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#1a1420" strokeWidth="1" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="#8b7bb8" />
            </marker>
          </defs>
          <rect width={SVW} height={SVH} fill="url(#grid)" />

          {/* transitions */}
          {fsm.transitions.map((t) => {
            const a = fsm.states.find((s) => s.id === t.from), b = fsm.states.find((s) => s.id === t.to);
            if (!a || !b) return null;
            const active = !!result && stepIdx > 0 &&
              result.path[stepIdx - 1] === t.from && result.path[stepIdx] === t.to;
            if (t.from === t.to) {
              // self-loop: small arc above the state
              const lx = a.x, ly = a.y - R;
              const d = `M ${lx - 22} ${ly + 6} C ${lx - 26} ${ly - 34}, ${lx + 26} ${ly - 34}, ${lx + 22} ${ly + 6}`;
              return (
                <g key={t.id}>
                  <path d={d} fill="none" className={"tedge" + (active ? " active" : "")}
                    stroke={active ? "#fbbf24" : "#8b7bb8"} strokeWidth={active ? 3 : 2} markerEnd="url(#arrow)" />
                  <text x={lx} y={ly - 30} className="tlabel" fill={active ? "#fbbf24" : "#c9bfe0"}>{t.symbols.join(",")}</text>
                </g>
              );
            }
            const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
            const ux = dx / len, uy = dy / len;
            const x1 = a.x + ux * R, y1 = a.y + uy * R, x2 = b.x - ux * R, y2 = b.y - uy * R;
            const mx = (x1 + x2) / 2 - uy * 14, my = (y1 + y2) / 2 + ux * 14;
            return (
              <g key={t.id}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className={"tedge" + (active ? " active" : "")}
                  stroke={active ? "#fbbf24" : "#8b7bb8"} strokeWidth={active ? 3 : 2} markerEnd="url(#arrow)" />
                <text x={mx} y={my} className="tlabel" fill={active ? "#fbbf24" : "#c9bfe0"}>{t.symbols.join(",")}</text>
              </g>
            );
          })}

          {/* pending wire */}
          {pending && (() => {
            const a = fsm.states.find((s) => s.id === pending.from); if (!a) return null;
            return <line x1={a.x} y1={a.y} x2={pending.x} y2={pending.y} stroke="#fbbf24" strokeWidth={2} strokeDasharray="5 4" />;
          })()}

          {/* states */}
          {fsm.states.map((s, idx) => {
            const isCurrent = s.id === currentStateId;
            const isSelected = s.id === selected;
            return (
              <g key={s.id} transform={`translate(${s.x},${s.y})`} className="snode-group"
                style={{ ["--i" as any]: idx }}
                onPointerDown={(e) => { e.stopPropagation(); startDrag(s.id, e); }}>
                {s.start && <path d={`M ${-R - 34} 0 L ${-R - 4} 0`} stroke="#8b7bb8" strokeWidth={2} markerEnd="url(#arrow)" />}
                {isCurrent && result && <circle r={R} className="current-ring" />}
                <circle r={R} className={"snode" + (isCurrent ? " current" : "") + (isSelected ? " sel" : "")} />
                {s.accept && <circle r={R - 5} className="saccept" />}
                <text className="slabel">{s.name}</text>
                <circle cx={R + 4} cy={0} r={7} className="port" onPointerDown={(e) => startWire(s.id, e)} />
              </g>
            );
          })}
        </svg>

        <aside className="side-panel">
          {selected && (() => {
            const s = fsm.states.find((x) => x.id === selected);
            if (!s) return null;
            return (
              <div className="edit-block">
                <div className="edit-head">EDIT STATE</div>
                {renaming === s.id ? (
                  <form className="rename-form" onSubmit={(e) => { e.preventDefault(); commitRename(s.id); }}>
                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setRenaming(null); }} />
                    <button type="submit">✓</button>
                  </form>
                ) : (
                  <button className="ghost" onClick={() => { setRenaming(s.id); setRenameValue(s.name); }}>✎ Rename ({s.name})</button>
                )}
                <button className={"ghost" + (s.start ? " on" : "")} onClick={() => setStart(s.id)}>▶ Set as Start</button>
                <button className={"ghost" + (s.accept ? " on" : "")} onClick={() => toggleAccept(s.id)}>◎ Toggle Accepting</button>
                <button className="ghost danger" onClick={() => deleteState(s.id)}>✕ Delete State</button>
              </div>
            );
          })()}

          {pendingTarget && (
            <div className="edit-block">
              <div className="edit-head">TRANSITION SYMBOL(S)</div>
              <p className="edit-hint">
                {fsm.states.find((s) => s.id === pendingTarget.from)?.name} → {fsm.states.find((s) => s.id === pendingTarget.to)?.name}
              </p>
              <form className="rename-form" onSubmit={(e) => { e.preventDefault(); confirmTransition(); }}>
                <input autoFocus placeholder="e.g. 0,1" value={symbolInput} onChange={(e) => setSymbolInput(e.target.value)} />
                <button type="submit">✓</button>
                <button type="button" onClick={() => setPendingTarget(null)}>✕</button>
              </form>
            </div>
          )}

          <div className="sim-block">
            <div className="edit-head">SIMULATE</div>
            <input className="sim-input" value={input} onChange={(e) => { setInput(e.target.value); setResult(null); setStepIdx(0); }} placeholder="input string, e.g. 1101" />
            <div className="sim-btns">
              <button onClick={stepOnce} disabled={!hasStart}>Step ▸</button>
              <button onClick={runAll} disabled={!hasStart}>Run All ▶▶</button>
              <button onClick={resetSim}>↺</button>
            </div>
            {!hasStart && <p className="edit-hint">Click a state, then "Set as Start" to enable simulation.</p>}
            {result && (() => {
              const atEnd = stepIdx >= result.path.length - 1;
              const stuck = atEnd && result.stuckAtIndex !== undefined;
              const cls = !atEnd ? "" : stuck ? "reject" : result.accepted ? "accept" : "reject";
              return (
                <div className={"sim-result " + cls}>
                  {!atEnd
                    ? `at ${result.path[stepIdx]} · step ${stepIdx}/${input.length}`
                    : stuck
                      ? `✕ STUCK — no transition for '${input[result.stuckAtIndex!]}'`
                      : result.accepted ? "✓ ACCEPTED" : "✕ REJECTED"}
                </div>
              );
            })()}
          </div>
        </aside>
      </div>

      <p className="hint">
        <b>+ Add State</b> to place a node · <b>drag</b> a state to move it · <b>drag from the small port</b> on a
        state's edge to another state (or itself) to add a transition · click a state to <b>rename, set start,
        toggle accepting, or delete</b> it. Type an input string and hit <b>Run All</b> to see it accept or reject.
      </p>
      <footer>Deterministic finite automaton — hand-rolled simulation, no libraries.</footer>
    </div>
  );
}
