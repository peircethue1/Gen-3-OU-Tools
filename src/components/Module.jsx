// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { animated } from '@react-spring/web';
import cx from 'classnames';

export const Module = React.forwardRef(({
  className,
  style,
  w = 1,
  h = 1,
  children,
  ...props
}, forwardedRef) => (
  <animated.div
    ref={forwardedRef}
    {...props}
    className={cx('module-container', className)}
    style={{
      ...style,
      gridArea: `span ${h} / span ${w}`,
    }}
  >
    {children}
  </animated.div>
));