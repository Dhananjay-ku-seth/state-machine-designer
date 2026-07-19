// ============================================================================
// Finite-state-machine model: states with x/y position, start/accept flags,
// and transitions keyed by an input symbol. Multiple symbols between the same
// pair of states are merged into one transition with a comma-joined label.
// ============================================================================

export type StateNode = { id: string; name: string; x: number; y: number; start?: boolean; accept?: boolean };
export type Transition = { id: string; from: string; to: string; symbols: string[] };
export type FSM = { states: StateNode[]; transitions: Transition[] };

export type SimResult = {
  path: string[];       // state ids visited, including the start state
  accepted: boolean;
  stuckAtIndex?: number; // input index where no matching transition existed
};

export function simulate(fsm: FSM, input: string): SimResult {
  const start = fsm.states.find((s) => s.start);
  if (!start) return { path: [], accepted: false };
  let current = start.id;
  const path = [current];
  for (let i = 0; i < input.length; i++) {
    const sym = input[i];
    const t = fsm.transitions.find((tr) => tr.from === current && tr.symbols.includes(sym));
    if (!t) return { path, accepted: false, stuckAtIndex: i };
    current = t.to;
    path.push(current);
  }
  const finalState = fsm.states.find((s) => s.id === current);
  return { path, accepted: !!finalState?.accept };
}

export type Preset = { id: string; name: string; description: string; alphabet: string; fsm: FSM };

export const PRESETS: Preset[] = [
  {
    id: "even-ones",
    name: "Even Number of 1s",
    description: "Accepts binary strings containing an even count of 1s (including zero).",
    alphabet: "01",
    fsm: {
      states: [
        { id: "S0", name: "S0", x: 180, y: 170, start: true, accept: true },
        { id: "S1", name: "S1", x: 480, y: 170 },
      ],
      transitions: [
        { id: "t1", from: "S0", to: "S0", symbols: ["0"] },
        { id: "t2", from: "S0", to: "S1", symbols: ["1"] },
        { id: "t3", from: "S1", to: "S1", symbols: ["0"] },
        { id: "t4", from: "S1", to: "S0", symbols: ["1"] },
      ],
    },
  },
  {
    id: "ends-01",
    name: 'Ends with "01"',
    description: "Accepts binary strings whose last two characters are exactly 0 then 1.",
    alphabet: "01",
    fsm: {
      states: [
        { id: "A", name: "A", x: 130, y: 170, start: true },
        { id: "B", name: "B", x: 400, y: 170 },
        { id: "C", name: "C", x: 670, y: 170, accept: true },
      ],
      transitions: [
        { id: "t1", from: "A", to: "B", symbols: ["0"] },
        { id: "t2", from: "A", to: "A", symbols: ["1"] },
        { id: "t3", from: "B", to: "B", symbols: ["0"] },
        { id: "t4", from: "B", to: "C", symbols: ["1"] },
        { id: "t5", from: "C", to: "B", symbols: ["0"] },
        { id: "t6", from: "C", to: "A", symbols: ["1"] },
      ],
    },
  },
  {
    id: "div3",
    name: "Divisible by 3 (binary)",
    description: "Reads a binary number MSB-first; accepts if the value is a multiple of 3 (remainder tracking).",
    alphabet: "01",
    fsm: {
      states: [
        { id: "R0", name: "R0", x: 180, y: 100, start: true, accept: true },
        { id: "R1", name: "R1", x: 480, y: 250 },
        { id: "R2", name: "R2", x: 180, y: 250 },
      ],
      transitions: [
        { id: "t1", from: "R0", to: "R0", symbols: ["0"] },
        { id: "t2", from: "R0", to: "R1", symbols: ["1"] },
        { id: "t3", from: "R1", to: "R2", symbols: ["0"] },
        { id: "t4", from: "R1", to: "R0", symbols: ["1"] },
        { id: "t5", from: "R2", to: "R1", symbols: ["0"] },
        { id: "t6", from: "R2", to: "R2", symbols: ["1"] },
      ],
    },
  },
];
