//EDITINGNOTE: Building...

import * as React from 'react';
import useSize from '@react-hook/size';
import { ToolsContext } from './ToolsContext.js';

const ElementSizeDefaultBreakpoints = {
  xs: 380,
  sm: 550,
  md: 750,
  lg: 900,
  xl: 1100,
};

const useElementSize = (target, options) => {
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

const tolerance = (value, deviation) => {
  const validFactoryArgs = [value, deviation].every((target) => typeof target === 'number' && !Number.isNaN(target)) && deviation >= 0;

  if (!validFactoryArgs) {
    return () => false;
  }

  const minValue = value - deviation;
  const maxValue = value + deviation;

  return (candidate) => typeof candidate === 'number' && !Number.isNaN(candidate) && candidate >= minValue && candidate <= maxValue;
};

export const useToolsSize = (containerRef) => {
  const { state, updateState } = React.useContext(ToolsContext);

  const {
    width,
    height,
    size,
  } = useElementSize(containerRef, {
    initialWidth: 320,
    initialHeight: 700,
  });

  React.useEffect(() => {
    const shouldIgnore = !width || !height || !size || (size === state?.containerSize && tolerance(state?.containerWidth, 10)(width));

    if (shouldIgnore) {
      return;
    }

    updateState({
      containerSize: size,
      containerWidth: width,
    });
  }, [state?.containerSize, state?.containerWidth, updateState, width, height, size]);
};

// EDITINGNOTE: build this
export const useToolsContext = () => {}

// EDITINGNOTE: build useColorScheme