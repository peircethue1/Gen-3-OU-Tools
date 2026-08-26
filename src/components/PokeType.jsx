// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { determineColorScheme, formatId } from '@gen-3-ou-tools/utilities.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';

const POKEMON_TYPE_LABELS = {
  Normal: 'NORMAL',
  Grass: 'GRASS',
  Fire: 'FIRE',
  Water: 'WATER',
  Electric: 'ELECTR',
  Ice: 'ICE',
  Flying: 'FLYING',
  Bug: 'BUG',
  Poison: 'POISON',
  Ground: 'GROUND',
  Rock: 'ROCK',
  Fighting: 'FIGHT',
  Psychic: 'PSYCH',
  Ghost: 'GHOST',
  Dragon: 'DRAGON',
  Dark: 'DARK',
  Steel: 'STEEL',
};

const TYPES = {
  bug: 'Bug',
  dark: 'Dark',
  dragon: 'Dragon',
  electric: 'Electric',
  fighting: 'Fighting',
  fire: 'Fire',
  flying: 'Flying',
  ghost: 'Ghost',
  grass: 'Grass',
  ground: 'Ground',
  ice: 'Ice',
  normal: 'Normal',
  poison: 'Poison',
  psychic: 'Psychic',
  rock: 'Rock',
  steel: 'Steel',
  unknown: 'Unknown',
  water: 'Water',
};

export const PokeType = ({ className, type, highlight, reverseColorScheme }) => {
  const currentColorScheme = useColorScheme();
  const colorScheme = determineColorScheme(currentColorScheme, reverseColorScheme);

  const typeId = formatId(type);
  const label = TYPES[typeId] || POKEMON_TYPE_LABELS[type] || '???';

  return (
    <span
      className={cx(
        'poketype-container',
        !!colorScheme && `poketype-${colorScheme}`,
        !!type && type !== '???' && `poketype-type-${typeId}`,
        highlight && 'poketype-highlight',
        className,
      )}
    >
      <span className={'poketype-label'}>
        <span>{label}</span>
      </span>
    </span>
  );
};