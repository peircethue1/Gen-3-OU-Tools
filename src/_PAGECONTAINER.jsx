// EDITINGNOTE: Reviewed, needs import and styles...

import * as React from 'react';
import cx from 'classnames';
import { Scrollable } from './_STUBS.jsx';
import { useColorScheme } from './hooks.js';
import './main.css';

export const PageContainer = React.forwardRef(({
  name,
  className,
  contentClassName,
  contentScrollable,
  children,
}, forwardedRef) => {
  const colorScheme = useColorScheme();

  return (
    <div
      ref={forwardedRef}
      className={cx(
        'tools-module',
        'pagecontainer-container',
        className,
      )}
      {...(!!name && { 'data-tools-module': name })}
      {...(!!colorScheme && { 'data-tools-scheme': colorScheme })}
      data-tools-theme="sic"
    >
      {contentScrollable ? (
        <Scrollable
          className={cx('pagecontainer-content', contentClassName)}
        >
          {children}
        </Scrollable>
      ) : (
        <div
          className={cx('pagecontainer-content', contentClassName)}
        >
          {children}
        </div>
      )}
    </div>
  );
});

PageContainer.displayName = 'PageContainer';