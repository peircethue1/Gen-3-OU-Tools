// EDITINGNOTE: Reviewed...

import { runtimeFetch, safeJsonParse } from '@gen-3-ou-tools/utilities.js';
import { showdownApi } from './showdownApi.js';

export const actionApi = showdownApi.injectEndpoints({
  overrideExisting: true,

  endpoints: (build) => ({
    userLadder: build.query({
      queryFn: async (username) => {
        if (!username) {
          throw new Error('Failed to fetch data from the Pokemon Showdown ladder because the username is invalid.');
        }

        const response = await runtimeFetch(
          `https://play.pokemonshowdown.com/~~showdown/action.php?act=ladderget&user=${encodeURIComponent(username)}`,
          {
            method: 'GET',
            headers: { Accept: 'text/plain' },
          },
        );

        let text = response.text();

        if (text?.startsWith?.(']')) {
          text = text.slice(1);
        }

        const data = safeJsonParse(text)?.map((info) => ({
          ...info,
          id: `${info?.entryid || '?'}:${info?.formatid || '?'}:${info?.entryid || '?'}`,
        }));

        return { data };
      },

      providesTags: ['showdown:ladder'],
    }),
  }),
});