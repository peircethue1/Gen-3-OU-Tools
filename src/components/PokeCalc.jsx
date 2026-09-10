// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useToolsContext } from '@gen-3-ou-tools/hooks.js';
import { PokeInfo } from './PokeInfo.jsx';
import { PokeMoves } from './+STUBS.jsx';
import { PokeStats } from './+STUBS.jsx';

export const PokeCalc = ({ className }) => {
  const { state } = useToolsContext();
  const { containerSize } = state;

  return (
    <div
      className={cx(
        'pokecalc-container',
        ['lg', 'xl'].includes(containerSize) && 'pokecalc-large',
        className,
      )}
    >
      <PokeInfo
        className={'pokecalc-info'}
      />

      <div className={'pokecalc-tablesContainer'}>
        <PokeMoves
          className={'pokecalc-moves'}
        />

        <PokeStats
          className={'pokecalc-stats'}
        />
      </div>
    </div>
  );
};