/**
 * 
 * EDITINGNOTE: Full review...
 */

export function syncPrediction() {
  const opponentKey = this.toolsState.opponentKey;

  if (!opponentKey) {
    return;
  }

  const opponentState = this.toolsState[opponentKey];

  if (!opponentState || !Array.isArray(opponentState.pokemonOrder)) {
    return;
  }

  const opponentTeamKey = opponentState.pokemonOrder
    .map((toolsId) => {
      const pokemon = opponentState.pokemon?.find((pokemon) => pokemon.toolsId === toolsId);

      return pokemon?.speciesForme;
    })
    .filter(Boolean);

  const opponentTeam = [...opponentTeamKey];

  while (opponentTeam.length < opponentState.maxPokemon) {
    opponentTeam.push('???');
  }

  this.toolsState.opponentTeam = opponentTeam.join(' | ');

  const opponentRating = opponentState.rating;

  let opponentBracket = "0";

  if (opponentRating >= 1760) {
    opponentBracket = "1760"
  } else if (opponentRating >= 1630) {
    opponentBracket = "1630"
  } else if (opponentRating >= 1500) {
    opponentBracket = "1500"
  }

  if (!this.toolsState.smogonChaos || !this.toolsState.smogonLeads) {
    const handleSmogonResponse = (event) => {
      if (!event.data || !event.data.type) {
        return;
      }

      if (event.data.type === "SMOGON_DATA") {
        window.removeEventListener("message", handleSmogonResponse);

        this.toolsState.smogonChaos = event.data.data?.[opponentBracket]?.chaos;
        this.toolsState.smogonLeads = event.data.data?.[opponentBracket]?.leads;

        this.battle.subscription('callback');
      }

      if (event.data.type === "SMOGON_ERROR") {
        console.error('[Gen 3 OU Tools] Failed to fetch Smogon data with this error:', event.data.error);

        window.removeEventListener("message", handleSmogonResponse);
      }
    };

    window.addEventListener("message", handleSmogonResponse);

    window.postMessage({ type: "SMOGON_FETCH", opponentBracket: opponentBracket }, "*");
  }

  let conditional = null;

  for (let index = 0; index < opponentTeamKey.length; index++) {
    const pokemon = opponentTeamKey[index];
    const teammates = this.toolsState.smogonChaos?.data?.[pokemon]?.Teammates;

    if (!teammates) {
      conditional = null;
      break;
    }

    const teammatesTotal = Object.values(teammates).reduce((sum, value) => sum + value, 0);

    if (!(teammatesTotal > 0)) {
      conditional = null;
      break;
    }

    const teammateFrequency = {};

    for (const teammate in teammates) {
      const teammateValue = teammates[teammate];

      if (teammateValue > 0) {
        teammateFrequency[teammate] = teammateValue / teammatesTotal;
      }
    }

    if (index === 0) {
      conditional = teammateFrequency;
    } else {
      const newConditional = {};

      for (const teammate in conditional) {
        if (teammateFrequency.hasOwnProperty(teammate)) {
          newConditional[teammate] = conditional[teammate] * teammateFrequency[teammate];
        }
      }

      conditional = newConditional;
    }
  }

  let normalization = null;

  if (conditional) {
    normalization = {};

    for (const teammate in conditional) {

      const rawCount = this.toolsState.smogonChaos?.data?.[teammate]?.["Raw count"];
      const leadCount = this.toolsState.smogonLeads?.data?.[teammate]?.rawCount;

      if (!(rawCount > 0) || !(leadCount > 0)) {
        continue;
      }

      const prior = rawCount - leadCount;

      if (!(prior > 0)) {
        continue;
      }

      normalization[teammate] = conditional[teammate] * Math.pow(prior, 1 - opponentTeamKey.length);
    }
  }

  let prediction = null;

  if (normalization) {
    const normalizationTotal = Object.values(normalization).reduce((sum, value) => sum + value, 0);

    if (normalizationTotal > 0) {
      prediction = {};

      for (const teammate in normalization) {
        prediction[teammate] = (normalization[teammate] / normalizationTotal) * (opponentState.maxPokemon - opponentTeamKey.length);
      }
    }
  }

  if (prediction) {
    const sortedPrediction = Object.entries(prediction)
      .filter(([name, value]) => value >= 0.005)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => `${name}: ${Math.round(value * 100)}%`);

    this.toolsState.prediction = sortedPrediction.join('\n');
  } else {
    this.toolsState.prediction = "";
  }
}