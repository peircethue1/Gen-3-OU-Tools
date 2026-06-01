(() => {
  // src/BootAdapter.js
  var BootAdapter = class {
    // Defines the initialization state
    static __initialized = false;
    static __authUsername = null;
    // Defines the initialization lifecycle hooks
    static hook = null;
    static ready = null;
    // Prepares the extension state
    static async __init() {
      if (this.__initialized) {
        return;
      }
      this.__initialized = true;
    }
    // EDITINGNOTE: A getter is created here for rootState based on getState(). Do I need an analog?
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
      try {
        if (typeof this.hook === "function") {
          await this.hook();
        }
      } catch (error) {
        console.error("[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.", error);
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
            "[Gen 3 OU Tools] Logged in as",
            namedCode === "1" ? "registered" : "guest",
            "user.",
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
            "[Gen 3 OU Tools] window.app.receive data for battle room:",
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
    // Adds the data receiver to the array of data receivers
    static addBattleReceiver(roomId, receiver) {
      if (!roomId || typeof receiver !== "function" || this.__battleReceivers.some((receiver2) => receiver2[0] === roomId)) {
        return;
      }
      this.__battleReceivers.push([roomId, receiver]);
    }
    // Removes the data receiver from the array of data receivers
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
    // Adds the bootstrapper to the registry
    static register(name, Bootstrapper) {
      if (!name || !(name in this.__bootstrappers) || typeof Bootstrapper !== "function") {
        return;
      }
      this.__bootstrappers[name] = Bootstrapper;
      console.debug(
        "[Gen 3 OU Tools] Registered",
        Bootstrapper.name,
        "as the",
        name,
        "bootstrapper.",
        "\nregistry:",
        this.registry
      );
    }
    // Checks if the bootstrapper has been registered
    static registered(name) {
      return !!this.__bootstrappers[name];
    }
    // Fetches the bootstrapper from the registry
    static named(name) {
      const Bootstrapper = this.__bootstrappers[name];
      if (!this.registered(name)) {
        console.error(
          "[Gen 3 OU Tools] The",
          name,
          "bootstrapper is not registered.",
          "\nbootstrapper:",
          Bootstrapper.name,
          Bootstrapper
        );
        throw new Error("The", name, "bootstrapper could not be found.");
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
          "[Gen 3 OU Tools] Cannot create a",
          options?.side ? "sideroom" : "room",
          "because window.app._addRoom is not valid.",
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
    battleSubscription = (state) => {
      console.debug(
        "[Gen 3 OU Tools] Received an event from battle.subscribe():",
        state,
        "\nbattleId:",
        this.battle?.id || this.battleId,
        "\nbattle:",
        this.battle,
        "\nbattleRequest:",
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
    // Creates a clone of the side conditions
    static clonePlayerSideConditions(conditions) {
      return Object.entries(conditions || {}).reduce((prev, [key, value]) => {
        prev[key] = Array.isArray(value) ? [...value] : value;
        return prev;
      }, {});
    }
    // Creates an clean ID
    static formatId(value) {
      return value?.toString?.().normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    }
    // Creates a standardized object for the current battle state
    static sanitizePlayerSide(player, battleSide) {
      const {
        selectionIndex,
        pokemon: playerPokemon,
        side
      } = player || {};
      const currentPokemon = playerPokemon?.length && selectionIndex > -1 ? playerPokemon[selectionIndex] : null;
      const sideConditions = battleSide?.sideConditions || side?.conditions || {};
      const sideConditionNames = Object.keys(sideConditions).map((condition) => _ToolsBootstrappable.formatId(condition)).filter(Boolean);
      const volatileNames = Object.keys(currentPokemon?.volatiles || {}).map((volatile) => _ToolsBootstrappable.formatId(volatile)).filter(Boolean);
      return {
        spikes: sideConditionNames.includes("spikes") && sideConditions.spikes?.[1] || 0,
        isReflect: sideConditionNames.includes("reflect"),
        isLightScreen: sideConditionNames.includes("lightscreen"),
        isProtected: volatileNames.includes("protect"),
        isSeeded: volatileNames.includes("leechseed"),
        isForesight: volatileNames.includes("foresight"),
        isSwitching: currentPokemon?.active ? "out" : "in"
      };
    }
    // Creates a valid generation number
    static detectGenFromFormat(format, defaultGen = null) {
      if (typeof format === "number") {
        return Math.max(format, 0);
      }
      const genFormatRegex = /^gen(10|\d)/i;
      if (!genFormatRegex.test(format)) {
        return defaultGen;
      }
      const gen = parseInt(format.match(genFormatRegex)[1], 10) || 0;
      if (gen < 1) {
        return defaultGen;
      }
      return gen;
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
          "[Gen 3 OU Tools] Tools has already been initialized for this battle:",
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
      const initNonce = 0;
      console.debug(
        "[Gen 3 OU Tools] Initializing Tools for this battle:",
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
        format: battleId.split("-").find((part) => _ToolsBootstrappable.detectGenFromFormat(part)),
        gameType: battleInstance.gameType === "doubles" ? "Doubles" : "Singles",
        turn: Math.max(battleInstance.turn || 0, 0),
        active: !battleInstance.ended,
        paused: false,
        // EDITINGNOTE: Do I need this? How does this work?
        switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
        p1: {
          active: false,
          name: null,
          rating: null,
          // EDITINGNOTE: Do I need this?
          autoSelect: false,
          side: {
            conditions: {}
          }
        },
        p2: {
          active: false,
          name: null,
          rating: null,
          // EDITINGNOTE: Do I need this?
          autoSelect: false,
          side: {
            conditions: {}
          }
        }
      };
      ["p1", "p2"].forEach((playerKey) => {
        const player = battleInstance[playerKey];
        this.toolsState[playerKey] = {
          active: !!player?.id,
          name: player?.name || null,
          rating: player?.rating || null,
          // EDITINGNOTE: Do I need this? How does this work? This is dependent on authUsername, which I will need if I revert to Showdex's implementation.
          autoSelect: false,
          side: {
            conditions: _ToolsBootstrappable.clonePlayerSideConditions(player?.sideConditions)
          }
        };
        this.toolsState[playerKey].side = {
          conditions: this.toolsState[playerKey].side.conditions,
          ..._ToolsBootstrappable.sanitizePlayerSide(this.toolsState[playerKey], player)
        };
      });
      battleInstance.toolsStateInit = true;
    }
    // Creates a string that represents a unique battle state 
    // EDITINGNOTE: This needs to be updated with the data that my tool actually uses to sync at the right times.
    static calcBattleToolsNonce(battle, request) {
      const stepQueue = battle?.stepQueue?.filter?.((step) => !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step)) || [];
      return stepQueue.join(";");
    }
    // 
    syncTools() {
      const battleInstance = this.battle;
      if (!battleInstance?.id) {
        return;
      }
      if (battleInstance.toolsDestroyed) {
        console.debug(
          "[Gen 3 OU Tools] Tools has been destroyed for this battle:",
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
          "[Gen 3 OU Tools] Not all players exist in this battle:",
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
        const authUserId = !!Adapter?.authUsername && _ToolsBootstrappable.formatId(Adapter.authUsername) || null;
        this.initToolsState();
        if (!battleInstance.ended && ["p1", "p2"].some((playerKey) => _ToolsBootstrappable.formatId(battleInstance[playerKey]?.name) === authUserId)) {
          return;
        }
      }
      if (!battleInstance.toolsStateInit) {
        return;
      }
      if (this.battleState?.active && battleInstance.ended) {
        console.debug(
          "[Gen 3 OU Tools] Updating active state for this finished battle:",
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
      battleInstance.nonce = _ToolsBootstrappable.calcBattleToolsNonce(battleInstance, this.battleRequest);
      if (!this.battleState?.battleNonce) {
        return;
      }
      if (battleInstance.nonce === this.battleState.battleNonce) {
        return;
      }
      console.debug(
        "[Gen 3 OU Tools] Syncing this battle:",
        battleInstance.id,
        "\nnonce (prev):",
        this.battleState.battleNonce,
        "\nnonce (cur):",
        battleInstance.nonce,
        "\nbattleRequest:",
        this.battleRequest,
        "\nbattle:",
        battleInstance,
        "\nbattleState (prev):",
        this.battleState
      );
      this.syncBattle(this.battle, this.battleRequest);
    }
    // 
    static getDexForFormat(format) {
      if (typeof Dex === "undefined") {
        console.warn(
          "[Gen 3 OU Tools] The global Dex object is not available.",
          "\nformat:",
          format
        );
        return null;
      }
      if (!format) {
        return Dex;
      }
      if (typeof format === "number") {
        return format > 0 ? Dex.forGen(format) : Dex;
      }
      const formatAsId = _ToolsBootstrappable.formatId(format);
      const gen = _ToolsBootstrappable.detectGenFromFormat(formatAsId);
      if (typeof gen !== "number" || gen < 1) {
        return Dex;
      }
      return Dex.forGen(gen);
    }
    // 
    static parsePokemonDetails(details) {
      if (!details) {
        return null;
      }
      const [speciesForme] = details.split(", ");
      if (!speciesForme) {
        return null;
      }
      return { speciesForme };
    }
    // 
    static similarPokemon(pokemonA, pokemonB, config) {
      if (!pokemonA?.details || !pokemonB?.details) {
        return false;
      }
      const { details: detailsA } = pokemonA;
      const { details: detailsB } = pokemonB;
      const { format, normalizeFormes } = config || {};
      const shouldNormalizeFormes = normalizeFormes === "wildcard" && [detailsA, detailsB].some((details) => details.includes("-*"));
      const dex = _ToolsBootstrappable.getDexForFormat(format);
      const { speciesForme: speciesA } = _ToolsBootstrappable.parsePokemonDetails(detailsA);
      const dexA = dex.species.get(speciesA);
      const formeA = dexA?.exists && (shouldNormalizeFormes ? dexA.baseSpecies : dexA.name) || null;
      if (!formeA) {
        return false;
      }
      const { speciesForme: speciesB } = _ToolsBootstrappable.parsePokemonDetails(detailsB);
      const dexB = dex.species.get(speciesB);
      const formeB = dexB?.exists && (shouldNormalizeFormes ? dexB.baseSpecies : dexB.name) || null;
      if (!formeB) {
        return false;
      }
      return formeA === formeB;
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
      const prevPokemon = replaceSlot >= 0 && pokemonSearchList[replaceSlot] || pokemonSearchList.filter((pokemon) => !!pokemon.toolsId).find((pokemon) => (!ident || (!!pokemon?.ident && pokemon.ident === ident || !!pokemon?.searchid?.includes("|") && pokemon.searchid.split("|")[0] === ident)) && _ToolsBootstrappable.similarPokemon(
        { details },
        pokemon,
        {
          format: this.battleState.format,
          normalizeFormes: "wildcard"
        }
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
        "[Gen 3 OU Tools] Restored client toolsId:",
        newPokemon.toolsId,
        "\nplayer:",
        side.sideid,
        "\nprevPokemon:",
        prevPokemon,
        "\nnewPokemon:",
        newPokemon
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
      const format = this.battle.id.split("-").find((part) => _ToolsBootstrappable.detectGenFromFormat(part));
      if (!format) {
        return;
      }
      console.debug(
        "[Gen 3 OU Tools] Syncing server team data for this battle:",
        this.battle,
        "\nmyPokemon (prev):",
        this.battle.myPokemon,
        "\nmyPokemon (cur):",
        myPokemon
      );
      if (!Array.isArray(this.battle.myPokemon)) {
        return;
      }
      let didUpdate = !myPokemon?.length && !!this.battle.myPokemon?.length;
      this.battle.myPokemon.forEach((pokemon) => {
        if (!pokemon?.ident || pokemon.toolsId) {
          return;
        }
        const prevMyPokemon = myPokemon.find((p) => !!p?.ident && (p.ident === pokemon.ident || p.speciesForme === pokemon.speciesForme || p.details === pokemon.details || _ToolsBootstrappable.similarPokemon(pokemon, p, {
          format,
          normalizeFormes: "wildcard"
        })));
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
      this.battle.nonce = _ToolsBootstrappable.calcBattleToolsNonce(this.battle, this.battleRequest);
      console.debug(
        "[Gen 3 OU Tools] Restored server toolsIds.",
        "\nnonce (prev):",
        prevNonce,
        "\nnonce (cur):",
        this.battle.nonce,
        "\nmyPokemon (prev):",
        myPokemon,
        "\nmyPokemon (cur)",
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

  // src/ToolsRenderer.js
  var ToolsDomRenderer = (element, props) => {
    if (!element || !props?.state) {
      return;
    }
    const toolsState = JSON.stringify(props.state, null, 2);
    element.innerHTML = `
    <div id="tools-container" class="tools-panel" style="font-size: 9px">
      <h3>Gen 3 OU Tools</h3>
      <pre>${toolsState}</pre>
    </div>
  `;
  };

  // src/Tools.html
  var Tools_default = '<div id="tools-container" class="tools-panel" style="font-size: 9px">\r\n    <h3>Gen 3 OU Tools</h3>\r\n    <p>loading...</p>\r\n</div>';

  // src/ToolsClassicBootstrapper.js
  var ToolsClassicBootstrapper = class _ToolsClassicBootstrapper extends ToolsBootstrappable {
    // 
    static getToolsRoomId(battleId) {
      return `view-tools-${ToolsBootstrappable.formatId(battleId)}`;
    }
    // 
    static createToolsRoom(battleId, focus) {
      if (!battleId) {
        return null;
      }
      const side = !window.Dex?.prefs("rightpanelbattles");
      const toolsRoomId = this.getToolsRoomId(battleId);
      const toolsRoom = this.createHtmlRoom(toolsRoomId, "Tools", {
        side,
        icon: "toolbox",
        focus,
        maxWidth: 650
      });
      if (!toolsRoom?.el) {
        return toolsRoom;
      }
      toolsRoom.el.innerHTML = Tools_default;
      toolsRoom.requestLeave = () => {
        const battle = window.app.rooms?.[battleId]?.battle;
        if (battle?.id) {
          delete battle.toolsHtmlRoom;
        }
        toolsRoom.el.innerHTML = "";
        this.toolsState = null;
        if (battle?.id) {
          battle.toolsReactRoot?.unmount?.();
          battle.toolsDestroyed = true;
        }
        return true;
      };
      return toolsRoom;
    }
    // 
    static nonEmptyObject(obj) {
      if (typeof obj !== "object") {
        return false;
      }
      if (Array.isArray(obj)) {
        return !!obj.length;
      }
      return !!Object.keys(obj || {}).length;
    }
    // 
    get battleRoom() {
      if (!_ToolsClassicBootstrapper.nonEmptyObject(window.app?.rooms) || !this.battleId?.startsWith?.("battle-")) {
        return null;
      }
      return window.app.rooms[this.battleId];
    }
    get battle() {
      return this.battleRoom?.battle;
    }
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
          "[Gen 3 OU Tools] Overriding side.addPokemon() of player:",
          playerKey,
          "\nbattle.id:",
          this.battle.id
        );
        const side = this.battle[playerKey];
        const addPokemon = side.addPokemon.bind(side);
        side.addPokemon = (...argv) => this.patchClientToolsIdentifier(playerKey, addPokemon, argv);
      });
      console.debug(
        "[Gen 3 OU Tools] Overriding updateSide() of the current battleRoom",
        "\nbattle.id:",
        this.battle.id
      );
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
            console.debug(
              "[Gen 3 OU Tools] Intercepting submit() of forfeitPopup in window.app.popups.",
              "\nbattleId:",
              this.battle.id
            );
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
    // EDITINGNOTE: 
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
    // EDITINGNOTE: check whether these methods are actually implemented, and decide what to do with them (these are broken and have not recieved a pass)
    open() {
      if (!this.battleState?.battleId) {
        return;
      }
      const { store } = _ToolsClassicBootstrapper.Adapter || {};
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
    close() {
      if (!this.battleId || !_ToolsClassicBootstrapper.nonEmptyObject(window.app?.rooms)) {
        return;
      }
      const { Adapter, getToolsRoomId } = _ToolsClassicBootstrapper;
      const toolsRoomId = getToolsRoomId(this.battleId);
      if (window.app.rooms[toolsRoomId]) {
        window.app.leaveRoom(toolsRoomId);
      }
      if (this.battleRoom?.id && !Adapter.rootState?.tools?.[this.battleId]?.active) {
        window.app.leaveRoom(this.battleId);
      }
    }
    destroy() {
      if (!this.battleId) {
        return;
      }
      const { Adapter } = _ToolsClassicBootstrapper;
      if (this.battle?.toolsStateInit) {
        this.battle.toolsReactRoot?.unmount?.();
        this.battle.toolsStateInit = false;
        this.battle.toolsDestroyed = true;
      }
      this.close();
      Adapter.removeBattleReceiver(this.battleId);
      Adapter.store.dispatch(calcdexSlice.actions.destroy(this.battleId));
    }
    run() {
      console.debug(
        "Tools classic bootstrapper was invoked;",
        "determining if there's anything to do...",
        "\n",
        "battleId",
        this.battleId
      );
      if (!this.battleId?.startsWith?.("battle-")) {
        console.debug(
          "Tools classic bootstrap request was ignored for battleId",
          this.battleId,
          "since it's not a Showdown.ClientBattleRoom"
        );
        return;
      }
      const { Adapter, getToolsRoomId } = _ToolsClassicBootstrapper;
      const { hasSinglePanel } = _ToolsClassicBootstrapper;
      if (!this.battle?.id) {
        if (!this.battleState?.battleId) {
          console.debug(
            "Tools classic bootstrap request was ignored for battleId",
            this.battleId,
            "since no proper Showdown.Battle exists within the current Showdown.ClientBattleRoom"
          );
          return;
        }
        if (this.battleState?.active) {
          Adapter.store.dispatch(calcdexSlice.actions.update({
            battleId: this.battleId,
            active: false
          }));
        }
        const toolsRoomId = getToolsRoomId(this.battleId);
        if (this.battleState.renderMode === "panel" && this.calcdexSettings?.closeOn !== "never" && toolsRoomId in window.app.rooms) {
          console.debug(
            "Leaving the toolsRoom",
            toolsRoomId,
            "w/ a destroyed battle due to the user's settings...",
            "\n",
            "battleId",
            this.battleId,
            "\n",
            "state",
            this.battleState
          );
          window.app.leaveRoom(toolsRoomId);
          return;
        }
        console.debug(
          "Tools for battleId",
          this.battleId,
          "exists in state, but battle was forcibly ended, probably.",
          "\n",
          "battle",
          this.battle,
          "\n",
          "battleRoom",
          this.battleRoom,
          "\n",
          "state",
          this.battleState
        );
        return;
      }
      if (this.initDisabled) {
        console.debug(
          "Tools classic bootstrap request was ignored for battleId",
          this.battleId,
          "since the battle is marked as nonexistent & shouldn't be initialized",
          "\n",
          "stepQueue[]",
          "(match)",
          this.battle.stepQueue.find((step) => step?.startsWith("|noinit|nonexistent|")),
          "\n",
          "battle",
          this.battle
        );
        return;
      }
      if (typeof this.battle?.subscribe !== "function") {
        console.warn(
          "Must have some jank battle object cause battle.subscribe() is apparently type",
          typeof this.battle?.subscribe
        );
        return;
      }
      if (!this.battle.stepQueue?.length || !this.battle.stepQueue.some((step) => step?.startsWith("|player|"))) {
        console.debug(
          "Ignoring Tools classic init due to uninitialized players in battle",
          "\n",
          "stepQueue[]",
          this.battle.stepQueue,
          "\n",
          "battle.id",
          this.battle.id,
          "\n",
          "battle",
          this.battle
        );
        return;
      }
      if (this.battle.toolsInit) {
        if (this.battle.toolsStateInit && this.battle.atQueueEnd) {
          this.battle.subscription("atqueueend");
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
        "About to inject some real filth into battle.subscribe()...",
        "\n",
        "battleId",
        this.battleId,
        "\n",
        "battle.subscription()",
        "(typeof)",
        typeof this.battle.subscription,
        "\n",
        "battle",
        this.battle
      );
      this.prevBattleSubscription = this.battle.subscription?.bind?.(this.battle);
      this.battle.subscribe(this.battleSubscription);
      this.battle.toolsInit = true;
      if (toolsElement && this.battle.atQueueEnd) {
        this.battle.subscription("atqueueend");
      }
    }
  };

  // src/main.js
  console.log("[Gen 3 OU Tools] Starting the initialization engine.");
  if (typeof window?.Dex?.gen !== "number" || typeof window.Dex.forGen !== "function" || typeof window.app?.receive !== "function") {
    console.error(
      "[Gen 3 OU Tools] Initialization failed: Executed on an unsupported webpage or before the webpage finished loading.",
      "\nwindow.Dex:",
      typeof window?.Dex,
      "\nwindow.app:",
      typeof window?.app
    );
    throw new Error("Gen 3 OU Tools attempted to start in an unsupported webpage.");
  }
  if (window.__GEN_3_OU_TOOLS_INIT) {
    console.error(
      "[Gen 3 OU Tools] Initialization failed: An instance of Gen 3 OU Tools was already active on this webpage.",
      "\n__GEN_3_OU_TOOLS_INIT:",
      window.__GEN_3_OU_TOOLS_INIT
    );
    throw new Error("Another instance of Gen 3 OU Tools tried to start when one was already active.");
  }
  window.__GEN_3_OU_TOOLS_INIT = "gen-3-ou-tools";
  window.__GEN_3_OU_TOOLS_HOST = typeof window.app?.receive === "function" ? "classic" : null;
  (async () => {
    if (window.__GEN_3_OU_TOOLS_HOST === "classic") {
      BootClassicAdapter.receiverFactory = (roomId) => () => new ToolsClassicBootstrapper(roomId).run();
      await BootClassicAdapter.run();
    } else {
      console.error(
        "[Gen 3 OU Tools] Initialization failed: Could not determine the host environment.",
        "\n__GEN_3_OU_TOOLS_HOST:",
        window.__GEN_3_OU_TOOLS_HOST
      );
      throw new Error("Gen 3 OU Tools attempted to run with an unsupported host.");
    }
    console.log("[Gen 3 OU Tools] Adapter initialized successfully.");
  })();
})();
//# sourceMappingURL=main.js.map
