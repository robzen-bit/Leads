/* ================================================================
   Zenfolio Network prototype — app logic
   All state is in-memory (session only). Reset via the Demo bar.
   ================================================================ */

"use strict";

/* ---------- State ---------- */
let S = null;
let lastHash = "";

function freshState() {
  return {
    persona: "devon",
    /* Live copies of the vocabularies so members can add suggested or custom entries */
    taxonomy: JSON.parse(JSON.stringify(TAXONOMY)),
    roles: JSON.parse(JSON.stringify(ROLES)),
    topics: JSON.parse(JSON.stringify(TOPICS)),
    towns: JSON.parse(JSON.stringify(TOWNS)),
    recentLocations: ["Carlisle, PA", "York, PA", "Hershey, PA"],
    profiles: JSON.parse(JSON.stringify(DATA_PROFILES)),
    leads: JSON.parse(JSON.stringify(DATA_LEADS)),
    workshops: JSON.parse(JSON.stringify(DATA_WORKSHOPS)),
    availability: JSON.parse(JSON.stringify(DATA_AVAILABILITY)),
    notifs: JSON.parse(JSON.stringify(DATA_NOTIFS)),
    bookings: {},            // workshopId -> [personaKey]
    invites: [],             // {profileId, leadId} sent this session
    myAvailability: {},      // personaKey -> availability id they created
    notifPrefs: { leads: "instant", edu: "instant" },
    seq: 100,
    ui: {
      bellOpen: false,
      addPanel: null,        // "<kind>:<ctx>" of the open add-suggestions panel
      modal: null,           // {type, ...payload}
      compose: null,         // leadId with the interest note box open
      board: { tab: "leads", type: "all", role: "all", dist: "any", when: "any" },
      pw: null,              // post-lead wizard state
      fr: null,              // first-run wizard state
      hw: null,              // host-workshop wizard state
      av: null               // availability form state
    }
  };
}

/* ---------- Tiny helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const me = () => PERSONAS[S.persona];
const myProfile = () => S.profiles.find((p) => p.id === me().profileId);
const typeLabel = (id) => (S.taxonomy.find((t) => t.id === id) || { label: id }).label;
const roleLabel = (id) => (S.roles.find((r) => r.id === id) || { label: id }).label;
const topicLabel = (id) => (S.topics.find((t) => t.id === id) || { label: id }).label;
const townName = (key) => (S.towns[key] ? S.towns[key].name : key);
const profileById = (id) => S.profiles.find((p) => p.id === id);
const uid = (pfx) => pfx + (++S.seq);

function miles(a, b) {
  const A = S.towns[a], B = S.towns[b];
  if (!A || !B) return 999;
  const toR = (d) => (d * Math.PI) / 180, R = 3959;
  const dLat = toR(B.lat - A.lat), dLng = toR(B.lng - A.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(A.lat)) * Math.cos(toR(B.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}
function distLabel(townKey) {
  const d = miles(townKey, me().town);
  return d <= 2 ? "In your area" : d + " mi from you";
}

/* ---------- Matching engine (Section 7 rules) ---------- */
function typeMatches(leadType, profileTypes) {
  if (profileTypes.includes(leadType)) return true;
  const tax = S.taxonomy.find((t) => t.id === leadType);
  if (tax && tax.parent && profileTypes.includes(tax.parent)) return true;      // profile lists parent
  if (tax && tax.children) return tax.children.some((c) => profileTypes.includes(c)); // lead lists parent
  return false;
}
function profileMatchesLead(lead, prof) {
  if (!prof.available) return false;
  if (lead.personaKey && PERSONAS[lead.personaKey].profileId === prof.id) return false;
  if (!lead.shootTypes.some((t) => typeMatches(t, prof.shootTypes))) return false;
  if (miles(lead.town, prof.town) > Math.min(prof.radius, lead.radius)) return false;
  if (!lead.roles.some((r) => prof.roles.includes(r))) return false;
  return true;
}
function matchedLeadsFor(prof) {
  return S.leads
    .filter((l) => l.status === "open" && profileMatchesLead(l, prof))
    .sort((a, b) => miles(a.town, prof.town) - miles(b.town, prof.town));
}
function matchCountForLead(fields) {
  // fields: {shootTypes, roles, town, radius, posterProfileId}
  return S.profiles.filter((p) => {
    if (!p.available || p.id === fields.posterProfileId) return false;
    if (!fields.shootTypes.some((t) => typeMatches(t, p.shootTypes))) return false;
    if (miles(fields.town, p.town) > Math.min(p.radius, fields.radius)) return false;
    if (!fields.roles.some((r) => p.roles.includes(r))) return false;
    return true;
  });
}
function workshopMatchesProfile(w, prof) {
  if (!w.topics.some((t) => prof.wantsToLearn.includes(t))) return false;
  if (w.format === "in-person" && miles(w.town, prof.town) > prof.radius) return false;
  if (w.personaKey && PERSONAS[w.personaKey].profileId === prof.id) return false;
  return true;
}
function eduMatchCount(topics, format, town) {
  return S.profiles.filter((p) => {
    if (p.id === me().profileId) return false;
    if (!topics.some((t) => p.wantsToLearn.includes(t))) return false;
    if (format === "in-person" && miles(town, p.town) > p.radius) return false;
    return true;
  }).length;
}
function completeness(p) {
  let n = 0;
  if (p.shootTypes.length) n += 20;
  if (p.roles.length) n += 15;
  if (p.radius) n += 10;
  if (p.rate) n += 15;
  if (p.gear) n += 15;
  if (p.wantsToLearn.length || p.willingToTeach) n += 15;
  if (p.available) n += 10;
  return n;
}

/* ---------- Notifications & toast ---------- */
function notify(personaKey, text, href) {
  if (!S.notifs[personaKey]) S.notifs[personaKey] = [];
  S.notifs[personaKey].unshift({ text, href, unread: true, ago: "now" });
}
function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("#toast-root").appendChild(el);
  setTimeout(() => el.remove(), 3400);
}

/* ---------- Routing ---------- */
function parseHash() {
  const h = (location.hash || "#/home").replace(/^#\/?/, "");
  const seg = h.split("/").filter(Boolean);
  return { page: seg[0] || "home", id: seg[1] || null };
}
function go(hash) { location.hash = hash; }

/* ================================================================
   Shared components
   ================================================================ */

function chips(typeIds, cls) {
  return `<div class="chip-row">${typeIds.map((t) => `<span class="chip ${cls || ""}">${esc(typeLabel(t))}</span>`).join("")}</div>`;
}

function subnav(active) {
  const tabs = [
    ["home", "Home", "#/home"],
    ["board", "Job Board", "#/board"],
    ["my-posts", "My Posts", "#/my-posts"],
    ["matches", "Matches & Responses", "#/matches"],
    ["learn", "Learn & Teach", "#/learn"],
    ["profile", "Network Profile", "#/profile"]
  ];
  return `<nav class="subnav">${tabs.map(([k, lbl, href]) =>
    `<a href="${href}" data-tour="tab-${k}" class="${k === active ? "active" : ""}">${lbl}</a>`).join("")}</nav>`;
}

function netHeader(active, opts) {
  const o = opts || {};
  return `
    <div class="net-head">
      <div><h1>Network</h1><p class="sub">Member-to-member job leads, availability, and education — commission-free.</p></div>
      <div class="head-actions">
        <a class="btn btn-quiet" data-tour="list-availability" href="#/availability">List availability</a>
        <a class="btn btn-orange" data-tour="post-lead" href="#/post">Post a job lead</a>
      </div>
    </div>
    ${o.noNav ? "" : subnav(active)}`;
}

function leadCard(lead, opts) {
  const o = opts || {};
  const mine = lead.personaKey === S.persona;
  const interested = lead.interested.some((i) => i.profileId === me().profileId && i.status !== "passed");
  let actions = "";
  if (mine) {
    actions = `<a class="btn btn-quiet sm" href="#/manage/${lead.id}">Manage lead</a>`;
  } else if (lead.status !== "open") {
    actions = `<a class="btn btn-quiet sm" href="#/lead/${lead.id}">View details</a>`;
  } else if (interested) {
    actions = `<button class="btn sm done">Interest sent ✓</button><a class="btn btn-ghost sm" href="#/lead/${lead.id}">View details</a>`;
  } else {
    actions = `<button class="btn btn-primary sm" onclick="A.interestFromCard('${lead.id}')">I'm interested</button><a class="btn btn-ghost sm" href="#/lead/${lead.id}">View details</a>`;
  }
  return `
  <article class="card hover lead-card">
    <div class="lead-top">
      <span class="chip-row">${lead.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}
      ${lead.status !== "open" ? `<span class="pill-status ${lead.status}">${lead.status}</span>` : ""}</span>
      <span class="posted-ago">${esc(lead.postedAgo)}</span>
    </div>
    <h3><a href="#/lead/${lead.id}">${esc(lead.title)}</a></h3>
    <div class="lead-meta">${esc(lead.dateLabel)}<span class="dot">·</span>${esc(townName(lead.town))}<span class="dot">·</span>${distLabel(lead.town)}</div>
    <div class="lead-meta"><span class="lead-pay">${esc(lead.pay)}</span><span class="dot">·</span>${lead.roles.map(roleLabel).join(", ")}<span class="dot">·</span>${lead.headcount} needed</div>
    <div class="lead-poster"><span class="avatar sm ${lead.poster.av}">${lead.poster.initials}</span>${esc(lead.poster.studio)}</div>
    <div class="lead-actions">${actions}</div>
  </article>`;
}

function photogCard(prof, opts) {
  const o = opts || {};
  const myOpenLeads = S.leads.filter((l) => l.personaKey === S.persona && l.status === "open");
  const invite = o.invite && myOpenLeads.length
    ? `<select onchange="A.invite('${prof.id}', this.value); this.value='';" aria-label="Invite to your lead" style="width:auto;font-size:12.5px;padding:7px 30px 7px 12px">
        <option value="">Invite to your lead…</option>
        ${myOpenLeads.map((l) => `<option value="${l.id}">${esc(l.title)}</option>`).join("")}
      </select>` : "";
  return `
  <article class="card hover photog-card">
    <div class="photog-head">
      <span class="avatar ${prof.av}">${prof.initials}</span>
      <div class="who"><b>${esc(prof.name)}</b><span>${esc(townName(prof.town))} · ${distLabel(prof.town)}</span></div>
    </div>
    ${chips(prof.shootTypes)}
    <div class="lead-meta">${prof.roles.map(roleLabel).join(", ") || "—"}<span class="dot">·</span>${prof.radius} mi radius${prof.rate ? `<span class="dot">·</span>${esc(prof.rate)}` : ""}</div>
    ${o.note ? `<div class="photog-note">“${esc(o.note)}”</div>` : ""}
    <div class="lead-actions">
      <button class="btn btn-quiet sm" onclick="A.viewProfile('${prof.id}')">View profile</button>
      ${invite}
    </div>
  </article>`;
}

function wsCard(w) {
  const left = w.seats - w.sold;
  const booked = (S.bookings[w.id] || []).includes(S.persona);
  const mine = w.personaKey === S.persona;
  let actions;
  if (mine) {
    actions = `<a class="btn btn-quiet sm" href="#/workshop/${w.id}">Manage listing & roster</a>`;
  } else if (booked) {
    actions = `<button class="btn sm done">Booked ✓</button><a class="btn btn-ghost sm" href="#/workshop/${w.id}">View details</a>`;
  } else if (w.kind !== "mentoring" && left <= 0) {
    actions = `<a class="btn btn-quiet sm" href="#/workshop/${w.id}">Sold out — view details</a>`;
  } else {
    actions = `<a class="btn btn-primary sm" href="#/workshop/${w.id}">View details & book</a>`;
  }
  return `
  <article class="card hover ws-card">
    <div class="ws-cover ${w.cover}"><span class="ws-format">${w.format === "virtual" ? "Virtual" : "In-person"}</span></div>
    <div class="ws-body">
      <h3><a href="#/workshop/${w.id}">${esc(w.title)}</a></h3>
      <div class="ws-host"><span class="avatar sm ${w.hostAv}">${w.hostInitials}</span>${esc(w.hostName)}</div>
      <div class="ws-meta">${esc(w.dateLabel)} · ${esc(w.time)}${w.format === "in-person" ? " · " + esc(townName(w.town)) : ""}</div>
      <div class="chip-row">${w.kind !== "workshop" ? `<span class="chip orange">${esc(kindLabel(w))}</span>` : ""}${w.topics.map((t) => `<span class="chip gray">${esc(topicLabel(t))}</span>`).join("")}</div>
      <div class="ws-foot">
        <span class="ws-price">$${w.price}${w.kind === "mentoring" ? "<span style='font-weight:400;font-size:12px;color:var(--text3)'>/session</span>" : ""}</span>
        <span class="seats-left">${booked ? "Booked ✓" : w.kind === "mentoring" ? "1:1" : left > 0 ? left + " of " + w.seats + " seats left" : "Sold out"}</span>
      </div>
      <div class="lead-actions" style="margin-top:10px">${actions}</div>
    </div>
  </article>`;
}

function emptyState(title, body) {
  return `<div class="empty"><b>${esc(title)}</b>${esc(body)}</div>`;
}

/* ---------- Shared chip picker (shoot types, roles, skill topics) ----------
   Renders the vocabulary as selectable chips plus an "+ Add …" control that
   opens a suggestions dropdown and a create-your-own input. Additions land in
   the session vocabulary (S.taxonomy / S.roles / S.topics) so they flow
   through labels, matching, and filters everywhere. */
const PICKERS = {
  type:  { list: () => S.taxonomy, sugg: () => SUGGESTED_TYPES,  noun: "shoot type", prefix: "custom" },
  role:  { list: () => S.roles,    sugg: () => SUGGESTED_ROLES,  noun: "role",       prefix: "role" },
  topic: { list: () => S.topics,   sugg: () => SUGGESTED_TOPICS, noun: "topic",      prefix: "topic" }
};
function pickerArr(kind, ctx) {
  if (kind === "type") {
    if (ctx === "fr") return S.ui.fr.types;
    if (ctx === "pw") return S.ui.pw.shootTypes;
    if (ctx === "av") return S.ui.av.shootTypes;
    return myProfile().shootTypes;
  }
  if (kind === "role") {
    if (ctx === "fr") return S.ui.fr.roles;
    if (ctx === "pw") return S.ui.pw.roles;
    if (ctx === "av") return S.ui.av.roles;
    return myProfile().roles;
  }
  if (ctx === "fr") return S.ui.fr.learn;
  if (ctx === "hw") return S.ui.hw.topics;
  return myProfile().wantsToLearn;
}
function picker(kind, ctx, selected) {
  const cfg = PICKERS[kind];
  const list = cfg.list().filter((t) => !t.children);
  const key = kind + ":" + ctx;
  const open = S.ui.addPanel === key;
  const sugg = cfg.sugg().filter((s) => !cfg.list().some((t) => t.id === s.id));
  return `
  <div class="chip-row" style="gap:8px">
    ${list.map((t) => `<button class="chip-select ${selected.includes(t.id) ? "on" : ""}" onclick="A.pickToggle('${kind}','${ctx}','${t.id}')"><span class="tick">✓ </span>${t.group === "Volume" ? "Volume · " : ""}${esc(t.label)}</button>`).join("")}
    <button class="chip-select add" onclick="A.addPanelToggle('${kind}','${ctx}')" aria-expanded="${open}">+ Add ${cfg.noun}</button>
  </div>
  ${open ? `
  <div class="add-panel">
    <p class="add-panel-head">Suggestions</p>
    <div class="chip-row" style="gap:6px">
      ${sugg.length ? sugg.map((s) => `<button class="chip-select" onclick="A.addSuggestedItem('${kind}','${ctx}','${s.id}')">+ ${esc(s.label)}</button>`).join("")
        : `<span class="hint-inline">All suggestions added — create your own below.</span>`}
    </div>
    <div class="add-panel-custom">
      <input type="text" id="custom-add-input" placeholder="Or create your own ${cfg.noun}…" onkeydown="if(event.key==='Enter'){event.preventDefault();A.addCustomItem('${kind}','${ctx}')}">
      <button class="btn btn-primary sm" onclick="A.addCustomItem('${kind}','${ctx}')">Add</button>
    </div>
  </div>` : ""}`;
}

/* ---------- Offering kind label (workshop / mentoring / tour / custom) ---------- */
function kindLabel(w) {
  if (w.kind === "workshop") return "Workshop";
  if (w.kind === "mentoring") return "Mentoring";
  if (w.kind === "tour") return "Photo Tour";
  return w.kindCustom || "Session";
}

/* ---------- Free-entry location field with recents + suggestions ---------- */
function locState(ctx) { return ctx === "pw" ? S.ui.pw : S.ui.hw; }
function locField(ctx, label, hint, err) {
  const st = locState(ctx);
  return `
  <div class="field"><label>${label}</label>
    <div class="loc-field">
      <input type="text" id="loc-input-${ctx}" value="${esc(st.townLabel)}" autocomplete="off" placeholder="City or ZIP"
        oninput="A.locInput('${ctx}', this.value)" onfocus="A.locFocus('${ctx}')">
      <div class="loc-dd" id="loc-dd-${ctx}"></div>
    </div>
    ${err ? `<p class="err">${err}</p>` : hint ? `<p class="hint">${hint}</p>` : ""}
  </div>`;
}
function paintLocDD(ctx) {
  const el = document.getElementById("loc-dd-" + ctx);
  if (!el) return;
  const st = locState(ctx);
  const q = (st.townLabel || "").toLowerCase().trim();
  const recents = S.recentLocations.filter((r) => !q || r.toLowerCase().includes(q)).slice(0, 5);
  const shown = new Set(recents.map((r) => r.toLowerCase()));
  const towns = Object.keys(S.towns).filter((k) => {
    const nm = S.towns[k].name.toLowerCase();
    return !shown.has(nm) && (!q || nm.includes(q));
  }).slice(0, 6);
  let html = "";
  if (recents.length) html += `<p class="loc-head">Recent</p>` + recents.map((r) =>
    `<button class="loc-item" onclick="A.locPickRecent('${ctx}', ${S.recentLocations.indexOf(r)})">${esc(r)}</button>`).join("");
  if (towns.length) html += `<p class="loc-head">Suggestions</p>` + towns.map((k) =>
    `<button class="loc-item" onclick="A.locPickTown('${ctx}','${k}')">${esc(S.towns[k].name)}</button>`).join("");
  if (!html) html = `<p class="loc-none">No matches — we'll add “${esc(st.townLabel)}” as a new location.</p>`;
  el.innerHTML = html;
  el.style.display = "block";
}
function resolveLoc(text) {
  const t = (text || "").toLowerCase().trim();
  if (!t) return null;
  if (typeof ZIP_MAP !== "undefined" && ZIP_MAP[t]) return ZIP_MAP[t];
  const norm = t.replace(/,?\s*pa\.?$/, "").trim();
  if (!norm) return null;
  const keys = Object.keys(S.towns);
  return keys.find((k) => S.towns[k].name.toLowerCase().replace(", pa", "") === norm)
      || (norm.length >= 3 ? keys.find((k) => S.towns[k].name.toLowerCase().startsWith(norm)) : null)
      || null;
}
function ensureLoc(st) {
  if (st.town && S.towns[st.town]) return true;
  const label = (st.townLabel || "").trim();
  if (!label) return false;
  const key = "loc-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!S.towns[key]) {
    // Demo simplification: unrecognized locations anchor to the member's home base for distance math
    const base = S.towns[me().town];
    const pretty = /^\d{5}$/.test(label) ? "ZIP " + label : label.replace(/\b[a-z]/g, (c) => c.toUpperCase());
    S.towns[key] = { name: pretty, lat: base.lat, lng: base.lng, custom: true };
  }
  st.town = key;
  return true;
}
function addRecent(label) {
  const i = S.recentLocations.findIndex((r) => r.toLowerCase() === label.toLowerCase());
  if (i >= 0) S.recentLocations.splice(i, 1);
  S.recentLocations.unshift(label);
  if (S.recentLocations.length > 6) S.recentLocations.pop();
}

