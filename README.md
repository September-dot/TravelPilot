# ✈️ TravelPilot — Bounded Autonomy AI Trip Planner & Route Optimizer for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet.js-blue.svg)]()
[![PWA](https://img.shields.io/badge/PWA-Offline%20Ready-emerald.svg)]()

> An intelligent, algorithmic travel planner for India featuring natural-language AI Co-Pilot adaptation with bounded autonomy, before/after diff preview and undo, hybrid Traveling Salesperson (TSP) route optimization with circadian slot penalties, proactive Open-Meteo weather alerts, budget-aware generation, interactive Leaflet.js maps, and integrated transit booking hubs.

---

## 🎯 Problem, User & Core Insight

* **The Problem**: Real-world travel across India is subject to unpredictable friction: sudden monsoon downpours, multi-hour flight/train delays, and travel fatigue. Traditional trip planners offer rigid, static lists that collapse when disruptions occur.
* **The User Persona**: Weekend explorers, families, and travelers navigating Indian cities who need geographically logical daily itineraries that adapt seamlessly when conditions change.
* **The Core Insight**: Unconstrained LLMs hallucinate coordinates, invent non-existent venues, and generate impossible transit timetables. Pure rule engines lack conversational flexibility. **TravelPilot bridges this gap with Bounded Autonomy**:
  * The **AI Layer** parses unstructured natural language into typed intent constraints (`{ intents: [...], confidence: 0.95 }`).
  * The **Deterministic Engine** executes verified multi-day substitutions and geodesic routing.
  * The **Human-in-the-Loop Diff Modal** presents an exact before/after impact summary for explicit user approval with a full multi-level Undo/Redo stack.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interaction Layer                          │
│   • Natural Language Scenario Box ("my train is delayed and it's wet") │
│   • Proactive Live Weather Alerts (Open-Meteo REST API)                │
│   • Map-Click Hotel Origin (Click anywhere on map to set start point)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             AI Co-Pilot: Bounded Autonomy Intent Parser                │
│   • Multi-Provider LLM Caller (OpenAI / Groq / OpenRouter / Proxy)     │
│   • Clause-Scoped Negation Regex Fallback (Word boundaries, context)   │
│   • Output: Strict Typed JSON Schema { intents: [...], ... }           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Deterministic Execution Engine                    │
│   • Pure buildItinerary(params) for reproducible testing & budget cuts │
│   • Multi-Day Contingency Swaps with Active ID Duplicate Protection    │
│   • Hybrid TSP Optimizer: Exact Permutations (n≤7) & 2-Opt (n>7)       │
│   • Slot Affinity Cost Penalties (Morning monuments vs Sunset points)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Impact Calculator & Diff Modal                     │
│   • Computes Δkm, Δcab transit mins, Δbudget cost, and resolved risks  │
│   • Dynamic Rationale generated from verified before/after diffs       │
│   • Explicit User Actions: [ Approve & Apply ] or [ Cancel & Revert ]  │
│   • Full Multi-Level Undo / Redo History Stack (Cmd+Z / Cmd+Shift+Z)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 Interactive Dashboard & Visualizers                    │
│   • Leaflet.js Route Map with sequence pins & distance badges          │
│   • Real-Time Reactive Budget Meter                                    │
│   • iCalendar (.ICS) Export with properly escaped slots                │
│   • Shareable State URL Hash (#trip=...) & Offline PWA Service Worker  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Technical Features

### 1. 🧠 AI Co-Pilot (Bounded Autonomy with Clause-Scoped Negations)
* **Clause-Scoped Negation**: Splits sentences across clause boundaries (commas, semicolons, conjunctions) so *"no worries, it's pouring"* correctly identifies rain, while *"not tired"* and *"aren't delayed"* never trigger false positives.
* **Contextual Word Disambiguation**: Words like *"train"* only trigger delays when accompanied by context words (*late, delayed, cancelled, missed, stuck*). Phrases like *"too expensive"* map to budget reductions, while *"free time"* is distinguished from free sightseeing.
* **Dual Parsing Engine**:
  * **Real LLM Integration**: Connects to OpenAI, Groq, OpenRouter, or custom proxy endpoints via `sessionStorage` (no secrets stored permanently in `localStorage`).
  * **Deterministic Fallback**: Scoped regex matching with zero runtime dependencies.
* **Bounded Tool Execution**: The AI picks among deterministic actions (`weather_rain`, `traffic_delay`, `fatigue_chill`, `budget_low`, `budget_luxury`, `reroute_optimize`, `reset_plan`).

### 2. 🔍 Preview, Approve & Multi-Level Undo Stack
* **Before / After Diff Modal**: Inspect every change before it modifies your live trip. Displays added, removed, and rescheduled stops side by side.
* **Quantified Impact Deltas**: Calculates exact $\Delta\text{km}$ saved, $\Delta\text{cab drive minutes}$, $\Delta\text{budget variance} (₹)$, and resolved weather/timing conflicts.
* **Dynamic Rationale Generation**: Explanations are constructed dynamically from the computed diff metrics rather than static canned strings.
* **Undo/Redo History**: Comprehensive multi-step history stack with global keyboard shortcuts (**Cmd+Z / Ctrl+Z** to Undo, **Cmd+Shift+Z / Ctrl+Y** to Redo).

### 3. 🌦️ Proactive Live Weather Forecast (Open-Meteo Integration)
* **Zero-Key Weather API**: Queries Open-Meteo daily forecasts using `start_date` and `end_date` parameters for precipitation probability, rain sum (mm), and temperature.
* **Automated Weather Triggers**: Flags rain forecasts ($> 45\%$ precipitation probability) on trip dates and invites the traveler to preview a sheltered indoor plan in one click.
* **Closed-Days Awareness**: Calculates real day-of-week based on the trip start date and alerts users if a scheduled attraction is typically closed (e.g. Mattancherry Palace closed on Fridays).

### 4. 🧭 Hybrid TSP Route Optimizer (Zero-Freeze Guaranteed)
* **Exact Path Permutation ($n \le 7$)**: Evaluates all $n!$ stop permutations with slot affinity penalties (morning monuments vs sunset/night viewpoints) in $<1\text{ms}$.
* **Nearest-Neighbour + 2-Opt Heuristic ($n > 7$)**: Implements greedy nearest-neighbor tour construction followed by iterative 2-Opt edge-exchange local search ($O(n^2)$) incorporating slot penalties, eliminating UI freeze risk on 10–20 stops.
* **Map-Click Hotel Origin**: Click anywhere on the map to set your custom accommodation origin, optimizing routes from where you stay.

### 5. 💰 Multi-Tier Budget-Constrained Generation
* **100+ Authentic Destination Places**: 67 core authentic places + 36 contingency alternates across 6 premier destinations (Jaipur, Goa, Manali, Kerala, Rishikesh, Udaipur).
* **Pure `buildItinerary(params)` Function**: Pure functional generation enables deterministic re-generation and unit testing. Scaling budget from ₹6k to ₹60k dynamically transforms itineraries across all 6 cities.
* **Active ID Exclusion**: Disruption replacement pools filter out all currently scheduled places, preventing duplicate stops across the trip.

### 6. 📅 Calendar (.ICS) Export, Shareable State URL & PWA
* **RFC-5545 iCalendar Export**: Generates properly escaped `.ics` calendar files with real scheduled slot times for Google Calendar, Apple Calendar, or Outlook.
* **Shareable URL Hash**: Encodes the entire trip configuration and custom state into a shareable URL (`#trip=base64...`).
* **PWA Readiness**: Includes `manifest.json` and `sw.js` service worker for offline asset caching.

---

## 📊 Evaluation & Benchmark Results

The codebase includes an automated test suite (`test.js`) evaluating the parser and routing algorithms:

| Benchmark Suite | Test Target | Results | Status |
|---|---|---|---|
| **AI Intent Tuning Set** | 25 labeled prompts (negations, boundaries, multi-intent) | **100% Accuracy** (25/25) | ✅ PASS |
| **AI Intent Held-Out Set** | 25 unseen test prompts (clause negations, phrasing variations) | **100% Accuracy** (25/25) | ✅ PASS |
| **Substring Safety Test** | `"my train is delayed"` $\rightarrow$ must not trigger rain | Verified: `traffic_delay` only | ✅ PASS |
| **TSP Optimizer Complexity** | 10 stops (3.6M permutations brute-force equivalent) | Solved in **< 1ms** via 2-Opt | ✅ PASS |
| **TSP Optimizer Stress** | 15 stops (1.3 Trillion permutations brute-force equivalent) | Solved in **< 2ms** via 2-Opt | ✅ PASS |
| **Budget Sensitivity** | ₹6k vs ₹60k across all 6 cities via `buildItinerary` | 6 of 6 cities dynamically adapt | ✅ PASS |
| **Disruption Duplicate Guard** | Rain & Chill replacement pools with active ID exclusion | 0 duplicate places across trip | ✅ PASS |

---

## 🚀 Live Demo & Running Locally

### Live Deployment (GitHub Pages)
Explore the live web app: **[https://september-dot.github.io/TravelPilot/](https://september-dot.github.io/TravelPilot/)**

### Running Locally
```bash
# Clone the repository
git clone https://github.com/September-dot/TravelPilot.git
cd TravelPilot

# Run automated test suite
node test.js

# Start local preview server
python3 server.py
```
Open **[http://localhost:8085](http://localhost:8085)** in your browser.

---

## 📂 Repository Structure

```
travelpilot/
├── index.html                  # Main modular HTML structure with modals & views
├── style.css                   # Responsive CSS design system & diff preview styles
├── data.js                     # Curated 100+ place database with coordinates & transit
├── app.js                      # Pure buildItinerary, hybrid TSP, & AI Co-Pilot
├── test.js                     # Automated test suite with Tuning & Held-Out benchmarks
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker for offline caching
├── server.py                   # Lightweight local preview server
├── LICENSE                     # MIT License
├── travelpilot_single_file.html # Self-contained single-file edition
└── README.md                   # Technical specification & architecture documentation
```

---

## 🗺️ Product Roadmap & Limitations

* **Road Network Distance**: Current distance calculations use the Haversine geodesic formula with calibrated speed coefficients. Future releases will integrate OSRM (Open Source Routing Machine) road geometries.
* **Multi-City Itineraries**: Expanding the hybrid TSP solver to cross-state road trip circuits (e.g. Golden Triangle: Delhi-Agra-Jaipur).
* **Live Transit Feeds**: Direct API integration with local transit aggregators for live ride booking.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
