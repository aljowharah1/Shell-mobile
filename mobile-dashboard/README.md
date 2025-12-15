# Mobile Racing Dashboard - Quick Start Guide

## 🚀 How to Run

### Method 1: Direct Browser Open (Simplest)
```powershell
cd c:\Users\Juju\Desktop\shell\dashboardPSU_ECOteam\mobile-dashboard
start index.html
```

### Method 2: With Local Server (If Available)
```powershell
# If you have Python installed:
cd mobile-dashboard
python -m http.server 8000
# Then open: http://localhost:8000

# Or use the existing server:
cd ..
python server.py
# Then open: http://localhost:8000/mobile-dashboard/
```

---

## 📱 Testing in Mobile View

1. Open dashboard in browser
2. Press **F12** (Developer Tools)
3. Press **Ctrl+Shift+M** (Toggle Device Toolbar)
4. Select **iPhone 12 Pro** or **Samsung Galaxy S20**
5. Click **rotate icon** 🔄 for landscape mode
6. Enjoy! 🏁

---

## ✨ Features Overview

| Component | Description | Status |
|-----------|-------------|--------|
| **Speedometer** | Circular gauge with 3D car, 0-200 km/h | ✅ Working |
| **Track Map** | Lusail Short Circuit with car marker | ✅ Working |
| **Turn Instructions** | Auto-display near waypoints | ✅ Working |
| **Battery Indicator** | Voltage-based % with color coding | ✅ Working |
| **Energy Panel** | Charging, Average, AC consumption | ✅ Working |
| **MQTT Connection** | Real-time telemetry updates | ✅ Configured |
| **Pure Black Theme** | Racing-optimized dark background | ✅ Applied |

---

## 🔧 Key Files

- **index.html** - Dashboard structure
- **style.css** - Visual design (pure black theme)
- **script.js** - MQTT integration & data processing

---

## 🎯 What to Check

- [ ] Background is pure black (#000000)
- [ ] Speedometer shows 3D car in center
- [ ] Track map displays Lusail circuit outline
- [ ] Battery shows 60% with green color
- [ ] Energy bars are visible with gradients
- [ ] Turn instruction banner appears
- [ ] All text is readable

---

## 💡 Tips

- **No MQTT data?** Uncomment simulation in script.js (line 354)
- **Map not loading?** Check internet connection
- **Animations laggy?** Close other browser tabs

---

**Dashboard Ready for Racing! 🏎️💨**
