// Simple 2D Track Visualizer
class TrackVisualizer2D {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.trackPoints = [];
    this.currentPosition = null;
    this.trailPoints = [];
    this.isInitialized = false;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.bounds = { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
    this.setupControls();
  }

  initCanvas() {
    if (this.isInitialized) return;
    
    this.canvas = document.getElementById('trackCanvas');
    if (!this.canvas) {
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.isInitialized = true;
  }

  resizeCanvas() {
    if (!this.canvas) return;
    
    const container = this.canvas.parentElement;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.draw();
  }

  setTrackData(gpsData) {
    // Extract GPS coordinates
    this.trackPoints = gpsData.map(point => ({
      lat: parseFloat(point.gps_latitude),
      lng: parseFloat(point.gps_longitude)
    })).filter(point => !isNaN(point.lat) && !isNaN(point.lng));

    if (this.trackPoints.length === 0) {
      return;
    }

    // Extract the overall track shape (reduce points to get clean shape)
    const trackShape = this.extractTrackShape(this.trackPoints);

    // Calculate bounds
    this.bounds.minLat = Math.min(...trackShape.map(p => p.lat));
    this.bounds.maxLat = Math.max(...trackShape.map(p => p.lat));
    this.bounds.minLng = Math.min(...trackShape.map(p => p.lng));
    this.bounds.maxLng = Math.max(...trackShape.map(p => p.lng));

    // Calculate scale and offset for optimal display
    this.calculateTransform();
    this.draw();
  }

  extractTrackShape(points) {
    // Reduce points to get the overall track shape
    const step = Math.max(1, Math.floor(points.length / 200)); // Max 200 points for clean shape
    const shape = [];
    
    for (let i = 0; i < points.length; i += step) {
      shape.push(points[i]);
    }
    
    // Ensure we close the loop
    if (shape.length > 0 && shape[0] !== shape[shape.length - 1]) {
      shape.push(shape[0]);
    }
    
    return shape;
  }

  calculateTransform() {
    if (!this.canvas || this.trackPoints.length === 0) return;

    const latRange = this.bounds.maxLat - this.bounds.minLat;
    const lngRange = this.bounds.maxLng - this.bounds.minLng;
    
    console.log('📊 Track bounds:', {
      minLat: this.bounds.minLat,
      maxLat: this.bounds.maxLat,
      minLng: this.bounds.minLng,
      maxLng: this.bounds.maxLng,
      latRange,
      lngRange
    });
    
    // Scale to fit canvas with generous padding (smaller track, better centered)
    const padding = 80; // Increased padding for better centering
    const scaleX = (this.canvas.width - padding * 2) / lngRange;
    const scaleY = (this.canvas.height - padding * 2) / latRange;
    
    // Make track smaller by reducing scale
    this.scale = Math.min(scaleX, scaleY) * 0.7; // 70% of original size
    
    // Center the track better
    const trackWidth = lngRange * this.scale;
    const trackHeight = latRange * this.scale;
    this.offsetX = (this.canvas.width - trackWidth) / 2 - this.bounds.minLng * this.scale;
    this.offsetY = (this.canvas.height - trackHeight) / 2 - this.bounds.minLat * this.scale;
    
    console.log('🎯 Transform calculated:', {
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      trackWidth,
      trackHeight,
      canvasSize: `${this.canvas.width}x${this.canvas.height}`
    });
  }

  latLngToCanvas(lat, lng) {
    const x = lng * this.scale + this.offsetX;
    const y = this.canvas.height - (lat * this.scale + this.offsetY); // Flip Y axis
    
    // Debug first few points
    if (Math.random() < 0.01) { // Log 1% of points to avoid spam
      console.log(`📍 GPS: (${lat.toFixed(6)}, ${lng.toFixed(6)}) → Canvas: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    }
    
    return { x, y };
  }

  draw() {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas with black background
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw thick white track reference
    this.drawTrack();

    // Draw trail
    if (this.trailPoints.length > 0) {
      this.drawTrail();
    }

    // Draw current position (big orange pointer)
    if (this.currentPosition) {
      this.drawCurrentPosition();
    }
  }

  drawTrack() {
    if (this.trackPoints.length < 2) {
      console.log('❌ Not enough track points to draw:', this.trackPoints.length);
      return;
    }

    console.log('🎨 Drawing track with', this.trackPoints.length, 'points');
    console.log('📏 Canvas size:', this.canvas.width, 'x', this.canvas.height);

    // Draw bright white track
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 3; // Thinner, cleaner line
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.trackPoints.forEach((point, index) => {
      const canvasPos = this.latLngToCanvas(point.lat, point.lng);
      if (index === 0) {
        this.ctx.moveTo(canvasPos.x, canvasPos.y);
      } else {
        this.ctx.lineTo(canvasPos.x, canvasPos.y);
      }
    });
    this.ctx.stroke();
  }

  drawTrail() {
    if (this.trailPoints.length < 2) return;

    this.ctx.strokeStyle = '#ff6b35';
    this.ctx.lineWidth = 8;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = 0.8;
    
    this.ctx.beginPath();
    this.trailPoints.forEach((point, index) => {
      const canvasPos = this.latLngToCanvas(point.lat, point.lng);
      if (index === 0) {
        this.ctx.moveTo(canvasPos.x, canvasPos.y);
      } else {
        this.ctx.lineTo(canvasPos.x, canvasPos.y);
      }
    });
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  drawCurrentPosition() {
    const canvasPos = this.latLngToCanvas(this.currentPosition.lat, this.currentPosition.lng);
    
    // Draw big orange pointer
    this.ctx.fillStyle = '#ff6b35';
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x, canvasPos.y, 8, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Add glow effect
    this.ctx.shadowColor = '#ff6b35';
    this.ctx.shadowBlur = 15;
    this.ctx.beginPath();
    this.ctx.arc(canvasPos.x, canvasPos.y, 6, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }

  updatePosition(lat, lng) {
    if (!lat || !lng || lat === 0 || lng === 0) return;
    
    this.currentPosition = { lat, lng };
    
    // Add to trail
    this.trailPoints.push({ lat, lng });
    
    // Limit trail length for performance
    if (this.trailPoints.length > 200) {
      this.trailPoints = this.trailPoints.slice(-200);
    }
    
    this.draw();
    console.log(`📍 Pointer moved to: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  }

  clearTrail() {
    this.trailPoints = [];
    this.draw();
    console.log('Trail cleared');
  }

  toggleTrack() {
    // For 2D, we can toggle track visibility by redrawing
    this.draw();
    console.log('Track visibility toggled');
  }

  centerTrack() {
    if (this.trackPoints.length > 0) {
      this.calculateTransform();
      this.draw();
    }
    console.log('Track centered');
  }

  resetView() {
    this.centerTrack();
    console.log('View reset');
  }

  setupControls() {
    document.addEventListener('DOMContentLoaded', () => {
      const clearBtn = document.getElementById('clearTrack');
      const toggleTrackBtn = document.getElementById('toggleTrack');
      const centerBtn = document.getElementById('centerTrack');
      const resetBtn = document.getElementById('resetView');
      
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearTrail());
      }
      
      if (toggleTrackBtn) {
        toggleTrackBtn.addEventListener('click', () => this.toggleTrack());
      }
      
      if (centerBtn) {
        centerBtn.addEventListener('click', () => this.centerTrack());
      }
      
      if (resetBtn) {
        resetBtn.addEventListener('click', () => this.resetView());
      }
    });
  }
}

// View Toggle Controller
class ViewToggleController {
  constructor() {
    this.currentView = 'telemetry';
    this.telemetryView = document.getElementById('telemetryView');
    this.graphsView = document.getElementById('graphsView');
    this.mainDataSection = document.getElementById('mainDataSection');
    this.liveTelemetryBtn = document.getElementById('liveTelemetryBtn');
    this.graphsBtn = document.getElementById('graphsBtn');
    
    this.setupEventListeners();
    this.showView('telemetry'); // Default to telemetry view
  }

  setupEventListeners() {
    if (this.liveTelemetryBtn) {
      this.liveTelemetryBtn.addEventListener('click', () => {
        this.showView('telemetry');
      });
    }

    if (this.graphsBtn) {
      this.graphsBtn.addEventListener('click', () => {
        this.showView('graphs');
      });
    }
  }

  showView(viewType) {
    console.log(`🔄 Switching to ${viewType} view`);
    
    // Update button states
    if (this.liveTelemetryBtn && this.graphsBtn) {
      this.liveTelemetryBtn.classList.toggle('active', viewType === 'telemetry');
      this.graphsBtn.classList.toggle('active', viewType === 'graphs');
    }

    // Show/hide sections with smooth transitions
    if (viewType === 'telemetry') {
      if (this.telemetryView) {
        this.telemetryView.style.display = 'flex';
        this.telemetryView.style.opacity = '0';
        setTimeout(() => {
          this.telemetryView.style.opacity = '1';
          // Resize track canvas when showing telemetry view
          if (window.trackVisualizer) {
            window.trackVisualizer.resizeCanvas();
            // Redraw the track if data is available
            if (window.racingDashboard && window.racingDashboard.csvData) {
              window.trackVisualizer.setTrackData(window.racingDashboard.csvData);
            }
          }
        }, 10);
      }
      
      if (this.graphsView) {
        this.graphsView.style.display = 'none';
      }
      
      if (this.mainDataSection) {
        this.mainDataSection.style.display = 'flex';
      }
    } else if (viewType === 'graphs') {
      if (this.telemetryView) {
        this.telemetryView.style.display = 'none';
      }
      
      if (this.graphsView) {
        this.graphsView.style.display = 'block';
        this.graphsView.style.opacity = '0';
        setTimeout(() => {
          this.graphsView.style.opacity = '1';
          // Resize graphs when showing graphs view
          if (window.f1Graphs) {
            window.f1Graphs.refreshGraphs();
            setTimeout(() => {
              window.f1Graphs.resizeGraphs();
            }, 200);
          }
        }, 10);
      }
      
      if (this.mainDataSection) {
        this.mainDataSection.style.display = 'none';
      }
    }

    this.currentView = viewType;
  }

  getCurrentView() {
    return this.currentView;
  }
}

// Initialize 2D Track Visualizer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log(' DOM loaded, initializing 2D Track Visualizer...');
  const canvasDiv = document.getElementById('trackCanvas');
  if (canvasDiv) {
    console.log(' Track canvas found:', canvasDiv);
    window.trackVisualizer = new TrackVisualizer2D();
    window.trackVisualizer.initCanvas();
    console.log(' 2D Track Visualizer initialized');
    
    // Initialize F1-Style Graphs
    console.log(' Initializing F1-Style Graphs...');
    window.f1Graphs = new F1TelemetryGraphs();
    console.log(' F1-Style Graphs initialized');
    
    // Initialize View Toggle Controller
    console.log(' Initializing View Toggle Controller...');
    window.viewToggle = new ViewToggleController();
    console.log(' View Toggle Controller initialized');
    
    // Initialize dashboard after track visualizer is ready
    console.log('🚀 Initializing Racing Telemetry Dashboard...');
    window.racingDashboard = new RacingTelemetryDashboard();
    console.log('✅ Racing Telemetry Dashboard initialized');
  } else {
    console.error(' Track canvas not found!');
  }
});

