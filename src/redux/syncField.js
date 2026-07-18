/**
 * Syncs the field state with the battle
 * EDITINGNOTE: See note...
 * EDITINGNOTE: Remove syncField from utilities and adjust accordingly
 */

import { nonEmptyObject, cloneField, sanitizeField } from './utilities.js';

export const syncField = (state, battle) => {
  if (!nonEmptyObject(state?.field) || !battle?.p1) {
    console.warn(
      '[Gen 3 OU Tools] The field or battle is invalid.',
      '\nstate.field:', state.field,
      '\nbattle:', battle,
    );

    return state?.field;
  }

  const newField = cloneField(state.field);
  const updatedField = sanitizeField(battle);

  // Updates the field with new values
  Object.keys(updatedField).forEach((key) => {
    if (['attackerSide', 'defenderSide'].includes(key)) {
      return;
    }

    const value = updatedField?.[key];
    const originalValue = state.field?.[key];

    if (JSON.stringify(value) === JSON.stringify(originalValue)) {
      return;
    }

    newField[key] = value;
  });

  return newField;
};