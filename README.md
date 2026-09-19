# ✈️ TravelPilot — AI Trip Planner for India 🇮🇳

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Stack](https://img.shields.io/badge/Tech-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-blue.svg)]()
[![Responsive](https://img.shields.io/badge/Design-Mobile%20Friendly-emerald.svg)]()

> A clean, minimal, and beginner-friendly web-app prototype that generates realistic day-by-day itineraries and tracks budgets in real time for top Indian travel destinations.

---

## 🌟 Key Features

- **🗺️ 6 Top Indian Destinations**: Jaipur, Goa, Manali, Kerala, Rishikesh, and Udaipur with authentic attractions and realistic estimated costs in ₹ (INR).
- **✨ Custom Itinerary Generator**: Generates 2–3 curated stops per day balanced across Morning, Afternoon, and Evening slots based on your selected interests.
- **✏️ Fully Editable Day-by-Day Plan**:
  - Add new places to any day with time slot, category, cost, and insider tips.
  - Edit or delete any activity.
  - Reorder stops with Move Up/Down buttons or HTML5 Drag & Drop.
  - Day tabs navigation + Add extra days dynamically.
- **💰 Live Interactive Budget Tracker**:
  - Live cost editing that immediately recalculates the running budget.
  - Visual financial progress bar with **Within Budget** (Green) and **Over Budget** (Rose) indicators.
  - Displays Set Budget, Estimated Spend, Daily Average, and Remaining Balance/Deficit.
- **📋 Export & Sharing**:
  - One-click copy formatted plain-text itinerary for WhatsApp/Notes.
  - Clean print stylesheet for PDF exports.
  - Auto-saves trip state in browser `localStorage`.

---

## 🚀 Live Demo (GitHub Pages)

You can host this repository for free using **GitHub Pages**:
1. Go to **Settings** $\rightarrow$ **Pages**.
2. Under **Branch**, select `main` and `/ (root)`, then click **Save**.
3. Your app will be live at: `https://<YOUR_GITHUB_USERNAME>.github.io/<YOUR_REPO_NAME>/`

---

## 💻 Running Locally

### Prerequisites
- Python 3.8+ (Zero external dependencies).

### Start Local Server
```bash
# Clone the repository
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
cd <YOUR_REPO_NAME>

# Start local server
python3 server.py
```
Open **[http://localhost:8085](http://localhost:8085)** in your browser.

---

## 📂 Project Structure

```
travelpilot/
├── index.html                  # Main modular HTML structure
├── style.css                   # Minimalist, clean neutral stylesheet
├── data.js                     # Curated Indian destinations & places dataset
├── app.js                      # Reactive state engine & live budget tracker
├── server.py                   # Lightweight local preview server
├── travelpilot_single_file.html # Self-contained single-file edition (HTML+CSS+JS)
└── README.md                   # Project documentation & setup guide
```

---

## 📄 License
This project is licensed under the MIT License.
