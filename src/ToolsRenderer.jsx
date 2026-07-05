/**
 * 
 * EDITINGNOTE: Building...
 * See CalcdexRenderer.tsx
 */

import * as React from 'react';
import { ToolsProvider } from './ToolsProvider.jsx';
import { Tools } from './Tools.jsx';

export const ToolsDomRenderer = function(reactRoot, { state, updateState }) {
  if (!reactRoot || typeof reactRoot.render !== 'function') {
    return null;
  }

  reactRoot.render(
    <ToolsProvider state={state} updateState={updateState}>
      <Tools />
    </ToolsProvider>
  );
  
  return reactRoot;
};