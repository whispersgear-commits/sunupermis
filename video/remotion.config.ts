import fs from "node:fs";
import { Config } from "@remotion/cli/config";

// Session cloud : Chromium déjà installé. Ailleurs, Remotion gère seul.
const HEADLESS = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";
if (fs.existsSync(HEADLESS)) Config.setBrowserExecutable(HEADLESS);

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(17);
Config.setPixelFormat("yuv420p");
Config.setOverwriteOutput(true);
Config.setEntryPoint("./src/index.ts");
