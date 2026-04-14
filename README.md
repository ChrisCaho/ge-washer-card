# GE Washer Card

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://hacs.xyz/)
[![License: Unlicense](https://img.shields.io/badge/license-Unlicense-blue.svg)](https://unlicense.org)

A custom Lovelace card for GE Profile front-load washers connected via the [SmartHQ integration](https://github.com/simbaja/ha_gehome).

> **Looking for all GE appliance cards in one package?** Check out [GE Appliances Card](https://github.com/ChrisCaho/ge-appliances-card) — a bundle containing washer, dryer, and oven cards.

## Features

- Front-load washer design with circular drum door and chrome ring
- Blue LCD display showing cycle, sub-cycle, and time remaining
- Temperature-based color glow (cold blue through hot red)
- Animated agitator paddles during wash, spinning drum during spin cycle
- Water level animation during wash/rinse phases
- Sensor grid: temperature, spin, soil level, rinse option, smart dispense status
- Dark theme matching the GE Profile aesthetic

## Installation

### HACS (Recommended)

1. Open HACS → Frontend → 3-dot menu → Custom repositories
2. Add `https://github.com/ChrisCaho/ge-washer-card` as **Dashboard**
3. Search for "GE Washer Card" and install
4. Refresh your browser (Ctrl+Shift+R)

### Manual

1. Download `ge-washer-card.js` from the [latest release](https://github.com/ChrisCaho/ge-washer-card/releases)
2. Copy to `/config/www/community/ge-washer-card/ge-washer-card.js`
3. Add as a Lovelace resource:
   - URL: `/hacsfiles/ge-washer-card/ge-washer-card.js`
   - Type: JavaScript Module

## Configuration

```yaml
type: custom:ge-washer-card
prefix: sensor.hasvr1_ge_washer_laundry
name: GE Washer  # optional
```

### Options

| Option   | Type   | Required | Default      | Description                        |
|----------|--------|----------|--------------|------------------------------------|
| `prefix` | string | yes      | —            | Entity prefix (without the `_suffix`) |
| `name`   | string | no       | `GE Washer`  | Display name on the card           |

### Entity Suffixes

The card reads these sensor entities automatically using the prefix:

| Suffix                         | Description              |
|--------------------------------|--------------------------|
| `_machine_state`               | Machine state (Off, etc) |
| `_cycle`                       | Current cycle name       |
| `_sub_cycle`                   | Current sub-cycle        |
| `_time_remaining`              | Time remaining (seconds) |
| `_delay_time_remaining`        | Delay start remaining    |
| `_washer_washtemp_level`       | Wash temperature level   |
| `_washer_spintime_level`       | Spin time level          |
| `_washer_soil_level`           | Soil level               |
| `_washer_rinse_option`         | Rinse option             |
| `_washer_smart_dispense_loads_left` | Smart dispense loads left |
| `_washer_smart_dispense_tank_status` | Smart dispense tank status |

## Temperature Color Map

| Temperature | Color   |
|-------------|---------|
| Cold        | #2266dd |
| Tap Cold    | #3388ee |
| Cool        | #44aaee |
| Colors      | #55bbcc |
| Warm        | #ddaa22 |
| Hot         | #dd6622 |
| Extra Hot   | #cc3311 |

## Compatibility

- Designed for GE Profile front-load washers via SmartHQ integration
- Requires Home Assistant 2024.1+
- Works with HACS

## License

This project is released into the public domain under [The Unlicense](LICENSE).
