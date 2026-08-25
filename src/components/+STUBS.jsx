import * as React from 'react';

export const Badge = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({
    show: () => {},
    hide: () => {},
  }));
  return null;
});

export const CircularBar = (props) => null;

export const PokeStatus = (props) => null;

export const PokeType = (props) => null;

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

export const FieldCalc = (props) => null;
