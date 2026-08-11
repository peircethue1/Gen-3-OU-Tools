(() => {
  // src/content.js
  var { runtime } = chrome;
  if (typeof document === "undefined" || !runtime?.id) {
    console.error("[Gen 3 OU Tools] Missing webpage or extension context.");
    throw new Error("Missing webpage or extension context.");
  }
  var mainUrl = runtime.getURL("main.js");
  var extensionId = runtime.id;
  var injectables = [
    {
      id: "gen-3-ou-tools-preconnect-googleapis",
      component: "link",
      into: "head",
      props: {
        rel: "preconnect",
        href: "https://fonts.googleapis.com"
      }
    },
    {
      id: "gen-3-ou-tools-stylesheet-work-sans",
      component: "link",
      into: "head",
      props: {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
      }
    },
    {
      id: "gen-3-ou-tools-stylesheet-fira-code",
      component: "link",
      into: "head",
      props: {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap"
      }
    },
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
  console.info("[Gen 3 OU Tools] Starting for chrome with this extensionId:", extensionId);
  console.debug("[Gen 3 OU Tools] Injecting these injectables:", injectables);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2NvbnRlbnQuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbIlx1RkVGRi8qKlxyXG4gKiBJbmplY3RzIHRoZSBzdHlsZXNoZWV0cyBhbmQgbWFpbiBzY3JpcHQgaW50byB0aGUgd2VicGFnZVxyXG4gKi9cclxuXHJcbi8vIENoZWNrcyB0aGUgd2VicGFnZSBhbmQgZXh0ZW5zaW9uIGNvbnRleHRcclxuY29uc3QgeyBydW50aW1lIH0gPSBjaHJvbWU7XHJcblxyXG5pZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJyB8fCAhcnVudGltZT8uaWQpIHtcclxuICBjb25zb2xlLmVycm9yKCdbR2VuIDMgT1UgVG9vbHNdIE1pc3Npbmcgd2VicGFnZSBvciBleHRlbnNpb24gY29udGV4dC4nKTtcclxuXHJcbiAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHdlYnBhZ2Ugb3IgZXh0ZW5zaW9uIGNvbnRleHQuJyk7XHJcbn1cclxuXHJcbi8vIERlZmluZXMgdGhlIHN0eWxlc2hlZXQgYW5kIG1haW4gc2NyaXB0IGluamVjdGFibGVzXHJcbmNvbnN0IG1haW5VcmwgPSBydW50aW1lLmdldFVSTCgnbWFpbi5qcycpO1xyXG5jb25zdCBleHRlbnNpb25JZCA9IHJ1bnRpbWUuaWQ7XHJcbmNvbnN0IGluamVjdGFibGVzID0gW1xyXG4gIHtcclxuICAgIGlkOiAnZ2VuLTMtb3UtdG9vbHMtcHJlY29ubmVjdC1nb29nbGVhcGlzJyxcclxuICAgIGNvbXBvbmVudDogJ2xpbmsnLFxyXG4gICAgaW50bzogJ2hlYWQnLFxyXG4gICAgcHJvcHM6IHtcclxuICAgICAgcmVsOiAncHJlY29ubmVjdCcsXHJcbiAgICAgIGhyZWY6ICdodHRwczovL2ZvbnRzLmdvb2dsZWFwaXMuY29tJyxcclxuICAgIH0sXHJcbiAgfSxcclxuXHJcbiAge1xyXG4gICAgaWQ6ICdnZW4tMy1vdS10b29scy1zdHlsZXNoZWV0LXdvcmstc2FucycsXHJcbiAgICBjb21wb25lbnQ6ICdsaW5rJyxcclxuICAgIGludG86ICdoZWFkJyxcclxuICAgIHByb3BzOiB7XHJcbiAgICAgIHJlbDogJ3N0eWxlc2hlZXQnLFxyXG4gICAgICBocmVmOiAnaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1Xb3JrK1NhbnM6aXRhbCx3Z2h0QDAsMTAwOzAsMjAwOzAsMzAwOzAsNDAwOzAsNTAwOzAsNjAwOzAsNzAwOzAsODAwOzAsOTAwOzEsMTAwOzEsMjAwOzEsMzAwOzEsNDAwOzEsNTAwOzEsNjAwOzEsNzAwOzEsODAwOzEsOTAwJmRpc3BsYXk9c3dhcCcsXHJcbiAgICB9LFxyXG4gIH0sXHJcblxyXG4gIHtcclxuICAgIGlkOiAnZ2VuLTMtb3UtdG9vbHMtc3R5bGVzaGVldC1maXJhLWNvZGUnLFxyXG4gICAgY29tcG9uZW50OiAnbGluaycsXHJcbiAgICBpbnRvOiAnaGVhZCcsXHJcbiAgICBwcm9wczoge1xyXG4gICAgICByZWw6ICdzdHlsZXNoZWV0JyxcclxuICAgICAgaHJlZjogJ2h0dHBzOi8vZm9udHMuZ29vZ2xlYXBpcy5jb20vY3NzMj9mYW1pbHk9RmlyYStDb2RlOndnaHRAMzAwOzQwMDs1MDA7NjAwOzcwMCZkaXNwbGF5PXN3YXAnLFxyXG4gICAgfSxcclxuICB9LFxyXG5cclxuICB7XHJcbiAgICBpZDogJ2dlbi0zLW91LXRvb2xzLXNjcmlwdC1tYWluJyxcclxuICAgIGNvbXBvbmVudDogJ3NjcmlwdCcsXHJcbiAgICBpbnRvOiAnYm9keScsXHJcbiAgICBwcm9wczoge1xyXG4gICAgICBzcmM6IG1haW5VcmwsXHJcbiAgICAgIGFzeW5jOiAndHJ1ZScsXHJcbiAgICAgICdkYXRhLWV4dC1pZCc6IGV4dGVuc2lvbklkLFxyXG4gICAgfSxcclxuICB9LFxyXG5dO1xyXG5cclxuY29uc29sZS5pbmZvKCdbR2VuIDMgT1UgVG9vbHNdIFN0YXJ0aW5nIGZvciBjaHJvbWUgd2l0aCB0aGlzIGV4dGVuc2lvbklkOicsIGV4dGVuc2lvbklkKTtcclxuXHJcbmNvbnNvbGUuZGVidWcoJ1tHZW4gMyBPVSBUb29sc10gSW5qZWN0aW5nIHRoZXNlIGluamVjdGFibGVzOicsIGluamVjdGFibGVzKTtcclxuXHJcbi8vIENyZWF0ZXMgdGhlIGVsZW1lbnRzIGFuZCBpbmplY3RzIHRoZW0gaW50byB0aGUgd2VicGFnZVxyXG5pbmplY3RhYmxlcy5mb3JFYWNoKCh7IGlkLCBjb21wb25lbnQsIGludG8sIHByb3BzIH0pID0+IHtcclxuICBjb25zdCBzb3VyY2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChpZCkgfHwgZG9jdW1lbnQuY3JlYXRlRWxlbWVudChjb21wb25lbnQpO1xyXG4gIGNvbnN0IGRlc3RpbmF0aW9uID0gaW50byA9PT0gJ2hlYWQnID8gZG9jdW1lbnQuaGVhZCA6IGRvY3VtZW50LmJvZHk7XHJcblxyXG4gIGlmIChzb3VyY2UuaWQgIT09IGlkKSB7XHJcbiAgICBzb3VyY2UuaWQgPSBpZDtcclxuICB9XHJcblxyXG4gIE9iamVjdC5lbnRyaWVzKHByb3BzKS5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcclxuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHNvdXJjZS5zZXRBdHRyaWJ1dGUoa2V5LCB2YWx1ZSk7XHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGRlc3RpbmF0aW9uLmFwcGVuZENoaWxkKHNvdXJjZSk7XHJcbn0pOyJdLAogICJtYXBwaW5ncyI6ICI7O0FBS0EsTUFBTSxFQUFFLFFBQVEsSUFBSTtBQUVwQixNQUFJLE9BQU8sYUFBYSxlQUFlLENBQUMsU0FBUyxJQUFJO0FBQ25ELFlBQVEsTUFBTSx3REFBd0Q7QUFFdEUsVUFBTSxJQUFJLE1BQU0sdUNBQXVDO0FBQUEsRUFDekQ7QUFHQSxNQUFNLFVBQVUsUUFBUSxPQUFPLFNBQVM7QUFDeEMsTUFBTSxjQUFjLFFBQVE7QUFDNUIsTUFBTSxjQUFjO0FBQUEsSUFDbEI7QUFBQSxNQUNFLElBQUk7QUFBQSxNQUNKLFdBQVc7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLElBRUE7QUFBQSxNQUNFLElBQUk7QUFBQSxNQUNKLFdBQVc7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLElBRUE7QUFBQSxNQUNFLElBQUk7QUFBQSxNQUNKLFdBQVc7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLE1BQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLElBRUE7QUFBQSxNQUNFLElBQUk7QUFBQSxNQUNKLFdBQVc7QUFBQSxNQUNYLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLEtBQUs7QUFBQSxRQUNMLE9BQU87QUFBQSxRQUNQLGVBQWU7QUFBQSxNQUNqQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBRUEsVUFBUSxLQUFLLCtEQUErRCxXQUFXO0FBRXZGLFVBQVEsTUFBTSxpREFBaUQsV0FBVztBQUcxRSxjQUFZLFFBQVEsQ0FBQyxFQUFFLElBQUksV0FBVyxNQUFNLE1BQU0sTUFBTTtBQUN0RCxVQUFNLFNBQVMsU0FBUyxlQUFlLEVBQUUsS0FBSyxTQUFTLGNBQWMsU0FBUztBQUM5RSxVQUFNLGNBQWMsU0FBUyxTQUFTLFNBQVMsT0FBTyxTQUFTO0FBRS9ELFFBQUksT0FBTyxPQUFPLElBQUk7QUFDcEIsYUFBTyxLQUFLO0FBQUEsSUFDZDtBQUVBLFdBQU8sUUFBUSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FBSyxLQUFLLE1BQU07QUFDOUMsVUFBSSxVQUFVLFFBQVc7QUFDdkIsZUFBTyxhQUFhLEtBQUssS0FBSztBQUFBLE1BQ2hDO0FBQUEsSUFDRixDQUFDO0FBRUQsZ0JBQVksWUFBWSxNQUFNO0FBQUEsRUFDaEMsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
