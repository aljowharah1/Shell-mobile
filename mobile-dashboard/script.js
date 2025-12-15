/* ======================================================
   PSU RACING DASHBOARD - MOBILE
   Real-time telemetry via MQTT
   ====================================================== */

/* ====== CONFIG ====== */
const MQTT_URL = "wss://8fac0c92ea0a49b8b56f39536ba2fd78.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "ShellJM";
const MQTT_PASS = "psuEcoteam1st";
const TOPIC = "car/telemetry";

const TRACK_LAP_KM = 3.7;  // Lusail short circuit
const PACKET_MIN_MS = 90;   // ~11 FPS UI update rate

/* ====== QATAR LUSAIL SHORT CIRCUIT DATA ====== */
// REAL coordinates extracted from YOUR race_data.csv!
// This is the ACTUAL track you drove, not estimated coordinates
const LUSAIL_SHORT = {
    center: [25.488435783, 51.450190017],  // Actual starting point from your race
    zoom: 17,
    turns: [
        // Turn waypoints based on actual GPS data patterns
        { lat: 25.488435, lon: 51.450190, name: "START", advice: "Race start", icon: "🏁", type: "straight" },
        { lat: 25.489077, lon: 51.449718, name: "TURN 1", advice: "First turn approaching", icon: "➡️", type: "right" },
        { lat: 25.490296, lon: 51.448935, name: "TURN 2", advice: "Maintain speed", icon: "⬅️", type: "left" },
        { lat: 25.491207, lon: 51.448372, name: "TURN 3", advice: "Heavy braking", icon: "➡️", type: "right" },
    ],
    // REAL track outline from YOUR race_data.csv - complete driven path
    outline: [
        [25.488435783, 51.450190017],
        [25.488437617, 51.450173583],
        [25.488449917, 51.450142867],
        [25.488481833, 51.450113567],
        [25.4885134, 51.450088817],
        [25.488514117, 51.450093583],
        [25.488512183, 51.450086933],
        [25.488512667, 51.450086233],
        [25.488512767, 51.450086317],
        [25.488521983, 51.450080367],
        [25.488669583, 51.449989417],
        [25.488882183, 51.4498471],
        [25.489110583, 51.449695467],
        [25.489365867, 51.449525067],
        [25.489688617, 51.449322033],
        [25.489992717, 51.449127583],
        [25.490296783, 51.44893475],
        [25.4906043, 51.448730183],
        [25.4909237, 51.448537433],
        [25.49129795, 51.448316133],
        [25.491634967, 51.44811195],
        [25.4920098, 51.4478887],
        [25.492424517, 51.447641883],
        [25.492879417, 51.447485267],
        [25.49334585, 51.447801733],
        [25.4933829, 51.448345467],
        [25.49310965, 51.448841817],
        [25.492747, 51.44929015],
        [25.492433133, 51.449761617],
        [25.492123817, 51.450306583],
        [25.491904867, 51.450694667],
        [25.4918556, 51.45080165],
        [25.49178515, 51.450914417],
        [25.49165615, 51.4511903],
        [25.491605833, 51.451609983],
        [25.491361, 51.45194445],
        [25.491053833, 51.45217245],
        [25.490774033, 51.452510633],
        [25.490499767, 51.452899967],
        [25.490242017, 51.4533651],
        [25.49004385, 51.454005433],
        [25.48997915, 51.454601083],
        [25.489927733, 51.455200167],
        [25.489864467, 51.4558467],
        [25.489909467, 51.45650385],
        [25.49000955, 51.457242],
        [25.490074167, 51.45789595],
        [25.49012115, 51.458552833],
        [25.489900617, 51.459162367],
        [25.48943425, 51.45956],
        [25.488862767, 51.459922917],
        [25.488290583, 51.459868],
        [25.48780235, 51.4595807],
        [25.487333617, 51.45924595],
        [25.4870066, 51.458766117],
        [25.48705165, 51.458104433],
        [25.488435783, 51.450190017]  // Closes the loop
    ]
};

