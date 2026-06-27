/**
 * 
 * EDITINGNOTE: Building...
 * See CalcdexRenderer.tsx
 */

import * as ReactDOM from 'react-dom/client';
import React from 'react';
import { Tools } from './Tools.jsx';

export const ToolsDomRenderer = {
  render(containerEl, state) {
    // 1. Initialize the React mounting zone if it doesn't exist
    const reactRoot = ReactDOM.createRoot(containerEl);
    
    // 2. Render your layout blueprint, passing the synced state data
    reactRoot.render(<Tools state={state} />);
    
    // Return it so your room tracker can store it for unmounting later
    return reactRoot;
  }
};