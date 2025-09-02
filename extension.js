/*
 * Firejail Launcher GNOME Extension
 * 
 * Automatically runs applications through Firejail sandbox for enhanced security.
 * 
 * Author: Youssef Trii
 * Website: https://github.com/nt-edv
 * License: GPL-3.0
 */

import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Shell from 'gi://Shell';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';

const FIREJAIL_ENABLED_KEY = 'firejail-enabled';

export default class FirejailLauncherExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        this._settings = null;
        this._indicator = null;
        this._firejailEnabled = false;
        this._sandboxLevel = 0;
        this._originalLaunch = null;
        this._originalActivate = null;
        this._originalGioLaunch = null;
    }

    enable() {
        console.log('Enabling Firejail Launcher Extension');
        
        // Use settings if available, otherwise default to enabled
        try {
            this._settings = this.getSettings();
            this._firejailEnabled = this._settings.get_boolean(FIREJAIL_ENABLED_KEY);
            this._sandboxLevel = this._settings.get_uint('sandbox-level');
            this._appOverrides = new Map();
            this._loadAppOverrides();
            
            this._settings.connect('changed::' + FIREJAIL_ENABLED_KEY, () => {
                this._firejailEnabled = this._settings.get_boolean(FIREJAIL_ENABLED_KEY);
                this._updateIndicator();
            });
            
            this._settings.connect('changed::sandbox-level', () => {
                this._sandboxLevel = this._settings.get_uint('sandbox-level');
            });
            
            this._settings.connect('changed::app-overrides', () => {
                this._loadAppOverrides();
            });
        } catch (e) {
            console.log('Settings not available, using default enabled state');
            this._firejailEnabled = true;
            this._sandboxLevel = 0;
        }
        
        this._createIndicator();
        this._hookApplicationLaunching();
    }

    disable() {
        console.log('Disabling Firejail Launcher Extension');
        
        // Restore all original methods
        if (this._originalLaunch) {
            Shell.App.prototype.launch = this._originalLaunch;
        }
        
        if (this._originalActivate) {
            Shell.App.prototype.activate = this._originalActivate;
        }
        
        if (this._originalGioLaunch) {
            Gio.AppInfo.prototype.launch = this._originalGioLaunch;
        }
        
        // Destroy indicator
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        
        // Cleanup settings
        if (this._settings) {
            this._settings = null;
        }
    }

    _createIndicator() {
        this._indicator = new PanelMenu.Button(0.0, 'Firejail Launcher');
        
        // Create icon
        this._icon = new St.Icon({
            icon_name: 'security-medium-symbolic',
            style_class: 'system-status-icon firejail-inactive'
        });
        this._indicator.add_child(this._icon);
        
        // Create menu
        const toggleItem = new PopupMenu.PopupSwitchMenuItem(_('Enable Firejail'), this._firejailEnabled);
        toggleItem.connect('toggled', (item) => {
            this._firejailEnabled = item.state;
            if (this._settings) {
                this._settings.set_boolean(FIREJAIL_ENABLED_KEY, this._firejailEnabled);
            }
        });
        
        this._indicator.menu.addMenuItem(toggleItem);
        
        // Add status item
        this._statusItem = new PopupMenu.PopupMenuItem(_('Status: Disabled'), {
            reactive: false
        });
        this._indicator.menu.addMenuItem(this._statusItem);
        
        this._updateIndicator();
        
        // Add to panel
        Main.panel.addToStatusArea('firejail-launcher', this._indicator);
    }

    _updateIndicator() {
        if (!this._statusItem || !this._icon) return;
        
        if (this._firejailEnabled) {
            this._statusItem.label.text = _('Status: Active');
            this._icon.add_style_class_name('firejail-active');
            this._icon.remove_style_class_name('firejail-inactive');
        } else {
            this._statusItem.label.text = _('Status: Disabled');
            this._icon.add_style_class_name('firejail-inactive');
            this._icon.remove_style_class_name('firejail-active');
        }
    }

    _hookApplicationLaunching() {
        console.log('Firejail: Setting up application launch hooks');
        
        // Hook multiple launch methods
        
        // 1. Shell.App.prototype.launch
        this._originalLaunch = Shell.App.prototype.launch;
        const extension = this;
        
        Shell.App.prototype.launch = function(timestamp, workspace, gpu_pref) {
            const appInfo = this.get_app_info();
            const appId = appInfo.get_id();
            console.log('Firejail: Shell.App.launch intercepted:', appId);
            
            if (extension._firejailEnabled && extension._shouldSandbox(appId)) {
                console.log('Firejail: Launching app with sandbox:', appId);
                
                const executable = appInfo.get_executable();
                if (executable) {
                    const firejailCommand = extension._buildFirejailCommand(executable, appId);
                    
                    if (firejailCommand) {
                        try {
                            GLib.spawn_command_line_async(firejailCommand);
                            console.log('Firejail: Successfully launched:', appId);
                            return;
                        } catch (e) {
                            console.error('Firejail: Launch failed, using normal launch:', e);
                        }
                    }
                }
            }
            
            // Fallback to original launch
            return extension._originalLaunch.call(this, timestamp, workspace, gpu_pref);
        };
        
        // 2. Also hook Shell.App.prototype.activate
        this._originalActivate = Shell.App.prototype.activate;
        Shell.App.prototype.activate = function() {
            const appInfo = this.get_app_info();
            const appId = appInfo.get_id();
            console.log('Firejail: Shell.App.activate intercepted:', appId);
            
            if (extension._firejailEnabled && extension._shouldSandbox(appId)) {
                console.log('Firejail: Activating app with sandbox:', appId);
                
                const executable = appInfo.get_executable();
                if (executable) {
                    const firejailCommand = extension._buildFirejailCommand(executable, appId);
                    
                    if (firejailCommand) {
                        try {
                            GLib.spawn_command_line_async(firejailCommand);
                            console.log('Firejail: Successfully activated:', appId);
                            return;
                        } catch (e) {
                            console.error('Firejail: Activation failed, using normal launch:', e);
                        }
                    }
                }
            }
            
            // Fallback to original activate
            return extension._originalActivate.call(this);
        };
        
        // 3. Hook Gio.AppInfo.launch as well
        this._originalGioLaunch = Gio.AppInfo.prototype.launch;
        Gio.AppInfo.prototype.launch = function(files, context) {
            const appId = this.get_id();
            const executable = this.get_executable();
            console.log('Firejail: Gio.AppInfo.launch intercepted:', appId, executable);
            
            if (extension._firejailEnabled && extension._shouldSandbox(appId)) {
                console.log('Firejail: Gio launching app with sandbox:', appId);
                
                if (executable) {
                    const firejailCommand = extension._buildFirejailCommand(executable, appId);
                    
                    if (firejailCommand) {
                        try {
                            GLib.spawn_command_line_async(firejailCommand);
                            console.log('Firejail: Successfully launched via Gio:', appId);
                            return true;
                        } catch (e) {
                            console.error('Firejail: Gio launch failed:', e);
                        }
                    }
                }
            }
            
            // Fallback to original launch
            return extension._originalGioLaunch.call(this, files, context);
        };
    }

    _shouldSandbox(appId) {
        if (!appId) return false;
        
        // Check for app-specific override first
        if (this._appOverrides && this._appOverrides.has(appId)) {
            const overrideLevel = this._appOverrides.get(appId);
            if (overrideLevel === 99) {
                // Bypass Firejail completely for this app
                console.log(`Firejail: Bypassing sandbox for ${appId} (override)`);
                return false;
            }
            // If override exists but not bypass, we should sandbox this app
            console.log(`Firejail: Using override for ${appId}: level ${overrideLevel}`);
            return true;
        }
        
        // Don't sandbox system critical applications
        const systemApps = [
            'org.gnome.Shell',
            'org.gnome.Settings',
            'org.gnome.SystemMonitor',
            'org.gnome.Terminal',
            'org.gnome.Console',
            'org.gnome.Software',
            'org.gnome.Extensions'
        ];
        
        for (const sysApp of systemApps) {
            if (appId.includes(sysApp)) return false;
        }
        
        // Sandbox these user applications
        const userApps = [
            'org.gnome.Calculator',
            'org.gnome.TextEditor',
            'org.mozilla.firefox',
            'firefox.desktop',
            'org.gnome.Nautilus',
            'org.gnome.gedit'
        ];
        
        for (const userApp of userApps) {
            if (appId.includes(userApp)) return true;
        }
        
        return false; // Conservative approach
    }

    _buildFirejailCommand(executable, appId) {
        let command = 'firejail --quiet --noroot';
        
        // Check for app-specific override first
        let securityLevel = this._sandboxLevel; // Default to global setting
        if (this._appOverrides && this._appOverrides.has(appId)) {
            securityLevel = this._appOverrides.get(appId);
            if (securityLevel === 99) {
                // This should not happen as bypass apps shouldn't reach this function
                console.warn(`Firejail: Bypass app ${appId} reached _buildFirejailCommand`);
                return null;
            }
            console.log(`Firejail: Using override for ${appId}: level ${securityLevel}`);
        }
        
        // Add security level options
        switch (securityLevel) {
            case 1: // Strict
                command += ' --seccomp --disable-mnt';
                break;
            case 2: // Paranoid
                command += ' --seccomp --disable-mnt --net=none --private';
                break;
            default: // Basic (0)
                // Just --quiet --noroot
                break;
        }
        
        command += ` "${executable}"`;
        return command;
    }

    _loadAppOverrides() {
        if (!this._settings) return;
        
        try {
            const overrides = this._settings.get_value('app-overrides').deepUnpack();
            this._appOverrides = new Map(Object.entries(overrides));
            console.log('Firejail: Loaded app overrides:', this._appOverrides);
        } catch (e) {
            console.log('Firejail: No app overrides found or error loading:', e);
            this._appOverrides = new Map();
        }
    }
}
