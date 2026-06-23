# P08F LED panel PC status

Sends a 32x16 status frame to the `P08F_1324` BLE LED panel.

The frame shows:

- CPU load
- RAM usage
- CPU temperature in logs when available

The on-panel layout is intentionally large and sparse: one row for CPU and one
row for RAM. Weather is disabled by default because the 32x16 panel becomes hard
to read when too many values are shown at once.

## Setup

```powershell
cd C:\Users\zamoc\Desktop\robolabs-mes-demo\scripts\led_panel_status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
```

## Run once

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-once.ps1
```

## Run continuously

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-loop.ps1
```

By default the panel updates every 5 seconds. Change `interval_seconds` in
`config.json` if you want a slower update rate.

## Autostart at Windows login

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\install-startup-task.ps1
```

To remove autostart:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\uninstall-startup-task.ps1
```

## Configuration

Copy `config.example.json` to `config.json`, then set the BLE panel address:

```powershell
Copy-Item .\config.example.json .\config.json
```

Edit `config.json`.

Weather is disabled by default. If you want to experiment with it again, set
`weather.enabled` to `true` and change `weather.latitude`, `weather.longitude`,
and `weather.timezone`.

Temperature is best-effort on Windows. The script checks LibreHardwareMonitor /
OpenHardwareMonitor WMI first, then ACPI thermal zones. If no sensor is exposed,
the panel shows `T--`.
