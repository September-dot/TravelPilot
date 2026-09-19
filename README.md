# ✈️ TravelPilot — Algorithmic Trip Planner & Route Optimizer for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet.js-blue.svg)]()
[![Responsive](https://img.shields.io/badge/Design-Mobile%20Friendly-emerald.svg)]()

> A clean, modern, and beginner-friendly web application for planning trips across India. Features budget-aware itinerary generation, Traveling Salesperson (TSP) route optimization, geodesic distance calculations, interactive OpenStreetMap route visualization, multi-day weather/delay contingency modes, and transit booking links.

---

## 🌟 Technical Highlights & Features

### 1. 🧭 Exact TSP Route Optimization Engine
- **Exact Path Permutation Solver**: For daily tours ($n \le 6$), evaluates all possible stop permutations $\sum_{i=0}^{n-2} \text{dist}(p_i, p_{i+1})$ without arbitrary city-center bias to mathematically determine the shortest travel path.
- **Slot Affinity Constraints**: Preserves optimal visiting times (morning monuments vs. sunset viewpoints and evening cultural shows) while minimizing travel kilometers.
- **Geodesic Distance & Transit Time**: Employs the Haversine formula for exact point-to-point distances with realistic Indian urban/hill traffic driving estimates.

### 2. 💰 Budget-Constrained Itinerary Generation
- **Tiered Cost Optimization**: Calculates target daily budget (`totalBudget / daysCount`) and adjusts scoring:
  - **Budget Tier (< ₹2,500/day)**: Prioritizes free and low-cost public monuments, stepwells, ghat aartis, and local street dining while filtering expensive commercial activities.
  - **Moderate Tier (₹2,500 – ₹6,000/day)**: Balanced mix of heritage tickets, guided tours, and standard cafes.
  - **Luxury Tier (> ₹6,000/day)**: Prioritizes royal high-tea, private boat cruises, and signature cultural performances.
- **Live Reactive Budget Tracker**: Instant budget bar recalculation with real-time balance/deficit tracking.

### 3. 🚨 Multi-Day Disruption & Contingency Engine
- **Proactive Risk Detection**: Proactively flags weather-sensitive open-air sights and excessive transit distances (> 10 km) before disruptions happen.
- **🌧️ Monsoon / Rain Contingency**: Scans all days across the itinerary and replaces outdoor open-air forts, water sports, and treks with indoor royal museums, covered havelis, and culinary workshops.
- **⏱️ Traffic / Flight Delay Mode**: Uses prioritized landmark IDs (`keepIds`) to condense daily itineraries into essential crown jewels with generous time buffers to absorb 2+ hours of travel delay.
- **😴 Low-Energy Wellness Mode**: Replaces high-exertion treks across all days with relaxing palace high-tea, lakeside lounges, and Ayurvedic spa sessions.

### 4. 🗺️ Interactive Route Map (Leaflet.js + OpenStreetMap)
- **Place Labels on Pins**: Every landmark on the map features a high-contrast label displaying sequence (`D1-1`, `D1-2`), place name, and schedule.
- **Midpoint Distance Badges**: Visual indicators along polyline connectors showing calculated segment distances in km and drive times.
- **Navigation Shortcuts**: Direct links to Google Maps directions between consecutive stops.

### 5. 🚖 Transit Hub & Reference Fare Estimates
- **Intercity Booking Links**: Direct booking shortcuts for MakeMyTrip (Flights, Trains, Buses) and Uber Outstation.
- **Reference Fares**: Curated baseline rates for local taxis, auto-rickshaws, and rental scooters.
- **1-Click Transfer Insertion**: Add airport or railway cab pickups directly into the itinerary and running budget.

### 6. 🔒 Code Hygiene & Security
- **HTML Sanitization**: All user-provided text fields (names, notes, custom activities, costs) are sanitized through a robust HTML entity escaper (`escapeHtml`) to prevent injection vulnerabilities.
- **Data-Driven Architecture**: Standardized place attributes (`slotPreference`, `weatherSensitive`, `exertionLevel`, `costTier`) with zero hardcoded city strings in the core optimizer.

---

## 🚀 Live Demo (GitHub Pages)

This repository is hosted live via **GitHub Pages**:
- **Live URL**: **[https://september-dot.github.io/TravelPilot/](https://september-dot.github.io/TravelPilot/)**

---

## 💻 Running Locally

### Start Local Server
```bash
# Clone the repository
git clone https://github.com/September-dot/TravelPilot.git
cd TravelPilot

# Start local preview server
python3 server.py
```
Open **[http://localhost:8085](http://localhost:8085)** in your browser.

---

## 📂 Project Structure

```
travelpilot/
├── index.html                  # Main modular HTML structure with 3 view modes
├── style.css                   # Responsive stylesheet with map & transit designs
├── data.js                     # Curated destinations, coordinates, transit & contingency data
├── app.js                      # Application state engine, Leaflet map logic & TSP route optimizer
├── server.py                   # Lightweight local preview server
├── travelpilot_single_file.html # Self-contained single-file edition (HTML+CSS+JS in one file)
└── README.md                   # Project documentation & technical specifications
```

---

## 📄 License
This project is licensed under the MIT License.
