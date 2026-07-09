// EDITINGNOTE: Reviewed, needs imports and styles, see notes...
// EDITINGNOTE: Move WEATHER_MAP, FIELD_CONDITIONS_MAP, and playerToggleKeys to utilities and import them
// EDITINGNOTE: Check if we need meta, onBlur, and onFocus once SpikesField and Dropdown are built
// EDITINGNOTE: I will need to add certain dirty properties back throughout. From this file, this includes dirtyWeather

import * as React from 'react';
import cx from 'classnames';
import { Dropdown } from './_STUBS.jsx';
import { SpikesField } from './_STUBS.jsx';
import { TableGrid } from './_STUBS.jsx';
import { TableGridItem } from './_STUBS.jsx';
import { ToggleButton } from './_STUBS.jsx';
import { useColorScheme, useToolsContext } from './hooks.js';
import {
  PlayerSideConditionsDexMap,
  formatId,
  formatDexDescription,
  getDexForFormat,
  getWeatherConditions,
} from './utilities.js';
import './main.css';

export const FieldCalc = ({ className, style, authPlayerKey, opponentKey }) => {
  const { state, updateSide, updateField } = useToolsContext();
  const { battleId, containerWidth, format, field } = state;
  const { weather: currentWeather, dirtyWeather } = field || {};
  const weather = (dirtyWeather ?? currentWeather) || null;

  const colorScheme = useColorScheme();

  const dex = getDexForFormat(format);

  const WEATHER_MAP = {
    "hail": {
      "label": "Hail",
      "shortDesc": "For 5 turns, -6% HP (non-Ice)."
    },
    "rain": {
      "label": "Rain",
      "shortDesc": "For 5 turns, Water 1.5×, Fire 0.5×."
    },
    "sand": {
      "label": "Sand",
      "shortDesc": "For 5 turns, -6% HP (non-Ground/Rock/Steel)."
    },
    "sun": {
      "label": "Sun",
      "shortDesc": "For 5 turns, Fire 1.5×, Water 0.5×."
    }
  };

  const weatherTooltip = React.useCallback((option) => {
    if (!option?.value) {
      return null;
    }

    const weatherData = WEATHER_MAP[formatId(option.value)];

    if (!weatherData?.shortDesc) {
      return null;
    }

    return (
      <div className={cx('fieldcalc-tooltipContent', 'fieldcalc-descTooltip')}>
        {weatherData.shortDesc}
      </div>
    );
  }, []);

  const playerToggleKeys = ['spikes', 'isReflect', 'isLightScreen', 'isSeeded'];

  const disabled = !state[authPlayerKey]?.pokemon?.length || !state[opponentKey]?.pokemon?.length;

  const renderPlayerToggles = (pkey) => playerToggleKeys.map((sideKey) => {
    const [dict, toggleId] = PlayerSideConditionsDexMap[sideKey] || [];

    if (!dict || !toggleId) {
      return null;
    }

    const dexToggle = dex[dict]?.get?.(toggleId);

    if (!dexToggle?.exists) {
      return null;
    }

    const currentSide = state[pkey]?.side;
    const active = !!currentSide?.[sideKey];

    const desc = formatDexDescription((dexToggle?.shortDesc || dexToggle?.desc)
        ?.replace("This Pokemon's allies", 'Allies')
    );

    const tooltipContent = desc ? (
      <div className={cx('fieldcalc-tooltipContent', 'fieldcalc-descTooltip')}>
        {
          !!dexToggle.name &&
          <>
            <strong>{dexToggle.name}</strong>
            <br />
          </>
        }
        {desc}
      </div>
    ) : null;

    const toggleKey = `${battleId || '???'}:${pkey}:${toggleId}`;
    const toggleDisabled = disabled || !battleId || !currentSide;

    if (sideKey === 'spikes') {
      return (
        <SpikesField
          key={toggleKey}
          className={'fieldcalc-toggleButton'}
          meta={{}}
          input={{
            name: `${pkey}:${sideKey}`,
            value: currentSide?.spikes || null,
            onChange: (value) => updateSide(pkey, {
              [sideKey]: value || null,
            }),
            onBlur: () => void 0,
            onFocus: () => void 0,
          }}
          togglePrimary
          toggleActive={active}
          disabled={toggleDisabled}
        />
      );
    }

    const FIELD_CONDITIONS_MAP = {
      "spikes": "Spikes",
      "reflect": "Reflect",
      "lightscreen": "Light",
      "leechseed": "Seed",
    };

    return (
      <ToggleButton
        key={toggleKey}
        className={'fieldcalc-toggleButton'}
        label={FIELD_CONDITIONS_MAP[toggleId]}
        tooltip={tooltipContent}
        primary
        active={active}
        disabled={toggleDisabled}
        onPress={() => {
          updateSide(pkey, {
            [sideKey]: !currentSide?.[sideKey],
          });
        }}
      />
    );
  });

  return (
    <TableGrid
      className={cx(
        'fieldcalc-container',
        !!colorScheme && `fieldcalc-${colorScheme}`,
        containerWidth < 380 && 'fieldcalc-slim',
        'fieldcalc-expanded',
        className,
      )}
      style={style}
    >
      {/* table headers */}
      <TableGridItem
        className={cx(
          'fieldcalc-label',
          'fieldcalc-leftFieldLabel',
        )}
        align="left"
        header
      >
        {/* p1 screens header */}
        &uarr; Field
      </TableGridItem>
      <TableGridItem
        className={cx(
          'fieldcalc-label',
          'fieldcalc-dropdownLabel',
          'fieldcalc-weatherLabel',
        )}
        header
      >
        Weather
      </TableGridItem>
      <TableGridItem
        className={cx(
          'fieldcalc-label',
          'fieldcalc-rightFieldLabel',
        )}
        align="right"
        header
      >
        {/* p2 screens header */}
        &darr; Field
      </TableGridItem>

      {/* p1 screens */}
      <TableGridItem
        className={'fieldcalc-leftFieldInput'}
        align="left"
      >
        {renderPlayerToggles(authPlayerKey)}
      </TableGridItem>

      {/* weather */}
      <TableGridItem className={'fieldcalc-weatherInput'}>
        <Dropdown
          style={{ textAlign: 'left' }}
          aria-label="Field Weather"
          hint="None"
          optionTooltip={weatherTooltip}
          meta={{}}
          input={{
            name: `FieldCalc:${battleId || '???'}:Weather:Dropdown`,
            value: weather,
            onChange: (value) => updateField({
              dirtyWeather: value || (currentWeather ? '' : null),
            }),
            onBlur: () => void 0,
            onFocus: () => void 0,
          }}
          options={getWeatherConditions(format).map((name) => ({
            label: WEATHER_MAP[formatId(name)].label,
            value: name,
          }))}
          noOptionsMessage="No Weather"
          highlight={!!weather}
          disabled={disabled || !battleId}
        />
      </TableGridItem>

      {/* opponent's screens */}
      <TableGridItem
        className={'fieldcalc-rightFieldInput'}
        align="right"
      >
        {renderPlayerToggles(opponentKey)}
      </TableGridItem>
    </TableGrid>
  );
};