/* ================================================================
   Views
   ================================================================ */

/* ---------- Home ---------- */
function vHome() {
  const prof = myProfile();
  const matched = matchedLeadsFor(prof);
  const myLeads = S.leads.filter((l) => l.personaKey === S.persona);
  const isPosterMode = !prof.available && myLeads.length;

  // Zone 1: leads for you (or open-leads summary for poster-mode accounts)
  let zone1;
  if (isPosterMode) {
    zone1 = `
    <section class="section" data-tour="zone-leads">
      <div class="section-head"><h2>Your open leads</h2><a class="link see-all" href="#/my-posts">My posts →</a></div>
      <div class="card-grid cols-2">${myLeads.filter((l) => l.status === "open").map((l) => leadCard(l)).join("") || emptyState("No open leads", "Post a job lead to reach qualified photographers near your event.")}</div>
    </section>`;
  } else if (matched.length) {
    zone1 = `
    <section class="section" data-tour="zone-leads">
      <div class="section-head"><h2>Leads for you</h2><a class="link see-all" href="#/board">Job board →</a></div>
      <div class="card-grid cols-2">${matched.slice(0, 4).map((l) => leadCard(l)).join("")}</div>
    </section>`;
  } else {
    zone1 = `
    <section class="section" data-tour="zone-leads">
      <div class="section-head"><h2>Leads for you</h2><a class="link see-all" href="#/board">Job board →</a></div>
      ${emptyState("No matching leads yet. You'll get a notification the moment one is posted.", "Try widening your travel radius or adding shoot types to your network profile.")}
    </section>`;
  }

  // Zone 2: availability near you (volume accounts / recent posters)
  let zone2 = "";
  if (me().isVolume || myLeads.length) {
    const avail = S.availability
      .map((a) => ({ a, p: profileById(a.profileId) }))
      .filter((x) => x.p && x.p.id !== me().profileId)
      .sort((x, y) => miles(x.p.town, me().town) - miles(y.p.town, me().town))
      .slice(0, 3);
    zone2 = `
    <section class="section" data-tour="zone-availability">
      <div class="section-head"><h2>Availability near you</h2><a class="link see-all" href="#/board/avail">Browse all →</a></div>
      <div class="card-grid cols-3">${avail.map((x) => photogCard(x.p, { invite: true, note: x.a.note })).join("")}</div>
    </section>`;
  }

  // Educator zone for hosts
  let zoneHost = "";
  const hosted = S.workshops.filter((w) => w.personaKey === S.persona);
  if (hosted.length) {
    const seats = hosted.reduce((n, w) => n + w.sold, 0);
    const rev = hosted.reduce((n, w) => n + w.sold * w.price, 0);
    zoneHost = `
    <section class="section">
      <div class="section-head"><h2>Your teaching at a glance</h2><a class="link see-all" href="#/learn">Learn & Teach →</a></div>
      <div class="card">
        <div class="host-stats">
          <div class="stat"><b>${hosted.length}</b><span>live offerings</span></div>
          <div class="stat"><b>${seats}</b><span>seats sold</span></div>
          <div class="stat"><b>$${rev.toLocaleString()}</b><span>gross revenue</span></div>
        </div>
      </div>
    </section>`;
  }

  // Zone 3: learn something new
  const wsMatched = S.workshops.filter((w) => workshopMatchesProfile(w, prof));
  const wsShow = (wsMatched.length ? wsMatched : S.workshops.filter((w) => w.personaKey !== S.persona)).slice(0, 3);
  const zone3 = `
    <section class="section" data-tour="zone-learn">
      <div class="section-head"><h2>Learn something new${wsMatched.length ? " — matched to your interests" : ""}</h2><a class="link see-all" href="#/learn">Learn & Teach →</a></div>
      <div class="card-grid cols-3">${wsShow.map(wsCard).join("")}</div>
    </section>`;

  // Right rail
  const pct = completeness(prof);
  const rail = `
    <aside class="rail">
      <div class="card">
        <h3 style="margin-bottom:10px">Your network profile</h3>
        <div class="rail-row">
          <span class="avatar ${me().av}">${me().initials}</span>
          <div style="font-size:13px"><b>${esc(me().name)}</b><br><span style="color:var(--text3);font-size:12px">${esc(townName(me().town))}</span></div>
        </div>
        <div class="rail-row" style="margin-top:12px">
          <span class="status-dot ${prof.available ? "" : "off"}"></span>
          <span style="font-size:12.5px;color:var(--text2)">${prof.available ? "Receiving lead matches" : "Lead matches off — posting only"}</span>
        </div>
        <div class="meter"><i style="width:${pct}%"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text3)">
          <span>Profile ${pct}% complete</span><a class="link" href="#/profile">Edit</a>
        </div>
      </div>
      <div class="card">
        <h3 style="margin-bottom:6px">How matching works</h3>
        <p style="font-size:12.5px;color:var(--text2);margin-bottom:10px">Leads reach you only when shoot type, role, and distance all line up — and only if your toggle is on.</p>
        <button class="link" style="font-size:13px" onclick="A.openModal('matching')">See the rules →</button>
      </div>
      <div class="card" style="background:var(--text);color:#fff">
        <h3 style="color:#fff;margin-bottom:6px">Why this is different</h3>
        <p style="font-size:12.5px;color:rgba(255,255,255,.72)">Member-to-member. Push-based. Commission-free. Zenfolio introduces members — the work stays yours.</p>
      </div>
    </aside>`;

  return `${netHeader("home")}
    <div class="home-grid">
      <div>${zone1}${zone2}${zoneHost}${zone3}</div>
      ${rail}
    </div>`;
}