// Comprehensive Racing Telemetry Dashboard
class RacingTelemetryDashboard {
  constructor() {
    this.startTime = Date.now();
    this.mqttClient = null;
    this.isConnected = false;
    this.raceStartTime = null;
    
    // Race parameters
    this.targetRaceTime = 35 * 60; // 35 minutes in seconds
    this.totalRaceDistance = 14.8; // km
    this.totalLaps = 4;
    
    // MQTT Configuration - ShellJM Racing Team
    this.mqttConfig = {
      host: '8fac0c92ea0a49b8b56f39536ba2fd78.s1.eu.hivemq.cloud',
      port: 8884, // WebSocket port for browser connections
      username: 'ShellJM',
      password: 'psuEcoteam1st',
      topics: {
        telemetry: 'car/telemetry'  // Single topic for all telemetry data
      }
    };
    
    // Current telemetry data from MQTT
    this.currentTelemetry = {
      speed: 0,
      voltage: 0,
      current: 0,
      power: 0,
      totalEnergy: 0,
      efficiency: 0,
      consumption: 0,
      longitude: 0,
      latitude: 0,
      distance: 0,
      lapDistance: 0,
      lap: 0,
      timestamp: 0,
      rpm: 0
    };
    
    // Distance reset offset (for reset button)
    this.distanceOffset = 0;
    
    // Data history for graphs
    this.dataHistory = {
      volts: [],
      current: [],
      efficiency: [],
      consumption: []
    };
    
    // Real-time graph data storage
    this.realtimeGraphData = [];
    this.energyStartTime = null;
    
    // Maximum data points to keep
    this.maxDataPoints = 1000;
    
    // Data tracking
    this.speedHistory = [];
    this.lapStartTime = null;
    this.lapStartDistance = 0;
    this.lapStartEnergy = 0;
    this.currentLap = 0;
    
    // Alert thresholds
    this.voltageThreshold = 42; // V
    this.currentThreshold = 30; // A
    this.energyBudget = 2000; // Wh allowed
    
    // Initialize 2D Track Visualizer
    this.trackVisualizer2D = null;
    
    // Playback control
    this.isPlaying = false;
    this.updateInterval = null;
    
    this.init();
  }

  async init() {
    console.log('🏁 Dashboard init() called');
    this.updateTelemetry(); // Show initial state
    console.log('📊 Telemetry updated, now loading track...');
    await this.loadTrackShape(); // Automatically load track on startup
    this.setupTestButton(); // Setup MQTT test button
    this.setupResetButton(); // Setup distance reset button
  }
  
