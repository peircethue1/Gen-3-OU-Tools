import * as React from 'react';
import { useTranslation } from 'react-i18next';
import cx from 'classnames';
import { PlayerPiconButton } from '@showdex/components/calc';
import { DroppableGrid } from '@showdex/components/layout';
import { ContextMenu, useContextMenu } from '@showdex/components/ui';
import { PiconRackContext } from '@showdex/components/layout';
import { useColorScheme } from '@showdex/redux/store';
import { clamp, env } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { useRandomUuid } from '@showdex/utils/hooks';
import { CalcdexPokeProvider } from '../CalcdexPokeContext';
import { useCalcdexContext } from '../CalcdexContext';
import { PlayerInfo } from '../PlayerInfo';
import { PokeCalc } from '../PokeCalc';
import { SideControls } from '../SideControls';
import styles from './PlayerCalc.module.scss';

export const PlayerCalc = ({
  className,
  style,
  position,
  playerKey,
  defaultName = '--',
  playerOptions,
  onUserPopup,
}) => {
  const colorScheme = useColorScheme();

  const {
    state,
    selectPokemon,
  } = useCalcdexContext();

  const {
    renderMode,
    containerSize,
    containerWidth,
    format,
    gameType,
    authPlayerKey,
  } = state;

  const minPokemonKey = 'calcdex-player-min-pokemon';

  const minPokemon = (!!minPokemonKey && env.int(minPokemonKey)) || 0;
  const playerState = React.useMemo(() => state[playerKey] || {}, [playerKey, state]);

  const {
    pokemon: playerParty,
    maxPokemon,
    activeIndices: playerActives,
    // selectionIndex: playerIndex,
  } = playerState;

  const {
    show: showContextMenu,
    hideAfter,
  } = useContextMenu();

  const piconMenuId = useRandomUuid();
  const [contextPiconId, setContextPiconId] = React.useState<string>(null);

  const contextPokemonIndex = React.useMemo(() => (
    contextPiconId
      ? playerParty.findIndex((p) => p?.calcdexId === contextPiconId)
      : null
  ), [
    contextPiconId,
    playerParty,
  ]);

  const contextPokemon = (contextPokemonIndex ?? -1) > -1
    && playerParty[contextPokemonIndex];

  const rackCtx = React.useContext(PiconRackContext);
  const itemIds = rackCtx[playerKey] || [];

  const {
    // itemKeyPrefix,
    lastAddedId,
    gridSpecs,
    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  } = rackCtx;

  const renderItem = React.useCallback<RackGridProps<React.ReactNode>['renderItem']>((
    id,
    sortable,
  ) => {
    const pkey = extractPlayerKey?.(id, true);
    const pid = extractPokemonId?.(id) || id;

    const party = state?.[pkey]?.pokemon || [];
    const partyIndex = party?.findIndex((p) => p?.calcdexId === pid) ?? -1;
    const targetIndex = partyIndex > -1 ? partyIndex : clamp(0, sortable?.itemIndex ?? party.length, party.length);

    return (
      <PlayerPiconButton
        key={`PlayerCalc:PlayerPiconButton:${playerKey}:${pid}`}
        // ref={sortable?.setActivatorNodeRef}
        player={state?.[pkey]}
        pokemon={party[partyIndex]}
        format={format}
        showNickname={settings?.showNicknames}
        dragging={sortable?.dragging}
        itemIndex={partyIndex < 0 ? sortable?.itemIndex : undefined} // for showing the selection over the "new" Pokemon slot
        nativeProps={undefined}
        onPress={() => selectPokemon(
          playerKey,
          targetIndex,
          `${l.scope}:PlayerPiconButton~SelectionIndex:onPress()`,
        )}
        onContextMenu={undefined}
      />
    );
  }, [
    extractPlayerKey,
    extractPokemonId,
    format,
    playerKey,
    piconMenuId,
    selectPokemon,
    settings?.showNicknames,
    showContextMenu,
    state,
  ]);

  return (
    <div
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        containerWidth < 380 && styles.skinnyBoi,
        containerSize === 'xs' && styles.verySmol,
        ['xs', 'sm'].includes(containerSize) && styles.smol,
        ['md', 'lg', 'xl'].includes(containerSize) && styles.big,
        (containerSize === 'xl' || containerWidth > 990) && styles.veryThicc,
        (mobile && renderMode === 'overlay') && styles.mobileOverlay,
        className,
      )}
      style={style}
    >
      <div className={styles.playerBar}>
        {}

        {(
          <PlayerInfo
            className={styles.playerInfo}
            position={position}
            playerKey={playerKey}
            defaultName={defaultName}
            playerOptions={playerOptions}
            mobile={mobile}
            onUserPopup={onUserPopup}
          />
        )}

        <DroppableGrid
          containerClassName={styles.teamList}
          itemIds={itemIds}
          itemKeyPrefix={makeItemId(playerKey, 'droppable')}
          renderItem={renderItem}
          editable={false}
          lastAddedId={lastAddedId}
          focusedId={contextPiconId}
          gridSpecs={gridSpecs}
        >
          {(
            Array(clamp(0, clamp(maxPokemon || 0, minPokemon) - itemIds.length))
              .fill(null)
              .map((_, i) => {
                const itemIndex = itemIds.length + i;

                return renderItem(
                  makeItemId(playerKey, String(itemIndex)),
                  { itemIndex },
                );
              })
          )}
        </DroppableGrid>
      </div>

      <CalcdexPokeProvider playerKey={playerKey}>
        <PokeCalc
          className={styles.pokeCalc}
        />
      </CalcdexPokeProvider>
    </div>
  );
};