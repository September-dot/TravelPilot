# ✈️ TravelPilot — AI Trip Planner for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS%20%7C%20Leaflet.js-blue.svg)]()
[![Responsive](https://img.shields.io/badge/Design-Mobile%20Friendly-emerald.svg)]()

> A clean, modern, and beginner-friendly AI-style trip planner for India featuring dynamic day-by-day itineraries, interactive OpenStreetMap route visualization, live budget tracking, transit & cab booking integration, and weather/delay contingency rerouting.

---

## 🌟 Key Features

### 1. 🗺️ 6 Curated Indian Destinations with Authentic GPS Coordinates
- **Destinations**: Jaipur, Goa, Manali, Kerala, Rishikesh, and Udaipur.
- Realistic estimated entrance fees, activity costs, and local prices in ₹ (INR).
- Precise geographical coordinates (`lat`, `lng`) for mapping and navigation.

### 2. 🗺️ Interactive Route Map (Leaflet.js + OpenStreetMap)
- Real-time OpenStreetMap integration (zero API keys required).
- Color-coded daily pins with numbered sequences (e.g., `D1-1`, `D1-2`).
- Polyline route connectors between consecutive stops.
- Interactive popups with direct **Google Maps Navigation** links.

### 3. 🚨 Dynamic Disruption & Contingency Rerouting Assistant
- **🌧️ Heavy Rain / Monsoon Plan**: Automatically swaps open-air hilltops/forts with indoor royal palaces, havelis, museums, and heritage cafes.
- **⏱️ Traffic Delay / Express Plan**: Replaces distant, road-jam-prone excursions with closer city landmarks to preserve your schedule.
- **☕ Chill / Low Energy Plan**: Replaces intensive treks with relaxing scenic sunset points and cafes.
- Instant 1-click **Reset to Original Plan** at any time.

### 4. 🚖 Cabs, Flights & Transit Booking Hub
- **Intercity Transit**: Direct booking links for Flights, Trains, and Buses (MakeMyTrip, IRCTC, RedBus).
- **Local Transit Rates**: Real-time reference fares for Cabs/Taxis, Auto-rickshaws, and Scooter rentals.
- **1-Click Transfer Insertion**: Instantly add airport/railway transfers or full-day taxi hires directly into your itinerary and running budget.

### 5. ✨ Custom & Fully Editable Day-by-Day Itineraries
- Categorized time slots (**Morning**, **Afternoon**, **Evening**).
- Add custom stops with category, cost, and insider tips.
- Edit or delete any activity with live budget re-calculation.
- Reorder stops using **Move Up / Down** buttons or **HTML5 Drag & Drop**.
- Add extra days dynamically or switch between Day tabs.

### 6. 💰 Live Interactive Budget Tracker
- Live cost editing that immediately updates the total spend.
- Visual financial progress bar with **Within Budget** (Green) and **Over Budget** (Rose) indicators.
- Summary cards: Total Budget, Estimated Spend, Daily Average, and Balance/Deficit.

### 7. 📋 Export & Sharing
- One-click copy formatted plain-text itinerary for WhatsApp and Notes.
- Clean print stylesheet optimized for PDF exports.
- Seamless persistence via browser `localStorage`.

---

## 🚀 Live Demo (GitHub Pages)

This repository is configured to deploy instantly via **GitHub Pages**:
1. Go to **Settings** $\rightarrow$ **Pages**.
2. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
3. Your app will be live at: **`https://september-dot.github.io/TravelPilot/`**

---

## 💻 Running Locally

### Prerequisites
- Python 3.8+ (Zero external dependencies needed).

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
├── app.js                      # Application state engine, Leaflet map logic & rerouting system
├── server.py                   # Lightweight local preview server
├── travelpilot_single_file.html # Self-contained single-file edition (HTML+CSS+JS in one file)
└── README.md                   # Project documentation & setup guide
```

---

## 📄 License
This project is licensed under the MIT License.
