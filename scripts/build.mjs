import { build } from "vite";
import config from "../vite.config.js";

// tsc -b emits this JS config first. Native import uses the exact project config,
// avoiding esbuild's redundant config bundle and parent-directory scans on Windows.
await build({ ...config, configFile: false });
await import("./generate-model-share-pages.mjs");
