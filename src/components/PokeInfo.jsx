// EDITINGNOTE: Building, see notes... consider moving empty react dependencies to consts, ability and item need to be differentiated between base and present

import * as React from 'react';
import cx from 'classnames';
import { useToolsPokeContext, useRandomUuid, useSandwich } from '@gen-3-ou-tools/hooks.js';//38, 50, 114
import {
  calcPokemonHpPercentage,
  buildAbilityOptions,
  toggleableAbility,
  PokemonCommonNatures,
  PokemonNatureBoosts,
  buildItemOptions,
} from '@gen-3-ou-tools/utilities.js';//54, 62, 81, 83, 85, 92
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';//48
import { PiconButton } from './PiconButton.jsx';//154
import { openSmogonDex } from '';//167 do i actually want this feature in my extension?
import { PokeFormeTooltip } from '';//181
import { Button } from './Button.jsx';//187
import { PokeTypeField } from '';//221
import { PokeHpBar } from '';//245
import { PokeStatusTooltip } from '';//250
import { BaseButton } from './BaseButton.jsx';//257
import { PokeStatus } from './PokeStatus.jsx';//274
import { ToggleButton } from '';//306
import { Dropdown } from '';//326
import { PokeAbilityOptionTooltip } from '';//329
import { PokeItemOptionTooltip } from '';//387

