# GuardianSense Mobile (Child Client)

The mobile tracking client for the GuardianSense ecosystem. Built with **Expo** and **React Native**, this application is designed to run on the child's device, securely streaming high-frequency location and telemetry data back to the parent dashboard.

---

## 🚀 Technical Highlights

### 1. Robust Location Engine
Leverages `expo-location` to monitor geographic coordinates with high precision. The app is optimized to handle different movement states (walking vs. driving) and adjusts its reporting frequency to balance battery life with tracking accuracy.

### 2. Live Telemetry Streaming
Beyond just GPS, the app streams a comprehensive "heartbeat" to the backend:
- **Battery & Power**: Real-time battery percentages and charging state transitions.
- **Network Health**: Monitors connection type (Wi-Fi vs. Cellular) to help parents understand data latency.
- **Physical Velocity**: Calculates current speed to detect rapid transit or stationary periods.

### 3. Secure Multi-Device Pairing
Uses a custom authentication flow designed for ease of use and high security:
- **Pairing Codes**: Parents generate a short-lived, 8-digit code on the dashboard.
- **Persistent Tokens**: The app exchanges this code for a long-lived JWT stored securely in `expo-secure-store`, ensuring only authorized devices can post data.
- **Rate Limiting**: Protected by an **Upstash Redis** layer on the backend to prevent brute-force pairing attempts.

---

## 🏗️ Build & Deployment (EAS)

This project uses **Expo Application Services (EAS)** for professional-grade builds and submissions.

### Build Profiles (`eas.json`)
- **`preview`**: Generates an installable APK (Android) or IPA (iOS) for internal testing.
- **`production`**: Optimized for final App Store and Google Play submissions.

### Triggering a Build
```bash
# Preview build for testing
eas build --profile preview --platform android

# Production build for stores
eas build --profile production --platform all
```

---

## 🛠️ Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local

# 3. Start Expo Go
npx expo start
```
