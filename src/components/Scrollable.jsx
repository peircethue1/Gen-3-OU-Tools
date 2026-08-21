// EDITINGNOTE: Reviewed...

import * as React from 'react';
import SimpleBar from 'simplebar';
import cx from 'classnames';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';

export const Scrollable = ({ className, children }) => {
  const simpleBarRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const scrollRef = React.useRef(null);
  const contentRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current || simpleBarRef.current) {
      return;
    }

    simpleBarRef.current = new SimpleBar(containerRef.current, {
      scrollableNode: scrollRef.current,
      contentNode: contentRef.current,

      classNames: {
        contentEl: 'scrollable-content',
        contentWrapper: 'scrollable-contentWrapper',
        offset: 'scrollable-offset',
        mask: 'scrollable-mask',
        wrapper: 'scrollable-wrapper',
        placeholder: 'scrollable-placeholder',
        scrollbar: 'scrollable-scrollbar',
        track: 'scrollable-track',
        heightAutoObserverWrapperEl: 'scrollable-heightObserverWrapper',
        heightAutoObserverEl: 'scrollable-heightObserver',
        visible: 'scrollable-visible',
        horizontal: 'scrollable-horizontal',
        vertical: 'scrollable-vertical',
        dragging: 'scrollable-dragging',
      },

      scrollbarMinSize: 40,
    });

    return () => {
      simpleBarRef.current?.unMount();
      simpleBarRef.current = null;
    };
  }, []);

  const colorScheme = useColorScheme();

  return (
    <div
      ref={containerRef}
      className={cx(
        'scrollable-container',
        !!colorScheme && `scrollable-${colorScheme}`,
        className,
      )}
      data-simplebar="init"
    >
      <div className="scrollable-wrapper">
        <div className="scrollable-heightObserverWrapper">
          <div className="scrollable-heightObserver" />
        </div>

        <div className="scrollable-mask">
          <div className="scrollable-offset">
            <div
              ref={scrollRef}
              className="scrollable-contentWrapper"
            >
              <div
                ref={contentRef}
                className="scrollable-content"
              >
                {children}
              </div>
            </div>
          </div>
        </div>

        <div className="scrollable-placeholder" />
      </div>

      <div className="scrollable-track scrollable-horizontal">
        <div className="scrollable-scrollbar" />
      </div>

      <div className="scrollable-track scrollable-vertical">
        <div className="scrollable-scrollbar" />
      </div>
    </div>
  );
};