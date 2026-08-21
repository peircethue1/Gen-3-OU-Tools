// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useGesture } from '@use-gesture/react';
import cx from 'classnames';

export const BaseButton = React.forwardRef(({
  className,
  tabIndex = 0,
  initScale = 1,
  activeScale,
  disabled,
  children,
  onPress,
  ...props
}, forwardedRef) => {
  const ref = React.useRef(null);

  React.useImperativeHandle(
    forwardedRef,
    () => ref.current,
  );

  const [{ scale }, springApi] = useSpring(() => ({
    scale: initScale,
    config: {
      mass: 1,
      tension: 200,
      friction: 8,
    },
  }));

  useGesture({
    onDrag: ({ active }) => (springApi.start({ scale: active ? activeScale : initScale })),
  }, {
    target: ref,
    eventOptions: { passive: true },
    enabled: !disabled,
  });

  const handleClick = (!disabled && onPress) || null;

  return (
    <animated.button
      ref={ref}
      {...props}
      tabIndex={disabled ? -1 : tabIndex}
      className={cx(
        'basebutton-container',
        disabled && 'basebutton-disabled',
        className,
      )}
      disabled={disabled}
      style={{ scale }}
      {...(typeof handleClick === 'function' && { onClick: handleClick })}
    >
      {children}
    </animated.button>
  );
});