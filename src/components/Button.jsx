// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { BaseButton } from './BaseButton.jsx';
import { Tooltip } from './Tooltip.jsx';

export const Button = ({
  className,
  labelClassName,
  label,
  tooltipPlacement = 'top',
  tooltipOffset = [0, 10],
  tooltipDelay = [1000, 50],
  tooltipTrigger = 'mouseenter',
  absoluteHover,
  disabled,
}) => {
  const ref = React.useRef(null);

  const colorScheme = useColorScheme();

  return (
    <>
      <BaseButton
        ref={ref}
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
      </BaseButton>

      <Tooltip
        reference={ref}
        placement={tooltipPlacement}
        offset={tooltipOffset}
        delay={tooltipDelay}
        trigger={tooltipTrigger}
        disabled={disabled}
      />
    </>
  );
};