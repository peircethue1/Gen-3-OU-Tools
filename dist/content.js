(() => {
  // src/content.js
  var runtime = chrome.runtime;
  if (typeof document === "undefined" || !runtime?.id) {
    console.error("[Gen 3 OU Tools] Missing webpage or extension context.");
    throw new Error("Missing webpage or extension context.");
  }
  function parseSmogonLeads(text) {
    const lines = text.split("\n");
    let totalLeads = 0;
    const leadsData = {};
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index].trim();
      if (line.startsWith("Total leads:")) {
        totalLeads = parseInt(line.split(":")[1].trim(), 10);
        continue;
      }
      if (!line || line.startsWith("+") || line.includes("| Rank")) {
        continue;
      }
      const columns = line.split("|").map((column) => column.trim()).filter(Boolean);
      if (columns.length >= 5) {
        const [rankStr, pokemonName, usagePctStr, rawCountStr] = columns;
        leadsData[pokemonName] = {
          rank: parseInt(rankStr, 10),
          usagePercent: parseFloat(usagePctStr.replace("%", "")) / 100,
          rawCount: parseInt(rawCountStr, 10)
        };
      }
    }
    return {
      totalLeads,
      data: leadsData
    };
  }
  async function getSmogonData() {
    const storage = chrome.storage?.local;
    if (!storage) {
      throw new Error("Could not find Chrome storage.");
    }
    const result = await new Promise((resolve) => {
      storage.get(["smogonCache", "cacheTimestamp"], (result2) => resolve(result2));
    });
    const { smogonCache, cacheTimestamp } = result;
    if (smogonCache && cacheTimestamp && Date.now() - cacheTimestamp < 432e5) {
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
    const base = "https://www.smogon.com/stats/";
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
      smogonFetch(`${base}${latest}/leads/gen3ou-1760.txt`, false)
    ]);
    const newData = {
      "0": {
        chaos: chaos0Data,
        leads: parseSmogonLeads(leads0Data)
      },
      "1500": {
        chaos: chaos1500Data,
        leads: parseSmogonLeads(leads1500Data)
      },
      "1630": {
        chaos: chaos1630Data,
        leads: parseSmogonLeads(leads1630Data)
      },
      "1760": {
        chaos: chaos1760Data,
        leads: parseSmogonLeads(leads1760Data)
      }
    };
    await new Promise((resolve) => {
      storage.set({ smogonCache: newData, cacheTimestamp: Date.now() }, () => resolve());
    });
    return newData;
  }
  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.data.type !== "SMOGON_FETCH") {
      return;
    }
    try {
      const data = await getSmogonData();
      window.postMessage({ type: "SMOGON_DATA", data }, "*");
    } catch (error) {
      console.error("[Gen 3 OU Tools] The Smogon fetch could not be processed with this error:", error);
      window.postMessage({ type: "SMOGON_ERROR", error: error.message }, "*");
    }
  });
  var mainUrl = runtime.getURL("main.js");
  var extensionId = runtime.id;
  var injectables = [
    {
      id: "gen-3-ou-tools-script-main",
      component: "script",
      into: "body",
      props: {
        src: mainUrl,
        async: "true",
        "data-ext-id": extensionId
      }
    }
  ];
  console.info("[Gen 3 OU Tools] Starting for chrome with extensionId:", extensionId);
  console.debug("[Gen 3 OU Tools] Injecting injectables:", injectables);
  injectables.forEach(({ id, component, into, props }) => {
    const source = document.getElementById(id) || document.createElement(component);
    const destination = into === "head" ? document.head : document.body;
    if (source.id !== id) {
      source.id = id;
    }
    Object.entries(props).forEach(([key, value]) => {
      if (value !== void 0) {
        source.setAttribute(key, value);
      }
    });
    destination.appendChild(source);
  });
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbnRlbnQuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIlx1RkVGRi8qKlxyXG4gKiBJbmplY3RzIHRoZSBtYWluIHNjcmlwdCBpbnRvIHRoZSB3ZWJwYWdlXHJcbiAqL1xyXG5cclxuLy8gQ2hlY2tzIHRoZSB3ZWJwYWdlIGFuZCBleHRlbnNpb24gY29udGV4dFxyXG5jb25zdCBydW50aW1lID0gY2hyb21lLnJ1bnRpbWU7XHJcblxyXG5pZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyB8fCAhcnVudGltZT8uaWQpIHtcclxuICBjb25zb2xlLmVycm9yKCdbR2VuIDMgT1UgVG9vbHNdIE1pc3Npbmcgd2VicGFnZSBvciBleHRlbnNpb24gY29udGV4dC4nKTtcclxuXHJcbiAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHdlYnBhZ2Ugb3IgZXh0ZW5zaW9uIGNvbnRleHQuJyk7XHJcbn1cclxuXHJcbi8vIENvbnZlcnRzIHRoZSBTbW9nb24gbGVhZHMgdGV4dCB0YWJsZSBpbnRvIGFuIG9iamVjdFxyXG5mdW5jdGlvbiBwYXJzZVNtb2dvbkxlYWRzKHRleHQpIHtcclxuICBjb25zdCBsaW5lcyA9IHRleHQuc3BsaXQoJ1xcbicpO1xyXG4gIGxldCB0b3RhbExlYWRzID0gMDtcclxuICBjb25zdCBsZWFkc0RhdGEgPSB7fTtcclxuXHJcbiAgZm9yIChsZXQgaW5kZXggPSAwOyBpbmRleCA8IGxpbmVzLmxlbmd0aDsgaW5kZXgrKykge1xyXG4gICAgY29uc3QgbGluZSA9IGxpbmVzW2luZGV4XS50cmltKCk7XHJcblxyXG4gICAgaWYgKGxpbmUuc3RhcnRzV2l0aChcIlRvdGFsIGxlYWRzOlwiKSkge1xyXG4gICAgICB0b3RhbExlYWRzID0gcGFyc2VJbnQobGluZS5zcGxpdChcIjpcIilbMV0udHJpbSgpLCAxMCk7XHJcbiAgICAgIFxyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIWxpbmUgfHwgbGluZS5zdGFydHNXaXRoKFwiK1wiKSB8fCBsaW5lLmluY2x1ZGVzKFwifCBSYW5rXCIpKSB7XHJcbiAgICAgIGNvbnRpbnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbHVtbnMgPSBsaW5lLnNwbGl0KCd8JykubWFwKGNvbHVtbiA9PiBjb2x1bW4udHJpbSgpKS5maWx0ZXIoQm9vbGVhbik7XHJcblxyXG4gICAgaWYgKGNvbHVtbnMubGVuZ3RoID49IDUpIHtcclxuICAgICAgY29uc3QgW3JhbmtTdHIsIHBva2Vtb25OYW1lLCB1c2FnZVBjdFN0ciwgcmF3Q291bnRTdHJdID0gY29sdW1ucztcclxuXHJcbiAgICAgIGxlYWRzRGF0YVtwb2tlbW9uTmFtZV0gPSB7XHJcbiAgICAgICAgcmFuazogcGFyc2VJbnQocmFua1N0ciwgMTApLFxyXG4gICAgICAgIHVzYWdlUGVyY2VudDogcGFyc2VGbG9hdCh1c2FnZVBjdFN0ci5yZXBsYWNlKCclJywgJycpKSAvIDEwMCxcclxuICAgICAgICByYXdDb3VudDogcGFyc2VJbnQocmF3Q291bnRTdHIsIDEwKSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICB0b3RhbExlYWRzOiB0b3RhbExlYWRzLFxyXG4gICAgZGF0YTogbGVhZHNEYXRhXHJcbiAgfTtcclxufVxyXG5cclxuLy8gUmV0cmlldmVzIFNtb2dvbiBkYXRhIGZyb20gdGhlIGNhY2hlIG9yIGZldGNoZXMgU21vZ29uIGRhdGEgdG8gdGhlIGNhY2hlXHJcbmFzeW5jIGZ1bmN0aW9uIGdldFNtb2dvbkRhdGEoKSB7XHJcbiAgY29uc3Qgc3RvcmFnZSA9IGNocm9tZS5zdG9yYWdlPy5sb2NhbDtcclxuXHJcbiAgaWYgKCFzdG9yYWdlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZmluZCBDaHJvbWUgc3RvcmFnZS5cIik7XHJcbiAgfVxyXG5cclxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgc3RvcmFnZS5nZXQoWydzbW9nb25DYWNoZScsICdjYWNoZVRpbWVzdGFtcCddLCAocmVzdWx0KSA9PiByZXNvbHZlKHJlc3VsdCkpO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCB7IHNtb2dvbkNhY2hlLCBjYWNoZVRpbWVzdGFtcCB9ID0gcmVzdWx0O1xyXG5cclxuICBpZiAoc21vZ29uQ2FjaGUgJiYgY2FjaGVUaW1lc3RhbXAgJiYgKERhdGUubm93KCkgLSBjYWNoZVRpbWVzdGFtcCA8IDQzMjAwMDAwKSkge1xyXG4gICAgcmV0dXJuIHNtb2dvbkNhY2hlO1xyXG4gIH1cclxuXHJcbiAgY29uc3Qgc21vZ29uRmV0Y2ggPSAodXJsLCBpc0pzb24pID0+IHtcclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGNocm9tZS5ydW50aW1lLnNlbmRNZXNzYWdlKHsgdHlwZTogXCJTTU9HT05fRkVUQ0hcIiwgdXJsLCBpc0pzb24gfSwgKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgaWYgKGNocm9tZS5ydW50aW1lLmxhc3RFcnJvcikge1xyXG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IoY2hyb21lLnJ1bnRpbWUubGFzdEVycm9yLm1lc3NhZ2UpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2Vzcykge1xyXG4gICAgICAgICAgcmV0dXJuIHJlamVjdChuZXcgRXJyb3IocmVzcG9uc2U/LmVycm9yKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXNvbHZlKHJlc3BvbnNlLmRhdGEpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH07XHJcblxyXG4gIGNvbnN0IGJhc2UgPSAnaHR0cHM6Ly93d3cuc21vZ29uLmNvbS9zdGF0cy8nO1xyXG4gIGNvbnN0IGluZGV4SHRtbCA9IGF3YWl0IHNtb2dvbkZldGNoKGJhc2UsIGZhbHNlKTtcclxuICBjb25zdCBkaXJlY3RvcmllcyA9IFsuLi5pbmRleEh0bWwubWF0Y2hBbGwoL2hyZWY9XCIoXFxkezR9LVxcZHsyfSlcXC8vZyldLm1hcCgobWF0Y2gpID0+IG1hdGNoWzFdKTtcclxuICBjb25zdCBsYXRlc3QgPSBkaXJlY3Rvcmllc1tkaXJlY3Rvcmllcy5sZW5ndGggLSAxXTtcclxuXHJcbiAgaWYgKCFsYXRlc3QpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkIG5vdCBmaW5kIGFueSBTbW9nb24gZGlyZWN0b3JpZXMuXCIpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgW1xyXG4gICAgY2hhb3MwRGF0YSxcclxuICAgIGNoYW9zMTUwMERhdGEsXHJcbiAgICBjaGFvczE2MzBEYXRhLFxyXG4gICAgY2hhb3MxNzYwRGF0YSxcclxuICAgIGxlYWRzMERhdGEsXHJcbiAgICBsZWFkczE1MDBEYXRhLFxyXG4gICAgbGVhZHMxNjMwRGF0YSxcclxuICAgIGxlYWRzMTc2MERhdGFcclxuICBdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vY2hhb3MvZ2VuM291LTAuanNvbmAsIHRydWUpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vY2hhb3MvZ2VuM291LTE1MDAuanNvbmAsIHRydWUpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vY2hhb3MvZ2VuM291LTE2MzAuanNvbmAsIHRydWUpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vY2hhb3MvZ2VuM291LTE3NjAuanNvbmAsIHRydWUpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vbGVhZHMvZ2VuM291LTAudHh0YCwgZmFsc2UpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vbGVhZHMvZ2VuM291LTE1MDAudHh0YCwgZmFsc2UpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vbGVhZHMvZ2VuM291LTE2MzAudHh0YCwgZmFsc2UpLFxyXG4gICAgc21vZ29uRmV0Y2goYCR7YmFzZX0ke2xhdGVzdH0vbGVhZHMvZ2VuM291LTE3NjAudHh0YCwgZmFsc2UpLFxyXG4gIF0pO1xyXG5cclxuICBjb25zdCBuZXdEYXRhID0ge1xyXG4gICAgXCIwXCI6IHtcclxuICAgICAgY2hhb3M6Y2hhb3MwRGF0YSxcclxuICAgICAgbGVhZHM6cGFyc2VTbW9nb25MZWFkcyhsZWFkczBEYXRhKSxcclxuICAgIH0sXHJcbiAgICBcIjE1MDBcIjoge1xyXG4gICAgICBjaGFvczpjaGFvczE1MDBEYXRhLFxyXG4gICAgICBsZWFkczpwYXJzZVNtb2dvbkxlYWRzKGxlYWRzMTUwMERhdGEpLFxyXG4gICAgfSxcclxuICAgIFwiMTYzMFwiOiB7XHJcbiAgICAgIGNoYW9zOmNoYW9zMTYzMERhdGEsXHJcbiAgICAgIGxlYWRzOnBhcnNlU21vZ29uTGVhZHMobGVhZHMxNjMwRGF0YSksXHJcbiAgICB9LFxyXG4gICAgXCIxNzYwXCI6IHtcclxuICAgICAgY2hhb3M6Y2hhb3MxNzYwRGF0YSxcclxuICAgICAgbGVhZHM6cGFyc2VTbW9nb25MZWFkcyhsZWFkczE3NjBEYXRhKSxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgIHN0b3JhZ2Uuc2V0KHsgc21vZ29uQ2FjaGU6IG5ld0RhdGEsIGNhY2hlVGltZXN0YW1wOiBEYXRlLm5vdygpIH0sICgpID0+IHJlc29sdmUoKSk7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBuZXdEYXRhO1xyXG59XHJcblxyXG4vLyBMaXN0ZW5zIGZvciBmZXRjaCByZXF1ZXN0c1xyXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcIm1lc3NhZ2VcIiwgYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgaWYgKGV2ZW50LnNvdXJjZSAhPT0gd2luZG93IHx8IGV2ZW50LmRhdGEudHlwZSAhPT0gXCJTTU9HT05fRkVUQ0hcIikge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGRhdGEgPSBhd2FpdCBnZXRTbW9nb25EYXRhKCk7XHJcblxyXG4gICAgd2luZG93LnBvc3RNZXNzYWdlKHsgdHlwZTogXCJTTU9HT05fREFUQVwiLCBkYXRhOiBkYXRhIH0sIFwiKlwiKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW0dlbiAzIE9VIFRvb2xzXSBUaGUgU21vZ29uIGZldGNoIGNvdWxkIG5vdCBiZSBwcm9jZXNzZWQgd2l0aCB0aGlzIGVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICB3aW5kb3cucG9zdE1lc3NhZ2UoeyB0eXBlOiBcIlNNT0dPTl9FUlJPUlwiLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCBcIipcIik7XHJcbiAgfVxyXG59KTtcclxuXHJcbi8vIERlZmluZXMgdGhlIG1haW4gc2NyaXB0IGxvY2F0aW9uIGFuZCBzZXR0aW5nc1xyXG5jb25zdCBtYWluVXJsID0gcnVudGltZS5nZXRVUkwoJ21haW4uanMnKTtcclxuY29uc3QgZXh0ZW5zaW9uSWQgPSBydW50aW1lLmlkO1xyXG5jb25zdCBpbmplY3RhYmxlcyA9IFtcclxuICB7XHJcbiAgICBpZDogJ2dlbi0zLW91LXRvb2xzLXNjcmlwdC1tYWluJyxcclxuICAgIGNvbXBvbmVudDogJ3NjcmlwdCcsXHJcbiAgICBpbnRvOiAnYm9keScsXHJcbiAgICBwcm9wczoge1xyXG4gICAgICBzcmM6IG1haW5VcmwsXHJcbiAgICAgIGFzeW5jOiAndHJ1ZScsXHJcbiAgICAgICdkYXRhLWV4dC1pZCc6IGV4dGVuc2lvbklkLFxyXG4gICAgfSxcclxuICB9LFxyXG5dO1xyXG5cclxuY29uc29sZS5pbmZvKCdbR2VuIDMgT1UgVG9vbHNdIFN0YXJ0aW5nIGZvciBjaHJvbWUgd2l0aCBleHRlbnNpb25JZDonLCBleHRlbnNpb25JZCk7XHJcblxyXG5jb25zb2xlLmRlYnVnKCdbR2VuIDMgT1UgVG9vbHNdIEluamVjdGluZyBpbmplY3RhYmxlczonLCBpbmplY3RhYmxlcyk7XHJcblxyXG4vLyBDcmVhdGVzIHRoZSBlbGVtZW50IGFuZCBpbmplY3RzIGl0IGludG8gdGhlIHdlYnBhZ2VcclxuaW5qZWN0YWJsZXMuZm9yRWFjaCgoeyBpZCwgY29tcG9uZW50LCBpbnRvLCBwcm9wcyB9KSA9PiB7XHJcbiAgY29uc3Qgc291cmNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpIHx8IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoY29tcG9uZW50KTtcclxuICBjb25zdCBkZXN0aW5hdGlvbiA9IGludG8gPT09ICdoZWFkJyA/IGRvY3VtZW50LmhlYWQgOiBkb2N1bWVudC5ib2R5O1xyXG5cclxuICBpZiAoc291cmNlLmlkICE9PSBpZCkge1xyXG4gICAgc291cmNlLmlkID0gaWQ7XHJcbiAgfVxyXG5cclxuICBPYmplY3QuZW50cmllcyhwcm9wcykuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBzb3VyY2Uuc2V0QXR0cmlidXRlKGtleSwgdmFsdWUpO1xyXG4gICAgfVxyXG4gIH0pO1xyXG5cclxuICBkZXN0aW5hdGlvbi5hcHBlbmRDaGlsZChzb3VyY2UpO1xyXG59KTsiXSwKICAibWFwcGluZ3MiOiAiOztBQUtBLE1BQU0sVUFBVSxPQUFPO0FBRXZCLE1BQUksT0FBTyxhQUFhLGVBQWUsQ0FBQyxTQUFTLElBQUk7QUFDbkQsWUFBUSxNQUFNLHdEQUF3RDtBQUV0RSxVQUFNLElBQUksTUFBTSx1Q0FBdUM7QUFBQSxFQUN6RDtBQUdBLFdBQVMsaUJBQWlCLE1BQU07QUFDOUIsVUFBTSxRQUFRLEtBQUssTUFBTSxJQUFJO0FBQzdCLFFBQUksYUFBYTtBQUNqQixVQUFNLFlBQVksQ0FBQztBQUVuQixhQUFTLFFBQVEsR0FBRyxRQUFRLE1BQU0sUUFBUSxTQUFTO0FBQ2pE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
