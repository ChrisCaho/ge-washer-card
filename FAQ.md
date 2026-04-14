# GE Washer Card — Frequently Asked Questions

---

## General

### What does "Loads Left: 255" mean?

The value 255 is a sentinel value returned by the GE Smart Dispense system when the cartridge level cannot be determined — typically because the cartridge is not installed, is empty, or the washer has not completed enough cycles to estimate remaining detergent. It does not mean there are 255 loads remaining. If you see this value, check that your Smart Dispense cartridge is properly seated and filled.

### Can I control the washer from this card?

No. The GE Washer Card is a monitoring-only display. It reads sensor and binary sensor state from Home Assistant but does not send any commands to the washer. Starting, stopping, or adjusting cycles must be done through the SmartHQ app or the washer's physical controls.

### Which GE washers are compatible?

The card is designed for GE Profile front-load washers that expose their state through the SmartHQ integration. Any model that provides the standard sensor suffixes (machine_state, cycle, sub_cycle, etc.) should work. Top-load washers may function partially but the drum visualization is styled for front-loaders.

---

## Display and Animations

### Why is the drum not spinning?

The full spin animation only activates when the `sub_cycle` sensor contains the word "spin". During all other active phases (Wash, Rinse, Soak, etc.) the agitator paddles rock back and forth instead. If the machine is running but neither animation is playing, check that the `_sub_cycle` entity is reporting correctly through the SmartHQ integration.

### What do the colors on the drum and temperature cell mean?

The colors indicate the wash temperature setting for the current cycle:

- Deep blue — Cold
- Blue — Tap Cold
- Light blue — Cool
- Teal — Colors
- Amber — Warm
- Orange — Hot
- Red — Extra Hot

When the washer is off, the drum glass and temperature value appear in a neutral grey.

### What is the water animation inside the drum?

A subtle animated water level is shown at the bottom of the drum glass during active wash and rinse phases. It disappears automatically during spin cycles because the drum is draining or spinning dry at that point.

### Why is the Dispense tank status showing in orange?

The tank status cell turns orange whenever the sensor reports anything other than "Full". This is intentional — it draws your attention when the Smart Dispense cartridge is low, empty, or in an unknown state. When the cartridge is full and properly reporting, the value is displayed in the standard white color.

---

## Status Icons and Badges

### What is the door icon near the drum?

The door icon appears when the `binary_sensor` for the washer door (`_door` suffix) reports `on`, meaning the door is physically open. It is displayed in amber to make it visible at a glance. The icon disappears as soon as the door is closed.

### What is the lock icon near the drum?

The lock icon appears when the `binary_sensor` for the door lock (`_washer_door_lock` suffix) reports `on`. GE washers lock the door during active cycles as a safety measure. The green lock icon indicates the door is currently locked and cannot be opened. It disappears once the lock disengages at the end of the cycle.

### What is the PRE badge on the LCD?

The PRE badge appears on the LCD when the `binary_sensor` for prewash (`_washer_prewash` suffix) reports `on`. This means the prewash option is active for the current cycle — the washer will perform a short pre-soak before starting the main wash phase. It disappears once that option is no longer selected or the cycle completes.

### What does "DELAY" on the LCD mean?

When a delay start is programmed, the LCD main display switches from the cycle name to "DELAY" and shows a countdown timer based on the `_delay_time_remaining` sensor. Once the countdown reaches zero and the cycle starts, the LCD returns to showing the cycle name and time remaining normally.

---

## Setup and Configuration

### The card shows nothing or throws a prefix error

The only required configuration option is `prefix`. If it is missing or misspelled, the card will throw an error. Verify:

1. Your YAML contains `prefix:` at the card level (not indented under a different key).
2. The prefix does not have a trailing underscore or slash — it should end with the last segment before any suffix, for example `sensor.hasvr1_ge_washer_laundry`.
3. At least one sensor with that prefix exists in your Home Assistant entities list.

### How do I find my entity prefix?

1. Go to **Settings > Devices & Services > Entities**.
2. Search for your washer name or "ge washer".
3. Find any sensor for your washer, such as `sensor.hasvr1_ge_washer_laundry_machine_state`.
4. Remove the final `_machine_state` (or whatever suffix is at the end) and use the remainder as your prefix: `sensor.hasvr1_ge_washer_laundry`.

You can verify the prefix is correct by checking that entities like `sensor.YOUR_PREFIX_cycle` and `sensor.YOUR_PREFIX_time_remaining` appear in your entity list.

### The card installed but does not appear in the card picker

After installing through HACS, do a hard-refresh of your browser (Ctrl+Shift+R on Windows/Linux, Cmd+Shift+R on macOS). Lovelace caches JavaScript resources and may not pick up the new card until the cache is cleared.

### Can I use this without HACS?

Yes. Download `ge-washer-card.js` from the releases page, place it in your `/config/www/` directory, and register it as a Lovelace resource pointing to `/local/ge-washer-card.js` with type JavaScript Module. Then use `type: custom:ge-washer-card` in your dashboard YAML as normal.

---

## Bundle

### What is the ge-appliances-card bundle?

[GE Appliances Card](https://github.com/ChrisCaho/ge-appliances-card) is a single HACS repository that includes the GE Washer Card, the GE Dryer Card, and the GE Dishwasher Card together. If you have multiple GE appliances, installing the bundle is simpler than adding three separate custom repositories.
