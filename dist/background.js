(() => {
  // src/background.js
  var handleFetchMessage = (message, send) => {
    switch (message?.type) {
      case "fetch": {
        if (!message?.url) {
          break;
        }
        (async () => {
          try {
            const response = await fetch(message.url, {
              method: "GET",
              headers: {
                Accept: "*/*"
              }
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
              value
            });
          } catch (error) {
            send({
              error: true,
              name: error.name || "Error",
              message: error.message || String(error),
              stack: error.stack
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
  if (typeof chrome !== "undefined") {
    chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => handleFetchMessage(message, sendResponse));
  }
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2JhY2tncm91bmQuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxyXG4gKiBDcmVhdGVzIHRoZSBuZXR3b3JrIHJlcXVlc3QgcHJveHkgYW5kIGV4dGVybmFsIG1lc3NhZ2UgbGlzdGVuZXJcclxuICovXHJcblxyXG4vLyBGb3J3YXJkcyBmZXRjaCByZXF1ZXN0cyB0byB0aGUgbmV0d29ya1xyXG5jb25zdCBoYW5kbGVGZXRjaE1lc3NhZ2UgPSAobWVzc2FnZSwgc2VuZCkgPT4ge1xyXG4gIHN3aXRjaCAobWVzc2FnZT8udHlwZSkge1xyXG4gICAgY2FzZSAnZmV0Y2gnOiB7XHJcbiAgICAgIGlmICghbWVzc2FnZT8udXJsKSB7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNlbmRzIHRoZSBuZXR3b3JrIHJlcXVlc3RcclxuICAgICAgKGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChtZXNzYWdlLnVybCwge1xyXG4gICAgICAgICAgICBtZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgQWNjZXB0OiAnKi8qJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGhlYWRlcnMgPSB7fTtcclxuXHJcbiAgICAgICAgICBmb3IgKGNvbnN0IFtoZWFkZXJOYW1lLCBoZWFkZXJWYWx1ZV0gb2YgcmVzcG9uc2UuaGVhZGVycykge1xyXG4gICAgICAgICAgICBpZiAoIWhlYWRlck5hbWUgfHwgIWhlYWRlclZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGhlYWRlcnNbaGVhZGVyTmFtZS50b0xvd2VyQ2FzZSgpXSA9IGhlYWRlclZhbHVlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHNlbmQoe1xyXG4gICAgICAgICAgICBvazogcmVzcG9uc2Uub2ssXHJcbiAgICAgICAgICAgIHN0YXR1czogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgICAgICB2YWx1ZSxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBzZW5kKHtcclxuICAgICAgICAgICAgZXJyb3I6IHRydWUsXHJcbiAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUgfHwgJ0Vycm9yJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pKCk7XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBkZWZhdWx0OiB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbi8vIFJlZ2lzdGVycyB0aGUgZXh0ZXJuYWwgbWVzc2FnZSBsaXN0ZW5lclxyXG5pZiAodHlwZW9mIGNocm9tZSAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICBjaHJvbWUucnVudGltZS5vbk1lc3NhZ2VFeHRlcm5hbC5hZGRMaXN0ZW5lcigoXHJcbiAgICBtZXNzYWdlLFxyXG4gICAgX3NlbmRlcixcclxuICAgIHNlbmRSZXNwb25zZSxcclxuICApID0+IGhhbmRsZUZldGNoTWVzc2FnZShtZXNzYWdlLCBzZW5kUmVzcG9uc2UpKTtcclxufSJdLAogICJtYXBwaW5ncyI6ICI7O0FBS0EsTUFBTSxxQkFBcUIsQ0FBQyxTQUFTLFNBQVM7QUFDNUMsWUFBUSxTQUFTLE1BQU07QUFBQSxNQUNyQixLQUFLLFNBQVM7QUFDWixZQUFJLENBQUMsU0FBUyxLQUFLO0FBQ2pCO0FBQUEsUUFDRjtBQUdBLFNBQUMsWUFBWTtBQUNYLGNBQUk7QUFDRixrQkFBTSxXQUFXLE1BQU0sTUFBTSxRQUFRLEtBQUs7QUFBQSxjQUN4QyxRQUFRO0FBQUEsY0FDUixTQUFTO0FBQUEsZ0JBQ1AsUUFBUTtBQUFBLGNBQ1Y7QUFBQSxZQUNGLENBQUM7QUFFRCxrQkFBTSxRQUFRLE1BQU0sU0FBUyxLQUFLO0FBRWxDLGtCQUFNLFVBQVUsQ0FBQztBQUVqQix1QkFBVyxDQUFDLFlBQVksV0FBVyxLQUFLLFNBQVMsU0FBUztBQUN4RCxrQkFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhO0FBQy9CO0FBQUEsY0FDRjtBQUVBLHNCQUFRLFdBQVcsWUFBWSxDQUFDLElBQUk7QUFBQSxZQUN0QztBQUVBLGlCQUFLO0FBQUEsY0FDSCxJQUFJLFNBQVM7QUFBQSxjQUNiLFFBQVEsU0FBUztBQUFBLGNBQ2pCO0FBQUEsY0FDQTtBQUFBLFlBQ0YsQ0FBQztBQUFBLFVBQ0gsU0FBUyxPQUFPO0FBQ2QsaUJBQUs7QUFBQSxjQUNILE9BQU87QUFBQSxjQUNQLE1BQU0sTUFBTSxRQUFRO0FBQUEsY0FDcEIsU0FBUyxNQUFNLFdBQVcsT0FBTyxLQUFLO0FBQUEsY0FDdEMsT0FBTyxNQUFNO0FBQUEsWUFDZixDQUFDO0FBQUEsVUFDSDtBQUFBLFFBQ0YsR0FBRztBQUVILGVBQU87QUFBQSxNQUNUO0FBQUEsTUFFQSxTQUFTO0FBQ1A7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFHQSxNQUFJLE9BQU8sV0FBVyxhQUFhO0FBQ2pDLFdBQU8sUUFBUSxrQkFBa0IsWUFBWSxDQUMzQyxTQUNBLFNBQ0EsaUJBQ0csbUJBQW1CLFNBQVMsWUFBWSxDQUFDO0FBQUEsRUFDaEQ7IiwKICAibmFtZXMiOiBbXQp9Cg==