/* ---------- First-run explainer + wizard ---------- */
function vFirstRun() {
  if (S.ui.fr) return vFirstRunWizard();
  return `
  <div class="fr-hero">
    <span class="eyebrow">New · Zenfolio Network</span>
    <h1>Half a million photographers. Now, one network.</h1>
    <p>Job leads, second shooters, and workshops — matched to what you shoot and where you are, inside the platform you already use.</p>
  </div>
  <div class="fr-cols">
    <div class="fr-col">
      <div class="ico o">📣</div>
      <h3>Find coverage</h3>
      <p>Staff every photo day with confidence. Push a job lead to qualified photographers near your event in minutes, not days of Facebook posts.</p>
    </div>
    <div class="fr-col">
      <div class="ico t">📬</div>
      <h3>Find work</h3>
      <p>Job leads come to you. Set what you shoot and where, and get notified when studios near you need coverage. Free with your membership.</p>
    </div>
    <div class="fr-col">
      <div class="ico o">🎓</div>
      <h3>Teach & learn</h3>
      <p>Teach what you know. Host workshops and mentoring through Zenfolio and reach photographers who want to learn from you.</p>
    </div>
  </div>
  <div class="fr-diff">
    <h3>Why this is different</h3>
    <div class="fr-diff-row">
      <div><b>Member-to-member</b><span>Everything stays behind login. No consumer visibility, no strangers — just verified Zenfolio members.</span></div>
      <div><b>Push, not pull</b><span>Your profile is pre-filled from data you already gave us. Matches find you — there's no new site to remember to check.</span></div>
      <div><b>Commission-free</b><span>We connect, you transact. Zenfolio takes no cut, sets no rates, and never owns your client relationship.</span></div>
    </div>
  </div>
  <div class="fr-cta">
    <button class="btn btn-orange lg" onclick="A.frStart()">Set up your network profile</button>
    <p class="fr-trust">Opt-in only. Until you join, no one can see you and you receive nothing.</p>
  </div>`;
}

function frStepsBar(step) {
  const names = ["What you shoot", "Where & roles", "Teach & learn"];
  return `<div class="wizard-steps">${names.map((n, i) => {
    const num = i + 1;
    const cls = num < step ? "done" : num === step ? "on" : "";
    return `${i ? '<span class="wstep-line"></span>' : ""}<span class="wstep ${cls}"><span class="num">${num < step ? "✓" : num}</span>${n}</span>`;
  }).join("")}</div>`;
}

function vFirstRunWizard() {
  const f = S.ui.fr;
  let body = "";
  if (f.step === 1) {
    body = `
      <h2 style="margin-bottom:4px">What do you shoot?</h2>
      <p style="color:var(--text2);font-size:13.5px;margin-bottom:14px">Matching starts with shoot type. Pick everything you'd take paid work in.</p>
      <span class="prefill-note">✨ We pre-filled this from your galleries</span>
      ${picker("type", "fr", f.types)}`;
  } else if (f.step === 2) {
    body = `
      <h2 style="margin-bottom:4px">Where, and in what role?</h2>
      <p style="color:var(--text2);font-size:13.5px;margin-bottom:16px">We'll only send leads inside your travel radius.</p>
      <div class="field"><label>Home base</label>
        <div class="readonly-box">${esc(townName(me().town))}<span class="tag">From your account</span></div>
      </div>
      <div class="field"><label>Travel radius</label>
        <select onchange="A.frSet('radius', parseInt(this.value))">
          ${[25, 50, 100, 150].map((r) => `<option value="${r}" ${f.radius === r ? "selected" : ""}>${r} miles</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Roles you'll take</label>
        ${picker("role", "fr", f.roles)}
      </div>
      <div class="field"><label>Rate guidance <span style="color:var(--text3);font-weight:400">(optional)</span></label>
        <input type="text" placeholder="e.g. $50–75/hr" value="${esc(f.rate)}" oninput="A.frSet('rate', this.value)">
        <p class="hint">Shown on your card when you express interest.</p>
      </div>`;
  } else {
    body = `
      <h2 style="margin-bottom:4px">Teaching & learning</h2>
      <p style="color:var(--text2);font-size:13.5px;margin-bottom:16px">This powers workshop matching — separate from job leads.</p>
      <div class="field"><label>I want to learn</label>
        ${picker("topic", "fr", f.learn)}
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--line)">
        <div class="switch-row">
          <div class="lbl"><b>I'm willing to teach</b><span>We'll surface hosting tools and show you who nearby wants to learn.</span></div>
          <label class="switch"><input type="checkbox" ${f.teach ? "checked" : ""} onchange="A.frSet('teach', this.checked)"><i></i></label>
        </div>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--line);margin-top:14px">
        <h3 style="font-size:13.5px;margin-bottom:8px">Review</h3>
        <p style="font-size:12.5px;color:var(--text2)">
          <b>${f.types.length}</b> shoot types · <b>${f.roles.length}</b> roles · <b>${f.radius} mi</b> radius from ${esc(townName(me().town))}${f.learn.length ? ` · learning: ${f.learn.map(topicLabel).join(", ")}` : ""}
        </p>
      </div>`;
  }
  if (f.done) {
    return `<div class="wizard"><div class="card pad-lg success-panel">
      <div class="success-check">✓</div>
      <h2>You're in.</h2>
      <p>We'll notify you when a matching lead is posted. Nothing reaches you unless shoot type, role, and distance all line up.</p>
      <a class="btn btn-primary lg" href="#/home">Go to Network Home</a>
    </div></div>`;
  }
  return `<div class="wizard">
    ${frStepsBar(f.step)}
    <div class="card pad-lg">${body}</div>
    <div class="wizard-foot">
      <button class="btn btn-ghost" onclick="A.frBack()">${f.step === 1 ? "Cancel" : "Back"}</button>
      <button class="btn ${f.step === 3 ? "btn-orange" : "btn-primary"}" onclick="A.frNext()">${f.step === 3 ? "Join the Network" : "Continue"}</button>
    </div>
  </div>`;
}

/* ---------- Post a Job Lead wizard ---------- */
function pwStepsBar(step) {
  const names = ["The job", "Location & pay", "Details & preview"];
  return `<div class="wizard-steps">${names.map((n, i) => {
    const num = i + 1;
    const cls = num < step ? "done" : num === step ? "on" : "";
    return `${i ? '<span class="wstep-line"></span>' : ""}<span class="wstep ${cls}"><span class="num">${num < step ? "✓" : num}</span>${n}</span>`;
  }).join("")}</div>`;
}

function vPostWizard() {
  const w = S.ui.pw;
  if (w.published) {
    const lead = S.leads.find((l) => l.id === w.published);
    return `<div class="wizard"><div class="card pad-lg success-panel">
      <div class="success-check">✓</div>
      <h2>Your lead is live.</h2>
      <p>We notified <b>${w.notifiedCount} matching photographer${w.notifiedCount === 1 ? "" : "s"}</b> near ${esc(townName(lead.town))}. You'll hear the moment someone's interested.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <a class="btn btn-primary" href="#/my-posts">View in My Posts</a>
        <button class="btn btn-quiet" onclick="A.pwStart()">Post another</button>
      </div>
    </div></div>`;
  }
  let body = "";
  if (w.step === 1) {
    body = `
      <h2 style="margin-bottom:16px">The job</h2>
      <div class="field"><label>Title</label>
        <input type="text" value="${esc(w.title)}" oninput="A.pwSet('title', this.value)" placeholder="e.g. Second shooter — fall sports day">
        ${w.errs.title ? `<p class="err">${w.errs.title}</p>` : ""}
      </div>
      <div class="field"><label>Shoot type</label>
        ${picker("type", "pw", w.shootTypes)}
        ${w.errs.shootTypes ? `<p class="err">${w.errs.shootTypes}</p>` : ""}
      </div>
      <div class="field"><label>Role needed</label>
        ${picker("role", "pw", w.roles)}
        ${w.errs.roles ? `<p class="err">${w.errs.roles}</p>` : ""}
      </div>
      <div class="form-row">
        <div class="field"><label>How many photographers?</label>
          <select onchange="A.pwSet('headcount', parseInt(this.value))">
            ${[1, 2, 3, 4].map((n) => `<option value="${n}" ${w.headcount === n ? "selected" : ""}>${n}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Date</label>
          <input type="text" value="${esc(w.dateLabel)}" oninput="A.pwSet('dateLabel', this.value)" placeholder="e.g. Sat, Oct 10">
        </div>
      </div>
      <div class="field"><label>Time window</label>
        <input type="text" value="${esc(w.time)}" oninput="A.pwSet('time', this.value)" placeholder="e.g. 8:00 AM – 2:00 PM">
      </div>`;
  } else if (w.step === 2) {
    body = `
      <h2 style="margin-bottom:16px">Location & pay</h2>
      ${locField("pw", "Location (city or ZIP)", "Exact address shared after you connect — matched photographers see the town only.", w.errs.town)}
      <div class="field"><label>Search radius</label>
        <select onchange="A.pwSet('radius', parseInt(this.value))">
          ${[25, 50, 100].map((r) => `<option value="${r}" ${w.radius === r ? "selected" : ""}>${r} miles</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Pay (required)</label>
        <input type="text" value="${esc(w.pay)}" oninput="A.pwSet('pay', this.value)" placeholder="e.g. $45/hr or $300 flat">
        ${w.errs.pay ? `<p class="err">${w.errs.pay}</p>` : `<p class="hint good">Leads with pay listed get 3× more responses.</p>`}
      </div>`;
  } else {
    const matches = matchCountForLead({ shootTypes: w.shootTypes, roles: w.roles, town: w.town, radius: w.radius, posterProfileId: me().profileId });
    body = `
      <h2 style="margin-bottom:16px">Details & preview</h2>
      <div class="field"><label>Description</label>
        <textarea oninput="A.pwSet('description', this.value)" placeholder="What's the day like? What will they own?">${esc(w.description)}</textarea>
      </div>
      <div class="field"><label>Gear requirements <span style="color:var(--text3);font-weight:400">(optional)</span></label>
        <input type="text" value="${esc(w.gear)}" oninput="A.pwSet('gear', this.value)" placeholder="e.g. Full-frame body, 70-200mm">
      </div>
      <div class="match-preview">
        <span class="num-big">${matches.length}</span>
        <p><b>This will notify ${matches.length} matching photographer${matches.length === 1 ? "" : "s"}.</b>
        Matched on shoot type, role, and distance from ${esc(townName(w.town))} — the moment you publish.</p>
      </div>
      <div class="card" style="box-shadow:none;border:1px solid var(--line)">
        <div class="lead-top"><span class="chip-row">${w.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}</span><span class="posted-ago">Preview</span></div>
        <h3 style="margin:7px 0 4px">${esc(w.title) || "Untitled lead"}</h3>
        <div class="lead-meta">${esc(w.dateLabel)}<span class="dot">·</span>${esc(townName(w.town))}</div>
        <div class="lead-meta"><span class="lead-pay">${esc(w.pay)}</span><span class="dot">·</span>${w.roles.map(roleLabel).join(", ")}<span class="dot">·</span>${w.headcount} needed</div>
      </div>`;
  }
  return `<div class="wizard">
    ${pwStepsBar(w.step)}
    <div class="card pad-lg">${body}</div>
    <div class="wizard-foot">
      <button class="btn btn-ghost" onclick="A.pwBack()">${w.step === 1 ? "Cancel" : "Back"}</button>
      <button class="btn ${w.step === 3 ? "btn-orange" : "btn-primary"}" onclick="A.pwNext()">${w.step === 3 ? "Publish lead" : "Continue"}</button>
    </div>
  </div>`;
}

/* ---------- Lead detail (photographer view) ---------- */
function vLeadDetail(id) {
  const lead = S.leads.find((l) => l.id === id);
  if (!lead) return emptyState("Lead not found", "It may have been closed.");
  if (!lead._viewedBy) lead._viewedBy = [];
  if (!lead._viewedBy.includes(S.persona) && lead.personaKey !== S.persona) {
    lead._viewedBy.push(S.persona);
    lead.stats.viewed++;
  }
  const mine = lead.personaKey === S.persona;
  const myInterest = lead.interested.find((i) => i.profileId === me().profileId && i.status !== "passed");
  const composeOpen = S.ui.compose === lead.id;

  let action;
  if (mine) {
    action = `<a class="btn btn-primary" href="#/manage/${lead.id}">Manage this lead</a>`;
  } else if (lead.status !== "open") {
    action = `<button class="btn done">This lead is ${lead.status}</button>`;
  } else if (myInterest) {
    action = `
      <button class="btn done">Interest sent ✓</button>
      <button class="btn disabled-soon" disabled>Message (coming soon)</button>
      <p style="font-size:12.5px;color:var(--text3);margin-top:12px;max-width:420px">The poster will see your network profile and portfolio. If they connect, you'll both receive each other's contact info by email.</p>`;
  } else if (composeOpen) {
    action = `
      <div class="compose-box">
        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:7px">Add a short note <span style="color:var(--text3);font-weight:400">(optional)</span></label>
        <textarea id="interest-note" maxlength="140" placeholder="Why you're a fit — 140 characters" oninput="document.getElementById('cc').textContent=(140-this.value.length)+' left'"></textarea>
        <div class="char-count" id="cc">140 left</div>
        <div style="display:flex;gap:9px;margin-top:10px">
          <button class="btn btn-primary sm" onclick="A.interestSend('${lead.id}')">Send interest</button>
          <button class="btn btn-ghost sm" onclick="A.interestCancel()">Cancel</button>
        </div>
      </div>`;
  } else {
    action = `<button class="btn btn-primary" onclick="A.interestStart('${lead.id}')">I'm interested</button>`;
  }

  return `${netHeader("board", { noNav: true })}
  <a class="back-link" href="#/board">← Back to job board</a>
  <div class="detail-grid">
    <div class="card pad-lg" data-tour="lead-detail">
      <div class="detail-title-row">
        <div>
          <div class="chip-row" style="margin-bottom:9px">${lead.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}
            <span class="pill-status ${lead.status}">${lead.status}</span></div>
          <h1 style="font-size:22px">${esc(lead.title)}</h1>
        </div>
        <span class="posted-ago">${esc(lead.postedAgo)}</span>
      </div>
      <div class="info-rows">
        <div class="info-row"><span class="k">Date</span><span class="v">${esc(lead.dateLabel)} · ${esc(lead.time)}</span></div>
        <div class="info-row"><span class="k">Location</span><span class="v">${esc(townName(lead.town))} · ${distLabel(lead.town)} <span style="color:var(--text3)">— exact address shared after you connect</span></span></div>
        <div class="info-row"><span class="k">Pay</span><span class="v"><b>${esc(lead.pay)}</b></span></div>
        <div class="info-row"><span class="k">Role</span><span class="v">${lead.roles.map(roleLabel).join(", ")} · ${lead.headcount} needed</span></div>
        <div class="info-row"><span class="k">Gear</span><span class="v">${esc(lead.gear || "—")}</span></div>
      </div>
      <h3 style="margin-bottom:7px">About this job</h3>
      <p style="color:var(--text2);font-size:13.5px">${esc(lead.description)}</p>
      <div style="margin-top:22px" data-tour="lead-action">${action}</div>
      <div class="disclaimer">Zenfolio introduces members. Rates, contracts, and working arrangements are between you. This is a lead, not employment — Zenfolio is not a staffing agency and does not vet or endorse members.</div>
      <p style="margin-top:12px"><button class="link subtle" onclick="A.report()">Report this post</button></p>
    </div>
    <aside>
      <div class="card">
        <h3 style="margin-bottom:12px">Posted by</h3>
        <div class="photog-head">
          <span class="avatar ${lead.poster.av}">${lead.poster.initials}</span>
          <div class="who"><b>${esc(lead.poster.studio)}</b><span>${esc(lead.poster.name)}</span></div>
        </div>
        <div style="margin-top:13px">
          <button class="btn btn-quiet sm" onclick="A.portfolio('${esc(lead.poster.portfolio)}')">View Zenfolio portfolio</button>
        </div>
      </div>
    </aside>
  </div>`;
}

