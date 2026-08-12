# Zenfolio Network — Job Matching & Education Marketplace Prototype

A static, clickable concept prototype for the **Zenfolio Network**: an internal, opt-in,
member-to-member marketplace for job leads, availability, and education inside NextZen.
Built for internal storytelling and early user testing — not a production spec.

**Live:** https://robzen-bit.github.io/Leads/

## The demo loop (definition of done)

1. Open **First-run** from the Demo bar to experience the opt-in explainer and 3-step profile wizard.
2. As **Marisol** (volume studio owner), click **Post a job lead** — the wizard is pre-filled; watch the live match-count moment on step 3, then publish.
3. Switch to **Devon** (independent photographer) — the bell shows the matched-lead notification. Open it and hit **I'm interested** with a note.
4. Switch back to **Marisol** — review Devon's card under the lead, **Connect**, then mark the lead **Filled**.
5. As **Devon**, browse **Learn & Teach** and book a seat in Eleanor's *Portrait Lighting Intensive* (BookMe-styled checkout, seats decrement).
6. Switch to **Eleanor** (educator) to see her hosting side: seats sold, revenue, and roster — including Devon's new booking.

## Personas (switchable via the floating Demo bar)

- **Marisol Reyes — Reyes Volume Studio** (Lancaster, PA): poster persona, 2 open leads, 6 seeded responses.
- **Devon Blake** (Mechanicsburg, PA): seeker persona — 4 matched leads, 2 matched workshops.
- **Eleanor Whitfield** (Harrisburg, PA): educator persona — hosts two workshops on the "Powered by BookMe" rails.

## Notes

- Plain HTML/CSS/JS, no build step. Hash-based routing, all state in-memory (session only) — **Reset** on the Demo bar restores seed data.
- Matching is real and rules-based (shoot-type taxonomy with parent/child matching, min-of-radii distance via town centroids, role intersection) — see the "How matching works" modal in-app.
- All names, studios, and data are fictional; geography is south-central PA.
- Out of scope by design: auth, real messaging, payments, maps, ratings/reviews, real BookMe integration.
