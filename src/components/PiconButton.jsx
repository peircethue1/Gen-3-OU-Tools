// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { BaseButton } from './BaseButton.jsx';
import { Picon } from './Picon.jsx';
import { Tooltip } from './Tooltip.jsx';

export const PiconButton = ({
  className,
  piconClassName,
  pokemon,
  tooltip,
  tooltipPlacement,
  tooltipOffset,
  tooltipDelay = [150, 50],
  tooltipTrigger = 'mouseenter',
  tooltipTouch = ['hold', 500],
  activeScale = 0.95,
  disabled,
  children,
  ...props
}) => {
  const ref = React.useRef(null);

  const colorScheme = useColorScheme();

  return (
    <>
      <BaseButton
        ref={ref}
        {...props}
        className={cx(
          'piconbutton-container',
          !!colorScheme && `piconbutton-${colorScheme}`,
          className,
        )}
        activeScale={activeScale}
        disabled={disabled}
      >
        <Picon
          className={cx(
            'piconbutton-picon',
            piconClassName,
          )}
          pokemon={pokemon}
        />

        {children}
      </BaseButton>

      <Tooltip
        reference={ref.current}
        content={tooltip}
        placement={tooltipPlacement}
        offset={tooltipOffset}
        delay={tooltipDelay}
        trigger={tooltipTrigger}
        touch={tooltipTouch}
        disabled={!tooltip || disabled}
      />
    </>
  );
};