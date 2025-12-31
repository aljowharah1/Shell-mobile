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

const TRACK_LAP_KM = 1.5;  // University test track (estimated)
const PACKET_MIN_MS = 16;   // ~60 FPS UI update rate for ultra-smooth real-time response
const IDLE_THRESHOLD_MS = 15000; // 15 seconds idle detection
const SPEED_MOVEMENT_THRESHOLD = 0.5; // km/h to consider "moving"

// GPS Fallback Mode
let gpsMode = false; // True when using phone GPS (offline fallback)
let gpsWatchId = null;
let lastGpsPosition = null;
let lastGpsTime = null;

/* ====== UNIVERSITY TEST TRACK DATA ====== */
// Accurate track extracted from Ahmed's December 24th run (1747 GPS points analyzed)
const LUSAIL_SHORT = {
    center: [24.735805, 46.702122], // Track center
    stopLine: [24.735897, 46.702587], // Start/Stop line (first position)
    zoom: 17,
    turns: [],
    outline: [
        [24.735834,46.702667],[24.735846,46.70266],[24.735876,46.702641],[24.735901,46.702625],
        [24.735935,46.70261],[24.735977,46.702591],[24.736002,46.702572],[24.736027,46.702564],
        [24.736063,46.702534],[24.736074,46.702541],[24.736124,46.702515],[24.736137,46.702507],
        [24.736172,46.702492],[24.736216,46.702465],[24.736242,46.702454],[24.736267,46.702427],
        [24.736298,46.702396],[24.736313,46.702381],[24.736322,46.702358],[24.736334,46.702328],
        [24.73634,46.70229],[24.736334,46.702251],[24.736328,46.702217],[24.736315,46.702183],
        [24.736307,46.702145],[24.736288,46.702103],[24.73628,46.702068],[24.736263,46.702053],
        [24.736259,46.70203],[24.736252,46.702003],[24.736229,46.701954],[24.736221,46.701927],
        [24.736216,46.701916],[24.736202,46.701881],[24.736193,46.701851],[24.736176,46.701817],
        [24.736176,46.701809],[24.736149,46.701763],[24.736149,46.701733],[24.736132,46.701702],
        [24.736118,46.701656],[24.736084,46.701618],[24.736067,46.701572],[24.736053,46.70153],
        [24.73601,46.701508],[24.735981,46.701473],[24.735941,46.701462],[24.735889,46.701454],
        [24.735843,46.701458],[24.735806,46.701462],[24.735762,46.701462],[24.735726,46.701477],
        [24.735693,46.701481],[24.735633,46.701481],[24.735598,46.701485],[24.735573,46.701512],
        [24.735546,46.701519],[24.735512,46.701538],[24.735495,46.70156],[24.735464,46.701595],
        [24.735453,46.701637],[24.735435,46.701679],[24.735418,46.701706],[24.735399,46.701748],
        [24.735375,46.701794],[24.735348,46.701843],[24.735334,46.701885],[24.735315,46.701927],
        [24.735306,46.701965],[24.735293,46.702007],[24.735283,46.702049],[24.735283,46.702114],
        [24.735283,46.702156],[24.735296,46.702206],[24.735302,46.702251],[24.735319,46.702286],
        [24.735342,46.702324],[24.735357,46.702362],[24.735384,46.702404],[24.735403,46.702431],
        [24.735433,46.702458],[24.735466,46.702481],[24.735512,46.702503],[24.735554,46.702522],
        [24.735596,46.702545],[24.735643,46.702572],[24.735662,46.702595],[24.735693,46.702618],
        [24.735714,46.702637],[24.735756,46.702671],[24.735775,46.702694],[24.735798,46.702709]
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
    currentLap: 0, // Start from lap 0
    lapStartDist: 0,
    lapStartEnergy: 0,
    lapEfficiencies: [], // Array of {lap: number, efficiency: number (Wh/km)}
    hasLeftStart: false, // Track if car has left starting area
    startPositionSet: false, // Track if we've captured the initial start position from first GPS data

    // GPS-based distance tracking
    gpsDistanceKm: 0, // Total distance calculated from GPS
    lastGpsLat: null, // Last GPS latitude for distance calculation
    lastGpsLon: null, // Last GPS longitude for distance calculation

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
    distanceValue: document.getElementById('distanceValue'),
    jouleDistanceValue: document.getElementById('jouleDistanceValue'),
    currentLap: document.getElementById('currentLap'),
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

    // Update heat map every 2 points for smoother visualization
    if (state.heatMapPoints.length % 2 === 0) {
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
    const START_THRESHOLD = 0.0003; // ~33 meters from start line

    // Calculate distance from starting point using Pythagorean distance
    const distFromStart = Math.sqrt(
        Math.pow(state.lat - START_LAT, 2) +
        Math.pow(state.lon - START_LON, 2)
    );

    // Check if car has left the starting area (must go beyond threshold)
    if (!state.hasLeftStart && distFromStart > START_THRESHOLD) {
        state.hasLeftStart = true;
        console.log(`[LAP] Car has left starting area (distance: ${(distFromStart * 111000).toFixed(1)}m)`);
    }

    // Check if car has returned to start (lap completion)
    // IMPORTANT: Only count lap if car has left start AND returned within threshold
    if (state.hasLeftStart && distFromStart < START_THRESHOLD) {
        // Calculate lap statistics
        const energyWhSinceLapStart = state.energyWhAbs - state.lapStartEnergy;
        const energyKwhSinceLapStart = energyWhSinceLapStart / 1000; // Convert Wh to kWh
        const distSinceLapStart = state.distKmAbs - state.lapStartDist;

        // Minimum lap distance validation (prevents counting if car just wiggled at start)
        const MIN_LAP_DISTANCE = 0.8; // Minimum 800 meters to count as a valid lap

        if (distSinceLapStart < MIN_LAP_DISTANCE) {
            console.log(`[LAP] Ignoring incomplete lap (only ${(distSinceLapStart * 1000).toFixed(0)}m traveled, need ${(MIN_LAP_DISTANCE * 1000).toFixed(0)}m minimum)`);
            state.hasLeftStart = false; // Reset but don't count lap
            return; // Exit without counting lap
        }

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
            console.log(`✅ [LAP ${state.currentLap}] COMPLETED! Distance: ${distSinceLapStart.toFixed(2)} km, Efficiency: ${efficiency.toFixed(2)} km/kWh`);
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
        reconnectPeriod: 2000,
        qos: 0  // Use QoS 0 for minimal latency
    });

    client.on("connect", () => {
        console.log("✅ Connected to MQTT");
        client.subscribe(TOPIC, { qos: 0 }, err => {
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
        // GPS fallback disabled - using MQTT data only
    });

    client.on("offline", () => {
        console.warn("📡 MQTT offline");
        // GPS fallback disabled - using MQTT data only
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

    // Set start position from first GPS data received
    if (!state.startPositionSet && state.lat && state.lon) {
        LUSAIL_SHORT.stopLine[0] = state.lat;
        LUSAIL_SHORT.stopLine[1] = state.lon;
        state.startPositionSet = true;
        console.log(`[START] Start position set from first GPS data: [${state.lat}, ${state.lon}]`);
    }

    // Calculate GPS-based distance (Haversine formula)
    if (state.lat && state.lon) {
        if (state.lastGpsLat !== null && state.lastGpsLon !== null) {
            // Calculate distance from last GPS position
            const distKm = calculateDistance(
                state.lastGpsLat, state.lastGpsLon,
                state.lat, state.lon
            );

            // Only add distance if movement is reasonable (< 1km between updates)
            // This prevents GPS jumps from corrupting the total
            if (distKm < 1) {
                state.gpsDistanceKm += distKm;
            }
        }

        // Update last GPS position for next calculation
        state.lastGpsLat = state.lat;
        state.lastGpsLon = state.lon;
    }

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

    // Update GPS distance display
    el.distanceValue.textContent = state.gpsDistanceKm.toFixed(2);

    // Update joule meter distance display (from car's odometer data)
    el.jouleDistanceValue.textContent = state.distKmAbs.toFixed(2);
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
