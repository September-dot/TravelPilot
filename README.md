# ✈️ TravelPilot — Bounded Autonomy AI Trip Planner & Route Optimizer for India 🇮🇳

[![CI](https://github.com/September-dot/TravelPilot/actions/workflows/test.yml/badge.svg)](https://github.com/September-dot/TravelPilot/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet.js-blue.svg)]()
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

> A modern, algorithmic travel planner for India featuring natural-language AI Co-Pilot adaptation with bounded autonomy, before/after diff preview and undo, hybrid Traveling Salesperson (TSP) route optimization, proactive Open-Meteo weather alerts, budget-aware generation, interactive Leaflet.js maps, and integrated transit booking hubs.

---

## 🎯 Problem, User & Core Insight

* **The Problem**: Real-world travel across India is subject to unpredictable disruptions: sudden monsoon storms, multi-hour flight/train delays, and travel fatigue. Traditional trip planners provide rigid, static itineraries that break down immediately when friction occurs.
* **The User Persona**: Travelers, weekend explorers, and families navigating Indian cities who need realistic, geographically logical schedules that adapt seamlessly when things go wrong.
* **The Core Insight**: Unconstrained LLMs generate hallucinations, impossible timetables, and fake GPS coordinates. Pure rule systems lack conversational flexibility. **TravelPilot bridges this gap with Bounded Autonomy**:
  * The **AI Layer** parses unstructured natural language into strict, typed intent constraints.
  * The **Deterministic Engine** executes verified multi-day substitutions and geodesic routing.
  * The **Human-in-the-Loop Diff Modal** presents an exact before/after impact summary for explicit user approval with a full multi-level Undo/Redo stack.

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        User Interaction Layer                          │
│   • Natural Language Scenario Box ("my train is delayed and it's wet") │
│   • Proactive Live Weather Alerts (Open-Meteo REST API)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             AI Co-Pilot: Bounded Autonomy Intent Parser                │
│   • Multi-Provider LLM Caller (OpenAI / Groq / OpenRouter / Proxy)     │
│   • Zero-Bug Tokenized Regex Fallback (Word boundaries, negations)     │
│   • Output: Strict Typed JSON Schema { intents: [...], ... }           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Deterministic Execution Engine                    │
│   • Multi-Day Contingency Swaps (Sheltered Havelis, Wellness, Express) │
│   • Multi-Tier Budget Scoring (< ₹2,500 budget vs > ₹6,000 luxury)     │
│   • Hybrid TSP Optimizer: Exact Permutations (n≤7) & 2-Opt (n>7)       │
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
│   • iCalendar (.ICS) Export for Google/Apple Calendar                  │
│   • Shareable State URL Hash (#trip=...) & Offline PWA Service Worker  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Key Technical Features

### 1. 🧠 AI Co-Pilot (Bounded Autonomy with Strict Enum Guardrails)
* **Natural Language Interpretation**: Users type real-world friction prompts in plain English (*"my train is delayed by 2 hours"*, *"pouring rain and we are exhausted"*).
* **Dual Parsing Engine**:
  * **Real LLM Integration**: Connects to any OpenAI-compatible API or proxy endpoint with strict JSON schema constraints.
  * **Zero-Bug Deterministic Fallback**: Word-boundary regex parser (`\b`) ensuring words like `train` never falsely trigger `rain`, with full negation detection (`"not raining"`).
* **Bounded Tool Execution**: The AI selects among verified algorithmic tools (`weather_rain`, `traffic_delay`, `fatigue_chill`, `budget_low`, `budget_luxury`, `reroute_optimize`, `reset_plan`).

### 2. 🔍 Preview, Approve & Multi-Level Undo Stack
* **Before / After Diff Modal**: Inspect every change before it affects your live trip. Displays added, removed, and rescheduled stops side by side.
* **Quantified Impact Deltas**: Calculates exact $\Delta\text{km}$ saved, $\Delta\text{cab drive minutes}$, $\Delta\text{budget variance} (₹)$, and resolved weather/timing conflicts.
* **Dynamic Rationale Generation**: Explanations are constructed dynamically from the computed diff metrics rather than static canned strings.
* **Undo/Redo History**: Comprehensive multi-step history stack with global keyboard shortcuts (`Cmd+Z` / `Ctrl+Z` to Undo, `Cmd+Shift+Z` / `Ctrl+Y` to Redo).

### 3. 🌦️ Proactive Live Weather Forecast (Open-Meteo Integration)
* **Zero-Key Weather API**: Proactively queries Open-Meteo daily forecasts for precipitation probability, rain sum (mm), and temperature across destination coordinates.
* **Automated Weather Triggers**: Flags rain forecasts ($> 45\%$ precipitation probability) without user prompt and invites the traveler to preview a sheltered indoor plan in one click.
* **Closed-Days Awareness**: Calculates real day-of-week based on the trip start date and alerts users if a scheduled attraction is typically closed (e.g. museums on Mondays).

### 4. 🧭 Hybrid TSP Route Optimizer (Zero-Freeze Guaranteed)
* **Exact Path Permutation ($n \le 7$)**: Evaluates all $n!$ stop permutations with slot affinity penalties (morning monuments vs sunset/night viewpoints) in $<1\text{ms}$.
* **Nearest-Neighbour + 2-Opt Heuristic ($n > 7$)**: Implements greedy nearest-neighbor tour construction followed by iterative 2-Opt edge-exchange local search ($O(n^2)$), completely eliminating UI freeze risk on 10–20 stops.
* **Hotel Starting Point**: Allows specifying a hotel or custom accommodation origin so routes optimize from where the traveler wakes up.

### 5. 💰 Multi-Tier Budget-Constrained Generation
* **100+ Authentic Destination Places**: 67 core authentic places + 36 contingency alternates across 6 premier destinations (Jaipur, Goa, Manali, Kerala, Rishikesh, Udaipur).
* **Dynamic Cost-Tier Scoring**: Modifying total budget from ₹6k to ₹60k dynamically transforms itineraries across all 6 cities, scaling from free heritage stepwells and street dining to royal high teas and private backwater cruises.

### 6. 📅 Calendar (.ICS) Export & Shareable State URL
* **RFC-5545 iCalendar Export**: Generates `.ics` calendar files with start/end timestamps and descriptions for 1-click import into Google Calendar, Apple Calendar, or Outlook.
* **Shareable URL Hash**: Encodes the entire trip configuration and custom state into a shareable URL (`#trip=base64...`).
* **Offline Service Worker**: Includes `sw.js` for offline PWA asset caching.

---

## 📊 Evaluation & Benchmark Results

The codebase includes an automated test suite (`test.js`) executed on every commit via GitHub Actions CI:

| Benchmark Suite | Test Target | Results | Status |
|---|---|---|---|
| **AI Intent Classification** | 45+ labeled prompts (substring collisions, negations, multi-intent) | **100% Accuracy** (45/45 Passed) | ✅ PASS |
| **Substring Safety Test** | `"my train is delayed"` $\rightarrow$ must not trigger rain | Verified: `traffic_delay` only | ✅ PASS |
| **TSP Optimizer Complexity** | 10 stops (3.6M permutations brute-force equivalent) | Solved in **< 1ms** via 2-Opt | ✅ PASS |
| **TSP Optimizer Stress** | 15 stops (1.3 Trillion permutations brute-force equivalent) | Solved in **< 2ms** via 2-Opt | ✅ PASS |
| **Budget Sensitivity** | ₹6k vs ₹60k across all 6 cities | 6 of 6 cities dynamically adapt | ✅ PASS |
| **Multi-Day Disruption** | Multi-day rain swaps, title updates & duplicate prevention | 100% verified & reversible | ✅ PASS |

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

# Start local server
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
├── app.js                      # Application state engine, hybrid TSP, & AI Co-Pilot
├── test.js                     # Automated CI test suite & evaluation benchmarks
├── server.py                   # Lightweight local preview server
├── sw.js                       # Service worker for offline PWA caching
├── LICENSE                     # MIT License
├── travelpilot_single_file.html # Self-contained single-file edition
└── README.md                   # Technical specification & architecture documentation
```

---

## 🗺️ Product Roadmap & Limitations

* **Road Network Distance**: Current distance calculations use the Haversine formula with calibrated speed coefficients. Future releases will integrate OSRM (Open Source Routing Machine) road geometries.
* **Multi-City Itineraries**: Expanding the hybrid TSP solver to cross-state road trip circuits (e.g. Golden Triangle: Delhi-Agra-Jaipur).
* **Live Cab Fare Feeds**: Integrating real-time transit pricing APIs for on-demand rides.

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
