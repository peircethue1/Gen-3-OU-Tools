// EDITINGNOTE: Reviewed, see note...

import * as React from 'react';
import cx from 'classnames';
import { calcPokemonCurrentHp } from '@gen-3-ou-tools/utilities.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { PiconButton } from './PiconButton.jsx';
import { PokeGlance } from './+STUBS.jsx';

export const PlayerPiconButton = ({ player, partyIndex, format, onPress }) => {
  const colorScheme = useColorScheme();

  const {
    pokemon: playerParty,
    selectionIndex,
    activeIndex,
  } = player || {};

  const selectedPokemon = playerParty?.[selectionIndex] ?? playerParty?.[activeIndex];

  const pokemon = playerParty?.[partyIndex];

  const pokemonKey = pokemon?.toolsId ||
    pokemon?.ident ||
    pokemon?.searchid ||
    pokemon?.details ||
    pokemon?.name ||
    pokemon?.speciesForme;

  const friendlyPokemonName = pokemon?.speciesForme
    || pokemon?.name
    || pokemonKey;

  const hp = calcPokemonCurrentHp(pokemon);

  const item = pokemon?.dirtyItem ?? pokemon?.item;

  const selected = (
    !!pokemon?.toolsId
    && !!selectedPokemon?.toolsId
    && selectedPokemon.toolsId === pokemon.toolsId
  );

  const disabled = !pokemon?.speciesForme;

  return (
    <PiconButton
      className={cx(
        'playerpiconbutton-container',
        !!colorScheme && `playerpiconbutton-${colorScheme}`,
        pokemon?.active && 'playerpiconbutton-active',
        selected && 'playerpiconbutton-selected',
        !hp && 'playerpiconbutton-fainted',
      )}
      piconClassName={cx(
        'playerpiconbutton-picon',
        !pokemon?.speciesForme && 'playerpiconbutton-none',
      )}
      display="block"
      aria-label={`Select ${friendlyPokemonName}`}
      pokemon={pokemon?.speciesForme ? {
        speciesForme: pokemon.speciesForme,
        item,
      } : 'pokeball-none'}// EDITINGNOTE: is this where pokeball vs grey box?
      tooltip={pokemon?.speciesForme ? (
        <PokeGlance
          className={'playerpiconbutton-glanceTooltip'}
          pokemon={pokemon}
          format={format}
          showAbility={pokemon?.abilityToggled}
          showItem
          showStatus
          reverseColorScheme
        />
      ) : undefined}
      tooltipPlacement="top"
      tooltipOffset={[0, -4]}
      disabled={disabled}
      onPress={onPress}
    >
      <div
        className={cx(
          'playerpiconbutton-piconBackground',
          !!colorScheme && `playerpiconbutton-${colorScheme}`,
        )}
      />
    </PiconButton>
  );
};