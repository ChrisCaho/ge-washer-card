# GE Washer Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A custom Lovelace card for Home Assistant that displays a live status panel for GE Profile front-load washers connected via the SmartHQ integration.

![GE Washer Card](https://raw.githubusercontent.com/ChrisCaho/ge-washer-card/main/screenshot.png)

> Looking for all GE appliance cards in one package? Check out [GE Appliances Card](https://github.com/ChrisCaho/ge-appliances-card), a bundle containing the washer, dryer, and dishwasher cards together.

---

## Features

- Blue LCD display with CRT scanline effect showing the active cycle name, time remaining, sub-cycle phase, and wash temperature setting
- Front-load washer drum visualization with a metallic door ring, dark glass window, and door handle on the right side
- Agitator paddles that rock back and forth during wash phases, switching to a full continuous spin during spin sub-cycles
- Temperature-based color glow on the drum glass and sensor values, ranging from cool blue (Cold) through amber (Warm) to deep red (Extra Hot)
- Water level animation visible inside the drum during active non-spin phases, hidden during spin
- Door open indicator displayed near the drum when the washer door is physically open
- Door lock indicator displayed when the door is electronically locked during a cycle
- PRE badge on the LCD when the prewash option is active for the current cycle
- Delay start countdown: the LCD switches to "DELAY" mode and shows the remaining delay time when a delay start is programmed
- 6-cell sensor grid showing Temp, Spin speed, Soil level, Rinse option, Smart Dispense tank status, and Smart Dispense loads remaining
- Smart Dispense tank status highlighted in orange when not reporting "Full"
- Footer showing the configured entity prefix and card version for quick diagnostics
- Dark theme matching the GE Profile aesthetic

---

## Prerequisites

- Home Assistant with the [SmartHQ integration](https://github.com/simbaja/ha_gehome) configured and your GE washer discovered
- [HACS](https://hacs.xyz/) installed in your Home Assistant instance

---

## Installation via HACS

1. Open HACS in your Home Assistant sidebar.
2. Go to **Frontend**.
3. Click the three-dot menu in the top right and select **Custom repositories**.
4. Add the following repository with category **Lovelace**:
   ```
   ChrisCaho/ge-washer-card
   ```
5. Click **Add**, then close the dialog.
6. Search for **GE Washer Card** in the HACS Frontend section and install it.
7. Hard-refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) after installation.

### Manual Installation

1. Download `ge-washer-card.js` from the [latest release](https://github.com/ChrisCaho/ge-washer-card/releases).
2. Copy it to `/config/www/community/ge-washer-card/ge-washer-card.js`.
3. Add it as a Lovelace resource:
   - URL: `/hacsfiles/ge-washer-card/ge-washer-card.js`
   - Type: JavaScript Module
4. Hard-refresh your browser.

---

## Configuration

Add the card to any Lovelace dashboard using the YAML editor:

```yaml
type: custom:ge-washer-card
prefix: sensor.hasvr1_ge_washer_laundry
name: "GE Washer"
```

### Configuration Options

| Option   | Required | Default      | Description                                                                    |
|----------|----------|--------------|--------------------------------------------------------------------------------|
| `prefix` | Yes      | —            | The entity ID prefix for your washer sensors (without a trailing underscore).  |
| `name`   | No       | `GE Washer`  | Display name shown in the top-right corner of the card.                        |

---

## Finding Your Prefix

The card discovers all of its sensors automatically from a single prefix string. To find yours:

1. Go to **Settings > Devices & Services > Entities** in Home Assistant.
2. Search for your washer. Look for entities like `sensor.yourname_ge_washer_machine_state` or `sensor.yourname_ge_washer_cycle`.
3. Your prefix is everything up to and including the part before the final `_machine_state` or `_cycle` suffix.

**Example:** If your entity is `sensor.hasvr1_ge_washer_laundry_machine_state`, the prefix is `sensor.hasvr1_ge_washer_laundry`.

---

## Entity Requirements

All entities are auto-discovered by appending the suffixes listed below to your configured prefix. Binary sensors are found by replacing `sensor.` with `binary_sensor.` in the prefix automatically.

### Sensors (prefix + suffix)

| Suffix                                | Description                                 |
|---------------------------------------|---------------------------------------------|
| `_machine_state`                      | Overall machine state (Off, Running, etc.)  |
| `_cycle`                              | Active cycle name (Normal, Heavy Duty, etc.)|
| `_sub_cycle`                          | Current phase (Wash, Rinse, Spin, etc.)     |
| `_time_remaining`                     | Time remaining in seconds                   |
| `_delay_time_remaining`               | Delay start countdown in seconds            |
| `_washer_washtemp_level`              | Wash temperature setting                    |
| `_washer_spintime_level`              | Spin speed setting                          |
| `_washer_soil_level`                  | Soil level setting                          |
| `_washer_rinse_option`                | Rinse option setting                        |
| `_washer_smart_dispense_loads_left`   | Smart Dispense estimated loads remaining    |
| `_washer_smart_dispense_tank_status`  | Smart Dispense tank fill status             |

### Binary Sensors (binary_sensor prefix + suffix)

| Suffix                | Description                                             |
|-----------------------|---------------------------------------------------------|
| `_door`               | Door open/closed state — icon shown near the drum       |
| `_washer_door_lock`   | Door lock state — lock icon shown when locked           |
| `_washer_prewash`     | Prewash option active — PRE badge shown on the LCD      |

Not all entities need to be present. The card gracefully displays "--" or hides elements when a sensor is unavailable.

---

## Temperature Color Reference

The drum glow and Temp sensor value change color based on the wash temperature setting:

| Setting    | Color       |
|------------|-------------|
| Cold       | Deep blue   |
| Tap Cold   | Blue        |
| Cool       | Light blue  |
| Colors     | Teal        |
| Warm       | Amber       |
| Hot        | Orange      |
| Extra Hot  | Red         |

---

## Compatibility

- Designed for GE Profile front-load washers via the SmartHQ integration
- Requires Home Assistant 2024.1 or later
- Works with HACS

---

## License

MIT License. See [LICENSE](LICENSE) for details.
