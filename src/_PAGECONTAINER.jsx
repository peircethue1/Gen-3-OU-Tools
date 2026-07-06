import * as React from 'react';
import cx from 'classnames';
import { Scrollable } from '@showdex/components/ui';
import { useColorScheme, useColorTheme, useGlassyTerrain } from '@showdex/redux/store';
import styles from './PageContainer.module.scss';

export const PageContainer = React.forwardRef(({
  contentRef,
  name,
  className,
  style,
  contentClassName,
  contentStyle,
  scrollableContentClassName,
  scrollableContentStyle,
  prefix,
  suffix,
  contentScrollable,
  children,
  ...props
}, forwardedRef) => {
  const colorScheme = useColorScheme();
  const colorTheme = useColorTheme();
  const glassyTerrain = useGlassyTerrain();

  return (
    <div
      ref={forwardedRef}
      {...props}
      className={cx(
        'showdex-module',
        styles.container,
        className,
      )}
      style={style}
      {...(!!name && { 'data-showdex-module': name })}
      {...(!!colorScheme && { 'data-showdex-scheme': colorScheme })}
      {...(!!colorTheme && { 'data-showdex-theme': colorTheme })}
      {...(glassyTerrain && { 'data-showdex-terrain': 'glassy' })}
    >
      {prefix}

      {contentScrollable ? (
        <Scrollable
          contentRef={contentRef}
          className={cx(styles.content, contentClassName)}
          style={contentStyle}
          contentClassName={scrollableContentClassName}
          contentStyle={scrollableContentStyle}
        >
          {children}
        </Scrollable>
      ) : (
        <div
          ref={contentRef}
          className={cx(styles.content, contentClassName)}
          style={contentStyle}
        >
          {children}
        </div>
      )}

      {suffix}
    </div>
  );
});

PageContainer.displayName = 'PageContainer';