/* ---------- Job Board ---------- */
function vBoard(sub) {
  const b = S.ui.board;
  if (sub === "avail") b.tab = "avail";
  else if (sub === "leads") b.tab = "leads";
  const tabs = `
  <div class="board-tabs" data-tour="board-tabs">
    <a href="#/board/leads" class="${b.tab === "leads" ? "active" : ""}">Job leads</a>
    <a href="#/board/avail" class="${b.tab === "avail" ? "active" : ""}">Available photographers</a>
  </div>`;

  if (b.tab === "avail") {
    const rows = S.availability
      .map((a) => ({ a, p: profileById(a.profileId) }))
      .filter((x) => x.p)
      .sort((x, y) => miles(x.p.town, me().town) - miles(y.p.town, me().town));
    return `${netHeader("board")}${tabs}
      <div class="card-grid cols-3" data-tour="avail-grid">
        ${rows.map((x) => photogCard(x.p, { invite: true, note: x.a.note + " — " + x.a.dates })).join("") || emptyState("No availability listed", "Photographers who broadcast open dates appear here.")}
      </div>`;
  }

  const today = "2026-08-12";
  const horizon = { "7": "2026-08-19", "30": "2026-09-11", "60": "2026-10-11" };
  let rows = S.leads.slice();
  if (b.type !== "all") rows = rows.filter((l) => l.shootTypes.some((t) => typeMatches(t, [b.type])));
  if (b.role !== "all") rows = rows.filter((l) => l.roles.includes(b.role));
  if (b.dist !== "any") rows = rows.filter((l) => miles(l.town, me().town) <= parseInt(b.dist));
  if (b.when !== "any") rows = rows.filter((l) => l.dateISO >= today && l.dateISO <= horizon[b.when]);
  rows.sort((a, b2) => miles(a.town, me().town) - miles(b2.town, me().town));

  return `${netHeader("board")}${tabs}
  <div class="filter-bar">
    <select onchange="A.boardFilter('type', this.value)" aria-label="Shoot type">
      <option value="all">All shoot types</option>
      ${S.taxonomy.map((t) => `<option value="${t.id}" ${b.type === t.id ? "selected" : ""}>${t.group === "Volume" && !t.children ? "Volume · " : ""}${esc(t.label)}</option>`).join("")}
    </select>
    <select onchange="A.boardFilter('role', this.value)" aria-label="Role">
      <option value="all">All roles</option>
      ${S.roles.map((r) => `<option value="${r.id}" ${b.role === r.id ? "selected" : ""}>${esc(r.label)}</option>`).join("")}
    </select>
    <select onchange="A.boardFilter('dist', this.value)" aria-label="Distance">
      <option value="any">Any distance</option>
      ${[25, 50, 100].map((d) => `<option value="${d}" ${b.dist == d ? "selected" : ""}>Within ${d} mi</option>`).join("")}
    </select>
    <select onchange="A.boardFilter('when', this.value)" aria-label="Date">
      <option value="any">Any date</option>
      <option value="7" ${b.when === "7" ? "selected" : ""}>Next 7 days</option>
      <option value="30" ${b.when === "30" ? "selected" : ""}>Next 30 days</option>
      <option value="60" ${b.when === "60" ? "selected" : ""}>Next 60 days</option>
    </select>
    <span class="count">${rows.length} lead${rows.length === 1 ? "" : "s"} · sorted by distance</span>
  </div>
  <div class="card-grid cols-2">
    ${rows.map((l) => leadCard(l)).join("") || emptyState("No leads match those filters", "Try widening the distance or clearing a filter.")}
  </div>`;
}

/* ---------- My Posts ---------- */
function vMyPosts() {
  const myLeads = S.leads.filter((l) => l.personaKey === S.persona);
  const myWs = S.workshops.filter((w) => w.personaKey === S.persona);
  const myAvId = S.myAvailability[S.persona];
  const myAv = myAvId ? S.availability.find((a) => a.id === myAvId) : null;

  const leadRows = myLeads.map((l) => {
    const activeInterest = l.interested.filter((i) => i.status !== "passed").length;
    return `
    <article class="card hover lead-card">
      <div class="lead-top">
        <span class="chip-row">${l.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}
        <span class="pill-status ${l.status}">${l.status}</span></span>
        <span class="posted-ago">${esc(l.postedAgo)}</span>
      </div>
      <h3><a href="#/manage/${l.id}">${esc(l.title)}</a></h3>
      <div class="lead-meta">${esc(l.dateLabel)}<span class="dot">·</span>${esc(townName(l.town))}<span class="dot">·</span><span class="lead-pay">${esc(l.pay)}</span></div>
      <div class="lead-meta">${l.stats.notified} notified<span class="dot">·</span>${l.stats.viewed} viewed<span class="dot">·</span><b>${activeInterest} interested</b></div>
      <div class="lead-actions"><a class="btn btn-primary sm" href="#/manage/${l.id}">Review responses${activeInterest ? " (" + activeInterest + ")" : ""}</a></div>
    </article>`;
  }).join("");

  const wsRows = myWs.map((w) => `
    <article class="card hover lead-card">
      <div class="lead-top"><span class="chip-row"><span class="chip orange">${esc(kindLabel(w))}</span><span class="chip gray">${w.format === "virtual" ? "Virtual" : "In-person"}</span></span></div>
      <h3><a href="#/workshop/${w.id}">${esc(w.title)}</a></h3>
      <div class="lead-meta">${esc(w.dateLabel)}<span class="dot">·</span>$${w.price}<span class="dot">·</span><b>${w.sold} of ${w.seats} seats sold</b></div>
      <div class="lead-actions"><a class="btn btn-quiet sm" href="#/workshop/${w.id}">View listing & roster</a></div>
    </article>`).join("");

  return `${netHeader("my-posts")}
  <section class="section">
    <div class="section-head"><h2>Job leads</h2><a class="btn btn-orange sm" href="#/post">Post a job lead</a></div>
    <div class="card-grid cols-2" data-tour="myposts-leads">${leadRows || emptyState("No leads posted yet", "Post a job lead and we'll notify matching photographers near your event.")}</div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Availability listings</h2><a class="btn btn-quiet sm" href="#/availability">List availability</a></div>
    ${myAv ? `<div class="card-grid cols-2"><article class="card lead-card">
      <div class="lead-top"><span class="chip-row">${myAv.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}</span><span class="posted-ago">${esc(myAv.postedAgo)}</span></div>
      <h3>${esc(myAv.dates)}</h3>
      <div class="lead-meta">${myAv.roles.map(roleLabel).join(", ")}<span class="dot">·</span>${myAv.radius} mi radius</div>
      ${myAv.note ? `<div class="photog-note">“${esc(myAv.note)}”</div>` : ""}
    </article></div>` : emptyState("No availability listed", "Broadcast open dates so posters can find and invite you.")}
  </section>
  <section class="section">
    <div class="section-head"><h2>Workshops & mentoring</h2><a class="btn btn-quiet sm" href="#/host">Host a workshop</a></div>
    <div class="card-grid cols-2">${wsRows || emptyState("Nothing hosted yet", "Teach what you know — host a workshop or offer 1:1 mentoring.")}</div>
  </section>`;
}

