import * as React from 'react';
import { useSelector } from 'react-redux';

export const ToolsContext = React.createContext({
  state: {},
  updateState: () => void 0,
});

export const SandwichProvider = ({ children }) => {
  return <>{children}</>;
};

export const ToolsProvider = ({ battleId, children }) => {
  const reduxState = useSelector((state) => state.tools?.[battleId] || {});
  const [localState, setLocalState] = React.useState({});

  const value = React.useMemo(() => ({
    state: {
      ...reduxState,
      ...localState,
    },
    updateState: (updates) => {
      setLocalState((prev) => ({ ...prev, ...updates }));
    },
  }), [reduxState, localState]);

  return (
    <ToolsContext.Provider value={value}>
      {children}
    </ToolsContext.Provider>
  );
};

export const Tools = () => {
  const fullReduxState = useSelector((state) => state);

  return (
    <div
      style={{
        padding: '16px',
        fontFamily: '"Fira Code", monospace',
        fontSize: '12px',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        height: '100%',
        overflow: 'auto',
        boxSizing: 'border-box'
      }}
    >
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #3c3c3c', paddingBottom: '8px' }}>
        Redux Store State
      </h3>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
        {JSON.stringify(fullReduxState, null, 2)}
      </pre>
    </div>
  );
};
