import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// State Machine Designer — FSM builder + simulator (LabBench, portfolio demo)
export default defineConfig({
  server: { host: "::", port: 5187 },
  plugins: [react()],
});
