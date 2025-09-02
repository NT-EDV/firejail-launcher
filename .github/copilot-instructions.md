# Firejail Launcher GNOME Extension

**Author:** Youssef Trii  
**Website:** https://github.com/nt-edv

## Project Status

- [x] GNOME Extension Structure Created
- [x] Firejail Integration Implemented  
- [x] Settings UI with Two-Tab Interface
- [x] Per-Application Security Overrides
- [x] Panel Indicator with Status
- [x] Installation Script
- [x] GSettings Schema with App Overrides
- [x] Documentation Complete
- [x] Project Cleaned and Finalized

## Features Implemented

- **Global Settings:** Enable/disable Firejail, default security levels
- **App Overrides:** Per-application security level configuration
- **Security Levels:** Basic (Recommended), Strict (Enhanced), Paranoid (Maximum)
- **Smart Filtering:** Automatic exclusion of system-critical applications
- **Panel Integration:** Visual indicator with toggle functionality

## Technical Implementation

- **Extension Hooks:** Shell.App.launch, Shell.App.activate, Gio.AppInfo.launch
- **Settings Management:** GSettings with real-time updates
- **UI Framework:** Adw (libadwaita) for modern GNOME preferences
- **Security Profiles:** Configurable Firejail parameter sets per security level
