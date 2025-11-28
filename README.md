# ADB Performance Optimizer

A web-based tool for Android performance tuning via ADB commands. Control 43 optimizations across 13 categories through a clean interface.

## Quick Start

```bash
./run.sh    # macOS/Linux
run.bat     # Windows
```

The server starts at **http://localhost:8765** and opens automatically in your browser.

**Stop server:** Press `Ctrl+C`

<table>
  <tr>
    <td width="33%">
      <a href="docs/screenshot_part1.png">
        <img src="docs/screenshot_part1.png" alt="ADB Performance Optimizer - Top Section" width="100%">
      </a>
    </td>
    <td width="33%">
      <a href="docs/screenshot_part2.png">
        <img src="docs/screenshot_part2.png" alt="ADB Performance Optimizer - Middle Section" width="100%">
      </a>
    </td>
    <td width="33%">
      <a href="docs/screenshot_part3.png">
        <img src="docs/screenshot_part3.png" alt="ADB Performance Optimizer - Bottom Section" width="100%">
      </a>
    </td>
  </tr>
</table>

## Requirements

- **Python 3.10+**
- **ADB (Android Debug Bridge)** - [installation instructions below](#installing-adb)
- **UV package manager** - auto-installed by run scripts if missing
- **Android device** with USB debugging enabled

## Installing ADB

**macOS:**
```bash
brew install android-platform-tools
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install android-tools-adb
```

**Windows:**

Download [Android SDK Platform Tools](https://developer.android.com/studio/releases/platform-tools) and add to PATH.

**Verify installation:**
```bash
adb version
```

## Setup Your Device

1. **Enable Developer Mode:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

3. **Connect & Authorize:**
   - Connect your device via USB
   - Accept the "Allow USB debugging?" prompt on your device
   - Check the "Always allow from this computer" box

4. **Verify Connection:**
   ```bash
   adb devices
   ```
   You should see your device listed.

## Usage

1. Run the application with `./run.sh` or `run.bat`
2. Select your device from the dropdown
3. Browse command categories organized by impact level
4. Toggle commands on/off with a single click
5. View real-time command output and current states

Your preferences are saved and persist across sessions.

## What It Does

This tool provides a user-friendly interface for ADB commands that optimize Android performance. Commands are organized by impact:

### High Impact
- **Animation Settings** (3 commands) - Disable UI animations for instant response
- **Background Processes** (1 command) - Clear caches and free up RAM
- **Fixed Performance Mode** (1 command) - Lock CPU/GPU to maximum (may heat up device)
- **RAM Plus** (2 commands) - Disable virtual RAM expansion

### Medium Impact
- **Display & Refresh Rate** (4 commands) - Adjust refresh rate, blur, transparency
- **App Launch Speed** (4 commands) - Optimize app startup process
- **Game Optimization** (4 commands) - Disable Samsung throttling (Samsung devices only)
- **Audio Quality** (2 commands) - Enable K2HD and Tube Amp effects
- **Touchscreen Response** (4 commands) - Reduce touch latency

### Low Impact
- **System Optimization** (4 commands) - CPU/GPU rendering tweaks
- **Private DNS** (2 commands) - Configure DNS for privacy
- **Network Performance** (7 commands) - WiFi and cellular optimizations
- **Power Management** (5 commands) - Battery and sleep settings

## Manual Installation

If you prefer to install dependencies manually:

```bash
# Install UV package manager
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Run the application
uv run python app.py
```

Learn more about UV at [docs.astral.sh/uv](https://docs.astral.sh/uv/)


## API Reference

The Flask backend exposes these endpoints:

```
GET  /                          # Web interface
GET  /api/check-adb             # Verify ADB installation
GET  /api/devices               # List connected devices
GET  /api/device-info/<id>      # Get device details
GET  /api/categories            # Get all command categories
GET  /api/command-states/<id>   # Get current command states
POST /api/execute               # Execute a command
POST /api/get-setting           # Get current setting value
```

### Example API Usage

**Check ADB availability:**
```bash
curl http://localhost:8765/api/check-adb
```

**List devices:**
```bash
curl http://localhost:8765/api/devices
```

**Execute a command:**
```bash
curl -X POST http://localhost:8765/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "your_device_id",
    "command": "shell settings put global window_animation_scale 0.0",
    "action": "disable"
  }'
```

## Troubleshooting

**No devices found?**
- Verify USB cable is properly connected
- Ensure USB debugging is enabled in Developer Options
- Accept the debugging authorization prompt on your device
- Try running `adb devices` in terminal to verify ADB can see your device
- Try a different USB cable or port
- On Linux, you may need udev rules for your device

**ADB not found?**
- Install ADB using the instructions above
- Ensure ADB is in your system PATH
- Restart your terminal after installation
- On Windows, you may need to add the platform-tools directory to your PATH manually

**Command failed or no effect?**
- Check the console output for detailed error messages
- Some commands require specific Android versions (API level)
- Samsung-only commands won't work on other manufacturers
- Some settings may require a device reboot to take effect
- Try running the command manually via `adb shell` to see raw output

**Port 8765 already in use?**
```bash
./cleanup.sh              # macOS/Linux
pkill -f "python.*app.py" # Manual cleanup
```

**Permission denied errors?**
- Ensure USB debugging is authorized
- Some commands may not work on all devices/Android versions
- Manufacturer-specific restrictions may apply

## Tech Stack

- **Backend:** Python 3.10+, Flask 3.0+, Flask-CORS 4.0+
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Tools:** Android Debug Bridge (ADB), UV package manager
- **Design:** Responsive, mobile-first, accessible


## Important Notes

⚠️ **Use with caution:**
- These optimizations can affect battery life and device stability
- Some commands may cause overheating, especially Fixed Performance Mode
- Always understand what a command does before executing it
- Some changes require a device reboot to take full effect
- You can always re-enable settings through the interface

⚠️ **Device compatibility:**
- Most commands work on Android 5.0+ (API level 21+)
- Samsung-specific commands are clearly marked
- Some commands may not work on all devices or Android versions
- Manufacturer skins (One UI, MIUI, etc.) may behave differently

## Contributing

Contributions are welcome! This is a straightforward project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with real devices
5. Submit a pull request

Areas for improvement:
- Additional command categories
- Better device compatibility detection
- Batch command execution
- Command presets/profiles
- Undo/restore functionality

## Credits

Command collection inspired by [Technastic's ADB Commands Guide](https://technastic.com/adb-commands-improve-performance-android/).

Built for the Android developer community.


## License

```
Copyright 2025 Jan Rabe & CHECK24

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

**Questions or issues?** Open an issue on GitHub.

**Found this useful?** Star the repository to help others discover it.
