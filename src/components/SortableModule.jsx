// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { Module } from './Module.jsx';

export const SortableModule = ({
  style,
  sortableId,
  children,
  ...props
}) => {
  const moduleRef = React.useRef(null);

  return (
    <Module
      ref={moduleRef}
      {...props}
      className={'sortablemodule-container'}
      style={style}
    >
      {children}
    </Module>
  );
};