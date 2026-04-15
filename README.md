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
