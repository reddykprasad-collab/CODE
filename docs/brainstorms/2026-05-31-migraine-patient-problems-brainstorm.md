# Migraine Companion: Problem Space Brainstorm
**Date:** 2026-05-31  
**Scope:** Awareness · Access · Treatment  
**Grounded in:** Current codebase analysis + migraine patient problem landscape

---

## What the App Already Handles Well

Before gaps: the existing app has real depth in areas most consumer health apps ignore.

- Dual-path product (pre-treatment vs. on-treatment) with a rules engine that tracks journey phase transitions
- Client-side migraine risk prediction using day-of-week patterns, trigger load, cycle proximity, and barometric pressure
- HCP prep wizard that transforms journal data into a doctor visit summary
- MIDAS disability scoring with trend tracking
- MOH (medication overuse headache) warning integrated into the home screen
- PA status tracking (pending / approved / denied)
- Behavioral orchestration layer that queues interventions without spamming

---

## Dimension 1: Awareness

### Core patient problem
Most migraine patients spend years misidentifying their condition as "just bad headaches." Even diagnosed patients often don't recognize their own patterns, don't understand the episodic → chronic progression risk, and can't explain the condition's impact to family or employers.

### What the app tracks but never surfaces

**Hormonal patterns.** `isPeriodDay` is logged in every journal entry. Nothing in the app ever connects it to trigger frequency. This is the single highest-ROI gap in the current codebase — the data is there, the insight is not.

**Prodrome as a personal warning system.** The journal captures prodrome signals (neck stiffness, aura, mood change, yawning, fatigue). The app never says: "You logged neck stiffness before 7 of your last 9 migraines. This may be your earliest warning sign." That framing transforms a passive data point into an actionable signal.

**Trigger co-occurrence.** The trends screen shows individual trigger frequency. It doesn't show combinations: "Poor sleep + high stress preceded 80% of your severe attacks."

### Highest-impact ideas

**1. Hormonal cycle analysis module**  
Surface period-day correlation in the Trends screen. Show: what % of migraines occur within 48h of cycle start, average severity during perimenstrual window vs. other days. This serves patients and becomes a powerful data point in HCP prep.

**2. Personal warning sign discovery**  
After 30+ journal entries, compute which prodrome signals most reliably precede attacks for this specific patient. Display as a personalized insight card: "Your early warning signs, based on your data." Update monthly.

**3. Condition progression indicator**  
Show the patient where they sit on the episodic/chronic spectrum (based on monthly migraine day count trends) and what it means clinically. If trending toward chronic (≥15 days/month), escalate with education and an HCP prep prompt.

**4. Social explainer card**  
A shareable, patient-specific summary card: "This is what migraine looks like for me." Auto-generated from MIDAS score, frequency, and most impactful functional limitations. Designed to be shared with a partner, manager, or HR.

**5. Dynamic content system**  
Replace 5 hardcoded articles with a content layer that adapts to journey phase, trigger profile, and MIDAS score. A patient with high sleep-trigger correlation should see sleep hygiene content. A patient approaching MOH threshold should see overuse education. Content targeting > content volume.

**6. Monthly pattern digest**  
A monthly push notification or in-app summary: "Here's what your data said this month." Keeps patients engaged between attacks and reinforces pattern awareness without requiring active app usage.

---

## Dimension 2: Access

### Core patient problem
Newer preventive treatments (CGRP monoclonal antibodies) have transformed outcomes for many patients — but the path from symptoms to approved treatment involves multiple high-friction steps: getting a headache specialist referral, surviving PA denials, navigating specialty pharmacy, and affording the out-of-pocket costs. Most patients abandon the process before completing it.

### What the app currently does
- Tracks PA status (not_submitted / pending / approved / denied)
- Stores refill date and PA expiry date
- Generates an HCP prep summary (text, not shareable)

### What it doesn't do

**PA denial support.** The app knows when a PA is denied. It does nothing with that. A denial is the highest-leverage intervention point — patients who receive a denial and don't know what to do next often give up entirely.

