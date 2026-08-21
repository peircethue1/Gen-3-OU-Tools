import * as React from 'react';

export const FieldCalc = (props) => null;

export const PlayerInfo = (props) => null;

export const DroppableGrid = ({ containerClassName, itemIds = [], renderItem, children }) => {
  return (
    <div className={containerClassName}>
      {itemIds.map((id, index) => renderItem?.(id, { itemIndex: index }))}
      {typeof children === 'function' ? children() : children}
    </div>
  );
};

export const ToolsPokeProvider = ({ children }) => <>{children}</>;

export const PokeCalc = (props) => null;

export const PokeGlance = (props) => null;

export const Tooltip = (props) => null;
