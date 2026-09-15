// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { determineColorScheme, formatId } from '@gen-3-ou-tools/utilities.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';

const POKEMON_STATUSES = [
  'psn',
  'tox',
  'brn',
  'par',
  'slp',
  'frz',
  '???',
];

const NONVOLATILES = {
  ok: ['OK', 'OK'],
  fnt: ['FAINT', 'FNT'],
  brn: ['BURNED', 'BRN'],
  frz: ['FROZEN', 'FRZ'],
  par: ['PARLYZ', 'PAR'],
  psn: ['POISON', 'PSN'],
  slp: ['ASLEEP', 'SLP'],
  tox: ['TOXIC', 'TOX'],
};

export const PokeStatus = ({
  className,
  status,
  override,
  fainted,
  reverseColorScheme,
  containerSize,
  highlight,
}) => {
  const currentColorScheme = useColorScheme();
  const colorScheme = determineColorScheme(currentColorScheme, reverseColorScheme);

  if (!POKEMON_STATUSES.includes(status) && !fainted && !override) {
    return null;
  }

  const labelIndex = ['xs', 'sm'].includes(containerSize) ? 1 : 0;

  const label = (fainted && 'FNT') ||
    override ||
    (status !== '???' && (NONVOLATILES[formatId(status)]?.[labelIndex] || status)) ||
    '???';

  return (
    <span
      className={cx(
        'pokestatus-container',
        !!colorScheme && `pokestatus-${colorScheme}`,
        !fainted && !override && `pokestatus-status-${status.toLowerCase()}`,
        fainted && 'pokestatus-status-fnt',
        highlight && 'pokestatus-highlight',
        labelIndex === 1 && 'pokestatus-small',
        className,
      )}
    >
      <span className={'pokestatus-label'}>
        {label}
      </span>
    </span>
  );
};