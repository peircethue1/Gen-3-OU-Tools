// EDITINGNOTE: Reviewed...

import { formatId } from '@gen-3-ou-tools/utilities.js';
import { actionApi } from './actionApi.js';
import { toolsSlice } from './toolsSlice.js';

export const syncLadder = ({ battleId, playerKey, name, format }) => async (dispatch) => {
  const playerId = formatId(name);

  if (!battleId || !playerKey || !playerId || !format) {
    return;
  }

  try {
    const result = await dispatch(actionApi.endpoints.userLadder.initiate(playerId));

    const ladder = result?.data?.find(
      (entry) => entry?.userid === playerId && entry?.formatid === format,
    ) || null;

    if (ladder) {
      dispatch(toolsSlice.actions.updatePlayer({
        battleId,
        [playerKey]: { ladder },
      }));
    }
  } catch (error) {
    console.error(
      '[Gen 3 OU Tools] Failed to sync ladder data.',
      '\nerror:', error,
      '\nplayer:', playerKey,
      '\nplayerId:', playerId,
      '\nbattleId:', battleId,
    );
  }
};