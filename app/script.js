/* ======================================================
   PSU RACING DASHBOARD - MOBILE (ENHANCED)
   Features:
   - Heat map for current draw on track
   - Auto-start timer on movement
   - Idle detection (15 second pause)
   - Efficiency per lap tracking
   - GPS FALLBACK MODE (offline support)
   ====================================================== */

/* ====== CONFIG ====== */
const MQTT_URL = "wss://8fac0c92ea0a49b8b56f39536ba2fd78.s1.eu.hivemq.cloud:8884/mqtt";
const MQTT_USER = "ShellJM";
const MQTT_PASS = "psuEcoteam1st";
const TOPIC = "car/telemetry";

const TRACK_LAP_KM = 3.7;  // Lusail short circuit
const PACKET_MIN_MS = 90;   // ~11 FPS UI update rate
const IDLE_THRESHOLD_MS = 15000; // 15 seconds idle detection
const SPEED_MOVEMENT_THRESHOLD = 0.5; // km/h to consider "moving"

// GPS Fallback Mode
let gpsMode = false; // True when using phone GPS (offline fallback)
let gpsWatchId = null;
let lastGpsPosition = null;
let lastGpsTime = null;

/* ====== QATAR LUSAIL SHORT CIRCUIT DATA ====== */
const LUSAIL_SHORT = {
    center: [25.488435783, 51.450190017], // Start/Finish line
    stopLine: [25.49187893325, 51.4508796665], // Mandatory 5s midrace stop
    zoom: 17,
    turns: [
        // Turn directions REVERSED (left = right, right = left)
        { lat: 25.492879, lon: 51.447485, name: "TURN 1", type: "right" },
        { lat: 25.493345, lon: 51.447801, name: "TURN 2", type: "right" },
        { lat: 25.493382, lon: 51.448345, name: "TURN 3", type: "right" },
        { lat: 25.491656, lon: 51.451190, name: "TURN 4", type: "left" },
        { lat: 25.491361, lon: 51.451944, name: "TURN 5", type: "right" },
        { lat: 25.489900, lon: 51.459162, name: "TURN 6", type: "right" },
        { lat: 25.487006, lon: 51.458766, name: "TURN 7", type: "right" },
    ],
    outline: [
        [25.488720817, 51.450041667],
        [25.489118117, 51.449772783],
        [25.489634967, 51.4494259],
        [25.490174433, 51.4490968],
        [25.490778517, 51.448718667],
        [25.491375483, 51.4483175],
        [25.49207065, 51.447894133],
        [25.49281835, 51.447592117],
        [25.49332805, 51.44779815],
        [25.493340667, 51.4485594],
        [25.492783567, 51.4492677],
        [25.492344683, 51.4499655],
        [25.492093667, 51.4504178],
        [25.491843833, 51.450869917],
        [25.491728483, 51.451032067],
        [25.491605533, 51.451620533],
        [25.49126045, 51.45209375],
        [25.4907238, 51.452599483],
        [25.4903161, 51.4532868],
        [25.490022133, 51.454066267],
        [25.489953533, 51.454641933],
        [25.489913083, 51.455323067],
        [25.489864867, 51.4560174],
        [25.489941783, 51.456826383],
        [25.490047383, 51.457621017],
        [25.4901291, 51.458597433],
        [25.489850217, 51.4592955],
        [25.489330333, 51.459635267],
        [25.4888498, 51.459938433],
        [25.48819055, 51.459881967],
        [25.4876145, 51.459461033],
        [25.487013117, 51.458864067],
        [25.487152133, 51.4578886],
        [25.487378983, 51.456626417],
        [25.487225267, 51.455559233],
        [25.486557067, 51.45511635],
        [25.485987883, 51.454824083],
        [25.485314717, 51.454472317],
        [25.484617433, 51.45412505],
        [25.483955633, 51.453340033],
        [25.484620783, 51.452493867],
        [25.485420317, 51.45201425],
        [25.48590055, 51.451725583],
        [25.486500183, 51.451353483],
        [25.48733545, 51.4508152],
        [25.487992833, 51.4504049],
        [25.488720817, 51.450041667]
    ]
};

