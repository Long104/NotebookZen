// Cloudflare Workers entry point.
// Run with `wrangler.toml` containing:
//   compatibility_flags = ["nodejs_compat"]
//   [experimental]
//   http_server = true
// That flag lets us export a Node http.Server and have Cloudflare
// bridge fetch requests into it.

import { createRequire } from "node:module";
import { createServer } from "node:http";

const localRequire = createRequire(import.meta.url);
const expressApp = localRequire("./index.js");

// The existing app calls `app.listen(port)` at the bottom of index.js.
// On Workers there is no port to bind, so short-circuit it.
if (typeof expressApp.listen === "function" && !expressApp._wranglerStub) {
  expressApp.listen = () => {
    console.warn("[worker] app.listen() is a no-op on Cloudflare Workers");
    return { close() {}, on() {}, address: () => ({}) };
  };
  expressApp._wranglerStub = true;
}

const server = createServer(expressApp);

export default {
  async fetch(request, env) {
    // Surface Worker bindings to the Express app via process.env
    // (Prisma + dotenv both read it at module load time).
    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") process.env[key] = value;
    }
    return server.fetch(request);
  },
};
