const GE_WASHER_CARD_VERSION = '1.4.1';
console.log(`GE Washer Card v${GE_WASHER_CARD_VERSION}: loading...`);

class GeWasherCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = null;
    this._rendered = false;
  }

  setConfig(config) {
    if (!config.prefix) {
      throw new Error('You need to define a "prefix" (e.g. "sensor.hasvr1_ge_washer_laundry")');
    }
    this._config = {
      prefix: config.prefix.replace(/\/$/, ''),
      name: config.name || 'GE Washer',
    };
    this._rendered = false;
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
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

  // Gather all display data from current state
  _getDisplayData() {
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

    const doorOpen = this._getBinary('door') === 'on';
    const doorLocked = this._getBinary('washer_door_lock') === 'on';
    const prewash = this._getBinary('washer_prewash') === 'on';

    const isActive = machineState.toLowerCase() !== 'off';
    const isDelay = delayRemaining && parseFloat(delayRemaining) > 0;
    const isSpin = subCycle.toLowerCase().includes('spin');
    const isRinse = subCycle.toLowerCase().includes('rinse');
    const isFill = subCycle.toLowerCase() === 'fill';
    const isLocked = doorLocked || (isActive && !doorOpen);
    const tc = this._tempColor(washTemp);

    // Drum animation classes
    let drumClass = 'drum-inner';
    let agitatorClass = 'agitator';
    if (isActive && isSpin) {
      drumClass += ' spinning';
      agitatorClass += ' spinning';
    } else if (isActive) {
      agitatorClass += ' agitating';
    }

    // LCD text
    let lcdCycleText = isDelay ? 'DELAY' : (isActive ? cycle : 'OFF');
    let lcdTimeText = '';
    if (isDelay) {
      lcdTimeText = this._formatTime(delayRemaining);
    } else if (isActive && timeRemaining) {
      lcdTimeText = this._formatTime(timeRemaining);
    }
    let lcdSubText = isActive ? (subCycle !== '---' ? subCycle : machineState) : machineState;

    return {
      isActive, isDelay, isSpin, isRinse, isFill, isLocked,
      doorOpen, prewash,
      tc,
      drumClass, agitatorClass,
      lcdCycleText, lcdTimeText, lcdSubText,
      washTemp, spinTime, soilLevel,
      rinseOption: rinseOption !== '---' ? rinseOption : '--',
      dispensTank,
      dispensLoads: dispensLoads != null ? dispensLoads : '--',
      dispensTankWarn: dispensTank !== 'Full',
    };
  }

  // Build initial DOM (called once)
  _buildDom() {
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

        /* LCD badge for prewash */
        .lcd-badge {
          font-family: 'Courier New', monospace; font-size: 10px;
          color: #55aaee; text-shadow: 0 0 4px rgba(85,170,238,0.4);
          letter-spacing: 1px; text-transform: uppercase;
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
        /* Door glass — uses CSS custom properties for dynamic color */
        .door-glass {
          position: absolute; top: 8px; left: 8px; right: 8px; bottom: 8px;
          border-radius: 50%;
          background: radial-gradient(circle, #1a1a1e 0%, #0d0d10 100%);
          box-shadow: inset 0 4px 16px rgba(0,0,0,0.6);
          overflow: hidden;
        }
        .door-glass.active {
          background: radial-gradient(circle at 40% 40%, var(--tc-color-22) 0%, var(--tc-color-11) 40%, #0d0d10 100%);
          box-shadow: inset 0 0 40px var(--tc-glow), inset 0 4px 16px rgba(0,0,0,0.4);
        }

        /* Inner drum */
        .drum-inner {
          position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .drum-inner.spinning {
          animation: drumSpin 1.5s linear infinite;
        }

        /* Agitator */
        .agitator {
          position: absolute; top: 50%; left: 50%;
          width: 100%; height: 100%;
          transform: translate(-50%, -50%);
        }
        .agitator.spinning {
          animation: drumSpin 1.5s linear infinite;
        }
        .agitator.agitating {
          animation: agitate 2s ease-in-out infinite;
        }

        /* Paddles */
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
        .paddle.active {
          background: linear-gradient(180deg, var(--tc-color-55) 0%, var(--tc-color-22) 100%);
        }

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

        /* Temperature glow ring — uses CSS custom properties */
        .glow-ring {
          position: absolute; top: 4px; left: 4px; right: 4px; bottom: 4px;
          border-radius: 50%; border: 2px solid transparent;
          display: none;
        }
        .glow-ring.active {
          display: block;
          border-color: var(--tc-color-66);
          box-shadow: 0 0 15px var(--tc-glow), inset 0 0 15px var(--tc-glow);
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
        .lock-icon {
          position: absolute; top: 50%; right: -28px; transform: translateY(-50%);
          font-size: 12px; color: #4caf50; z-index: 5;
          filter: drop-shadow(0 0 4px rgba(76, 175, 80, 0.5));
          display: none;
        }
        .lock-icon.visible { display: block; }

        /* Water fill icon */
        .fill-icon {
          position: absolute; top: 14px; left: 16px;
          font-size: 16px; z-index: 5;
          color: #55aaee;
          filter: drop-shadow(0 0 6px rgba(85, 170, 238, 0.6));
          animation: fillPulse 1.5s ease-in-out infinite;
          display: none;
        }
        .fill-icon.visible { display: block; }
        @keyframes fillPulse {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        /* Water level indicator — uses CSS custom properties */
        .water-level {
          position: absolute; bottom: 8px; left: 8px; right: 8px;
          height: 0; border-radius: 0 0 50% 50%;
          background: linear-gradient(180deg, var(--tc-color-15) 0%, var(--tc-color-08) 100%);
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
        .sensor-value.highlight { color: var(--tc-color); }
        .sensor-value.warn { color: #ff9944; }

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
            <span class="name" data-field="name"></span>
          </div>

          <div class="lcd-bezel">
            <div class="lcd-screen" data-field="lcdScreen">
              <div class="lcd-row main">
                <span class="lcd-cycle" data-field="lcdCycle"></span>
                <span class="lcd-time" data-field="lcdTime"></span>
              </div>
              <div class="lcd-row">
                <span class="lcd-sub" data-field="lcdSub"></span>
                <span>
                  <span class="lcd-badge" data-field="lcdPrewash"></span>
                  <span class="lcd-state" data-field="lcdState"></span>
                </span>
              </div>
            </div>
          </div>

          <div class="machine-body">
            <div class="drum-container">
              <div class="door-ring"></div>
              <div class="glow-ring" data-field="glowRing"></div>
              <div class="door-glass" data-field="doorGlass">
                <span class="fill-icon" data-field="fillIcon" title="Filling">💧</span>
                <div class="water-level" data-field="waterLevel"></div>
                <div class="drum-inner" data-field="drumInner">
                  <div class="perf-ring"></div>
                  <div class="agitator" data-field="agitator">
                    <div class="paddle" data-field="paddle1"></div>
                    <div class="paddle" data-field="paddle2"></div>
                    <div class="paddle" data-field="paddle3"></div>
                  </div>
                  <div class="hub"></div>
                </div>
              </div>
              <div class="door-handle" data-field="doorHandle"></div>
              <span class="lock-icon" data-field="lockIcon" title="Door Locked">🔒</span>
            </div>

            <div class="sensor-grid">
              <div class="sensor-item">
                <span class="sensor-label">Temp</span>
                <span class="sensor-value" data-field="sensorTemp"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Spin</span>
                <span class="sensor-value" data-field="sensorSpin"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Soil</span>
                <span class="sensor-value" data-field="sensorSoil"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Rinse</span>
                <span class="sensor-value" data-field="sensorRinse"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Dispense</span>
                <span class="sensor-value" data-field="sensorDispense"></span>
              </div>
              <div class="sensor-item">
                <span class="sensor-label">Loads Left</span>
                <span class="sensor-value" data-field="sensorLoads"></span>
              </div>
            </div>
          </div>

          <div class="footer">
            <span class="entity-id" data-field="footerEntity"></span>
            <span class="entity-id">v${GE_WASHER_CARD_VERSION}</span>
          </div>
        </div>
      </ha-card>
    `;
    this._rendered = true;
  }

  // Get a data-field element
  _el(field) {
    return this.shadowRoot?.querySelector(`[data-field="${field}"]`);
  }

  // Update DOM in-place without replacing innerHTML (preserves animations)
  _update() {
    if (!this._hass || !this._config) return;

    // Build DOM on first render
    if (!this._rendered) {
      this._buildDom();
    }

    const d = this._getDisplayData();

    // Update CSS custom properties for dynamic temperature colors
    const host = this.shadowRoot.host;
    host.style.setProperty('--tc-color', d.tc.color);
    host.style.setProperty('--tc-glow', d.tc.glow);
    host.style.setProperty('--tc-color-66', d.tc.color + '66');
    host.style.setProperty('--tc-color-55', d.tc.color + '55');
    host.style.setProperty('--tc-color-22', d.tc.color + '22');
    host.style.setProperty('--tc-color-15', d.tc.color + '15');
    host.style.setProperty('--tc-color-11', d.tc.color + '11');
    host.style.setProperty('--tc-color-08', d.tc.color + '08');

    // Top bar
    this._el('name').textContent = this._config.name;

    // LCD
    const lcdScreen = this._el('lcdScreen');
    lcdScreen.className = `lcd-screen ${d.isActive ? 'active' : ''}`;

    const lcdCycle = this._el('lcdCycle');
    lcdCycle.textContent = d.lcdCycleText;
    lcdCycle.className = `lcd-cycle ${d.isActive ? '' : 'off'}`;

    const lcdTime = this._el('lcdTime');
    lcdTime.textContent = d.lcdTimeText;
    lcdTime.style.display = d.lcdTimeText ? '' : 'none';

    const lcdSub = this._el('lcdSub');
    lcdSub.textContent = d.lcdSubText;
    lcdSub.className = `lcd-sub ${d.isActive ? '' : 'off'}`;

    this._el('lcdPrewash').textContent = d.prewash ? 'PRE ' : '';
    const lcdState = this._el('lcdState');
    lcdState.textContent = d.isActive ? d.washTemp : '';
    lcdState.style.display = d.isActive ? '' : 'none';

    // Glow ring
    this._el('glowRing').className = `glow-ring ${d.isActive ? 'active' : ''}`;

    // Door glass
    this._el('doorGlass').className = `door-glass ${d.isActive ? 'active' : ''}`;

    // Fill icon
    this._el('fillIcon').className = `fill-icon ${d.isFill ? 'visible' : ''}`;

    // Water level
    this._el('waterLevel').className = `water-level ${(d.isActive && !d.isSpin) ? 'active' : ''}`;

    // Drum and agitator — update class to toggle animations via CSS
    this._el('drumInner').className = d.drumClass;
    this._el('agitator').className = d.agitatorClass;

    // Paddles
    const paddleClass = `paddle ${d.isActive ? 'active' : ''}`;
    this._el('paddle1').className = paddleClass;
    this._el('paddle2').className = paddleClass;
    this._el('paddle3').className = paddleClass;

    // Door handle
    this._el('doorHandle').className = `door-handle ${d.doorOpen ? 'open' : ''}`;

    // Lock icon
    this._el('lockIcon').className = `lock-icon ${d.isLocked ? 'visible' : ''}`;

    // Sensor grid
    const sensorTemp = this._el('sensorTemp');
    sensorTemp.textContent = d.washTemp;
    sensorTemp.className = `sensor-value ${d.isActive ? 'highlight' : ''}`;

    this._el('sensorSpin').textContent = d.spinTime;
    this._el('sensorSoil').textContent = d.soilLevel;
    this._el('sensorRinse').textContent = d.rinseOption;

    const sensorDispense = this._el('sensorDispense');
    sensorDispense.textContent = d.dispensTank;
    sensorDispense.className = `sensor-value ${d.dispensTankWarn ? 'warn' : ''}`;

    this._el('sensorLoads').textContent = d.dispensLoads;

    // Footer
    this._el('footerEntity').textContent = this._config.prefix;
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
