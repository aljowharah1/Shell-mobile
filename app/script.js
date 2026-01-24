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
const GPS_BACKUP_TOPIC = "car/phone_gps"; // Phone publishes GPS backup here

const TRACK_LAP_KM = 1.5;  // University test track (estimated)
const PACKET_MIN_MS = 16;   // ~60 FPS UI update rate for ultra-smooth real-time response
const IDLE_THRESHOLD_MS = 15000; // 15 seconds idle detection
const SPEED_MOVEMENT_THRESHOLD = 0.5; // km/h to consider "moving"

// GPS Fallback Mode
let gpsMode = false; // True when using phone GPS (offline fallback)
let gpsWatchId = null;
let lastGpsPosition = null;
let lastGpsTime = null;
let phoneGPSActive = false; // True when phone is publishing GPS backup

/* ====== TRACK DATA (Single Lap - 2026 Test Drive) ====== */
// Single clean lap from 2026 test_drive_1.csv (82 points)
// Start position: Averaged from 2025 & 2026 data
// Stop line: Mandatory stop position from 2025 data (382m from start, ~50% of lap)
const LUSAIL_SHORT = {
    center: [25.488495475, 51.4502024915], // Start position (averaged from both years)
    stopLine: [25.491879583, 51.450886683], // Mandatory stop line (where car stopped for 4 seconds)
    zoom: 17,
    turns: [],
    outline: [[25.488508,51.450085],[25.488522,51.450031],[25.489103,51.449703],[25.489487,51.449459],[25.489933,51.449181],[25.49041,51.448895],[25.49087,51.448616],[25.491228,51.448402],[25.4916,51.448177],[25.491982,51.447956],[25.492393,51.447716],[25.492847,51.447517],[25.493258,51.44762],[25.493477,51.44799],[25.493382,51.448467],[25.493086,51.44891],[25.492733,51.449345],[25.492432,51.449749],[25.492205,51.450089],[25.491951,51.450546],[25.491653,51.450958],[25.491503,51.451488],[25.491356,51.451973],[25.491001,51.452225],[25.490715,51.452602],[25.490423,51.453064],[25.490179,51.453598],[25.489998,51.454205],[25.489935,51.454876],[25.489889,51.455456],[25.489855,51.456108],[25.489893,51.456696],[25.489954,51.457214],[25.490009,51.457687],[25.490063,51.458118],[25.490101,51.458515],[25.490078,51.458893],[25.489925,51.459202],[25.489662,51.459415],[25.489388,51.459595],[25.489166,51.459736],[25.488916,51.459869],[25.488621,51.459946],[25.488298,51.459854],[25.488031,51.459686],[25.487749,51.459503],[25.487413,51.459293],[25.48708,51.458984],[25.486948,51.458527],[25.48704,51.458103],[25.487108,51.457726],[25.487171,51.457417],[25.487246,51.457054],[25.487316,51.456715],[25.487383,51.45639],[25.487419,51.456085],[25.487371,51.455738],[25.487125,51.455475],[25.486776,51.455284],[25.486399,51.455048],[25.485968,51.454792],[25.485529,51.454559],[25.485178,51.454365],[25.484804,51.454159],[25.48448,51.453983],[25.484215,51.453819],[25.484049,51.453583],[25.483971,51.453293],[25.484051,51.452965],[25.484308,51.452705],[25.48457,51.452541],[25.484777,51.452408],[25.485016,51.452259],[25.485346,51.452057],[25.485674,51.451836],[25.486113,51.451565],[25.486551,51.451317],[25.48694,51.451088],[25.48728,51.450874],[25.487589,51.450684],[25.487877,51.45052],[25.488096,51.450382]]
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

    // Smooth display values (interpolated for smooth animations)
    displaySpeed: 0,
    displayCurrent: 0,

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
    timerDisplay: document.getElementById('timerDisplay'),
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

    // Draw main track outline in orange
    trackPolyline = L.polyline(LUSAIL_SHORT.outline, {
        color: '#ff6b35',
        weight: 8,
        opacity: 0.9,
        smoothFactor: 2,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Find indices closest to start and stop positions
    const findClosestPointIndex = (targetLat, targetLon) => {
        let minDist = Infinity;
        let minIndex = 0;
        LUSAIL_SHORT.outline.forEach((point, index) => {
            const dist = Math.sqrt(
                Math.pow(point[0] - targetLat, 2) +
                Math.pow(point[1] - targetLon, 2)
            );
            if (dist < minDist) {
                minDist = dist;
                minIndex = index;
            }
        });
        return minIndex;
    };

    const startIdx = findClosestPointIndex(LUSAIL_SHORT.center[0], LUSAIL_SHORT.center[1]);
    const stopIdx = findClosestPointIndex(LUSAIL_SHORT.stopLine[0], LUSAIL_SHORT.stopLine[1]);

    // Draw START POSITION segment (GREEN) - 3 points for seamless blend
    const startSegmentStart = Math.max(0, startIdx - 1);
    const startSegmentEnd = Math.min(LUSAIL_SHORT.outline.length - 1, startIdx + 2);
    const startSegment = LUSAIL_SHORT.outline.slice(startSegmentStart, startSegmentEnd);
    L.polyline(startSegment, {
        color: '#00ff00',
        weight: 9,
        opacity: 0.95,
        smoothFactor: 2,
        lineCap: 'round',
        lineJoin: 'round'
    }).addTo(map);

    // Draw STOP LINE segment (RED) - 3 points for seamless blend
    const stopSegmentStart = Math.max(0, stopIdx - 1);
    const stopSegmentEnd = Math.min(LUSAIL_SHORT.outline.length - 1, stopIdx + 2);
    const stopSegment = LUSAIL_SHORT.outline.slice(stopSegmentStart, stopSegmentEnd);
    L.polyline(stopSegment, {
        color: '#ff0000',
        weight: 9,
        opacity: 0.95,
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
    const minutes = Math.floor(safeNumber(remaining) / 60000);
    const seconds = Math.floor((safeNumber(remaining) % 60000) / 1000);

    // Only update if timerDisplay element exists
    if (el.timerDisplay) {
        el.timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
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

    // Calculate distance from starting point using Pythagorean distance
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

/* ====== PHONE GPS BACKUP (FOR CAR GPS FAILURE) ====== */
function startPhoneGPSBackup() {
    if (phoneGPSActive) return; // Already active
    phoneGPSActive = true;

    // Check if geolocation is available
    if (!navigator.geolocation) {
        console.error("❌ Geolocation not supported by browser");
        return;
    }

    console.log("📱 Starting phone GPS backup - will publish to MQTT topic:", GPS_BACKUP_TOPIC);

    // Start watching GPS position
    gpsWatchId = navigator.geolocation.watchPosition(
        publishPhoneGPS,
        handleGPSError,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

function stopPhoneGPSBackup() {
    if (!phoneGPSActive) return;
    phoneGPSActive = false;

    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }
    console.log("📱 Phone GPS backup stopped");
}

function publishPhoneGPS(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    const speed = position.coords.speed; // m/s or null
    const accuracy = position.coords.accuracy; // meters

    // Convert speed to km/h
    const speedKmh = speed !== null && speed >= 0 ? speed * 3.6 : 0;

    // Create GPS backup message
    const gpsBackup = {
        phone_latitude: lat,
        phone_longitude: lon,
        phone_speed_kmh: speedKmh,
        phone_accuracy_m: accuracy,
        timestamp: Date.now()
    };

    // Publish to MQTT
    if (client && client.connected) {
        client.publish(GPS_BACKUP_TOPIC, JSON.stringify(gpsBackup), { qos: 0 }, (err) => {
            if (err) {
                console.error("Failed to publish phone GPS:", err);
            } else {
                console.log(`📍 Phone GPS: ${lat.toFixed(6)}, ${lon.toFixed(6)} (±${accuracy.toFixed(1)}m)`);
            }
        });
    } else {
        console.warn("⚠️ MQTT not connected, cannot publish phone GPS");
    }

    // Also update local state for display
    state.lat = lat;
    state.lon = lon;
    state.speed = speedKmh;

    // Update map and UI
    requestFrame();
}

/* ====== GPS FALLBACK MODE ====== */
function activateGPSFallback() {
    gpsMode = true;
    console.log("🛰️ GPS FALLBACK MODE ACTIVATED");
    console.log("Using phone GPS for: Speed, Position, Laps, Timer");
    console.log("Disabled: Current, Voltage, Power, Energy, Efficiency");

    // GPS mode indicator removed - automatic fallback without driver distraction

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
    // Silent fallback - no alerts to distract driver
    if (error.code === error.PERMISSION_DENIED) {
        console.error("GPS permission denied - fallback mode unavailable");
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

    // Check if car GPS is valid (not null, not 0,0)
    const carLat = num(data.latitude);
    const carLon = num(data.longitude);
    const isCarGPSValid = carLat !== 0 && carLon !== 0 && Math.abs(carLat) > 0.001 && Math.abs(carLon) > 0.001;

    if (isCarGPSValid) {
        // Use car GPS (primary source)
        state.lon = carLon;
        state.lat = carLat;
        // Stop phone GPS backup if it was active
        if (phoneGPSActive) {
            console.log("✅ Car GPS restored, stopping phone GPS backup");
            stopPhoneGPSBackup();
        }
    } else {
        // Car GPS is invalid - activate phone GPS backup
        if (!phoneGPSActive) {
            console.log("⚠️ Car GPS invalid (0,0 or null), activating phone GPS backup");
            startPhoneGPSBackup();
        }
        // Keep using last known position until phone GPS updates
    }

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

// Helper function to safely format numbers and prevent NaN display
function safeNumber(value, defaultValue = 0) {
    return Number.isFinite(value) ? value : defaultValue;
}

function updateSpeedometer() {
    // Smooth interpolation for speed (lerp with factor 0.2 for smooth transitions)
    const lerpFactor = 0.2;
    state.displaySpeed += (safeNumber(state.speed) - safeNumber(state.displaySpeed)) * lerpFactor;
    state.displayCurrent += (Math.abs(safeNumber(state.current)) - safeNumber(state.displayCurrent)) * lerpFactor;

    // Ensure display values are never NaN
    state.displaySpeed = safeNumber(state.displaySpeed);
    state.displayCurrent = safeNumber(state.displayCurrent);

    const speed = Math.round(state.displaySpeed);
    el.speedValue.textContent = speed;

    // Update speed arc (circumference = 2πr = 754, max speed 50 km/h)
    const maxSpeed = 50;
    const percentage = Math.min(state.displaySpeed / maxSpeed, 1);
    const offset = 754 - (percentage * 754);
    el.speedArc.style.strokeDashoffset = safeNumber(offset, 754);

    // Update current display with smooth value (always show 0.0 instead of NaN)
    el.currentValue.textContent = safeNumber(state.displayCurrent).toFixed(1);

    // Update GPS distance display (always show 0.00 instead of NaN)
    el.distanceValue.textContent = safeNumber(state.gpsDistanceKm).toFixed(2);

    // Update joule meter distance display (always show 0.00 instead of NaN)
    el.jouleDistanceValue.textContent = safeNumber(state.distKmAbs).toFixed(2);
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
