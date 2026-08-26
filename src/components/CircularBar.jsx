// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { clamp } from '@gen-3-ou-tools/utilities.js';
import { CircularBarPath } from './CircularBarPath.jsx';

export const CircularBar = ({
  className,
  value,
  min = 0,
  max = 1,
  strokeWidth = 8,
}) => {
  const boundedValue = clamp(min, value, max);
  const valuePercentage = (boundedValue - min) / (max - min);

  const radius = 50 - (strokeWidth / 2);

  return (
    <svg
      className={cx('circularbar-container', className)}
      viewBox="0 0 100 100"
    >
      <CircularBarPath
        className={'circularbar-pathArc'}
        arcPercentage={1}
        radius={radius}
        strokeWidth={strokeWidth}
      />

      <CircularBarPath
        className={'circularbar-valueArc'}
        arcPercentage={valuePercentage}
        radius={radius}
        strokeWidth={strokeWidth}
      />
    </svg>
  );
};