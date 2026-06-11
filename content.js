/**
 * Injects the main script into the webpage
 */

const runtime = chrome.runtime;

// Checks the webpage and extension context
if (typeof document === 'undefined' || !runtime?.id) {
  console.error('[Gen 3 OU Tools] Missing webpage or extension context.');

  throw new Error('Missing webpage or extension context.');
}

// Listens for fetch requests
window.addEventListener("message", async (event) => {
  if (event.source !== window || event.data.type !== "SMOGON_FETCH") {
    return;
  }

  try {
    const data = await getSmogonData();

    window.postMessage({ type: "SMOGON_DATA", data: data }, "*");
  } catch (error) {
    console.error('[Gen 3 OU Tools] The Smogon fetch could not be processed with this error:', error);

    window.postMessage({ type: "SMOGON_ERROR", error: error.message }, "*");
  }
});

// Retrieves Smogon data from the cache or fetches Smogon data to the cache
async function getSmogonData() {
  const storage = chrome.storage?.local;

  if (!storage) {
    throw new Error("Could not find Chrome storage.");
  }

  const result = await new Promise((resolve) => {
    storage.get(['smogonCache', 'cacheTimestamp'], (result) => resolve(result));
  });

  const { smogonCache, cacheTimestamp } = result;

  if (smogonCache && cacheTimestamp && (Date.now() - cacheTimestamp < 43200000)) {
    return smogonCache;
  }

  const smogonFetch = (url, isJson) => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "SMOGON_FETCH", url, isJson }, (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response.success) {
          return reject(new Error(response?.error));
        }
        resolve(response.data);
      });
    });
  };

  const base = 'https://www.smogon.com/stats/';
  const indexHtml = await smogonFetch(base, false);
  const directories = [...indexHtml.matchAll(/href="(\d{4}-\d{2})\//g)].map((match) => match[1]);
  const latest = directories[directories.length - 1];

  if (!latest) {
    throw new Error("Could not find any Smogon directories.");
  }

  const [
    chaos0Data,
    chaos1500Data,
    chaos1630Data,
    chaos1760Data,
    leads0Data,
    leads1500Data,
    leads1630Data,
    leads1760Data
  ] = await Promise.all([
    smogonFetch(`${base}${latest}/chaos/gen3ou-0.json`, true),
    smogonFetch(`${base}${latest}/chaos/gen3ou-1500.json`, true),
    smogonFetch(`${base}${latest}/chaos/gen3ou-1630.json`, true),
    smogonFetch(`${base}${latest}/chaos/gen3ou-1760.json`, true),
    smogonFetch(`${base}${latest}/leads/gen3ou-0.txt`, false),
    smogonFetch(`${base}${latest}/leads/gen3ou-1500.txt`, false),
    smogonFetch(`${base}${latest}/leads/gen3ou-1630.txt`, false),
    smogonFetch(`${base}${latest}/leads/gen3ou-1760.txt`, false),
  ]);

  const newData = {
    "0": {
      chaos:chaos0Data,
      leads:leads0Data,
    },
    "1500": {
      chaos:chaos1500Data,
      leads:leads1500Data,
    },
    "1630": {
      chaos:chaos1630Data,
      leads:leads1630Data,
    },
    "1760": {
      chaos:chaos1760Data,
      leads:leads1760Data,
    },
  };

  await new Promise((resolve) => {
    storage.set({ smogonCache: newData, cacheTimestamp: Date.now() }, () => resolve());
  });

  return newData;
}

// Defines the main script location and settings
const mainUrl = runtime.getURL('dist/main.js');
const extensionId = runtime.id;
const injectables = [
  {
    id: 'gen-3-ou-tools-script-main',
    component: 'script',
    into: 'body',
    props: {
      src: mainUrl,
      async: 'true',
      'data-ext-id': extensionId,
    },
  },
];

console.info('[Gen 3 OU Tools] Starting for chrome with extensionId:', extensionId);

console.debug('[Gen 3 OU Tools] Injecting injectables:', injectables);

// Creates the element and injects it into the webpage
injectables.forEach(({ id, component, into, props }) => {
  const source = document.getElementById(id) || document.createElement(component);
  const destination = into === 'head' ? document.head : document.body;

  if (source.id !== id) {
    source.id = id;
  }

  Object.entries(props).forEach(([key, value]) => {
    if (value !== undefined) {
      source.setAttribute(key, value);
    }
  });

  destination.appendChild(source);
});