**HCP-shareable output.** The HCP prep wizard generates a summary, but it's display-only in the app. There's no PDF export, no share sheet, no way to send it to the provider's portal or print it. The work patients do in that wizard is trapped.

**Specialist discovery.** The app assumes the patient has a neurologist. Many don't. Rural patients especially lack access to headache specialists. There's no guidance on finding one.

**Cost and assistance programs.** CGRP medications can cost $7,000+/year without coverage. Manufacturer patient assistance programs and copay cards exist but are hard to find. The app doesn't surface them.

### Highest-impact ideas

**1. PA appeal letter generator**  
When PA status is `denied`, surface a workflow: enter the denial reason (step therapy requirement, not medically necessary, etc.), and use Claude to draft a personalized appeal letter that incorporates the patient's MIDAS score, migraine frequency, and prior treatment history. This is a direct, high-value use of the AI layer that exists nowhere else in consumer migraine apps.

**2. Letter of medical necessity generator**  
Before submitting a PA, generate a patient-facing letter of medical necessity. The journal data and MIDAS scores make this document strong. Export as PDF or plain text for the prescribing physician.

**3. HCP report export**  
Add a share sheet to HCP prep output. PDF generation (or plain text export) so the patient can email it to their provider, upload it to a patient portal, or print it before an appointment. This is the highest-friction gap in the current HCP prep feature.

**4. Copay and assistance program directory**  
A static but curated list of manufacturer patient assistance programs, copay cards, and nonprofit resources (NHF, AHDA). Surfaced contextually: when PA is denied, when treatment starts, or when refill date is approaching.

**5. Refill and PA expiry proactive alerts**  
The app stores `refillDate` and `paExpiryDate` but doesn't warn proactively. A PA that expires without renewal means a treatment gap. A missed refill disrupts the streak. 14-day and 7-day reminders for both.

**6. Specialist finder (lightweight)**  
A ZIP-code based search against the American Headache Society's member directory (public) or NPI data filtered by neurology + headache subspecialty. Even a basic implementation removes a major barrier for patients who don't know how to find a specialist.

---

## Dimension 3: Treatment

### Core patient problem
Preventive migraine treatment requires 3–6 months to show benefit, requires consistent daily dosing, and often causes early side effects that prompt discontinuation. Most patients who abandon treatment do so in the first 60 days — not because the treatment failed, but because they didn't have support through the difficult early phase.

### What the app currently does well
- Dose streak with behavioral reinforcement
- MIDAS trend tracking (measures outcomes over time)
- MOH warning when acute treatments exceed threshold
- Migraine risk prediction (day-of-week, triggers, pressure, cycle)
- Treatment phase tracking via orchestration (new_start → early_adherence → stable/at_risk/struggling)

### What's broken or missing

**CHAT_SIGNAL_DETECTED never fires.** The orchestration rule for `expectation_reset` (which fires a behavioral intervention when the patient expresses doubt about treatment) listens for a signal that ChatScreen never emits. This feature is fully built on the receiving end but has no sender. Easy fix, high behavioral value.

**Side effect tracking is absent.** The journal tracks migraine symptoms and triggers. Nothing captures side effects from the preventive medication itself (fatigue, injection site reactions, constipation for oral meds). Without this data, patients have no way to communicate side effects to their HCP and no context for why they might want to discontinue.

**Treatment efficacy is never calculated.** The app has MIDAS scores pre and post treatment start, monthly migraine day counts, and severity averages. It never computes the delta and shows it to the patient. "Since starting treatment 90 days ago, your average monthly migraine days dropped from 14 to 8. That's a 43% reduction." This is the most motivating message the app could send during the early adherence phase.

**Assessment result doesn't affect user path.** A patient in the awareness path who scores high on the candidacy assessment should be routed toward treatment, or at least toward HCP prep. Currently the assessment result is displayed and discarded.

### Highest-impact ideas

