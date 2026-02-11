import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("./package.json", "utf8"));

const manifest = {
  manifest_version: 3,
  name: "Syrnia Tracker",
  version: packageJson.version,
  description: "Track your Syrnia game stats",
  host_permissions: ["*://*.syrnia.com/*"],
  permissions: ["storage", "tabs", "sidePanel", "activeTab", "scripting", "downloads"],
  background: {
    service_worker: "background.js",
    type: "module",
  },
  icons: {
    16: "icon-16.png",
    32: "icon-32.png",
    48: "icon-48.png",
    128: "icon-128.png",
  },
  content_scripts: [
    {
      matches: ["*://*.syrnia.com/*"],
      js: ["content/all.iife.js"],
    },
    {
      matches: ["*://*.syrnia.com/*"],
      css: ["content.css"],
    },
    {
      matches: ["https://www.syrnia.com/theGame/includes2/stats.php*"],
      js: ["content/stats.iife.js"],
    },
  ],
  web_accessible_resources: [
    {
      resources: ["*.js", "*.css", "*.svg", "icon-16.png", "icon-32.png", "icon-48.png", "icon-128.png"],
      matches: ["*://*.syrnia.com/*"],
    },
  ],
  side_panel: {
    default_path: "side-panel/index.html",
  },
};

export default manifest;
