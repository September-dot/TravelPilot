# ✈️ TravelPilot — Algorithmic Trip Planner & AI Route Optimizer for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet.js-blue.svg)]()
[![Responsive](https://img.shields.io/badge/Design-Mobile%20Friendly-emerald.svg)]()
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

> An intelligent, beginner-friendly web application for planning trips across India. Features natural-language AI Co-Pilot adaptation, hybrid Traveling Salesperson (TSP) route optimization, budget-aware itinerary generation, interactive Leaflet.js route maps, multi-day weather/delay contingency modes, and integrated transit booking hubs.

---

## 🌟 Technical Highlights & Core Architecture

### 1. 🧠 AI Co-Pilot: Natural Language Intent Layer
- **Free-Text Scenario Interpreter**: Users can enter plain-English disruption prompts (e.g., *"It's pouring rain and we are exhausted from travel"*, *"Flight delayed by 3 hours, shorten the day"*).
- **Multi-Intent Classification**: Maps natural-language inputs to deterministic adaptations across weather, fatigue, transit delays, and budget re-adjustments.
- **Transparent AI Rationale Display**: Renders an explainability card showing the detected intent and the algorithmic actions applied to the itinerary.

### 2. 🧭 Hybrid TSP Route Optimization Engine
- **Exact Path Permutation Solver ($n \le 7$)**: Evaluates all stop permutations without arbitrary city-center bias to mathematically compute the shortest path.
- **2-Opt Local Search Heuristic ($n > 7$)**: Implements iterative 2-opt edge-exchange refinement for larger stop lists, eliminating the $O(n!)$ combinatorial explosion and guaranteeing zero UI freeze risk.
- **Slot Affinity & Circadian Constraints**: Harmonizes visiting times (morning monuments vs. sunset viewpoints and evening cultural shows) while minimizing travel distance.
- **Geodesic Distance & Transit Metrics**: Uses the Haversine formula for exact point-to-point distances with realistic Indian urban/hill traffic driving estimates.

### 3. 💰 Multi-Tier Budget-Constrained Generation
- **Dynamic Cost Tier Scoring**: Calculates target daily budget (`totalBudget / daysCount`) and shapes itinerary generation:
  - **Budget Tier (< ₹2,500/day)**: Prioritizes free public monuments, stepwells, ghat walks, and authentic street dining while filtering expensive commercial activities.
  - **Moderate Tier (₹2,500 – ₹6,000/day)**: Balances heritage tickets, guided tours, and standard cafes.
  - **Luxury Tier (> ₹6,000/day)**: Boosts royal high-tea, private boat cruises, and signature cultural experiences.
- **Reactive Budget Tracker**: Live budget progress bar with automatic cost categorization and real-time balance/deficit tracking.

### 4. 🚨 Multi-Day Disruption & Contingency Engine
- **Proactive Risk Detection**: Flags open-air venues vulnerable to weather and excessive transit distances (> 10 km) before disruptions occur.
- **🌧️ Monsoon / Rain Contingency**: Scans all days across the itinerary and swaps outdoor open-air forts, water sports, and treks with indoor royal museums, covered havelis, and culinary workshops.
- **⏱️ Traffic / Flight Delay Mode**: Uses prioritized landmark IDs (`keepIds`) to condense daily itineraries into essential crown jewels with generous morning time buffers.
- **😴 Low-Energy Wellness Mode**: Replaces high-exertion treks across all days with relaxing palace high-tea, lakeside lounges, and Ayurvedic spa sessions.
- **Automated Re-Sequencing**: Automatically executes `optimizeDayPath` on each modified day after disruption swaps to ensure geographic proximity and updated time slots.

### 5. 🗺️ Interactive Route Map (Leaflet.js + OpenStreetMap)
- **Place Labels on Pins**: Every landmark on the map features a high-contrast label displaying sequence (`D1-1`, `D1-2`), place name, and schedule.
- **Midpoint Distance Badges**: Visual indicators along polyline connectors showing calculated segment distances in km and drive times.
- **Navigation Shortcuts**: Direct links to Google Maps directions between consecutive stops.

### 6. 🚖 Transit Hub & Reference Fare Estimates
- **Intercity Booking Links**: Direct booking shortcuts for MakeMyTrip (Flights, Trains, Buses) and Uber Outstation.
- **Reference Fares**: Curated baseline rates for local taxis, auto-rickshaws, and rental scooters.
- **1-Click Transfer Insertion**: Add airport or railway cab pickups directly into the itinerary and running budget.

### 7. 🔒 Code Hygiene & Security
- **HTML Sanitization**: All user-provided text fields (names, notes, custom activities, costs) are sanitized through a robust HTML entity escaper (`escapeHtml`) to prevent injection vulnerabilities.
- **Data-Driven Architecture**: Curated dataset of **100+ destinations & activities** (67 core places + 36 contingency alternates) across 6 premier Indian destinations: Jaipur, Goa, Manali, Kerala, Rishikesh, and Udaipur.

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
