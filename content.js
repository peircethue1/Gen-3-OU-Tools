// Injects the main script into the webpage
(function () {
  const runtime = chrome.runtime;

  // Checks the webpage and extension context
  if (typeof document === 'undefined' || !runtime?.id) {
    console.error('[Gen 3 OU Tools] Execution failed: Missing webpage or extension context.');
    return;
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
        'data-ext-id': extensionId
      }
    }
  ];

  console.log('[Gen 3 OU Tools] Content script initialized successfully.');

  // Creates the script element and inserts it into the webpage
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
})();