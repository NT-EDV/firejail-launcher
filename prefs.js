/*
 * Firejail Launcher GNOME Extension - Preferences
 * 
 * Settings interface for configuring application sandboxing behavior.
 * 
 * Author: Youssef Trii
 * Website: https://github.com/nt-edv
 * License: GPL-3.0
 */

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        
        // Global Settings Page
        const globalPage = new Adw.PreferencesPage({
            title: _('Global Settings'),
            icon_name: 'security-high-symbolic',
        });
        
        const globalGroup = new Adw.PreferencesGroup({
            title: _('Global Sandbox Settings'),
            description: _('Configure default Firejail sandboxing behavior'),
        });
        
        // Enable/Disable toggle
        const enableRow = new Adw.SwitchRow({
            title: _('Enable Firejail for all applications'),
            subtitle: _('When enabled, applications will be launched in Firejail sandbox'),
        });
        
        enableRow.set_tooltip_text(_('Toggle to enable/disable automatic Firejail sandboxing for all supported applications'));
        
        settings.bind(
            'firejail-enabled',
            enableRow,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        // Global sandbox level selection
        const levelRow = new Adw.ComboRow({
            title: _('Default Sandbox Security Level'),
            subtitle: _('Choose the default security level for all applications'),
        });
        
        const levelModel = new Gtk.StringList();
        levelModel.append(_('Basic (Recommended) - Lightweight sandboxing with essential protections'));
        levelModel.append(_('Strict (Enhanced Security) - Comprehensive protection with system call filtering'));
        levelModel.append(_('Paranoid (Maximum Isolation) - Complete isolation from system and network'));
        levelRow.set_model(levelModel);
        
        levelRow.set_tooltip_text(_('Security Levels:\n\nBasic: Blocks root privileges, reduces attack surface, full network and filesystem access maintained. Best for daily applications, media players, office tools.\n\nStrict: System call filtering blocks dangerous operations, prevents mount access, maintains network connectivity. Best for web browsers, email clients, untrusted software.\n\nParanoid: Complete isolation with private filesystem and no network connectivity. Best for document viewers, image editors, offline tools.'));
        
        settings.bind(
            'sandbox-level',
            levelRow,
            'selected',
            Gio.SettingsBindFlags.DEFAULT
        );
        
        globalGroup.add(enableRow);
        globalGroup.add(levelRow);
        globalPage.add(globalGroup);
        
        // Application Overrides Page
        const overridesPage = new Adw.PreferencesPage({
            title: _('App Overrides'),
            icon_name: 'applications-system-symbolic',
        });
        
        const overridesGroup = new Adw.PreferencesGroup({
            title: _('Per-Application Security Levels'),
            description: _('Set specific security levels for individual applications (overrides global setting)'),
        });
        
        // Create application override UI
        this._createAppOverridesUI(overridesGroup, settings);
        
        overridesPage.add(overridesGroup);
        
        // Add pages to window
        window.add(globalPage);
        window.add(overridesPage);
    }
    
    _createAppOverridesUI(group, settings) {
        // Get installed applications
        let apps = [];
        
        try {
            const appInfos = Gio.AppInfo.get_all();
            apps = appInfos.filter(appInfo => appInfo.should_show());
        } catch (e) {
            console.log('Could not get app list:', e);
            return;
        }
        
        // Sort apps by name
        apps.sort((a, b) => {
            const nameA = a.get_display_name().toLowerCase();
            const nameB = b.get_display_name().toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        // Load current overrides
        let currentOverrides = {};
        try {
            currentOverrides = settings.get_value('app-overrides').deepUnpack();
        } catch (e) {
            console.log('No app overrides found');
        }
        
        // Create scrollable list
        const scrolled = new Gtk.ScrolledWindow({
            vexpand: true,
            hexpand: true,
            min_content_height: 300,
        });
        
        const listBox = new Gtk.ListBox({
            selection_mode: Gtk.SelectionMode.NONE,
        });
        listBox.add_css_class('boxed-list');
        
        // Add apps to list (limit to 50 for performance)
        apps.slice(0, 50).forEach(appInfo => {
            const appId = appInfo.get_id();
            const appName = appInfo.get_display_name();
            const appIcon = appInfo.get_icon();
            
            const row = new Adw.ComboRow({
                title: appName,
                subtitle: appId,
            });
            
            // Add app icon if available
            if (appIcon) {
                const iconImage = new Gtk.Image({
                    gicon: appIcon,
                    pixel_size: 32,
                });
                row.add_prefix(iconImage);
            }
            
            // Create model for this app
            const model = new Gtk.StringList();
            model.append(_('Use Global Setting'));
            model.append(_('Basic - Lightweight protection'));
            model.append(_('Strict - Enhanced security'));
            model.append(_('Paranoid - Maximum isolation'));
            model.append(_('Bypass Firejail - Run without sandbox'));
            row.set_model(model);
            
            // Set current selection
            const currentLevel = currentOverrides[appId];
            if (currentLevel !== undefined) {
                if (currentLevel === 99) {
                    row.set_selected(4); // Bypass option is index 4
                } else {
                    row.set_selected(currentLevel + 1); // +1 because 0 is "Use Global"
                }
            } else {
                row.set_selected(0); // Use Global
            }
            
            // Connect to changes
            row.connect('notify::selected', () => {
                const selected = row.get_selected();
                const newOverrides = {...currentOverrides};
                
                if (selected === 0) {
                    // Use Global - remove override
                    delete newOverrides[appId];
                } else if (selected === 4) {
                    // Bypass Firejail
                    newOverrides[appId] = 99;
                } else {
                    // Set specific level (subtract 1 because 0 is "Use Global")
                    newOverrides[appId] = selected - 1;
                }
                
                // Save to settings
                const variant = GLib.Variant.new('a{su}', newOverrides);
                settings.set_value('app-overrides', variant);
                currentOverrides = newOverrides;
            });
            
            listBox.append(row);
        });
        
        scrolled.set_child(listBox);
        
        // Add info label
        const infoLabel = new Gtk.Label({
            label: _('Configure individual security levels for specific applications.\nThese settings override the global security level.'),
            wrap: true,
            margin_top: 12,
        });
        infoLabel.add_css_class('dim-label');
        
        group.add(infoLabel);
        group.add(scrolled);
    }
}
