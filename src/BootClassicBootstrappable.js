// Creates the bootstrapper template EDITINGNOTE: similar to bootbootstrappable

import { BootBootstrappable } from './BootBootstrappable';
import { BootClassicAdapter } from './BootClassicAdapter';

export class BootClassicBootstrappable extends BootBootstrappable {

  // Creates a reference to the adapter
  static Adapter = BootClassicAdapter;

  // Checks if the client is in the single panel layout
  static hasSinglePanel = () => (
    (window.app.curRoom?.id?.startsWith('battle-') && window.innerWidth < 1275) ||
    window.Dex?.prefs?.('onepanel')
  );

  // EDITINGNOTE: put something here
  static createHtmlRoom(roomId, title, options = {}) {
    if (typeof window.app?._addRoom !== 'function') {
      console.error(
        `[Gen 3 OU Tools] Cannot create a ${options?.side ? 'side-' : ''}room because window.app._addRoom is not a function.`,
        `\nwindow.app._addRoom:`, typeof window.app?._addRoom
      );
      return null;
    }

    // Defines the room options with default values
    const { side, icon, focus, minWidth = 320, maxWidth = 1024 } = options;

    // Initializes the room variable
    let room = null;

    // EDITINGNOTE: put something here
    if (roomId in window.app.rooms) {

      // Retrieves an existing room
      room = window.app.rooms[roomId];
    } else {

      // Creates a new room
      room = window.app._addRoom(roomId, 'html', true, title);

      // Removes the default HTML
      room.$el.html('');

      // Adds siderooms to the list of siderooms
      if (side) {
        room.isSideRoom = true;
        window.app.sideRoomList.push(window.app.roomList.pop());
      }
    }

    // Checks if the room was created successfully
    if (!room?.el) {
      console.error(`Could not retrieve or create the ${side ? 'side-' : ''}room with room.id:`, roomId);
      return room;
    }

    // Defines the room dimensions
    room.minWidth = minWidth;
    room.maxWidth = maxWidth;

    // Adds an icon to the tab button
    if (icon) {
      const originalRenderer = window.app.topbar.renderRoomTab.bind(window.app.topbar);
      window.app.topbar.renderRoomTab = function(appRoom, appRoomId) {
        const rid = appRoom?.id || appRoomId;
        const buf = originalRenderer(appRoom, appRoomId);

        if (rid === roomId) return buf.replace('fa-file-text-o', `fa-${icon}`);
        return buf;
      };
    }

    // Sets the focus to the room
    if (focus) {
      window.app[side ? 'focusRoomRight' : 'focusRoom'](room.id);
    }

    // Updates the tab bar
    window.app.topbar.updateTabbar();
    
    // Sends the room object
    return room;
  }
}