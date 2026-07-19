# State Machine Designer

Build finite-state automata by hand — place states, drag transitions between them, mark a start and
accepting states, then feed in an input string and watch it step through, accepting or rejecting live.

Part of the [LabBench](https://labbench-hub.vercel.app/) suite of interactive engineering tools.

**Live demo:** https://state-machine-designer.vercel.app/

## Features
- Add states, drag them freely, rename inline
- Drag from a state's port to another state (or itself, for a self-loop) to add a transition, labeled
  with one or more input symbols
- Mark any state as the **start** state or an **accepting** state
- Step-by-step or run-to-completion simulation of an input string, with the active state and the
  just-taken transition highlighted live
- Three built-in presets: Even Number of 1s, Ends with "01", and Divisible by 3 (binary) — all real,
  correct DFAs, not toy examples

## LabBench Pro
Sign in to save and reload your machines — part of the same optional ₹29/mo LabBench Pro subscription as
the rest of the suite. Upgrade from [Logic Circuit Simulator](https://logic-circuit-sim.vercel.app/),
which hosts the checkout for all the LabBench tools.

## Tech
React + TypeScript + Vite. The FSM data model, drag/wire canvas interaction, and simulation engine are
all hand-written — no diagramming or automata libraries. Auth/save-load via Supabase (Postgres + RLS).

## Run locally
```sh
npm install
npm run dev
```

_Built by Dhananjay Kumar Seth — part of [LabBench](https://labbench-hub.vercel.app/)._
