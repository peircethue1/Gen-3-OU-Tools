(() => {
  // src/BootAdapter.js
  var BootAdapter = class {
    // Defines the initialization state
    static __initialized = false;
    static __authUsername = null;
    // Defines the initialization lifecycle hooks
    static __hooks = [];
    static ready = null;
    // EDITINGNOTE
    static registerHook(hook) {
      if (typeof hook === "function") {
        this.__hooks.push(hook);
      }
    }
    // Prepares the extension state
    static async __init() {
      if (this.__initialized) {
        return;
      }
      this.__initialized = true;
    }
    // Fetches the username
    static get authUsername() {
      return this.__authUsername;
    }
    // Updates the username
    static set authUsername(value) {
      this.__authUsername = value?.trim() || null;
    }
    // Executes the initialization sequence
    static async run() {
      console.debug("[Gen 3 OU Tools] Starting the initialization sequence.");
      for (const hook of this.__hooks) {
        try {
          await hook();
        } catch (error) {
          console.error("[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.", error);
        }
      }
      try {
        await this.__init();
        if (typeof this.ready === "function") {
          await this.ready();
        }
      } catch (error) {
        console.error("[Gen 3 OU Tools] Initialization failed: An error occurred while executing post-initialization setup.", error);
      }
      console.debug("[Gen 3 OU Tools] The initialization sequence finished successfully.");
    }
  };

  // src/BootClassicAdapter.js
  var BootClassicAdapter = class _BootClassicAdapter extends BootAdapter {
    // Defines the adapter state
    static __appReceive = null;
    static __appRun = null;
    static __battleReceivers = [];
    static __mutex = {
      ok: false,
      battleBuf: []
    };
    static receiverFactory = null;
    // Intercepts client data
    static hook = () => {
      console.debug("[Gen 3 OU Tools] Intercepting client data via window.app.receive.");
      this.__appReceive = window.app.receive.bind(window.app);
      window.app.receive = (data) => {
        this.__appReceive(data);
        if (typeof data !== "string" || !data.length) {
          return;
        }
        if (data.startsWith("|updateuser|")) {
          const [
            ,
            ,
            username,
            namedCode
          ] = data.split("|");
          console.debug(
            "[Gen 3 OU Tools] User logged in.",
            "\nuser type:",
            namedCode === "1" ? "registered" : "guest",
            "\nusername:",
            username?.trim(),
            "\ndata:",
            data
          );
          if (!username || namedCode !== "1") {
            return;
          }
          _BootClassicAdapter.authUsername = username;
        }
        if (data.startsWith(">battle-")) {
          const roomId = data.slice(1, data.indexOf("\n"));
          console.debug(
            "[Gen 3 OU Tools] Received client data via window.app.receive.",
            "\nbattle room:",
            roomId,
            "\ndata:",
            data
          );
          if (!this.__mutex.ok) {
            this.__mutex.battleBuf.push([roomId, data]);
            return;
          }
          let receiver = this.battleReceiverNamed(roomId);
          if (!receiver && typeof this.receiverFactory === "function") {
            receiver = this.receiverFactory(roomId);
            if (typeof receiver === "function") {
              this.addBattleReceiver(roomId, receiver);
            }
          }
          if (typeof receiver !== "function") {
            return;
          }
          receiver(data);
        }
      };
    };
    // EDITINGNOTE
    static runHook = () => {
      console.debug("[Gen 3 OU Tools] Intercepting client data via window.Battle.prototype.run.");
      this.__appRun = window.Battle.prototype.run;
      window.Battle.prototype.run = function(...args) {
        const result = _BootClassicAdapter.__appRun.apply(this, args);
        const command = args[0];
        if (typeof command === "string" && !!command.length) {
          const roomId = this.id;
          console.debug(
            "[Gen 3 OU Tools] Received client data via window.Battle.prototype.run.",
            "\nbattle room:",
            roomId,
            "\ncommand:",
            command,
            "\nargs:",
            args
          );
          if (!_BootClassicAdapter.__mutex.ok) {
            _BootClassicAdapter.__mutex.battleBuf.push([roomId, command]);
          } else {
            let receiver = _BootClassicAdapter.battleReceiverNamed(roomId);
            if (!receiver && typeof _BootClassicAdapter.receiverFactory === "function") {
              receiver = _BootClassicAdapter.receiverFactory(roomId);
              if (typeof receiver === "function") {
                _BootClassicAdapter.addBattleReceiver(roomId, receiver);
              }
            }
            if (typeof receiver === "function") {
              receiver(command);
            }
          }
        }
        return result;
      };
    };
    static {
      this.registerHook(this.hook);
      this.registerHook(this.runHook);
    }
    // Flushes the buffer after initialization
    static ready = () => {
      this.__mutex.battleBuf.forEach(([roomId, data]) => {
        const receiver = this.battleReceiverNamed(roomId);
        if (typeof receiver === "function") {
          receiver(data);
        }
      });
      this.__mutex.battleBuf.length = 0;
      this.__mutex.ok = true;
    };
    // Creates an array of data receivers
    static get receivers() {
      return this.__battleReceivers;
    }
    // Fetches the data receiver for the battle room
    static battleReceiverNamed(key) {
      if (!key || !this.__battleReceivers.length) {
        return null;
      }
      const pair = this.__battleReceivers.find((receiver) => receiver[0] === key);
      return pair ? pair[1] : null;
    }
    // Adds a data receiver to the array of data receivers
    static addBattleReceiver(roomId, receiver) {
      if (!roomId || typeof receiver !== "function" || this.__battleReceivers.some((receiver2) => receiver2[0] === roomId)) {
        return;
      }
      this.__battleReceivers.push([roomId, receiver]);
    }
    // Removes a data receiver from the array of data receivers
    static removeBattleReceiver(key) {
      if (!key || !this.__battleReceivers.length) {
        return;
      }
      const index = this.__battleReceivers.findIndex((receiver) => receiver[0] === key);
      if (index >= 0) {
        this.__battleReceivers.splice(index, 1);
      }
    }
    // Removes all data receivers from the array of data receivers
    static clearBattleReceivers() {
      if (!this.__battleReceivers.length) {
        return;
      }
      this.__battleReceivers.length = 0;
    }
  };

  // node_modules/uuid/dist/nil.js
  var nil_default = "00000000-0000-0000-0000-000000000000";

  // node_modules/uuid/dist/regex.js
  var regex_default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/i;

  // node_modules/uuid/dist/validate.js
  function validate(uuid) {
    return typeof uuid === "string" && regex_default.test(uuid);
  }
  var validate_default = validate;

  // node_modules/uuid/dist/parse.js
  function parse(uuid) {
    if (!validate_default(uuid)) {
      throw TypeError("Invalid UUID");
    }
    let v;
    return Uint8Array.of((v = parseInt(uuid.slice(0, 8), 16)) >>> 24, v >>> 16 & 255, v >>> 8 & 255, v & 255, (v = parseInt(uuid.slice(9, 13), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(14, 18), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(19, 23), 16)) >>> 8, v & 255, (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255, v / 4294967296 & 255, v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255);
  }
  var parse_default = parse;

  // node_modules/uuid/dist/stringify.js
  var byteToHex = [];
  for (let i = 0; i < 256; ++i) {
    byteToHex.push((i + 256).toString(16).slice(1));
  }
  function unsafeStringify(arr, offset = 0) {
    return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  }

  // node_modules/uuid/dist/rng.js
  var rnds8 = new Uint8Array(16);
  function rng() {
    return crypto.getRandomValues(rnds8);
  }

  // node_modules/uuid/dist/v35.js
  function stringToBytes(str) {
    str = unescape(encodeURIComponent(str));
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; ++i) {
      bytes[i] = str.charCodeAt(i);
    }
    return bytes;
  }
  var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  var URL = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  function v35(version, hash, value, namespace, buf, offset) {
    const valueBytes = typeof value === "string" ? stringToBytes(value) : value;
    const namespaceBytes = typeof namespace === "string" ? parse_default(namespace) : namespace;
    if (typeof namespace === "string") {
      namespace = parse_default(namespace);
    }
    if (namespace?.length !== 16) {
      throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
    }
    let bytes = new Uint8Array(16 + valueBytes.length);
    bytes.set(namespaceBytes);
    bytes.set(valueBytes, namespaceBytes.length);
    bytes = hash(bytes);
    bytes[6] = bytes[6] & 15 | version;
    bytes[8] = bytes[8] & 63 | 128;
    if (buf) {
      offset ??= 0;
      if (offset < 0 || offset + 16 > buf.length) {
        throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
      }
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }
      return buf;
    }
    return unsafeStringify(bytes);
  }

  // node_modules/uuid/dist/v4.js
  function v4(options, buf, offset) {
    if (!buf && !options && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return _v4(options, buf, offset);
  }
  function _v4(options, buf, offset) {
    options = options || {};
    const rnds = options.random ?? options.rng?.() ?? rng();
    if (rnds.length < 16) {
      throw new Error("Random bytes length must be >= 16");
    }
    rnds[6] = rnds[6] & 15 | 64;
    rnds[8] = rnds[8] & 63 | 128;
    if (buf) {
      offset = offset || 0;
      if (offset < 0 || offset + 16 > buf.length) {
        throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
      }
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = rnds[i];
      }
      return buf;
    }
    return unsafeStringify(rnds);
  }
  var v4_default = v4;

  // node_modules/uuid/dist/sha1.js
  function f(s, x, y, z) {
    switch (s) {
      case 0:
        return x & y ^ ~x & z;
      case 1:
        return x ^ y ^ z;
      case 2:
        return x & y ^ x & z ^ y & z;
      case 3:
        return x ^ y ^ z;
    }
  }
  function ROTL(x, n) {
    return x << n | x >>> 32 - n;
  }
  function sha1(bytes) {
    const K = [1518500249, 1859775393, 2400959708, 3395469782];
    const H = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
    const newBytes = new Uint8Array(bytes.length + 1);
    newBytes.set(bytes);
    newBytes[bytes.length] = 128;
    bytes = newBytes;
    const l = bytes.length / 4 + 2;
    const N = Math.ceil(l / 16);
    const M = new Array(N);
    for (let i = 0; i < N; ++i) {
      const arr = new Uint32Array(16);
      for (let j = 0; j < 16; ++j) {
        arr[j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
      }
      M[i] = arr;
    }
    M[N - 1][14] = (bytes.length - 1) * 8 / 2 ** 32;
    M[N - 1][14] = Math.floor(M[N - 1][14]);
    M[N - 1][15] = (bytes.length - 1) * 8 & 4294967295;
    for (let i = 0; i < N; ++i) {
      const W = new Uint32Array(80);
      for (let t = 0; t < 16; ++t) {
        W[t] = M[i][t];
      }
      for (let t = 16; t < 80; ++t) {
        W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
      }
      let a = H[0];
      let b = H[1];
      let c = H[2];
      let d = H[3];
      let e = H[4];
      for (let t = 0; t < 80; ++t) {
        const s = Math.floor(t / 20);
        const T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
        e = d;
        d = c;
        c = ROTL(b, 30) >>> 0;
        b = a;
        a = T;
      }
      H[0] = H[0] + a >>> 0;
      H[1] = H[1] + b >>> 0;
      H[2] = H[2] + c >>> 0;
      H[3] = H[3] + d >>> 0;
      H[4] = H[4] + e >>> 0;
    }
    return Uint8Array.of(H[0] >> 24, H[0] >> 16, H[0] >> 8, H[0], H[1] >> 24, H[1] >> 16, H[1] >> 8, H[1], H[2] >> 24, H[2] >> 16, H[2] >> 8, H[2], H[3] >> 24, H[3] >> 16, H[3] >> 8, H[3], H[4] >> 24, H[4] >> 16, H[4] >> 8, H[4]);
  }
  var sha1_default = sha1;

  // node_modules/uuid/dist/v5.js
  function v5(value, namespace, buf, offset) {
    return v35(80, sha1_default, value, namespace, buf, offset);
  }
  v5.DNS = DNS;
  v5.URL = URL;
  var v5_default = v5;

  // src/utilities.js
  var detectGenFromFormat = (format) => {
    if (typeof format === "number") {
      return Math.max(format, 0);
    }
    const genFormatRegex = /^gen(10|\d)/i;
    if (!genFormatRegex.test(format)) {
      return null;
    }
    const gen = parseInt(format.match(genFormatRegex)[1], 10) || 0;
    if (gen < 1) {
      return null;
    }
    return gen;
  };
  var clonePlayerSideConditions = (conditions) => Object.entries(conditions || {}).reduce((prev, [key, value]) => {
    prev[key] = Array.isArray(value) ? [...value] : value;
    return prev;
  }, {});
  var formatId = (value) => value?.toString?.().normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  var sanitizePlayerSide = (player, battleSide) => {
    const {
      selectionIndex,
      pokemon: playerPokemon,
      side
    } = player || {};
    const currentPokemon = playerPokemon?.length && selectionIndex > -1 ? playerPokemon[selectionIndex] : null;
    const sideConditions = battleSide?.sideConditions || side?.conditions || {};
    const sideConditionNames = Object.keys(sideConditions).map((condition) => formatId(condition)).filter(Boolean);
    const volatileNames = Object.keys(currentPokemon?.volatiles || {}).map((volatile) => formatId(volatile)).filter(Boolean);
    return {
      spikes: sideConditionNames.includes("spikes") && sideConditions.spikes?.[1] || 0,
      isReflect: sideConditionNames.includes("reflect"),
      isLightScreen: sideConditionNames.includes("lightscreen"),
      isProtected: volatileNames.includes("protect"),
      isSeeded: volatileNames.includes("leechseed"),
      isForesight: volatileNames.includes("foresight"),
      isSwitching: currentPokemon?.active ? "out" : "in"
    };
  };
  var nonEmptyObject = (object) => {
    if (typeof object !== "object") {
      return false;
    }
    if (Array.isArray(object)) {
      return !!obj.length;
    }
    return !!Object.keys(object || {}).length;
  };
  var serializePayload = (payload) => Object.entries(payload || {}).map(([key, value]) => `${key}:${(typeof value === "object" ? JSON.stringify(value) : String(value)) ?? "???"}`).join("|");
  var calcToolsId = (payload) => {
    const serialized = nonEmptyObject(payload) ? serializePayload(payload) : ["string", "number", "boolean"].includes(typeof payload) ? String(payload) : null;
    if (!serialized) {
      return null;
    }
    return v5_default(
      serialized?.replace(/[^A-Z0-9\x20~`!@#$%^&*()+\-_=\[\]{}<>\|:;,\.'"\/\\]/gi, ""),
      nil_default
    );
  };
  var sanitizeVolatiles = (pokemon) => Object.entries(pokemon?.volatiles || {}).reduce((volatiles, [id, volatile]) => {
    const [, value, ...rest] = volatile || [];
    const transformed = formatId(id) === "transform" && typeof value?.speciesForme === "string";
    if (transformed || !value || ["string", "number"].includes(typeof value)) {
      volatiles[id] = transformed ? [
        id,
        value.speciesForme,
        ...rest
      ] : volatile;
    }
    return volatiles;
  }, {});
  var calcPokemonToolsNonce = (pokemon) => calcToolsId({
    ident: pokemon?.ident,
    name: pokemon?.name,
    speciesForme: pokemon?.speciesForme,
    hp: pokemon?.hp?.toString(),
    maxhp: pokemon?.maxhp?.toString(),
    level: pokemon?.level?.toString(),
    gender: pokemon?.gender,
    ability: pokemon?.ability,
    baseAbility: pokemon?.baseAbility,
    nature: !!pokemon?.speciesForme && "nature" in pokemon && pokemon.nature || null,
    types: !!pokemon?.speciesForme && "types" in pokemon && pokemon.types?.join("|") || null,
    item: pokemon?.item,
    itemEffect: pokemon?.itemEffect,
    prevItem: pokemon?.prevItem,
    prevItemEffect: pokemon?.prevItemEffect,
    ivs: !!pokemon?.speciesForme && "ivs" in pokemon && calcToolsId(pokemon.ivs) || null,
    evs: !!pokemon?.speciesForme && "evs" in pokemon && calcToolsId(pokemon.evs) || null,
    status: pokemon?.status,
    statusData: calcToolsId(pokemon?.statusData),
    statusStage: pokemon?.statusStage?.toString(),
    volatiles: calcToolsId(sanitizeVolatiles(pokemon)),
    turnstatuses: calcToolsId(pokemon?.turnstatuses),
    sleepCounter: !!pokemon?.speciesForme && "sleepCounter" in pokemon && pokemon.sleepCounter?.toString() || nonEmptyObject(pokemon?.statusData) && pokemon.statusData.sleepTurns?.toString() || null,
    toxicCounter: !!pokemon?.speciesForme && "toxicCounter" in pokemon && pokemon.toxicCounter?.toString() || nonEmptyObject(pokemon?.statusData) && pokemon.statusData.toxicTurns?.toString() || null,
    hitCounter: !!pokemon?.speciesForme && "hitCounter" in pokemon && pokemon.hitCounter?.toString() || !!pokemon?.speciesForme && "timesAttacked" in pokemon && pokemon.timesAttacked?.toString() || null,
    faintCounter: !!pokemon?.speciesForme && "faintCounter" in pokemon && pokemon.faintCounter?.toString() || null,
    moves: pokemon?.moves?.join(";"),
    moveTrack: calcToolsId(pokemon?.moveTrack?.map((track) => track?.join(":"))?.join(";")),
    revealedMoves: !!pokemon?.speciesForme && "revealedMoves" in pokemon && calcToolsId(pokemon.revealedMoves) || null,
    boosts: calcToolsId(pokemon?.boosts),
    baseStats: !!pokemon?.speciesForme && "baseStats" in pokemon && calcToolsId(pokemon.baseStats) || null,
    spreadStats: !!pokemon?.speciesForme && "spreadStats" in pokemon && calcToolsId(pokemon.spreadStats) || null,
    criticalHit: !!pokemon?.speciesForme && "criticalHit" in pokemon && pokemon.criticalHit?.toString() || null
  });
  var calcSideToolsNonce = (side) => calcToolsId({
    id: side?.id,
    sideid: side?.sideid,
    name: side?.name,
    rating: side?.rating,
    totalPokemon: side?.totalPokemon?.toString(),
    active: side?.active?.map((mon) => calcPokemonToolsNonce(mon)).join(";"),
    pokemon: side?.pokemon?.map((mon) => calcPokemonToolsNonce(mon)).join(";"),
    sideConditions: Object.keys(side?.sideConditions || {}).join(";")
  });
  var calcBattleToolsNonce = (battle, request, battleState) => {
    const stepQueue = battle?.stepQueue?.filter?.((step) => !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step)) || [];
    return calcToolsId({
      id: battle?.id,
      gen: battle?.gen?.toString(),
      tier: battle?.tier,
      gameType: battle?.gameType,
      paused: String(!!battle?.paused),
      ended: String(!!battle?.ended),
      myPokemon: battle?.myPokemon?.length ? calcToolsId(
        battle.myPokemon.map((pokemon) => calcPokemonToolsNonce(pokemon)).join(";") || "empty"
      ) : null,
      mySide: calcSideToolsNonce(battle?.mySide),
      nearSide: calcSideToolsNonce(battle?.nearSide),
      p1: calcSideToolsNonce(battle?.p1),
      p2: calcSideToolsNonce(battle?.p2),
      stepQueue: calcToolsId(stepQueue.join(";")),
      rqid: request?.rqid?.toString(),
      requestType: request?.requestType,
      side: request?.side?.id,
      smogonChaos: !!battleState?.smogonChaos,
      smogonLeads: !!battleState?.smogonLeads
    });
  };
  var getDexForFormat = (format) => {
    if (typeof Dex === "undefined") {
      console.warn("[Gen 3 OU Tools] The global Dex is not available for this format:", format);
      return null;
    }
    if (!format) {
      return Dex;
    }
    if (typeof format === "number") {
      return format > 0 ? Dex.forGen(format) : Dex;
    }
    const formatAsId = formatId(format);
    const gen = detectGenFromFormat(formatAsId);
    if (typeof gen !== "number" || gen < 1) {
      return Dex;
    }
    return Dex.forGen(gen);
  };
  var parsePokemonDetails = (details) => {
    if (!details) {
      return null;
    }
    const [speciesForme] = details.split(", ");
    if (!speciesForme) {
      return null;
    }
    return { speciesForme };
  };
  var similarPokemon = (pokemonA, pokemonB, config) => {
    if (!pokemonA?.details || !pokemonB?.details) {
      return false;
    }
    const { details: detailsA } = pokemonA;
    const { details: detailsB } = pokemonB;
    const { format } = config || {};
    const dex = getDexForFormat(format);
    const { speciesForme: speciesA } = parsePokemonDetails(detailsA);
    const dexA = dex.species.get(speciesA);
    const formeA = dexA?.exists && dexA.baseSpecies || null;
    if (!formeA) {
      return false;
    }
    const { speciesForme: speciesB } = parsePokemonDetails(detailsB);
    const dexB = dex.species.get(speciesB);
    const formeB = dexB?.exists && dexB.baseSpecies || null;
    if (!formeB) {
      return false;
    }
    return formeA === formeB;
  };
  var detectPokemonIdent = (pokemon) => [
    "side" in (pokemon || {}) && pokemon.side?.sideid || pokemon?.searchid?.split?.(":")[0] || pokemon?.ident?.split?.(":")[0],
    pokemon?.speciesForme || pokemon?.details?.split?.(", ")?.[0] || pokemon?.searchid?.split?.("|")[1] || pokemon?.ident?.split?.(": ")[1] || pokemon?.name
  ].filter(Boolean).join(": ") || pokemon?.ident || pokemon?.searchid?.split?.("|")[0] || null;
  var detectPlayerKeyFromPokemon = (pokemon) => {
    if (pokemon?.playerKey) {
      return pokemon.playerKey;
    }
    const ident = detectPokemonIdent(pokemon);
    if (!ident) {
      return null;
    }
    return /^(p\d)[a-z]?:/.exec(ident)?.[1];
  };
  var getAuthUsername = () => window.app.user?.attributes?.name || null;
  var detectAuthPlayerKeyFromBattle = (battle) => {
    const detectedPlayerKey = detectPlayerKeyFromPokemon(battle?.myPokemon?.[0]);
    if (detectedPlayerKey) {
      return detectedPlayerKey;
    }
    const authName = getAuthUsername();
    if (!authName) {
      return null;
    }
    return battle?.sides?.find?.((side) => "name" in (side || {}) && [
      side.id,
      side.name
    ].filter(Boolean).includes(authName))?.sideid || null;
  };
  var cloneField = (field) => {
    const output = {
      ...field
    };
    if ("attackerSide" in output) {
      delete output.attackerSide;
    }
    if ("defenderSide" in output) {
      delete output.defenderSide;
    }
    return output;
  };
  var WEATHER_MAP = {
    raindance: "Rain",
    sandstorm: "Sand",
    sunnyday: "Sun",
    hail: "Hail"
  };
  var sanitizeField = (battle) => {
    const { weather } = battle || {};
    const sanitizedField = {
      weather: WEATHER_MAP[weather] || null,
      attackerSide: null,
      defenderSide: null
    };
    return sanitizedField;
  };
  var syncField = (state, battle) => {
    if (!nonEmptyObject(state?.field) || !battle?.p1) {
      console.warn(
        "[Gen 3 OU Tools] The field or battle is invalid.",
        "\nbattleState.field:",
        state.field,
        "\nbattle:",
        battle
      );
      return state?.field;
    }
    const newField = cloneField(state.field);
    const updatedField = sanitizeField(battle);
    Object.keys(updatedField).forEach((key) => {
      if (["attackerSide", "defenderSide"].includes(key)) {
        return;
      }
      const value = updatedField?.[key];
      const originalValue = state.field?.[key];
      if (JSON.stringify(value) === JSON.stringify(originalValue)) {
        return;
      }
      newField[key] = value;
    });
    newField.autoWeather = null;
    return newField;
  };
  var calcPokemonToolsId = (pokemon, playerKey) => calcToolsId({
    ident: [
      playerKey || pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),
      v4_default()
    ].filter(Boolean).join(": "),
    speciesForme: pokemon?.speciesForme
  });
  var diffArrays = (arrayA, arrayB) => {
    if (!Array.isArray(arrayA) || !Array.isArray(arrayB)) {
      return null;
    }
    if (!arrayA.length && !arrayB.length) {
      return [];
    }
    if (arrayA.length && !arrayB.length) {
      return [...arrayA];
    }
    if (!arrayA.length && arrayB.length) {
      return [...arrayB];
    }
    const diffIndexFilter = (source, target) => (sourceIndex) => !target.some((value) => value === source[sourceIndex]);
    const diffIndicesA = arrayA.map((_, index) => index).filter(diffIndexFilter(arrayA, arrayB));
    const diffIndicesB = arrayB.map((_, index) => index).filter(diffIndexFilter(arrayB, arrayA));
    return [
      ...diffIndicesA.map((index) => arrayA[index]),
      ...diffIndicesB.map((index) => arrayB[index])
    ];
  };
  var detectSpeciesForme = (pokemon) => pokemon?.speciesForme || pokemon?.details?.split?.(", ")[0] || pokemon?.searchid?.split?.("|")[1] || pokemon?.ident?.split?.(": ")[1];
  var populateStatsTable = (stats, config) => {
    const { spread } = config || {};
    const output = ["hp", "atk", "def", "spa", "spd", "spe"].reduce((prev, stat) => {
      prev[stat] = null;
      return prev;
    }, {});
    if (!nonEmptyObject(stats)) {
      return output;
    }
    const max = spread === "ev" ? 252 : 31;
    Object.entries(stats).forEach(([
      stat,
      rawValue
    ]) => {
      const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
      if (Number.isNaN(value)) {
        return;
      }
      output[stat] = Math.max(Math.min(value, max ?? value), 0);
    });
    return output;
  };
  var getDexMoveTrack = (dex, moveTrack, transformed) => moveTrack?.filter((track) => Array.isArray(track) && typeof track[0] === "string" && !!track[0] && (transformed ? track[0].startsWith("*") : !track[0].startsWith("*"))).map(([moveName, ppUsed]) => [
    dex.moves.get(moveName?.replace("*", "")),
    ppUsed || 0
  ]).filter(([move]) => move?.exists && !!move.name);
  var sanitizeMoveTrack = (pokemon, format) => {
    const dex = getDexForFormat(format);
    const output = {
      moveTrack: [],
      revealedMoves: [],
      transformedMoves: []
    };
    if (!dex || !pokemon?.moveTrack?.length) {
      return output;
    }
    const { moveTrack } = pokemon;
    const dexMoveTrack = getDexMoveTrack(dex, moveTrack, false);
    const dexTransformedMoveTrack = getDexMoveTrack(dex, moveTrack, true);
    if (!dexMoveTrack.length && !dexTransformedMoveTrack.length) {
      return output;
    }
    output.moveTrack = dexMoveTrack.map(([move, ppUsed]) => [
      move.name,
      ppUsed
    ]);
    output.transformedMoves = dexTransformedMoveTrack.map(([move]) => move.name);
    output.revealedMoves = dexMoveTrack.map(([move]) => move.name);
    return output;
  };
  var similarArrays = (...args) => {
    if (args.length < 2) {
      return false;
    }
    const diff = diffArrays(...args);
    if (!Array.isArray(diff)) {
      return false;
    }
    return !diff.length;
  };
  var sanitizePokemon = (pokemon, format) => {
    const dex = getDexForFormat(format);
    const gen = detectGenFromFormat(format);
    const typeChanged = !!pokemon?.volatiles?.typechange?.[1];
    const transformed = !!pokemon?.volatiles?.transform?.[1];
    const sanitizedPokemon = {
      toolsId: pokemon?.toolsId || null,
      source: pokemon?.source || null,
      playerKey: pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),
      slot: pokemon?.slot ?? null,
      ident: detectPokemonIdent(pokemon),
      name: pokemon?.name || null,
      details: pokemon?.details || null,
      searchid: pokemon?.searchid || null,
      active: pokemon?.active || false,
      speciesForme: detectSpeciesForme(pokemon)?.replace("-*", "") || null,
      transformedForme: (transformed ? typeof pokemon.volatiles.transform[1] === "object" ? pokemon.volatiles.transform[1]?.speciesForme : pokemon.volatiles.transform[1] : null) || null,
      level: pokemon?.level || 0,
      transformedLevel: pokemon?.transformedLevel || null,
      gender: pokemon?.gender || "N",
      shiny: pokemon?.shiny || false,
      types: (typeChanged ? pokemon.volatiles.typechange[1].split("/") : pokemon?.types) || [],
      hp: pokemon?.hp ?? 100,
      maxhp: pokemon?.maxhp || 100,
      fainted: !pokemon?.hp,
      baseAbility: pokemon?.baseAbility?.replace(/no\s?ability/i, ""),
      ability: pokemon?.ability || null,
      abilityToggled: pokemon?.abilityToggled || false,
      abilities: pokemon?.abilities || [],
      transformedAbilities: pokemon?.transformedAbilities || [],
      item: !!pokemon?.item && dex.items.get(pokemon.item.replace("(exists)", ""))?.name || null,
      itemEffect: pokemon?.itemEffect || null,
      prevItem: pokemon?.prevItem || null,
      prevItemEffect: pokemon?.prevItemEffect || null,
      nature: pokemon?.nature || null,
      ivs: populateStatsTable(pokemon?.ivs, { spread: "iv", format }),
      evs: populateStatsTable(pokemon?.evs, { spread: "ev", format }),
      boosts: ["atk", "def", "spa", "spd", "spe"].reduce((table, stat) => {
        const boosts = pokemon?.boosts;
        const raw = boosts?.[stat] ?? 0;
        table[stat] = Math.max(Math.min(raw, 6), -6);
        return table;
      }, {}),
      // I've gotten rid of Autoboostmap here
      transformedBaseStats: pokemon?.transformedBaseStats || null,
      serverStats: pokemon?.serverStats || null,
      status: !!pokemon?.hp && pokemon?.status || null,
      turnstatuses: Object.entries(pokemon?.turnstatuses || {}).reduce((prev, [effectId, effectState]) => ({
        ...prev,
        ...Array.isArray(effectState) && { [effectId]: [...effectState] }
      }), {}),
      chainMove: pokemon?.chainMove || null,
      chainCounter: pokemon?.chainCounter || 0,
      sleepCounter: pokemon?.sleepCounter || pokemon?.statusData?.sleepTurns || 0,
      toxicCounter: pokemon?.toxicCounter || pokemon?.statusData?.toxicTurns || 0,
      hitCounter: pokemon?.hitCounter || pokemon?.timesAttacked || 0,
      faintCounter: pokemon?.faintCounter || 0,
      criticalHit: pokemon?.criticalHit || false,
      lastMove: pokemon?.lastMove || null,
      moves: [...pokemon?.moves || []],
      serverMoves: pokemon?.serverMoves || [],
      transformedMoves: pokemon?.transformedMoves || [],
      ...sanitizeMoveTrack(pokemon, format),
      volatiles: sanitizeVolatiles(pokemon)
    };
    const species = dex.species.get(sanitizedPokemon.speciesForme);
    sanitizedPokemon.baseStats = { ...species?.baseStats };
    const transformedSpecies = sanitizedPokemon.transformedForme ? dex.species.get(sanitizedPokemon.transformedForme) : null;
    if (nonEmptyObject(transformedSpecies?.baseStats)) {
      sanitizedPokemon.transformedBaseStats = { ...transformedSpecies.baseStats };
      if ("hp" in sanitizedPokemon.transformedBaseStats) {
        delete sanitizedPokemon.transformedBaseStats.hp;
      }
    }
    const speciesTypes = (transformedSpecies || species)?.types;
    if (!typeChanged && speciesTypes?.length) {
      sanitizedPokemon.types = [...speciesTypes];
    }
    sanitizedPokemon.abilities = [...Object.values(species?.abilities || {})].filter((ability) => !!ability && formatId(ability) !== "noability");
    sanitizedPokemon.transformedAbilities = [...Object.values(transformedSpecies?.abilities || {})].filter((ability) => !!ability && formatId(ability) !== "noability");
    const abilitiesSource = sanitizedPokemon.transformedAbilities.length ? sanitizedPokemon.transformedAbilities : sanitizedPokemon.abilities;
    if (!sanitizedPokemon?.toolsId) {
      sanitizedPokemon.toolsId = calcPokemonToolsId(sanitizedPokemon);
    }
    return sanitizedPokemon;
  };
  var clonePokemon = (pokemon) => {
    const output = { ...pokemon };
    if (Array.isArray(output.types)) {
      output.types = [...output.types];
    }
    if (Array.isArray(output.abilities)) {
      output.abilities = [...output.abilities];
    }
    if (Array.isArray(output.transformedAbilities)) {
      output.transformedAbilities = [...output.transformedAbilities];
    }
    if (nonEmptyObject(output.ivs)) {
      output.ivs = { ...output.ivs };
    }
    if (nonEmptyObject(output.evs)) {
      output.evs = { ...output.evs };
    }
    if (Array.isArray(output.moves)) {
      output.moves = [...output.moves];
    }
    if (Array.isArray(output.serverMoves)) {
      output.serverMoves = [...output.serverMoves];
    }
    if (Array.isArray(output.transformedMoves)) {
      output.transformedMoves = [...output.transformedMoves];
    }
    if (Array.isArray(output.moveTrack)) {
      output.moveTrack = output.moveTrack.map((track) => [...track]);
    }
    if (Array.isArray(output.revealedMoves)) {
      output.revealedMoves = [...output.revealedMoves];
    }
    if (nonEmptyObject(output.boosts)) {
      output.boosts = { ...output.boosts };
    }
    if (nonEmptyObject(output.baseStats)) {
      output.baseStats = { ...output.baseStats };
    }
    if (nonEmptyObject(output.transformedBaseStats)) {
      output.transformedBaseStats = { ...output.transformedBaseStats };
    }
    if (nonEmptyObject(output.serverStats)) {
      output.serverStats = { ...output.serverStats };
    }
    if (nonEmptyObject(output.spreadStats)) {
      output.spreadStats = { ...output.spreadStats };
    }
    return output;
  };
  var Pokemon_Nature_Boosts = {
    Adamant: ["atk", "spa"],
    Bashful: [],
    Bold: ["def", "atk"],
    Brave: ["atk", "spe"],
    Calm: ["spd", "atk"],
    Careful: ["spd", "spa"],
    Docile: [],
    Gentle: ["spd", "def"],
    Hardy: [],
    Hasty: ["spe", "def"],
    Impish: ["def", "spa"],
    Jolly: ["spe", "spa"],
    Lax: ["def", "spd"],
    Lonely: ["atk", "def"],
    Mild: ["spa", "def"],
    Modest: ["spa", "atk"],
    Naive: ["spe", "spd"],
    Naughty: ["atk", "spd"],
    Quiet: ["spa", "spe"],
    Quirky: [],
    Rash: ["spa", "spd"],
    Relaxed: ["def", "spe"],
    Sassy: ["spd", "spe"],
    Serious: [],
    Timid: ["spe", "atk"]
  };
  var tr = (num, bits = 0) => bits ? (num >>> 0) % 2 ** bits : num >>> 0;
  var calcPokemonStat = (format, stat, base, iv, ev, level, nature) => {
    const gen = typeof format === "string" ? detectGenFromFormat(format) : format;
    const actualIv = Math.max(iv, 0);
    const actualEv = Math.max(ev, 0);
    const actualLevel = Math.max(Math.min(level, 100), 0);
    if (stat === "hp") {
      if (base === 1) {
        return base;
      }
      return tr((2 * base + actualIv + tr(actualEv / 4)) * actualLevel / 100) + actualLevel + 10;
    }
    const value = tr((2 * base + actualIv + tr(actualEv / 4)) * actualLevel / 100) + 5;
    if (nature && nature in Pokemon_Nature_Boosts) {
      const [
        plus,
        minus
      ] = Pokemon_Nature_Boosts[nature];
      if (plus && stat === plus) {
        return tr(tr(value * 110, 16) / 100);
      }
      if (minus && stat === minus) {
        return tr(tr(value * 90, 16) / 100);
      }
    }
    return value;
  };
  var calcPokemonSpreadStats = (format, pokemon) => {
    if (!nonEmptyObject(pokemon?.baseStats)) {
      return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    }
    return ["hp", "atk", "def", "spa", "spd", "spe"].reduce((prev, stat) => {
      const baseStat = (pokemon.transformedForme && stat !== "hp" ? pokemon.transformedBaseStats : pokemon.baseStats)?.[stat];
      prev[stat] = calcPokemonStat(
        format,
        stat,
        baseStat,
        pokemon.ivs?.[stat],
        pokemon.evs?.[stat],
        stat !== "hp" && pokemon.transformedLevel || (pokemon.level ?? 100),
        pokemon.nature
      );
      return prev;
    }, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  };
  var syncPokemon = (pokemon, config) => {
    const {
      format,
      clientPokemon,
      serverPokemon
    } = config || {};
    const dex = getDexForFormat(format);
    const gen = detectGenFromFormat(format);
    const syncedPokemon = clonePokemon(pokemon);
    if (!syncedPokemon.source && clientPokemon?.speciesForme) {
      syncedPokemon.source = "client";
    }
    [
      "name",
      "speciesForme",
      "hp",
      "maxhp",
      "status",
      "statusData",
      "timesAttacked",
      "ability",
      "baseAbility",
      "item",
      "itemEffect",
      "prevItem",
      "prevItemEffect",
      "moves",
      "lastMove",
      "moveTrack",
      "volatiles",
      "turnstatuses",
      "boosts"
    ].forEach((key) => {
      const prevValue = syncedPokemon[key];
      let value = clientPokemon?.[key];
      if (value === void 0) {
        return;
      }
      switch (key) {
        case "name": {
          break;
        }
        case "speciesForme": {
          value = value.replace("-*", "");
          if (prevValue === value) {
            return;
          }
          const updatedSpecies = dex.species.get(value);
          syncedPokemon.types = [
            ...updatedSpecies?.types || syncedPokemon.types || []
          ];
          if (nonEmptyObject(updatedSpecies?.abilities)) {
            syncedPokemon.abilities = [
              ...Object.values(updatedSpecies.abilities)
            ];
          }
          break;
        }
        case "hp":
        case "maxhp": {
          if (typeof serverPokemon?.hp === "number" && typeof serverPokemon.maxhp === "number") {
            return;
          }
          break;
        }
        case "status": {
          if (!syncedPokemon.hp) {
            value = null;
          }
          break;
        }
        case "statusData": {
          const statusData = value;
          if (typeof statusData?.sleepTurns === "number" && statusData.sleepTurns > -1) {
            syncedPokemon.sleepCounter = statusData.sleepTurns;
          }
          if (typeof statusData?.toxicTurns === "number" && statusData.toxicTurns > -1) {
            syncedPokemon.toxicCounter = statusData.toxicTurns;
          }
          return;
        }
        case "timesAttacked": {
          if (typeof value === "number" && value > -1) {
            syncedPokemon.hitCounter = value;
          }
          return;
        }
        case "ability": {
          if (!value || /^\([\w\s]+\)$/.test(value) || formatId(value) === "noability") {
            return;
          }
          break;
        }
        case "item": {
          if ((!value || formatId(value) === "exists") && !clientPokemon?.prevItem) {
            return;
          }
          value = dex?.items.get(value)?.name || value;
          break;
        }
        case "prevItem": {
          break;
        }
        case "boosts": {
          value = ["atk", "def", "spa", "spd", "spe"].reduce((prev, stat) => {
            const prevBoost = prev[stat];
            const boost = clientPokemon?.boosts?.[stat] || 0;
            if (boost !== prevBoost) {
              prev[stat] = boost;
            }
            return prev;
          }, {
            atk: syncedPokemon.boosts?.atk || 0,
            def: syncedPokemon.boosts?.def || 0,
            spa: syncedPokemon.boosts?.spa || 0,
            spd: syncedPokemon.boosts?.spd || 0,
            spe: syncedPokemon.boosts?.spe || 0
          });
          break;
        }
        case "lastMove": {
          if (!value) {
            break;
          }
          const dexMove = dex.moves.get(value);
          if (dexMove?.exists) {
            value = dexMove.name;
          }
          break;
        }
        case "moveTrack": {
          const {
            moveTrack,
            revealedMoves,
            transformedMoves
          } = sanitizeMoveTrack(clientPokemon, format);
          value = moveTrack;
          if (syncedPokemon.source === "server") {
            break;
          }
          syncedPokemon.revealedMoves = revealedMoves;
          syncedPokemon.transformedMoves = transformedMoves;
          break;
        }
        case "volatiles": {
          const volatiles = value;
          const changedTypes = (
            // e.g., 'Psychic/Ice' -> ['Psychic', 'Ice']
            "typechange" in volatiles && volatiles.typechange[1]?.split?.("/") || []
          );
          if (changedTypes.length) {
            syncedPokemon.types = [...changedTypes];
          }
          const resetTypes = "typechange" in syncedPokemon.volatiles && !changedTypes.length && dex.species.get(syncedPokemon.speciesForme)?.types || [];
          if (resetTypes?.length) {
            syncedPokemon.types = [...resetTypes];
          }
          const addedType = "typeadd" in volatiles && volatiles.typeadd?.[1] || null;
          if (addedType && !syncedPokemon.types.includes(addedType)) {
            syncedPokemon.types.push(addedType);
          }
          const transformedPokemon = "transform" in volatiles && volatiles.transform?.[1] || null;
          const transformedForme2 = transformedPokemon?.speciesForme;
          syncedPokemon.transformedForme = transformedForme2 || null;
          syncedPokemon.transformedLevel = transformedPokemon?.level || null;
          const formeChange = "formechange" in volatiles && volatiles.formechange?.[1] || null;
          const dexForme = formeChange ? dex.species.get(formeChange) : null;
          if (!transformedForme2 && formeChange) {
            syncedPokemon.speciesForme = formeChange;
            if (dexForme?.types?.length) {
              syncedPokemon.types = [...dexForme.types];
            }
          }
          value = sanitizeVolatiles(clientPokemon);
          break;
        }
        default: {
          break;
        }
      }
      const stringifiedValue = JSON.stringify(value);
      if (stringifiedValue === JSON.stringify(prevValue)) {
        return;
      }
      syncedPokemon[key] = typeof value === "object" ? JSON.parse(stringifiedValue) : value;
    });
    if (serverPokemon?.ident) {
      syncedPokemon.source = "server";
      if (typeof serverPokemon.hp === "number" && typeof serverPokemon.maxhp === "number") {
        syncedPokemon.hp = serverPokemon.hp;
        if (serverPokemon.hp || serverPokemon.maxhp !== 100) {
          syncedPokemon.maxhp = serverPokemon.maxhp;
        }
      }
      const serverAbility = serverPokemon.ability || serverPokemon.baseAbility;
      if (serverAbility) {
        const dexAbility = dex.abilities.get(serverAbility);
        if (dexAbility?.name) {
          syncedPokemon.ability = dexAbility.name;
        }
      }
      if (serverPokemon.item) {
        const dexItem = dex.items.get(serverPokemon.item);
        if (dexItem?.exists && dexItem.name) {
          syncedPokemon.item = dexItem.name;
        }
      }
      if (!nonEmptyObject(syncedPokemon.serverStats) && nonEmptyObject(serverPokemon.stats)) {
        syncedPokemon.serverStats = {
          ...serverPokemon.stats,
          hp: serverPokemon.maxhp
        };
        if (!serverPokemon.hp && serverPokemon.maxhp === 100) {
          syncedPokemon.serverStats.hp = 0;
        }
      }
      const serverMoves = serverPokemon.moves?.map((id) => dex.moves.get(id)?.name).filter(Boolean);
      const shouldUpdateServerMoves = !!serverMoves?.length && !syncedPokemon.serverMoves?.length && !syncedPokemon.transformedForme;
      if (shouldUpdateServerMoves) {
        syncedPokemon.serverMoves = [...serverMoves];
      }
      syncedPokemon.transformedMoves = [...serverMoves?.length && syncedPokemon.transformedForme ? serverMoves : []];
    }
    if (syncedPokemon.item && formatId(syncedPokemon.itemEffect) === "knockedoff") {
      syncedPokemon.prevItem = syncedPokemon.item;
      syncedPokemon.prevItemEffect = syncedPokemon.itemEffect;
      syncedPokemon.item = null;
      syncedPokemon.itemEffect = null;
    }
    const {
      transformedForme,
      abilities,
      transformedAbilities,
      baseStats,
      transformedBaseStats
    } = sanitizePokemon(syncedPokemon, format);
    const shouldUpdateAbilities = Array.isArray(abilities) && !similarArrays(abilities, syncedPokemon.abilities);
    if (shouldUpdateAbilities) {
      syncedPokemon.abilities = [...abilities];
    }
    const shouldUpdateTransformedAbilities = Array.isArray(transformedAbilities) && !similarArrays(transformedAbilities, syncedPokemon.transformedAbilities);
    if (shouldUpdateTransformedAbilities) {
      syncedPokemon.transformedAbilities = [...transformedAbilities];
    }
    if (nonEmptyObject(baseStats)) {
      syncedPokemon.baseStats = { ...baseStats };
    }
    syncedPokemon.transformedBaseStats = transformedForme && nonEmptyObject(transformedBaseStats) && { ...transformedBaseStats } || null;
    if (!transformedForme) {
      syncedPokemon.transformedMoves = [];
    }
    if (syncedPokemon.transformedMoves?.length) {
      syncedPokemon.moves = [...syncedPokemon.transformedMoves];
    }
    syncedPokemon.moves = [...syncedPokemon.moves];
    syncedPokemon.spreadStats = calcPokemonSpreadStats(format, syncedPokemon);
    return syncedPokemon;
  };

  // src/ToolsRenderer.js
  var ToolsDomRenderer = (element, props) => {
    if (!element || !props?.state) {
      return;
    }
    element.innerHTML = `
    <div id="tools-container" class="tools-panel" style="font-size: 9px">
      <h3>Gen 3 OU Tools</h3>
      <pre>${props.state.opponentTeam}</pre>
      <hr>
      <pre>${props.state.prediction}</pre>
      <hr>
      <pre>${JSON.stringify(props.state, null, 2)}</pre>
    </div>
  `;
  };

  // src/syncBattle.js
  function syncBattle(battle, request) {
    const {
      id: battleId,
      nonce: battleNonce,
      gen,
      gameType,
      turn,
      paused,
      ended,
      myPokemon,
      speciesClause,
      stepQueue
    } = battle || {};
    if (!battleId) {
      throw new Error("Attempted to sync a battle instance with an invalid battleId.");
    }
    if (this.battleState.battleNonce && this.battleState.battleNonce === battleNonce) {
      console.debug(
        "[Gen 3 OU Tools] Skipping sync due to matching nonce.",
        "\nbattleId:",
        battleId,
        "\nbattleNonce:",
        battleNonce,
        "\nbattle:",
        battle,
        "\nbattleState:",
        this.battleState
      );
      return;
    }
    if (typeof gen === "number" && gen > 0) {
      this.toolsState.gen = gen;
    }
    if (this.battleState.active && typeof ended === "boolean" && ended) {
      this.toolsState.active = false;
    }
    if (typeof paused === "boolean" || typeof ended === "boolean") {
      this.toolsState.paused = paused || ended;
    }
    this.toolsState.gameType = gameType === "singles" ? "singles" : "doubles";
    this.toolsState.turn = Math.max(turn || 0, 0);
    this.toolsState.authPlayerKey = detectAuthPlayerKeyFromBattle(battle);
    const detectedPlayerKey = this.battleState.authPlayerKey;
    if (detectedPlayerKey) {
      this.toolsState.playerKey = detectedPlayerKey;
      this.toolsState.opponentKey = this.battleState.playerKey === "p1" ? "p2" : "p1";
    }
    this.toolsState.switchPlayers = battle.viewpointSwitched ?? battle.sidesSwitched;
    const syncedField = syncField(this.battleState, battle);
    if (!syncedField) {
      console.warn(
        "[Gen 3 OU Tools] Could not sync the field.",
        "\nbattleId:",
        battleId,
        "\nsyncedField:",
        syncedField,
        "\nbattleState.field:",
        this.battleState.field,
        "\nbattle:",
        battle,
        "\nbattleState:",
        this.battleState
      );
    } else {
      this.toolsState.field = syncedField;
    }
    const futureMutations = {
      p1: [],
      p2: []
    };
    for (const playerKey of ["p1", "p2"]) {
      if (!(playerKey in battle) || battle[playerKey]?.sideid !== playerKey) {
        continue;
      }
      const player = battle[playerKey];
      const playerState = this.toolsState[playerKey];
      if (player.name && playerState.name !== player.name) {
        playerState.name = player.name;
      }
      if (player.rating && playerState.rating !== player.rating) {
        playerState.rating = player.rating;
      }
      if (!playerState.active) {
        playerState.active = true;
      }
      const isMyPokemonSide = !!this.battleState.playerKey && playerKey === this.battleState.playerKey;
      const hasMyPokemon = !!myPokemon?.length;
      if ((!isMyPokemonSide || !hasMyPokemon) && (!Array.isArray(player.pokemon) || !player.pokemon.length)) {
        console.debug(
          "[Gen 3 OU Tools] Skipping Pokemon sync because no Pokemon were found.",
          "\nplayer:",
          playerKey,
          ...isMyPokemonSide ? ["\nmyPokemon:", myPokemon] : [],
          "\nbattle.pokemon:",
          player.pokemon,
          "\nbattleState.pokemon:",
          playerState.pokemon,
          "\nbattleId:",
          battleId,
          "\nbattle:",
          battle,
          "\nbattleState:",
          this.battleState
        );
        continue;
      }
      const maxPokemon = Math.max(player?.totalPokemon || 0, 6);
      if (playerState.maxPokemon !== maxPokemon) {
        playerState.maxPokemon = maxPokemon;
      }
      const initialPokemon = (this.battleState.active && isMyPokemonSide && this.battleState.authPlayerKey === playerKey ? myPokemon : player.pokemon) || [];
      const currentOrder = initialPokemon.map((pokemon) => {
        const clientSourced = "getIdent" in pokemon;
        if (!pokemon.toolsId) {
          pokemon.toolsId = isMyPokemonSide && !!pokemon.details && [
            ...myPokemon || [],
            ...player.pokemon || [],
            ...playerState.pokemon || []
          ].find((existingPokemon) => !!existingPokemon?.toolsId && !!existingPokemon.details && similarPokemon(pokemon, existingPokemon, {
            format: this.battleState.format
          }))?.toolsId || calcPokemonToolsId(pokemon, playerKey);
          console.debug(
            "[Gen 3 OU Tools] Assigned toolsId.",
            "\nsource:",
            clientSourced ? "client" : "server",
            "\nspeciesForme:",
            pokemon.speciesForme,
            "\nplayer:",
            playerKey,
            "\nisMyPokemonSide:",
            isMyPokemonSide,
            "\nhasMyPokemon:",
            hasMyPokemon,
            "\ntoolsId:",
            pokemon.toolsId,
            "\npokemon:",
            pokemon,
            "\nbattleId:",
            battleId,
            "\nbattle:",
            battle,
            "\nbattleState:",
            this.battleState
          );
        }
        if (isMyPokemonSide && hasMyPokemon && !clientSourced) {
          const clientPokemon = player.pokemon.find((clientPokemon2) => !clientPokemon2.toolsId && !!clientPokemon2.details && similarPokemon(pokemon, clientPokemon2, {
            format: this.battleState.format
          }));
          if (clientPokemon) {
            clientPokemon.toolsId = pokemon.toolsId;
          }
        }
        return pokemon.toolsId;
      });
      const playerPokemon = currentOrder.map((toolsId) => {
        const clientPokemonIndex = player.pokemon.findIndex((pokemon) => pokemon.toolsId === toolsId);
        if (clientPokemonIndex > -1) {
          return player.pokemon[clientPokemonIndex];
        }
        const serverPokemon = isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === toolsId) || null;
        if (!serverPokemon?.details) {
          return null;
        }
        if (!serverPokemon.toolsId) {
          serverPokemon.toolsId = toolsId;
        }
        return {
          toolsId: serverPokemon.toolsId,
          ident: serverPokemon.ident,
          searchid: serverPokemon.searchid,
          name: serverPokemon.name,
          speciesForme: serverPokemon.speciesForme,
          details: serverPokemon.details,
          gender: serverPokemon.gender,
          level: serverPokemon.level,
          hp: serverPokemon.hp,
          maxhp: serverPokemon.maxhp
        };
      });
      if (diffArrays(currentOrder, playerState.pokemonOrder || []).length) {
        playerState.pokemonOrder = currentOrder;
      }
      console.debug(
        "[Gen 3 OU Tools] Preparing to sync Pokemon.",
        "\npokemon.length:",
        playerPokemon.length,
        "\nmaxPokemon:",
        maxPokemon,
        "\nplayer:",
        playerKey,
        "\nisMyPokemonSide:",
        isMyPokemonSide,
        "\nhasMyPokemon:",
        hasMyPokemon,
        "\npokemonOrder:",
        playerState.pokemonOrder,
        "\npokemon (assembled):",
        playerPokemon,
        "\npokemon (battle):",
        player.pokemon,
        "\nbattleId:",
        battleId,
        "\nbattle:",
        battle,
        "\nbattleState:",
        this.battleState
      );
      for (let index = 0; index < playerPokemon.length; index++) {
        const clientPokemon = playerPokemon[index];
        if (!clientPokemon?.toolsId) {
          console.debug(
            "[Gen 3 OU Tools] Skipping Pokemon without toolsId.",
            "\npokemon:",
            clientPokemon?.ident || clientPokemon?.speciesForme,
            "\nindex:",
            index,
            "\nplayer:",
            playerKey,
            "\nclientPokemon.toolsId:",
            clientPokemon?.toolsId,
            "\nclientPokemon:",
            clientPokemon,
            "\norder:",
            playerState.pokemonOrder,
            "\npokemon (assembled):",
            playerPokemon,
            "\npokemon (battle):",
            player.pokemon,
            "\nbattleId:",
            battleId,
            "\nbattle:",
            battle,
            "\nbattleState",
            this.battleState
          );
          continue;
        }
        const serverPokemon = isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === clientPokemon.toolsId) || null;
        const matchedPokemonIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === clientPokemon.toolsId);
        const matchedPokemon = playerState.pokemon[matchedPokemonIndex] || null;
        const basePokemon = matchedPokemon || sanitizePokemon(
          clientPokemon,
          this.battleState.format
        );
        if ("transform" in basePokemon.volatiles && typeof basePokemon.volatiles.transform[1] !== "string") {
          basePokemon.volatiles = sanitizeVolatiles(basePokemon);
        }
        const syncedPokemon = syncPokemon(basePokemon, {
          format: this.battleState.format,
          clientPokemon,
          serverPokemon,
          weather: syncedField.weather
        });
        syncedPokemon.slot = index;
        if (!syncedPokemon.playerKey || syncedPokemon.playerKey !== playerKey) {
          syncedPokemon.playerKey = playerKey;
        }
        if (syncedPokemon.transformedForme && clientPokemon?.volatiles?.transform?.length) {
          const targetClientPokemon = clientPokemon.volatiles.transform[1];
          const targetPlayerKey = !!targetClientPokemon?.ident && detectPlayerKeyFromPokemon(targetClientPokemon) || null;
          const mutations = {
            toolsId: targetClientPokemon.toolsId,
            ident: targetClientPokemon.ident
          };
          if (syncedPokemon.source === "server" && ["p1", "p2"].includes(targetPlayerKey)) {
            console.debug(
              "[Gen 3 OU Tools] Syncing information revealed by transformation.",
              "\ntargetpokemon:",
              targetClientPokemon.ident || targetClientPokemon.speciesForme,
              "\ntarget player:",
              targetPlayerKey,
              "\npokemon:",
              syncedPokemon.ident || syncedPokemon.speciesForme,
              "\nindex:",
              index,
              "\nplayer:",
              playerKey,
              "\ntarget:",
              targetClientPokemon.toolsId,
              targetClientPokemon,
              "\nsyncedPokemon.toolsId:",
              syncedPokemon.toolsId,
              "\nsyncedPokemon:",
              syncedPokemon,
              "\nbattleId:",
              battleId,
              "\nbattle:",
              battle,
              "\nbattleState:",
              this.battleState
            );
            if (syncedPokemon.ability) {
              mutations.ability = syncedPokemon.ability;
            }
            if (syncedPokemon.transformedMoves.length) {
              mutations.revealedMoves = [...syncedPokemon.transformedMoves];
            }
          }
          if (Object.keys(mutations).length > 2) {
            futureMutations[targetPlayerKey].push(mutations);
          }
        }
        const pendingMutations = futureMutations[playerKey]?.filter((mutation) => !!mutation?.toolsId && syncedPokemon.toolsId === mutation.toolsId || !!mutation?.ident && syncedPokemon.ident === mutation.ident).map(({
          toolsId,
          ident,
          ...mutations
        }) => ({ ...mutations }));
        if (pendingMutations?.length) {
          pendingMutations.forEach((mutation) => Object.entries(mutation).forEach(([
            key,
            value
          ]) => {
            syncedPokemon[key] = value;
            if (key === "revealedMoves") {
              syncedPokemon.moves = [...value];
            }
          }));
        }
        if (!matchedPokemon) {
          if (playerState.pokemon.length >= playerState.maxPokemon) {
            console.warn(
              "[Gen 3 OU Tools] Skipping Pokemon sync because the player already has the maximum number of Pokemon.",
              "\npokemon:",
              syncedPokemon.ident || syncedPokemon.speciesForme,
              "\nindex:",
              index,
              "\nplayer:",
              playerKey,
              "\npokemon.length:",
              playerState.pokemon.length,
              "\nmaxPokemon:",
              playerState.maxPokemon,
              "\nsyncedPokemon.toolsId:",
              syncedPokemon.toolsId,
              "\nsyncedPokemon:",
              syncedPokemon,
              "\nclientPokemon.toolsId:",
              clientPokemon.toolsId,
              "\nclientPokemon:",
              clientPokemon,
              "\nserverPokemon.toolsId:",
              serverPokemon?.toolsId,
              "\nserverPokemon:",
              serverPokemon,
              "\npokemon (battle):",
              player.pokemon,
              "\nbattleState.pokemon:",
              playerState.pokemon,
              "\nbattleId:",
              battleId,
              "\nbattle:",
              battle,
              "\nbattleState:",
              this.battleState
            );
            continue;
          }
          const size = playerState.pokemon.push(syncedPokemon);
          console.debug(
            "[Gen 3 OU Tools] Added Pokemon.",
            "\npokemon:",
            syncedPokemon.ident || syncedPokemon.speciesForme,
            "\nindex:",
            size - 1,
            "\nplayer:",
            playerKey,
            "\npokemon.length:",
            playerState.pokemon.length,
            "\nmaxPokemon:",
            playerState.maxPokemon,
            "\nsyncedPokemon.toolsId:",
            syncedPokemon.toolsId,
            "\nsyncedPokemon:",
            syncedPokemon,
            "\nclientPokemon.toolsId:",
            clientPokemon.toolsId,
            "\nclientPokemon:",
            clientPokemon,
            "\nserverPokemon.toolsId:",
            serverPokemon?.toolsId,
            "\nserverPokemon:",
            serverPokemon,
            "\npokemon (battle):",
            player.pokemon,
            "\nbattleState.pokemon:",
            playerState.pokemon,
            "\nbattleId:",
            battleId,
            "\nbattle:",
            battle,
            "\nbattleState:",
            this.battleState
          );
        } else {
          playerState.pokemon[matchedPokemonIndex] = syncedPokemon;
          console.debug(
            "[Gen 3 OU Tools] Synced Pokemon.",
            "\npokemon:",
            syncedPokemon.ident || syncedPokemon.speciesForme,
            "\nindex:",
            matchedPokemonIndex,
            "\nplayer:",
            playerKey,
            "\nsyncedPokemon.toolsId:",
            syncedPokemon.toolsId,
            "\nsyncedPokemon:",
            syncedPokemon,
            "\nclientPokemon.toolsId:",
            clientPokemon.toolsId,
            "\nclientPokemon:",
            clientPokemon,
            "\nserverPokemon.toolsId:",
            serverPokemon?.toolsId,
            "\nserverPokemon:",
            serverPokemon,
            "\npokemon (battle):",
            player.pokemon,
            "\nbattleState.pokemon:",
            playerState.pokemon,
            "\nbattleId:",
            battleId,
            "\nbattle:",
            battle,
            "\nbattleState:",
            this.battleState
          );
        }
      }
      playerState.activeIndices = (player.active || []).map((activePokemon) => {
        if (!activePokemon?.details || detectPlayerKeyFromPokemon(activePokemon) !== playerKey) {
          return null;
        }
        let activeId = activePokemon?.toolsId || player.pokemon.find((pokemon) => pokemon === activePokemon)?.toolsId;
        let activeIndex = -1;
        if (activeId) {
          activeIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === activeId);
        }
        if (activeIndex > -1) {
          return activeIndex;
        }
        if (activePokemon) {
          console.warn(
            "[Gen 3 OU Tools] Attempted to add existing activeId.",
            "\nactiveId:",
            activeId,
            "\nplayer:",
            playerKey,
            "\nactivePokemon:",
            activePokemon,
            "\nbattle player",
            player,
            "\nstate player",
            "(state)",
            playerState.pokemon,
            '\norder"',
            playerState.pokemonOrder,
            "\nbattleId:",
            battleId,
            "\nbattle:",
            battle,
            "\nbattleState",
            this.battleState
          );
        }
        return null;
      }).filter((number) => typeof number === "number" && number > -1);
      playerState.pokemon.forEach((pokemon, index) => {
        pokemon.active = playerState.activeIndices.includes(index);
      });
      if (playerState.active) {
        playerState.side.conditions = clonePlayerSideConditions(player.sideConditions);
        playerState.side = {
          conditions: playerState.side.conditions,
          ...sanitizePlayerSide(playerState, battle[playerKey])
        };
      }
    }
    if (battleNonce) {
      this.toolsState.battleNonce = battleNonce;
    }
    this.syncPrediction();
    this.syncTest();
    const toolsElement = battle.toolsHtmlRoom?.el;
    if (!toolsElement) {
      console.warn("[Gen 3 OU Tools] syncBattle completed, but the room element was not found for this battle:", battle.id);
      return;
    }
    console.debug("[Gen 3 OU Tools] syncBattle completed successfully. Rendering the panel.");
    this.renderTools(toolsElement);
  }

  // src/syncPrediction.js
  function syncPrediction() {
    const opponentKey = this.battleState.opponentKey;
    if (!opponentKey) {
      return;
    }
    const opponentState = this.battleState[opponentKey];
    if (!opponentState || !Array.isArray(opponentState.pokemonOrder)) {
      return;
    }
    const opponentTeamKey = opponentState.pokemonOrder.map((toolsId) => {
      const pokemon = opponentState.pokemon?.find((pokemon2) => pokemon2.toolsId === toolsId);
      return pokemon?.speciesForme;
    }).filter(Boolean);
    const opponentTeam = [...opponentTeamKey];
    while (opponentTeam.length < opponentState.maxPokemon) {
      opponentTeam.push("???");
    }
    this.toolsState.opponentTeam = opponentTeam.join(" | ");
    const opponentRating = opponentState.rating;
    let opponentBracket = "0";
    if (opponentRating >= 1760) {
      opponentBracket = "1760";
    } else if (opponentRating >= 1630) {
      opponentBracket = "1630";
    } else if (opponentRating >= 1500) {
      opponentBracket = "1500";
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
          this.battle.subscription("callback");
        }
        if (event.data.type === "SMOGON_ERROR") {
          console.error("[Gen 3 OU Tools] Failed to fetch Smogon data with this error:", event.data.error);
          window.removeEventListener("message", handleSmogonResponse);
        }
      };
      window.addEventListener("message", handleSmogonResponse);
      window.postMessage({ type: "SMOGON_FETCH", opponentBracket }, "*");
    }
    let conditional = null;
    for (let index = 0; index < opponentTeamKey.length; index++) {
      const pokemon = opponentTeamKey[index];
      const teammates = this.battleState.smogonChaos?.data?.[pokemon]?.Teammates;
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
        const rawCount = this.battleState.smogonChaos?.data?.[teammate]?.["Raw count"];
        const leadCount = this.battleState.smogonLeads?.data?.[teammate]?.rawCount;
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
          prediction[teammate] = normalization[teammate] / normalizationTotal * (opponentState.maxPokemon - opponentTeamKey.length);
        }
      }
    }
    if (prediction) {
      const sortedPrediction = Object.entries(prediction).filter(([name, value]) => value >= 5e-3).sort((a, b) => b[1] - a[1]).map(([name, value]) => `${name}: ${Math.round(value * 100)}%`);
      this.toolsState.prediction = sortedPrediction.join("\n");
    } else {
      this.toolsState.prediction = "";
    }
  }

  // src/syncTest.js
  function syncTest() {
    const opponentKey = this.battleState?.opponentKey;
    const activeHP = this.battle[opponentKey]?.active?.[0]?.hp;
    const stepIndex = this.battle.currentStep;
    const stepText = this.battle.stepQueue[stepIndex];
    const pastSteps = this.battleState.stepHistory || [];
    const updatedStepHistory = [...pastSteps, `${activeHP}: ${stepText}`];
    this.toolsState.stepHistory = updatedStepHistory;
  }

  // src/BootManager.js
  var BootManager = class {
    // Defines the registry state
    static Adapter = BootAdapter;
    static __bootstrappers = {
      tools: null
    };
    // Creates an array of registered bootstrappers
    static get registry() {
      return Object.entries(this.__bootstrappers).filter(([, bootstrapper]) => !!bootstrapper).map(([name]) => name);
    }
    // Adds a bootstrapper to the registry
    static register(name, Bootstrapper) {
      if (!name || !(name in this.__bootstrappers) || typeof Bootstrapper !== "function") {
        return;
      }
      this.__bootstrappers[name] = Bootstrapper;
      console.debug(
        "[Gen 3 OU Tools] Registered the bootstrapper.",
        "\nBootstrapper.name:",
        Bootstrapper.name,
        "\nname:",
        name,
        "\nregistry:",
        this.registry
      );
    }
    // Checks if the bootstrapper has been registered
    static registered(name) {
      return !!this.__bootstrappers[name];
    }
    // Fetches a bootstrapper from the registry
    static named(name) {
      const Bootstrapper = this.__bootstrappers[name];
      if (!this.registered(name)) {
        console.error(
          "[Gen 3 OU Tools] The bootstrapper is not registered.",
          "\nname:",
          name,
          "\nBootstrapper.name:",
          Bootstrapper.name,
          "\nBootstrapper:",
          Bootstrapper
        );
        throw new Error(`The ${name} bootstrapper could not be found.`);
      }
      return Bootstrapper;
    }
    // Initializes the Tools panel
    static runTools(battleId) {
      if (!battleId) {
        return;
      }
      new (this.named("tools"))(battleId).run();
    }
    // Opens the Tools panel
    static openTools(battleId) {
      if (!battleId) {
        return;
      }
      new (this.named("tools"))(battleId).open();
    }
    // Closes the Tools panel
    static closeTools(battleId) {
      if (!battleId) {
        return;
      }
      new (this.named("tools"))(battleId).close();
    }
    // Removes the Tools panel
    static destroyTools(battleId) {
      if (!battleId) {
        return;
      }
      new (this.named("tools"))(battleId).destroy();
    }
  };

  // src/BootBootstrappable.js
  var BootBootstrappable = class {
    // Creates references to the adapter and the manager
    static Adapter = BootAdapter;
    static Manager = BootManager;
    // Creates a default client layout
    static hasSinglePanel = () => false;
    // Checks if a lifecycle method is executed without being implemented
    open() {
      throw new Error("Bootstrapper error: open() is not implemented.");
    }
    close() {
      throw new Error("Bootstrapper error: close() is not implemented.");
    }
    run() {
      throw new Error("Bootstrapper error: run() is not implemented.");
    }
    destroy() {
      throw new Error("Bootstrapper error: destroy() is not implemented.");
    }
  };

  // src/BootClassicBootstrappable.js
  var BootClassicBootstrappable = class extends BootBootstrappable {
    // Creates a reference to the adapter
    static Adapter = BootClassicAdapter;
    // Checks if the client is in the single panel layout
    static hasSinglePanel = () => window.app.curRoom?.id?.startsWith("battle-") && window.innerWidth < 1275 || window.Dex?.prefs?.("onepanel");
    // Creates a room in the client
    static createHtmlRoom(roomId, title, options) {
      if (typeof window.app?._addRoom !== "function") {
        console.error(
          "[Gen 3 OU Tools] Cannot create a room because window.app._addRoom is invalid.",
          "\nroom type:",
          options?.side ? "sideroom" : "room",
          "\nwindow.app._addRoom:",
          typeof window.app?._addRoom
        );
        return null;
      }
      const { side, icon, focus, minWidth = 320, maxWidth = 1024 } = options || {};
      let room = null;
      if (roomId in window.app.rooms) {
        room = window.app.rooms[roomId];
      } else {
        room = window.app._addRoom(roomId, "html", true, title);
        room.$el.html("");
        if (side) {
          room.isSideRoom = true;
          window.app.sideRoomList.push(window.app.roomList.pop());
        }
      }
      if (!room?.el) {
        console.error("Could not fetch or create the", side ? "sideroom" : "room", "with roomId:", roomId);
        return room;
      }
      room.minWidth = minWidth;
      room.maxWidth = maxWidth;
      if (icon) {
        const originalRenderer = window.app.topbar.renderRoomTab.bind(window.app.topbar);
        window.app.topbar.renderRoomTab = function(appRoom, appRoomId) {
          const rid = appRoom?.id || appRoomId;
          const buf = originalRenderer(appRoom, appRoomId);
          if (rid === roomId) {
            return buf.replace("fa-file-text-o", `fa-${icon}`);
          }
          return buf;
        };
      }
      if (focus) {
        window.app[side ? "focusRoomRight" : "focusRoom"](room.id);
      }
      window.app.topbar.updateTabbar();
      return room;
    }
  };

  // src/ToolsBootstrappable.js
  var ToolsBootstrappable = class _ToolsBootstrappable extends BootClassicBootstrappable {
    // 
    prevBattleSubscription = null;
    // 
    syncBattle = syncBattle;
    syncPrediction = syncPrediction;
    syncTest = syncTest;
    // 
    battleSubscription = (state) => {
      console.debug(
        "[Gen 3 OU Tools] Received an event from battle.subscribe().",
        "\nstate:",
        state,
        "\nbattleId:",
        this.battle?.id || this.battleId,
        "\nbattle:",
        this.battle,
        "\nrequest:",
        this.battleRequest
      );
      this.prevBattleSubscription?.(state);
      this.syncTools();
    };
    // 
    constructor(battleId) {
      super();
      this.battleId = battleId || null;
    }
    // 
    get battle() {
      throw new Error("Bootstrapper error: get battle() is not implemented.");
    }
    get battleRequest() {
      throw new Error("Bootstrapper error: get battleRequest() is not implemented.");
    }
    // 
    get battleState() {
      return this.toolsState;
    }
    // Checks if initialization is disabled for the battle
    get initDisabled() {
      return (this.battle?.stepQueue || []).some((step) => step?.startsWith("|noinit|nonexistent|"));
    }
    // Creates the initial battle state
    initToolsState() {
      const battleInstance = this.battle;
      const battleId = battleInstance?.id || this.battleId;
      if (!battleId) {
        return;
      }
      if (battleInstance.toolsStateInit) {
        console.debug(
          "[Gen 3 OU Tools] The battle has already been initialized.",
          "\nbattleId:",
          battleId,
          "\ntoolsStateInit:",
          battleInstance.toolsStateInit,
          "\nbattle:",
          battleInstance,
          "\ntoolsState:",
          this.toolsState
        );
        return;
      }
      const initNonce = nil_default;
      console.debug(
        "[Gen 3 OU Tools] Initializing the battle.",
        "\nbattleId:",
        battleId,
        "\ninitNonce:",
        initNonce,
        "\nbattle:",
        battleInstance
      );
      this.toolsState = {
        battleId,
        battleNonce: initNonce,
        gen: battleInstance.gen,
        format: battleId.split("-").find((part) => detectGenFromFormat(part)),
        gameType: battleInstance.gameType === "singles" ? "singles" : "doubles",
        turn: Math.max(battleInstance.turn || 0, 0),
        active: !battleInstance.ended,
        paused: false,
        playerKey: null,
        authPlayerKey: null,
        opponentKey: null,
        switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
        field: {
          weather: null,
          attackerSide: null,
          defenderSide: null
        },
        p1: {
          sideid: null,
          active: false,
          name: null,
          rating: null,
          activeIndices: [],
          selectionIndex: 0,
          maxPokemon: 0,
          side: {
            conditions: {}
          },
          pokemonOrder: [],
          pokemon: []
        },
        p2: {
          sideid: null,
          active: false,
          name: null,
          rating: null,
          activeIndices: [],
          selectionIndex: 0,
          maxPokemon: 0,
          side: {
            conditions: {}
          },
          pokemonOrder: [],
          pokemon: []
        },
        smogonChaos: null,
        smogonLeads: null
      };
      ["p1", "p2"].forEach((playerKey) => {
        const player = battleInstance[playerKey];
        this.toolsState[playerKey] = {
          sideid: playerKey,
          active: !!player?.id,
          name: player?.name || null,
          rating: player?.rating || null,
          activeIndices: [],
          selectionIndex: 0,
          maxPokemon: 0,
          side: {
            conditions: clonePlayerSideConditions(player?.sideConditions)
          },
          pokemonOrder: [],
          pokemon: []
        };
        this.toolsState[playerKey].side = {
          conditions: this.toolsState[playerKey].side.conditions,
          ...sanitizePlayerSide(this.toolsState[playerKey], player)
        };
      });
      battleInstance.toolsStateInit = true;
    }
    // 
    syncTools() {
      const battleInstance = this.battle;
      if (!battleInstance?.id) {
        return;
      }
      if (battleInstance.toolsDestroyed) {
        console.debug(
          "[Gen 3 OU Tools] The battle has been destroyed.",
          "\nbattleId:",
          battleInstance.id,
          "\ntoolsDestroyed:",
          battleInstance.toolsDestroyed,
          "\nbattle:",
          battleInstance
        );
        return;
      }
      if (["p1", "p2"].every((playerKey) => !battleInstance[playerKey]?.id)) {
        console.debug(
          "[Gen 3 OU Tools] Not all players exist in the battle.",
          "\nbattleId:",
          battleInstance.id,
          "\nplayers:",
          ["p1", "p2"].map((playerKey) => battleInstance[playerKey]?.id),
          "\nstepQueue:",
          battleInstance.stepQueue
        );
        return;
      }
      if (!battleInstance.toolsStateInit) {
        const { Adapter } = _ToolsBootstrappable;
        const authUserId = !!Adapter?.authUsername && formatId(Adapter.authUsername) || null;
        this.initToolsState();
        if (!battleInstance.ended && ["p1", "p2"].some((playerKey) => formatId(battleInstance[playerKey]?.name) === authUserId)) {
          return;
        }
      }
      if (!battleInstance.toolsStateInit) {
        return;
      }
      if (this.battleState?.active && battleInstance.ended) {
        console.debug(
          "[Gen 3 OU Tools] Updating active state for the battle.",
          "\nbattleId:",
          battleInstance.id,
          "\ntoolsRoomId:",
          battleInstance.toolsRoomId,
          "\nbattle:",
          battleInstance
        );
        this.toolsState = {
          battleId: battleInstance.id,
          battleNonce: battleInstance.nonce,
          active: false,
          paused: true
        };
        return;
      }
      battleInstance.nonce = calcBattleToolsNonce(battleInstance, this.battleRequest, this.battleState);
      if (!this.battleState?.battleNonce) {
        return;
      }
      if (battleInstance.nonce === this.battleState.battleNonce) {
        return;
      }
      console.debug(
        "[Gen 3 OU Tools] Syncing the battle.",
        "\nbattleId:",
        battleInstance.id,
        "\nprevious nonce:",
        this.battleState.battleNonce,
        "\nnew nonce:",
        battleInstance.nonce,
        "\nrequest:",
        this.battleRequest,
        "\nbattle:",
        battleInstance,
        "\nbattleState:",
        this.battleState
      );
      this.syncBattle(battleInstance, this.battleRequest);
    }
    // patches in the toolsId to client Showdown.Pokemon
    patchClientToolsIdentifier(playerKey, addPokemon, addPokemonArgv) {
      if (!playerKey || typeof addPokemon !== "function" || !addPokemonArgv?.length) {
        return null;
      }
      const execAddPokemon = () => addPokemon(...addPokemonArgv);
      if (!this.battle?.id || !this.battle.toolsStateInit) {
        return execAddPokemon();
      }
      const side = this.battle[playerKey];
      if (!side?.sideid) {
        return execAddPokemon();
      }
      const pokemonSearchCandidates = [];
      if (side.pokemon?.length) {
        pokemonSearchCandidates.push(...side.pokemon);
      }
      if (!this.battleState?.battleId) {
        return execAddPokemon();
      }
      const { pokemon: pokemonFromState } = this.battleState[playerKey] || {};
      if (pokemonFromState?.length) {
        pokemonSearchCandidates.push(...pokemonFromState);
      }
      const pokemonSearchList = pokemonSearchCandidates.map((pokemon) => ({
        toolsId: pokemon.toolsId,
        ident: pokemon.ident,
        speciesForme: pokemon.speciesForme,
        details: pokemon.details,
        searchid: pokemon.searchid
      }));
      const [
        ,
        ident,
        details,
        replaceSlot = -1
      ] = addPokemonArgv;
      const prevPokemon = replaceSlot >= 0 && pokemonSearchList[replaceSlot] || pokemonSearchList.filter((pokemon) => !!pokemon.toolsId).find((pokemon) => (!ident || (!!pokemon?.ident && pokemon.ident === ident || !!pokemon?.searchid?.includes("|") && pokemon.searchid.split("|")[0] === ident)) && similarPokemon(
        { details },
        pokemon,
        { format: this.battleState.format }
      ));
      const newPokemon = execAddPokemon();
      if (!newPokemon?.speciesForme) {
        return newPokemon;
      }
      if (!prevPokemon?.toolsId) {
        return newPokemon;
      }
      newPokemon.toolsId = prevPokemon.toolsId;
      console.debug(
        "[Gen 3 OU Tools] Restored toolsId.",
        "\ntoolsId:",
        newPokemon.toolsId,
        "\nprevious Pokemon:",
        prevPokemon,
        "\nnew Pokemon:",
        newPokemon,
        "\nplayer:",
        side.sideid
      );
      return newPokemon;
    }
    // 
    patchServerToolsIdentifier(myPokemon) {
      if (!this.battle?.id) {
        return;
      }
      if (!myPokemon?.length) {
        return;
      }
      const format = this.battle.id.split("-").find((part) => detectGenFromFormat(part));
      if (!format) {
        return;
      }
      console.debug(
        "[Gen 3 OU Tools] Syncing team data from the server.",
        "\nbattle:",
        this.battle,
        "\nprevious myPokemon:",
        myPokemon,
        "\nnew myPokemon",
        this.battle.myPokemon
      );
      if (!Array.isArray(this.battle.myPokemon)) {
        return;
      }
      let didUpdate = !myPokemon?.length && !!this.battle.myPokemon?.length;
      this.battle.myPokemon.forEach((pokemon) => {
        if (!pokemon?.ident || pokemon.toolsId) {
          return;
        }
        const prevMyPokemon = myPokemon.find((prev) => !!prev?.ident && (prev.ident === pokemon.ident || prev.speciesForme === pokemon.speciesForme || prev.details === pokemon.details || similarPokemon(
          pokemon,
          prev,
          { format }
        )));
        if (!prevMyPokemon?.toolsId) {
          return;
        }
        pokemon.toolsId = prevMyPokemon.toolsId;
        didUpdate = true;
      });
      if (!didUpdate || !this.battle.toolsInit) {
        return;
      }
      const { nonce: prevNonce } = this.battle;
      this.battle.nonce = calcBattleToolsNonce(this.battle, this.battleRequest, this.battleState);
      console.debug(
        "[Gen 3 OU Tools] Restored toolsId to data from the server.",
        "\nprevious nonce:",
        prevNonce,
        "\nnew nonce:",
        this.battle.nonce,
        "\nprevious myPokemon:",
        myPokemon,
        "\nnew myPokemon:",
        this.battle.myPokemon
      );
      this.battle.subscription("callback");
    }
    // 
    patchToolsIdentifier() {
      throw new Error("Bootstrapper error: patchToolsIdentifier() is not implemented.");
    }
    open() {
      throw new Error("Bootstrapper error: open() is not implemented.");
    }
    close() {
      throw new Error("Bootstrapper error: close() is not implemented.");
    }
    destroy() {
      throw new Error("Bootstrapper error: destroy() is not implemented.");
    }
  };

  // src/tools.html
  var tools_default = '<div id="tools-container" class="tools-panel" style="font-size: 9px">\r\n    <h3>Gen 3 OU Tools</h3>\r\n    <p>loading...</p>\r\n</div>';

  // src/ToolsClassicBootstrapper.js
  var ToolsClassicBootstrapper = class _ToolsClassicBootstrapper extends ToolsBootstrappable {
    // 
    static getToolsRoomId(battleId) {
      return `view-tools-${formatId(battleId)}`;
    }
    // 
    static createToolsRoom(battleId, focus) {
      if (!battleId) {
        return null;
      }
      const side = !window.Dex?.prefs("rightpanelbattles");
      const toolsRoomId = this.getToolsRoomId(battleId);
      const toolsRoom = this.createHtmlRoom(
        toolsRoomId,
        "Tools",
        {
          side,
          icon: "wrench",
          focus,
          maxWidth: 650
        }
      );
      if (!toolsRoom?.el) {
        return toolsRoom;
      }
      toolsRoom.el.innerHTML = tools_default;
      toolsRoom.requestLeave = () => {
        const battle = window.app.rooms?.[battleId]?.battle;
        if (battle?.id) {
          delete battle.toolsHtmlRoom;
        }
        toolsRoom.el.innerHTML = "";
        this.toolsState = null;
        if (battle?.id) {
          battle.toolsDestroyed = true;
        }
        return true;
      };
      return toolsRoom;
    }
    // 
    get battleRoom() {
      if (!nonEmptyObject(window.app?.rooms) || !this.battleId?.startsWith?.("battle-")) {
        return null;
      }
      return window.app.rooms[this.battleId];
    }
    // 
    get battle() {
      return this.battleRoom?.battle;
    }
    // 
    get battleRequest() {
      return this.battleRoom?.request;
    }
    // 
    patchToolsIdentifier() {
      if (!this.battle?.id) {
        return;
      }
      if (this.battle.toolsIdPatched) {
        return;
      }
      ["p1", "p2"].forEach((playerKey) => {
        if (!(playerKey in this.battle) || typeof this.battle[playerKey]?.addPokemon !== "function") {
          return;
        }
        console.debug(
          "[Gen 3 OU Tools] Intercepting side.addPokemon.",
          "\nplayer:",
          playerKey,
          "\nbattleId:",
          this.battle.id
        );
        const side = this.battle[playerKey];
        const addPokemon = side.addPokemon.bind(side);
        side.addPokemon = (...argv) => this.patchClientToolsIdentifier(playerKey, addPokemon, argv);
      });
      console.debug("[Gen 3 OU Tools] Intercepting updateSide for this battle:", this.battle.id);
      const updateSide = this.battleRoom.updateSide.bind(this.battleRoom);
      this.battleRoom.updateSide = () => {
        const myPokemon = [...this.battleRoom.battle?.myPokemon || []];
        updateSide();
        this.patchServerToolsIdentifier(myPokemon);
      };
    }
    // 
    preparePanel() {
      if (!this.battle?.id) {
        return;
      }
      if (!this.battle.toolsHtmlRoom) {
        this.battle.toolsHtmlRoom = _ToolsClassicBootstrapper.createToolsRoom(this.battleId, true);
        this.battle.toolsRoomId = this.battle.toolsHtmlRoom?.id;
      }
      if (!this.battle.toolsRoomId) {
        return;
      }
      const { getToolsRoomId } = _ToolsClassicBootstrapper;
      const requestLeave = this.battleRoom.requestLeave.bind(this.battleRoom);
      this.battleRoom.requestLeave = (event) => {
        const shouldLeave = requestLeave(event);
        if (!shouldLeave) {
          const forfeitPopup = window.app.popups.find((popup) => popup.room === this.battleRoom);
          if (typeof forfeitPopup?.submit === "function") {
            console.debug("[Gen 3 OU Tools] Intercepting forfeitPopup.submit for this battle:", this.battle.id);
            const submitForfeit = forfeitPopup.submit.bind(forfeitPopup);
            forfeitPopup.submit = (...args) => {
              const toolsRoomId = getToolsRoomId(this.battleId);
              if (toolsRoomId && toolsRoomId in (window.app.rooms || {})) {
                window.app.leaveRoom(toolsRoomId);
              }
              return submitForfeit(...args);
            };
          }
          return false;
        }
        return true;
      };
    }
    // 
    renderTools(element) {
      if (!this.battleId || !element) {
        return;
      }
      ToolsDomRenderer(
        element,
        {
          state: this.battleState,
          battleId: this.battleId
        }
      );
    }
    // 
    open() {
      if (!this.battleState?.battleId) {
        return;
      }
      const toolsRoomId = _ToolsClassicBootstrapper.getToolsRoomId(this.battleId);
      if (toolsRoomId in window.app.rooms) {
        window.app.focusRoomRight(toolsRoomId);
      } else {
        const toolsRoom = _ToolsClassicBootstrapper.createToolsRoom(this.battleId, true);
        this.renderTools(toolsRoom.el);
        if (this.battleRoom?.battle?.id) {
          this.battleRoom.battle.toolsDestroyed = false;
          this.battleRoom.battle.toolsHtmlRoom = toolsRoom;
        }
      }
      if ((!window.app.curRoom?.id || window.app.curRoom.id !== this.battleId) && this.battleId in window.app.rooms) {
        window.app.focusRoom(this.battleId);
      }
    }
    // 
    close() {
      if (!this.battleId || !nonEmptyObject(window.app?.rooms)) {
        return;
      }
      const { getToolsRoomId } = _ToolsClassicBootstrapper;
      const toolsRoomId = getToolsRoomId(this.battleId);
      if (window.app.rooms[toolsRoomId]) {
        window.app.leaveRoom(toolsRoomId);
      }
      if (this.battleRoom?.id && this.toolsState?.active) {
        window.app.leaveRoom(this.battleId);
      }
    }
    // 
    destroy() {
      if (!this.battleId) {
        return;
      }
      const { Adapter } = _ToolsClassicBootstrapper;
      if (this.battle?.toolsStateInit) {
        this.battle.toolsStateInit = false;
        this.battle.toolsDestroyed = true;
      }
      this.close();
      Adapter.removeBattleReceiver(this.battleId);
      this.toolsState = null;
    }
    // 
    run() {
      console.debug("[Gen 3 OU Tools] The bootstrapper run() method was called for this battle:", this.battleId);
      if (!this.battleId?.startsWith?.("battle-")) {
        console.debug("[Gen 3 OU Tools] The bootstrap request was ignored for the battle with this invalid battleId:", this.battleId);
        return;
      }
      const { getToolsRoomId } = _ToolsClassicBootstrapper;
      if (!this.battle?.id) {
        if (!this.battleState?.battleId) {
          console.debug("[Gen 3 OU Tools] The bootstrap request was ignored for this battle with no battleState:", this.battleId);
          return;
        }
        if (this.battleState?.active) {
          this.toolsState = {
            battleId: this.battleId,
            active: false
          };
        }
        const toolsRoomId = getToolsRoomId(this.battleId);
        if (toolsRoomId in window.app.rooms) {
          console.debug(
            "[Gen 3 OU Tools] Leaving with a destroyed battleState.",
            "\ntoolsRoomId:",
            toolsRoomId,
            "\nbattleId:",
            this.battleId,
            "\nbattleState:",
            this.battleState
          );
          window.app.leaveRoom(toolsRoomId);
          return;
        }
        console.debug(
          "[Gen 3 OU Tools] The battle was forcibly ended.",
          "\nbattleId:",
          this.battleId,
          "\nbattle:",
          this.battle,
          "\nbattleRoom:",
          this.battleRoom,
          "\nbattleState:",
          this.battleState
        );
        return;
      }
      if (this.initDisabled) {
        console.debug(
          "[Gen 3 OU Tools] The bootstrap request was ignored because the battle was marked as nonexistent.",
          "\nbattleId:",
          this.battleId,
          "\nstep:",
          this.battle.stepQueue.find((step) => step?.startsWith("|noinit|nonexistent|")),
          "\nbattle:",
          this.battle
        );
        return;
      }
      if (typeof this.battle?.subscribe !== "function") {
        console.warn("[Gen 3 OU Tools] battle.subscribe has this invalid type:", typeof this.battle?.subscribe);
        return;
      }
      if (!this.battle.stepQueue?.length || !this.battle.stepQueue.some((step) => step?.startsWith("|player|"))) {
        console.debug(
          "[Gen 3 OU Tools] Initialization failed due to uninitialized players in the battle",
          "\nstepQueue:",
          this.battle.stepQueue,
          "\nbattleId:",
          this.battle.id,
          "\nbattle:",
          this.battle
        );
        return;
      }
      if (this.battle.toolsInit) {
        if (this.battle.toolsStateInit && this.battle.atQueueEnd) {
          this.battle.subscription("atqueueend");
        } else {
          this.battle.subscription("step");
        }
        return;
      }
      if (!this.battle.toolsStateInit) {
        this.initToolsState();
      }
      this.preparePanel();
      const toolsElement = this.battle.toolsHtmlRoom?.el;
      if (!toolsElement) {
        console.error(
          "ReactDOM root hasn't been initialized, despite completing the classic bootstrap;",
          "something is horribly wrong here!",
          "\n",
          "battleId",
          this.battle.id,
          "\n",
          "toolsElement",
          "(typeof)",
          typeof toolsElement,
          toolsElement,
          "\n",
          "battle",
          this.battle,
          "\n",
          "battleRoom",
          this.battleRoom
        );
        return;
      }
      this.patchToolsIdentifier();
      this.renderTools(toolsElement);
      console.debug(
        "[Gen 3 OU Tools] Intercepting client data via battle.subscribe.",
        "\nbattleId:",
        this.battleId,
        "\nbattle.subscription:",
        typeof this.battle.subscription,
        "\nbattle:",
        this.battle
      );
      this.prevBattleSubscription = this.battle.subscription?.bind?.(this.battle);
      this.battle.subscribe(this.battleSubscription);
      this.battle.toolsInit = true;
      if (toolsElement && this.battle.atQueueEnd) {
        this.battle.subscription("atqueueend");
      }
      if (toolsElement && !this.battle.atQueueEnd) {
        this.battle.subscription("step");
      }
    }
  };

  // src/main.js
  console.debug("[Gen 3 OU Tools] Starting for chrome.");
  if (typeof window?.Dex?.gen !== "number" || typeof window.Dex.forGen !== "function" || typeof window.app?.receive !== "function") {
    console.error(
      "[Gen 3 OU Tools] Executed on an unsupported webpage or before the webpage finished loading.",
      "\nwindow.Dex:",
      typeof window?.Dex,
      "\nwindow.app:",
      typeof window?.app
    );
    throw new Error("Attempted to start in an unsupported webpage.");
  }
  if (window.__GEN_3_OU_TOOLS_INIT) {
    console.error(
      "[Gen 3 OU Tools] An instance was already active on this webpage.",
      "\n__GEN_3_OU_TOOLS_INIT:",
      window.__GEN_3_OU_TOOLS_INIT,
      "\n__GEN_3_OU_TOOLS_HOST:",
      window.__GEN_3_OU_TOOLS_HOST
    );
    throw new Error("Another instance tried to start when one was already active.");
  }
  window.__GEN_3_OU_TOOLS_INIT = "gen-3-ou-tools";
  window.__GEN_3_OU_TOOLS_HOST = typeof window.app?.receive === "function" ? "classic" : null;
  (async () => {
    if (window.__GEN_3_OU_TOOLS_HOST === "classic") {
      BootClassicAdapter.receiverFactory = (roomId) => () => new ToolsClassicBootstrapper(roomId).run();
      await BootClassicAdapter.run();
    } else {
      console.error(
        "[Gen 3 OU Tools] Could not determine the host environment.",
        "\n__GEN_3_OU_TOOLS_HOST:",
        window.__GEN_3_OU_TOOLS_HOST,
        "\n__GEN_3_OU_TOOLS_INIT:",
        window.__GEN_3_OU_TOOLS_INIT
      );
      throw new Error("Attempted to run with an unsupported host.");
    }
    console.debug(
      "[Gen 3 OU Tools] Initialized successfully.",
      "\n__GEN_3_OU_TOOLS_INIT:",
      window.__GEN_3_OU_TOOLS_INIT,
      "\n__GEN_3_OU_TOOLS_HOST:",
      window.__GEN_3_OU_TOOLS_HOST
    );
  })();
})();
//# sourceMappingURL=main.js.map
