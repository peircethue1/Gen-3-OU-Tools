/**
 * 
 * EDITINGNOTE: Building...
 */

import * as React from 'react';
import cx from 'classnames';
// import { FieldCalc, PlayerCalc } from '';
import { useToolsContext, useToolsSize } from './hooks.js';
// import { PageContainer, PiconRackProvider, PiconRackSortableContext } from '';
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
          container,
          containerSize === 'xs' && extraSmall,
          containerWidth < 380 && slim,
        )}
        contentClassName={content}
        contentScrollable
      >
        <PiconRackSortableContext playerKey={authPlayerKey}>
          <PlayerCalc
            className={authPlayerCalc}
            position="top"
            playerKey={authPlayerKey}
            defaultName="Player 1"
          />
        </PiconRackSortableContext>

        <FieldCalc
          className={fieldCalc}
          authPlayerKey={authPlayerKey}
          opponentKey={opponentKey}
        />

        <PiconRackSortableContext playerKey={opponentKey}>
          <PlayerCalc
            className={opponentCalc}
            position="bottom"
            playerKey={opponentKey}
            defaultName="Player 2"
          />
        </PiconRackSortableContext>
      </PageContainer>
    </PiconRackProvider>
  );
};