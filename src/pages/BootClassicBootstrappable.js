/**
 * Creates the classic bootstrapper template
 * EDITINGNOTE: See note...
 * EDITINGNOTE: Do I need to use detectClassicHost? If so, where?
 */

import { BootBootstrappable } from './BootBootstrappable.js';
import { BootClassicAdapter } from './BootClassicAdapter.js';

export class BootClassicBootstrappable extends BootBootstrappable {

  // Exposes the adapter class
  static Adapter = BootClassicAdapter;

  // Checks if the client is in the single-panel layout
  static hasSinglePanel = () => (
    (window.app.curRoom?.id?.startsWith('battle-') && window.$?.(window).width() < 1275) ||
    window.Dex?.prefs?.('onepanel')
  );

  // Creates a room in the client
  static createHtmlRoom(roomId, title, options) {
    if (typeof window.app?._addRoom !== 'function') {
      console.error(
        '[Gen 3 OU Tools] Cannot create a room because window.app._addRoom is invalid.',
        '\nroom type:', options?.side ? 'sideroom' : 'room',
        '\nwindow.app._addRoom:', typeof window.app?._addRoom,
      );

      return null;
    }

    const { side, icon, focus, minWidth = 320, maxWidth = 1024 } = options || {};

    let room = null;

    // Checks if the client already contains the room and retrieves or creates the room
    if (roomId in window.app.rooms) {
      room = window.app.rooms[roomId];
    } else {
      room = window.app._addRoom(roomId, 'html', true, title);

      room.$el.html('');

      if (side) {
        room.isSideRoom = true;

        window.app.sideRoomList.push(window.app.roomList.pop());
      }
    }

    if (!room?.el) {
      console.error('[Gen 3 OU Tools] Could not retrieve or create the', side ? 'sideroom' : 'room', 'with roomId:', roomId);

      return room;
    }

    room.minWidth = minWidth;
    room.maxWidth = maxWidth;

    // Adds an icon to the room tab
    if (icon) {
      const originalRenderer = window.app.topbar.renderRoomTab.bind(window.app.topbar);

      window.app.topbar.renderRoomTab = function renderCustomRoomTab(appRoom, appRoomId) {
        const rid = appRoom?.id || appRoomId;
        const buf = originalRenderer(appRoom, appRoomId);

        if (rid === roomId) {
          return buf.replace('fa-file-text-o', `fa-${icon}`);
        }

        return buf;
      };
    }

    if (focus) {
      window.app[side ? 'focusRoomRight' : 'focusRoom'](room.id);
    }

    window.app.topbar.updateTabbar();

    return room;
  }
}