/**
 * Fetches Smogon data
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SMOGON_FETCH") {
    fetch(message.url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Smogon fetch failed with status: ${response.status}`);
        }

        return message.isJson ? response.json() : response.text();
      })
      .then((data) => {
        sendResponse({ success: true, data });
      })
      .catch((error) => {
        console.error('[Gen 3 OU Tools] Failed to fetch data from Smogon with this error:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});