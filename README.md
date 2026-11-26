# PAWSITIVE — Gamified Community Animal Welfare & Pokédex Mobile App

[![npm version](https://img.shields.io/badge/npm-v1.0.0-cb3837.svg)](https://www.npmjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-v25-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203NF%20Relational-orange.svg)](https://sqlite.org/)

Created based on the **Jaypee Institute of Information Technology (JIIT, Sector 62, Noida)** Project-Based Learning Synopsis for **Database Systems and Web Lab (15B17CI372)**.

**Submitted By:**
1. Vardaan Gahlot (2501200031)
2. Kunal Malik (2501200046)
3. Ripunjay Saini (2501200058)

**Submitted To:** Dr. Kirti Jain & Ms. Aarti Goel

---

## Quick Start via NPM

Run the app immediately using standard npm commands:

```bash
# 1. Install dependencies
npm install

# 2. Run the production full-stack mobile app
npm start
```

Or run in concurrent live-reload development mode:
```bash
npm run dev
```

Run the lab database validation test suite:
```bash
npm test
```

---

## NPM Scripts & CLI Reference

| Command | Action |
|---|---|
| `npm start` | Launches the unified server via `bin/cli.js`, compiles assets if needed, prints phone Wi-Fi port links, and serves both frontend and API on a single port. |
| `npm run dev` | Runs both Node.js Express server (`:5001`) and Vite React client (`:5173`) concurrently with hot module replacement (HMR). |
| `npm test` | Runs the 7-suite relational database validation tests (3NF schema, 1-to-many species constraints, aggregate `SUM(points_awarded)` queries, and Deed logging). |
| `npm run build` | Compiles frontend assets into `dist/` with Vite and Tailwind v4. |
| `npx pawsitive` | Direct CLI executable command configured via `"bin": { "pawsitive": "./bin/cli.js" }`. |

---

## Mobile-First "Phone Ports" Features

1. **Responsive Mobile Viewport**: Designed specifically for smartphone screens (iPhone & Android aspect ratios, 375px–430px safe areas, thumb-reachable touch targets).
2. **Bottom Navigation Bar**: Fixed bottom navigation bar with quick tabs (Feed, Pokédex, Quick Capture `+`, Leaderboard, Profile).
3. **Desktop Phone Frame Simulator**: On desktop browsers, an interactive smartphone frame is rendered with dynamic island, status clock, battery indicator, and a one-click toggle between "Phone Frame" and "Full View".
4. **LAN / Network Port Sharing**: The server automatically detects your computer's local Wi-Fi IP and outputs a phone port link (e.g., `http://10.x.x.x:5001/`) so you can open and test the app directly on your physical mobile phone!

---

## Concept & Overview

**Pawsitive** is a mobile-first web application that turns everyday animal welfare into a community-driven, gamified social experience:
- **Helper/Community Feed**: Any user can post a listing describing an animal in need (photo, location, help type: shelter, feed, clothes, vaccine, rescue, adoption). Anyone nearby can coordinate through real-time comments and mark the listing resolved by submitting proof of care.
- **Pokédex-Style Personal Collection**: Users "capture" street animals by photographing and naming them (e.g. *Sheru*, *Bruno*, *Whiskers*), building a regional species collection over time. Captured animals look like collectible trading cards; uncaptured species appear as mysterious silhouettes.
- **AI Species Recognition**: Built-in vision classifier suggests the species (e.g., 🐶 Dog 97% confidence) from photo upload or camera snap, with full user confirmation/override.
- **Deeds & Public Leaderboard**: Real-world actions earn Deed points (Posting = 50 pts, Capturing = 30 pts, Resolving = 100 pts, Commenting = 10 pts). The public leaderboard ranks community rescuers using an aggregate `SUM(points_awarded)` query.
- **Automated Badges**: Badges (*First Scout*, *Paws Explorer*, *Guardian Angel*, *Paws Master*, etc.) unlock automatically upon fulfilling criteria.
- **Friendly Mascot "Pawly"**: Guides users with uplifting advice, keeping the tone cheerful and rewarding rather than guilt-driven.

---

## Relational Database Schema (3NF)

Following the ER diagram from the project synopsis:

```
[Users] 1 ──── N [Captures] N ──── 1 [Animals] N ──── 1 [Species]
   │                 │                    │
   │ 1               │                    │ 1
   │                 │                    │
   N                 │                    N
[Listings] ──────────┼────────────────────┘
   │
   ├─────── 1 ──── N [Comments]
   │
   └─────── 1 ──── N [Deeds] (Action log & Point ledger)

[Badges] 1 ──── N [UserBadges] N ──── 1 [Users]
```

---

## Testing the Features

1. **One-Click User Switching**: In the top bar or Profile tab, switch between **Vardaan Gahlot**, **Kunal Malik**, **Ripunjay Saini**, and other community helpers.
2. **Explore the Feed**: Filter requests by *Feed*, *Shelter*, *Rescue*, *Clothes*, *Vaccine*, or switch to **Map View** to see live pins around Sector 62, Noida!
3. **Coordinate & Comment**: Tap any listing to read or post comments; notice you earn **+10 Deed points** for every coordination message.
4. **Resolve a Request**: Submit a proof of care photo to resolve an open listing and claim **+100 Deed points**!
5. **Capture Animals**: Tap the center glowing camera button `+`, try the AI scanner on sample presets or upload your own, name the animal, and watch it turn into a collectible holographic trading card in your Pokédex!
6. **Check the Leaderboard**: View the real-time podium and live deeds stream powered by the SQL aggregate queries.
