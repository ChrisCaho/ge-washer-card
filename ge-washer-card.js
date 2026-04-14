const GE_WASHER_CARD_VERSION = '1.3.0';
console.log(`GE Washer Card v${GE_WASHER_CARD_VERSION}: loading...`);

class GeWasherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
  }

  setConfig(config) {
    if (!config.prefix) {
      throw new Error('You need to define a "prefix" (e.g. "sensor.hasvr1_ge_washer_laundry")');
    }
    this._config = {
      prefix: config.prefix.replace(/\/$/, ''),
      name: config.name || 'GE Washer',
    };
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() { return 7; }
  static getConfigElement() { return null; }
  static getStubConfig() {
    return { prefix: 'sensor.hasvr1_ge_washer_laundry', name: 'GE Washer' };
  }

  _getState(suffix) {
    if (!this._hass) return null;
    const entity = this._hass.states[`${this._config.prefix}_${suffix}`];
    return entity ? entity.state : null;
  }

  _getBinary(suffix) {
    if (!this._hass) return null;
    const binaryId = this._config.prefix.replace('sensor.', 'binary_sensor.') + '_' + suffix;
    const entity = this._hass.states[binaryId];
    return entity ? entity.state : null;
  }

  _tempColor(tempLevel) {
    const map = {
      'cold':       { color: '#2266dd', glow: 'rgba(34,102,221,0.4)' },
      'tap cold':   { color: '#3388ee', glow: 'rgba(51,136,238,0.4)' },
      'cool':       { color: '#44aaee', glow: 'rgba(68,170,238,0.4)' },
      'colors':     { color: '#55bbcc', glow: 'rgba(85,187,204,0.4)' },
      'warm':       { color: '#ddaa22', glow: 'rgba(221,170,34,0.4)' },
      'hot':        { color: '#dd6622', glow: 'rgba(221,102,34,0.4)' },
      'extra hot':  { color: '#cc3311', glow: 'rgba(204,51,17,0.4)' },
    };
    return map[(tempLevel || '').toLowerCase()] || { color: '#555', glow: 'rgba(85,85,85,0.2)' };
  }

  _formatTime(seconds) {
    const s = parseFloat(seconds);
    if (!s || s <= 0) return '--';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  _render() {
    if (!this._hass || !this._config) return;

    const machineState = this._getState('machine_state') || 'Off';
    const cycle = this._getState('cycle') || '--';
    const subCycle = this._getState('sub_cycle') || '---';
    const timeRemaining = this._getState('time_remaining');
    const delayRemaining = this._getState('delay_time_remaining');
    const washTemp = this._getState('washer_washtemp_level') || '--';
    const spinTime = this._getState('washer_spintime_level') || '--';
    const soilLevel = this._getState('washer_soil_level') || '--';
    const rinseOption = this._getState('washer_rinse_option') || '---';
    const dispensLoads = this._getState('washer_smart_dispense_loads_left');
    const dispensTank = this._getState('washer_smart_dispense_tank_status') || '--';

    // Binary sensors
    const doorOpen = this._getBinary('door') === 'on';
    const doorLocked = this._getBinary('washer_door_lock') === 'on';
    const prewash = this._getBinary('washer_prewash') === 'on';
    const remoteReady = this._getBinary('remote_status') === 'on';

    const isActive = machineState.toLowerCase() !== 'off';
    const isDelay = delayRemaining && parseFloat(delayRemaining) > 0;
    const isSpin = subCycle.toLowerCase().includes('spin');
    const isRinse = subCycle.toLowerCase().includes('rinse');
    const tc = this._tempColor(washTemp);
    const name = this._config.name;

    // Drum animation speed
    let drumAnim = 'none';
    let agitatorAnim = 'none';
    if (isActive) {
      if (isSpin) {
        drumAnim = 'drumSpin 1.5s linear infinite';
        agitatorAnim = 'drumSpin 1.5s linear infinite';
      } else {
        drumAnim = 'none';
        agitatorAnim = 'agitate 2s ease-in-out infinite';
      }
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          background: linear-gradient(175deg, #1a1a1e 0%, #0d0d10 100%);
          border: 1px solid #2a2a30;
          border-radius: 16px;
          overflow: hidden;
          font-family: 'Segoe UI', Roboto, sans-serif;
          color: #e0e0e0;
          padding: 0;
        }
        .body { padding: 16px 16px 10px; }

        /* Top bar */
        .top-bar {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .brand { font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #888; }
        .name { font-size: 13px; font-weight: 500; color: #aaa; }

        /* LCD */
        .lcd-bezel {
          background: #050508; border: 2px solid #333; border-radius: 8px;
          padding: 3px; margin-bottom: 14px;
          box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);
        }
        .lcd-screen {
          background: linear-gradient(180deg, #080a1a 0%, #0d1025 50%, #080a1a 100%);
          border-radius: 5px; padding: 12px 16px; position: relative; overflow: hidden;
          min-height: 70px; display: flex; flex-direction: column; justify-content: center;
        }
        .lcd-screen.active {
          background: linear-gradient(180deg, #080a1a 0%, #101830 50%, #080a1a 100%);
        }
        .lcd-screen::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px);
          pointer-events: none; z-index: 1;
        }
        .lcd-row { display: flex; align-items: baseline; justify-content: space-between; position: relative; z-index: 2; }
        .lcd-row.main { margin-bottom: 4px; }
        .lcd-cycle {
          font-family: 'Courier New', monospace; font-size: 28px; font-weight: 700;
          color: #66bbff; text-shadow: 0 0 12px rgba(102,187,255,0.6);
          line-height: 1; letter-spacing: 1px; text-transform: uppercase;
        }
        .lcd-cycle.off { color: #5599cc; text-shadow: 0 0 8px rgba(85,153,204,0.4); }
        .lcd-time {
          font-family: 'Courier New', monospace; font-size: 22px;
          color: #55aaee; text-shadow: 0 0 8px rgba(85,170,238,0.4); opacity: 0.9;
        }
        .lcd-sub {
          font-family: 'Courier New', monospace; font-size: 14px;
          color: #5599dd; text-shadow: 0 0 6px rgba(85,153,221,0.4);
          text-transform: uppercase; letter-spacing: 1px;
        }
        .lcd-sub.off { color: #6699cc; text-shadow: 0 0 6px rgba(102,153,204,0.4); }
        .lcd-state {
          font-family: 'Courier New', monospace; font-size: 12px;
          color: #55aaee; text-shadow: 0 0 4px rgba(85,170,238,0.4);
        }

        /* Machine body */
        .machine-body {
          border: 2px solid #3a3a40; border-radius: 14px;
          padding: 12px; margin-bottom: 8px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.1) 100%);
          display: flex; flex-direction: column; align-items: center;
        }

        /* Drum container */
        .drum-container {
          position: relative; width: 200px; height: 200px; margin: 8px 0;
        }
        /* Outer door ring */
        .door-ring {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, #555, #777, #999, #888, #666, #555);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3);
        }
        /* Door glass */
        .door-glass {
          position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, #1a1a1e 0%, #0d0d10 100%);
          box-shadow: inset 0 4px 16px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .door-glass.active {
          background: radial-gradient(circle at 40% 40%, ${tc.color}22 0%, ${tc.color}11 40%, #0d0d10 100%);
          box-shadow: inset 0 0 40px ${tc.glow}, inset 0 4px 16px rgba(0,0,0,0.4);
        }

        /* Inner drum with agitator */
        .drum-inner {
          position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.05);
          animation: ${drumAnim};
        }

        /* Agitator paddles */
        .agitator {
          position: absolute; top: 50%; left: 50%;
          width: 100%; height: 100%;
          transform: translate(-50%, -50%);
          animation: ${agitatorAnim};
        }
        .paddle {
          position: absolute; top: 50%; left: 50%;
          width: 4px; height: 40%;
          background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%);
          border-radius: 2px;
          transform-origin: center top;
        }
        .paddle:nth-child(1) { transform: translate(-50%, 0) rotate(0deg); }
        .paddle:nth-child(2) { transform: translate(-50%, 0) rotate(120deg); }
        .paddle:nth-child(3) { transform: translate(-50%, 0) rotate(240deg); }
        .paddle.active { background: linear-gradient(180deg, ${tc.color}55 0%, ${tc.color}22 100%); }

        /* Drum perforations */
        .perf-ring {
          position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px;
          border-radius: 50%;
          border: 1px dashed rgba(255,255,255,0.06);
        }

        /* Center hub */
        .hub {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 20px; height: 20px; border-radius: 50%;
          background: radial-gradient(circle, #444 0%, #222 100%);
          border: 1px solid #555;
        }

        @keyframes drumSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes agitate {
          0%, 100% { transform: translate(-50%, -50%) rotate(-15deg); }
          50% { transform: translate(-50%, -50%) rotate(15deg); }
        }

        /* Temperature glow ring */
        .glow-ring {
          position: absolute; top: 4px; left: 4px; right: 4px; bottom: 4px;
          border-radius: 50%; border: 2px solid transparent;
          display: none;
        }
        .glow-ring.active {
          display: block;
          border-color: ${tc.color}66;
          box-shadow: 0 0 15px ${tc.glow}, inset 0 0 15px ${tc.glow};
          animation: glowPulse 3s ease-in-out infinite;
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Door handle */
        .door-handle {
          position: absolute; top: 50%; right: -14px; transform: translateY(-50%);
          width: 10px; height: 50px; border-radius: 5px;
          background: linear-gradient(90deg, #666 0%, #444 50%, #555 100%);
          box-shadow: 2px 2px 4px rgba(0,0,0,0.4);
        }
        .door-handle.open {
          background: linear-gradient(90deg, #ff9933 0%, #cc7722 50%, #ff9933 100%);
          box-shadow: 2px 2px 4px rgba(0,0,0,0.4), 0 0 8px rgba(255, 153, 51, 0.4);
        }

        /* Door lock icon */
        .door-icons {
          position: absolute; bottom: 12px; right: 12px;
          display: flex; gap: 6px; z-index: 5;
        }
        .door-icon.locked { font-size: 14px; opacity: 1; color: #4caf50; }

        /* LCD badge for prewash */
        .lcd-badge {
          font-family: 'Courier New', monospace; font-size: 10px;
          color: #55aaee; text-shadow: 0 0 4px rgba(85,170,238,0.4);
          letter-spacing: 1px; text-transform: uppercase;
        }

        /* Water level indicator (washer-specific) */
        .water-level {
          position: absolute; bottom: 8px; left: 8px; right: 8px;
          height: 0; border-radius: 0 0 50% 50%;
          background: linear-gradient(180deg, ${tc.color}15 0%, ${tc.color}08 100%);
          transition: height 0.5s ease;
          display: none;
        }
        .water-level.active {
          display: block;
          height: 35%;
          animation: waterSlosh 3s ease-in-out infinite;
        }
        @keyframes waterSlosh {
          0%, 100% { transform: rotate(-1deg); }
          50% { transform: rotate(1deg); }
        }

        /* Sensor grid */
        .sensor-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 4px; width: 100%; margin-top: 8px;
        }
        .sensor-item {
          background: rgba(255,255,255,0.04); border-radius: 6px;
          padding: 4px 6px; display: flex; flex-direction: column;
        }
        .sensor-label {
          font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px;
          color: #999; margin-bottom: 1px;
        }
        .sensor-value { font-size: 11px; font-weight: 500; color: #e0e0e0; }
        .sensor-value.highlight { color: ${tc.color}; }
        .sensor-value.warn { color: #ff9944; }

        /* Dispenser indicator */
        .dispenser {
          display: flex; align-items: center; gap: 4px;
          font-size: 10px;
        }
        .dispenser-bar {
          flex: 1; height: 4px; background: rgba(255,255,255,0.1);
          border-radius: 2px; overflow: hidden;
        }
        .dispenser-fill {
          height: 100%; border-radius: 2px;
          background: #4caf50;
          transition: width 0.3s;
        }

        /* Footer */
        .footer {
          margin-top: 4px; padding: 4px 4px 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          display: flex; justify-content: space-between; align-items: center;
        }
        .entity-id { font-size: 9px; color: #444; font-family: monospace; }
      </style>

      <ha-card>
        <div class="body">
          <div class="top-bar">
            <span class="brand">GE Profile</span>
            <span class="name">${name}</span>
          </div>

          <div class="lcd-bezel">
            <div class="lcd-screen ${isActive ? 'active' : ''}">
              <div class="lcd-row main">
                <span class="lcd-cycle ${isActive ? '' : 'off'}">${isDelay ? 'DELAY' : (isActive ? cycle : 'OFF')}</span>
                ${isDelay ? `<span class="lcd-time">${this._formatTime(delayRemaining)}</span>` : (isActive && timeRemaining ? `<span class="lcd-time">${this._formatTime(timeRemaining)}</span>` : '')}
              </div>
              <div class="lcd-row">
                <span class="lcd-sub ${isActive ? '' : 'off'}">${isActive ? (subCycle !== '---' ? subCycle : machineState) : machineState}</span>
                <span>
                  ${prewash ? '<span class="lcd-badge">PRE </span>' : ''}
                  ${isActive ? `<span class="lcd-state">${washTemp}</span>` : ''}
                </span>
              </div>
            </div>
          </div>

          <div class="machine-body">
            <div class="drum-container">
              <div class="door-ring"></div>
              <div class="glow-ring ${isActive ? 'active' : ''}"></div>
              <div class="door-glass ${isActive ? 'active' : ''}">
                <div class="water-level ${isActive && !isSpin ? 'active' : ''}"></div>
                <div class="drum-inner">
                  <div class="perf-ring"></div>
                  <div class="agitator">
                    <div class="paddle ${isActive ? 'active' : ''}"></div>
                    <div class="paddle ${isActive ? 'active' : ''}"></div>
                    <div class="paddle ${isActive ? 'active' : ''}"></div>
                  </div>
                  <div class="hub"></div>
                </div>
              </div>
              <div class="door-handle ${doorOpen ? 'open' : ''}"></div>
              ${doorLocked ? '<div class="door-icons"><span class="door-icon locked" title="Door Locked">🔒</span></div>' : ''}
            </div>

            <div class="sensor-grid">
              <div class="sensor-item">
                <span class="sensor-label">Temp</span>
                <span class="sensor-value ${isActive ? 'highlight' : ''}">${washTemp}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Spin</span>
                <span class="sensor-value">${spinTime}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Soil</span>
                <span class="sensor-value">${soilLevel}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Rinse</span>
                <span class="sensor-value">${rinseOption !== '---' ? rinseOption : '--'}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Dispense</span>
                <span class="sensor-value ${dispensTank === 'Full' ? '' : 'warn'}">${dispensTank}</span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Loads Left</span>
                <span class="sensor-value">${dispensLoads != null ? dispensLoads : '--'}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <span class="entity-id">${this._config.prefix}</span>
            <span class="entity-id">v${GE_WASHER_CARD_VERSION}</span>
          </div>
        </div>
      </ha-card>
    `;
  }
}

customElements.define('ge-washer-card', GeWasherCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ge-washer-card',
  name: 'GE Washer Card',
  description: 'Status card for GE Profile front-load washers via SmartHQ',
  preview: true,
});
console.log(`GE Washer Card v${GE_WASHER_CARD_VERSION}: registered.`);
