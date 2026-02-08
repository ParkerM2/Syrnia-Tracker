import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

const manifest = {
  manifest_version: 3,
  name: 'Syrnia Tracker',
  version: packageJson.version,
  description: 'Track your Syrnia game stats',
  host_permissions: ['<all_urls>'],
  permissions: ['storage', 'tabs', 'sidePanel', 'pageCapture', 'activeTab', 'scripting', 'downloads'],
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  icons: {
    128: 'icon-128.png',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['content/all.iife.js'],
    },
    {
      matches: ['http://*/*', 'https://*/*'],
      css: ['content.css'],
    },
    {
      matches: ['https://www.syrnia.com/theGame/includes2/stats.php*'],
      js: ['content/stats.iife.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['*.js', '*.css', '*.svg', 'icon-128.png', 'icon-34.png'],
      matches: ['*://*/*'],
    },
  ],
  side_panel: {
    default_path: 'side-panel/index.html',
  },
};

export default manifest;
