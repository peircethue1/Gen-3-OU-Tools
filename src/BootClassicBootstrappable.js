/**
 * Creates the room template
 */

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

  // Creates a room in the client
  static createHtmlRoom(roomId, title, options) {

    // Checks if the client function to add a room is valid
    if (typeof window.app?._addRoom !== 'function') {
      console.error(
        '[Gen 3 OU Tools] Cannot create a', options?.side ? 'sideroom' : 'room', 'because window.app._addRoom is not valid.',
        '\nwindow.app._addRoom:', typeof window.app?._addRoom,
      );

      return null;
    }

    // Defines the room options with default values
    const { side, icon, focus, minWidth = 320, maxWidth = 1024 } = options || {};

    // Initializes the room
    let room = null;

    // Checks if the client already contains the room and fetches or creates the room
    if (roomId in window.app.rooms) {

      // Fetches the room
      room = window.app.rooms[roomId];
    } else {

      // Creates the room
      room = window.app._addRoom(roomId, 'html', true, title);

      // Removes the default HTML
      room.$el.html('');

      // Adds siderooms to the list of siderooms
      if (side) {
        room.isSideRoom = true;
        window.app.sideRoomList.push(window.app.roomList.pop());
      }
    }

    // Checks if the room was fetched or created successfully
    if (!room?.el) {
      console.error('Could not fetch or create the', side ? 'sideroom' : 'room', 'with roomId:', roomId);

      return room;
    }

    // Defines the room dimensions
    room.minWidth = minWidth;
    room.maxWidth = maxWidth;

    // Adds the icon to the tab button
    if (icon) {

      // Creates a copy of the client tab button renderer
      const originalRenderer = window.app.topbar.renderRoomTab.bind(window.app.topbar);

      // Overrides the tab button renderer
      window.app.topbar.renderRoomTab = function(appRoom, appRoomId) {

        // Defines the room
        const rid = appRoom?.id || appRoomId;

        // Executes the client tab button renderer
        const buf = originalRenderer(appRoom, appRoomId);

        // Checks if the room is the one being created and replaces the icon
        if (rid === roomId) {
          return buf.replace('fa-file-text-o', `fa-${icon}`);
        }

        // Returns the buffer for the tab button
        return buf;
      };
    }

    // Sets the focus to the room
    if (focus) {
      window.app[side ? 'focusRoomRight' : 'focusRoom'](room.id);
    }

    // Updates the tab bar
    window.app.topbar.updateTabbar();

    return room;
  };
}