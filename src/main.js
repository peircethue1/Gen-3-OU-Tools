/**
 * Creates the initialization engine
 */

import { BootClassicAdapter } from './BootClassicAdapter.js';
import { ToolsClassicBootstrapper } from './ToolsClassicBootstrapper.js';

console.debug('[Gen 3 OU Tools] Starting for chrome.');

// Checks if execution occured on an unsupported webpage or before the webpage finished loading
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

// Checks if execution occured twice on the same webpage
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
window.__GEN_3_OU_TOOLS_HOST = typeof window.app?.receive === 'function' ? 'classic' : null;

// Executes initialization
(async () => {
  if (window.__GEN_3_OU_TOOLS_HOST === 'classic') {

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