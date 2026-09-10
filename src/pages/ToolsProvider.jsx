// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { useToolsPresets } from '@gen-3-ou-tools/hooks.js';
import { useToolsBattleState } from '@gen-3-ou-tools/redux/toolsSlice.js';
import { ToolsContext } from './ToolsContext.js';

export const ToolsProvider = ({ battleId, children }) => {
  const state = useToolsBattleState(battleId);

  const presets = useToolsPresets();

  const value = React.useMemo(() => ({ state, presets }), [presets, state]);

  return (
    <ToolsContext.Provider value={value}>
      {children}
    </ToolsContext.Provider>
  );
};