/**
 * EDITINGNOTE: Add comment...
 */

import * as React from 'react';
import { ToolsContext } from './ToolsContext.js';

export const ToolsProvider = ({ state, updateState, children }) => {
  const value = React.useMemo(() => ({
    state,
    updateState,
  }), [state, updateState]);

  return (
    <ToolsContext.Provider value={value}>
      {children}
    </ToolsContext.Provider>
  );
};