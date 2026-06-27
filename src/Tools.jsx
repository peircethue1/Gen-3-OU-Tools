/**
 * 
 * EDITINGNOTE: Building...
 * See Calcdex.tsx
 */

import React from 'react';

export function Tools({ state }) {
  return (
    <div className="tools-panel">
      <h2>Gen 3 Tools Active</h2>
      <p>Battle ID: {state?.battleNonce || 'No active match data'}</p>
    </div>
  );
}