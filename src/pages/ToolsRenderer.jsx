/**
 * 
 * EDITINGNOTE: Reviewed...
 * EDITINGNOTE: Consider adding ErrorBoundary for production
 */

import * as React from 'react';
import { ToolsProvider } from './ToolsProvider.jsx';
import { SandwichProvider } from './_SANDWICHPROVIDER.jsx';
import { Tools } from './Tools.jsx';

const ToolsRenderer = ({ state, updateState }) => (
  <SandwichProvider>
    <ToolsProvider state={state} updateState={updateState}>
      <Tools />
    </ToolsProvider>
  </SandwichProvider>
);

export const ToolsDomRenderer = function(dom, { state, updateState }) {
  if (!dom || typeof dom.render !== 'function') {
    return null;
  }

  void dom.render(<ToolsRenderer state={state} updateState={updateState} />);
};