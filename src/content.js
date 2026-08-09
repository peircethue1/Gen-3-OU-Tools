/**
 * Injects the stylesheets and main script into the webpage
 */

// Checks the webpage and extension context
const { runtime } = chrome;

if (typeof document === 'undefined' || !runtime?.id) {
  console.error('[Gen 3 OU Tools] Missing webpage or extension context.');

  throw new Error('Missing webpage or extension context.');
}

// Defines the stylesheet and main script injectables
const mainUrl = runtime.getURL('main.js');
const extensionId = runtime.id;
const injectables = [
  {
    id: 'gen-3-ou-tools-preconnect-googleapis',
    component: 'link',
    into: 'head',
    props: {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
  },

  {
    id: 'gen-3-ou-tools-stylesheet-work-sans',
    component: 'link',
    into: 'head',
    props: {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap',
    },
  },

  {
    id: 'gen-3-ou-tools-stylesheet-fira-code',
    component: 'link',
    into: 'head',
    props: {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap',
    },
  },

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

console.info('[Gen 3 OU Tools] Starting for chrome with this extensionId:', extensionId);

console.debug('[Gen 3 OU Tools] Injecting these injectables:', injectables);

// Creates the elements and injects them into the webpage
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