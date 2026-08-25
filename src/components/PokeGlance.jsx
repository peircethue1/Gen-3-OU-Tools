// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import {
  determineColorScheme,
  getDexForFormat,
  calcPokemonHpPercentage,
  nonEmptyObject,
  formatId,
} from '@gen-3-ou-tools/utilities.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { Badge } from './+STUBS.jsx';
import { CircularBar } from './+STUBS.jsx';
import { Picon } from './Picon.jsx';
import { PokeStatus } from './+STUBS.jsx';
import { PokeType } from './+STUBS.jsx';
import { ItemIcon } from './ItemIcon.jsx';

const EFFECTS = {
  consumed: 'Consumed',
  eaten: 'Eaten',
  knockedoff: 'Knocked Off',
  stolen: 'Stolen',
  tricked: 'Tricked',
};

export const PokeGlance = ({
  className,
  pokemon,
  format,
  showAbility,
  showItem,
  showStatus,
  reverseColorScheme,
}) => {
  const currentColorScheme = useColorScheme();
  const colorScheme = determineColorScheme(currentColorScheme, reverseColorScheme);

  const dex = getDexForFormat(format);

  const {
    active,
    speciesForme,
    level,
    types: currentTypes,
    dirtyTypes,
    abilities: currentAbilities,
    ability: revealedAbility,
    dirtyAbility,
    abilityToggled,
    item: revealedItem,
    itemEffect,
    dirtyItem,
    prevItem,
    prevItemEffect,
    status: currentStatus,
    dirtyStatus,
  } = pokemon || {};

  const hpPercentage = calcPokemonHpPercentage(pokemon);
  const status = dirtyStatus || currentStatus || 'ok';
  const ability = (showAbility && (dirtyAbility || revealedAbility)) || null;
  const item = (showItem && (dirtyItem ?? revealedItem)) || null;

  const {
    id,
    baseSpecies,
    forme,
    types: typesFromDex,
    abilities: abilitiesFromDex,
  } = dex?.species.get(speciesForme) || {};

  const types = (!!dirtyTypes?.length && dirtyTypes) ||
    (!!currentTypes?.length && currentTypes) ||
    (!!typesFromDex?.length && typesFromDex) ||
    [];

  const abilities = (
    (!!currentAbilities?.length && currentAbilities) ||
    (nonEmptyObject(abilitiesFromDex) && Object.values(abilitiesFromDex)) ||
    []
  ).filter((ability) => !!ability && formatId(ability) !== 'noability');

  const shouldShowAbility = showAbility && !!(ability || abilities.length);
  const shouldShowItem = showItem && !!prevItem;

  const activeBadgeRef = React.useRef(null);

  React.useEffect(() => {
    activeBadgeRef.current?.[active ? 'show' : 'hide']();
  }, [active]);

  return (
    <div
      className={cx(
        'pokeglance-container',
        active && 'pokeglance-pokemonActive',
        showStatus && 'pokeglance-withStatus',
        !!colorScheme && `pokeglance-${colorScheme}`,
        className,
      )}
    >
      <Badge
        ref={activeBadgeRef}
        className={'pokeglance-activeBadge'}
        label="Active"
        color="blue"
        duration={0}
      />

      <div className={'pokeglance-top'}>
        <div className={'pokeglance-picon'}>
          {
            (showStatus && !!hpPercentage && (hpPercentage !== 1)) &&
            <CircularBar
              className={'pokeglance-circularHp'}
              value={hpPercentage}
            />
          }

          <Picon
            pokemon={{
              speciesForme,
              item: (!itemEffect && item) || null,
            }}
          />
        </div>

        <div className={'pokeglance-details'}>
          <div className={'pokeglance-detailsRow pokeglance-name'}>
            {
              (showStatus && (status !== 'ok' || !hpPercentage || hpPercentage !== 1)) &&
              <PokeStatus
                className={'pokeglance-status'}
                containerSize="xs"
                status={status === 'ok' ? undefined : status}
                override={status === 'ok' ? `${Math.round(hpPercentage * 100)}%` : undefined}
                fainted={!hpPercentage}
                highlight
                reverseColorScheme={reverseColorScheme}
              />
            }

            <div className={'pokeglance-species'}>
              {baseSpecies}
            </div>

            {
              !!forme &&
              <div className={'pokeglance-forme'}>
                &ndash;{forme}
              </div>
            }

            {
              (!!level && level !== 100) &&
              <div className={'pokeglance-level'}>
                L{level}
              </div>
            }
          </div>

          <div className={'pokeglance-detailsRow pokeglance-spaced'}>
            {
              !!types.length &&
              <div className={'pokeglance-types'}>
                {types.map((type) => (
                  <PokeType
                    key={`PokeGlanceContent:${id}:PokeType:${type}`}
                    className={'pokeglance-type'}
                    containerSize="xl"
                    type={type}
                    highlight
                    reverseColorScheme={reverseColorScheme}
                  />
                ))}
              </div>
            }
          </div>
        </div>
      </div>

      {
        (shouldShowAbility || shouldShowItem) &&
        <div className={'pokeglance-specs'}>
          {
            !!ability &&
            <>
              <div className={cx('pokeglance-specName', abilityToggled && 'pokeglance-active')}>
                {abilityToggled ? 'Active' : 'Ability'}
              </div>

              <div className={cx('pokeglance-specValues', abilityToggled && 'pokeglance-active')}>
                {ability}
              </div>
            </>
          }

          {
            (shouldShowAbility && !ability) &&
            <>
              <div className={'pokeglance-specName'}>
                {abilities.length > 1 ? 'Abilities' : 'Ability'}
              </div>

              <div className={'pokeglance-specValues'}>
                <div>
                  {abilities.map((ability) => (
                    <div key={`PokeGlanceContent:${id}:Abilities:${ability}`}>
                      {ability}
                    </div>
                  ))}
                </div>
              </div>
            </>
          }

          {
            (!!item && !!itemEffect) &&
            <>
              <div className={'pokeglance-specName pokeglance-centered'}>
                {EFFECTS[formatId(itemEffect)] || itemEffect}
              </div>

              <div className={'pokeglance-specValues'}>
                <ItemIcon item={item} />
                <span>{item}</span>
              </div>
            </>
          }

          {
            (showItem && !!prevItem) &&
            <>
              <div className={'pokeglance-specName pokeglance-centered'}>
                {EFFECTS[formatId(prevItemEffect)] || prevItemEffect || 'Previous'}
              </div>

              <div className={'pokeglance-specValues pokeglance-prev'}>
                <ItemIcon item={prevItem} />
                <span>{prevItem}</span>
              </div>
            </>
          }
        </div>
      }
    </div>
  );
};