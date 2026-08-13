// fix imports

import * as React from 'react';
import cx from 'classnames';
import { PiconButton, PokeGlance } from '@showdex/components/app';
import { useColorScheme } from '@showdex/redux/store';
import { calcPokemonCurrentHp } from '@showdex/utils/calc';
import '@gen-3-ou-tools/main.css';

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
    !!pokemon?.calcdexId
    && !!selectedPokemon?.calcdexId
    && selectedPokemon.calcdexId === pokemon.calcdexId
  );

  const disabled = !pokemon?.speciesForme;

  return (
    <PiconButton
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        pokemon?.active && styles.active,
        selected && styles.selected,
        !hp && styles.fainted,
      )}
      piconClassName={cx(
        styles.picon,
        !pokemon?.speciesForme && styles.none,
      )}
      display="block"
      aria-label={t('player.party.aria', { pokemon: friendlyPokemonName })}
      pokemon={pokemon?.speciesForme ? {
        // don't show transformedForme here, as requested by camdawgboi
        speciesForme: (pokemon.cosmeticForme || pokemon.speciesForme)?.replace(pokemon.useMax ? '' : '-Gmax', ''),
        item,
      } : 'pokeball-none'}
      tooltip={pokemon?.speciesForme ? (
        <PokeGlance
          className={styles.glanceTooltip}
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
          styles.piconBackground,
          !!colorScheme && styles[colorScheme],
        )}
      />
    </PiconButton>
  );
};