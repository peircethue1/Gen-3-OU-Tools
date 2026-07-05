/**
 * 
 * EDITINGNOTE: Building...
 * See Calcdex.tsx
 * EDITINGNOTE: Mobile is false
 * EDITINGNOTE: what is useCalcdexContext?
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { v4 as uuidv4 } from 'uuid';
import { MemberIcon } from '@showdex/components/app';
import {
  CloseButton,
  FieldCalc,
  PlayerCalc,
  useCalcdexContext,
  useCalcdexSize,
} from '@showdex/components/calc';
import { BuildInfo } from '@showdex/components/debug';
import { PageContainer, PiconRackProvider, PiconRackSortableContext } from '@showdex/components/layout';
import { BaseButton, ContextMenu, useContextMenu } from '@showdex/components/ui';
import { CalcdexPlayerKeys as AllPlayerKeys } from '@showdex/interfaces/calc';
import {
  useCalcdexDuplicator,
  useColorScheme,
  useHonkdexSettings,
  useShowdexBundles,
} from '@showdex/redux/store';
import { findPlayerTitle } from '@showdex/utils/app';
import { useMobileViewport, useRandomUuid } from '@showdex/utils/hooks';
import styles from './Calcdex.module.scss';

// EDITINGNOTE: additional imports
// import { ToolsContext } from './ToolsContext.js';
// import { useElementSize } from './hooks.js';

export const Tools = () => {
  const { state, updateState } = React.useContext(ToolsContext);

  const {
    battleId,
    active,
    containerSize,
    containerWidth,
    renderMode,
    playerCount,
    playerKey,
    authPlayerKey,
    opponentKey,
    switchPlayers,
    colorScheme,
  } = state;

  const containerRef = React.useRef(null);

  const { width, size } = useElementSize(containerRef, {
    initialWidth: 320,
    initialHeight: 700,
  });

  // EDITINGNOTE: See useCalcdexSize, especially for tolerance
  React.useEffect(() => {
    if (battleId) {
      updateState({
        containerSize: size,
        containerWidth: width,
      });
    }
  }, [battleId, updateState, size, width]);

  const topKey = authPlayerKey;
  const bottomKey = opponentKey;

  return (
    <PiconRackProvider dndMuxId={battleId}>
      <PageContainer
        ref={containerRef}
        name="calcdex"
        className={cx(
          styles.container,
          containerSize === 'xs' && styles.verySmol,
          containerWidth < 380 && styles.skinnyBoi,
        )}
        contentClassName={styles.content}
        prefix={<BuildInfo position="top-right" />}
        contentScrollable
      >
        <PiconRackSortableContext playerKey={topKey}>
          <PlayerCalc
            className={styles.playerCalc}
            position="top"
            playerKey={topKey}
            defaultName="Player 1"
          />
        </PiconRackSortableContext>

        <FieldCalc
          className={cx(
            styles.fieldCalc,
            styles.expanded,
          )}
          playerKey={topKey}
          opponentKey={bottomKey}
        />

        <PiconRackSortableContext playerKey={bottomKey}>
          <PlayerCalc
            className={styles.opponentCalc}
            position="bottom"
            playerKey={bottomKey}
            defaultName="Player 2"
          />
        </PiconRackSortableContext>
      </PageContainer>
    </PiconRackProvider>
  );
};