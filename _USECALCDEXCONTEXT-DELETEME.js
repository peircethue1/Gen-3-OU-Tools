// This is a workspace. This will ultimately overwrite the stub in hooks and be deleted

import * as React from 'react';
import { NIL as NIL_UUID } from 'uuid';
import {
  PokemonBoostNames,
  PokemonBoosterAbilities,
  PokemonPresetFuckedBaseFormes,
  PokemonPresetFuckedBattleFormes,
  PokemonRuinAbilities,
} from '@showdex/consts/dex';
import { CalcdexPlayerKeys as AllPlayerKeys } from '@showdex/interfaces/calc';
import { saveHonkdex } from '@showdex/redux/actions';
import { calcdexSlice, useDispatch } from '@showdex/redux/store';
import {
  detectPlayerKeyFromPokemon,
  cloneAllPokemon,
  clonePlayer,
  clonePlayerSide,
  clonePokemon,
  clonePreset,
  countSideRuinAbilities,
  detectToggledAbility,
  reassignPokemon,
  replaceBehemothMoves,
  sanitizePlayerSide,
  sanitizePokemon,
  toggleRuinAbilities,
} from '@showdex/utils/battle';
import {
  calcLegacyHpIv,
  calcMaxPokemon,
  calcPokemonCurrentHp,
  calcPokemonMaxHp,
  calcPokemonSpreadStats,
  calcStatAutoBoosts,
  convertLegacyDvToIv,
  getDynamaxHpModifier,
  getLegacySpcDv,
  populateStatsTable,
} from '@showdex/utils/calc';
import {
  clamp,
  env,
  nonEmptyObject,
  similarArrays,
} from '@showdex/utils/core';
import { logger, runtimer } from '@showdex/utils/debug';
import {
  detectDoublesFormat,
  determineAutoBoostEffect,
  determineDefaultLevel,
  determineSpeciesForme,
  determineTerrain,
  determineWeather,
  getDexForFormat,
  getGenfulFormat,
  hasMegaForme,
  toggleableAbility,
} from '@showdex/utils/dex';
import {
  appliedPreset,
  applyPreset,
  findMatchingUsage,
  flattenAlt,
  getPresetFormes,
  selectPokemonPresets,
} from '@showdex/utils/presets';
import { ToolsContext } from './ToolsContext.js';

