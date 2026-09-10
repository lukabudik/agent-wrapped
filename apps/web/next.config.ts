import type { NextConfig } from "next";

const config: NextConfig = {
  // Railway runs the app from a slim runtime image, so Next has to emit a
  // self-contained server bundle. The tracing root has to point at the pnpm
  // workspace root or the traced files stop at apps/web and miss the symlinked
  // @agent-wrapped/core.
  output: "standalone",
  outputFileTracingRoot: new URL("../../", import.meta.url).pathname,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default config;
