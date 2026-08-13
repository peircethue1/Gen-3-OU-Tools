// Reviewed...

import * as React from 'react';
import { useToolsBattleState } from '@gen-3-ou-tools/redux/toolsSlice.js';
import { ToolsContext } from './ToolsContext.js';

export const ToolsProvider = ({ battleId, children }) => {
  const state = useToolsBattleState(battleId);
  const value = React.useMemo(() => ({ state }), [state]);

  return (
    <ToolsContext.Provider value={value}>
      {children}
    </ToolsContext.Provider>
  );
};