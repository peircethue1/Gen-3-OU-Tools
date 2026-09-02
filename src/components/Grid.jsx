// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { createModuleLayoutUtils } from '@gen-3-ou-tools/utilities.js';

export const Grid = React.forwardRef(({
  columns = 0,
  minRows = 0,
  gridSize = 0,
  gridGap = 0,
  interactive,
  children,
}, forwardedRef) => {
  const { toPixels } = createModuleLayoutUtils({ gridSize, gridGap });

  return (
    <div
      ref={forwardedRef}
      className={cx(
        'grid-container',
        interactive && 'grid-interactive',
      )}
      style={{
        ...(columns > 0 && { gridTemplateColumns: `repeat(${columns}, minmax(${gridSize}px, min-content))` }),
        ...(gridSize > 0 && { gridAutoRows: `minmax(${gridSize}px, max-content)` }),
        ...(gridGap > 0 && { columnGap: gridGap, rowGap: gridGap }),
        ...(minRows > 0 && { minHeight: toPixels(minRows) }),
      }}
    >
      {children}
    </div>
  );
});