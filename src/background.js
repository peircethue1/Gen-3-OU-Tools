/**
 * Creates the network request proxy and external message listener
 */

// Forwards fetch requests to the network
const handleFetchMessage = (message, send) => {
  switch (message?.type) {
    case 'fetch': {
      if (!message?.url) {
        break;
      }

      // Sends the network request
      (async () => {
        try {
          const response = await fetch(message.url, {
            method: 'GET',
            headers: {
              Accept: '*/*',
            },
          });

          const value = await response.text();

          const headers = {};

          for (const [headerName, headerValue] of response.headers) {
            if (!headerName || !headerValue) {
              continue;
            }

            headers[headerName.toLowerCase()] = headerValue;
          }

          send({
            ok: response.ok,
            status: response.status,
            headers,
            value,
          });
        } catch (error) {
          send({
            error: true,
            name: error.name || 'Error',
            message: error.message || String(error),
            stack: error.stack,
          });
        }
      })();

      return true;
    }

    default: {
      break;
    }
  }
};

// Registers the external message listener
if (typeof chrome !== 'undefined') {
  chrome.runtime.onMessageExternal.addListener((
    message,
    _sender,
    sendResponse,
  ) => handleFetchMessage(message, sendResponse));
}