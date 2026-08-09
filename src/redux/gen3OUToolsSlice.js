/**
 * Creates the Gen 3 OU Tools slice and hooks
 */

import { createSlice, current } from '@reduxjs/toolkit';
import { getAuthUsername, getColorScheme } from '@gen-3-ou-tools/utilities.js';
import { useSelector, useDispatch } from '@gen-3-ou-tools/hooks.js';

// Creates the Redux slice
export const gen3OUToolsSlice = createSlice({
  name: 'gen3OUTools',

  // Defines the initial state
  initialState: {
    authUsername: getAuthUsername(),
    settings: {
      colorScheme: getColorScheme(),
    },
    smogonData: {
      rating: {
        0: { chaos: null, leads: null },
        1500: { chaos: null, leads: null },
        1630: { chaos: null, leads: null },
        1760: { chaos: null, leads: null },
      },
    }
  },

  // Manages state changes
  reducers: {
    setAuthUsername: (state, action) => {
      state.authUsername = action.payload || null;

      console.debug(
        '[Gen 3 OU Tools] Set the authenticated username.',
        '\ntype:', action.type,
        '\npayload:', action.payload,
        '\nstate:', current(state),
      );
    },

    setColorScheme: (state, action) => {
      if (!['light', 'dark'].includes(action.payload)) {
        console.warn('[Gen 3 OU Tools] The color scheme cannot be set to this invalid payload:', action.payload);

        return;
      }

      state.settings.colorScheme = action.payload;

      console.debug(
        '[Gen 3 OU Tools] Set the color scheme.',
        '\ntype:', action.type,
        '\npayload:', action.payload,
        '\nstate:', current(state),
      );
    },

    setSmogonData: (state, action) => {
      state.smogonData = action.payload || null;

      console.debug(
        '[Gen 3 OU Tools] Set the Smogon data.',
        '\ntype:', action.type,
        '\nstate:', current(state),
      );
    },
  },
});

// Retrieves the authenticated username
export const useAuthUsername = () => useSelector((state) => state?.gen3OUTools?.authUsername);

// Retrieves the color scheme
export const useColorScheme = () => useSelector((state) => {
  return state?.gen3OUTools?.settings?.colorScheme || 'light';
});

// Retrieves the Smogon data
export const useSmogonData = () => useSelector((state) => state?.gen3OUTools?.smogonData);

// Sets the Smogon data
export const useSetSmogonData = () => {
  const dispatch = useDispatch();

  return (smogonData) => {
    dispatch(gen3OUToolsSlice.actions.setSmogonData(smogonData));
  };
};