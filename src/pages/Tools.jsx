//EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useToolsSize, useToolsContext } from '@gen-3-ou-tools/hooks.js';
import { PiconRackProvider } from '@gen-3-ou-tools/components/PiconRackProvider.jsx';
import { PageContainer } from '@gen-3-ou-tools/components/PageContainer.jsx';
import { PlayerCalc } from '@gen-3-ou-tools/components/PlayerCalc.jsx';
import { FieldCalc } from '@gen-3-ou-tools/components/+STUBS.jsx';//'@gen-3-ou-tools/components/FieldCalc.jsx';
import '@gen-3-ou-tools/main.css';

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