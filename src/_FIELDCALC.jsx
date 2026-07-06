import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import cx from 'classnames';
import { Dropdown, SpikesField } from '@showdex/components/form';
import { TableGrid, TableGridItem } from '@showdex/components/layout';
import { ToggleButton } from '@showdex/components/ui';
import { times } from '@showdex/consts/core';
import { PlayerSideConditionsDexMap, TerrainNames } from '@showdex/consts/dex';
import { useColorScheme } from '@showdex/redux/store';
import { formatId } from '@showdex/utils/core';
import { logger } from '@showdex/utils/debug';
import { formatDexDescription, getDexForFormat, getWeatherConditions } from '@showdex/utils/dex';
import { useCalcdexContext } from '../CalcdexContext';
import styles from './FieldCalc.module.scss';

export const FieldCalc = ({
  className,
  style,
  playerKey = 'p1',
  opponentKey = 'p2',
}) => {
  const {
    state,
    settings,
    updateSide,
    updateField,
  } = useCalcdexContext();

  const {
    operatingMode,
    battleId,
    // containerSize,
    containerWidth,
    gen,
    format,
    legacy,
    authPlayerKey,
    field,
  } = state;

  const {
    weather: currentWeather,
    autoWeather,
    dirtyWeather,
    terrain: currentTerrain,
    autoTerrain,
    dirtyTerrain,
  } = field || {};

  const weather = (dirtyWeather ?? (currentWeather || autoWeather)) || null;
  const terrain = (dirtyTerrain ?? (currentTerrain || autoTerrain)) || null;

  const showResetWeather = !!currentWeather
    && (!!dirtyWeather || typeof dirtyWeather === 'string')
    && currentWeather !== dirtyWeather;

  const showResetTerrain = !!currentTerrain
      && (!!dirtyTerrain || typeof dirtyTerrain === 'string')
      && currentTerrain !== dirtyTerrain;

  const colorScheme = useColorScheme();
  const dex = getDexForFormat(format);

  const weatherTooltip = React.useCallback((option) => {
    if (!option?.value || !settings?.showFieldTooltips) {
      return null;
    }

    return (
      <Trans
        t={t}
        i18nKey={`pokedex:weather.${formatId(option.value)}.shortDesc`}
        parent="div"
        className={cx(styles.tooltipContent, styles.descTooltip)}
        shouldUnescape
        values={{ times }}
      />
    );
  }, [
    settings,
    t,
  ]);

  const terrainTooltip = React.useCallback((option) => {
    if (!option?.value || !settings?.showFieldTooltips) {
      return null;
    }

    return (
      <Trans
        t={t}
        i18nKey={`pokedex:terrain.${formatId(option.value)}.shortDesc`}
        parent="div"
        className={cx(styles.tooltipContent, styles.descTooltip)}
        shouldUnescape
        values={{ times }}
      />
    );
  }, [
    settings,
    t,
  ]);

  const doubles = state?.gameType === 'Doubles';
  const natdexFormat = ['nationaldex', 'natdex'].some((f) => format?.includes(f));
  const expandedFieldControls = !legacy && (settings?.expandFieldControls || operatingMode === 'standalone');

  const playerToggleKeys = React.useMemo(() => {
    const output = [
      'isLightScreen',
      'isReflect',
      'isAuroraVeil',
    ];

    if (expandedFieldControls) {
      output.push('isGravity', 'isSeeded', 'isSR', 'spikes');
    }

    return output;
  }, [
    doubles,
    expandedFieldControls,
    gen,
    natdexFormat,
  ]);

  const disabled = !state[playerKey]?.pokemon?.length
    || !state[opponentKey]?.pokemon?.length;

  const renderPlayerToggles = (pkey) => playerToggleKeys.map((sideKey) => {
    const [dict, toggleId] = PlayerSideConditionsDexMap[sideKey] || [];

    if (!dict || !toggleId) {
      return null;
    }

    const dexToggle = dex[dict]?.get?.(toggleId);

    if (!dexToggle?.exists || gen < (dexToggle.gen || 0)) {
      return null;
    }

    const currentSide = state[pkey]?.side;
    const active = sideKey === 'isGravity' ? field?.isGravity : !!currentSide?.[sideKey];

    const desc = settings?.showFieldTooltips ? formatDexDescription(
      (dexToggle?.shortDesc || dexToggle?.desc)
        ?.replace("This Pokemon's allies", 'Allies'),
    ) : null;

    const tooltipContent = desc ? (
      <div className={cx(styles.tooltipContent, styles.descTooltip)}>
        {
          !!dexToggle.name &&
          <>
            <strong>{t(`pokedex:${dict}.${toggleId}`, dexToggle.name)}</strong>
            <br />
          </>
        }
        {desc}
      </div>
    ) : null;

    const toggleKey = `${l.scope}:${battleId || '???'}:${pkey}:${toggleId}`;
    const toggleDisabled = disabled || !battleId || !currentSide;

    if (sideKey === 'spikes') {
      return (
        <SpikesField
          key={toggleKey}
          className={styles.toggleButton}
          // headerPrefix={tooltipContent}
          meta={{}}
          input={{
            name: `${l.scope}:${pkey}:${sideKey}`,
            value: currentSide?.spikes || null,
            onChange: (value) => updateSide(pkey, {
              [sideKey]: value || null,
            }, `${l.scope}:${pkey}:SpikesField~${sideKey}:input.onChange()`),
            onBlur: () => void 0,
            onFocus: () => void 0,
          }}
          togglePrimary
          toggleActive={active}
          disabled={toggleDisabled}
        />
      );
    }

    return (
      <ToggleButton
        key={toggleKey}
        className={styles.toggleButton}
        label={t(`field.conditions.${toggleId}`)}
        tooltip={tooltipContent}
        primary
        active={active}
        disabled={toggleDisabled}
        onPress={() => {
          const scope = `${l.scope}:${pkey}:ToggleButton~${sideKey}:onPress()`;

          if (sideKey === 'isGravity') {
            return void updateField({
              [sideKey]: !field?.[sideKey],
            }, scope);
          }

          updateSide(pkey, {
            [sideKey]: !currentSide?.[sideKey],
          }, scope);
        }}
      />
    );
  });

  return (
    <TableGrid
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        // containerSize === 'xs' && styles.verySmol,
        containerWidth < 380 && styles.skinnyBoi,
        (playerToggleKeys.length > 4 || expandedFieldControls || doubles) && styles.expanded,
        className,
      )}
      style={style}
    >
      {/* table headers */}
      <TableGridItem
        className={cx(
          styles.label,
          styles.leftFieldLabel,
          !authPlayerKey && styles.spectating,
        )}
        align="left"
        header
      >
        {/* p1 screens header */}
        {expandedFieldControls || doubles ? (
          <>
            &uarr;{' '}
            {t('field.field', 'Field')}
          </>
        ) : authPlayerKey ? t(
          `field.${authPlayerKey === playerKey ? 'yours' : 'theirs'}`,
          authPlayerKey === playerKey ? 'Yours' : 'Theirs',
        ) : (
          <>
            &uarr;{' '}
            {t('field.screens', 'Screens')}
          </>
        )}
      </TableGridItem>
      <TableGridItem
        className={cx(
          styles.label,
          styles.dropdownLabel,
          styles.weatherLabel,
          gen === 1 && styles.legacy,
        )}
        header
      >
        {t('field.weather.label', 'Weather')}

        {
          showResetWeather &&
          <ToggleButton
            className={styles.labelToggleButton}
            label={t('field.weather.resetLabel', 'Reset')}
            tooltip={(
              <Trans
                t={t}
                i18nKey="field.weather.resetTooltip"
                parent="div"
                className={styles.tooltipContent}
                shouldUnescape
                values={{ weather }}
              />
            )}
            tooltipDisabled={!settings?.showUiTooltips}
            absoluteHover
            active
            onPress={() => updateField({
              dirtyWeather: null,
            }, `${l.scope}:ToggleButton~DirtyWeather:onPress()`)}
          />
        }
      </TableGridItem>
      <TableGridItem
        className={cx(
          styles.label,
          styles.dropdownLabel,
          styles.terrainLabel,
          gen < 6 && styles.legacy,
        )}
        header
      >
        {t('field.terrain.label', 'Terrain')}

        {
          showResetTerrain &&
          <ToggleButton
            className={styles.labelToggleButton}
            label={t('field.terrain.resetLabel', 'Reset')}
            tooltip={(
              <Trans
                t={t}
                i18nKey="field.terrain.resetTooltip"
                parent="div"
                className={styles.tooltipContent}
                shouldUnescape
                values={{ terrain }}
              />
            )}
            tooltipDisabled={!settings?.showUiTooltips}
            absoluteHover
            active
            onPress={() => updateField({
              dirtyTerrain: null,
            }, `${l.scope}:ToggleButton~DirtyTerrain:onPress()`)}
          />
        }
      </TableGridItem>
      <TableGridItem
        className={cx(
          styles.label,
          styles.rightFieldLabel,
          !authPlayerKey && styles.spectating,
        )}
        align="right"
        header
      >
        {/* p2 screens header */}
        {expandedFieldControls || doubles ? (
          <>
            &darr;{' '}
            {t('field.field', 'Field')}
          </>
        ) : authPlayerKey ? t(
          `field.${authPlayerKey === playerKey ? 'theirs' : 'yours'}`,
          authPlayerKey === playerKey ? 'Theirs' : 'Yours',
        ) : (
          <>
            &darr;{' '}
            {t('field.screens', 'Screens')}
          </>
        )}
      </TableGridItem>

      {/* p1 screens */}
      <TableGridItem
        className={styles.leftFieldInput}
        align="left"
      >
        {renderPlayerToggles(playerKey)}
      </TableGridItem>

      {/* weather */}
      <TableGridItem className={styles.weatherInput}>
        <Dropdown
          style={{ textAlign: 'left' }}
          aria-label={t('field.weather.aria')}
          hint={t(`field.weather.${gen === 1 ? 'legacyH' : 'h'}int`)}
          optionTooltip={weatherTooltip}
          optionTooltipProps={{ hidden: !settings?.showFieldTooltips }}
          meta={{}}
          input={{
            name: `FieldCalc:${battleId || '???'}:Weather:Dropdown`,
            value: weather,
            onChange: (value) => updateField({
              dirtyWeather: value || (autoWeather || currentWeather ? '' : null),
            }, `${l.scope}:Dropdown~Weather:input.onChange()`),
            onBlur: () => void 0,
            onFocus: () => void 0,
          }}
          options={getWeatherConditions(format).map((name) => ({
            label: t(`pokedex:weather.${formatId(name)}.label`, name),
            value: name,
          }))}
          noOptionsMessage={t('field.weather.empty')}
          highlight={!!weather}
          disabled={disabled || !battleId || gen === 1}
        />
      </TableGridItem>

      {/* terrain */}
      <TableGridItem className={styles.terrainInput}>
        <Dropdown
          style={{ textAlign: 'left' }}
          aria-label={t('field.terrain.aria')}
          hint={t(`field.terrain.${gen < 6 ? 'legacyH' : 'h'}int`)}
          optionTooltip={terrainTooltip}
          optionTooltipProps={{ hidden: !settings?.showFieldTooltips }}
          meta={{}}
          input={{
            name: `FieldCalc:${battleId || '???'}:Terrain:Dropdown`,
            value: terrain,
            onChange: (value) => updateField({
              dirtyTerrain: value || (autoTerrain || currentTerrain ? '' : null),
            }, `${l.scope}:Dropdown~Terrain:input.onChange()`),
            onBlur: () => void 0,
            onFocus: () => void 0,
          }}
          options={TerrainNames.map((name) => ({
            label: t(`pokedex:terrain.${formatId(name)}.label`, name),
            value: name,
          }))}
          noOptionsMessage={t('field.terrain.empty')}
          highlight={!!terrain}
          disabled={disabled || !battleId || gen < 6}
        />
      </TableGridItem>

      {/* opponent's screens */}
      <TableGridItem
        className={styles.rightFieldInput}
        align="right"
      >
        {renderPlayerToggles(opponentKey)}
      </TableGridItem>
    </TableGrid>
  );
};