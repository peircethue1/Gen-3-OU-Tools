/**
 * 
 * EDITINGNOTE: Building...
 */

export function syncPrediction() {
  const opponentKey = this.battleState.opponentKey;

  if (!opponentKey) {
    return;
  }

  const opponentState = this.battleState[opponentKey];

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

  if (!this.battleState.smogonChaos || !this.battleState.smogonLeads) {
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
}