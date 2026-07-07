// EDITINGNOTE: Review...

import * as React from 'react';

export const SandwichContext = React.createContext({
  ids: [],
  activeId: null,
  mount: () => false,
  activate: () => false,
  unmount: () => {},
});