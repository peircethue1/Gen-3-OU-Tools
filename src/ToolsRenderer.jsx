/**
 * 
 * EDITINGNOTE: Building... reconcile placeholder (top) and adaptation (bottom), and figure out sandwchprovider
 * See CalcdexRenderer.tsx
 * EDITINGNOTE: Consider adding ErrorBoundary for production
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










import * as React from 'react';
import { ToolsProvider } from './ToolsProvider.jsx';
import { SandwichProvider } from '';
import { Tools } from './Tools.jsx';

const ToolsRenderer = ({state, updateState}) => (
    <SandwichProvider>
      <ToolsProvider state={state} updateState={updateState}>
        <Tools />
      </ToolsProvider>
    </SandwichProvider>
);

export const ToolsDomRenderer = (dom, props) => void dom.render(<ToolsRenderer {...props} />);