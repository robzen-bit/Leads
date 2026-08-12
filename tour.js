/* ================================================================
   Wizard Walkthroughs — per "The Wizard Walkthrough Method"
   Model A: navigate → highlight (elevate real elements) → pointer
   lock → validate state, not clicks. Adapted for this prototype's
   full-re-render architecture: highlights re-apply after every
   render(), and watchers tick on render instead of useEffect.
   Z ladder: dim 540 · backings 543 · elevated 545 · callout 550 ·
   intro/menu 600. Internal build — no analytics.
   ================================================================ */

"use strict";

const TOUR_LS_KEY = "nz-network:tour:v1";

/* ---------------- Wizard definitions ---------------- */
/* step: { kind:'learn'|'do', route?, body, action?, targets:[sel], active:[sel],
           validate?:fn, settle?:'fast'|'slow', undo?:fn, noBack?, center? } */

const TOURS = [
  /* ===== Marisol — volume studio owner ===== */
  {
    id: "m-post-lead", persona: "marisol", short: "Post a lead",
    title: "Post a job lead",
    blurb: "Staff a photo day in minutes: run the post-a-lead wizard and watch the match-count moment before you publish.",
    start: "#/home",
    steps: [
      { kind: "learn", route: "#/home",
        targets: ['[data-tour="post-lead"]'],
        body: "This is Network Home as <b>Marisol Reyes</b>, owner of Reyes Volume Studio. When you need coverage — a second shooter, an assistant, a whole volume day — you post a <b>job lead</b>. The button lives up here on every Network page." },
      { kind: "do",
        targets: ['[data-tour="post-lead"]'], active: ['[data-tour="post-lead"]'],
        body: "A lead is an introduction, not an assignment — Zenfolio takes no commission and you keep the working relationship.",
        action: "Click <b>Post a job lead</b>.",
        validate: () => parseHash().page === "post", settle: "fast" },
      { kind: "learn", route: "#/post",
        targets: ['.wizard'],
        body: "Step 1 is the job itself. We've pre-filled a senior portrait day so you can see the shape: title, shoot type, role, headcount, date. Shoot types and roles are chips — and the dashed <b>+ Add</b> chip opens suggestions or lets you create your own." },
      { kind: "do",
        targets: ['.wizard'], active: ['.wizard-foot .btn:last-child'],
        body: "Everything here can be edited later from My Posts.",
        action: "Click <b>Continue</b>.",
        validate: () => S.ui.pw && S.ui.pw.step >= 2, settle: "fast",
        undo: () => { if (S.ui.pw) S.ui.pw.step = 1; } },
      { kind: "learn",
        targets: ['.wizard'],
        body: "Location is free entry — type any city or ZIP and you'll get your <b>recent locations</b> plus suggestions. Matched photographers only ever see the town; the exact address is shared after you connect. And notice <b>pay is required</b>: leads with pay listed get 3× more responses." },
      { kind: "do",
        targets: ['.wizard'], active: ['.wizard-foot .btn:last-child'],
        body: "Carlisle-area photographers within 50 miles will be considered for this one.",
        action: "Click <b>Continue</b>.",
        validate: () => S.ui.pw && S.ui.pw.step >= 3, settle: "fast",
        undo: () => { if (S.ui.pw) S.ui.pw.step = 2; } },
      { kind: "learn",
        targets: ['.match-preview'],
        body: "The moment that beats a Facebook post: before you publish, the Network tells you <b>exactly how many qualified photographers</b> will be notified — matched on shoot type, role, and distance from real member profiles. No waiting to see who happens to scroll by." },
      { kind: "do",
        targets: ['.wizard'], active: ['.wizard-foot .btn:last-child'],
        body: "Publishing notifies every match instantly. One of them is Devon Blake — you'll meet him in the other walkthroughs.",
        action: "Click <b>Publish lead</b>.",
        validate: () => S.ui.pw && !!S.ui.pw.published, settle: "fast" },
      { kind: "learn", center: true, noBack: true,
        body: "<b>Your lead is live.</b> Matching photographers just got a notification that deep-links straight to it. Interest lands in <b>My Posts</b>, where you review profiles and connect. Next up: <i>“Review responses &amp; fill a lead.”</i>" }
    ]
  },
  {
    id: "m-invite", persona: "marisol", short: "Invite photographers",
    title: "Find & invite available photographers",
    blurb: "Browse photographers who have broadcast open dates near you, and invite one directly to a lead.",
    start: "#/home",
    steps: [
      { kind: "learn", route: "#/home",
        targets: ['[data-tour="zone-availability"]'],
        body: "Leads are the push flow; this is the reverse. Photographers can broadcast <b>availability</b> — dates, shoot types, radius — and volume accounts like yours see the nearest ones right on Home." },
      { kind: "do",
        targets: ['[data-tour="tab-board"]'], active: ['[data-tour="tab-board"]'],
        body: "The full list lives on the Job Board.",
        action: "Click <b>Job Board</b>.",
        validate: () => parseHash().page === "board", settle: "fast" },
      { kind: "do", route: "#/board",
        targets: ['[data-tour="board-tabs"]'], active: ['[data-tour="board-tabs"]'],
        body: "The board has two sides: leads posted by studios, and photographers who've listed themselves as available.",
        action: "Switch to <b>Available photographers</b>.",
        validate: () => S.ui.board.tab === "avail", settle: "fast" },
      { kind: "learn", route: "#/board/avail",
        targets: ['[data-tour="avail-grid"]'],
        body: "Each card is a real availability listing: when they're free, what they shoot, roles, travel radius, rate guidance, and a note — sorted by distance from you. <b>View profile</b> opens their full network profile with a one-click portfolio link." },
      { kind: "do",
        targets: ['[data-tour="avail-grid"]'], active: ['[data-tour="avail-grid"]'],
        body: "You don't have to wait for them to find your lead.",
        action: "On any card, open <b>“Invite to your lead…”</b> and choose one of your open leads.",
        validate: () => S.invites && S.invites.length > 0, settle: "slow" },
      { kind: "learn", center: true, noBack: true,
        body: "<b>Invitation sent.</b> They get a notification deep-linked to your lead and can express interest in one tap. Pairing invitations with automatic matching is how you cover a specific gap — a sick shooter, a surprise booking — in minutes." }
    ]
  },
  {
    id: "m-fill", persona: "marisol", short: "Fill a lead",
    title: "Review responses & fill a lead",
    blurb: "Work the interested list on your fall sports day lead: review profiles, connect with two shooters, and mark it filled.",
    start: "#/home",
    steps: [
      { kind: "do", route: "#/home",
        targets: ['[data-tour="tab-my-posts"]'], active: ['[data-tour="tab-my-posts"]'],
        body: "Every lead you post lives in My Posts with its response funnel.",
        action: "Click <b>My Posts</b>.",
        validate: () => parseHash().page === "my-posts", settle: "fast" },
      { kind: "learn", route: "#/my-posts",
        targets: ['[data-tour="myposts-leads"] .lead-card:first-child'],
        body: "Your fall sports day needs <b>2 second shooters</b>. The funnel reads: 23 photographers notified, 11 viewed the lead, <b>4 are interested</b>. Interest — not just views — is what you review." },
      { kind: "do",
        targets: ['[data-tour="myposts-leads"] .lead-card:first-child'],
        active: ['[data-tour="myposts-leads"] .lead-card:first-child .btn-primary'],
        body: "",
        action: "Click <b>Review responses (4)</b>.",
        validate: () => parseHash().page === "manage", settle: "fast" },
      { kind: "learn", route: "#/manage/l1",
        targets: ['.stats-strip'],
        body: "The lead's management view. The funnel again — notified, viewed, interested — plus <b>connected against headcount</b>. The Open/Filled toggle up here controls whether matching keeps notifying people." },
      { kind: "learn",
        targets: ['[data-tour="interested-grid"] .photog-card:first-child'],
        body: "Each interested photographer arrives as a card: distance <b>from the job</b> (not from you), their rate guidance, the note they wrote, and a link to their live Zenfolio portfolio — that's the credibility check, no ratings needed. Two actions: <b>Connect</b> or <b>Pass</b>." },
      { kind: "do",
        targets: ['[data-tour="interested-grid"]'], active: ['[data-tour="interested-grid"]'],
        body: "Sarah shoots league sports days every fall — but pick anyone you like.",
        action: "Click <b>Connect</b> on a photographer.",
        validate: () => S.ui.modal && S.ui.modal.type === "connect", settle: "fast" },
      { kind: "do", noBack: true,
        targets: ['#modal-root .modal-ov', '[data-tour="interested-grid"]'],
        active: ['#modal-root .modal-ov', '[data-tour="interested-grid"]'],
        body: "Connecting is the only moment contact details are exchanged — one intro email to each of you. Zenfolio introduces members; rates and contracts stay between you.",
        action: "Click <b>Connect &amp; send intro</b>.",
        validate: () => { const l = S.leads.find(x => x.id === "l1"); return l && l.interested.filter(i => i.status === "connected").length >= 1; },
        settle: "slow" },
      { kind: "do", noBack: true,
        targets: ['[data-tour="interested-grid"]', '#modal-root .modal-ov'],
        active: ['[data-tour="interested-grid"]', '#modal-root .modal-ov'],
        body: "This job needs two shooters, so connect one more.",
        action: "Click <b>Connect</b> on a second photographer, then confirm.",
        validate: () => { const l = S.leads.find(x => x.id === "l1"); return l && l.interested.filter(i => i.status === "connected").length >= 2; },
        settle: "slow" },
      { kind: "do", noBack: true,
        targets: ['.banner.teal'], active: ['.banner.teal'],
        body: "Headcount met — the Network noticed and is offering to close the loop.",
        action: "Click <b>Mark as filled</b>.",
        validate: () => { const l = S.leads.find(x => x.id === "l1"); return l && l.status === "filled"; },
        settle: "slow" },
      { kind: "learn", center: true, noBack: true,
        body: "<b>Photo day staffed.</b> Filled leads stop generating notifications immediately — no zombie posts, no “is this still open?” replies. If a shooter falls through, flip the lead back to <b>Open</b> and matching resumes. Both photographers have your contact details in their inbox." }
    ]
  },

  /* ===== Devon — independent photographer ===== */
  {
    id: "d-interest", persona: "devon", short: "Express interest",
    title: "Find a job lead & express interest",
    blurb: "See the push model from the photographer's side: matched leads arrive on Home — open one and raise your hand.",
    start: "#/home",
    steps: [
      { kind: "learn", route: "#/home",
        targets: ['[data-tour="zone-leads"]'],
        body: "This is Home as <b>Devon Blake</b>, an independent photographer in Mechanicsburg. Nobody browses a job board here — these leads were <b>matched to Devon's profile</b> on shoot type, role, and distance, nearest first. Work comes to you, free with membership." },
      { kind: "do",
        targets: ['[data-tour="zone-leads"]'], active: ['[data-tour="zone-leads"]'],
        body: "Every card shows the essentials up front: date, distance, pay, role.",
        action: "Open any lead — click <b>View details</b> (or the title).",
        validate: () => parseHash().page === "lead", settle: "fast" },
      { kind: "learn",
        targets: ['[data-tour="lead-detail"]'],
        body: "The full lead. Pay is <b>always listed</b> — it's required to post. The venue shows as a town only; the exact address is shared after you connect. And the fine print matters: Zenfolio introduces members — the rate, the contract, and the client stay yours." },
      { kind: "do",
        targets: ['[data-tour="lead-action"]'], active: ['[data-tour="lead-action"]'],
        body: "Raising your hand costs nothing and shares nothing yet.",
        action: "Click <b>I'm interested</b>.",
        validate: () => !!S.ui.compose, settle: "fast" },
      { kind: "do", noBack: true,
        targets: ['.compose-box'], active: ['.compose-box'],
        body: "A short note is your pitch — 140 characters, like “Carlisle local, dual bodies, shot 6 league days.”",
        action: "Add a note if you like, then click <b>Send interest</b>.",
        validate: () => { const id = parseHash().id; const l = S.leads.find(x => x.id === id); return !!(l && l.interested.some(i => i.profileId === "p-devon" && i.status !== "passed")); },
        settle: "slow" },
      { kind: "learn", noBack: true,
        targets: ['[data-tour="lead-action"]'],
        body: "Interest sent. The poster now sees your network profile, your note, and your live portfolio. If they connect, you <b>both</b> get an intro email with contact details — the conversation moves to email or phone, off the platform, commission-free." },
      { kind: "learn", center: true, noBack: true,
        body: "<b>That's the whole seeker loop.</b> Track everything you've raised your hand for under <b>Matches &amp; Responses</b> — interest sent, connected, intro email status. And if your calendar opens up, flip it around: post an <i>availability listing</i> so studios can find and invite you." }
    ]
  },
  {
    id: "d-book", persona: "devon", short: "Book a workshop",
    title: "Book a workshop",
    blurb: "The education marketplace: find a workshop matched to your learning interests and book a seat on the BookMe rails.",
    start: "#/home",
    steps: [
      { kind: "do", route: "#/home",
        targets: ['[data-tour="tab-learn"]'], active: ['[data-tour="tab-learn"]'],
        body: "The same matching engine that routes job leads also routes education — pointed at what you want to <b>learn</b> instead of what you shoot.",
        action: "Click <b>Learn &amp; Teach</b>.",
        validate: () => parseHash().page === "learn", settle: "fast" },
      { kind: "learn", route: "#/learn",
        targets: ['[data-tour="learn-grid"]'],
        body: "Workshops, mentoring, and photo tours from fellow members — <b>matches first</b>. Devon's profile says he wants to learn portrait lighting and volume workflow, so Eleanor Whitfield's <i>Portrait Lighting Intensive</i> leads the grid." },
      { kind: "do",
        targets: ['[data-tour="learn-grid"]'], active: ['[data-tour="learn-grid"]'],
        body: "",
        action: "Open <b>Portrait Lighting Intensive</b> — click <b>View details &amp; book</b>.",
        validate: () => parseHash().page === "workshop", settle: "fast" },
      { kind: "learn",
        targets: ['[data-tour="ws-detail"]', '[data-tour="bookme-card"]'],
        body: "A full listing: host with portfolio, curriculum, level, and a <b>live seat bar</b>. Under the hood this is BookMe with two small enhancements — multi-seat capacity, and for virtual events a meeting link that rides the confirmation email. No new booking system to learn." },
      { kind: "do",
        targets: ['[data-tour="book-btn"]'], active: ['[data-tour="book-btn"]'],
        body: "Seats are first-come — 5 of 8 left on this one.",
        action: "Click <b>Book your seat</b>.",
        validate: () => S.ui.modal && S.ui.modal.type === "book" && !S.ui.modal.confirmed, settle: "fast" },
      { kind: "do", noBack: true,
        targets: ['#modal-root .modal-ov', '[data-tour="book-btn"]'],
        active: ['#modal-root .modal-ov', '[data-tour="book-btn"]'],
        body: "A standard BookMe checkout: your details pre-filled, payment handled by the host's existing rails (demo — no charge).",
        action: "Click <b>Confirm booking</b>.",
        validate: () => Object.keys(S.bookings).some(k => S.bookings[k].includes("devon")), settle: "slow" },
      { kind: "do", noBack: true,
        targets: ['#modal-root .modal-ov'], active: ['#modal-root .modal-ov'],
        body: "Confirmation and reminders go out by email — for virtual events, the meeting link is in both.",
        action: "Click <b>Done</b>.",
        validate: () => !S.ui.modal, settle: "fast" },
      { kind: "learn", center: true, noBack: true,
        body: "<b>You're booked.</b> The seat count just dropped, and Devon is now on the host's roster — switch to <b>Eleanor</b>'s walkthrough to see that side: seats sold, revenue, and the roster with your name on it. Retention for us, a new revenue line for veterans, a reason to stay for newer members." }
    ]
  },

  /* ===== Eleanor — educator ===== */
  {
    id: "e-host", persona: "eleanor", short: "Host a workshop",
    title: "Set up an in-person workshop",
    blurb: "The educator's side: create an in-person workshop with the host wizard and see who nearby wants to learn it.",
    start: "#/learn",
    steps: [
      { kind: "learn", route: "#/learn",
        targets: ['[data-tour="your-offerings"]'],
        body: "This is Learn &amp; Teach as <b>Eleanor Whitfield</b> — 15 years of weddings, semi-retiring from Saturdays. Her hosting hub: live offerings, <b>seats sold, and gross revenue</b>, with a roster behind each listing. Late-career expertise, monetized without leaving the platform." },
      { kind: "do",
        targets: ['[data-tour="host-btn"]'], active: ['[data-tour="host-btn"]'],
        body: "Let's put a new offering live.",
        action: "Click <b>Host a workshop</b>.",
        validate: () => parseHash().page === "host", settle: "fast" },
      { kind: "learn", route: "#/host",
        targets: ['.radio-cards'],
        body: "Four offering types: a seated <b>Workshop</b>, 1:1 <b>Mentoring</b>, a guided <b>Photo Tour</b>, or name your own format. We'll build a classic in-person workshop — leave <b>Workshop</b> selected." },
      { kind: "do",
        targets: ['.wizard'], active: ['.wizard'],
        body: "The description is optional at this stage — you can flesh it out before publishing.",
        action: "Give it a title — try <b>“Golden Hour Posing Lab”</b> — then click <b>Continue</b>.",
        validate: () => S.ui.hw && S.ui.hw.step >= 2, settle: "fast" },
      { kind: "learn",
        targets: ['.wizard'],
        body: "Logistics. <b>In-person</b> is already selected, and location is free entry with your recent places. <b>Seats</b> is the BookMe multi-seat enhancement — capacity 1 behaves like a classic booking type, anything higher shows “X of Y seats left” to bookers. Set seats and price however you like." },
      { kind: "do",
        targets: ['.wizard'], active: ['.wizard-foot .btn:last-child'],
        body: "",
        action: "Click <b>Continue</b>.",
        validate: () => S.ui.hw && S.ui.hw.step >= 3, settle: "fast",
        undo: () => { if (S.ui.hw) S.ui.hw.step = 2; } },
      { kind: "do",
        targets: ['[data-tour="hw-topics"]'], active: ['[data-tour="hw-topics"]'],
        body: "Topics are what the matching engine runs on — members who listed these as learning interests get notified. The <b>+ Add topic</b> chip has suggestions, or create your own.",
        action: "Pick at least one skill topic — <b>Portrait lighting</b> fits.",
        validate: () => S.ui.hw && S.ui.hw.topics.length > 0, settle: "slow" },
      { kind: "learn",
        targets: ['.match-preview'],
        body: "The educator's match-count moment: a live count of <b>photographers near you who want to learn exactly this</b> — real profiles, learning interests intersected with your topics, radius applied because it's in-person. Your audience exists before you publish." },
      { kind: "do",
        targets: ['.wizard'], active: ['.wizard-foot .btn:last-child'],
        body: "",
        action: "Click <b>Publish</b>.",
        validate: () => S.ui.hw && !!S.ui.hw.published, settle: "fast" },
      { kind: "learn", center: true, noBack: true,
        body: "<b>Your workshop is live.</b> Matched members were notified, the listing is in Learn &amp; Teach, and every booking rides your BookMe calendar — seat management, payment, reminders. Watch seats sold, revenue, and the roster grow under <b>Your offerings</b>." }
    ]
  }
];