**1. Treatment efficacy dashboard**  
Compute and display the before/after comparison at 30, 60, and 90 days post-treatment start. Use MIDAS score trend, monthly migraine day count, and average severity. Frame it positively at any positive delta. Frame flat/negative results as "it can take up to 6 months — your doctor should know this data" rather than "it isn't working." This directly addresses the #1 driver of early discontinuation: patients not seeing progress.

**2. Side effect log**  
A lightweight daily side effect tracker (separate from the migraine journal) tied to treatment start date. Categories: injection site, fatigue, mood, GI, constipation, hair change, other. Surfaced in HCP prep automatically. Low data entry friction — one tap per symptom, no open text required.

**3. Fix CHAT_SIGNAL_DETECTED**  
Wire ChatScreen to emit the `doubt` signal when certain phrases are detected in the user's message (existing keyword patterns). This activates the already-built `expectation_reset` intervention, which modifies Claude's next response to address treatment doubt proactively. This is a 1-day fix that unlocks a fully engineered behavioral intervention.

**4. Predictive treatment timing**  
The prediction engine already surfaces elevated-risk days. Extend it to push a notification: "Tomorrow is a moderate-risk day based on your patterns. Make sure your triptan is accessible." This moves prediction from passive insight to active preparation — the only design that actually reduces attack severity outcomes.

**5. Rescue medication tracker**  
Separate the acute treatment field in the journal into: rescue medication used (yes/no, which one) and dose (number of doses in the last 7 days). The MOH warning is currently a blunt 10-day counter. Granular rescue tracking enables earlier, more specific interventions before the patient crosses into MOH territory.

**6. Hormonal migraine prevention protocol**  
For patients who track period days and show high perimenstrual migraine correlation, surface a protocol education card: "Mini-prevention for menstrual migraine." Explain the clinical approach (extended NSAID use, magnesium timing, etc.) as education content. Not medical advice — education that prompts an HCP conversation. The data already exists to identify who needs this.

**7. 90-day milestone and treatment review prompt**  
At 90 days post-treatment start, generate a comprehensive summary: MIDAS improvement, frequency change, rescue medication trends, side effects logged. Frame it as "Your 3-month review — share this with your doctor." Auto-populate HCP prep with this summary. Most neurologists recommend a 3-month check-in anyway; the app can anchor to this clinical timeline.

---

## Prioritization Framework

Not all ideas are equal. Three filters:

| Filter | Question |
|---|---|
| Data already exists | Can this be built without new data collection? |
| Single session value | Does it help a patient in one session, not after 90 days? |
| HCP alignment | Does it improve the doctor-patient relationship? |

### Tier 1: High leverage, low build cost
- Fix CHAT_SIGNAL_DETECTED wiring (1 day, unlocks existing feature)
- Treatment efficacy dashboard (data exists, needs math + UI)
- Hormonal cycle analysis in Trends (data exists, needs analysis + display)
- HCP report export / share sheet (existing feature, add export)
- Prodrome as personal warning sign (data exists, needs computation)
- Refill and PA expiry alerts (data stored, needs notification logic)

### Tier 2: Medium build, high patient value
- Side effect log (new data model, lightweight UI)
- PA appeal letter generator (Claude integration, new workflow)
- Predictive treatment timing notifications (prediction engine exists, needs push notification)
- Assessment result → path routing (logic change, not a new feature)
- Monthly pattern digest (computation + notification)

### Tier 3: Larger scope, strategic value
- Dynamic content system (requires content management or structured content layer)
- Letter of medical necessity generator (requires Claude + PDF export)
- Social explainer card (new UI surface, shareable format)
- Specialist finder (external data source required)
- Copay assistance directory (curation + maintenance)

---

## Open Questions

1. Is there a plan to add a backend/cloud sync? Several Tier 1 features become much more valuable with cross-device access (HCP export, MIDAS trend history).
2. Is the target patient on CGRP specifically, or any preventive migraine treatment? The PA/access features assume CGRP specifically.
3. What is the monetization model? Some Tier 2 ideas (PA appeal letter, LMN generator) could be premium features.
4. Is there appetite for external data integrations (NPI directory, weather API already exists)? Specialist finder requires this.
