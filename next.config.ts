import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// There is a stray package-lock.json in the user profile directory (C:\Users\Asus),
// which Turbopack would otherwise consider as a candidate workspace root. Pinning
// the root to this directory keeps module resolution and output file tracing
// scoped to the project.
const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