/* ---------------- Engine ---------------- */

const Tour = {
  active: null,           // { topicId, phase: 'intro' | number }
  advancing: false,
  _advTimer: 0,
  dragPos: null,          // {x,y} manual callout position (drag), reset per step
  _elevated: [],          // { el, origPos, origZ, origBg }
  _backings: [],
  _stamped: [],
  progress: { completed: [], welcomed: false },

  /* ----- persistence ----- */
  load() { try { const p = JSON.parse(localStorage.getItem(TOUR_LS_KEY)); if (p && typeof p === "object") Object.assign(this.progress, p); } catch (e) {} },
  save() { try { localStorage.setItem(TOUR_LS_KEY, JSON.stringify(this.progress)); } catch (e) {} },
  resetProgress() { this.progress.completed = []; this.save(); this.openMenu(); },

  /* ----- boot & chrome ----- */
  boot() {
    this.load();
    const mk = (id, cls) => { const d = document.createElement("div"); d.id = id; if (cls) d.className = cls; document.body.appendChild(d); return d; };
    this.dimEl = mk("tour-dim");
    this.calloutEl = mk("tour-callout", "tour-ui");
    this.modalEl = mk("tour-modal", "tour-ui");
    this.calloutEl.style.display = "none";
    this.modalEl.style.display = "none";
    this.calloutEl.addEventListener("mousedown", (e) => this._dragStart(e));
    window.addEventListener("scroll", () => this._reflow(), { passive: true });
    window.addEventListener("resize", () => this._reflow());
    this.renderButton();
    if (!this.progress.welcomed) this.showWelcome();
  },
  renderButton() {
    const slot = document.getElementById("tour-slot");
    if (!slot) return;
    const done = TOURS.filter((t) => this.progress.completed.includes(t.id)).length;
    slot.innerHTML = `<button class="tour-btn" onclick="Tour.openMenu()" aria-label="Open walkthroughs">✦ Walkthroughs <span class="tb-count">${done}/${TOURS.length}</span></button>`;
  },

  wiz() { return this.active ? TOURS.find((t) => t.id === this.active.topicId) : null; },
  curStep() { const w = this.wiz(); return w && typeof this.active.phase === "number" ? w.steps[this.active.phase - 1] : null; },

  /* ----- welcome / menu / intro (z 600, own dim) ----- */
  showWelcome() {
    this.modalEl.style.display = "";
    this.modalEl.innerHTML = `
    <div class="tour-mov" onclick="if(event.target===this)Tour.dismissWelcome()">
      <div class="tour-mcard">
        <div class="tm-eyebrow">Zenfolio Network · Prototype</div>
        <h2>Take a guided walkthrough?</h2>
        <p>Six short hands-on tours cover the whole concept — posting and filling job leads as a volume studio, finding work as a photographer, and hosting workshops as an educator. You'll click the real UI; each tour takes about two minutes.</p>
        <div class="tm-foot">
          <button class="btn btn-quiet" onclick="Tour.dismissWelcome()">Explore on my own</button>
          <button class="btn btn-orange" onclick="Tour.dismissWelcome(true)">Show me the walkthroughs</button>
        </div>
      </div>
    </div>`;
  },
  dismissWelcome(openMenu) {
    this.progress.welcomed = true; this.save();
    this.modalEl.style.display = "none"; this.modalEl.innerHTML = "";
    if (openMenu) this.openMenu();
  },
  openMenu(completedId) {
    const groups = ["marisol", "devon", "eleanor"];
    const nextUp = TOURS.find((t) => !this.progress.completed.includes(t.id));
    this.modalEl.style.display = "";
    this.modalEl.innerHTML = `
    <div class="tour-mov" onclick="if(event.target===this)Tour.closeMenu()">
      <div class="tour-mcard wide">
        <div class="tm-head">
          <div><div class="tm-eyebrow">Guided walkthroughs</div><h2>Pick a workflow</h2></div>
          <button class="tm-x" onclick="Tour.closeMenu()" aria-label="Close">✕</button>
        </div>
        ${completedId ? `<div class="tm-done-note">✓ Nice — “${esc(TOURS.find((t) => t.id === completedId).title)}” complete.</div>` : ""}
        ${groups.map((g) => {
          const p = PERSONAS[g];
          return `
          <div class="tm-group">
            <div class="tm-persona"><span class="avatar sm ${p.av}">${p.initials}</span><b>${esc(p.name)}</b><span class="tm-role">${esc(p.role)}</span></div>
            ${TOURS.filter((t) => t.persona === g).map((t) => {
              const done = this.progress.completed.includes(t.id);
              const isNext = nextUp && nextUp.id === t.id;
              return `
              <div class="tm-row ${isNext ? "next" : ""}">
                <span class="tm-check ${done ? "done" : ""}">${done ? "✓" : ""}</span>
                <div class="tm-info"><b>${esc(t.title)}</b>${isNext ? '<span class="tm-next-chip">Up next</span>' : ""}<span class="tm-blurb">${esc(t.blurb)}</span></div>
                <button class="btn sm ${done ? "btn-quiet" : "btn-primary"}" onclick="Tour.start('${t.id}')">${done ? "Replay" : "Start"}</button>
              </div>`;
            }).join("")}
          </div>`;
        }).join("")}
        <div class="tm-foot-note">Each walkthrough resets the demo and switches you to the right persona. Progress is saved on this device · <button class="tm-reset" onclick="Tour.resetProgress()">Reset progress</button></div>
      </div>
    </div>`;
  },
  closeMenu() { this.modalEl.style.display = "none"; this.modalEl.innerHTML = ""; },

  /* ----- lifecycle ----- */
  start(id) {
    const w = TOURS.find((t) => t.id === id);
    if (!w) return;
    this.cleanup(false);
    // Full reset on every tour start — never inherit debris (method §10)
    S = freshState();
    S.persona = w.persona;
    this.active = { topicId: id, phase: "intro" };
    if (location.hash !== w.start) location.hash = w.start;
    render();
    this.showIntro(w);
  },
  showIntro(w) {
    const p = PERSONAS[w.persona];
    this.modalEl.style.display = "";
    this.modalEl.innerHTML = `
    <div class="tour-mov">
      <div class="tour-mcard">
        <div class="tm-eyebrow">Walkthrough · ${w.steps.length} steps</div>
        <h2>${esc(w.title)}</h2>
        <p>${esc(w.blurb)}</p>
        <div class="tm-persona intro"><span class="avatar sm ${p.av}">${p.initials}</span><span>You're acting as <b>${esc(p.name)}</b> — ${esc(p.role.toLowerCase())}. The demo has been reset to a clean slate.</span></div>
        <div class="tm-foot">
          <button class="btn btn-quiet" onclick="Tour.cancel()">Cancel</button>
          <button class="btn btn-orange" onclick="Tour.beginSteps()">Start walkthrough</button>
        </div>
      </div>
    </div>`;
  },
  beginSteps() {
    this.modalEl.style.display = "none"; this.modalEl.innerHTML = "";
    document.body.classList.add("tour-lock");
    this.enterPhase(1);
  },
  enterPhase(n) {
    clearTimeout(this._advTimer);
    this.advancing = false;
    this.dragPos = null; // drag resets on step change (method §08)
    const w = this.wiz();
    if (!w) return;
    if (n > w.steps.length) return this.complete();
    this.active.phase = n;
    const step = w.steps[n - 1];
    if (step.route && location.hash !== step.route) location.hash = step.route; // hashchange → render → afterRender
    else render();
  },
  goBack() {
    const p = this.active.phase;
    if (typeof p !== "number" || p <= 1) return;
    const w = this.wiz();
    const prev = w.steps[p - 2];
    if (prev.undo) prev.undo(); // re-enter the previous step in its true pre-state (method §10)
    this.enterPhase(p - 1);
  },
  next() { // learn steps only
    const w = this.wiz();
    if (this.active.phase >= w.steps.length) this.complete();
    else this.enterPhase(this.active.phase + 1);
  },
  cancel(silent) {
    const id = this.active && this.active.topicId;
    this.cleanup();
    if (!silent && id) this.openMenu();
    render();
  },
  complete() {
    const id = this.active.topicId;
    if (!this.progress.completed.includes(id)) this.progress.completed.push(id);
    this.save();
    this.cleanup();
    render();
    this.openMenu(id);
  },
  cleanup(rerender) {
    clearTimeout(this._advTimer);
    this.advancing = false;
    this.active = null;
    this.dragPos = null;
    document.body.classList.remove("tour-lock");
    this.clearHighlights();
    if (this.dimEl) this.dimEl.classList.remove("on");
    if (this.calloutEl) { this.calloutEl.style.display = "none"; this.calloutEl.innerHTML = ""; }
    if (this.modalEl) { this.modalEl.style.display = "none"; this.modalEl.innerHTML = ""; }
    this.renderButton();
  },

  /* ----- highlight / lock (re-applied after every app render) ----- */
  afterRender() {
    this.renderButton();
    if (!this.active || typeof this.active.phase !== "number") return;
    const step = this.curStep();
    if (!step) return;
    this.applyStep(step);
    this.tick();
  },
  applyStep(step) {
    this.clearHighlights();
    document.body.classList.add("tour-lock");
    this.dimEl.classList.add("on");
    let firstRect = null;
    if (!step.center && step.targets) {
      for (const sel of step.targets) {
        document.querySelectorAll(sel).forEach((el) => {
          const cs = getComputedStyle(el);
          const rec = { el, origPos: el.style.position, origZ: el.style.zIndex, origBg: null };
          if (cs.position === "static") el.style.position = "relative";
          el.style.zIndex = "545";
          this._elevated.push(rec);
        });
      }
    }
    // stamp interactive holes — visual scope and interactive scope are independent (method §07)
    (step.active || []).forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.setAttribute("data-tour-active-target", "");
        this._stamped.push(el);
      });
    });
    // scroll target into view before measuring backings/callout
    if (this._elevated.length) {
      const r = this._elevated[0].el.getBoundingClientRect();
      const vh = window.innerHeight;
      if (r.top < 76 || r.bottom > vh - 60) {
        window.scrollTo({ top: Math.max(0, r.top + window.scrollY - Math.max(90, (vh - r.height) / 3)), behavior: "auto" });
      }
      firstRect = this._elevated[0].el.getBoundingClientRect();
    }
    this._placeBackings();
    this.renderCallout(step, firstRect);
  },
  clearHighlights() {
    for (const { el, origPos, origZ } of this._elevated) {
      try { el.style.position = origPos; el.style.zIndex = origZ; } catch (e) {}
    }
    this._elevated = [];
    for (const b of this._backings) b.remove();
    this._backings = [];
    for (const el of this._stamped) { try { el.removeAttribute("data-tour-active-target"); } catch (e) {} }
    this._stamped = [];
  },
  _placeBackings() {
    for (const b of this._backings) b.remove();
    this._backings = [];
    for (const { el } of this._elevated) {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") continue; // opaque already
      const r = el.getBoundingClientRect();
      const d = document.createElement("div");
      d.className = "tour-backing";
      d.style.cssText = `top:${r.top - 8}px;left:${r.left - 8}px;width:${r.width + 16}px;height:${r.height + 16}px;`;
      document.body.appendChild(d);
      this._backings.push(d);
    }
  },
  _reflow() {
    if (!this.active || typeof this.active.phase !== "number") return;
    this._placeBackings();
    if (!this.dragPos) {
      const step = this.curStep();
      const rect = this._elevated.length ? this._elevated[0].el.getBoundingClientRect() : null;
      this._positionCallout(step, rect);
    }
  },

  /* ----- callout (z 550) ----- */
  renderCallout(step, rect) {
    const w = this.wiz();
    const n = this.active.phase, total = w.steps.length;
    const isLast = n === total;
    const backOk = !step.noBack && n > 1;
    this.calloutEl.style.display = "";
    this.calloutEl.innerHTML = `
      <div class="tc-head" data-drag>
        <span class="tc-eyebrow">${esc(w.short || w.title)} · Step ${n} of ${total}</span>
        <button class="tc-cancel" onclick="Tour.cancel()">Cancel</button>
      </div>
      <div class="tc-body">
        ${step.body ? `<p>${step.body}</p>` : ""}
        ${step.kind === "do" ? `<p class="tc-action">${step.action}</p>` : ""}
      </div>
      <div class="tc-foot">
        <span>${backOk ? `<button class="tc-back" onclick="Tour.goBack()">← Back</button>` : ""}</span>
        ${step.kind === "learn"
          ? `<button class="btn sm ${isLast ? "btn-orange" : "btn-primary"}" onclick="Tour.next()">${isLast ? "Done" : "Next"}</button>`
          : `<span class="tc-wait" id="tc-wait">Advances when you've done it</span>`}
      </div>`;
    this._positionCallout(step, rect);
  },
  _positionCallout(step, rect) {
    const el = this.calloutEl;
    const W = 344, pad = 16;
    const vw = window.innerWidth, vh = window.innerHeight;
    el.style.width = W + "px";
    if (this.dragPos) { el.style.left = this.dragPos.x + "px"; el.style.top = this.dragPos.y + "px"; return; }
    const h = el.offsetHeight || 220;
    let x, y;
    if (step.center || !rect) {
      x = (vw - W) / 2; y = Math.max(pad, (vh - h) / 2.4);
    } else {
      // prefer right of the target, then below, then above
      if (rect.right + W + 24 < vw && rect.top + h < vh - pad) { x = rect.right + 20; y = rect.top; }
      else if (rect.bottom + h + 20 < vh) { x = rect.left; y = rect.bottom + 14; }
      else if (rect.top - h - 20 > 0) { x = rect.left; y = rect.top - h - 14; }
      else { x = Math.max(pad, vw - W - 28); y = Math.max(pad, vh - h - 28); }
      x = Math.min(Math.max(pad, x), vw - W - pad);
      y = Math.min(Math.max(pad, y), vh - h - pad);
    }
    el.style.left = x + "px";
    el.style.top = y + "px";
  },
  _dragStart(e) {
    const handle = e.target.closest("[data-drag]");
    if (!handle || e.target.closest("button")) return;
    e.preventDefault();
    const r = this.calloutEl.getBoundingClientRect();
    const ox = e.clientX - r.left, oy = e.clientY - r.top;
    const move = (ev) => {
      this.dragPos = { x: ev.clientX - ox, y: ev.clientY - oy };
      this.calloutEl.style.left = this.dragPos.x + "px";
      this.calloutEl.style.top = this.dragPos.y + "px";
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  },

  /* ----- validated advancement (method §09) ----- */
  tick() {
    const step = this.curStep();
    if (!step || step.kind !== "do" || this.advancing || !step.validate) return;
    let ok = false;
    try { ok = !!step.validate(); } catch (e) { ok = false; }
    if (!ok) return;
    this.advancing = true;
    const waitEl = document.getElementById("tc-wait");
    if (waitEl) { waitEl.textContent = "✓ Nice — moving on…"; waitEl.classList.add("ok"); }
    const delay = step.settle === "slow" ? 950 : 220;
    this._advTimer = setTimeout(() => {
      this.advancing = false;
      const cur = this.curStep();
      let still = false;
      try { still = cur === step && !!step.validate(); } catch (e) {}
      if (still) this.enterPhase(this.active.phase + 1);
    }, delay);
  }
};

/* ---------------- Boot ---------------- */
Tour.boot();
Tour.afterRender();
