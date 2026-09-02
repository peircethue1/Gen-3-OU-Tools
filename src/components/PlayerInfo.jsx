// EDITINGNOTE: Reviewed...

import * as React from 'react';
import cx from 'classnames';
import { useToolsContext } from '@gen-3-ou-tools/hooks.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { Button } from './Button.jsx';
import { Tooltip } from './Tooltip.jsx';

export const PlayerInfo = ({ className, playerKey, defaultName }) => {
  const colorScheme = useColorScheme();

  const { state } = useToolsContext();
  const { containerSize, containerWidth } = state;

  const {
    name,
    rating: ratingFromBattle,
    ladder,
  } = state[playerKey] || {};

  const rating = ratingFromBattle || (!!ladder?.elo && Math.round(parseFloat(ladder.elo)));

  const additionalRatings = {
    gxe: ladder?.gxe ? `${ladder.gxe}%` : null,
    glicko1Rating: ladder?.rpr ? Math.round(parseFloat(ladder.rpr)) : null,
    glicko1Deviation: ladder?.rprd ? Math.round(parseFloat(ladder.rprd)) : null,
  };

  return (
    <div
      className={cx(
        'playerinfo-container',
        !!colorScheme && `playerinfo-${colorScheme}`,
        containerSize === 'xs' && 'playerinfo-extraSmall',
        className,
      )}
    >
      <Button
        className={'playerinfo-usernameButton'}
        labelClassName={'playerinfo-usernameButtonLabel'}
        label={name || defaultName}
        absoluteHover
        disabled
      />

      <div className={'playerinfo-playerActions'}>
        {
          !!rating &&
          <Tooltip
            content={(
              <div className={'playerinfo-tooltipContent'}>
                {
                  !!ladder?.formatid &&
                  <div className={'playerinfo-ladderFormat'}>
                    {ladder.formatid}
                  </div>
                }

                <div className={'playerinfo-ladderStats'}>
                  {
                    !!additionalRatings.gxe &&
                    <>
                      <div className={'playerinfo-ladderStatLabel'}>
                        GXE
                      </div>
                      <div className={'playerinfo-ladderStatValue'}>
                        {additionalRatings.gxe}
                      </div>
                    </>
                  }

                  {
                    !!additionalRatings.glicko1Rating &&
                    <>
                      <div className={'playerinfo-ladderStatLabel'}>
                        Glicko-1
                      </div>
                      <div className={'playerinfo-ladderStatValue'}>
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
            <div className={"playerinfo-rating playerinfo-visible"}>
              &nbsp;{rating}{containerWidth > 360 && ' ELO'}
            </div>
          </Tooltip>
        }
      </div>
    </div>
  );
};