export const PokeInfo = ({ className }) => {
  const {
    state,
    playerPokemon: pokemon,
    usage,
    abilityUsageFinder,
    abilityUsageSorter,
    itemUsageFinder,
    itemUsageSorter,
    updatePokemon,
  } = useToolsPokeContext();

  const {
    containerSize,
    containerWidth,
    gen,
    format,
    gameType,
  } = state;

  const colorScheme = useColorScheme();

  const randomUuid = useRandomUuid();
  const pokemonKey = pokemon?.toolsId || pokemon?.name || randomUuid;
  const friendlyPokemonName = pokemon?.speciesForme || pokemon?.name || pokemonKey;

  const hpPercentage = calcPokemonHpPercentage(pokemon);

  const abilityToggled = pokemon?.dirtyAbilityToggled ?? pokemon?.abilityToggled;

  const baseAbilityName = pokemon?.dirtyBaseAbility ?? pokemon?.baseAbility;

  const baseItemName = pokemon?.dirtyBaseItem ?? pokemon?.baseItem;

  const baseAbilityOptions = React.useMemo(() => buildAbilityOptions(
    pokemon,
    {
      usage: usage?.abilities,
      usageFinder: abilityUsageFinder,
      usageSorter: abilityUsageSorter,
      showAll: false,
    },
  ), [
    abilityUsageFinder,
    abilityUsageSorter,
    pokemon,
    usage?.abilities,
  ]);

  const showAbilityToggle = React.useMemo(() => toggleableAbility(pokemon, gameType), [gameType, pokemon]);

  const natureOptions = React.useMemo(() => PokemonCommonNatures.map((name) => ({//editingnote: nature or spread?
    label: name,
    rightLabel: PokemonNatureBoosts[name]?.length ? [
      !!PokemonNatureBoosts[name][0] && `+${PokemonNatureBoosts[name][0].toUpperCase()}`,
      !!PokemonNatureBoosts[name][1] && `-${PokemonNatureBoosts[name][1].toUpperCase()}`,
    ].filter(Boolean).join(' ') : 'Neutral',
    value: name,
  })), []);

  const baseItemOptions = React.useMemo(() => buildItemOptions(
    pokemon,
    {
      usage: usage?.items,
      usageFinder: itemUsageFinder,
      usageSorter: itemUsageSorter,
      showAll: false,
    },
  ), [
    format,
    itemUsageFinder,
    itemUsageSorter,
    pokemon,
    usage?.items,
  ]);

  const {
    active: formesVisible,
    requestOpen: openFormesTooltip,
    notifyClose: closeFormesTooltip,
  } = useSandwich();

  const toggleFormesTooltip = formesVisible ? closeFormesTooltip : openFormesTooltip;

  const {
    active: statusVisible,
    requestOpen: openStatusTooltip,
    notifyClose: closeStatusTooltip,
  } = useSandwich();

  const toggleStatusTooltip = statusVisible ? closeStatusTooltip : openStatusTooltip;

  const smogonPageTooltip = (
    <div className={styles.tooltipContent}>
      Open Smogon Page for<br /><strong>{pokemon?.speciesForme || 'MissingNo.'}</strong>
    </div>
  );

  const formeDisabled = (pokemon?.altFormes?.length || 0) < 2;// EDITINGNOTE: need to add altformes to pokemon

  const showNonVolatileStatus = !!pokemon?.speciesForme && (
    !!pokemon.dirtyStatus || !!pokemon.status || !pokemon.hp
  );

  const currentStatus = pokemon?.speciesForme && showNonVolatileStatus
    ? (pokemon.dirtyStatus ?? pokemon.status)
    : null;

  return (
    <div
      className={cx(
        styles.container,
        containerSize === 'xs' && styles.extraSmall,
        ['md', 'lg', 'xl'].includes(containerSize) && styles.large,
        !!colorScheme && styles[colorScheme],
        className,
      )}
    >
      <div className={styles.row}>
        <div className={styles.piconContainer}>
          <PiconButton
            piconStyle={{
              ...(!!pokemon?.name && { transform: 'scaleX(-1)' }),
              ...(!pokemon?.speciesForme && { opacity: 0.32 }),
            }}
            pokemon={{
              speciesForme: pokemon?.transformedForme || pokemon?.speciesForme,
              item: baseItemName,//EDITINGNOTE: this should be itemname, not base
            }}
            tooltip={smogonPageTooltip}
            tooltipDelay={[1000, 50]}
            shadow
            disabled={!pokemon?.speciesForme}
            onPress={() => openSmogonDex(
              gen,
              'pokemon',
              pokemon?.speciesForme,
              format,
            )}
          />
        </div>

        <div className={styles.infoContainer}>
          <div
            className={styles.firstLine}
          >
            {(
              <PokeFormeTooltip
                pokemon={pokemon}
                visible={formesVisible}
                onPokemonChange={(pokemon) => updatePokemon(pokemon)}
                onRequestClose={closeFormesTooltip}
              >
                <Button
                  className={cx(
                    styles.nameButton,
                    !pokemon?.speciesForme && styles.missingForme,
                    !formeDisabled && styles.withFormes,
                    formeDisabled && styles.disabled,
                  )}
                  labelClassName={styles.nameLabel}
                  label={pokemon?.speciesForme || 'MissingNo.'}
                  suffix={!formeDisabled && (
                    <i
                      className={cx(
                        'fa',
                        'fa-chevron-down',
                        styles.formeChevron,
                        formesVisible && styles.open,
                      )}
                    />
                  )}
                  disabled={formeDisabled}
                  onPress={toggleFormesTooltip}
                />
              </PokeFormeTooltip>
            )}

            {
              (!!pokemon?.level && pokemon.level !== 100) &&
              <div className={styles.level}>
                <div className={styles.dim}>
                  {'L'}{pokemon.level}
                </div>
              </div>
            }

            <PokeTypeField
              className={styles.typesField}
              label={`Types for ${friendlyPokemonName}`}
              multi
              meta={{}}
              input={{
                name: `${pokemonKey}:Types`,
                value: [...(pokemon?.dirtyTypes || [])],
                onChange: (types) => updatePokemon({
                  dirtyTypes: [...(types || [])],
                }),
                onBlur: () => { },
                onFocus: () => { },
              }}
              tooltipPlacement="bottom-start"
              containerSize={containerWidth < 360 ? containerSize : null}
              highlight={gen < 9}
              highlightTypes={pokemon?.types}
              revealedTypes={pokemon?.types}
              disabled={!pokemon?.speciesForme}
            />
          </div>

          <div className={styles.secondLine}>
            <PokeHpBar
              hp={hpPercentage}
              width={100}
            />

            <PokeStatusTooltip
              pokemon={pokemon}
              visible={statusVisible}
              disabled={!pokemon?.speciesForme}
              onPokemonChange={(pokemon) => updatePokemon(pokemon)}
              onRequestClose={closeStatusTooltip}
            >
              <BaseButton
                className={styles.statusButton}
                display="block"
                aria-label={`HP & Non-Volatile Status Condition for ${friendlyPokemonName}`}
                onPress={toggleStatusTooltip}
                disabled={!pokemon?.speciesForme}
              >
                {
                  hpPercentage > 0 &&
                  <div className={styles.hpPercentage}>
                    {Math.round(hpPercentage * 100)}%
                  </div>
                }

                {
                  showNonVolatileStatus &&
                  <div className={styles.statuses}>
                    <PokeStatus
                      className={cx(
                        styles.status,
                        !pokemon?.speciesForme && styles.disabled,
                      )}
                      status={currentStatus}
                      fainted={!hpPercentage}
                      highlight
                      containerSize={containerSize}
                    />
                  </div>
                }
              </BaseButton>
            </PokeStatusTooltip>
          </div>
        </div>
      </div>

      {
        gen > 1 &&
        <div className={styles.row}>
          <div className={styles.rowItem}>
            <div
              className={cx(
                styles.label,
                styles.dropdownLabel,
              )}
            >
              {'Base Ability'}

              {//EDITINGNOTE: this whole abilitytoggle applies to the ability, not base ability, and should be put there instead, and base shoul dbe removed
                showAbilityToggle &&
                <ToggleButton
                  className={styles.toggleButton}
                  label="Active"
                  tooltip={(
                    <div className={styles.tooltipContent}>
                      {abilityToggled
                        ? <>Deactivate <strong>{baseAbilityName || 'Ability'}</strong></>
                        : <>Activate <strong>{baseAbilityName || 'Ability'}</strong></>
                      }
                    </div>
                  )}
                  absoluteHover
                  active={abilityToggled}
                  onPress={() => updatePokemon({
                    dirtyAbilityToggled: !abilityToggled,
                  })}
                />
              }
            </div>

            <Dropdown
              aria-label={`Available Abilities for ${friendlyPokemonName}`}
              hint="???"
              optionTooltip={PokeAbilityOptionTooltip}
              optionTooltipProps={{ format }}
              meta={{}}
              input={{
                name: `${pokemonKey}:Ability`,
                value: baseAbilityName,
                onChange: (value) => updatePokemon({
                  dirtyBaseAbility: value,
                }),
                onBlur: () => { },
                onFocus: () => { },
              }}
              options={baseAbilityOptions}
              noOptionsMessage="No Abilities"
              clearable={false}
              highlight={abilityToggled}
              disabled={!pokemon?.speciesForme}
            />
          </div>

          <div className={styles.rowItem}>
            <div
              className={cx(styles.label, styles.dropdownLabel)}
            >
              {'Nature'}
            </div>

            <Dropdown
              aria-label={`Available Natures for ${friendlyPokemonName}`}
              hint="???"
              meta={{}}
              input={{
                name: `${pokemonKey}:Nature`,
                value: pokemon?.nature,
                onChange: (name) => updatePokemon(
                  { nature: name },//EDITINGNOTE: how are we implementing manual nature selections, dirtynature?
                ),
                onBlur: () => { },
                onFocus: () => { },
              }}
              options={natureOptions}
              noOptionsMessage="No Natures"
              clearable={false}
              disabled={!pokemon?.speciesForme}
            />
          </div>

          <div className={styles.rowItem}>
            <div
              className={cx(styles.label, styles.dropdownLabel)}
            >
              {'Base Item'}
            </div>

            <Dropdown
              aria-label={`Available Items for ${friendlyPokemonName}`}
              hint="None"
              meta={{}}
              optionTooltip={PokeItemOptionTooltip}
              optionTooltipProps={{ format }}
              input={{
                name: `${pokemonKey}:Item`,
                value: baseItemName,
                onChange: (name) => updatePokemon({
                  dirtyBaseItem: name ?? (''),
                }),
                onBlur: () => { },
                onFocus: () => { },
              }}
              options={baseItemOptions}
              noOptionsMessage="No Items"
              disabled={!pokemon?.speciesForme}
            />
          </div>
        </div>
      }
    </div>
  );
};