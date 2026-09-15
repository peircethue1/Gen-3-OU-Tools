// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { BaseButton } from './BaseButton.jsx';

export const Button = ({
  className,
  labelClassName,
  label,
  suffix,
  absoluteHover,
  disabled,
  ...props
}) => {
  const colorScheme = useColorScheme();

  return (
    <BaseButton
      {...props}
      className={cx(
        'button-container',
        !!colorScheme && `button-${colorScheme}`,
        absoluteHover && 'button-absoluteHover',
        disabled && 'button-disabled',
        className,
      )}
      aria-label={label}
      disabled={disabled}
    >
      {
        !!label &&
        <span className={cx('button-label', labelClassName)}>
          {label}
        </span>
      }

      {suffix}
    </BaseButton>
  );
};