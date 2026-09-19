# ✈️ TravelPilot — AI Trip Planner for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet.js-blue.svg)]()
[![Responsive](https://img.shields.io/badge/Design-Mobile%20Friendly-emerald.svg)]()

> A clean, modern, and beginner-friendly AI-style trip planner for India featuring dynamic day-by-day itineraries, interactive OpenStreetMap route visualization with live GPS distance badges, transit & cab booking integration, proactive AI delay detection, and automated contingency rerouting.

---

## 🌟 Key Features

### 1. 🤖 AI Delay Detection & Automatic Geographic Rerouting
- **Proactive AI Diagnostics**: Analyzes itinerary routes for high-traffic delay risks (> 10 km commutes), geographic zigzag backtracking, and timing conflicts (e.g. sunset spots placed in morning slots).
- **⚡ AI Auto-Reroute Engine**: Automatically solves optimal route sequencing using a nearest-neighbor TSP algorithm to minimize daily travel kilometers, eliminate delays, and harmonize time slots.
- **Visual AI Health Bar**: Instantly indicates route efficiency with calculated travel time savings.

### 2. 🗺️ Interactive Route Map with Place Markers & Distance Badges (Leaflet.js)
- **Visible Place Labels**: Every landmark displays a permanent, high-contrast label with stop sequence (`D1-1`, `D1-2`), place name, and timing.
- **Midpoint Distance Badges**: Realistic geodesic distance (km) and cab drive time badges along polyline connectors (e.g. `🚗 4.8 km (~16m cab)`).
- **Directions Links**: Interactive popups with direct **Google Maps Navigation** routes.

### 3. 🚗 Live Distance & Transit Connectors in Itinerary
- Between consecutive stops, the itinerary displays real-time travel distance badges and drive estimates.
- 1-click **Get Directions** button opening Google Maps route geometry.

### 4. 🚖 Cabs, Flights & Transit Booking Hub
- **Intercity Travel**: Direct links for Flights (MakeMyTrip), Trains (IRCTC), and Buses (RedBus).
- **Local Transit Rates**: Real-time reference fares for Local Taxis/Sedans, Auto-rickshaws, and Rental Scooters.
- **1-Click Transfers**: Instant buttons to insert Airport/Station cab pickups or Full-Day Tour Taxis directly into the day's schedule and budget.

### 5. 🚨 Dynamic Weather & Delay Contingency Assistant
- **🌧️ Heavy Rain / Monsoon Plan**: Automatically swaps outdoor forts/beaches/treks with indoor royal palaces, havelis, museums, and cooking classes.
- **⏱️ Traffic Delay / Express Plan**: Replaces distant excursions with central city landmarks to preserve your schedule.
- **😴 Relaxed Chill Day**: Replaces intensive treks with relaxing scenic sunset points and cafes.
- **🔄 Reset to Original Plan**: Easily restore the initial plan at any time.

### 6. 💰 Live Interactive Budget Tracker
- Live cost editing that immediately recalculates the running budget.
- Visual financial progress bar with **Within Budget** (Green) and **Over Budget** (Rose) indicators.
- Displays Set Budget, Estimated Spend, Daily Average, and Remaining Balance/Deficit.

### 7. 📋 Export & Sharing
- One-click copy formatted plain-text itinerary for WhatsApp and Notes.
- Clean print stylesheet optimized for PDF exports.
- Auto-saves trip state in browser `localStorage`.

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
├── app.js                      # Application state engine, Leaflet map logic & AI rerouting
├── server.py                   # Lightweight local preview server
├── travelpilot_single_file.html # Self-contained single-file edition (HTML+CSS+JS in one file)
└── README.md                   # Project documentation & setup guide
```

---

## 📄 License
This project is licensed under the MIT License.
