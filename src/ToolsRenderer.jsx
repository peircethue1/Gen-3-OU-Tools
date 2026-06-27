/**
 * 
 * EDITINGNOTE: Building...
 * See CalcdexRenderer.tsx
 */

import React from 'react';
import { Tools } from './Tools.jsx';

export const ToolsDomRenderer = function(reactRoot, { state, battleId }) {
  // Defensive Guard: Ensure the React Root exists before trying to render
  if (!reactRoot || typeof reactRoot.render !== 'function') {
    console.warn('[Gen 3 OU Tools] Expected a React Root instance, but received:', reactRoot);
    return null;
  }

  // Directly tell Showdex's pre-created React Root to render your component!
  reactRoot.render(<Tools state={state} battleId={battleId} />);
  
  return reactRoot;
};