/* ====== STATE ====== */
const state = {
    // Telemetry
    voltage: 48,
    current: 15,
    power: 720,
    speed: 0,
    rpm: 0,
    distKmAbs: 0,
    lon: LUSAIL_SHORT.center[1],
    lat: LUSAIL_SHORT.center[0],

    // Derived
    batteryPercent: 60,
    energyWhAbs: 0,
    baseDistKm: 0,
    baseEnergyWh: 0,

    // Timers
    t0: null,
    lastTsMs: null,
    lastPaintMs: 0,

    // Turn detection
    currentTurn: null
};

/* ====== DOM ELEMENTS ====== */
const el = {
    // Top bar
    temperature: document.getElementById('temperature'),

    // Speedometer
    speedValue: document.getElementById('speedValue'),
    speedArc: document.getElementById('speedArc'),

    // Turn instruction
    turnInstruction: document.getElementById('turnInstruction'),

    // Battery
    batteryPercentage: document.getElementById('batteryPercentage'),
    batteryFill: document.getElementById('batteryFill'),
    batteryBar: document.getElementById('batteryBar'),

    // Energy
    chargingValue: document.getElementById('chargingValue'),
    averageValue: document.getElementById('averageValue'),
    acValue: document.getElementById('acValue'),
    chargingBar: document.querySelector('#chargingBar .energy-bar-fill'),
    averageBar: document.querySelector('#averageBar .energy-bar-fill'),
    acBar: document.querySelector('#acBar .energy-bar-fill'),

    // Directional Helper
    directionalHelper: document.getElementById('directionalHelper'),
    arrowLeft: document.getElementById('arrowLeft'),
    arrowRight: document.getElementById('arrowRight'),
    arrowStraight: document.getElementById('arrowStraight')
};

/* ====== MAP INITIALIZATION ====== */
let map, carMarker, trackPolyline;

