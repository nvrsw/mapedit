var app_gui = require("nw.gui");
var app_window;

$(function() {
  app_window = app_gui.Window.get();

  var menu = new app_gui.Menu({ type: 'menubar' });
  var submenu;

  submenu = new app_gui.Menu();
  submenu.append(new app_gui.MenuItem({ label: 'New File' }));
  submenu.append(new app_gui.MenuItem({ label: 'Open File' }));
  submenu.append(new app_gui.MenuItem({ label: 'Save' }));
  submenu.append(new app_gui.MenuItem({ label: 'Save As' }));
  submenu.append(new app_gui.MenuItem({ label: 'Close File' }));
  submenu.append(new app_gui.MenuItem({ label: 'Exit',
                                        click: function() {
                                          app_window.close(true);
                                        }
                                      }));

  menu.append(new app_gui.MenuItem({ label: 'File', submenu: submenu }));

  // attach menu to window
  app_window.menu = menu;
  app_window.show();

  // for debugging
  app_window.showDevTools();
});