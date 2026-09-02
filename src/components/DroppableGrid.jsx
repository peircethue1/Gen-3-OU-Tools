// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { SortableModule } from './SortableModule.jsx';
import { Grid } from './Grid.jsx';

export const DroppableGrid = ({
  containerClassName,
  itemIds,
  itemKeyPrefix,
  gridSpecs,
  children,
  renderItem,
}) => {
  const gridRef = React.useRef(null);

  const items = React.useMemo(() => (
    itemIds?.length && typeof renderItem === 'function'
      ? itemIds.map((id, index) => (
        <SortableModule
          key={`${itemKeyPrefix}:sortable:${index}`}
          style={{ width: gridSpecs?.gridSize, height: gridSpecs?.gridSize }}
          sortableId={id}
        >
          {renderItem(id, { itemIndex: index })}
        </SortableModule>
      ))
      : null
  ), [gridSpecs, itemIds, itemKeyPrefix, renderItem]);

  return (
    <div className={containerClassName}>
      <Grid
        ref={gridRef}
        columns={gridSpecs?.columns}
        gridSize={gridSpecs?.gridSize}
        gridGap={gridSpecs?.gridGap}
        interactive
      >
        {items}
        {children}
      </Grid>
    </div>
  );
};