/* ====== STATE ====== */
const state = {
    // Telemetry
    voltage: 48,
    current: 0,
    power: 0,
    speed: 0,
    rpm: 0,
    distKmAbs: 0,
    lon: LUSAIL_SHORT.center[1],
    lat: LUSAIL_SHORT.center[0],

    // Timer state
    timerRunning: false,
    timerStartTime: null,
    timerElapsedMs: 0,
    timerTotalMs: 35 * 60 * 1000, // 35 minutes
    lastMovementTime: null,

    // Lap tracking
    currentLap: 1,
    lapStartDist: 0,
    lapStartEnergy: 0,
    lapEfficiencies: [], // Array of {lap: number, efficiency: number (Wh/km)}
    hasLeftStart: false, // Track if car has left starting area

    // Energy tracking
    energyWhAbs: 0,
    baseDistKm: 0,
    baseEnergyWh: 0,

    // Heat map data
    heatMapPoints: [], // Array of {lat, lon, current}

    // Timers
    t0: null,
    lastTsMs: null,
    lastPaintMs: 0,

    // Turn detection
    currentTurn: null
};

/* ====== DOM ELEMENTS ====== */
const el = {
    speedValue: document.getElementById('speedValue'),
    speedArc: document.getElementById('speedArc'),
    currentValue: document.getElementById('currentValue'),
    timerDisplay: document.getElementById('timerDisplay'),
    currentLap: document.getElementById('currentLap'),
    efficiencyList: document.getElementById('efficiencyList'),
    directionalHelper: document.getElementById('directionalHelper'),
    arrowLeft: document.getElementById('arrowLeft'),
    arrowRight: document.getElementById('arrowRight'),
    arrowStraight: document.getElementById('arrowStraight')
};

