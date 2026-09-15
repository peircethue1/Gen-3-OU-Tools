// EDITINGNOTE: See note...

import {
  useSelector as useReduxSelector,
  useDispatch as useReduxDispatch,
} from 'react-redux';
import * as React from 'react';
import useSize from '@react-hook/size';
import { v5 as uuidv5, v1 as uuidv1, v4 as uuidv4, NIL as uuidnil } from 'uuid';
import { useSmogonData } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { ToolsContext } from '@gen-3-ou-tools/pages/ToolsContext.js';
import { toolsSlice } from '@gen-3-ou-tools/redux/toolsSlice.js';
import { ToolsPokeContext } from '@gen-3-ou-tools/components/ToolsPokeContext.js';
import { SandwichContext } from '@gen-3-ou-tools/components/SandwichContext.js';

// Selects the state from the store
export const useSelector = useReduxSelector;

// Retrieves the dispatch function from the store
export const useDispatch = () => useReduxDispatch();

// 
export const useToolsPresets = () => {
  const smogonData = useSmogonData();

  const metagame = Object.values(smogonData || {})
    .find((bracket) => bracket?.chaos?.info?.metagame)
    ?.chaos?.info?.metagame;

  return {
    loading: !metagame,
    usages: smogonData || {},
  };
};

// 
const ElementSizeDefaultBreakpoints = {
  xs: 380,
  sm: 550,
  md: 750,
  lg: 900,
  xl: 1100,
};

// 
const useElementSize = (target, options) => {
  const { initialWidth, initialHeight } = options || {};

  const [width, height] = useSize(target, {
    initialWidth,
    initialHeight,
  });

  const breakpoints = { ...ElementSizeDefaultBreakpoints };
  const sizes = Object.entries(breakpoints).sort(([, a], [, b]) => b - a);
  const size = (sizes.find(([, breakpoint]) => width >= breakpoint) || sizes.slice(-1)[0])?.[0];

  return { width, height, size };
};

// 
const tolerance = (value, deviation) => {
  const validFactoryArgs = [value, deviation].every(
    (target) => typeof target === 'number' && !Number.isNaN(target)
  ) && deviation >= 0;

  if (!validFactoryArgs) {
    return () => false;
  }

  const minValue = value - deviation;
  const maxValue = value + deviation;

  return (candidate) =>
    typeof candidate === 'number' &&
    !Number.isNaN(candidate) &&
    candidate >= minValue &&
    candidate <= maxValue;
};

// 
export const useToolsSize = (containerRef) => {
  const { state } = React.useContext(ToolsContext);

  const dispatch = useDispatch();

  const { width, height, size } = useElementSize(containerRef, {
    initialWidth: 320,
    initialHeight: 700,
  });

  React.useEffect(() => {
    const shouldIgnore =
      !width ||
      !height ||
      !size ||
      (size === state?.containerSize && tolerance(state?.containerWidth, 10)(width));

    if (shouldIgnore) {
      return;
    }

    dispatch(toolsSlice.actions.update({
      battleId: state.battleId,
      containerSize: size,
      containerWidth: width,
    }));
  }, [
    dispatch,
    height,
    size,
    state?.battleId,
    state?.containerSize,
    state?.containerWidth,
    width,
  ]);
};

// EDITINGNOTE: This is a stub, check which functions are actually used before building
export const useToolsContext = () => {
  const ctx = React.useContext(ToolsContext);

  return {
    ...ctx,

    updateBattle: (battle) => console.log('[Stub updateBattle]\n', battle),
    updatePokemon: (playerKey, pokemon) => console.log('[Stub updatePokemon]\n', playerKey, '\n', pokemon),
    updateSide: (playerKey, side) => console.log('[Stub updateSide]\n', playerKey, '\n', side),
    updateField: (field) => console.log('[Stub updateField]\n', field),
    selectPokemon: (playerKey, pokemonIndex) => console.log('[Stub selectPokemon]\n', playerKey, '\n', pokemonIndex),

  };
};

// 
export const useToolsPokeContext = () => {
  const ctx = React.useContext(ToolsPokeContext);
  const { playerKey, playerPokemon } = ctx;

  const {
    updatePokemon: updatePlayerPokemon,
    selectPokemon,
  } = useToolsContext();

  const updatePokemon = (pokemon) => updatePlayerPokemon(
    playerKey,
    {
      ...pokemon,
      toolsId: playerPokemon?.toolsId,
    },
  );

  return {
    ...ctx,

    updatePokemon,
    selectPokemon: (index) => selectPokemon(playerKey, index),
  };
};

// 
export const useRandomUuid = () => {
  const uuidRef = React.useRef(uuidv5(
    `${uuidv1()}-${uuidv4()}`,
    uuidnil,
  ));

  return uuidRef.current;
};

// 
export const useSandwich = () => {
  const {
    activeId,
    mount,
    activate,
    unmount,
  } = React.useContext(SandwichContext);

  const id = useRandomUuid();

  React.useEffect(() => {
    if (!id) {
      return;
    }

    mount(id);

    return () => unmount(id);
  }, []);

  const output = React.useMemo(() => ({
    id,
    active: activeId === id,

    requestOpen: () => activate(id, true),
    notifyClose: () => activate(id, false),
  }), [activate, activeId, id]);

  return output;
};