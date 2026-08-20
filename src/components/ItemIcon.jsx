// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import '@gen-3-ou-tools/main.css';

export const ItemIcon = ({ className, item }) => {
  const css = item ? Dex?.getItemIcon(item) : null;
  const background = css?.replace(/^background:/, '');

  return (
    <div
      className={cx('itemicon-container', className)}
      style={{ background }}
    />
  );
};