/* ====== MAP INITIALIZATION ====== */
let map, carMarker, trackPolyline, heatLayer;

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

    // Draw track outline - thicker and smoother for better visibility
    trackPolyline = L.polyline(LUSAIL_SHORT.outline, {
        color: '#ff6b35',
        weight: 8,
        opacity: 0.9,
        smoothFactor: 2,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Draw START/FINISH line section in bright green (first 3 segments of track)
    const startFinishSegment = LUSAIL_SHORT.outline.slice(0, 3);
    L.polyline(startFinishSegment, {
        color: '#00ff88',
        weight: 10,
        opacity: 1,
        smoothFactor: 2,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Draw MANDATORY STOP line in red (segment 12-14, midrace)
    const stopSegment = LUSAIL_SHORT.outline.slice(12, 15);
    L.polyline(stopSegment, {
        color: '#ff0000',
        weight: 10,
        opacity: 1,
        smoothFactor: 2,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Initialize heat layer for current visualization
    heatLayer = L.layerGroup().addTo(map);

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

    // Fit bounds to track
    map.fitBounds(trackPolyline.getBounds(), { padding: [0, 0] });

    // Handle resize
    window.addEventListener('resize', () => {
        map.invalidateSize();
        map.fitBounds(trackPolyline.getBounds(), { padding: [0, 0] });
    });
}

/* ====== HEAT MAP FUNCTIONS ====== */
function addHeatMapPoint(lat, lon, current) {
    state.heatMapPoints.push({ lat, lon, current });

    // Keep last 5000 points to show full lap history
    if (state.heatMapPoints.length > 5000) {
        state.heatMapPoints.shift();
    }

    // Update heat map every 5 points for continuous visualization
    if (state.heatMapPoints.length % 5 === 0) {
        updateHeatMap();
    }
}

function updateHeatMap() {
    // Clear existing heat layer
    heatLayer.clearLayers();

    // Find min/max current for color scaling
    const currents = state.heatMapPoints.map(p => Math.abs(p.current));
    const maxCurrent = Math.max(...currents, 1);

    // Draw heat map circles
    state.heatMapPoints.forEach(point => {
        const currentAbs = Math.abs(point.current);
        const intensity = currentAbs / maxCurrent;

        // Color from green (low) to red (high)
        const hue = (1 - intensity) * 120; // 120 = green, 0 = red
        const color = `hsl(${hue}, 100%, 50%)`;

        L.circleMarker([point.lat, point.lon], {
            radius: 3,
            fillColor: color,
            color: color,
            weight: 1,
            opacity: 0.6,
            fillOpacity: 0.4
        }).addTo(heatLayer);
    });
}

/* ====== TIMER FUNCTIONS ====== */
function startTimer() {
    if (!state.timerRunning) {
        state.timerRunning = true;
        state.timerStartTime = performance.now();
        console.log("⏱️ Timer started automatically");
    }
}

function stopTimer() {
    if (state.timerRunning) {
        state.timerRunning = false;
        console.log("⏸️ Timer paused (idle detected)");
    }
}

function updateTimer() {
    if (state.timerRunning) {
        const elapsed = performance.now() - state.timerStartTime;
        state.timerElapsedMs += elapsed;
        state.timerStartTime = performance.now();
    }

    const remaining = Math.max(0, state.timerTotalMs - state.timerElapsedMs);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    el.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/* ====== IDLE DETECTION ====== */
function checkIdleState() {
    if (state.speed > SPEED_MOVEMENT_THRESHOLD) {
        // Car is moving
        state.lastMovementTime = performance.now();

        // Auto-start timer on first movement
        if (!state.timerRunning && state.timerElapsedMs === 0) {
            startTimer();
        } else if (!state.timerRunning) {
            // Resume timer after idle
            startTimer();
        }
    } else {
        // Car is stopped or very slow
        if (state.lastMovementTime && state.timerRunning) {
            const idleTime = performance.now() - state.lastMovementTime;
            if (idleTime > IDLE_THRESHOLD_MS) {
                stopTimer();
            }
        }
    }
}

/* ====== LAP DETECTION & EFFICIENCY ====== */
function checkLapCompletion() {
    const START_LAT = LUSAIL_SHORT.center[0];
    const START_LON = LUSAIL_SHORT.center[1];
    const LEAVE_THRESHOLD = 0.002; // ~220 meters - must go this far to count as "left"
    const RETURN_THRESHOLD = 0.0003; // ~33 meters - must be this close to count as "returned"

    // Calculate distance from starting point
    const distFromStart = Math.sqrt(
        Math.pow(state.lat - START_LAT, 2) +
        Math.pow(state.lon - START_LON, 2)
    );

    // Check if car has left the starting area (far enough away)
    if (!state.hasLeftStart && distFromStart > LEAVE_THRESHOLD) {
        state.hasLeftStart = true;
        console.log(`[LAP] Car has left starting area (${(distFromStart * 111000).toFixed(0)}m away)`);
    }

    // Check if car has returned to start (lap completion)
    // Only count if car actually left AND is now close to start
    if (state.hasLeftStart && distFromStart < RETURN_THRESHOLD) {
        // Lap completed!
        const energyWhSinceLapStart = state.energyWhAbs - state.lapStartEnergy;
        const energyKwhSinceLapStart = energyWhSinceLapStart / 1000; // Convert Wh to kWh
        const distSinceLapStart = state.distKmAbs - state.lapStartDist;

        // Efficiency: km/kWh = Distance (km) / Energy (kWh)
        const efficiency = energyKwhSinceLapStart > 0 ? (distSinceLapStart / energyKwhSinceLapStart) : 0;

        console.log(`[LAP DEBUG] Total Energy: ${state.energyWhAbs.toFixed(2)} Wh, Lap Start Energy: ${state.lapStartEnergy.toFixed(2)} Wh`);
        console.log(`[LAP DEBUG] Total Dist: ${state.distKmAbs.toFixed(3)} km, Lap Start Dist: ${state.lapStartDist.toFixed(3)} km`);
        console.log(`[LAP DEBUG] Energy Used: ${energyWhSinceLapStart.toFixed(2)} Wh (${energyKwhSinceLapStart.toFixed(3)} kWh), Distance: ${distSinceLapStart.toFixed(3)} km`);

        // Record lap efficiency (only if we have valid data)
        if (efficiency > 0 && efficiency < 10000) {
            state.lapEfficiencies.push({
                lap: state.currentLap,
                efficiency: efficiency
            });
            console.log(`[LAP] Lap ${state.currentLap} completed! Distance: ${distSinceLapStart.toFixed(2)} km, Efficiency: ${efficiency.toFixed(2)} km/kWh`);
        } else {
            console.log(`[LAP] Lap ${state.currentLap} completed but efficiency invalid: ${efficiency.toFixed(2)} km/kWh`);
        }

        // Update UI
        updateEfficiencyList();

        // Move to next lap
        state.currentLap++;
        el.currentLap.textContent = state.currentLap;

        // Reset lap counters
        state.lapStartDist = state.distKmAbs;
        state.lapStartEnergy = state.energyWhAbs;
        state.hasLeftStart = false; // Reset for next lap

        // Clear heat map for new lap
        state.heatMapPoints = [];
        updateHeatMap();
        console.log('[LAP] Heat map cleared for new lap');
    }
}

function updateEfficiencyList() {
    const list = el.efficiencyList;

    if (state.lapEfficiencies.length === 0) {
        list.innerHTML = '<div class="no-efficiency">Waiting for lap data...</div>';
        return;
    }

    list.innerHTML = '';
    state.lapEfficiencies.forEach(item => {
        const div = document.createElement('div');
        div.className = 'efficiency-item';
        div.innerHTML = `
            <span class="efficiency-lap-label">LAP ${item.lap}</span>
            <span class="efficiency-value">${item.efficiency.toFixed(2)} km/kWh</span>
        `;
        list.appendChild(div);
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

    client.on("error", err => {
        console.error("MQTT error:", err);
        // Activate GPS fallback if MQTT fails
        if (!gpsMode) {
            console.warn("⚠️ MQTT connection failed - switching to GPS fallback mode");
            activateGPSFallback();
        }
    });

    client.on("offline", () => {
        console.warn("📡 MQTT offline - switching to GPS fallback mode");
        if (!gpsMode) {
            activateGPSFallback();
        }
    });
}

/* ====== GPS FALLBACK MODE ====== */
function activateGPSFallback() {
    gpsMode = true;
    console.log("🛰️ GPS FALLBACK MODE ACTIVATED");
    console.log("Using phone GPS for: Speed, Position, Laps, Timer");
    console.log("Disabled: Current, Voltage, Power, Energy, Efficiency");

    // Show GPS mode indicator
    const gpsIndicator = document.getElementById('gpsModeIndicator');
    if (gpsIndicator) {
        gpsIndicator.style.display = 'block';
    }

    // Hide current display (no car data available)
    const currentContainer = document.querySelector('.current-container');
    if (currentContainer) {
        currentContainer.style.display = 'none';
    }

    // Hide efficiency section (no energy data)
    const efficiencySection = document.querySelector('.efficiency-section');
    if (efficiencySection) {
        efficiencySection.style.display = 'none';
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
        console.error("❌ Geolocation not supported by browser");
        alert("GPS not available on this device");
        return;
    }

    // Start watching GPS position
    gpsWatchId = navigator.geolocation.watchPosition(
        handleGPSPosition,
        handleGPSError,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

function handleGPSPosition(position) {
    const currentTime = Date.now();
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const gpsSpeed = position.coords.speed; // m/s or null

    // Calculate speed from GPS
    let speed = 0;
    if (gpsSpeed !== null && gpsSpeed >= 0) {
        // Use GPS-provided speed (convert m/s to km/h)
        speed = gpsSpeed * 3.6;
    } else if (lastGpsPosition && lastGpsTime) {
        // Calculate speed from position change
        const timeDiff = (currentTime - lastGpsTime) / 1000; // seconds
        const distance = calculateDistance(
            lastGpsPosition.latitude,
            lastGpsPosition.longitude,
            lat,
            lon
        ); // km
        speed = timeDiff > 0 ? (distance / timeDiff) * 3600 : 0; // km/h
    }

    // Update state (GPS mode - no power/current/voltage data)
    state.lat = lat;
    state.lon = lon;
    state.speed = speed;
    state.rpm = speed * 50; // Estimate

    // Update distance (accumulate)
    if (lastGpsPosition && lastGpsTime) {
        const distance = calculateDistance(
            lastGpsPosition.latitude,
            lastGpsPosition.longitude,
            lat,
            lon
        );
        state.distKmAbs += distance;
    }

    // Check idle state and manage timer
    checkIdleState();

    // Check lap completion
    checkLapCompletion();

    // Store current position for next calculation
    lastGpsPosition = { latitude: lat, longitude: lon };
    lastGpsTime = currentTime;

    console.log(`[GPS] Speed: ${speed.toFixed(1)} km/h, Pos: (${lat.toFixed(6)}, ${lon.toFixed(6)})`);
}

function handleGPSError(error) {
    console.error("GPS Error:", error.message);
    if (error.code === error.PERMISSION_DENIED) {
        alert("Please allow GPS access to use fallback mode");
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula to calculate distance between two GPS points
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
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

    // Add heat map point (current draw at this location)
    if (state.lat && state.lon) {
        addHeatMapPoint(state.lat, state.lon, state.current);
    }

    // Check idle state and manage timer
    checkIdleState();

    // Check lap completion
    checkLapCompletion();

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
    // Show only directional arrow (no text banner)
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

    // Update timer
    updateTimer();

    // Update map
    updateMap();
}

/* ====== UI UPDATE FUNCTIONS ====== */

function updateSpeedometer() {
    const speed = Math.round(state.speed);
    el.speedValue.textContent = speed;

    // Update speed arc (circumference = 2πr = 754, max speed 50 km/h)
    const maxSpeed = 50;
    const percentage = Math.min(speed / maxSpeed, 1);
    const offset = 754 - (percentage * 754);
    el.speedArc.style.strokeDashoffset = offset;

    // Update current display
    el.currentValue.textContent = Math.abs(state.current).toFixed(1);
}

function updateMap() {
    if (!map || !carMarker) return;

    const pos = [state.lat, state.lon];
    carMarker.setLatLng(pos);
    // Map stays fixed - doesn't follow the car
    // No panning or zooming - map remains stationary
}

/* ====== SIMULATED DATA (for testing without MQTT) ====== */
function startSimulation() {
    let simSpeed = 0;
    let simDirection = 1;
    let simLat = LUSAIL_SHORT.center[0];
    let simLon = LUSAIL_SHORT.center[1];
    let simDist = 0;
    let trackIndex = 0;

    setInterval(() => {
        // Simulate varying speed
        simSpeed += simDirection * (Math.random() * 10);
        if (simSpeed > 150) simDirection = -1;
        if (simSpeed < 20) simDirection = 1;

        // Follow track outline
        trackIndex = (trackIndex + 1) % LUSAIL_SHORT.outline.length;
        const targetPoint = LUSAIL_SHORT.outline[trackIndex];
        simLat = targetPoint[0] + (Math.random() - 0.5) * 0.00002;
        simLon = targetPoint[1] + (Math.random() - 0.5) * 0.00002;

        simDist += simSpeed * 0.001 / 3600; // km

        // Simulate current (higher at acceleration, lower at coasting)
        const simCurrent = (simSpeed / 150) * 20 + Math.random() * 5;

        // Simulate data packet
        const mockData = {
            voltage: 48 + (Math.random() - 0.5) * 4,
            current: simCurrent,
            power: 48 * simCurrent,
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
    console.log("🏁 PSU Racing Dashboard - Mobile (Enhanced)");

    // Initialize map
    initMap();

    // Connect to MQTT
    mqttConnect();

    // Uncomment for testing without real MQTT data:
    // setTimeout(startSimulation, 2000);

    // Hide turn instruction initially
    hideTurnInstruction();

    // Initial render
    requestFrame();
});
