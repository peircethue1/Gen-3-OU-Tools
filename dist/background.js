(() => {
  // src/background.js
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "SMOGON_FETCH") {
      fetch(message.url).then((response) => {
        if (!response.ok) {
          throw new Error(`Smogon fetch failed with status: ${response.status}`);
        }
        return message.isJson ? response.json() : response.text();
      }).then((data) => {
        sendResponse({ success: true, data });
      }).catch((error) => {
        console.error("[Gen 3 OU Tools] Failed to fetch data from Smogon with this error:", error);
        sendResponse({ success: false, error: error.message });
      });
      return true;
    }
  });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2JhY2tncm91bmQuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIi8qKlxyXG4gKiBGZXRjaGVzIFNtb2dvbiBkYXRhXHJcbiAqL1xyXG5cclxuY2hyb21lLnJ1bnRpbWUub25NZXNzYWdlLmFkZExpc3RlbmVyKChtZXNzYWdlLCBzZW5kZXIsIHNlbmRSZXNwb25zZSkgPT4ge1xyXG4gIGlmIChtZXNzYWdlLnR5cGUgPT09IFwiU01PR09OX0ZFVENIXCIpIHtcclxuICAgIGZldGNoKG1lc3NhZ2UudXJsKVxyXG4gICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFNtb2dvbiBmZXRjaCBmYWlsZWQgd2l0aCBzdGF0dXM6ICR7cmVzcG9uc2Uuc3RhdHVzfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuaXNKc29uID8gcmVzcG9uc2UuanNvbigpIDogcmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICB9KVxyXG4gICAgICAudGhlbigoZGF0YSkgPT4ge1xyXG4gICAgICAgIHNlbmRSZXNwb25zZSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdbR2VuIDMgT1UgVG9vbHNdIEZhaWxlZCB0byBmZXRjaCBkYXRhIGZyb20gU21vZ29uIHdpdGggdGhpcyBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgc2VuZFJlc3BvbnNlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH0pO1xyXG4gICAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7O0FBSUEsU0FBTyxRQUFRLFVBQVUsWUFBWSxDQUFDLFNBQVMsUUFBUSxpQkFBaUI7QUFDdEUsUUFBSSxRQUFRLFNBQVMsZ0JBQWdCO0FBQ25DLFlBQU0sUUFBUSxHQUFHLEVBQ2QsS0FBSyxDQUFDLGFBQWE7QUFDbEIsWUFBSSxDQUFDLFNBQVMsSUFBSTtBQUNoQixnQkFBTSxJQUFJLE1BQU0sb0NBQW9DLFNBQVMsTUFBTSxFQUFFO0FBQUEsUUFDdkU7QUFFQSxlQUFPLFFBQVEsU0FBUyxTQUFTLEtBQUssSUFBSSxTQUFTLEtBQUs7QUFBQSxNQUMxRCxDQUFDLEVBQ0EsS0FBSyxDQUFDLFNBQVM7QUFDZCxxQkFBYSxFQUFFLFNBQVMsTUFBTSxLQUFLLENBQUM7QUFBQSxNQUN0QyxDQUFDLEVBQ0EsTUFBTSxDQUFDLFVBQVU7QUFDaEIsZ0JBQVEsTUFBTSxzRUFBc0UsS0FBSztBQUN6RixxQkFBYSxFQUFFLFNBQVMsT0FBTyxPQUFPLE1BQU0sUUFBUSxDQUFDO0FBQUEsTUFDdkQsQ0FBQztBQUVILGFBQU87QUFBQSxJQUNUO0FBQUEsRUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
