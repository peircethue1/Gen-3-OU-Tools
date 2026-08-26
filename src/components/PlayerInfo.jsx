// EDITINGNOTE: do styles and scss

import * as React from 'react';
import cx from 'classnames';
import { useToolsContext } from '@gen-3-ou-tools/hooks.js';
import { formatId } from '@gen-3-ou-tools/utilities.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { Button } from './+STUBS.jsx';
import { Tooltip } from './Tooltip.jsx';

import { useUserLadderQuery } from '';// EDITINGNOTE

export const PlayerInfo = ({ className, playerKey, defaultName }) => {
  const colorScheme = useColorScheme();

  const { state } = useToolsContext();

  const {
    containerSize,
    containerWidth,
    format,
  } = state;

  const {
    name,
    rating: ratingFromBattle,
  } = state[playerKey] || {};

  const playerId = formatId(name);





  // only fetch the rating if the battle didn't provide it to us
  // (with a terribly-implemented delay timer to give some CPU time for drawing the UI)
  const [delayedQuery, setDelayedQuery] = React.useState(true);

  const delayedQueryTimeout = React.useRef(null);

  const skipLadderQuery = !playerId || !format || !!ratingFromBattle;

  React.useEffect(() => {

    // checking `playerId` in case the component hasn't received its props yet;
    // once `delayedQuery` is `false`, we no longer bother refetching
    if (!playerId || !delayedQuery || skipLadderQuery) {
      return;
    }

    delayedQueryTimeout.current = setTimeout(
      () => setDelayedQuery(false),
      6996, // arbitrary af
    );

    return () => {
      if (!delayedQueryTimeout.current) {
        return;
      }

      clearTimeout(delayedQueryTimeout.current);

      delayedQueryTimeout.current = null;
    };
  }, [delayedQuery, playerId, skipLadderQuery]);

  const { ladder } = useUserLadderQuery(playerId, {
    skip: skipLadderQuery || delayedQuery,

    selectFromResult: ({ data }) => ({
      ladder: data?.find?.((entry) => entry?.userid === playerId && entry.formatid === format),
    }),
  });

  const rating = ratingFromBattle || (!!ladder?.elo && Math.round(parseFloat(ladder.elo)));

  const additionalRatings = {
    gxe: ladder?.gxe ? `${ladder.gxe}%` : null,
    glicko1Rating: ladder?.rpr ? Math.round(parseFloat(ladder.rpr)) : null,
    glicko1Deviation: ladder?.rprd ? Math.round(parseFloat(ladder.rprd)) : null,
  };





  return (
    <div
      className={cx(
        styles.container,
        !!colorScheme && styles[colorScheme],
        containerSize === 'xs' && styles.verySmol,
        className,
      )}
    >
      <Button
        className={styles.usernameButton}
        labelClassName={styles.usernameButtonLabel}
        label={name || defaultName}
        hoverScale={1}
        absoluteHover
        disabled
      />

      <div className={styles.playerActions}>
        {
          !!rating &&
          <Tooltip
            content={(
              <div className={styles.tooltipContent}>
                {
                  !!ladder?.formatid &&
                  <div className={styles.ladderFormat}>
                    {ladder.formatid}
                  </div>
                }

                <div className={styles.ladderStats}>
                  {
                    !!additionalRatings.gxe &&
                    <>
                      <div className={styles.ladderStatLabel}>
                        GXE
                      </div>
                      <div className={styles.ladderStatValue}>
                        {additionalRatings.gxe}
                      </div>
                    </>
                  }

                  {
                    !!additionalRatings.glicko1Rating &&
                    <>
                      <div className={styles.ladderStatLabel}>
                        Glicko-1
                      </div>
                      <div className={styles.ladderStatValue}>
                        {additionalRatings.glicko1Rating}
                        {
                          !!additionalRatings.glicko1Deviation &&
                          <span style={{ opacity: 0.65 }}>
                            &plusmn;{additionalRatings.glicko1Deviation}
                          </span>
                        }
                      </div>
                    </>
                  }
                </div>
              </div>
            )}
            offset={[0, 10]}
            delay={[1000, 50]}
            trigger="mouseenter"
            disabled={!ladder?.id}
          >
            <div className={cx(styles.rating, styles.visible)}>
              &nbsp;{rating}{containerWidth > 360 && ' ELO'}
            </div>
          </Tooltip>
        }
      </div>
    </div>
  );
};