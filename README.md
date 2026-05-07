# Migraine Companion

A React Native mobile app for migraine patients. Unbranded and disease-state only — no drug names, no logos. Built with Expo.

## What it does

Two user paths based on where the patient is in their journey:

**Awareness path (Alex)** — for patients who are undertreated or newly exploring options. Focused on education, candidacy self-assessment, and preparing for an HCP conversation.

**Adherence path (Jordan)** — for patients currently on preventive treatment. Focused on dose tracking, streak building, and symptom logging to demonstrate treatment value.

Both paths share a core set of features:

- **AI Chat** — Claude-powered companion for migraine education and emotional support. Hardcoded against brand names, dosing advice, and medical diagnosis. Crisis escalation routes to 988 and 741741.
- **Symptom Journal** — daily log with migraine yes/no, severity (1–10 slider), treatments taken, functional impact, and known triggers. History view with trigger chips.
- **Trends** — migraine day count, average severity, day-of-week breakdown, top triggers, and top functional impacts. Deduplicates by calendar day so multiple entries on the same day count as one.
- **HCP Prep** — 4-step wizard that generates a shareable text summary for a doctor appointment. Pulls real journal data (last 30 days) to pre-populate frequency and enrich the summary.
- **Reminders** — dose reminder scheduling with frequency (daily, every other day, monthly) and time slot (morning, midday, evening). Deep-links to iOS settings if notification permission is denied.
- **Candidacy Assessment** — 5-question self-assessment that gives a personalized signal on whether preventive therapy may be appropriate.
- **Dose Streak** — consecutive dose confirmation counter with a one-day grace period (missing one day does not reset the streak).

## Tech stack

- React Native 0.81 + Expo SDK 54
- Expo Router (bottom tab + native stack navigation)
- AsyncStorage for all local persistence (no server, no database)
- Anthropic Claude API (`claude-sonnet-4-6`) for AI chat
- Expo Notifications for dose reminders
- Jest + jest-expo for unit tests (36 tests)

## Project structure

```
src/
├── screens/          # One file per screen
├── services/
│   ├── storage.js    # All AsyncStorage read/write
│   ├── claude.js     # Anthropic API wrapper + isEscalation()
│   └── notifications.js
├── contexts/
│   └── UserPathContext.js   # Reactive path switching for demo
├── navigation/
│   └── index.js      # Stack + tab navigators
├── theme.js          # Colors, fonts, spacing tokens
└── __tests__/        # storage, claude, navigation tests
```

## Getting started

**Prerequisites:** Node 18+, Expo CLI, an Anthropic API key.

```bash
git clone https://github.com/reddykprasad-collab/CODE.git
cd CODE
npm install
```

Create a `.env` file in the project root:

```
CLAUDE_API_KEY=your_anthropic_api_key_here
```

Start the dev server:

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `i` for iOS simulator.

## Running tests

```bash
npm test
```

## Demo mode

The Tools tab has a persona switcher at the bottom. Tap **Alex** or **Jordan** to instantly switch between the Awareness and Adherence paths without reinstalling or clearing storage.

## Building for TestFlight

Requires an Apple Developer account ($99/year) and an EAS project ID.

```bash
npm install -g eas-cli
eas login
eas init           # generates your EAS project ID
eas build --platform ios --profile preview
```

Submit to TestFlight:

```bash
eas submit --platform ios
```

## Security note

The Claude API key is read from `process.env.CLAUDE_API_KEY` and bundled into the app binary via Expo's `extra` config. For public App Store distribution, route API calls through a server proxy so the key is not exposed in the client.

## Content guardrails

The AI companion operates under a strict system prompt:

- Never mentions specific medication brand names
- Never provides dosing instructions
- Never diagnoses conditions
- Responds with `ESCALATION` (exact string) when the user describes a medical emergency or suicidal ideation — the app intercepts this and renders crisis resources (988, 741741)
- Limits responses to 3–5 sentences

## Privacy

All data is stored locally on the device. Nothing is sent to any server except AI chat messages, which are processed by Anthropic's API. The app has no accounts, no analytics, and no third-party SDKs beyond Anthropic and Expo.

See the in-app Privacy Policy (Tools tab) for the full statement.

## License

Private — not for redistribution.
