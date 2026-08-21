// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { Scrollable } from './Scrollable.jsx';
import '@gen-3-ou-tools/main.css';

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
        'gen-3-ou-tools-module',
        'pagecontainer-container',
        className,
      )}
      {...(!!name && { 'data-gen-3-ou-tools-module': name })}
      {...(!!colorScheme && { 'data-gen-3-ou-tools-scheme': colorScheme })}
      data-gen-3-ou-tools-theme="sic"
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