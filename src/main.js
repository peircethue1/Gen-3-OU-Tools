/**
 * Creates the initialization engine
 */

import { detectClassicHost } from '@gen-3-ou-tools/utilities.js';
import { BootManager } from '@gen-3-ou-tools/pages/BootManager.js';
import { ToolsClassicBootstrapper } from '@gen-3-ou-tools/pages/ToolsClassicBootstrapper.js';
import { BootClassicAdapter } from '@gen-3-ou-tools/pages/BootClassicAdapter.js';
import './main.css';

console.debug('[Gen 3 OU Tools] Starting.');

// Checks if execution occurred on an unsupported webpage or before the webpage finished loading
if (
  typeof window?.Dex?.gen !== 'number' ||
  typeof window.Dex.forGen !== 'function' ||
  typeof window.app?.receive !== 'function'
) {
  console.error(
    '[Gen 3 OU Tools] Executed on an unsupported webpage or before the webpage finished loading.',
    '\nwindow.Dex:', typeof window?.Dex,
    '\nwindow.app:', typeof window?.app,
  );

  throw new Error('Attempted to start in an unsupported webpage.');
}

// Checks if execution occurred twice on the same webpage
if (window.__GEN_3_OU_TOOLS_INIT) {
  console.error(
    '[Gen 3 OU Tools] An instance was already active on this webpage.',
    '\n__GEN_3_OU_TOOLS_INIT:', window.__GEN_3_OU_TOOLS_INIT,
    '\n__GEN_3_OU_TOOLS_HOST:', window.__GEN_3_OU_TOOLS_HOST,
  );

  throw new Error('Another instance tried to start when one was already active.');
}

// Defines the initialization lock and host environment
window.__GEN_3_OU_TOOLS_INIT = 'gen-3-ou-tools';
window.__GEN_3_OU_TOOLS_HOST = (detectClassicHost(window) && 'classic') || null;

// Executes initialization
(async () => {
  if (window.__GEN_3_OU_TOOLS_HOST === 'classic') {

    // Registers the Tools bootstrapper
    BootManager.register('tools', ToolsClassicBootstrapper);

    // Creates a factory function that creates an instance of the bootstrapper for each room
    BootClassicAdapter.receiverFactory = (roomId) => () => new ToolsClassicBootstrapper(roomId).run();

    // Initializes the adapter
    await BootClassicAdapter.run();
  } else {
    console.error(
      '[Gen 3 OU Tools] Could not determine the host environment.',
      '\n__GEN_3_OU_TOOLS_HOST:', window.__GEN_3_OU_TOOLS_HOST,
      '\n__GEN_3_OU_TOOLS_INIT:', window.__GEN_3_OU_TOOLS_INIT,
    );

    throw new Error('Attempted to run with an unsupported host.');
  }

  console.debug(
    '[Gen 3 OU Tools] Initialized successfully.',
    '\n__GEN_3_OU_TOOLS_INIT:', window.__GEN_3_OU_TOOLS_INIT,
    '\n__GEN_3_OU_TOOLS_HOST:', window.__GEN_3_OU_TOOLS_HOST,
  );
})();