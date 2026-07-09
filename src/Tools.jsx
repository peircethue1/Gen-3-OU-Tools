/**
 * 
 * EDITINGNOTE: Building...
 */

import * as React from 'react';
import cx from 'classnames';
import { FieldCalc } from './_FIELDCALC.jsx';
import { PlayerCalc } from './_PLAYERCALC.jsx';
import { useToolsContext, useToolsSize } from './hooks.js';
import { PageContainer } from './_PAGECONTAINER.jsx';
import { PiconRackProvider } from './_PICONRACKPROVIDER.jsx';
import './main.css';

export const Tools = () => {
  const containerRef = React.useRef(null);

  useToolsSize(containerRef);

  const { state } = useToolsContext();

  const {
    containerSize,
    containerWidth,
    authPlayerKey,
    opponentKey,
  } = state;

  return (
    <PiconRackProvider>
      <PageContainer
        ref={containerRef}
        name="tools"
        className={cx(
          'tools-container',
          containerSize === 'xs' && 'tools-extraSmall',
          containerWidth < 380 && 'tools-slim',
        )}
        contentClassName={'tools-content'}
        contentScrollable
      >
        <PlayerCalc
          className={'tools-authPlayerCalc'}
          position="top"
          playerKey={authPlayerKey}
          defaultName="Player 1"
        />

        <FieldCalc
          className={cx(
            'tools-fieldCalc',
            'tools-expanded',
          )}
          authPlayerKey={authPlayerKey}
          opponentKey={opponentKey}
        />

        <PlayerCalc
          className={'tools-opponentCalc'}
          position="bottom"
          playerKey={opponentKey}
          defaultName="Player 2"
        />
      </PageContainer>
    </PiconRackProvider>
  );
};