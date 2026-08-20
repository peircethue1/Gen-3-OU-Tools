// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { ItemIcon } from './ItemIcon.jsx';
import '@gen-3-ou-tools/main.css';

export const Picon = ({ className, pokemon }) => {
  const css = Dex?.getPokemonIcon((pokemon) || 'pokeball-none').split(';')[0];
  const background = css?.replace(/^background:/, '');

  const item = (typeof pokemon !== 'string' && pokemon?.item) || null;

  return (
    <div
      className={cx('picon-container', className)}
      style={{ background }}
    >
      {
        !!item &&
        <ItemIcon
          className={'picon-itemIcon'}
          item={item}
        />
      }
    </div>
  );
};