/* ---------- Lead management (poster view) ---------- */
function vManage(id) {
  const lead = S.leads.find((l) => l.id === id);
  if (!lead) return emptyState("Lead not found", "");
  const active = lead.interested.filter((i) => i.status !== "passed");
  const connected = lead.interested.filter((i) => i.status === "connected");
  const headcountMet = connected.length >= lead.headcount && lead.status === "open";

  const cards = lead.interested.map((i) => {
    const p = profileById(i.profileId);
    if (!p) return "";
    const passed = i.status === "passed";
    const conn = i.status === "connected";
    let btns;
    if (conn) {
      btns = `<span class="badge-connected">✓ Connected</span><button class="btn disabled-soon sm" disabled>Message (coming soon)</button>`;
    } else if (passed) {
      btns = `<span style="color:var(--text3);font-size:12.5px">Passed</span><button class="link subtle" onclick="A.undoPass('${lead.id}','${p.id}')">Undo</button>`;
    } else {
      btns = `<button class="btn btn-primary sm" onclick="A.connectStart('${lead.id}','${p.id}')">Connect</button>
              <button class="btn btn-quiet sm" onclick="A.pass('${lead.id}','${p.id}')">Pass</button>`;
    }
    return `
    <article class="card photog-card ${passed ? "passed" : ""}">
      <div class="photog-head">
        <span class="avatar ${p.av}">${p.initials}</span>
        <div class="who"><b>${esc(p.name)}</b><span>${esc(townName(p.town))} · ${miles(p.town, lead.town)} mi from the job${p.rate ? " · " + esc(p.rate) : ""}</span></div>
      </div>
      ${chips(p.shootTypes)}
      <div class="lead-meta">${p.roles.map(roleLabel).join(", ")}</div>
      ${i.note ? `<div class="photog-note">“${esc(i.note)}”</div>` : ""}
      <div class="lead-actions" style="align-items:center">
        <button class="btn btn-ghost sm" onclick="A.portfolio('${esc(p.portfolio)}')">Portfolio</button>
        ${btns}
      </div>
    </article>`;
  }).join("");

  return `${netHeader("my-posts", { noNav: true })}
  <a class="back-link" href="#/my-posts">← Back to My Posts</a>
  ${headcountMet ? `<div class="banner teal"><p>Headcount met — you've connected with ${connected.length} photographer${connected.length === 1 ? "" : "s"}. Mark this lead as filled?</p><button class="btn btn-primary sm" onclick="A.markFilled('${lead.id}')">Mark as filled</button></div>` : ""}
  <div class="card pad-lg" style="margin-bottom:18px">
    <div class="detail-title-row">
      <div>
        <div class="chip-row" style="margin-bottom:9px">${lead.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}</div>
        <h1 style="font-size:22px">${esc(lead.title)}</h1>
        <p style="color:var(--text2);font-size:13px;margin-top:4px">${esc(lead.dateLabel)} · ${esc(townName(lead.town))} · ${esc(lead.pay)} · ${lead.headcount} needed</p>
      </div>
      <div class="segment" role="group" aria-label="Lead status">
        <button class="${lead.status === "open" ? "on" : ""}" onclick="A.setStatus('${lead.id}','open')">Open</button>
        <button class="${lead.status === "filled" ? "on" : ""}" onclick="A.setStatus('${lead.id}','filled')">Filled</button>
      </div>
    </div>
    <div class="stats-strip" style="margin-top:16px">
      <div class="stat"><b>${lead.stats.notified}</b><span>notified</span></div>
      <div class="stat"><b>${lead.stats.viewed}</b><span>viewed</span></div>
      <div class="stat"><b>${active.length}</b><span>interested</span></div>
      <div class="stat"><b>${connected.length}/${lead.headcount}</b><span>connected</span></div>
    </div>
  </div>
  <div class="section-head"><h2>Interested photographers</h2></div>
  <div class="card-grid cols-2" data-tour="interested-grid">
    ${cards || emptyState("No responses yet", "Matched photographers were notified — interest usually lands within hours.")}
  </div>`;
}

/* ---------- Availability create ---------- */
function vAvailability() {
  if (!S.ui.av) {
    const p = myProfile();
    S.ui.av = { dates: "", shootTypes: p.shootTypes.slice(), roles: p.roles.slice(), radius: p.radius, note: "", err: "" };
  }
  const a = S.ui.av;
  return `${netHeader("board", { noNav: true })}
  <a class="back-link" href="#/home">← Back</a>
  <div class="wizard">
    <div class="card pad-lg">
      <h2 style="margin-bottom:4px">List your availability</h2>
      <p style="color:var(--text2);font-size:13.5px;margin-bottom:18px">Broadcast open dates. Posters browsing the network can find you and invite you to leads directly.</p>
      <div class="field"><label>When are you available?</label>
        <input type="text" value="${esc(a.dates)}" oninput="A.avSet('dates', this.value)" placeholder="e.g. Saturdays in October, or Oct 1–15">
        ${a.err ? `<p class="err">${a.err}</p>` : ""}
      </div>
      <div class="field"><label>For what kind of work?</label>
        ${picker("type", "av", a.shootTypes)}
      </div>
      <div class="field"><label>Roles</label>
        ${picker("role", "av", a.roles)}
      </div>
      <div class="field"><label>Travel radius</label>
        <select onchange="A.avSet('radius', parseInt(this.value))">
          ${[25, 50, 100, 150].map((r) => `<option value="${r}" ${a.radius === r ? "selected" : ""}>${r} miles</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>Note <span style="color:var(--text3);font-weight:400">(optional)</span></label>
        <input type="text" value="${esc(a.note)}" oninput="A.avSet('note', this.value)" placeholder="One line on what you bring">
      </div>
    </div>
    <div class="wizard-foot">
      <a class="btn btn-ghost" href="#/home">Cancel</a>
      <button class="btn btn-orange" onclick="A.avPublish()">Publish availability</button>
    </div>
  </div>`;
}

/* ---------- Matches & Responses ---------- */
function vMatches() {
  const myId = me().profileId;
  const outgoing = S.leads
    .map((l) => ({ l, i: l.interested.find((x) => x.profileId === myId) }))
    .filter((x) => x.i && x.i.status !== "passed");
  const outRows = outgoing.map(({ l, i }) => `
    <article class="card hover lead-card">
      <div class="lead-top">
        <span class="chip-row">${l.shootTypes.map((t) => `<span class="chip">${esc(typeLabel(t))}</span>`).join("")}</span>
        ${i.status === "connected" ? `<span class="badge-connected">✓ Connected</span>` : `<span class="chip gray">Interest sent</span>`}
      </div>
      <h3><a href="#/lead/${l.id}">${esc(l.title)}</a></h3>
      <div class="lead-meta">${esc(l.dateLabel)}<span class="dot">·</span>${esc(townName(l.town))}<span class="dot">·</span>${esc(l.poster.studio)}</div>
      ${i.status === "connected"
        ? `<div class="lead-meta" style="color:#177f76">Intro email sent — contact details are in your inbox.</div>
           <div class="lead-actions"><button class="btn disabled-soon sm" disabled>Message (coming soon)</button></div>`
        : `<div class="lead-meta" style="color:var(--text3)">Awaiting response from the poster.</div>`}
    </article>`).join("");

  const incoming = S.leads
    .filter((l) => l.personaKey === S.persona)
    .flatMap((l) => l.interested.filter((i) => i.status !== "passed").map((i) => ({ l, i })));
  const inRows = incoming.map(({ l, i }) => {
    const p = profileById(i.profileId);
    return `
    <article class="card hover lead-card">
      <div class="lead-top">
        <div class="photog-head"><span class="avatar sm ${p.av}">${p.initials}</span><div class="who" style="font-size:13px"><b>${esc(p.name)}</b></div></div>
        ${i.status === "connected" ? `<span class="badge-connected">✓ Connected</span>` : ""}
      </div>
      <div class="lead-meta">Interested in <b>${esc(l.title)}</b></div>
      ${i.note ? `<div class="photog-note">“${esc(i.note)}”</div>` : ""}
      <div class="lead-actions"><a class="btn btn-quiet sm" href="#/manage/${l.id}">Review in lead</a></div>
    </article>`;
  }).join("");

  return `${netHeader("matches")}
  <section class="section">
    <div class="section-head"><h2>Leads you're interested in</h2></div>
    <div class="card-grid cols-2">${outRows || emptyState("Nothing yet", "Express interest on a lead and you'll track it here.")}</div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Interest in your posts</h2></div>
    <div class="card-grid cols-2">${inRows || emptyState("No responses yet", "When photographers respond to your leads, they show up here.")}</div>
  </section>`;
}

/* ---------- Learn & Teach ---------- */
function vLearn() {
  const prof = myProfile();
  const hosted = S.workshops.filter((w) => w.personaKey === S.persona);
  let hostZone = "";
  if (hosted.length) {
    const seats = hosted.reduce((n, w) => n + w.sold, 0);
    const rev = hosted.reduce((n, w) => n + w.sold * w.price, 0);
    hostZone = `
    <section class="section" data-tour="your-offerings">
      <div class="section-head"><h2>Your offerings</h2></div>
      <div class="card" style="margin-bottom:14px">
        <div class="host-stats">
          <div class="stat"><b>${hosted.length}</b><span>live offerings</span></div>
          <div class="stat"><b>${seats}</b><span>seats sold</span></div>
          <div class="stat"><b>$${rev.toLocaleString()}</b><span>gross revenue</span></div>
        </div>
      </div>
      <div class="card-grid cols-2">
        ${hosted.map((w) => `
        <article class="card lead-card">
          <div class="lead-top"><span class="chip-row"><span class="chip orange">${esc(kindLabel(w))}</span><span class="chip gray">${w.format === "virtual" ? "Virtual" : "In-person"}</span></span></div>
          <h3><a href="#/workshop/${w.id}">${esc(w.title)}</a></h3>
          <div class="lead-meta">${esc(w.dateLabel)}<span class="dot">·</span>$${w.price}<span class="dot">·</span><b>${w.sold} of ${w.seats} sold</b> · $${(w.sold * w.price).toLocaleString()}</div>
          <div class="seat-bar" style="margin-top:4px"><i style="width:${Math.round((w.sold / w.seats) * 100)}%"></i></div>
          <div class="lead-actions"><a class="btn btn-quiet sm" href="#/workshop/${w.id}">Listing & roster</a></div>
        </article>`).join("")}
      </div>
    </section>`;
  }
  const matchedIds = S.workshops.filter((w) => workshopMatchesProfile(w, prof)).map((w) => w.id);
  const browse = S.workshops.filter((w) => w.personaKey !== S.persona)
    .sort((a, b) => (matchedIds.includes(b.id) ? 1 : 0) - (matchedIds.includes(a.id) ? 1 : 0));
  return `${netHeader("learn")}
  ${hostZone}
  <section class="section">
    <div class="section-head">
      <h2>Workshops & mentoring${matchedIds.length ? " — matches first" : ""}</h2>
      <a class="btn btn-orange sm" data-tour="host-btn" href="#/host">Host a workshop</a>
    </div>
    <div class="card-grid cols-3" data-tour="learn-grid">${browse.map(wsCard).join("")}</div>
    <p style="color:var(--text3);font-size:12.5px;margin-top:14px">Booking, payment, and seat management ride your existing BookMe rails — multi-seat capacity and virtual meeting links included.</p>
  </section>`;
}

/* ---------- Workshop detail ---------- */
function vWorkshop(id) {
  const w = S.workshops.find((x) => x.id === id);
  if (!w) return emptyState("Workshop not found", "");
  const mine = w.personaKey === S.persona;
  const booked = (S.bookings[w.id] || []).includes(S.persona);
  const left = w.seats - w.sold;
  const pct = Math.round((w.sold / w.seats) * 100);

  let action;
  if (mine) action = "";
  else if (booked) action = `<button class="btn done lg">Booked ✓ — confirmation sent</button>`;
  else if (left <= 0) action = `<button class="btn lg" disabled>Sold out</button>`;
  else action = `<button class="btn btn-orange lg" data-tour="book-btn" onclick="A.bookStart('${w.id}')">Book your seat — $${w.price}</button>`;

  const rosterBlock = mine ? `
    <div class="card" style="margin-top:16px">
      <h3 style="margin-bottom:4px">Roster & sales</h3>
      <div class="host-stats">
        <div class="stat"><b>${w.sold}</b><span>seats sold</span></div>
        <div class="stat"><b>${left}</b><span>seats left</span></div>
        <div class="stat"><b>$${(w.sold * w.price).toLocaleString()}</b><span>gross revenue</span></div>
      </div>
      <div class="roster">
        ${w.roster.length ? w.roster.map((n) => n.startsWith("+")
          ? `<div class="roster-row" style="color:var(--text3)">${esc(n)}</div>`
          : `<div class="roster-row"><span class="avatar sm av-e">${esc(n.split(" ").map((x) => x[0]).join(""))}</span>${esc(n)}</div>`).join("") : `<p style="color:var(--text3);font-size:12.5px">No bookings yet.</p>`}
      </div>
    </div>` : "";

  return `${netHeader("learn", { noNav: true })}
  <a class="back-link" href="#/learn">← Back to Learn & Teach</a>
  <div class="detail-grid">
    <div>
      <div class="card ws-card" data-tour="ws-detail">
        <div class="ws-cover ${w.cover}" style="height:150px"><span class="ws-format">${w.format === "virtual" ? "Virtual" : "In-person"}</span></div>
        <div class="ws-body" style="padding:24px 26px 26px">
          <div class="chip-row">${w.topics.map((t) => `<span class="chip gray">${esc(topicLabel(t))}</span>`).join("")}<span class="chip orange">${w.kind === "mentoring" ? "1:1 Mentoring" : esc(kindLabel(w))}</span></div>
          <h1 style="font-size:22px;margin:6px 0 2px">${esc(w.title)}</h1>
          <div class="info-rows">
            <div class="info-row"><span class="k">When</span><span class="v">${esc(w.dateLabel)} · ${esc(w.time)}${w.recurring ? " · " + esc(w.recurring) : ""}</span></div>
            <div class="info-row"><span class="k">Format</span><span class="v">${w.format === "virtual" ? "Virtual — meeting link sent on booking" : esc(w.venue || townName(w.town)) + " · " + distLabel(w.town)}</span></div>
            <div class="info-row"><span class="k">Duration</span><span class="v">${esc(w.duration)}</span></div>
            <div class="info-row"><span class="k">Level</span><span class="v">${esc(w.level)}</span></div>
            <div class="info-row"><span class="k">Price</span><span class="v"><b>$${w.price}${w.kind === "mentoring" ? "/session" : "/seat"}</b></span></div>
          </div>
          <h3 style="margin-bottom:7px">About</h3>
          <p style="color:var(--text2);font-size:13.5px">${esc(w.description)}</p>
          ${w.kind !== "mentoring" ? `
          <div style="margin-top:18px">
            <div style="display:flex;justify-content:space-between;font-size:12.5px;color:var(--text3);margin-bottom:6px">
              <span>${w.sold} booked</span><span>${left} of ${w.seats} seats left</span>
            </div>
            <div class="seat-bar"><i style="width:${pct}%"></i></div>
          </div>` : ""}
          <div style="margin-top:22px">${action}</div>
          ${!mine ? `<p style="margin-top:14px"><button class="link subtle" onclick="A.report()">Report this post</button></p>` : ""}
        </div>
      </div>
      ${rosterBlock}
    </div>
    <aside>
      <div class="card">
        <h3 style="margin-bottom:12px">Your host</h3>
        <div class="photog-head">
          <span class="avatar ${w.hostAv}">${w.hostInitials}</span>
          <div class="who"><b>${esc(w.hostName)}</b><span>${esc(w.hostStudio)}</span></div>
        </div>
        <div style="margin-top:13px">
          <button class="btn btn-quiet sm" onclick="A.portfolio('${w.hostName}')">View Zenfolio portfolio</button>
        </div>
      </div>
      <div class="card" style="margin-top:14px" data-tour="bookme-card">
        <div class="bookme-brand" style="border:none;padding:0;margin:0"><span class="bm">BookMe</span> Powered by BookMe</div>
        <p style="font-size:12.5px;color:var(--text2);margin-top:8px">Multi-seat booking, payment, and ${w.format === "virtual" ? "your meeting link" : "reminders"} are handled by the host's BookMe calendar.</p>
      </div>
    </aside>
  </div>`;
}

/* ---------- Host a Workshop wizard ---------- */
function vHost() {
  if (!S.ui.hw) A.hwInit();
  const h = S.ui.hw;
  if (h.published) {
    const kn = h.kind === "workshop" ? "workshop" : h.kind === "mentoring" ? "mentoring offer" : h.kind === "tour" ? "photo tour" : (h.kindCustom || "offering").toLowerCase();
    return `<div class="wizard"><div class="card pad-lg success-panel">
      <div class="success-check">✓</div>
      <h2>Your ${esc(kn)} is live.</h2>
      <p>We notified <b>${h.notifiedCount} photographer${h.notifiedCount === 1 ? "" : "s"}</b> whose learning interests match. Bookings ride your BookMe calendar.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        <a class="btn btn-primary" href="#/workshop/${h.published}">View listing</a>
        <a class="btn btn-quiet" href="#/learn">Back to Learn & Teach</a>
      </div>
    </div></div>`;
  }
  const names = ["The offering", "Format & logistics", "Topics & preview"];
  const stepsBar = `<div class="wizard-steps">${names.map((n, i) => {
    const num = i + 1;
    const cls = num < h.step ? "done" : num === h.step ? "on" : "";
    return `${i ? '<span class="wstep-line"></span>' : ""}<span class="wstep ${cls}"><span class="num">${num < h.step ? "✓" : num}</span>${n}</span>`;
  }).join("")}</div>`;

  let body = "";
  if (h.step === 1) {
    body = `
      <h2 style="margin-bottom:16px">The offering</h2>
      <div class="field"><label>Type</label>
        <div class="radio-cards">
          <button class="radio-card ${h.kind === "workshop" ? "on" : ""}" onclick="A.hwSet('kind','workshop')"><b>Workshop</b><span>Group session with multiple seats</span></button>
          <button class="radio-card ${h.kind === "mentoring" ? "on" : ""}" onclick="A.hwSet('kind','mentoring')"><b>Mentoring</b><span>1:1, with an optional recurring cadence</span></button>
          <button class="radio-card ${h.kind === "tour" ? "on" : ""}" onclick="A.hwSet('kind','tour')"><b>Photo Tour</b><span>Guided shooting on location — seats and a meeting point</span></button>
          <button class="radio-card ${h.kind === "custom" ? "on" : ""}" onclick="A.hwSet('kind','custom')"><b>Something else</b><span>Name your own format — critique night, retreat, photo walk…</span></button>
        </div>
        ${h.kind === "custom" ? `
        <div style="margin-top:12px">
          <input type="text" value="${esc(h.kindCustom)}" oninput="A.hwSetQuiet('kindCustom', this.value)" placeholder="e.g. Print Critique Night">
        </div>` : ""}
        ${h.errs.kind ? `<p class="err">${h.errs.kind}</p>` : ""}
      </div>
      <div class="field"><label>Title</label>
        <input type="text" value="${esc(h.title)}" oninput="A.hwSetQuiet('title', this.value)" placeholder="e.g. Portrait Lighting Intensive">
        ${h.errs.title ? `<p class="err">${h.errs.title}</p>` : ""}
      </div>
      <div class="field"><label>Description</label>
        <textarea oninput="A.hwSetQuiet('description', this.value)" placeholder="What will they learn? What should they bring?">${esc(h.description)}</textarea>
      </div>`;
  } else if (h.step === 2) {
    body = `
      <h2 style="margin-bottom:16px">Format & logistics</h2>
      <div class="field"><label>Format</label>
        <div class="radio-cards">
          <button class="radio-card ${h.format === "in-person" ? "on" : ""}" onclick="A.hwSet('format','in-person')"><b>In-person</b><span>Hosted at a location you choose</span></button>
          <button class="radio-card ${h.format === "virtual" ? "on" : ""}" onclick="A.hwSet('format','virtual')"><b>Virtual</b><span>Zoom, Meet, or Teams — link sent on booking</span></button>
        </div>
      </div>
      ${h.format === "in-person" ? locField("hw", "Location (city or ZIP)", h.kind === "tour" ? "Where the tour meets — exact meeting point goes out with the booking confirmation." : "", h.errs.town) : `
      <div class="field"><label>Meeting link</label>
        <input type="url" value="${esc(h.link)}" oninput="A.hwSetQuiet('link', this.value)" placeholder="https://zoom.us/j/…">
        <p class="hint">Included automatically in booking confirmations and reminders — a BookMe virtual-event enhancement.</p>
      </div>`}
      <div class="form-row">
        <div class="field"><label>Date</label><input type="text" value="${esc(h.dateLabel)}" oninput="A.hwSetQuiet('dateLabel', this.value)" placeholder="e.g. Sat, Oct 17"></div>
        <div class="field"><label>Time</label><input type="text" value="${esc(h.time)}" oninput="A.hwSetQuiet('time', this.value)" placeholder="e.g. 9:00 AM – 4:00 PM"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>${h.kind === "mentoring" ? "Sessions" : "Seats"}</label>
          <input type="number" min="1" max="100" value="${h.seats}" oninput="A.hwSetQuiet('seats', parseInt(this.value)||1)">
          <p class="hint">Multi-seat capacity is a BookMe enhancement — 1 behaves like a classic booking type.</p>
        </div>
        <div class="field"><label>Price per ${h.kind === "mentoring" ? "session" : "seat"}</label>
          <input type="number" min="0" value="${h.price}" oninput="A.hwSetQuiet('price', parseInt(this.value)||0)">
        </div>
      </div>`;
  } else {
    const count = eduMatchCount(h.topics, h.format, h.town);
    const topicNames = h.topics.map(topicLabel).join(" & ").toLowerCase();
    body = `
      <h2 style="margin-bottom:16px">Topics & preview</h2>
      <div class="field" data-tour="hw-topics"><label>Skill topics</label>
        ${picker("topic", "hw", h.topics)}
        ${h.errs.topics ? `<p class="err">${h.errs.topics}</p>` : ""}
      </div>
      <div class="field"><label>Experience level</label>
        <select onchange="A.hwSet('level', this.value)">
          ${["All levels", "Beginner", "Intermediate", "Advanced"].map((l) => `<option ${h.level === l ? "selected" : ""}>${l}</option>`).join("")}
        </select>
      </div>
      <div class="match-preview">
        <span class="num-big">${count}</span>
        <p><b>${count} photographer${count === 1 ? "" : "s"} ${h.format === "in-person" ? "near you " : ""}want${count === 1 ? "s" : ""} to learn ${esc(topicNames) || "these topics"}.</b>
        They'll be notified the moment you publish.</p>
      </div>`;
  }
  return `<div class="wizard">
    ${stepsBar}
    <div class="card pad-lg">${body}</div>
    <div class="wizard-foot">
      <button class="btn btn-ghost" onclick="A.hwBack()">${h.step === 1 ? "Cancel" : "Back"}</button>
      <button class="btn ${h.step === 3 ? "btn-orange" : "btn-primary"}" onclick="A.hwNext()">${h.step === 3 ? "Publish" : "Continue"}</button>
    </div>
  </div>`;
}

/* ---------- Network Profile settings ---------- */
function vProfile() {
  const p = myProfile();
  const prefs = S.notifPrefs;
  const seg = (group, value) => `
    <div class="segment" role="group">
      ${[["instant", "Instant"], ["digest", group === "leads" ? "Daily digest" : "Weekly digest"], ["off", "Off"]].map(([v, lbl]) =>
        `<button class="${prefs[group] === v ? "on" : ""}" onclick="A.setPref('${group}','${v}')">${lbl}</button>`).join("")}
    </div>`;
  return `${netHeader("profile")}
  <div class="home-grid">
    <div>
      <div class="card pad-lg" style="margin-bottom:16px">
        <div class="switch-row">
          <div class="lbl"><b>Available for job leads</b><span>The master switch. Off means no one can see you and you receive nothing — ever.</span></div>
          <label class="switch"><input type="checkbox" ${p.available ? "checked" : ""} onchange="A.profToggleAvailable()"><i></i></label>
        </div>
      </div>
      <div class="card pad-lg" style="margin-bottom:16px">
        <h2 style="margin-bottom:16px">What you shoot</h2>
        ${picker("type", "prof", p.shootTypes)}
        <p class="hint" style="margin-top:10px">Pre-filled from your gallery segmentation — adjust anytime, or add your own.</p>
      </div>
      <div class="card pad-lg" style="margin-bottom:16px">
        <h2 style="margin-bottom:16px">Roles & reach</h2>
        <div class="field"><label>Roles offered</label>
          ${picker("role", "prof", p.roles)}
        </div>
        <div class="form-row">
          <div class="field"><label>Home base</label>
            <div class="readonly-box">${esc(townName(p.town))}<span class="tag">From your account</span></div>
          </div>
          <div class="field"><label>Travel radius</label>
            <select onchange="A.profSet('radius', parseInt(this.value))">
              ${[25, 50, 100, 150].map((r) => `<option value="${r}" ${p.radius === r ? "selected" : ""}>${r} miles</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field"><label>Rate guidance <span style="color:var(--text3);font-weight:400">(optional)</span></label>
            <input type="text" value="${esc(p.rate)}" oninput="A.profSetQuiet('rate', this.value)" onblur="A.saveToast()">
          </div>
          <div class="field"><label>Gear summary <span style="color:var(--text3);font-weight:400">(optional)</span></label>
            <input type="text" value="${esc(p.gear)}" oninput="A.profSetQuiet('gear', this.value)" onblur="A.saveToast()">
          </div>
        </div>
        <div class="field"><label>Portfolio</label>
          <div class="readonly-box">${esc(p.portfolio)}<span class="tag">Linked automatically</span></div>
        </div>
      </div>
      <div class="card pad-lg" style="margin-bottom:16px">
        <h2 style="margin-bottom:16px">Teaching & learning</h2>
        <div class="field"><label>I want to learn</label>
          ${picker("topic", "prof", p.wantsToLearn)}
        </div>
        <div class="switch-row" style="margin-top:6px">
          <div class="lbl"><b>Willing to teach</b><span>Unlocks workshop hosting and shows you who nearby wants to learn.</span></div>
          <label class="switch"><input type="checkbox" ${p.willingToTeach ? "checked" : ""} onchange="A.profToggleTeach()"><i></i></label>
        </div>
      </div>
      <div class="card pad-lg">
        <h2 style="margin-bottom:6px">Notifications</h2>
        <p style="color:var(--text3);font-size:12.5px;margin-bottom:18px">Radius and shoot-type filters are your volume valve. With the toggle above off, nothing is ever sent.</p>
        <div class="field"><label>Lead matches</label>${seg("leads")}</div>
        <div class="field"><label>Education matches</label>${seg("edu")}</div>
        <div class="field"><label>Connection introductions</label>
          <div class="readonly-box">Always on — the only email that shares contact info, sent on mutual connection.<span class="tag">Required</span></div>
        </div>
      </div>
    </div>
    <aside class="rail">
      <div class="card">
        <h3 style="margin-bottom:8px">Profile strength</h3>
        <div class="meter"><i style="width:${completeness(p)}%"></i></div>
        <p style="font-size:12px;color:var(--text3)">${completeness(p)}% complete — complete profiles rank higher in poster results.</p>
      </div>
      <div class="card">
        <h3 style="margin-bottom:6px">How matching works</h3>
        <button class="link" style="font-size:13px" onclick="A.openModal('matching')">See the rules →</button>
      </div>
    </aside>
  </div>`;
}

/* ---------- Stubs: Volume & BookMe (secondary entry points) ---------- */
function vVolume() {
  return `
  <span class="stub-note">NextZen · Volume — prototype stub</span>
  <h1 style="margin-bottom:18px">Volume</h1>
  <div class="upsell-card" style="margin-bottom:22px">
    <div><b>Need a second photographer for Fall sports day — Carlisle?</b>
    <p>Post it to the Network — we'll notify qualified photographers near the event in minutes.</p></div>
    <a class="btn btn-orange" href="#/post">Post a job lead</a>
  </div>
  <div class="card pad-lg">
    <h2 style="margin-bottom:8px">Upcoming jobs</h2>
    <div class="job-row"><div><b>Fall sports day — Carlisle Youth League</b><span>Sat, Sep 19 · 400 subjects · 2 stations</span></div><span class="chip">Sports</span></div>
    <div class="job-row"><div><b>School picture day — York Charter</b><span>Tue, Sep 8 · 310 subjects</span></div><span class="chip">Schools</span></div>
    <div class="job-row"><div><b>Homecoming — Hershey HS</b><span>Sat, Oct 10 · step-and-repeat</span></div><span class="chip">Events</span></div>
  </div>`;
}
function vBookMe() {
  return `
  <span class="stub-note">NextZen · BookMe — prototype stub</span>
  <h1 style="margin-bottom:18px">BookMe</h1>
  <div class="card pad-lg" style="margin-bottom:16px">
    <h2 style="margin-bottom:8px">This week</h2>
    <p style="color:var(--text2);font-size:13.5px">No bookings the week of Sep 21–27. Your calendar is open.</p>
  </div>
  <div class="upsell-card">
    <div><b>Open week ahead?</b>
    <p>List your availability on the Network so studios near you can find and invite you.</p></div>
    <a class="btn btn-orange" href="#/availability">List availability</a>
  </div>`;
}

/* ================================================================
   Chrome: topbar, bell, demo bar, modals
   ================================================================ */

function renderTop() {
  const notifs = S.notifs[S.persona] || [];
  const unread = notifs.filter((n) => n.unread).length;
  const bell = `
    <button class="bell-btn" onclick="A.toggleBell()" aria-label="Notifications${unread ? " — " + unread + " unread" : ""}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>
      ${unread ? `<span class="bell-dot">${unread}</span>` : ""}
    </button>
    ${S.ui.bellOpen ? `
    <div class="bell-dd">
      <div class="dd-head">Notifications ${notifs.length ? `<button class="link subtle" onclick="A.markAllRead()">Mark all read</button>` : ""}</div>
      ${notifs.length ? notifs.slice(0, 8).map((n, i) => `
        <button class="bell-item ${n.unread ? "" : "read"}" onclick="A.notifClick(${i})">
          <span class="b-dot"></span>
          <span><p>${esc(n.text)}</p><span class="ago">${esc(n.ago)}</span></span>
        </button>`).join("") : `<div style="padding:22px;text-align:center;color:var(--text3);font-size:12.5px">You're all caught up.</div>`}
    </div>` : ""}`;
  $("#bell-wrap").innerHTML = bell;
  $("#top-me").innerHTML = `
    <span class="avatar ${me().av}">${me().initials}</span>
    <div class="who"><b>${esc(me().name)}</b><span>${esc(me().studio)}</span></div>`;
}

function renderDemoBar() {
  $("#demo-bar").innerHTML = `
    <span class="demo-lbl">Demo</span>
    ${Object.values(PERSONAS).map((p) => `
      <button class="demo-persona ${S.persona === p.key ? "on" : ""}" onclick="A.switchPersona('${p.key}')" title="${esc(p.name)} — ${esc(p.role)}">
        <span class="avatar sm ${p.av}">${p.initials}</span><span class="nm">${p.name.split(" ")[0]}</span>
      </button>`).join("")}
    <span class="demo-sep"></span>
    <a class="demo-link" href="#/first-run">First-run</a>
    <button class="demo-link" onclick="A.resetDemo()">Reset</button>`;
}

function renderSidebar(route) {
  const netPages = ["home", "board", "my-posts", "matches", "learn", "profile", "lead", "manage", "post", "availability", "workshop", "host", "first-run"];
  document.querySelectorAll(".side-item").forEach((el) => {
    const pg = el.getAttribute("data-page");
    el.classList.toggle("active",
      (pg === "network" && netPages.includes(route.page)) ||
      (pg === "volume" && route.page === "volume") ||
      (pg === "bookme" && route.page === "bookme"));
  });
}

function renderModal() {
  const m = S.ui.modal;
  if (!m) { $("#modal-root").innerHTML = ""; return; }
  let inner = "";
  if (m.type === "matching") {
    inner = `
      <h2>How matching works</h2>
      <p class="modal-sub">A lead reaches a photographer only when every rule below is true. No ratings, no pay-per-lead — your portfolio carries the credibility.</p>
      <ul class="how-list">
        <li><span class="n">1</span><span>Their <b>“Available for job leads”</b> toggle is on. Off means invisible — nothing is ever sent.</span></li>
        <li><span class="n">2</span><span><b>Shoot type</b> overlaps — parent categories match their children, so a “Volume · Sports” lead matches a profile listing “Volume.”</span></li>
        <li><span class="n">3</span><span><b>Distance</b> is within the smaller of the photographer's travel radius and the poster's search radius.</span></li>
        <li><span class="n">4</span><span>The <b>role</b> needed matches a role they offer.</span></li>
        <li><span class="n">5</span><span><i>Coming next:</i> no hard conflict on their BookMe calendar.</span></li>
      </ul>
      <p style="font-size:12.5px;color:var(--text3)">Results rank by distance, then profile completeness, then recent activity. Education matching swaps rule 2 for skill-topic overlap with your learning interests — radius applies only to in-person formats.</p>
      <div class="modal-foot"><button class="btn btn-primary" onclick="A.closeModal()">Got it</button></div>`;
  } else if (m.type === "connect") {
    const p = profileById(m.profileId);
    const lead = S.leads.find((l) => l.id === m.leadId);
    inner = `
      <h2>Connect with ${esc(p.name)}?</h2>
      <p class="modal-sub">We'll email you both an introduction with contact details. From there, the conversation is yours — by email or phone.</p>
      <div class="photog-head" style="margin-bottom:14px">
        <span class="avatar ${p.av}">${p.initials}</span>
        <div class="who"><b>${esc(p.name)}</b><span>${esc(townName(p.town))} · ${miles(p.town, lead.town)} mi from the job</span></div>
      </div>
      <div class="disclaimer">Zenfolio introduces members. Rates, contracts, and working arrangements are between you.</div>
      <div class="modal-foot">
        <button class="btn btn-ghost" onclick="A.closeModal()">Cancel</button>
        <button class="btn btn-orange" onclick="A.connectConfirm('${m.leadId}','${p.id}')">Connect & send intro</button>
      </div>`;
  } else if (m.type === "book") {
    const w = S.workshops.find((x) => x.id === m.wId);
    if (m.confirmed) {
      inner = `
        <div class="success-panel" style="padding:18px 6px">
          <div class="success-check">✓</div>
          <h2>You're booked!</h2>
          <p>Confirmation sent to ${esc(me().email)}.${w.format === "virtual" ? " Your meeting link is in the confirmation and will be in the reminder email too." : " Location details and reminders are on the way."}</p>
          <button class="btn btn-primary" onclick="A.closeModal()">Done</button>
        </div>`;
    } else {
      inner = `
        <div class="bookme-brand"><span class="bm">BookMe</span> Secure checkout · Powered by BookMe</div>
        <h2 style="margin-bottom:14px">${esc(w.title)}</h2>
        <div class="book-row"><span class="k">When</span><span class="v">${esc(w.dateLabel)} · ${esc(w.time)}</span></div>
        <div class="book-row"><span class="k">Format</span><span class="v">${w.format === "virtual" ? "Virtual — link sent on booking" : esc(w.venue || townName(w.town))}</span></div>
        <div class="book-row"><span class="k">Attendee</span><span class="v">${esc(me().name)}<br><span style="color:var(--text3);font-weight:400">${esc(me().email)}</span></span></div>
        <div class="book-row"><span class="k">Seats</span><span class="v">1 <span style="color:var(--text3)">(${w.seats - w.sold} available)</span></span></div>
        <div class="book-row"><span class="k">Payment</span><span class="v">Demo checkout — no charge</span></div>
        <div class="book-total"><span>Total</span><span>$${w.price}</span></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" onclick="A.closeModal()">Cancel</button>
          <button class="btn btn-orange" onclick="A.bookConfirm('${w.id}')">Confirm booking — $${w.price}</button>
        </div>`;
    }
  } else if (m.type === "profile") {
    const p = profileById(m.profileId);
    inner = `
      <div class="photog-head" style="margin-bottom:14px">
        <span class="avatar lg ${p.av}">${p.initials}</span>
        <div class="who"><b style="font-size:16px">${esc(p.name)}</b><span>${esc(townName(p.town))} · ${distLabel(p.town)} · ${esc(p.activity)}</span></div>
      </div>
      ${chips(p.shootTypes)}
      <div class="info-rows">
        <div class="info-row"><span class="k">Roles</span><span class="v">${p.roles.map(roleLabel).join(", ") || "—"}</span></div>
        <div class="info-row"><span class="k">Travel radius</span><span class="v">${p.radius} miles</span></div>
        <div class="info-row"><span class="k">Rate guidance</span><span class="v">${esc(p.rate || "Not listed")}</span></div>
        <div class="info-row"><span class="k">Gear</span><span class="v">${esc(p.gear || "Not listed")}</span></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-quiet" onclick="A.portfolio('${esc(p.portfolio)}')">View Zenfolio portfolio</button>
        <button class="btn btn-primary" onclick="A.closeModal()">Close</button>
      </div>`;
  }
  $("#modal-root").innerHTML = `
    <div class="modal-ov" onclick="if(event.target===this)A.closeModal()">
      <div class="modal ${m.type === "matching" ? "wide" : ""}" role="dialog" aria-modal="true">${inner}</div>
    </div>`;
}

/* ================================================================
   Router
   ================================================================ */
function render() {
  const route = parseHash();
  const y = window.scrollY;
  // close transient panels on navigation; clear finished wizard state so re-entry starts fresh
  if (location.hash !== lastHash) S.ui.addPanel = null;
  if (route.page !== "post" && S.ui.pw && S.ui.pw.published) S.ui.pw = null;
  if (route.page !== "host" && S.ui.hw && S.ui.hw.published) S.ui.hw = null;
  if (route.page !== "first-run" && S.ui.fr && S.ui.fr.done) S.ui.fr = null;
  if (route.page !== "availability") S.ui.av = null;
  renderSidebar(route);
  renderTop();
  renderDemoBar();
  let html;
  switch (route.page) {
    case "home":         html = vHome(); break;
    case "first-run":    html = vFirstRun(); break;
    case "board":        html = vBoard(route.id); break;
    case "lead":         html = vLeadDetail(route.id); break;
    case "my-posts":     html = vMyPosts(); break;
    case "manage":       html = vManage(route.id); break;
    case "post":         if (!S.ui.pw) A.pwInit(); html = vPostWizard(); break;
    case "availability": html = vAvailability(); break;
    case "matches":      html = vMatches(); break;
    case "learn":        html = vLearn(); break;
    case "workshop":     html = vWorkshop(route.id); break;
    case "host":         html = vHost(); break;
    case "profile":      html = vProfile(); break;
    case "volume":       html = vVolume(); break;
    case "bookme":       html = vBookMe(); break;
    default:             html = vHome();
  }
  $("#outlet").innerHTML = html;
  const crumbMap = { volume: "Volume", bookme: "BookMe" };
  $("#crumb").innerHTML = `Zenfolio&nbsp;&nbsp;›&nbsp;&nbsp;<strong>${crumbMap[route.page] || "Network"}</strong>`;
  renderModal();
  if (location.hash === lastHash) window.scrollTo(0, y); else window.scrollTo(0, 0);
  lastHash = location.hash;
  if (typeof Tour !== "undefined") Tour.afterRender();
}

/* ================================================================
   Actions
   ================================================================ */
const A = {
  /* chrome */
  stub(e, name) { e.preventDefault(); toast(name + " isn't part of this prototype — try the Network tab."); },
  switchPersona(k) {
    S.persona = k;
    S.ui.bellOpen = false; S.ui.compose = null; S.ui.modal = null; S.ui.addPanel = null;
    S.ui.pw = null; S.ui.hw = null; S.ui.av = null; S.ui.fr = null;
    toast("Now viewing as " + PERSONAS[k].name + " — " + PERSONAS[k].role);
    if (parseHash().page === "first-run") go("#/home"); else render();
  },
  resetDemo() { const p = S.persona; S = freshState(); S.persona = p; toast("Demo state reset."); go("#/home"); render(); },
  toggleBell() { S.ui.bellOpen = !S.ui.bellOpen; renderTop(); },
  notifClick(i) {
    const n = (S.notifs[S.persona] || [])[i];
    if (!n) return;
    n.unread = false; S.ui.bellOpen = false;
    if (n.href && n.href !== location.hash) go(n.href); else render();
  },
  markAllRead() { (S.notifs[S.persona] || []).forEach((n) => (n.unread = false)); renderTop(); },
  openModal(type) { S.ui.modal = { type }; renderModal(); },
  closeModal() { S.ui.modal = null; renderModal(); },
  portfolio(name) { toast("This would open the member's Zenfolio portfolio site — no re-uploading, it's already live."); },
  report() { toast("Thanks — reported. Our team will take a look. (Routes to CX in production.)"); },
  saveToast() { toast("Profile saved."); },

  /* interest flow */
  interestFromCard(leadId) { S.ui.compose = leadId; go("#/lead/" + leadId); render(); },
  interestStart(leadId) { S.ui.compose = leadId; render(); },
  interestCancel() { S.ui.compose = null; render(); },
  interestSend(leadId) {
    const lead = S.leads.find((l) => l.id === leadId);
    const noteEl = document.getElementById("interest-note");
    const note = noteEl ? noteEl.value.trim() : "";
    lead.interested.push({ profileId: me().profileId, note, status: "interested" });
    S.ui.compose = null;
    if (lead.personaKey && lead.personaKey !== S.persona) {
      notify(lead.personaKey, `${me().name} is interested in “${lead.title}”`, "#/manage/" + lead.id);
    }
    toast("Interest sent — the poster will see your profile and portfolio.");
    render();
  },

  /* poster: connect / pass / status */
  connectStart(leadId, profileId) { S.ui.modal = { type: "connect", leadId, profileId }; renderModal(); },
  connectConfirm(leadId, profileId) {
    const lead = S.leads.find((l) => l.id === leadId);
    const entry = lead.interested.find((i) => i.profileId === profileId);
    entry.status = "connected";
    S.ui.modal = null;
    const p = profileById(profileId);
    const pk = Object.values(PERSONAS).find((x) => x.profileId === profileId);
    if (pk) notify(pk.key, `You're connected with ${lead.poster.studio} for “${lead.title}” — an intro email with contact details is on its way.`, "#/matches");
    toast(`Connected — intro email sent to you and ${p.name}.`);
    render();
  },
  pass(leadId, profileId) {
    const lead = S.leads.find((l) => l.id === leadId);
    lead.interested.find((i) => i.profileId === profileId).status = "passed";
    render();
  },
  undoPass(leadId, profileId) {
    const lead = S.leads.find((l) => l.id === leadId);
    lead.interested.find((i) => i.profileId === profileId).status = "interested";
    render();
  },
  markFilled(leadId) { A.setStatus(leadId, "filled"); },
  setStatus(leadId, status) {
    const lead = S.leads.find((l) => l.id === leadId);
    lead.status = status;
    toast(status === "filled" ? "Lead marked as filled — matching notifications stop." : "Lead reopened.");
    render();
  },
  invite(profileId, leadId) {
    if (!leadId) return;
    const p = profileById(profileId);
    const lead = S.leads.find((l) => l.id === leadId);
    S.invites.push({ profileId, leadId });
    const pk = Object.values(PERSONAS).find((x) => x.profileId === profileId);
    if (pk) notify(pk.key, `${lead.poster.studio} invited you to their lead: “${lead.title}”`, "#/lead/" + lead.id);
    toast(`Invitation sent to ${p.name} for “${lead.title}.”`);
    render();
  },

  /* shared picker: toggle chips, open suggestions panel, add suggested or custom entries */
  pickToggle(kind, ctx, id) {
    const arr = pickerArr(kind, ctx);
    const ix = arr.indexOf(id);
    if (ix >= 0) arr.splice(ix, 1); else arr.push(id);
    render();
  },
  addPanelToggle(kind, ctx) {
    const key = kind + ":" + ctx;
    S.ui.addPanel = S.ui.addPanel === key ? null : key;
    render();
    if (S.ui.addPanel) { const el = document.getElementById("custom-add-input"); if (el) el.focus(); }
  },
  addSuggestedItem(kind, ctx, id) {
    const cfg = PICKERS[kind];
    const s = cfg.sugg().find((x) => x.id === id);
    if (!s) return;
    if (!cfg.list().some((t) => t.id === s.id)) cfg.list().push({ id: s.id, label: s.label, group: "More" });
    const arr = pickerArr(kind, ctx);
    if (!arr.includes(s.id)) arr.push(s.id);
    toast(`“${s.label}” added.`);
    render();
  },
  addCustomItem(kind, ctx) {
    const el = document.getElementById("custom-add-input");
    const label = el ? el.value.trim() : "";
    if (!label) return;
    const cfg = PICKERS[kind];
    const existing = cfg.list().find((t) => t.label.toLowerCase() === label.toLowerCase());
    let id;
    if (existing) { id = existing.id; }
    else {
      id = cfg.prefix + "-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      if (!id.replace(cfg.prefix + "-", "")) return;
      cfg.list().push({ id, label, group: "Custom" });
    }
    const arr = pickerArr(kind, ctx);
    if (!arr.includes(id)) arr.push(id);
    toast(`“${label}” added.`);
    render();
  },

  /* free-entry location field */
  locInput(ctx, val) { const st = locState(ctx); st.townLabel = val; st.town = resolveLoc(val); paintLocDD(ctx); },
  locFocus(ctx) { paintLocDD(ctx); },
  locPickTown(ctx, key) { const st = locState(ctx); st.town = key; st.townLabel = townName(key); render(); },
  locPickRecent(ctx, i) {
    const r = S.recentLocations[i];
    if (r == null) return;
    const st = locState(ctx);
    st.townLabel = r; st.town = resolveLoc(r);
    render();
  },

  /* first-run wizard */
  frStart() {
    const p = myProfile();
    S.ui.fr = { step: 1, types: p.shootTypes.filter((t) => !((S.taxonomy.find((x) => x.id === t) || {}).children)), roles: p.roles.length ? p.roles.slice() : ["second"], radius: p.radius || 50, rate: "", learn: p.wantsToLearn.slice(), teach: p.willingToTeach, done: false };
    if (!S.ui.fr.types.length) S.ui.fr.types = ["portraits"];
    render();
  },
  frSet(field, val) { S.ui.fr[field] = val; },
  frBack() {
    if (S.ui.fr.step === 1) { S.ui.fr = null; render(); return; }
    S.ui.fr.step--; render();
  },
  frNext() {
    const f = S.ui.fr;
    if (f.step < 3) { f.step++; render(); return; }
    f.done = true;
    toast("Welcome to the Network.");
    render();
  },

  /* post-lead wizard (pre-filled demo lead: matches Devon's profile honestly) */
  pwInit() {
    S.ui.pw = {
      step: 1, errs: {},
      title: "Senior portrait day — second shooter",
      shootTypes: ["seniors"], roles: ["second"], headcount: 1,
      dateLabel: "Sat, Oct 10", time: "10:00 AM – 4:00 PM",
      town: me().town, townLabel: townName(me().town), radius: 50, pay: "$50/hr",
      description: "High-volume senior portrait day at our studio park location. You'll run the casual-poses station while our lead runs formals. Posing guide provided; we edit and deliver.",
      gear: "Full-frame body, 85mm or 70-200",
      published: null, notifiedCount: 0
    };
  },
  pwStart() { A.pwInit(); render(); },
  pwSet(field, val) { S.ui.pw[field] = val; },
  pwBack() {
    if (S.ui.pw.step === 1) { S.ui.pw = null; go("#/home"); return; }
    S.ui.pw.step--; render();
  },
  pwNext() {
    const w = S.ui.pw;
    w.errs = {};
    if (w.step === 1) {
      if (!w.title.trim()) w.errs.title = "Give the lead a title.";
      if (!w.shootTypes.length) w.errs.shootTypes = "Pick at least one shoot type.";
      if (!w.roles.length) w.errs.roles = "Pick the role you need.";
      if (Object.keys(w.errs).length) { render(); return; }
      w.step = 2; render(); return;
    }
    if (w.step === 2) {
      if (!ensureLoc(w)) w.errs.town = "Where's the job? Enter a city or ZIP.";
      if (!w.pay.trim()) w.errs.pay = "Pay is required to post — leads without it breed distrust and get skipped.";
      if (Object.keys(w.errs).length) { render(); return; }
      w.step = 3; render(); return;
    }
    // publish
    const matches = matchCountForLead({ shootTypes: w.shootTypes, roles: w.roles, town: w.town, radius: w.radius, posterProfileId: me().profileId });
    const id = uid("lx");
    S.leads.unshift({
      id, title: w.title.trim(),
      poster: { name: me().name, studio: me().studio, initials: me().initials, av: me().av, portfolio: myProfile().portfolio },
      personaKey: S.persona,
      shootTypes: w.shootTypes.slice(), roles: w.roles.slice(), headcount: w.headcount,
      dateLabel: w.dateLabel, dateISO: "2026-10-10", time: w.time,
      town: w.town, radius: w.radius, pay: w.pay,
      description: w.description, gear: w.gear,
      status: "open", visibility: "matched", postedAgo: "just now",
      stats: { notified: matches.length, viewed: 0 }, interested: []
    });
    matches.forEach((p) => {
      const pk = Object.values(PERSONAS).find((x) => x.profileId === p.id);
      if (pk) notify(pk.key, `New lead matches your profile: “${w.title.trim()}” · ${townName(w.town)}`, "#/lead/" + id);
    });
    addRecent(townName(w.town));
    w.published = id;
    w.notifiedCount = matches.length;
    render();
  },

  /* availability */
  avSet(field, val) { S.ui.av[field] = val; },
  avPublish() {
    const a = S.ui.av;
    if (!a.dates.trim()) { a.err = "Tell posters when you're available."; render(); return; }
    const id = uid("ax");
    S.availability.unshift({ id, profileId: me().profileId, dates: a.dates.trim(), shootTypes: a.shootTypes.slice(), roles: a.roles.slice(), radius: a.radius, note: a.note.trim(), postedAgo: "just now" });
    S.myAvailability[S.persona] = id;
    Object.values(PERSONAS).forEach((pk) => {
      if (pk.key !== S.persona && pk.isVolume) {
        notify(pk.key, `New availability near you: ${me().name} (${a.shootTypes.map(typeLabel).join(" · ")})`, "#/board/avail");
      }
    });
    S.ui.av = null;
    toast("Availability published — posters near you can now find and invite you.");
    go("#/my-posts");
  },

  /* booking */
  bookStart(wId) { S.ui.modal = { type: "book", wId, confirmed: false }; renderModal(); },
  bookConfirm(wId) {
    const w = S.workshops.find((x) => x.id === wId);
    w.sold++;
    w.roster.unshift(me().name);
    if (!S.bookings[wId]) S.bookings[wId] = [];
    S.bookings[wId].push(S.persona);
    if (w.personaKey && w.personaKey !== S.persona) {
      notify(w.personaKey, `${me().name} booked a seat: ${w.title} — ${w.sold} of ${w.seats} seats sold`, "#/workshop/" + w.id);
    }
    S.ui.modal = { type: "book", wId, confirmed: true };
    render();
  },

  /* host wizard */
  hwInit() {
    S.ui.hw = {
      step: 1, errs: {}, kind: "workshop", kindCustom: "",
      title: "", description: "",
      format: "in-person", town: me().town, townLabel: townName(me().town), link: "",
      dateLabel: "", time: "", seats: 8, price: 99,
      topics: [], level: "All levels",
      published: null, notifiedCount: 0
    };
  },
  hwSet(field, val) { S.ui.hw[field] = val; render(); },
  hwSetQuiet(field, val) { S.ui.hw[field] = val; },
  hwBack() {
    if (S.ui.hw.step === 1) { S.ui.hw = null; go("#/learn"); return; }
    S.ui.hw.step--; render();
  },
  hwNext() {
    const h = S.ui.hw;
    h.errs = {};
    if (h.step === 1) {
      if (h.kind === "custom" && !h.kindCustom.trim()) h.errs.kind = "Name your offering type.";
      if (!h.title.trim()) h.errs.title = "Give it a title.";
      if (Object.keys(h.errs).length) { render(); return; }
      h.step = 2; render(); return;
    }
    if (h.step === 2) {
      if (h.format === "in-person" && !ensureLoc(h)) { h.errs.town = "Where does it meet? Enter a city or ZIP."; render(); return; }
      h.step = 3; render(); return;
    }
    if (!h.topics.length) { h.errs.topics = "Pick at least one topic — it powers the matching."; render(); return; }
    const count = eduMatchCount(h.topics, h.format, h.town);
    const id = uid("wx");
    const covers = ["g1", "g2", "g3", "g4", "g5", "g6"];
    S.workshops.push({
      id, kind: h.kind, kindCustom: h.kindCustom.trim(), title: h.title.trim(),
      hostName: me().name, hostStudio: me().studio, hostProfileId: me().profileId, personaKey: S.persona,
      hostAv: me().av, hostInitials: me().initials,
      format: h.format, town: h.town, venue: h.format === "in-person" ? townName(h.town) : undefined,
      meetingNote: h.format === "virtual" ? "Meeting link sent on booking" : undefined,
      seats: h.kind === "mentoring" ? 1 : h.seats, sold: 0, price: h.price,
      dateLabel: h.dateLabel || "Date TBA", time: h.time || "Time TBA", duration: "—",
      topics: h.topics.slice(), level: h.level, cover: covers[S.seq % covers.length],
      description: h.description || "Details coming soon.", roster: []
    });
    S.profiles.forEach((p) => {
      if (p.id === me().profileId) return;
      if (!h.topics.some((t) => p.wantsToLearn.includes(t))) return;
      if (h.format === "in-person" && miles(h.town, p.town) > p.radius) return;
      const pk = Object.values(PERSONAS).find((x) => x.profileId === p.id);
      if (pk) notify(pk.key, `New workshop matches your interests: ${h.title.trim()}${h.format === "virtual" ? " (virtual)" : ""}`, "#/workshop/" + id);
    });
    if (h.format === "in-person") addRecent(townName(h.town));
    h.published = id;
    h.notifiedCount = count;
    render();
  },

  /* board filters */
  boardFilter(key, val) { S.ui.board[key] = val; render(); },

  /* profile settings */
  profToggleAvailable() {
    const p = myProfile();
    p.available = !p.available;
    toast(p.available ? "You're visible — matching leads will notify you." : "Toggle off — you're invisible and will receive nothing.");
    render();
  },
  profToggleTeach() { const p = myProfile(); p.willingToTeach = !p.willingToTeach; toast("Profile saved."); render(); },
  profSet(field, val) { myProfile()[field] = val; toast("Profile saved."); render(); },
  profSetQuiet(field, val) { myProfile()[field] = val; },
  setPref(group, val) { S.notifPrefs[group] = val; toast("Notification preference saved."); render(); },

  /* misc */
  viewProfile(profileId) { S.ui.modal = { type: "profile", profileId }; renderModal(); }
};

/* ---------- Boot ---------- */
document.addEventListener("click", (e) => {
  // close bell dropdown on outside click
  if (S && S.ui.bellOpen && !e.target.closest(".bell-wrap")) { S.ui.bellOpen = false; renderTop(); }
  // close location dropdowns on outside click
  if (!e.target.closest(".loc-field")) document.querySelectorAll(".loc-dd").forEach((el) => (el.style.display = "none"));
});
document.addEventListener("keydown", (e) => {
  if (document.body.classList.contains("tour-lock")) return; // tour owns escape while a walkthrough runs
  if (e.key === "Escape" && S) {
    if (S.ui.modal) { S.ui.modal = null; renderModal(); }
    else if (S.ui.bellOpen) { S.ui.bellOpen = false; renderTop(); }
  }
});
window.addEventListener("hashchange", render);
S = freshState();
if (!location.hash) location.hash = "#/home";
render();
