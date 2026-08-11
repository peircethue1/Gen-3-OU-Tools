/**
 * Creates the React renderer
 * EDITINGNOTE: See note...
 * EDITINGNOTE: Consider adding ErrorBoundary for production
 */

import * as React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { SandwichProvider } from '@gen-3-ou-tools/components/+STUBS.jsx';
import { ToolsProvider } from '@gen-3-ou-tools/components/+STUBS.jsx';
import { Tools } from '@gen-3-ou-tools/components/+STUBS.jsx';

// Provides the Redux store, layout, and battle context to the user interface
const ToolsRenderer = ({ store, battleId, ...props }) => (
  <ReduxProvider store={store}>
    <SandwichProvider>
      <ToolsProvider battleId={battleId}>
        <Tools {...props} />
      </ToolsProvider>
    </SandwichProvider>
  </ReduxProvider>
);

export const ToolsDomRenderer = (dom, props) =>
  dom.render(<ToolsRenderer {...props} />);