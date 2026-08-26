// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';

export const Badge = React.forwardRef(({
  className,
  label,
  color,
  duration,
}, forwardedRef) => {
  const visibleTimeout = React.useRef(null);

  const [visible, setVisible] = React.useState(false);

  React.useImperativeHandle(forwardedRef, () => ({
    show: () => {
      if (visibleTimeout.current) {
        clearTimeout(visibleTimeout.current);
      }

      setVisible(true);

      if (!duration) {
        return;
      }

      visibleTimeout.current = setTimeout(() => {
        setVisible(false);

        visibleTimeout.current = null;
      }, duration);
    },

    hide: () => {
      if (visibleTimeout.current) {
        clearTimeout(visibleTimeout.current);
      }

      setVisible(false);

      visibleTimeout.current = null;
    },
  }));

  React.useEffect(() => () => {
    if (visibleTimeout.current) {
      clearTimeout(visibleTimeout.current);
    }
  }, []);

  return (
    <div
      className={cx(
        'badge-container',
        !!color && `badge-${color}`,
        visible && 'badge-visible',
        className,
      )}
    >
      {label}
    </div>
  );
});