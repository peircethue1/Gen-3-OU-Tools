// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { animated, useSpring } from '@react-spring/web';
import Tippy from '@tippyjs/react/headless';
import cx from 'classnames';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';

const springConfig = {
  mass: 1,
  tension: 300,
  friction: 27,
};

const springProps = {
  show: {
    opacity: 1,
    scale: 1,
  },

  hide: {
    opacity: 0,
    scale: 0.9,
  },
};

export const Tooltip = ({
  appendTo = () => document.body,
  content,
  trigger,
  ...props
}) => {
  const colorScheme = useColorScheme();

  const [animationStyles, springApi] = useSpring(() => ({
    from: springProps.hide,
    config: springConfig,
  }), []);

  const handleMount = () => {
    springApi.start({
      ...springProps.show,
      config: { ...springConfig, clamp: false },
      onRest: () => { },
    });
  };

  const handleHide = (instance) => {
    springApi.start({
      ...springProps.hide,
      config: { ...springConfig, clamp: true },
      onRest: ({ cancelled }) => {
        if (!cancelled) {
          instance?.unmount();
        }
      },
    });
  };

  const handleHidden = () => {
    springApi.set(springProps.hide);
  };

  const [arrow, setArrow] = React.useState(null);

  return (
    <Tippy
      {...props}
      appendTo={appendTo}
      animation
      popperOptions={{
        strategy: 'fixed',
        modifiers: [{
          name: 'arrow',
          options: {
            element: arrow,
          },
        }],
      }}
      trigger={Array.isArray(trigger) ? trigger.join(' ') : trigger}
      zIndex={99}
      render={(attributes, renderContent) => (
        <animated.div
          className={cx(
            'tooltip-container',
            !!colorScheme && `tooltip-${colorScheme}`,
          )}
          style={animationStyles}
          tabIndex={-1}
          {...attributes}
        >
          {renderContent || content}

          <div
            ref={setArrow}
            className={'tooltip-arrow'}
          />
        </animated.div>
      )}
      onMount={handleMount}
      onHide={handleHide}
      onHidden={handleHidden}
    />
  );
};