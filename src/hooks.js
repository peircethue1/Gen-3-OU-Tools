/**
 * 
 * EDITINGNOTE: Review...
 */

import * as React from 'react';
import useSize from '@react-hook/size';

const ElementSizeDefaultBreakpoints = {
  xs: 380,
  sm: 550,
  md: 750,
  lg: 900,
  xl: 1100,
};

export const useElementSize = (target, options) => {
  const {
    initialWidth = 0,
    initialHeight = 0,
  } = options || {};

  const [
    width,
    height,
  ] = useSize(target, {
    initialWidth,
    initialHeight,
  });

  const breakpoints = {
    ...ElementSizeDefaultBreakpoints,
  };

  const sizes = Object.entries(breakpoints).sort(([, a], [, b]) => b - a);
  const size = (sizes.find(([, breakpoint]) => width >= breakpoint) || sizes.slice(-1)[0])?.[0];

  return {
    width,
    height,
    size,
  };
};