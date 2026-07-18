// EDITINGNOTE: Reviewed, see note...
// EDITINGNOTE: Do I really need active = true or can I collapse that logic?

import * as React from 'react';
import { SandwichContext } from './_SANDWICHCONTEXT.js';

export const SandwichProvider = ({ children }) => {
  const [ids, setIds] = React.useState([]);
  const [activeId, setActiveId] = React.useState(null);

  const value = React.useMemo(() => ({
    ids,
    activeId,

    mount: (id) => {
      if (!id || ids.includes(id)) {
        return false;
      }

      setIds((prevIds) => [...prevIds, id]);

      return true;
    },

    activate: (id, active = true) => {
      if (!id || !ids.includes(id) || (!active && activeId !== id)) {
        return false;
      }

      if (active && activeId === id) {
        return true;
      }

      setActiveId(active ? id : null);

      return true;
    },

    unmount: (id) => {
      if (!id) {
        return;
      }

      setIds((prevIds) => prevIds.filter((prevId) => prevId !== id));

      if (activeId === id) {
        setActiveId(null);
      }
    },
  }), [ids, activeId]);

  return (
    <SandwichContext.Provider value={value}>
      {children}
    </SandwichContext.Provider>
  );
};