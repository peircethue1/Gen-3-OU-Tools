/**
 * Creates the store
 */

import { configureStore } from '@reduxjs/toolkit';
import { showdownApi } from './showdownApi.js';
import { gen3OUToolsSlice } from './gen3OUToolsSlice.js';
import { toolsSlice } from './toolsSlice.js';

export const createStore = (options) => {
  const store = configureStore({
    ...options,

    devTools: false,

    // Creates the root reducer
    reducer: {
      [showdownApi.reducerPath]: showdownApi.reducer,
      [gen3OUToolsSlice.name]: gen3OUToolsSlice.reducer,
      [toolsSlice.name]: toolsSlice.reducer,
    },

    // Manages the performance settings and API listeners
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: false,
    }).concat(
      showdownApi.middleware,
    ),
  });

  console.debug('[Gen 3 OU Tools] Created this store:', store);

  return store;
};