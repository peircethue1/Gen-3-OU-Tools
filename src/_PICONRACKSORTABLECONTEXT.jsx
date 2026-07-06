import * as React from 'react';
import { rectSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import { PiconRackContext } from './_PICONRACKCONTEXT.js';

export const PiconRackSortableContext = ({
  playerKey,
  children,
}) => {
  const ctx = React.useContext(PiconRackContext);

  return (
    <SortableContext
      id={ctx.containerIds[playerKey]}
      items={ctx[playerKey] || []}
      strategy={rectSortingStrategy}
    >
      {children}
    </SortableContext>
  );
};