function initMap() {
    // Initialize Leaflet map
    map = L.map('trackMap', {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false
    }).setView(LUSAIL_SHORT.center, LUSAIL_SHORT.zoom);

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(map);

    // Draw track outline
    trackPolyline = L.polyline(LUSAIL_SHORT.outline, {
        color: '#ff6b35',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(map);

    // Custom car marker
    const carIcon = L.divIcon({
        className: 'car-marker',
        html: `<div style="
            width: 20px; 
            height: 20px; 
            background: radial-gradient(circle, #00ff88, #00ccff); 
            border-radius: 50%; 
            border: 3px solid #fff;
            box-shadow: 0 0 15px rgba(0, 255, 136, 0.8), 0 0 30px rgba(0, 204, 255, 0.6);
            animation: car-pulse 1.5s ease-in-out infinite;
        "></div>
        <style>
            @keyframes car-pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.2); }
            }
        </style>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    carMarker = L.marker(LUSAIL_SHORT.center, { icon: carIcon }).addTo(map);

    // Fit bounds to track - ZERO padding to maximize size
    map.fitBounds(trackPolyline.getBounds(), { padding: [0, 0] });

    // Handle resize/orientation change to keep track in view
    window.addEventListener('resize', () => {
        map.invalidateSize();
        map.fitBounds(trackPolyline.getBounds(), { padding: [0, 0] });
    });
}

/* ====== MQTT CONNECTION ====== */
let client;

function mqttConnect() {
    client = mqtt.connect(MQTT_URL, {
        username: MQTT_USER,
        password: MQTT_PASS,
        clean: true,
        reconnectPeriod: 2000
    });

    client.on("connect", () => {
        console.log("✅ Connected to MQTT");
        client.subscribe(TOPIC, err => {
            if (err) console.error("Subscribe error:", err);
        });
    });

    client.on("message", (topic, payload) => {
        if (topic !== TOPIC) return;
        try {
            const data = JSON.parse(payload.toString());
            ingestTelemetry(data);
        } catch (e) {
            console.error("Parse error:", e);
        }
    });

    client.on("error", err => console.error("MQTT error:", err));
}

/* ====== TELEMETRY INGESTION ====== */
function num(x) {
    const v = Number(x);
    return Number.isFinite(v) ? v : 0;
}

function ingestTelemetry(data) {
    const now = performance.now();
    if (state.t0 === null) state.t0 = now;

    const dtMs = state.lastTsMs == null ? 0 : (now - state.lastTsMs);
    state.lastTsMs = now;
    const dtH = dtMs / 3600000;

    // Update state from MQTT payload
    state.voltage = num(data.voltage);
    state.current = num(data.current);
    state.power = num(data.power);
    state.speed = num(data.speed);
    state.rpm = num(data.rpm);
    state.distKmAbs = num(data.distance_km);
    state.lon = num(data.longitude) || state.lon;
    state.lat = num(data.latitude) || state.lat;

    // Integrate energy
    if (dtH > 0 && state.power > -1e6 && state.power < 1e6) {
        state.energyWhAbs += state.power * dtH;
    }

    // Calculate battery percentage (simplified: based on voltage)
    // Assume 48V nominal, 40V min, 54V max
    state.batteryPercent = Math.min(100, Math.max(0, ((state.voltage - 40) / 14) * 100));

    // Detect nearby turns
    detectNearbyTurn();

    // Request UI update
    requestFrame();
}

/* ====== TURN DETECTION ====== */
function detectNearbyTurn() {
    const threshold = 0.0005; // ~55 meters

    for (const turn of LUSAIL_SHORT.turns) {
        const distance = Math.sqrt(
            Math.pow(state.lat - turn.lat, 2) +
            Math.pow(state.lon - turn.lon, 2)
        );

        if (distance < threshold) {
            if (state.currentTurn !== turn) {
                state.currentTurn = turn;
                showTurnInstruction(turn);
            }
            return;
        }
    }

    // No turn nearby
    if (state.currentTurn !== null) {
        state.currentTurn = null;
        hideTurnInstruction();
    }
}

function showTurnInstruction(turn) {
    const banner = el.turnInstruction;
    banner.querySelector('.turn-icon').textContent = turn.icon;
    banner.querySelector('.turn-direction').textContent = turn.name;
    banner.querySelector('.turn-advice').textContent = turn.advice;
    banner.style.display = 'flex';

    // Show directional arrow
    if (turn.type) {
        el.directionalHelper.style.display = 'block';
        el.arrowLeft.setAttribute('display', 'none');
        el.arrowRight.setAttribute('display', 'none');
        el.arrowStraight.setAttribute('display', 'none');

        if (turn.type === 'left') el.arrowLeft.removeAttribute('display');
        else if (turn.type === 'right') el.arrowRight.removeAttribute('display');
        else if (turn.type === 'straight') el.arrowStraight.removeAttribute('display');
    }
}

function hideTurnInstruction() {
    el.turnInstruction.style.display = 'none';
    el.directionalHelper.style.display = 'none';
}

/* ====== RENDER LOOP ====== */
let rafPending = false;

function requestFrame() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(paint);
}

function paint() {
    rafPending = false;
    const now = performance.now();
    if (now - state.lastPaintMs < PACKET_MIN_MS) return;
    state.lastPaintMs = now;

    // Update speedometer
    updateSpeedometer();

    // Update battery
    updateBattery();

    // Update energy consumption
    updateEnergy();

    // Update map
    updateMap();
}

/* ====== UI UPDATE FUNCTIONS ====== */

function updateSpeedometer() {
    const speed = Math.round(state.speed);
    el.speedValue.textContent = speed;

    // Update speed arc (circumference = 2πr = 754, max speed 200 km/h)
    const maxSpeed = 200;
    const percentage = Math.min(speed / maxSpeed, 1);
    const offset = 754 - (percentage * 754);
    el.speedArc.style.strokeDashoffset = offset;
}

function updateBattery() {
    const percent = Math.round(state.batteryPercent);
    el.batteryPercentage.innerHTML = `${percent}<span class="percent-symbol">%</span>`;

    // Update battery fill width
    el.batteryFill.style.width = `${percent}%`;
    el.batteryBar.style.width = `${percent}%`;

    // Always use Shell orange color
    const color = 'linear-gradient(90deg, #E47814, #C46410)';
    el.batteryFill.style.background = color;
    el.batteryBar.style.background = color;
}

function updateEnergy() {
    const distKmRel = Math.max(0, state.distKmAbs - state.baseDistKm);
    const energyWhRel = Math.max(0, state.energyWhAbs - state.baseEnergyWh);

    // Charging (current power being drawn/regenerated)
    const chargingWh = Math.abs(state.power);
    el.chargingValue.innerHTML = `${Math.round(chargingWh)}<span class="unit">Wh</span>`;

    // Average consumption (Wh/km)
    const avgWhPerKm = distKmRel > 0 ? (energyWhRel / distKmRel) : 0;
    el.averageValue.innerHTML = `${Math.round(avgWhPerKm)}<span class="unit">Wh/km</span>`;

    // Total AC consumption (in kWh)
    const acKwh = energyWhRel / 1000;
    el.acValue.innerHTML = `${acKwh.toFixed(1)}<span class="unit">kWh</span>`;

    // Update bar widths (scale to reasonable ranges)
    const chargingPercent = Math.min((chargingWh / 500) * 100, 100);
    const avgPercent = Math.min((avgWhPerKm / 300) * 100, 100);
    const acPercent = Math.min((acKwh / 50) * 100, 100);

    el.chargingBar.style.width = `${chargingPercent}%`;
    el.averageBar.style.width = `${avgPercent}%`;
    el.acBar.style.width = `${acPercent}%`;
}

function updateMap() {
    if (!map || !carMarker) return;

    const pos = [state.lat, state.lon];
    carMarker.setLatLng(pos);
    map.panTo(pos, { animate: true, duration: 0.3, easeLinearity: 0.5 });
}

/* ====== SIMULATED DATA (for testing without MQTT) ====== */
function startSimulation() {
    let simSpeed = 0;
    let simDirection = 1;
    let simLat = LUSAIL_SHORT.center[0];
    let simLon = LUSAIL_SHORT.center[1];
    let simDist = 0;

    setInterval(() => {
        // Simulate varying speed
        simSpeed += simDirection * (Math.random() * 10);
        if (simSpeed > 150) simDirection = -1;
        if (simSpeed < 20) simDirection = 1;

        // Simulate movement along track
        simLat += (Math.random() - 0.5) * 0.0001;
        simLon += (Math.random() - 0.5) * 0.0001;
        simDist += simSpeed * 0.001 / 3600; // km

        // Simulate data packet
        const mockData = {
            voltage: 48 + (Math.random() - 0.5) * 4,
            current: 10 + Math.random() * 20,
            power: 400 + Math.random() * 600,
            speed: simSpeed,
            rpm: simSpeed * 50,
            distance_km: simDist,
            latitude: simLat,
            longitude: simLon
        };

        ingestTelemetry(mockData);
    }, 200);
}

/* ====== INITIALIZATION ====== */
document.addEventListener('DOMContentLoaded', () => {
    console.log("🏁 PSU Racing Dashboard - Mobile");

    // Initialize map
    initMap();

    // Connect to MQTT
    mqttConnect();

    // Uncomment for testing without real MQTT data:
    setTimeout(startSimulation, 2000);

    // Hide turn instruction initially
    hideTurnInstruction();

    // Initial render
    requestFrame();
});
