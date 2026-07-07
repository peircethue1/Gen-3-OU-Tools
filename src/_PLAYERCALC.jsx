import * as React from 'react';
import cx from 'classnames';
import { PlayerPiconButton } from '';
import { DroppableGrid } from '';
import { PiconRackContext } from './_PICONRACKCONTEXT.js';
import { useColorScheme } from './hooks.js';
import { clamp } from './utilities.js';
import { ToolsPokeProvider } from '';
import { useToolsContext } from './hooks.js';
import { PlayerInfo } from '';
import { PokeCalc } from '';
import './main.css';

export const PlayerCalc = ({ className, position, playerKey, defaultName }) => {
  const colorScheme = useColorScheme();

  const { state, selectPokemon } = useToolsContext();
  const { containerSize, containerWidth, format } = state;

  const playerState = React.useMemo(() => state[playerKey] || {}, [state, playerKey]);
  const { maxPokemon } = playerState;

  const [contextPiconId, setContextPiconId] = React.useState(null);

  const rackCtx = React.useContext(PiconRackContext);
  const itemIds = rackCtx[playerKey] || [];

  const {
    lastAddedId,
    gridSpecs,
    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  } = rackCtx;

  // EDITINGNOTE: check on sortable here once droppablegrid is built
  const renderItem = React.useCallback((id, sortable) => {
    // what is this second argument, detectonly?
    const pkey = extractPlayerKey?.(id, true);
    const pid = extractPokemonId?.(id) || id;
    const party = state?.[pkey]?.pokemon || [];
    const partyIndex = party?.findIndex((pokemon) => pokemon?.toolsId === pid) ?? -1;
    const targetIndex = partyIndex > -1 ? partyIndex : clamp(0, sortable?.itemIndex ?? party.length, party.length);

    return (
      <PlayerPiconButton
        key={`PlayerCalc:PlayerPiconButton:${playerKey}:${pid}`}
        player={state?.[pkey]}
        pokemon={party[partyIndex]}
        format={format}
        itemIndex={partyIndex < 0 ? sortable?.itemIndex : undefined}
        onPress={() => selectPokemon(playerKey, targetIndex)}
      />
    );
  }, [extractPlayerKey, extractPokemonId, state, playerKey, format, selectPokemon]);

  // EDITINGNOTE: we'll want to replace droppable in makeItemId, or perhaps makeitemid itself, will also want to inspect maxpokemon array here
  return (
    <div
      className={cx(
        container,
        !!colorScheme && colorScheme,
        containerWidth < 380 && slim,
        containerSize === 'xs' && extraSmall,
        ['xs', 'sm'].includes(containerSize) && small,
        ['md', 'lg', 'xl'].includes(containerSize) && large,
        (containerSize === 'xl' || containerWidth > 990) && extraLarge,
        className,
      )}
    >
      <div className={playerBar}>
        {(
          <PlayerInfo
            className={playerInfo}
            position={position}
            playerKey={playerKey}
            defaultName={defaultName}
          />
        )}

        <DroppableGrid
          containerClassName={teamList}
          itemIds={itemIds}
          itemKeyPrefix={makeItemId(playerKey, 'droppable')}
          renderItem={renderItem}
          lastAddedId={lastAddedId}
          focusedId={contextPiconId}
          gridSpecs={gridSpecs}
        >
          {(
            Array(clamp(0, clamp(maxPokemon || 0, 6) - itemIds.length))
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

      <ToolsPokeProvider playerKey={playerKey}>
        <PokeCalc
          className={pokeCalc}
        />
      </ToolsPokeProvider>
    </div>
  );
};