  setupResetButton() {
    const resetBtn = document.getElementById('resetDistanceBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetDistance();
      });
      console.log('✅ Distance reset button setup complete');
    }
  }
  
  
  
  async loadTrackShape() {
    try {
      console.log('🚀 Starting track shape loading...');
      
      // Update overlay to show loading state
      const overlayText = document.querySelector('#trackOverlay .overlay-content p');
      if (overlayText) {
        overlayText.textContent = 'Loading track shape...';
      }
      
      console.log('📡 Fetching race_data.csv...');
      
      const response = await fetch('race_data.csv');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      console.log('✅ CSV file fetched successfully');
      
      const csvText = await response.text();
      const lines = csvText.split('\n');
      const headers = lines[0].split(',');
      
      console.log('📋 CSV headers:', headers.slice(0, 10)); // Show first 10 headers
      
      // Find GPS coordinate columns
      const latIndex = headers.findIndex(h => h.trim() === 'gps_latitude');
      const lngIndex = headers.findIndex(h => h.trim() === 'gps_longitude');
      
      console.log('📍 GPS column indices - lat:', latIndex, 'lng:', lngIndex);
      
      if (latIndex === -1 || lngIndex === -1) {
        throw new Error('GPS coordinate columns not found in race_data.csv');
      }
      
      // Extract GPS coordinates for track shape
      const trackPoints = [];
      console.log('🔍 Processing CSV lines...');
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',');
          const lat = parseFloat(values[latIndex]);
          const lng = parseFloat(values[lngIndex]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            trackPoints.push({ gps_latitude: lat, gps_longitude: lng });
          }
        }
        
        // Log progress every 1000 lines
        if (i % 1000 === 0) {
          console.log(`📊 Processed ${i} lines, found ${trackPoints.length} valid GPS points`);
        }
      }
      
      console.log(`🎯 Loaded ${trackPoints.length} track points`);
      
      // Set track data for visualizer (without real-time pointer)
      if (window.trackVisualizer) {
        console.log('🎨 Setting track data for visualizer...');
        console.log('📊 Track points to set:', trackPoints.length);
        window.trackVisualizer.setTrackData(trackPoints);
        console.log('✅ Track data set successfully');
        
        this.hideTrackOverlay();
        console.log('🎉 Track shape loaded and displayed successfully');
      } else {
        console.error('❌ Track visualizer not initialized!');
        console.error('❌ Available window objects:', Object.keys(window).filter(k => k.includes('track')));
        throw new Error('Track visualizer not initialized');
      }
      
    } catch (error) {
      console.error('Error loading track shape:', error);
      
      // Update overlay to show error state
      const overlayText = document.querySelector('#trackOverlay .overlay-content p');
      if (overlayText) {
        overlayText.textContent = 'Failed to load track shape';
      }
      
      // Keep overlay visible on error so user can see the issue
    }
  }

  async connectToMQTT() {
    try {
      console.log(' Connecting to MQTT broker...');
      
      // Show loading message
      const button = document.getElementById('connectMqttBtn');
      if (button) {
        button.textContent = 'Connecting...';
        button.disabled = true;
      }
      
      // MQTT connection options - use HiveMQ Cloud format
      const wsUrl = `wss://${this.mqttConfig.host}:${this.mqttConfig.port}/mqtt`;
      console.log('🔗 WebSocket URL:', wsUrl);
      
      const options = {
        username: this.mqttConfig.username,
        password: this.mqttConfig.password,
        clientId: 'jm_racing_dashboard_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000,
        // SSL options for HiveMQ Cloud
        rejectUnauthorized: false
      };
      
      // Connect to MQTT broker using the direct URL format
      this.mqttClient = mqtt.connect(wsUrl, options);
      
      // Connection timeout
      const connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          this.mqttClient.end();
          alert('❌ MQTT Connection Timeout!\nPlease check your internet connection and broker details.');
          
          // Reset button state
          if (button) {
            button.textContent = 'Connect to MQTT';
            button.disabled = false;
            button.style.background = '';
          }
        }
      }, 10000); // 10 second timeout
      
      this.mqttClient.on('connect', () => {
        console.log(' Connected to MQTT broker');
        this.isConnected = true;
        clearTimeout(connectionTimeout);
        
        // Subscribe to telemetry topic
        this.mqttClient.subscribe(this.mqttConfig.topics.telemetry, (err) => {
          if (!err) {
            console.log(' Subscribed to telemetry topic:', this.mqttConfig.topics.telemetry);
            
            // Success message
            alert('✅ MQTT Connected Successfully!\n\n📡 Connected to: ' + this.mqttConfig.host + '\n📋 Topic: ' + this.mqttConfig.topics.telemetry + '\n\nWaiting for telemetry data...');
            
            // Update button state
            if (button) {
              button.textContent = 'Connected ✓';
              button.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
            }
          } else {
            alert('❌ Failed to subscribe to telemetry topic: ' + err.message);
          }
        });
      });
      
      this.mqttClient.on('message', (topic, message) => {
        this.handleMqttMessage(topic, message.toString());
      });
      
      this.mqttClient.on('error', (err) => {
        console.error('MQTT connection error:', err);
        this.isConnected = false;
        clearTimeout(connectionTimeout);
        
        // Error message
        alert('❌ MQTT Connection Failed!\n\nError: ' + err.message + '\n\nPlease check:\n• Internet connection\n• Broker credentials\n• Firewall settings');
        
        // Reset button state
        if (button) {
          button.textContent = 'Connect to MQTT';
          button.disabled = false;
          button.style.background = '';
        }
      });
      
      this.mqttClient.on('close', () => {
        console.log(' MQTT connection closed');
        this.isConnected = false;
        clearTimeout(connectionTimeout);
        
        // Reset button state if not manually disconnected
        if (button && button.textContent !== 'Connect to MQTT') {
          button.textContent = 'Connect to MQTT';
          button.disabled = false;
          button.style.background = '';
        }
      });
      
    } catch (error) {
      console.error('Error connecting to MQTT:', error);
      alert('❌ Failed to connect to MQTT: ' + error.message);
      
      // Reset button state
      const button = document.getElementById('connectMqttBtn');
      if (button) {
        button.textContent = 'Connect to MQTT';
        button.disabled = false;
        button.style.background = '';
      }
    }
  }

  handleMqttMessage(topic, message) {
    try {
      if (topic !== this.mqttConfig.topics.telemetry) {
        return; // Ignore other topics
      }
      
      const parsed = JSON.parse(message);
      // If this is our echo, parse the nested original payload to update UI
      let data = parsed;
      if (parsed && parsed.source === 'dashboard') {
        if (parsed.original) {
          data = parsed.original;
        } else {
          return; // no original payload, skip
        }
      }
      console.log('📡 Received Arduino telemetry data:', data);
      
      // Parse Arduino payload: voltage, current, power, rpm, speed, distance, energy, lat, lon
      this.receivedEnergyFromMqtt = false;
      if (data.voltage !== undefined) {
        this.currentTelemetry.voltage = parseFloat(data.voltage) || 0;
      }
      
      if (data.current !== undefined) {
        this.currentTelemetry.current = parseFloat(data.current) || 0;
        console.log('🔌 Parsed current from broker:', data.current, '→', this.currentTelemetry.current);
      }
      
      if (data.power !== undefined) {
        this.currentTelemetry.power = parseFloat(data.power) || 0;
      } else {
        // Calculate power if not provided: P = V × I
        this.currentTelemetry.power = this.currentTelemetry.voltage * this.currentTelemetry.current;
      }

      // Energy: accept Wh or Joules and convert to Wh
      if (
        data.totalEnergyWh !== undefined ||
        data.energy_wh !== undefined ||
        data.total_energy_wh !== undefined ||
        data.energyWh !== undefined ||
        data.energy !== undefined ||
        data.net_joule !== undefined ||
        data.energy_j !== undefined
      ) {
        let wh = undefined;
        const rawWh = data.totalEnergyWh ?? data.energy_wh ?? data.total_energy_wh ?? data.energyWh ?? data.energy;
        if (rawWh !== undefined && Number.isFinite(parseFloat(rawWh))) {
          wh = parseFloat(rawWh);
        }
        if (!Number.isFinite(wh)) {
          const rawJ = data.net_joule ?? data.energy_j;
          if (rawJ !== undefined && Number.isFinite(parseFloat(rawJ))) {
            wh = parseFloat(rawJ) / 3600.0;
          }
        }
        if (Number.isFinite(wh)) {
          this.currentTelemetry.totalEnergy = wh;
          this.receivedEnergyFromMqtt = true;
          console.log('⚡ Parsed totalEnergy (Wh) from broker →', this.currentTelemetry.totalEnergy);
        }
      }
      
      // RPM: support common variants
      if (data.rpm !== undefined || data.RPM !== undefined) {
        const rawRpm = data.rpm ?? data.RPM;
        this.currentTelemetry.rpm = Number.isFinite(parseFloat(rawRpm)) ? parseFloat(rawRpm) : 0;
        console.log('🔧 Parsed RPM from broker:', rawRpm, '→', this.currentTelemetry.rpm);
      }
      
      if (data.speed !== undefined) {
        this.currentTelemetry.speed = parseFloat(data.speed) || 0;
      }
      
      // Distance: support km and meters variants
      if (
        data.distance_km !== undefined ||
        data.distance !== undefined ||
        data.dist_km !== undefined ||
        data.dist !== undefined ||
        data.distanceMeters !== undefined ||
        data.distance_m !== undefined
      ) {
        let km = undefined;
        const rawKm = data.distance_km ?? data.distance ?? data.dist_km ?? data.dist;
        if (rawKm !== undefined) {
          km = parseFloat(rawKm);
        }
        if (!Number.isFinite(km)) {
          const rawMeters = data.distanceMeters ?? data.distance_m;
          if (rawMeters !== undefined) {
            const meters = parseFloat(rawMeters);
            if (Number.isFinite(meters)) km = meters / 1000.0;
          }
        }
        if (!Number.isFinite(km)) km = 0;
        this.currentTelemetry.distance = km;
        console.log('📏 Parsed distance (km) from broker →', this.currentTelemetry.distance);
      }
      
      // Parse GPS coordinates from payload (support multiple key variants)
      if (data.lat !== undefined && (data.lon !== undefined || data.lng !== undefined)) {
        this.currentTelemetry.latitude = parseFloat(data.lat) || 0;
        this.currentTelemetry.longitude = parseFloat(data.lon ?? data.lng) || 0;
      } else if (data.latitude !== undefined && data.longitude !== undefined) {
        this.currentTelemetry.latitude = parseFloat(data.latitude) || 0;
        this.currentTelemetry.longitude = parseFloat(data.longitude) || 0;
      } else if (data.gps_latitude !== undefined && data.gps_longitude !== undefined) {
        this.currentTelemetry.latitude = parseFloat(data.gps_latitude) || 0;
        this.currentTelemetry.longitude = parseFloat(data.gps_longitude) || 0;
      }
      
      // Calculate additional metrics for dashboard
      this.calculateTelemetryMetrics();
      
      // Update dashboard with new data
      this.updateTelemetryFromMqtt();
      
      // Update only the displayed GPS values in real time (no pointer move)
      this.updateGPSDisplay(this.currentTelemetry.latitude, this.currentTelemetry.longitude);
      
      // Persist telemetry to backend CSV log (best-effort)
      this.logTelemetryPacket({
        timestamp: Date.now(),
        voltage: this.currentTelemetry.voltage,
        current: this.currentTelemetry.current,
        power: this.currentTelemetry.power,
        speed: this.currentTelemetry.speed,
        rpm: this.currentTelemetry.rpm,
        latitude: this.currentTelemetry.latitude,
        longitude: this.currentTelemetry.longitude,
        efficiency: this.currentTelemetry.efficiency,
        consumption: this.currentTelemetry.consumption,
        totalEnergy: this.currentTelemetry.totalEnergy
      });

      // Store data for graphs
      this.storeTelemetryForGraphs();
      
      // Echo the packet back to the same topic for logging, marked with source
      this.publishTelemetryEcho({
        voltage: this.currentTelemetry.voltage,
        current: this.currentTelemetry.current,
        power: this.currentTelemetry.power,
        speed: this.currentTelemetry.speed,
        rpm: this.currentTelemetry.rpm,
        latitude: this.currentTelemetry.latitude,
        longitude: this.currentTelemetry.longitude,
        efficiency: this.currentTelemetry.efficiency,
        consumption: this.currentTelemetry.consumption,
        totalEnergy: this.currentTelemetry.totalEnergy,
        original: data,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('❌ Error parsing MQTT message:', error);
    }
  }

  publishTelemetryEcho(payload) {
    try {
      if (!this.mqttClient || !this.isConnected) return;
      const out = {
        ...payload,
        source: 'dashboard'
      };
      this.mqttClient.publish(
        this.mqttConfig.topics.telemetry,
        JSON.stringify(out),
        { qos: 0, retain: false }
      );
    } catch (_) {}
  }

  logTelemetryPacket(payload) {
    try {
      // Use fetch with keepalive for reliability; falls back gracefully if server not running
      fetch('/log_telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch (e) {
      // Ignore logging errors to avoid impacting UI
    }
  }

  calculateTelemetryMetrics() {
    // Update total energy (cumulative) - calculate energy used in real-time
    if (!this.energyStartTime) {
      this.energyStartTime = Date.now();
    }
    
    const timeDelta = (Date.now() - this.energyStartTime) / 1000; // seconds
    this.currentTelemetry.totalEnergy += (this.currentTelemetry.power * timeDelta) / 3600; // Wh
    
    // Reset energy start time for next calculation
    this.energyStartTime = Date.now();
    
    // Calculate efficiency: km/kWh
    if (this.currentTelemetry.totalEnergy > 0 && this.currentTelemetry.distance > 0) {
      const energyKWh = this.currentTelemetry.totalEnergy / 1000; // Convert Wh to kWh
      this.currentTelemetry.efficiency = this.currentTelemetry.distance / energyKWh; // km/kWh
    } else {
      this.currentTelemetry.efficiency = 0;
    }
    
    // Calculate consumption: Wh/km = totalEnergy (Wh) / distance (km)
    const displayDistance = Math.max(0, this.currentTelemetry.distance - this.distanceOffset);
    if (displayDistance > 0) {
      this.currentTelemetry.consumption = this.currentTelemetry.totalEnergy / displayDistance; // Wh/km
    } else {
      this.currentTelemetry.consumption = 0;
    }
    
    console.log('📊 Calculated metrics:', {
      efficiency: this.currentTelemetry.efficiency,
      consumption: this.currentTelemetry.consumption,
      totalEnergy: this.currentTelemetry.totalEnergy,
      distance: displayDistance
    });
  }

  updateTrackPosition() {
    if (this.currentTelemetry.latitude !== 0 && this.currentTelemetry.longitude !== 0) {
      // Update 2D Track Visualizer with new position
      if (window.trackVisualizer) {
        console.log(`📍 Updating track position: ${this.currentTelemetry.latitude}, ${this.currentTelemetry.longitude}`);
        window.trackVisualizer.updatePosition(this.currentTelemetry.latitude, this.currentTelemetry.longitude);
      }
    }
  }

  storeTelemetryForGraphs() {
    // Store current telemetry data for graph updates
    const timestamp = Date.now();
    
    // Add to data history for graphs
    this.dataHistory.volts.push(this.currentTelemetry.voltage);
    this.dataHistory.current.push(this.currentTelemetry.current);
    this.dataHistory.efficiency.push(this.currentTelemetry.efficiency);
    this.dataHistory.consumption.push(this.currentTelemetry.consumption);
    
    // Keep only the last maxDataPoints
    Object.keys(this.dataHistory).forEach(key => {
      if (this.dataHistory[key].length > this.maxDataPoints) {
        this.dataHistory[key].shift();
      }
    });
    
    // Update F1 graphs if available
    if (window.f1Graphs && this.dataHistory.volts.length > 10) {
      // Create a data point for the graph
      const graphData = {
        timestamp: timestamp,
        voltage: this.currentTelemetry.voltage,
        current: this.currentTelemetry.current,
        power: this.currentTelemetry.power,
        speed: this.currentTelemetry.speed,
        lat: this.currentTelemetry.latitude,
        lon: this.currentTelemetry.longitude,
        efficiency: this.currentTelemetry.efficiency,
        consumption: this.currentTelemetry.consumption
      };
      
      // Update graphs with new data point
      this.updateGraphsWithNewData(graphData);
    }
  }

  updateGraphsWithNewData(dataPoint) {
    // This method will be called to update graphs in real-time
    // For now, we'll trigger a refresh of the graphs
    if (window.f1Graphs) {
      // Store the data point for graph updates
      if (!this.realtimeGraphData) {
        this.realtimeGraphData = [];
      }
      
      this.realtimeGraphData.push(dataPoint);
      
      // Keep only last 1000 points for performance
      if (this.realtimeGraphData.length > 1000) {
        this.realtimeGraphData = this.realtimeGraphData.slice(-1000);
      }
      
      // Update graphs every 10 data points to avoid too frequent updates
      if (this.realtimeGraphData.length % 10 === 0) {
        this.updateRealtimeGraphs();
      }
    }
  }

  updateRealtimeGraphs() {
    if (!this.realtimeGraphData || this.realtimeGraphData.length === 0) return;
    
    // Update heat maps with current data
    this.updateCurrentHeatMapRealtime();
    this.updateEnergyHeatMapRealtime();
    
    // Update line graphs with current data
    this.updateSpeedGraphRealtime();
    this.updateCurrentGraphRealtime();
    this.updatePowerGraphRealtime();
    this.updateAccelerationGraphRealtime();
  }

  updateCurrentHeatMapRealtime() {
    const currentData = this.realtimeGraphData.filter(d => d.lat !== 0 && d.lon !== 0);
    if (currentData.length === 0) return;
    
    const trace = {
      x: currentData.map(d => d.lon),
      y: currentData.map(d => d.lat),
      mode: 'markers',
      name: 'Current Consumption',
      marker: { 
        color: currentData.map(d => d.current),
        colorscale: 'Hot',
        size: 8,
        opacity: 0.8,
        colorbar: {
          title: 'Current (A)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      }
    };
    
    Plotly.react('currentHeatMap', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Current Consumption Heat Map', font: { color: '#00ccff' } },
      xaxis: { title: 'Longitude', gridcolor: '#333' },
      yaxis: { title: 'Latitude', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updateEnergyHeatMapRealtime() {
    const energyData = this.realtimeGraphData.filter(d => d.lat !== 0 && d.lon !== 0);
    if (energyData.length === 0) return;
    
    const trace = {
      x: energyData.map(d => d.lon),
      y: energyData.map(d => d.lat),
      mode: 'markers',
      name: 'Power Consumption',
      marker: { 
        color: energyData.map(d => d.power),
        colorscale: 'Viridis',
        size: 8,
        opacity: 0.8,
        colorbar: {
          title: 'Power (W)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      }
    };
    
    Plotly.react('energyHeatMap', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Power Consumption Heat Map', font: { color: '#ff4444' } },
      xaxis: { title: 'Longitude', gridcolor: '#333' },
      yaxis: { title: 'Latitude', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updateSpeedGraphRealtime() {
    const speedData = this.realtimeGraphData;
    if (speedData.length === 0) return;
    
    // Create time array (seconds since first data point)
    const startTime = speedData[0].timestamp;
    const times = speedData.map(d => (d.timestamp - startTime) / 1000); // Convert to seconds
    
    const trace = {
      x: times,
      y: speedData.map(d => d.speed),
      mode: 'lines',
      name: 'Speed',
      line: { color: '#00ff00', width: 2 }
    };
    
    Plotly.react('speedGraph', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Speed vs Time', font: { color: '#00ff00' } },
      xaxis: { title: 'Time (s)', gridcolor: '#333' },
      yaxis: { title: 'Speed (km/h)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updateCurrentGraphRealtime() {
    const currentData = this.realtimeGraphData;
    if (currentData.length === 0) return;
    
    // Create time array (seconds since first data point)
    const startTime = currentData[0].timestamp;
    const times = currentData.map(d => (d.timestamp - startTime) / 1000); // Convert to seconds
    
    const trace = {
      x: times,
      y: currentData.map(d => d.current),
      mode: 'lines',
      name: 'Current',
      line: { color: '#00ccff', width: 2 }
    };
    
    Plotly.react('currentGraph', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Current vs Time', font: { color: '#00ccff' } },
      xaxis: { title: 'Time (s)', gridcolor: '#333' },
      yaxis: { title: 'Current (A)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updatePowerGraphRealtime() {
    const powerData = this.realtimeGraphData;
    if (powerData.length === 0) return;
    
    // Create time array (seconds since first data point)
    const startTime = powerData[0].timestamp;
    const times = powerData.map(d => (d.timestamp - startTime) / 1000); // Convert to seconds
    
    const trace = {
      x: times,
      y: powerData.map(d => d.power),
      mode: 'lines',
      name: 'Power',
      line: { color: '#ffd700', width: 2 }
    };
    
    Plotly.react('powerGraph', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Power vs Time', font: { color: '#ffd700' } },
      xaxis: { title: 'Time (s)', gridcolor: '#333' },
      yaxis: { title: 'Power (W)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updateAccelerationGraphRealtime() {
    const accelData = this.realtimeGraphData;
    if (accelData.length < 2) return;
    
    // Calculate acceleration from speed data
    const accelerations = [];
    for (let i = 1; i < accelData.length; i++) {
      const prevSpeed = accelData[i-1].speed;
      const currSpeed = accelData[i].speed;
      const timeDiff = 0.1; // Assume 0.1s between measurements
      const acceleration = (currSpeed - prevSpeed) / timeDiff; // m/s²
      accelerations.push(acceleration);
    }
    
    const speeds = accelData.slice(1).map(d => d.speed);
    
    const trace = {
      x: speeds,
      y: accelerations,
      mode: 'markers',
      name: 'Acceleration vs Speed',
      marker: { 
        color: accelData.slice(1).map(d => d.power),
        colorscale: 'Hot',
        size: 6,
        opacity: 0.7,
        colorbar: {
          title: 'Power (W)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      }
    };
    
    Plotly.react('accelerationGraph', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Acceleration vs Speed (Colored by Power)', font: { color: '#cc00ff' } },
      xaxis: { title: 'Speed (km/h)', gridcolor: '#333' },
      yaxis: { title: 'Acceleration (m/s²)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updateTelemetryFromMqtt() {
    // Calculate rolling average speed
    this.speedHistory.push(this.currentTelemetry.speed);
    if (this.speedHistory.length > 100) {
      this.speedHistory.shift();
    }
    const avgSpeed = this.speedHistory.length > 0 
      ? this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length 
      : 0;
    
    // Calculate display distance (with offset for reset)
    const displayDistance = Math.max(0, this.currentTelemetry.distance - this.distanceOffset);
    
    // Update all dashboard elements with current telemetry data
    this.updateElement('mainSpeed', this.currentTelemetry.speed >= 0 ? this.currentTelemetry.speed.toFixed(1) : '0');
    this.updateElement('avgSpeed', avgSpeed >= 0 ? avgSpeed.toFixed(1) : '0');
    this.updateElement('voltage', this.currentTelemetry.voltage >= 0 ? this.currentTelemetry.voltage.toFixed(1) : '0');
    this.updateElement('current', this.currentTelemetry.current >= 0 ? this.currentTelemetry.current.toFixed(1) : '0');
    this.updateElement('power', this.currentTelemetry.power >= 0 ? this.currentTelemetry.power.toFixed(0) : '0');
    // Update RPM - always show current value (separate RPM field)
    this.updateElement('rpm', (this.currentTelemetry.rpm !== undefined && this.currentTelemetry.rpm !== null) ? this.currentTelemetry.rpm.toFixed(0) : '0');
    // Update Total Energy (Wh)
    this.updateElement('totalEnergy', (this.currentTelemetry.totalEnergy !== undefined && this.currentTelemetry.totalEnergy !== null) ? this.currentTelemetry.totalEnergy.toFixed(0) : '0');
    // Update distance - always show current value
    this.updateElement('distanceCovered', (displayDistance >= 0) ? displayDistance.toFixed(3) : '0.000');
    this.updateElement('consumption', this.currentTelemetry.consumption >= 0 ? this.currentTelemetry.consumption.toFixed(1) : '0');
    this.updateElement('efficiency', this.currentTelemetry.efficiency >= 0 ? this.currentTelemetry.efficiency.toFixed(1) : '0');
    this.updateElement('gpsLongitude', this.currentTelemetry.longitude !== 0 ? this.currentTelemetry.longitude.toFixed(6) : '0.000000');
    this.updateElement('gpsLatitude', this.currentTelemetry.latitude !== 0 ? this.currentTelemetry.latitude.toFixed(6) : '0.000000');
    
    // Update main efficiency display
    this.updateElement('mainEfficiency', this.currentTelemetry.efficiency > 0 ? this.currentTelemetry.efficiency.toFixed(1) : '0');
    
    console.log('📊 Updated dashboard with Arduino data:', {
      speed: this.currentTelemetry.speed,
      avgSpeed: avgSpeed,
      rpm: this.currentTelemetry.rpm,
      distance: displayDistance,
      voltage: this.currentTelemetry.voltage,
      current: this.currentTelemetry.current,
      power: this.currentTelemetry.power,
      efficiency: this.currentTelemetry.efficiency,
      consumption: this.currentTelemetry.consumption,
      latitude: this.currentTelemetry.latitude,
      longitude: this.currentTelemetry.longitude
    });
  }
  
  resetDistance() {
    // Set offset to current distance to reset display to 0
    this.distanceOffset = this.currentTelemetry.distance;
    // Also reset total energy to recalculate consumption from zero
    this.currentTelemetry.totalEnergy = 0;
    this.energyStartTime = Date.now();
    console.log('🔄 Distance reset to 0');
    // Update display immediately
    this.updateTelemetryFromMqtt();
  }

  hideTrackOverlay() {
    const overlay = document.getElementById('trackOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
  
  showTrackOverlay() {
    const overlay = document.getElementById('trackOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  setupTestButton() {
    console.log('🔧 Setting up test button...');
    const testBtn = document.getElementById('testMqttBtn');
    console.log('🔍 Test button found:', testBtn);
    
    if (testBtn) {
      console.log('✅ Adding click listener to test button');
      testBtn.addEventListener('click', () => {
        console.log('🧪 Testing MQTT connection...');
        this.testMqttConnection();
      });
      console.log('✅ Test button setup complete');
    } else {
      console.error('❌ Test button not found!');
    }
  }


  // Simple MQTT test function (can be called from console)
  async simpleMqttTest() {
    console.log('🧪 Simple MQTT Test Starting...');
    
    try {
      // Test MQTT connection with minimal setup
      const mqtt = window.mqtt;
      if (!mqtt) {
        throw new Error('MQTT library not loaded');
      }
      
      console.log('📡 Connecting to:', this.mqttConfig.host, ':', this.mqttConfig.port);
      
      const options = {
        host: this.mqttConfig.host,
        port: this.mqttConfig.port,
        protocol: 'wss',
        clientId: 'test_' + Math.random().toString(16).substr(2, 8),
        clean: true,
        connectTimeout: 10000,
        username: this.mqttConfig.username,
        password: this.mqttConfig.password,
      };
      
      console.log('🔌 Connection options:', options);
      
      const client = mqtt.connect(options);
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          client.end();
          reject(new Error('Connection timeout'));
        }, 15000);
        
        client.on('connect', () => {
          console.log('✅ MQTT Connected successfully!');
          clearTimeout(timeout);
          client.end();
          resolve(true);
        });
        
        client.on('error', (err) => {
          console.error('❌ MQTT Connection error:', err);
          clearTimeout(timeout);
          client.end();
          reject(err);
        });
      });
      
    } catch (error) {
      console.error('❌ Simple MQTT test failed:', error);
      throw error;
    }
  }

  async testMqttConnection() {
    try {
      console.log('🔌 Testing MQTT connection...');
      console.log('📡 Broker:', this.mqttConfig.host);
      console.log('🔌 Port:', this.mqttConfig.port);
      console.log('👤 Username:', this.mqttConfig.username);
      console.log('📋 Topic:', this.mqttConfig.topics.telemetry);
      
      // Show connection attempt
      this.showConnectionStatus('Connecting to MQTT broker...', 'info');
      
      // Test connection
      await this.connectToMQTT();
      
      if (this.isConnected) {
        this.showConnectionStatus('✅ MQTT Connected! Listening for data...', 'success');
        console.log('✅ MQTT connection test successful');
      } else {
        this.showConnectionStatus('❌ MQTT connection failed', 'error');
        console.log('❌ MQTT connection test failed');
      }
    } catch (error) {
      console.error('❌ MQTT test error:', error);
      this.showConnectionStatus(`❌ MQTT Error: ${error.message}`, 'error');
    }
  }

  showConnectionStatus(message, type) {
    // Create or update status popup
    let statusDiv = document.getElementById('mqttStatus');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'mqttStatus';
      statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      `;
      document.body.appendChild(statusDiv);
    }
    
    // Set style based on type
    if (type === 'success') {
      statusDiv.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
    } else if (type === 'error') {
      statusDiv.style.background = 'linear-gradient(135deg, #ff0000, #cc0000)';
    } else {
      statusDiv.style.background = 'linear-gradient(135deg, #0066ff, #0044cc)';
    }
    
    statusDiv.textContent = message;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (statusDiv && statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 5000);
  }
  
  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }
  
  play() {
    if (this.csvData.length === 0) {
      console.log(' No data loaded to play');
      return;
    }
    
    this.isPlaying = true;
    const button = document.getElementById('playPauseBtn');
    button.textContent = 'Pause';
    
    // Hide overlay when starting
    this.hideTrackOverlay();
    
    this.updateInterval = setInterval(() => {
      this.updateTelemetry();
    }, 100); // Update every 100ms for smoother playback
    
    console.log(' Playback started');
  }
  
  pause() {
    this.isPlaying = false;
    const button = document.getElementById('playPauseBtn');
    button.textContent = 'Play';
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    console.log(' Playback paused');
  }
  
  async loadRealCSVData() {
    const buttonElement = document.getElementById('loadDataBtn');
    
    try {
      console.log('Starting to load data...');
      buttonElement.disabled = true;
      buttonElement.textContent = 'Loading...';
      
      const csvPath = 'race_data.csv';
      console.log('Loading real CSV data from:', csvPath);
      
      const response = await fetch(csvPath);
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const csvText = await response.text();
            console.log('CSV text length:', csvText.length);
      
      if (!csvText || csvText.length < 100) {
        throw new Error('CSV file appears to be empty or too small');
      }
      
      const lines = csvText.split('\n');
      console.log(' Number of lines:', lines.length);
      
      if (lines.length < 2) {
        throw new Error('CSV file appears to be empty or invalid');
      }
      
      // Parse header
      const headers = lines[0].split(',');
      console.log(' CSV headers:', headers);
      
      // Parse data rows (optimized for large files)
      this.csvData = [];
      const totalRows = lines.length - 1;
      console.log(` Parsing ${totalRows} data rows...`);
      
      // Process in chunks to avoid blocking the UI
      const chunkSize = 1000;
      let processedRows = 0;
      
      for (let i = 1; i < lines.length; i += chunkSize) {
        const endIndex = Math.min(i + chunkSize, lines.length);
        
        for (let j = i; j < endIndex; j++) {
          if (lines[j].trim()) {
            const values = lines[j].split(',');
            const row = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index] ? values[index].trim() : '';
            });
            this.csvData.push(row);
          }
        }
        
        processedRows = endIndex - 1;
        const progress = Math.round((processedRows / totalRows) * 100);
        buttonElement.textContent = ` Loading... ${progress}%`;
        
        // Allow UI to update
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      console.log(` Loaded ${this.csvData.length} data points from real CSV`);
      if (this.csvData.length > 0) {
        this.raceStartTime = parseFloat(this.csvData[0].obc_timestamp);
        console.log(' Race start time:', this.raceStartTime);
        console.log(' First data point:', this.csvData[0]);
        console.log(' GPS coordinates:', {
          lat: this.csvData[0].gps_latitude,
          lon: this.csvData[0].gps_longitude
        });
      }
      
      buttonElement.textContent = 'Data Loaded';
      buttonElement.style.background = 'linear-gradient(135deg, #00ff00, #00cc00)';
      
      // Initialize 2D Track Visualizer with loaded data
      if (window.trackVisualizer) {
        console.log(' Setting track data for visualizer...');
        window.trackVisualizer.setTrackData(this.csvData);
        console.log(' Track visualizer initialized with', this.csvData.length, 'data points');
      } else {
        console.log(' Track visualizer not found');
      }
      
      // Initialize F1-Style Graphs with loaded data
      if (window.f1Graphs) {
        console.log(' Setting data for F1 graphs...');
        window.f1Graphs.setData(this.csvData);
        console.log(' F1 graphs initialized with', this.csvData.length, 'data points');
      } else {
        console.log(' F1 graphs not found');
      }
      
      
      // Reset to first data point
      this.currentIndex = 0;
      
      // Enable play button
      const playButton = document.getElementById('playPauseBtn');
      if (playButton) {
        playButton.disabled = false;
        console.log(' Play button enabled');
      }
      
      // Show first data point
      console.log(' Running first telemetry update...');
      this.updateTelemetry();
      console.log(' First telemetry update completed');
      
    } catch (error) {
      console.error(' Error loading CSV data:', error);
      
      // Reset button on error
      buttonElement.disabled = false;
      buttonElement.textContent = 'Load Real Data';
      buttonElement.style.background = 'linear-gradient(135deg, #ff6b35, #ff8c42)';
      
      alert('Failed to load telemetry data: ' + error.message);
    }
  }

  updateTelemetry() {
    if (!this.csvData || this.csvData.length === 0) {
      console.log(' No CSV data available, showing initial state');
      this.updateInitialState();
      return;
    }
    
    console.log(` Updating telemetry with real data (index: ${this.currentIndex}/${this.csvData.length})`);

    const currentData = this.csvData[this.currentIndex];
    
    // Check if we've reached the end of the data
    if (this.currentIndex >= this.csvData.length) {
      console.log(' Race data playback complete!');
      this.currentIndex = 0; // Loop back to start
      return;
    }
    
    // Extract raw data from CSV with correct unit conversions
    const speed = parseFloat(currentData.gps_speed) || 0; // km/h
    const volts = (parseFloat(currentData.jm3_voltage) || 0) / 1000; // Convert to V
    const current = (Math.abs(parseFloat(currentData.jm3_current)) || 0) / 1000; // Convert to A
    const distance = (parseFloat(currentData.dist) || 0) / 1000; // Convert to km
    const lapDistance = (parseFloat(currentData.lap_dist) || 0) / 1000; // Convert to km
    const lap = parseInt(currentData.lap_lap) || 0;
    const timestamp = parseFloat(currentData.obc_timestamp) || 0;
    const netJoule = parseFloat(currentData.jm3_netjoule) || 0;
    const lapNetJoule = parseFloat(currentData.lap_jm3_netjoule) || 0;
    
    // Debug logging for data extraction
    console.log(` Data Point ${this.currentIndex}:`, {
      speed: speed,
      volts: volts,
      current: current,
      distance: distance,
      lapDistance: lapDistance,
      lap: lap,
      timestamp: timestamp,
      gps_lat: currentData.gps_latitude,
      gps_lon: currentData.gps_longitude,
      raw_data: currentData
    });
    
        // Calculate comprehensive metrics with correct formulas
        const avgSpeed = this.calculateAverageSpeed(speed);
        const power = volts * current; // Power in Watts (V × A)
        const energyTotalWh = netJoule / 3600; // Convert Joules to Wh
        const energyTotalKWh = netJoule / 3600000; // Convert Joules to kWh
        const energyLap = lapNetJoule / 3600; // Convert Joules to Wh
        
        // Consumption calculation: Wh per km
        const consumption = distance > 0 ? energyTotalWh / distance : 0; // Wh/km
        
        // Efficiency calculation: km per kWh
        const efficiency = energyTotalKWh > 0 ? distance / energyTotalKWh : 0; // km/kWh
    
    // Timing calculations
    const raceTime = this.formatRaceTime(timestamp);
    const lapTime = this.calculateLapTime(lap, timestamp);
    const remainingTime = this.calculateRemainingTimeFromTimestamp(timestamp);
    const remainingDistance = this.totalRaceDistance - distance;
    
    console.log(` Calculated Metrics:`, {
      avgSpeed: avgSpeed,
      power: power,
            energyTotal: energyTotalWh,
      energyLap: energyLap,
      consumption: consumption,
      efficiency: efficiency,
      raceTime: raceTime,
      remainingTime: remainingTime,
      elapsedSeconds: timestamp - this.raceStartTime,
      raceStartTime: this.raceStartTime,
      currentTimestamp: timestamp
    });
    
        // Update lap tracking
        this.updateLapTracking(lap, distance, energyTotalWh, timestamp);
    
        // Update DOM elements with correct data
        console.log(' Updating DOM elements...');
        this.updateMainDataSection(speed, avgSpeed, efficiency, timestamp);
        this.updateVehiclePerformance(speed, avgSpeed, distance, lapDistance, lap);
        this.updateElectricalSystem(volts, current, power, energyTotalWh, energyLap);
        this.updateEfficiencyMetrics(consumption, efficiency);
    
    // Update GPS coordinates display
    this.updateGPSDisplay(currentData.gps_latitude, currentData.gps_longitude);
    
    this.updateTimingStatus(raceTime, lapTime, remainingTime, remainingDistance);
    this.updateLocation(currentData.gps_latitude, currentData.gps_longitude);
    console.log(' DOM elements updated');

    // Move to next data point
    this.currentIndex = (this.currentIndex + 1) % this.csvData.length;
  }

  updateInitialState() {
    // Show initial state with zeros when no data is available
    console.log('📊 Showing initial state with zeros');
    
    // Update all dashboard elements with zeros
    this.updateElement('avgSpeed', '0');
    this.updateElement('remainingTime', '35:00');
    this.updateElement('distanceCovered', '0');
    this.updateElement('consumption', '0');
    this.updateElement('voltage', '0');
    this.updateElement('current', '0');
    this.updateElement('power', '0');
    this.updateElement('totalEnergy', '0');
    this.updateElement('efficiency', '0');
    this.updateElement('gpsLongitude', '0.000000');
    this.updateElement('gpsLatitude', '0.000000');
    
    // Update main dashboard
    this.updateElement('mainSpeed', '0');
    this.updateElement('mainEfficiency', '0');
    this.updateElement('mainTimer', '00:00');
    this.updateElement('lapCounter', '0/4');
  }

  updateSimulatedTelemetry() {
    // Fallback simulation when CSV data is not available
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.startTime;

    const speed = this.generateSpeed();
    const avgSpeed = this.calculateAverageSpeed(speed);
    const time = this.formatTime(elapsedTime);
    const laps = this.calculateLaps();
    const volts = this.generateVoltage();
    const current = this.generateCurrent(speed);
    // Generate simulated GPS coordinates
    const simulatedLat = 25.4885 + (Math.sin(elapsedTime / 10000) * 0.01);
    const simulatedLon = 51.4503 + (Math.cos(elapsedTime / 10000) * 0.01);
    
    const location = this.getLocationFromGPS(simulatedLat, simulatedLon);
    const efficiency = this.calculateEfficiency(speed, current);
    const consumption = this.calculateConsumption(current, volts);

    this.storeDataForGraphs(volts, current, efficiency, consumption);

    this.updateElement('speed', Math.round(speed));
    this.updateElement('avgSpeed', Math.round(avgSpeed));
    this.updateElement('raceTime', time);
    this.updateElement('laps', laps);
    this.updateElement('lapCounter', `${laps}/4`); // Update header lap counter
    this.updateElement('volts', volts.toFixed(1));
    this.updateElement('current', current.toFixed(1));
    this.updateElement('location', location);
    this.updateElement('efficiency', Math.round(efficiency));
    this.updateElement('consumption', consumption.toFixed(1));
    
    // Update GPS coordinates and map
    this.updateElement('latitude', simulatedLat.toFixed(6));
    this.updateElement('longitude', simulatedLon.toFixed(6));
    if (window.leafletMapsTracker) {
      window.leafletMapsTracker.updatePosition(simulatedLat, simulatedLon);
    }
    
    const efficiencyBar = document.getElementById('efficiencyBar');
    if (efficiencyBar) {
      efficiencyBar.style.width = efficiency + '%';
    }
  }

  storeDataForGraphs(volts, current, efficiency, consumption) {
    // Store data points for graphs
    this.dataHistory.volts.push(volts);
    this.dataHistory.current.push(current);
    this.dataHistory.efficiency.push(efficiency);
    this.dataHistory.consumption.push(consumption);
    
    // Keep only the last maxDataPoints
    Object.keys(this.dataHistory).forEach(key => {
      if (this.dataHistory[key].length > this.maxDataPoints) {
        this.dataHistory[key].shift();
      }
    });
  }

  // Calculation methods
  calculateLapConsumption(energyLap, distance) {
    const lapDistance = distance - this.lapStartDistance;
    return lapDistance > 0 ? energyLap / lapDistance : 0;
  }
  
  calculateLapTime(lap, timestamp) {
    if (lap !== this.currentLap) {
      this.currentLap = lap;
      this.lapStartTime = timestamp;
    }
    
    if (this.lapStartTime && timestamp > this.lapStartTime) {
      const lapSeconds = timestamp - this.lapStartTime;
      const minutes = Math.floor(lapSeconds / 60);
      const seconds = Math.floor(lapSeconds % 60);
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return '00:00';
  }
  
  calculateRemainingTimeFromTimestamp(timestamp) {
    if (!this.raceStartTime) return '35:00';
    
    const elapsedSeconds = timestamp - this.raceStartTime;
    const remainingSeconds = Math.max(0, this.targetRaceTime - elapsedSeconds);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
    updateLapTracking(lap, distance, energyTotalWh, timestamp) {
        if (lap !== this.currentLap) {
            this.currentLap = lap;
            this.lapStartDistance = distance;
            this.lapStartEnergy = energyTotalWh;
      this.lapStartTime = timestamp;
    }
  }

  formatRaceTime(timestamp) {
    if (!this.raceStartTime) return '00:00';
    
    const elapsedSeconds = timestamp - this.raceStartTime;
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = Math.floor(elapsedSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getLocationFromGPS(lat, lon) {
    // Simple location mapping based on GPS coordinates
    // You can enhance this with actual track mapping
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    if (latitude >= 25.4884 && latitude <= 25.4885) {
      if (longitude >= 51.4503) return 'Start/Finish Line';
      if (longitude >= 51.4502) return 'Turn 1';
      if (longitude >= 51.4501) return 'Turn 2';
      return 'Turn 3';
    }
    
    return 'Track Section';
  }

  // Graph methods removed - now using flip effect with placeholder

  generateSpeed() {
    // Simulate realistic speed variations
    const baseSpeed = 180 + Math.sin(Date.now() / 10000) * 40;
    const variation = (Math.random() - 0.5) * 20;
    return Math.max(0, baseSpeed + variation);
  }

  calculateAverageSpeed(currentSpeed) {
    this.speedHistory.push(currentSpeed);
    if (this.speedHistory.length > 100) {
      this.speedHistory.shift();
    }
    return this.speedHistory.reduce((sum, speed) => sum + speed, 0) / this.speedHistory.length;
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  calculateLaps() {
    this.totalDistance += this.generateSpeed() * 0.1 / 3600; // Convert to km
    const trackLength = 4.5; // km
    this.lapCount = Math.floor(this.totalDistance / trackLength);
    return this.lapCount;
  }

  generateVoltage() {
    // Simulate battery voltage decreasing over time
    const baseVoltage = 48.0;
    const discharge = (Date.now() - this.startTime) / 1000000; // Gradual discharge
    return Math.max(42.0, baseVoltage - discharge);
  }

  generateCurrent(speed) {
    // Higher speed = higher current draw
    const baseCurrent = 50 + (speed / 200) * 100;
    const variation = (Math.random() - 0.5) * 20;
    return Math.max(0, baseCurrent + variation);
  }

  updateLocation() {
    // Change location every few seconds
    if (Math.random() < 0.01) {
      this.currentLocationIndex = (this.currentLocationIndex + 1) % this.locations.length;
    }
    return this.locations[this.currentLocationIndex];
  }

  calculateEfficiency(speed, current) {
    // Efficiency based on speed vs current ratio
    const optimalSpeed = 200;
    const speedFactor = Math.max(0, 1 - Math.abs(speed - optimalSpeed) / optimalSpeed);
    const currentFactor = Math.max(0, 1 - (current - 50) / 100);
    return Math.min(100, (speedFactor + currentFactor) * 50);
  }

  calculateConsumption(current, voltage) {
    const power = current * voltage; // Watts
    const speed = this.generateSpeed(); // km/h
    return speed > 0 ? power / speed : 0; // Wh/km
  }

  // Update methods for different sections
  updateVehiclePerformance(speed, avgSpeed, distance, lapDistance, lap) {
    // Calculate elapsed time from race start
    const elapsedTime = this.raceStartTime ? (this.csvData[this.currentIndex].obc_timestamp - this.raceStartTime) : 0;
    const remainingTime = this.calculateRemainingTime(elapsedTime);
    this.updateCombinedTelemetryCard(speed, avgSpeed, distance, lap, elapsedTime, remainingTime);
    
    // Update the prominent lap counter in header
    this.updateElement('lapCounter', `${lap}/4`);
  }
  
  updateCombinedTelemetryCard(speed, avgSpeed, distance, lap, elapsedTime, remainingTime) {
    // Update Average Speed
    this.updateElement('avgSpeed', avgSpeed.toFixed(1));
    this.updateAvgSpeedIndicator(avgSpeed);
    
    // Update Remaining Time
    this.updateElement('remainingTime', remainingTime);
    this.updateRemainingTimeIndicator(remainingTime, lap);
    
        // Update Distance Covered
        this.updateElement('distanceCovered', distance.toFixed(2));
        this.updateDistanceIndicator(distance);
        
        // Update Overall Status Indicator
        this.updateOverallStatusIndicator(avgSpeed, remainingTime, lap, distance);
  }
  
  updateAvgSpeedIndicator(avgSpeed) {
    const indicator = document.getElementById('avgSpeedIndicator');
    if (indicator) {
      if (avgSpeed >= 60) {
        indicator.className = 'status-indicator good';
      } else if (avgSpeed >= 45) {
        indicator.className = 'status-indicator warning';
      } else {
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateRemainingTimeIndicator(remainingTimeString, lap) {
    const indicator = document.getElementById('remainingTimeIndicator');
    if (indicator) {
      // Parse the MM:SS format to get total seconds
      const [minutes, seconds] = remainingTimeString.split(':').map(Number);
      const remainingSeconds = minutes * 60 + seconds;
      const remainingMinutes = remainingSeconds / 60;
      
      const lapsRemaining = Math.max(1, 4 - lap);
      const timePerLapNeeded = remainingMinutes / lapsRemaining;
      
      if (timePerLapNeeded >= 8) { // Good - plenty of time
        indicator.className = 'status-indicator good';
      } else if (timePerLapNeeded >= 6) { // Warning - tight but manageable
        indicator.className = 'status-indicator warning';
      } else { // Danger - not enough time
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateDistanceIndicator(distance) {
    const indicator = document.getElementById('distanceIndicator');
    if (indicator) {
      const targetDistance = 14.8; // Total race distance
      const progress = (distance / targetDistance) * 100;
      
      if (progress >= 75) { // Good - almost done
        indicator.className = 'status-indicator good';
      } else if (progress >= 50) { // Warning - halfway
        indicator.className = 'status-indicator warning';
      } else { // Danger - early in race
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateAvgLapTimeIndicator(avgLapTime) {
    const indicator = document.getElementById('avgLapTimeIndicator');
    if (indicator) {
      const lapTimeMinutes = avgLapTime / 60;
      
      if (lapTimeMinutes <= 7) { // Good - fast laps
        indicator.className = 'status-indicator good';
      } else if (lapTimeMinutes <= 9) { // Warning - average pace
        indicator.className = 'status-indicator warning';
      } else { // Danger - slow laps
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateOverallStatusIndicator(avgSpeed, remainingTime, lap, distance) {
    const indicator = document.getElementById('overallStatusIndicator');
    if (indicator) {
      // Calculate overall race status
      const remainingMinutes = remainingTime / 60;
      const lapsRemaining = 4 - lap;
      const timePerLapNeeded = remainingMinutes / lapsRemaining;
      const lapTimeMinutes = (remainingTime / lap) / 60;
      
      // Overall assessment
      let status = 'good';
      if (avgSpeed < 45 || timePerLapNeeded < 6 || lapTimeMinutes > 9) {
        status = 'danger';
      } else if (avgSpeed < 60 || timePerLapNeeded < 8 || lapTimeMinutes > 7) {
        status = 'warning';
      }
      
      indicator.className = `status-indicator ${status}`;
    }
  }
  
  calculateAvgLapTime(elapsedTime, lap) {
    if (lap <= 0) return 0;
    return elapsedTime / lap;
  }
  
  formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  calculateElapsedTime() {
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    return (Date.now() - this.startTime) / 1000;
  }
  
  calculateRemainingTime(elapsedTime) {
    const totalTime = 35 * 60; // 35 minutes in seconds
    const remainingSeconds = Math.max(0, totalTime - elapsedTime);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = Math.floor(remainingSeconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
    updateElectricalSystem(volts, current, power, energyTotalWh, energyLap) {
        // Update Voltage (V) → jm3_voltage / 1000
        this.updateElementWithColor('voltage', volts.toFixed(1), this.getVoltageColor(volts));
        
        // Update Current (A) → jm3_current / 1000
        this.updateElementWithColor('current', current.toFixed(1), this.getCurrentColor(current));
        
        // Update Power (W) → (V × A)
        this.updateElementWithColor('power', Math.round(power), this.getPowerColor(power));
        
        // Update Total Energy Used (Wh) → jm3_netjoule / 3600
        this.updateElementWithColor('totalEnergy', energyTotalWh.toFixed(0), this.getEnergyColor(energyTotalWh));
        
        // Update Lap Energy (Wh) → lap_jm3_netjoule / 3600
        this.updateElementWithColor('lapEnergy', energyLap.toFixed(0), this.getEnergyColor(energyLap));
    }
  
  updateVoltageIndicator(volts) {
    const indicator = document.getElementById('voltageIndicator');
    if (indicator) {
      if (volts >= 45 && volts <= 55) { // Good voltage range
        indicator.className = 'status-indicator good';
      } else if (volts >= 40 && volts <= 60) { // Warning range
        indicator.className = 'status-indicator warning';
      } else { // Danger - too low or too high
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateCurrentIndicator(current) {
    const indicator = document.getElementById('currentIndicator');
    if (indicator) {
      if (current >= 5 && current <= 25) { // Good current range
        indicator.className = 'status-indicator good';
      } else if (current >= 2 && current <= 30) { // Warning range
        indicator.className = 'status-indicator warning';
      } else { // Danger - too low or too high
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updatePowerIndicator(power) {
    const indicator = document.getElementById('powerIndicator');
    if (indicator) {
      if (power >= 200 && power <= 1200) { // Good power range
        indicator.className = 'status-indicator good';
      } else if (power >= 100 && power <= 1500) { // Warning range
        indicator.className = 'status-indicator warning';
      } else { // Danger - too low or too high
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateTotalEnergyIndicator(energyTotalWh) {
    const indicator = document.getElementById('totalEnergyIndicator');
    if (indicator) {
      const maxEnergy = 2000; // Maximum allowed energy in Wh
      const energyPercent = (energyTotalWh / maxEnergy) * 100;
      
      if (energyPercent <= 60) { // Good - plenty of energy left
        indicator.className = 'status-indicator good';
      } else if (energyPercent <= 80) { // Warning - getting low
        indicator.className = 'status-indicator warning';
      } else { // Danger - very low energy
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateLapEnergyIndicator(energyLap) {
    const indicator = document.getElementById('lapEnergyIndicator');
    if (indicator) {
      const targetLapEnergy = 500; // Target energy per lap in Wh
      
      if (energyLap <= targetLapEnergy * 0.8) { // Good - efficient lap
        indicator.className = 'status-indicator good';
      } else if (energyLap <= targetLapEnergy * 1.2) { // Warning - average efficiency
        indicator.className = 'status-indicator warning';
      } else { // Danger - inefficient lap
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateElectricalStatusIndicator(volts, current, energyTotalWh, energyLap) {
    const indicator = document.getElementById('electricalStatusIndicator');
    if (indicator) {
      // Calculate overall electrical health
      let status = 'good';
      
      // Check voltage
      if (volts < 40 || volts > 60) status = 'danger';
      else if (volts < 45 || volts > 55) status = 'warning';
      
      // Check current
      if (current < 2 || current > 30) status = 'danger';
      else if (current < 5 || current > 25) status = 'warning';
      
      // Check total energy
      const maxEnergy = 2000;
      const energyPercent = (energyTotalWh / maxEnergy) * 100;
      if (energyPercent > 80) status = 'danger';
      else if (energyPercent > 60) status = 'warning';
      
      // Check lap energy efficiency
      const targetLapEnergy = 500;
      if (energyLap > targetLapEnergy * 1.2) status = 'danger';
      else if (energyLap > targetLapEnergy * 1.0) status = 'warning';
      
      indicator.className = `status-indicator ${status}`;
    }
  }
  
  updateElementWithColor(id, value, colorClass) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      element.className = colorClass;
    }
  }
  
  getVoltageColor(volts) {
    if (volts < 42) return 'reading-low';  // Low voltage warning
    if (volts > 60) return 'reading-high';  // High voltage warning
    return 'reading-ok';           // Normal voltage
  }
  
  getCurrentColor(current) {
    if (current < 5) return 'reading-low';  // Low current
    if (current > 30) return 'reading-high'; // High current warning
    return 'reading-ok';           // Normal current
  }
  
    updateEfficiencyMetrics(consumption, efficiency) {
        // Update Consumption (Wh/km) → Total Energy (Wh) ÷ Distance (km)
        this.updateElementWithColor('consumption', consumption.toFixed(0), this.getConsumptionColor(consumption));
    }
  
  updateEfficiencyIndicator(efficiency) {
    const indicator = document.getElementById('efficiencyIndicator');
    if (indicator) {
      if (efficiency >= 45) { // Good efficiency
        indicator.className = 'status-indicator good';
      } else if (efficiency >= 30) { // Warning efficiency
        indicator.className = 'status-indicator warning';
      } else { // Danger - low efficiency
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateConsumptionIndicator(consumption) {
    const indicator = document.getElementById('consumptionIndicator');
    if (indicator) {
      if (consumption <= 200) { // Good - low consumption
        indicator.className = 'status-indicator good';
      } else if (consumption <= 300) { // Warning - moderate consumption
        indicator.className = 'status-indicator warning';
      } else { // Danger - high consumption
        indicator.className = 'status-indicator danger';
      }
    }
  }
  
  updateEfficiencyStatusIndicator(efficiency, consumption) {
    const indicator = document.getElementById('efficiencyStatusIndicator');
    if (indicator) {
      let status = 'good';
      
      // Check efficiency
      if (efficiency < 30) status = 'danger';
      else if (efficiency < 45) status = 'warning';
      
      // Check consumption
      if (consumption > 300) status = 'danger';
      else if (consumption > 200) status = 'warning';
      
      indicator.className = `status-indicator ${status}`;
    }
  }
  
  updateGPSDisplay(latitude, longitude) {
    // Update GPS longitude display as simple number
    this.updateElement('gpsLongitude', parseFloat(longitude).toFixed(6));
    
    // Update GPS latitude display as simple number
    this.updateElement('gpsLatitude', parseFloat(latitude).toFixed(6));
  }
  
  updateTimingStatus(raceTime, lapTime, remainingTime, remainingDistance) {
    this.updateElement('raceTime', raceTime);
    this.updateElement('lapTime', lapTime);
    this.updateElement('remainingTime', remainingTime);
    this.updateElement('remainingDistance', remainingDistance.toFixed(1));
  }
  
    updateAlerts(volts, current, energyTotalWh) {
    // Voltage alert
    const voltageAlert = document.getElementById('voltageAlert');
    if (volts < this.voltageThreshold) {
      voltageAlert.className = 'alert-item danger';
      voltageAlert.querySelector('.alert-text').textContent = `LOW VOLTAGE: ${volts.toFixed(1)}V`;
    } else {
      voltageAlert.className = 'alert-item';
      voltageAlert.querySelector('.alert-text').textContent = `Voltage OK: ${volts.toFixed(1)}V`;
    }
    
    // Current alert
    const currentAlert = document.getElementById('currentAlert');
    if (current > this.currentThreshold) {
      currentAlert.className = 'alert-item warning';
      currentAlert.querySelector('.alert-text').textContent = `HIGH CURRENT: ${current.toFixed(1)}A`;
    } else {
      currentAlert.className = 'alert-item';
      currentAlert.querySelector('.alert-text').textContent = `Current OK: ${current.toFixed(1)}A`;
    }
    
    // Energy alert
    const energyAlert = document.getElementById('energyAlert');
    const energyRemaining = this.energyBudget - energyTotalWh;
    if (energyRemaining < 200) {
      energyAlert.className = 'alert-item danger';
      energyAlert.querySelector('.alert-text').textContent = `LOW ENERGY: ${energyRemaining.toFixed(0)}Wh left`;
    } else if (energyRemaining < 500) {
      energyAlert.className = 'alert-item warning';
      energyAlert.querySelector('.alert-text').textContent = `Energy: ${energyRemaining.toFixed(0)}Wh left`;
    } else {
      energyAlert.className = 'alert-item';
      energyAlert.querySelector('.alert-text').textContent = `Energy OK: ${energyRemaining.toFixed(0)}Wh left`;
    }
  }
  
  updateLocation(lat, lon) {
    // Parse GPS coordinates properly
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    // Only update if coordinates are valid
    if (isNaN(latitude) || isNaN(longitude) || latitude === 0 || longitude === 0) {
      console.log(' Invalid GPS coordinates:', { lat, lon });
      return;
    }
    
    console.log(`📍 Updating location: ${latitude}, ${longitude}`);
    
    const location = this.getLocationFromGPS(latitude, longitude);
    this.updateElement('location', location);
    
    // Update GPS coordinates display
    this.updateElement('latitude', latitude.toFixed(6));
    this.updateElement('longitude', longitude.toFixed(6));
    
    // Update 2D Track Visualizer with new position
    if (window.trackVisualizer) {
      console.log(` Updating 2D Track Visualizer: ${latitude}, ${longitude}`);
      window.trackVisualizer.updatePosition(latitude, longitude);
    } else {
      console.log(' 2D Track Visualizer not available yet');
    }
  }

  // Update main data section with color coding
  updateMainDataSection(speed, avgSpeed, efficiency, timestamp) {
    // Update timer with progress bar
    const elapsedMinutes = (timestamp - this.raceStartTime) / 60;
    const totalMinutes = 35; // 35 minute race limit
    const progressPercent = Math.min((elapsedMinutes / totalMinutes) * 100, 100);
    
    this.updateElement('mainTimer', this.formatRaceTime(timestamp));
    this.updateTimerProgress(progressPercent);
    this.updateTimerColor(progressPercent);
    
    // Update speed with color coding
    this.updateElement('mainSpeed', Math.round(speed));
    this.updateSpeedColor(speed, avgSpeed);
    
    // Update efficiency with color coding
    this.updateElement('mainEfficiency', efficiency.toFixed(1));
    this.updateEfficiencyColor(efficiency);
  }
  
  updateTimerProgress(percent) {
    // Timer progress removed - keeping simple timer display
  }
  
  updateTimerColor(progressPercent) {
    const timerElement = document.getElementById('mainTimer');
    if (timerElement) {
      timerElement.className = 'main-data-value';
      if (progressPercent < 33) {
        timerElement.classList.add('timer-green');
      } else if (progressPercent < 66) {
        timerElement.classList.add('timer-yellow');
      } else {
        timerElement.classList.add('timer-red');
      }
    }
  }
  
  updateSpeedColor(speed, avgSpeed) {
    const speedElement = document.getElementById('mainSpeed');
    if (speedElement) {
      speedElement.className = 'main-data-value';
      const speedDiff = Math.abs(speed - avgSpeed);
      const tolerance = avgSpeed * 0.1; // 10% tolerance
      
      if (speedDiff <= tolerance) {
        speedElement.classList.add('speed-green'); // Around average speed
      } else if (speed > avgSpeed) {
        speedElement.classList.add('speed-red'); // Higher than average
      } else {
        speedElement.classList.add('speed-yellow'); // Slower than average
      }
    }
  }
  
  updateEfficiencyColor(efficiency) {
    const efficiencyElement = document.getElementById('mainEfficiency');
    if (efficiencyElement) {
      efficiencyElement.className = 'main-data-value';
      if (efficiency < 40) {
        efficiencyElement.classList.add('efficiency-red');
      } else if (efficiency < 55) {
        efficiencyElement.classList.add('efficiency-yellow');
      } else {
        efficiencyElement.classList.add('efficiency-green');
      }
    }
  }

  // Color coding methods for metric values
  getVoltageColor(volts) {
    if (volts < 42) return 'metric-low';  // Low voltage warning
    if (volts > 60) return 'metric-high';  // High voltage warning
    return 'metric-good';          // Good voltage range
  }
  
  getCurrentColor(current) {
    if (current < 2) return 'metric-low';  // Low current
    if (current > 30) return 'metric-high'; // High current warning
    return 'metric-good';          // Good current range
  }
  
  getPowerColor(power) {
    if (power < 100) return 'metric-low';  // Low power
    if (power > 1500) return 'metric-high'; // High power warning
    return 'metric-good';          // Good power range
  }
  
  getEnergyColor(energy) {
    if (energy < 100) return 'metric-low'; // Low energy usage
    if (energy > 1500) return 'metric-high'; // High energy usage
    return 'metric-good';          // Good energy range
  }
  
  getConsumptionColor(consumption) {
    if (consumption < 200) return 'metric-good'; // Good consumption
    if (consumption < 300) return 'metric-warning'; // Warning consumption
    return 'metric-high';             // High consumption
  }
  
  getEfficiencyColor(efficiency) {
    if (efficiency >= 45) return 'metric-good';     // Good efficiency
    if (efficiency >= 30) return 'metric-warning';  // Warning efficiency
    return 'metric-high';                            // Low efficiency
  }
  
  updateElementWithColor(id, value, colorClass) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      element.className = `metric-value ${colorClass}`;
      console.log(` Updated element ${id} with value: ${value} (${colorClass})`);
    } else {
      console.error(` Element with id '${id}' not found!`);
    }
  }
  
    updateConsumption(consumption) {
        // This method is called but consumption is already updated in updateCombinedTelemetryCard
        // Keeping it for consistency
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`Updated element ${id} with value: ${value}`);
        } else {
            console.error(`Element with id '${id}' not found!`);
        }
    }
}


// F1-Style Telemetry Graphs using Plotly.js
class F1TelemetryGraphs {
  constructor() {
    this.data = null;
    this.lapFilter = 'all';
    this.initializeGraphs();
    this.setupEventListeners();
  }

  initializeGraphs() {
    // Create placeholder graphs
    this.createPlaceholderGraphs();
  }

  setupEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('refreshGraphsBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refreshGraphs();
      });
    }

    // Lap filter
    const lapFilter = document.getElementById('lapFilter');
    if (lapFilter) {
      lapFilter.addEventListener('change', (e) => {
        this.lapFilter = e.target.value;
        this.updateGraphs();
      });
    }
  }

  createPlaceholderGraphs() {
    const darkLayout = {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white', family: 'Arial, sans-serif' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: true,
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: 'white' } }
    };

    // Current Heat Map placeholder
    Plotly.newPlot('currentHeatMap', [{
      x: [], y: [], mode: 'markers', name: 'Current',
      marker: { 
        color: [], 
        colorscale: 'Hot',
        size: 8,
        opacity: 0.8,
        colorbar: {
          title: 'Current (mA)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      }
    }], {
      ...darkLayout,
      title: { text: 'Current Consumption Heat Map', font: { color: '#00ccff' } },
      xaxis: { title: 'Longitude', gridcolor: '#333' },
      yaxis: { title: 'Latitude', gridcolor: '#333' }
    });

    // Net Energy Heat Map placeholder
    Plotly.newPlot('energyHeatMap', [{
      x: [], y: [], mode: 'markers', name: 'Net Energy',
      marker: { 
        color: [], 
        colorscale: 'Viridis',
        size: 8,
        opacity: 0.8,
        colorbar: {
          title: 'Net Energy (J)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      }
    }], {
      ...darkLayout,
      title: { text: 'Net Energy Consumption Heat Map', font: { color: '#ff4444' } },
      xaxis: { title: 'Longitude', gridcolor: '#333' },
      yaxis: { title: 'Latitude', gridcolor: '#333' }
    });

    // Speed Graph placeholder
    Plotly.newPlot('speedGraph', [{
      x: [], y: [], mode: 'lines', name: 'Speed',
      line: { color: '#00ff00', width: 2 }
    }], {
      ...darkLayout,
      title: { text: 'Speed vs Distance', font: { color: '#00ff00' } },
      xaxis: { title: 'Distance (km)', gridcolor: '#333' },
      yaxis: { title: 'Speed (km/h)', gridcolor: '#333' }
    });

    // Current Graph placeholder
    Plotly.newPlot('currentGraph', [{
      x: [], y: [], mode: 'lines', name: 'Current',
      line: { color: '#00ccff', width: 2 }
    }], {
      ...darkLayout,
      title: { text: 'Current vs Distance', font: { color: '#00ccff' } },
      xaxis: { title: 'Distance (km)', gridcolor: '#333' },
      yaxis: { title: 'Current (mA)', gridcolor: '#333' }
    });

    // Power Graph placeholder
    Plotly.newPlot('powerGraph', [{
      x: [], y: [], mode: 'lines', name: 'Power',
      line: { color: '#ffd700', width: 2 }
    }], {
      ...darkLayout,
      title: { text: 'Power vs Distance', font: { color: '#ffd700' } },
      xaxis: { title: 'Distance (km)', gridcolor: '#333' },
      yaxis: { title: 'Power (W)', gridcolor: '#333' }
    });


    // Acceleration Scatter placeholder
    Plotly.newPlot('accelerationGraph', [{
      x: [], y: [], mode: 'markers', name: 'Acceleration',
      marker: { color: '#cc00ff', size: 6 }
    }], {
      ...darkLayout,
      title: { text: 'Acceleration vs Speed', font: { color: '#cc00ff' } },
      xaxis: { title: 'Speed (km/h)', gridcolor: '#333' },
      yaxis: { title: 'Acceleration (m/s²)', gridcolor: '#333' }
    });
  }

  setData(csvData) {
    this.data = csvData;
    this.processData();
    this.updateGraphs();
  }

  processData() {
    if (!this.data) return;

    // Calculate power for each data point
    this.data.forEach(row => {
      row.power = (row.jm3_voltage * row.jm3_current) / 1000000; // Convert to watts
    });

    // Calculate moving average acceleration
    const windowSize = 50;
    for (let i = windowSize; i < this.data.length; i++) {
      const prevRow = this.data[i - windowSize];
      const currentRow = this.data[i];
      const timeDiff = currentRow.obc_timestamp - prevRow.obc_timestamp;
      if (timeDiff > 0) {
        currentRow.acceleration = (currentRow.gps_speed - prevRow.gps_speed) / timeDiff;
      } else {
        currentRow.acceleration = 0;
      }
    }
  }

  refreshGraphs() {
    if (window.racingDashboard && window.racingDashboard.csvData) {
      this.setData(window.racingDashboard.csvData);
    }
  }

  resizeGraphs() {
    // Resize all Plotly graphs when view changes
    const graphIds = ['currentHeatMap', 'energyHeatMap', 'speedGraph', 'currentGraph', 'powerGraph', 'accelerationGraph'];
    
    graphIds.forEach(graphId => {
      const element = document.getElementById(graphId);
      if (element && Plotly) {
        Plotly.Plots.resize(element);
      }
    });
  }

  filterDataByLap(data) {
    if (this.lapFilter === 'all') {
      return data;
    }
    return data.filter(row => row.lap_lap == this.lapFilter);
  }

  updateGraphs() {
    if (!this.data) return;

    const filteredData = this.filterDataByLap(this.data);
    
    this.updateCurrentHeatMap(filteredData);
    this.updateEnergyHeatMap(filteredData);
    this.updateSpeedGraph(filteredData);
    this.updateCurrentGraph(filteredData);
    this.updatePowerGraph(filteredData);
    this.updateAccelerationGraph(filteredData);
  }

  updateCurrentHeatMap(data) {
    const gpsData = data.filter(row => 
      row.gps_latitude && 
      row.gps_longitude && 
      row.jm3_current != null
    );
    if (gpsData.length === 0) return;

    const trace = {
      x: gpsData.map(row => row.gps_longitude),
      y: gpsData.map(row => row.gps_latitude),
      mode: 'markers',
      name: 'Current Consumption',
      marker: { 
        color: gpsData.map(row => parseFloat(row.jm3_current || 0)),
        colorscale: 'Hot',
        size: 8,
        opacity: 0.8,
        colorbar: {
          title: 'Current (mA)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      },
      text: gpsData.map(row => 
        `Lap: ${parseInt(row.lap_lap) + 1}<br>` +
        `Current: ${parseFloat(row.jm3_current || 0).toFixed(1)} mA<br>` +
        `Distance: ${row.lap_dist ? parseFloat(row.lap_dist).toFixed(2) : 'N/A'} km`
      ),
      hovertemplate: '%{text}<extra></extra>'
    };

    Plotly.react('currentHeatMap', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Current Consumption Heat Map', font: { color: '#00ccff' } },
      xaxis: { title: 'Longitude', gridcolor: '#333' },
      yaxis: { title: 'Latitude', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }

  updateEnergyHeatMap(data) {
    const gpsData = data.filter(row => 
      row.gps_latitude && 
      row.gps_longitude && 
      row.jm3_netjoule != null
    );
    if (gpsData.length === 0) return;

    const trace = {
      x: gpsData.map(row => row.gps_longitude),
      y: gpsData.map(row => row.gps_latitude),
      mode: 'markers',
      name: 'Net Energy Consumption',
      marker: { 
        color: gpsData.map(row => parseFloat(row.jm3_netjoule || 0)),
        colorscale: 'Viridis',
        size: 8,
        opacity: 0.8,
        colorbar: {
          title: 'Net Energy (J)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      },
      text: gpsData.map(row => 
        `Lap: ${parseInt(row.lap_lap) + 1}<br>` +
        `Net Energy: ${parseFloat(row.jm3_netjoule || 0).toFixed(1)} J<br>` +
        `Distance: ${row.lap_dist ? parseFloat(row.lap_dist).toFixed(2) : 'N/A'} km`
      ),
      hovertemplate: '%{text}<extra></extra>'
    };

    Plotly.react('energyHeatMap', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Net Energy Consumption Heat Map', font: { color: '#ff4444' } },
      xaxis: { title: 'Longitude', gridcolor: '#333' },
      yaxis: { title: 'Latitude', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }
  updateSpeedGraph(data) {
    // Filter out invalid data
    const speedData = data.filter(row => row.gps_speed != null && row.obc_timestamp != null);
    if (speedData.length === 0) return;
  
    const lapColors = ['#00ff00', '#00ccff', '#ffd700', '#ff4444', '#cc00ff', '#ff6b35'];
    const traces = [];
  
    // Use the first timestamp as start time for relative time calculation
    const startTime = speedData[0].obc_timestamp;
  
    // Compute elapsed time (in seconds) for x-axis using data timestamps
    const elapsedTimes = speedData.map(row => row.obc_timestamp - startTime);
  
    if (this.lapFilter === 'all') {
      const laps = [...new Set(speedData.map(row => row.lap_lap))].filter(lap => lap != null);
  
      laps.forEach((lap, index) => {
        const lapData = speedData.filter(row => row.lap_lap === lap);
        const lapElapsed = lapData.map(row => row.obc_timestamp - startTime);
        traces.push({
          x: lapElapsed,
          y: lapData.map(row => row.gps_speed),
          mode: 'lines',
          name: `Lap ${parseInt(lap) + 1}`,
          line: { color: lapColors[index % lapColors.length], width: 2 }
        });
      });
    } else {
      traces.push({
        x: elapsedTimes,
        y: speedData.map(row => row.gps_speed),
        mode: 'lines',
        name: `Lap ${parseInt(this.lapFilter) + 1}`,
        line: { color: '#00ff00', width: 2 }
      });
    }
  
    Plotly.react('speedGraph', traces, {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Speed vs Time', font: { color: '#00ff00' } },
      xaxis: { title: 'Time (s)', gridcolor: '#333' },
      yaxis: { title: 'Speed (km/h)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: true,
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: 'white' } }
    });
  }
  

  updateCurrentGraph(data) {
    const currentData = data.filter(row => row.lap_dist != null && row.jm3_current != null);
    if (currentData.length === 0) return;

    const lapColors = ['#00ccff', '#ffd700', '#ff4444', '#cc00ff', '#ff6b35', '#00ff00'];
    const traces = [];

    if (this.lapFilter === 'all') {
      const laps = [...new Set(currentData.map(row => row.lap_lap))].filter(lap => lap != null);
      
      laps.forEach((lap, index) => {
        const lapData = currentData.filter(row => row.lap_lap === lap);
        traces.push({
          x: lapData.map(row => row.lap_dist),
          y: lapData.map(row => row.jm3_current),
          mode: 'lines',
          name: `Lap ${parseInt(lap) + 1}`,
          line: { color: lapColors[index % lapColors.length], width: 2 }
        });
      });
    } else {
      traces.push({
        x: currentData.map(row => row.lap_dist),
        y: currentData.map(row => row.jm3_current),
        mode: 'lines',
        name: `Lap ${parseInt(this.lapFilter) + 1}`,
        line: { color: '#00ccff', width: 2 }
      });
    }

    Plotly.react('currentGraph', traces, {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Current vs Distance', font: { color: '#00ccff' } },
      xaxis: { title: 'Distance (km)', gridcolor: '#333' },
      yaxis: { title: 'Current (mA)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: true,
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: 'white' } }
    });
  }

  updatePowerGraph(data) {
    const powerData = data.filter(row => row.lap_dist != null && row.power != null);
    if (powerData.length === 0) return;

    const lapColors = ['#ffd700', '#ff4444', '#cc00ff', '#ff6b35', '#00ff00', '#00ccff'];
    const traces = [];

    if (this.lapFilter === 'all') {
      const laps = [...new Set(powerData.map(row => row.lap_lap))].filter(lap => lap != null);
      
      laps.forEach((lap, index) => {
        const lapData = powerData.filter(row => row.lap_lap === lap);
        traces.push({
          x: lapData.map(row => row.lap_dist),
          y: lapData.map(row => row.power),
          mode: 'lines',
          name: `Lap ${parseInt(lap) + 1}`,
          line: { color: lapColors[index % lapColors.length], width: 2 }
        });
      });
    } else {
      traces.push({
        x: powerData.map(row => row.lap_dist),
        y: powerData.map(row => row.power),
        mode: 'lines',
        name: `Lap ${parseInt(this.lapFilter) + 1}`,
        line: { color: '#ffd700', width: 2 }
      });
    }

    Plotly.react('powerGraph', traces, {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Power vs Distance', font: { color: '#ffd700' } },
      xaxis: { title: 'Distance (km)', gridcolor: '#333' },
      yaxis: { title: 'Power (W)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: true,
      legend: { bgcolor: 'rgba(0,0,0,0)', font: { color: 'white' } }
    });
  }


  updateAccelerationGraph(data) {
    const accelData = data.filter(row => 
      row.gps_speed != null && 
      row.acceleration != null && 
      !isNaN(row.acceleration) &&
      Math.abs(row.acceleration) < 10 // Filter out unrealistic values
    );
    
    if (accelData.length === 0) return;

    const trace = {
      x: accelData.map(row => row.gps_speed),
      y: accelData.map(row => row.acceleration),
      mode: 'markers',
      name: 'Acceleration vs Speed',
      marker: { 
        color: accelData.map(row => row.power || 0),
        colorscale: 'Hot',
        size: 6,
        opacity: 0.7,
        colorbar: {
          title: 'Power (W)',
          titlefont: { color: 'white' },
          tickfont: { color: 'white' }
        }
      }
    };

    Plotly.react('accelerationGraph', [trace], {
      paper_bgcolor: '#0a0a0a',
      plot_bgcolor: '#0a0a0a',
      font: { color: 'white' },
      title: { text: 'Acceleration vs Speed (Colored by Power)', font: { color: '#cc00ff' } },
      xaxis: { title: 'Speed (km/h)', gridcolor: '#333' },
      yaxis: { title: 'Acceleration (m/s²)', gridcolor: '#333' },
      margin: { t: 40, r: 40, b: 60, l: 60 },
      showlegend: false
    });
  }
}

