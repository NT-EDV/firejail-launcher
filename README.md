# Firejail Launcher GNOME Extension

A GNOME Shell Extension that automatically runs applications through Firejail sandbox when enabled.

**Developer:** Youssef Trii  
**Website:** https://github.com/nt-edv

## Features

- **🔒 Automatic Sandboxing** - Transparently runs applications through Firejail
- **🎛️ Easy Control** - Toggle on/off via panel indicator
- **⚙️ Configurable** - Multiple security levels available
- **🛡️ Smart Exclusions** - System-critical applications automatically excluded
- **📱 Per-App Settings** - Individual security levels for specific applications

## Requirements

- GNOME Shell 45 or higher
- Firejail must be installed:
  ```bash
  sudo dnf install firejail
  ```

## Installation

1. **Install Extension:**
   ```bash
   # Run the installation script
   ./install.sh
   ```

2. **Restart GNOME Shell:**
   - **X11:** `Alt + F2` → `r` → Enter
   - **Wayland:** Logout/Login required

3. **Enable Extension:**
   - Open GNOME Extensions app
   - Enable "Firejail Launcher"

## Usage

### Panel Indicator
- **🔒 Green Icon:** Firejail is active
- **🔓 Gray Icon:** Firejail is disabled
- **Click:** Quick toggle on/off

### Settings
Open extension settings via:
- GNOME Extensions App → Firejail Launcher → Settings
- Or: `gnome-extensions prefs firejail-launcher@ytrii.local`

### Security Levels
- **Basic (Recommended):** Lightweight sandboxing with essential protections
- **Strict (Enhanced Security):** Comprehensive protection with system call filtering  
- **Paranoid (Maximum Isolation):** Complete isolation from system and network

### Per-Application Overrides
Set specific security levels for individual applications that override the global setting:
- Firefox → Always Strict mode
- LibreOffice → Always Basic mode
- Unknown software → Always Paranoid mode

## Excluded Applications

The following applications are automatically **NOT** run in Firejail:
- GNOME Shell and system components
- Systemd services
- X11/Wayland server
- NetworkManager
- PulseAudio/PipeWire

## Development

### Debugging
```bash
# View extension logs
journalctl -f -o cat /usr/bin/gnome-shell

# Reload extension (X11 only)
busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s "Meta.restart('Restarting…')"
```

### Customization
The list of applications to sandbox can be modified in `extension.js` in the `_shouldSandbox()` function.

## Security Notes

⚠️ **Important:**
- This extension modifies the default system behavior
- Test thoroughly before production use
- Some applications may not function correctly
- SELinux remains active and complements Firejail

## License

GPL-3.0 License

## Author

**Youssef Trii**  
Website: https://github.com/nt-edv

## Support

For issues, please contact the developer or visit the project website.