export const useToolsContext = () => {
  const ctx = React.useContext(ToolsContext);
  const { state } = ctx;

  const applyAutoBoostEffects = (playersPayload, field) => {
    if (!playersPayload) {
      return;
    }

    const activePokemon = AllPlayerKeys.flatMap((k) => state[k]?.pokemon?.filter((p) => !!p?.active) || []);
    const playerKeys = [state.playerKey, state.opponentKey];

    playerKeys.forEach((playerKey) => {
      if (!Array.isArray(playersPayload[playerKey]?.pokemon)) {
        playersPayload[playerKey] = {
          ...playersPayload[playerKey],
          pokemon: cloneAllPokemon(state[playerKey]?.pokemon),
        };
      }

      if ('selectionIndex' in playersPayload[playerKey]) {
        return;
      }

      playersPayload[playerKey].selectionIndex = state[playerKey]?.selectionIndex;
    });

    playerKeys.forEach((playerKey) => {
      const { pokemon: sourceParty, selectionIndex, side: sourceSide } = playersPayload[playerKey];
      const sourcePokemon = sourceParty[selectionIndex];

      if (!sourcePokemon?.speciesForme) {
        return;
      }

      const ability = sourcePokemon.dirtyAbility || sourcePokemon.ability;
      const opponentKey = playerKey === state.playerKey ? state.opponentKey : state.playerKey;
      const shouldTargetOpposing = ability === 'Intimidate';
      const targetKey = shouldTargetOpposing ? opponentKey : playerKey;

      const { pokemon: targetParty, selectionIndex: targetSelectionIndex } = playersPayload[targetKey];
      const targetPokemon = targetParty[targetSelectionIndex];

      if (!targetPokemon?.speciesForme) {
        return;
      }

      const fx = determineAutoBoostEffect(sourcePokemon, {
        format: state.format,
        targetPokemon,
        activePokemon: state?.gameType === 'Singles'
          ? [playersPayload[opponentKey]?.pokemon?.[playersPayload[opponentKey]?.selectionIndex]].filter(Boolean)
          : activePokemon.filter((p) => p.calcdexId !== sourcePokemon.calcdexId),
        sourceSide,
        field: { ...state.field, ...field },
      });

      [
        sourcePokemon.calcdexId !== targetPokemon.calcdexId && sourcePokemon,
        targetPokemon,
      ].filter(Boolean).forEach((pokemon) => {
        if (!nonEmptyObject(pokemon.autoBoostMap)) {
          pokemon.autoBoostMap = {};

          return;
        }

        const abilities = [pokemon.dirtyAbility, pokemon.ability, ...(pokemon.abilities || [])].filter(Boolean);
        const items = [pokemon.dirtyItem, pokemon.item, pokemon.prevItem].filter(Boolean);

        const removeEffects = (Object.entries(pokemon.autoBoostMap)).map(([n, f]) => {
          if (!f?.name || !f.dict) {
            return n;
          }

          if (f.sourceKey && f.sourcePid) {
            return null;
          }

          switch (f.dict) {
            case 'abilities': {
              if (!abilities.includes(f.name)) {
                return n;
              }

              break;
            }

            case 'items': {
              if (!items.includes(f.name)) {
                return n;
              }

              break;
            }

            default: {
              break;
            }
          }

          return null;
        }).filter(Boolean);

        if (removeEffects.length) {
          removeEffects.forEach((name) => {
            delete pokemon.autoBoostMap[name];
          });
        }

        const deactivateEffects = (Object.entries(pokemon.autoBoostMap)).map(([n, f]) => {
          if (!f?.name || f.dict === 'items' || !nonEmptyObject(f.boosts) || (typeof f.turn === 'number' && f.turn < 0)) {
            return n;
          }

          if (!f.sourceKey || !f.sourcePid) {
            return null;
          }

          const fxIndex = playersPayload[f.sourceKey]?.pokemon?.findIndex((p) => p?.calcdexId === f.sourcePid);
          const selIndex = playersPayload[f.sourceKey]?.selectionIndex;

          return fxIndex !== selIndex ? n : null;
        }).filter(Boolean);

        if (!deactivateEffects.length) {
          return;
        }

        const index = playersPayload[pokemon.playerKey].pokemon.indexOf(pokemon);

        if (index < 0) {
          return;
        }

        deactivateEffects.forEach((name) => {
          pokemon.autoBoostMap[name] = {
            ...pokemon.autoBoostMap[name],
            active: false,
          };
        });

        PokemonBoostNames.forEach((stat) => {
          pokemon.dirtyBoosts[stat] = clamp(-6, pokemon.dirtyBoosts[stat], 6) || null;
        });
      });

      if (!fx?.name) {
        return;
      }

      if (fx.name in { ...targetPokemon.autoBoostMap }) {
        targetPokemon.autoBoostMap[fx.name].active = nonEmptyObject(fx.boosts);
        targetPokemon.autoBoostMap[fx.name].boosts = { ...fx.boosts };

        return;
      }

      fx.active = nonEmptyObject(fx.boosts);

      targetPokemon.autoBoostMap = {
        ...targetPokemon.autoBoostMap,
        [fx.name]: fx,
      };
    });
  };

  const applyAutoFieldConditions = (pokemon, field) => {
    if (!pokemon?.speciesForme || !field) {
      return;
    }

    const autoWeather = determineWeather(pokemon, state.format);
    const autoTerrain = determineTerrain(pokemon);

    if (autoWeather) {
      field.autoWeather = autoWeather;

      if (state.field.dirtyWeather === '') {
        field.dirtyWeather = null;
      }
    }

    if (autoTerrain) {
      field.autoTerrain = autoTerrain;

      if (state.field.dirtyTerrain === '') {
        field.dirtyTerrain = null;
      }
    }
  };

  const mutatePokemon = (mutated, prev, mutations, field) => {
    const playerKey = detectPlayerKeyFromPokemon(prev);

    const mutating = (
      ...keys
    ) => keys.some((key) => key in mutations);

    if (mutating('dirtyBoosts')) {
      mutated.dirtyBoosts = {
        ...prev.dirtyBoosts,
        ...mutations.dirtyBoosts,
      };

      if (nonEmptyObject(mutated.boosts)) {
        (Object.entries(mutated.dirtyBoosts)).forEach(([
          stat,
          dirtyBoost,
        ]) => {
          const boost = mutated.boosts?.[stat] || 0;
          const autoBoost = calcStatAutoBoosts(mutated, stat) || 0;

          if (dirtyBoost !== boost + autoBoost) {
            return;
          }

          mutated.dirtyBoosts[stat] = null;
        });
      }
    }

    if (
      mutating('speciesForme')
        && prev.speciesForme !== mutated.speciesForme
        && !mutating('terastallized')
        && determineSpeciesForme(mutated, true) !== determineSpeciesForme({
          ...mutated, terastallized: !mutated.terastallized,
        }, true)
    ) {
      mutated.terastallized = !mutated.terastallized;
    }

    mutated.speciesForme = determineSpeciesForme(mutated, true);

    if (mutated.transformedForme) {
      mutated.transformedForme = determineSpeciesForme(mutated);
    }

    if (prev.speciesForme !== mutated.speciesForme) {
      const {
        altFormes,
        types,
        abilities,
        baseStats,
      } = sanitizePokemon(
        mutated,
        state.format,
      );

      if (!similarArrays(mutated.altFormes, altFormes)) {
        mutated.altFormes = [...altFormes];
      }

      if (abilities?.length) {
        mutated.abilities = [...abilities];

        if (!abilities.includes(mutated.ability || mutated.dirtyAbility)) {
          [mutated.dirtyAbility] = abilities;
        }

        const clearInvalidDirtyAbility = !!mutated.dirtyAbility
          && abilities.includes(mutated.ability)
          && !abilities.includes(mutated.dirtyAbility);

        if (clearInvalidDirtyAbility) {
          mutated.dirtyAbility = null;
        }
      }

      if (types?.length) {
        mutated.types = [...types];

        if (mutated.dirtyTypes?.length) {
          mutated.dirtyTypes = [];
        }
      }

      if (nonEmptyObject(baseStats)) {
        mutated.baseStats = { ...baseStats };

        if (Object.values(mutated.dirtyBaseStats || {}).some((v) => v > 0)) {
          mutated.dirtyBaseStats = {};
        }
      }

      if (mutated.source !== 'server' && mutated.presetId) {
        const dex = getDexForFormat(state.format);
        const prevBaseForme = dex.species.get(prev.speciesForme)?.baseSpecies;
        const baseForme = dex.species.get(mutated.speciesForme)?.baseSpecies;
        const baseChanged = prevBaseForme !== baseForme;

        const shouldClearPreset = (
          (mutated.presetId === NIL_UUID || mutated.presetSource === 'user')
            && !prev.speciesForme.includes(baseForme)
        ) || (
          (!mutated.presetSource || !['server', 'sheet'].includes(mutated.presetSource))
            && prev.speciesForme.replace(/-Tera$/, '') !== mutated.speciesForme.replace(/-Tera$/, '')
            && !PokemonPresetFuckedBaseFormes.includes(baseForme)
            && !PokemonPresetFuckedBattleFormes.includes(mutated.speciesForme)
            && (baseChanged || (!hasMegaForme(prev.speciesForme) && !hasMegaForme(mutations.speciesForme)))
        );

        if (shouldClearPreset) {
          mutated.presetId = null;
          mutated.presetSource = null;
        }
      }

      if (mutated.presets?.length) {
        const presetFormes = getPresetFormes(mutated.speciesForme, {
          format: state.format,
          source: 'sheet',
        });

        mutated.presets = mutated.presets.filter((p) => !!p?.speciesForme && presetFormes.includes(p.speciesForme));
      }
    }

    if (mutating('ivs')) {
      mutated.ivs = { ...prev.ivs, ...mutations.ivs };
    }

    if (mutating('evs')) {
      mutated.evs = { ...prev.evs, ...mutations.evs };
    }

    if (state.legacy) {
      if (mutating('ivs')) {
        mutated.ivs.spa = convertLegacyDvToIv(getLegacySpcDv(mutated.ivs));
        mutated.ivs.spd = mutated.ivs.spa;

        mutated.ivs.hp = calcLegacyHpIv(mutated.ivs);
      }

      if (mutating('evs')) {
        mutated.evs.spd = mutated.evs.spa;
      }

      delete mutated.ability;
      delete mutated.dirtyAbility;
      delete mutated.nature;

      if (state.gen === 1) {
        delete mutated.item;
        delete mutated.dirtyItem;
      }
    }

    if (mutating('dirtyTypes') && similarArrays(mutated.types, mutated.dirtyTypes)) {
      mutated.dirtyTypes = [];
    }

    if (mutating('dirtyTeraType') && mutated.teraType === mutated.dirtyTeraType) {
      mutated.dirtyTeraType = null;
    }

    if (mutating('dirtyAbility') && mutated.ability === mutated.dirtyAbility) {
      mutated.dirtyAbility = null;
    }

    if (mutating('dirtyItem')) {
      if (mutated.item === mutated.dirtyItem) {
        mutated.dirtyItem = null;
      }

      if (PokemonBoosterAbilities.includes(mutated.dirtyAbility)) {
        mutated.abilityToggled = mutated.dirtyItem === 'Booster Energy';
      }
    }

    if (mutating('dirtyBaseStats')) {
      mutated.dirtyBaseStats = {
        ...(nonEmptyObject(mutations.dirtyBaseStats) && {
          ...prev.dirtyBaseStats,
          ...mutations.dirtyBaseStats,
        }),
      };

      (Object.entries(mutated.dirtyBaseStats)).forEach(([
        stat,
        value,
      ]) => {
        const baseValue = (
          prev.transformedForme && stat !== 'hp'
            ? prev.transformedBaseStats?.[stat]
            : prev.baseStats?.[stat]
        ) ?? -1;

        if (baseValue !== value) {
          return;
        }

        delete mutated.dirtyBaseStats[stat];
      });
    }

    if (mutating('dirtyHp')) {
      if (typeof mutated.dirtyHp === 'number') {
        mutated.dirtyHp /= getDynamaxHpModifier(mutated);
      }

      const maxHp = calcPokemonMaxHp(mutated);
      const currentHp = calcPokemonCurrentHp(mutated, true);
      const dirtyHp = calcPokemonCurrentHp(mutated);

      if (!maxHp || currentHp === dirtyHp) {
        mutated.dirtyHp = null;
      }
    }

    if (mutating('dirtyStatus') && (mutated.status || 'ok') === mutated.dirtyStatus) {
      mutated.dirtyStatus = null;
    }

    if (mutating('dirtyFaintCounter') && mutated.dirtyFaintCounter === mutated.faintCounter) {
      mutated.dirtyFaintCounter = null;
    }

    mutated.moves = replaceBehemothMoves(mutated.transformedForme || mutated.speciesForme, mutated.moves);

    if (nonEmptyObject(mutations.moveOverrides)) {
      (Object.entries(mutations.moveOverrides)).forEach(([
        moveName,
        overrides,
      ]) => {
        mutated.moveOverrides[moveName] = {
          ...(nonEmptyObject(overrides) && {
            ...prev.moveOverrides[moveName],
            ...overrides,
          }),
        };
      });

      mutated.moveOverrides = {
        ...prev.moveOverrides,
        ...mutated.moveOverrides,
      };
    }

    mutated.spreadStats = calcPokemonSpreadStats(state.format, mutated);

    if (mutating('speciesForme') ? mutated.presetId === NIL_UUID : !mutated.presetId) {
      const manuallyDirtied = !!mutated.dirtyTypes?.length
        || !!mutated.dirtyTeraType
        || !!mutated.dirtyHp
        || !!mutated.dirtyStatus
        || !!mutated.dirtyItem
        || (!!mutated.moves?.filter(Boolean).length && !mutated.revealedMoves?.length)
        || Object.values({ ...mutated.dirtyBaseStats }).some((v) => (v ?? -1) > 0)
        || Object.values({ ...mutated.evs }).some((v) => (v ?? -1) > 0)
        || Object.values({ ...mutated.dirtyBoosts }).some((v) => !!v);

      if (manuallyDirtied) {
        mutated.presetId = NIL_UUID;
        mutated.presetSource = 'user';
      }
    }

    if (nonEmptyObject(field)) {
      applyAutoFieldConditions(mutated, field);
    }

    if (mutating('dirtyHp', 'ability', 'dirtyAbility', 'dirtyTypes', 'dirtyItem')) {
      const nextField = { ...state.field, ...field };
      const weather = (nextField.dirtyWeather ?? (nextField.autoWeather || nextField.weather)) || null;
      const terrain = (nextField.dirtyTerrain ?? (nextField.autoTerrain || nextField.terrain)) || null;

      mutated.abilityToggled = detectToggledAbility(mutated, {
        format: state.format,
        gameType: state.gameType,
        selectionIndex: state[playerKey].selectionIndex,
        weather,
        terrain,
      });
    }

    if (prev.autoPreset && mutated.autoPreset && !state.format.includes('random')) {
      mutated.autoPreset = !mutating('dirtyAbility', 'dirtyItem', 'nature', 'presetId')
        && (prev.speciesForme === mutated.speciesForme)
        && (!mutated.transformedForme || prev.transformedForme === mutated.transformedForme)
        && (!mutating('moves') || similarArrays(prev.moves, mutated.moves));
    }
  };

  const updateBattle = (battle, scopeFromArgs) => {
    const scope = s('updateBattle()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!nonEmptyObject(battle) || (battle?.battleId && battle.battleId !== state.battleId)) {
      return void endTimer('(bad args)');
    }

    const payload = {
      ...battle,
      battleId: state.battleId,
    };

    if (payload.gen && payload.gen !== state.gen) {
      payload.format = getGenfulFormat(payload.gen, env('honkdex-default-format', payload.format));
    }

    if (payload.format && payload.format !== state.format) {
      payload.gameType = detectDoublesFormat(payload.format) ? 'Doubles' : 'Singles';
      payload.defaultLevel = determineDefaultLevel(payload.format) || 100;
    }

    const playersPayload = AllPlayerKeys.reduce((prev, playerKey) => {
      prev[playerKey] = { ...payload[playerKey] };

      if (!payload.gameType || payload.gameType === 'Doubles') {
        return prev;
      }

      const pokemonPayload = Array.isArray(prev[playerKey].pokemon);
      const playerParty = (pokemonPayload ? prev[playerKey] : state[playerKey])?.pokemon;
      const actives = playerParty?.filter((p) => p?.active);

      if ((actives?.length || 0) < 2) {
        return prev;
      }

      if (!pokemonPayload) {
        prev[playerKey].pokemon = cloneAllPokemon(state[playerKey]?.pokemon);
      }

      const [{ calcdexId: firstActiveId }] = actives;
      const activePokemon = prev[playerKey].pokemon.find((p) => p?.calcdexId === firstActiveId);

      if (activePokemon?.calcdexId) {
        activePokemon.active = false;
      }

      return prev;
    }, {});

    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone' && (state.name || payload.name) !== state.defaultName) {
      queueHonkSave();
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      ...payload,
      ...playersPayload,
    }));

    endTimer('(dispatched)');
  };

  const addPokemon = (playerKey, pokemon, index, scopeFromArgs) => {
    const scope = s('addPokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId || !state.format) {
      return void endTimer('(bad state)');
    }

    const batch = (Array.isArray(pokemon) ? pokemon : [pokemon]).filter((p) => !!p?.speciesForme);

    if (!playerKey || !batch.length) {
      return void endTimer('(bad args)');
    }

    if (!state[playerKey]?.active) {
      return void endTimer('(bad player state)');
    }

    const payload = {
      pokemon: cloneAllPokemon(state[playerKey].pokemon),
    };

    const field = {};

    batch.forEach((currentPokemon, i) => {
      const newPokemon = sanitizePokemon({
        ...currentPokemon,

        playerKey,
        source: 'user',
        hp: 100,
        maxhp: 100,
      }, state.format);

      newPokemon.speciesForme = determineSpeciesForme(newPokemon, true);

      if (newPokemon.transformedForme) {
        newPokemon.transformedForme = determineSpeciesForme(newPokemon);
      }

      newPokemon.ident = `${playerKey}: ${newPokemon.calcdexId.slice(-7)}`;
      newPokemon.spreadStats = calcPokemonSpreadStats(state.format, newPokemon);

      applyAutoFieldConditions(newPokemon, field);

      const currentField = { ...state.field, ...field };
      const weather = (currentField.dirtyWeather ?? (currentField.autoWeather || currentField.weather)) || null;
      const terrain = (currentField.dirtyTerrain ?? (currentField.autoTerrain || currentField.terrain)) || null;

      newPokemon.abilityToggled = detectToggledAbility(newPokemon, {
        format: state.format,
        gameType: state.gameType,
        weather,
        terrain,
      });

      if (state.operatingMode === 'standalone') {
        newPokemon.autoPreset = false;
        newPokemon.autoPresetId = null;
      }

      const insertionIndex = typeof index === 'number' && index > -1
        ? (index + i)
        : payload.pokemon.length;

      payload.pokemon.splice(insertionIndex, 0, newPokemon);
    });

    payload.selectionIndex = typeof index === 'number' && index > -1
      ? (index + clamp(0, batch.length - 1))
      : (payload.pokemon.length - 1);

    if (state.operatingMode === 'standalone') {
      payload.activeIndices = [...(state[playerKey].activeIndices || [])];

      const shouldActivate = (state.gameType === 'Singles' && !payload.activeIndices.length)
        || (state.gameType === 'Doubles' && payload.activeIndices.length < 2);

      if (shouldActivate) {
        payload.activeIndices.push(payload.selectionIndex);
        payload.pokemon = payload.pokemon.map((p, i) => ({
          ...p,
          active: payload.activeIndices.includes(i),
        }));
      }

      if (payload.pokemon.length >= state[playerKey].maxPokemon) {
        payload.maxPokemon = state[playerKey].maxPokemon + Math.abs(env.int('honkdex-player-extend-pokemon', 0));
      }
    }

    const playersPayload = {
      [playerKey]: payload,
    };

    applyAutoBoostEffects(playersPayload, field);
    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    dispatch(calcdexSlice.actions.updatePlayer({
      scope,
      battleId: state.battleId,
      ...playersPayload,
      field,
    }));

    endTimer('(dispatched)');
  };

  const updatePokemon = (playerKey, pokemon, scopeFromArgs) => {
    const scope = s('updatePokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId || !state.format) {
      return void endTimer('(bad state)');
    }

    if (!playerKey || !state[playerKey] || !pokemon?.calcdexId) {
      return void endTimer('(bad args)');
    }

    if (!state[playerKey]?.active) {
      return void endTimer('(bad player state)');
    }

    const pokemonIndex = state[playerKey].pokemon?.findIndex((p) => p?.calcdexId === pokemon.calcdexId);

    if ((pokemonIndex ?? -1) < 0) {
      return void endTimer('(bad pokemonIndex)');
    }

    const player = clonePlayer(state[playerKey]);
    const prevPokemon = player.pokemon[pokemonIndex];
    const field = {};

    const mutated = {
      ...prevPokemon,
      ...pokemon,

      calcdexId: prevPokemon.calcdexId,
    };

    mutatePokemon(
      mutated,
      prevPokemon,
      pokemon,
      field,
    );

    player.pokemon[pokemonIndex] = mutated;

    const playersPayload = {
      [playerKey]: { pokemon: player.pokemon },
    };

    applyAutoBoostEffects(playersPayload, field);
    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      ...playersPayload,
      field,
    }));

    endTimer('(dispatched)');
  };

  const removePokemon = (playerKey, pokemonOrId, reselectLast, scopeFromArgs) => {
    const scope = s('removePokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    const pokemonId = typeof pokemonOrId === 'string'
      ? pokemonOrId
      : pokemonOrId?.calcdexId;

    if (!playerKey || !pokemonId || !state[playerKey]?.active) {
      return void endTimer('(bad args)');
    }

    const pokemonIndex = state[playerKey].pokemon.findIndex((p) => p?.calcdexId === pokemonId);

    if (pokemonIndex < 0) {
      return void endTimer('(404 pokemonId)');
    }

    const payload = {
      pokemon: cloneAllPokemon(state[playerKey].pokemon),
    };

    const field = {};

    applyAutoFieldConditions(payload.pokemon[pokemonIndex], field);

    if (field.autoWeather === state.field?.autoWeather) {
      field.autoWeather = null;
    }

    if (field.autoTerrain === state.field?.autoTerrain) {
      field.autoTerrain = null;
    }

    payload.pokemon.splice(pokemonIndex, 1);

    const activeIndicesIndex = state[playerKey].activeIndices.indexOf(pokemonIndex);

    if (activeIndicesIndex > -1) {
      payload.activeIndices = [...state[playerKey].activeIndices];
      payload.activeIndices.splice(activeIndicesIndex, 1);
    }

    if (state[playerKey].selectionIndex > payload.pokemon.length - 1) {
      payload.selectionIndex = payload.pokemon.length - (reselectLast ? 1 : 0);
    }

    const extendAmount = Math.abs(env.int('honkdex-player-extend-pokemon', 0));
    const maxPokemonPrime = state[playerKey].maxPokemon - extendAmount;

    if (maxPokemonPrime > payload.pokemon.length) {
      payload.maxPokemon = Math.max(
        maxPokemonPrime,
        Math.abs(env.int('honkdex-player-min-pokemon', 0)),
      );
    }

    const playersPayload = {
      [playerKey]: payload,
    };

    applyAutoBoostEffects(playersPayload, field);
    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      ...playersPayload,
      field,
    }));

    endTimer('(dispatched)');
  };

  const dupePokemon = (playerKey, pokemonOrId, scopeFromArgs) => {
    const scope = s('dupePokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    const pokemonId = typeof pokemonOrId === 'string'
      ? pokemonOrId
      : pokemonOrId?.calcdexId;

    if (!playerKey || !pokemonId || !state[playerKey]?.active) {
      return void endTimer('(bad args)');
    }

    const pokemonIndex = state[playerKey].pokemon.findIndex((p) => p?.calcdexId === pokemonId);

    if (pokemonIndex < 0) {
      return void endTimer('(404 pokemonId)');
    }

    const payload = {
      pokemon: cloneAllPokemon(state[playerKey].pokemon),
    };

    const clonedPokemon = clonePokemon(payload.pokemon[pokemonIndex]);
    const dupedPokemon = reassignPokemon(clonedPokemon, playerKey, true);

    if (dupedPokemon.calcdexId === payload.pokemon[pokemonIndex].calcdexId) {
      return void endTimer('(same calcdexId)');
    }

    addPokemon(playerKey, dupedPokemon, pokemonIndex + 1, scope);
    endTimer('(delegated)');
  };

  const movePokemon = (sourceKey, pokemonOrId, destKey, index, scopeFromArgs) => {
    const scope = s('movePokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    const pokemonId = typeof pokemonOrId === 'string'
      ? pokemonOrId
      : pokemonOrId?.calcdexId;

    const sourcePlayer = (!!sourceKey && state[sourceKey]) || {};
    const destPlayer = (!!destKey && state[destKey]) || {};

    if (!sourcePlayer.active || !destPlayer.active || !pokemonId) {
      return void endTimer('(bad args)');
    }

    const pokemonIndex = sourcePlayer.pokemon.findIndex((p) => p?.calcdexId === pokemonId);

    if (pokemonIndex < 0) {
      return void endTimer('(404 pokemonId)');
    }

    const playersPayload = {
      [sourceKey]: { pokemon: [...(sourcePlayer.pokemon || [])] },
      [destKey]: { pokemon: [...(destPlayer.pokemon || [])] },
    };

    const clonedPokemon = clonePokemon(playersPayload[sourceKey].pokemon[pokemonIndex]);
    const movedPokemon = reassignPokemon(clonedPokemon, destKey, true);

    if (movedPokemon.calcdexId === playersPayload[sourceKey].pokemon[pokemonIndex].calcdexId) {
      return void endTimer('(same calcdexId)');
    }

    const sourceLength = playersPayload[sourceKey].pokemon.length - 1;

    playersPayload[sourceKey].pokemon.splice(pokemonIndex, 1);
    playersPayload[sourceKey].pokemon = playersPayload[sourceKey].pokemon.map((p, i) => ({ ...p, slot: i }));
    playersPayload[sourceKey].maxPokemon = calcMaxPokemon(sourcePlayer, sourceLength);
    playersPayload[sourceKey].selectionIndex = clamp(0, sourcePlayer.selectionIndex, sourceLength - 1);

    const destLength = playersPayload[destKey].pokemon.length + 1;
    const destIndex = clamp(0, index ?? destPlayer.selectionIndex + 1, destLength - 1);

    playersPayload[destKey].pokemon.splice(destIndex, 0, movedPokemon);
    playersPayload[destKey].pokemon = playersPayload[destKey].pokemon.map((p, i) => ({ ...p, slot: i }));
    playersPayload[destKey].maxPokemon = calcMaxPokemon(destPlayer, destLength);
    playersPayload[destKey].selectionIndex = destIndex;

    [
      sourceKey,
      destKey,
    ].filter((pkey) => (
      playersPayload[pkey].selectionIndex !== (pkey === sourceKey ? sourcePlayer : destPlayer).selectionIndex
    )).forEach((pkey) => {
      const prevPlayer = pkey === sourceKey ? sourcePlayer : destPlayer;
      const player = { ...prevPlayer, ...playersPayload[pkey] };

      if (state.gen === 1) {
        const sanitized = sanitizePlayerSide(state.gen, player);

        playersPayload[pkey].side = {
          ...prevPlayer.side,
          isReflect: sanitized.isReflect,
          isLightScreen: sanitized.isLightScreen,
        };

        return;
      }

      if (state.gen < 9) {
        return;
      }

      if (state.gameType === 'Singles') {
        toggleRuinAbilities(
          player,
          state.gameType,
          null,
          playersPayload[pkey].selectionIndex,
        );
      }
    });

    applyAutoBoostEffects(playersPayload);
    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      ...playersPayload,
    }));

    endTimer('(dispatched)');
  };

  const updateSide = (playerKey, side, scopeFromArgs) => {
    const scope = s('updateSide()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!playerKey || !state[playerKey] || !nonEmptyObject(side)) {
      return void endTimer('(bad args)');
    }

    // note: no need to clone the player here
    const player = state[playerKey];

    if (!player?.active) {
      return void endTimer('(bad player state)');
    }

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    const playersPayload = {
      [playerKey]: {
        side: {
          ...player.side,
          ...side,

          conditions: {
            ...player.side?.conditions,
            ...side?.conditions,
          },
        },
      },
    };

    applyAutoBoostEffects(playersPayload);
    recountRuinAbilities(playersPayload);

    dispatch(calcdexSlice.actions.updatePlayer({
      scope,
      battleId: state.battleId,
      ...playersPayload,
    }));

    endTimer('(dispatched)');
  };

  const updateField = (field, scopeFromArgs) => {
    const scope = s('updateField()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!nonEmptyObject(field)) {
      return void endTimer('(bad args)');
    }

    const playersPayload = {};
    const updatedField = { ...state.field, ...field };

    if (state.gen > 8 && ('dirtyWeather' in field || 'dirtyTerrain' in field)) {
      const weather = (updatedField.dirtyWeather ?? (updatedField.autoWeather || updatedField.weather)) || null;
      const terrain = (updatedField.dirtyTerrain ?? (updatedField.autoTerrain || updatedField.terrain)) || null;

      AllPlayerKeys.forEach((playerKey) => {
        const playerState = state[playerKey];

        if ((state.operatingMode === 'battle' && !playerState?.active) || !playerState.pokemon?.length) {
          return;
        }

        const retoggleIds = playerState.pokemon
          .filter((p) => toggleableAbility(p))
          .map((p) => p.calcdexId);

        if (!retoggleIds.length) {
          return;
        }

        const pokemon = cloneAllPokemon(playerState.pokemon);

        retoggleIds.forEach((id) => {
          const retoggleIndex = pokemon.findIndex((p) => p.calcdexId === id);

          if (retoggleIndex < 0) {
            return;
          }

          const retoggle = pokemon[retoggleIndex];

          retoggle.abilityToggled = detectToggledAbility(retoggle, {
            format: state.format,
            gameType: state.gameType,
            pokemonIndex: retoggleIndex,
            selectionIndex: playerState.selectionIndex,
            activeIndices: playerState.activeIndices,
            weather,
            terrain,
          });
        });

        playersPayload[playerKey] = {
          pokemon,
        };
      });
    }

    applyAutoBoostEffects(playersPayload, updatedField);
    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      ...playersPayload,
      field,
    }));

    endTimer('(dispatched)');
  };

  const activatePokemon = (playerKey, activeIndices, scopeFromArgs) => {
    const scope = s('activatePokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!playerKey || !state[playerKey] || !Array.isArray(activeIndices)) {
      return void endTimer('(bad args)');
    }

    if (!state[playerKey]?.active) {
      return void endTimer('(bad player state)');
    }

    if (similarArrays(state[playerKey].activeIndices, activeIndices)) {
      return void endTimer('(no change)');
    }

    const playersPayload = {
      [playerKey]: {
        activeIndices,
        pokemon: cloneAllPokemon(state[playerKey].pokemon).map((p, i) => ({
          ...p,
          active: activeIndices.includes(i),
        })),
      },
    };

    applyAutoBoostEffects(playersPayload);
    recountRuinAbilities(playersPayload);

    dispatch(calcdexSlice.actions.updatePlayer({
      scope,
      battleId: state.battleId,
      ...playersPayload,
    }));

    if (state.operatingMode === 'standalone' && state.name) {
      queueHonkSave();
    }

    endTimer('(dispatched)');
  };

  const selectPokemon = (playerKey, pokemonIndex, scopeFromArgs) => {
    const scope = s('selectPokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!playerKey || !state[playerKey] || (pokemonIndex || 0) < 0) {
      return void endTimer('(bad args)');
    }

    if (!state[playerKey]?.active) {
      return void endTimer('(bad player state)');
    }

    const player = clonePlayer(state[playerKey]);

    const playerPayload = {
      active: player.active,
      pokemon: player.pokemon,
      selectionIndex: Math.min(pokemonIndex, player.pokemon.length), // allowing + 1 to add
    };

    if (player.selectionIndex === playerPayload.selectionIndex) {
      switch (state.operatingMode) {
        case 'battle': {
          return void endTimer('(no change)');
        }

        case 'standalone': {
          if (!Array.isArray(player.activeIndices)) {
            player.activeIndices = [];
          }

          const activeIndicesIndex = player.activeIndices.indexOf(player.selectionIndex);

          player.activeIndices.splice(...([
            activeIndicesIndex,
            state.gameType === 'Doubles' && player.activeIndices.length < 2 && activeIndicesIndex < 0 ? 0 : 1,
            activeIndicesIndex < 0 && player.selectionIndex,
          ].filter((v) => typeof v === 'number')));

          player.pokemon = player.pokemon.map((p, i) => ({
            ...p,
            active: player.activeIndices.includes(i),
          }));

          playerPayload.activeIndices = [...player.activeIndices];
          playerPayload.pokemon = [...player.pokemon];

          break;
        }

        default: {
          break;
        }
      }
    }

    player.selectionIndex = playerPayload.selectionIndex;

    if (state.gen > 8) {
      toggleRuinAbilities(
        player,
        state.gameType,
        true,
        playerPayload.selectionIndex,
      );

      playerPayload.pokemon = player.pokemon;
    }

    playerPayload.side = clonePlayerSide(player.side);

    if (state.gen === 1) {
      const sanitized = sanitizePlayerSide(
        state.gen,
        player,
      );

      playerPayload.side.isReflect = sanitized.isReflect;
      playerPayload.side.isLightScreen = sanitized.isLightScreen;
    }

    const playersPayload = {
      [playerKey]: playerPayload,
    };

    const getPlayerSource = (
      pkey,
    ) => (pkey === playerKey ? playerPayload : state[pkey]);

    const pkeys = [state.playerKey, state.opponentKey].filter((pkey) => {
      const playerSource = getPlayerSource(pkey);

      return (state.operatingMode !== 'battle' || playerSource?.active) && !!playerSource.pokemon?.length;
    });

    const field = {
      autoWeather: null,
      autoTerrain: null,
    };

    // update (2024/07/26): field conditions should be determined first for both sides' selections, otherwise, the 'Sun'
    // autoWeather brought up by, say, Koraidon's Oricalcum Pulse will be set to null when the 'Electric' autoTerrain is
    // brought up by, say, Miraidon's Hadron Engine ... LOL
    pkeys.forEach((pkey) => {
      const playerSource = getPlayerSource(pkey);
      const pokemon = playerSource?.pokemon?.[playerSource?.selectionIndex];

      applyAutoFieldConditions(pokemon, field);
    });

    if (!pkeys.length) {
      delete field.autoWeather;
      delete field.autoTerrain;
    }

    const nextField = { ...state.field, ...field };
    const weather = (nextField.dirtyWeather ?? (nextField.autoWeather || nextField.weather)) || null;
    const terrain = (nextField.dirtyTerrain ?? (nextField.autoTerrain || nextField.terrain)) || null;

    (pkeys[0] === playerKey ? pkeys : pkeys.reverse()).forEach((pkey) => {
      const playerSource = pkey === playerKey ? playerPayload : state[pkey];
      const opponentKey = pkey === state.playerKey ? state.opponentKey : state.playerKey;
      const opponent = opponentKey === playerKey ? playerPayload : state[opponentKey];
      const opponentPokemon = opponent?.pokemon?.[opponent?.selectionIndex];

      playerSource.pokemon.forEach((pokemon, i) => {
        const ability = pokemon.dirtyAbility || pokemon.ability;

        if (PokemonRuinAbilities.includes(ability)) {
          return;
        }

        const toggled = detectToggledAbility(pokemon, {
          format: state.format,
          gameType: state.gameType,
          opponentPokemon,
          selectionIndex: pkey === playerKey ? playerPayload.selectionIndex : opponent?.selectionIndex,
          weather,
          terrain,
        });

        if (pokemon.abilityToggled === toggled) {
          return;
        }

        if (!Array.isArray(playersPayload[pkey]?.pokemon)) {
          playersPayload[pkey] = {
            ...playersPayload[pkey],
            pokemon: cloneAllPokemon(playerSource.pokemon),
          };
        }

        playersPayload[pkey].pokemon[pokemon.slot ?? i].abilityToggled = toggled;
      });
    });

    applyAutoBoostEffects(playersPayload, field);
    recountRuinAbilities(playersPayload);

    if (state.operatingMode === 'standalone') {
      if (nextField.weather) {
        field.weather = null;
      }

      if (nextField.terrain) {
        field.terrain = null;
      }
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      ...playersPayload,
      field,
    }));

    endTimer('(dispatched)');
  };

  const autoSelectPokemon = (playerKey, autoSelect, scopeFromArgs) => {
    const scope = s('autoSelectPokemon()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!playerKey || !state[playerKey] || typeof autoSelect !== 'boolean') {
      return void endTimer('(bad args)');
    }

    if (!state[playerKey]?.active) {
      return void endTimer('(bad player state)');
    }

    dispatch(calcdexSlice.actions.updatePlayer({
      scope,
      battleId: state.battleId,
      [playerKey]: { autoSelect },
    }));

    endTimer('(dispatched)');
  };

  const assignPlayer = (playerKey, scopeFromArgs) => {
    const scope = s('assignPlayer()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!playerKey || !state[playerKey]) {
      return void endTimer('(bad args)');
    }

    if (!state[playerKey]?.active) {
      return void endTimer('(bad player state)');
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      playerKey,
      opponentKey: state[state.opponentKey === playerKey ? 'playerKey' : 'opponentKey'],
    }));

    endTimer('(dispatched)');
  };

  const assignOpponent = (opponentKey, scopeFromArgs) => {
    const scope = s('assignOpponent()', scopeFromArgs);
    const endTimer = runtimer(scope, l);

    if (!state?.battleId) {
      return void endTimer('(bad state)');
    }

    if (!opponentKey || !state[opponentKey]) {
      return void endTimer('(bad args)');
    }

    if (!state[opponentKey]?.active) {
      return void endTimer('(bad opponent state)');
    }

    dispatch(calcdexSlice.actions.update({
      scope,
      battleId: state.battleId,
      playerKey: state[state.playerKey === opponentKey ? 'opponentKey' : 'playerKey'],
      opponentKey,
    }));

    endTimer('(dispatched)');
  };

  return {
    ...ctx,

    updateBattle,
    assignPlayer,
    assignOpponent,
    addPokemon,
    updatePokemon,
    removePokemon,
    dupePokemon,
    movePokemon,
    updateSide,
    updateField,
    activatePokemon,
    selectPokemon,
    autoSelectPokemon,
  };
};