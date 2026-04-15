# CrisisGrid 🗺️
### Ground truth, delivered to those who act.

CrisisGrid is an AI-powered humanitarian crisis reporting and dispatch system. Field workers submit voice notes or text reports from disaster zones — AI extracts structured data and plots real-time color-coded hotspots on a live map for NGO coordinators and emergency response teams.

---

## 🌐 Live Demo
**[https://crisis-grid-ccf54.web.app](https://crisis-grid-ccf54.web.app)**

---

## 🚨 The Problem
During disasters, field workers have critical ground-level information but no fast structured way to communicate it to coordinators. Reports get lost in WhatsApp groups, phone calls, and spreadsheets — causing delayed response and misallocated resources.

## ✅ Our Solution
CrisisGrid turns a 30-second voice note like:
> *"50 families need food and clean water in Kolhapur after flooding, roads are blocked"*

Into a structured, mapped, actionable report in seconds — automatically.

---

## ✨ Features
- 🎙️ **Voice to Report** — Field workers record a voice note, Groq Whisper transcribes it instantly
- 🤖 **AI Extraction** — Groq LLaMA extracts location, need type, urgency score (1-10), population affected
- 🗺️ **Live Crisis Map** — Color-coded pins on OpenStreetMap: Red = Critical, Orange = Moderate, Green = Low
- 📊 **Dispatch Panel** — Top 3 hotspots ranked by urgency with recommended volunteer count
- 🔴 **Real-time Updates** — Firebase Firestore syncs new reports instantly across all devices
- 📱 **Mobile Responsive** — Designed for field workers on phone browsers
- 🏛️ **Multi-NGO Support** — Multiple organizations can submit to the same shared map
- 🎥 **Video-support** — will be deployed soon

---

## 🛠️ Tech Stack
| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS, JavaScript |
| Voice Transcription | Groq Whisper API |
| AI Data Extraction | Groq LLaMA 3.3-70B |
| Map | Leaflet.js + OpenStreetMap |
| Database | Firebase Firestore |
| Hosting | Firebase Hosting |

---

## 🏗️ Project Structure

crisis-grid/
├── index.html          # Landing page
├── dashboard.html      # Live map dashboard
├── submit.html         # Field report submission form
├── style.css           # Global styles
├── app.js              # Map logic + Firestore real-time listener
├── submit.js           # Form + voice upload handler
├── gemini.js           # AI extraction (Groq LLaMA)
├── groq.js             # Whisper voice transcription
├── firebase.js         # Firebase initialization
└── env-config.js       # API keys (not committed)

---


## 💎 Team -- commitNpray
Commit N Pray is a team driven by speed, creativity, and fearless execution. We build fast, adapt instantly, and turn chaos into working solutions. We don’t wait for perfection—we commit, iterate, and sometimes… pray.

## 👥 Team Members
1. Shaurya Sharma -- Teach lead + Team lead [ rishhhsharmaaa@gmail.com]
2. Aatifa Aftab -- Quality Assurance + Prototype Designer [atikaa@student.iul.ac.in]
3. Mayank choudhary -- Quality Assurance + Support Developer [mayanknst2028@gmail.com]
