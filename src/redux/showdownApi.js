/**
 * Handles Pokemon Showdown API queries
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const showdownApi = createApi({
  reducerPath: 'showdownApi',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://play.pokemonshowdown.com' }),
  tagTypes: ['showdown:ladder'],
  endpoints: () => ({}),
});