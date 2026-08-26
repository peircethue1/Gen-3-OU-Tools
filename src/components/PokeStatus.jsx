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
  ok: 'OK',
  fnt: 'FNT',
  brn: 'BRN',
  frz: 'FRZ',
  par: 'PAR',
  psn: 'PSN',
  slp: 'SLP',
  tox: 'TOX',
};

export const PokeStatus = ({
  className,
  status,
  override,
  fainted,
  reverseColorScheme,
  highlight,
}) => {
  const currentColorScheme = useColorScheme();
  const colorScheme = determineColorScheme(currentColorScheme, reverseColorScheme);

  const statusId = formatId(status);

  if (!POKEMON_STATUSES.includes(statusId) && !fainted && !override) {
    return null;
  }

  const label = (fainted && 'FNT') ||
    override ||
    NONVOLATILES[statusId] ||
    status ||
    '???';

  return (
    <span
      className={cx(
        'pokestatus-container',
        !!colorScheme && `pokestatus-${colorScheme}`,
        !fainted && !override && `pokestatus-status-${statusId}`,
        fainted && 'pokestatus-status-fnt',
        highlight && 'pokestatus-highlight',
        className,
      )}
    >
      <span className={'pokestatus-label'}>
        {label}
      </span>
    </span>
  );
};