/* ================================================================
   Zenfolio Network prototype — mock data
   All names and businesses are fictional. Geography: south-central PA.
   ================================================================ */

const TOWNS = {
  harrisburg:    { name: "Harrisburg, PA",    lat: 40.2732, lng: -76.8867 },
  lancaster:     { name: "Lancaster, PA",     lat: 40.0379, lng: -76.3055 },
  york:          { name: "York, PA",          lat: 39.9626, lng: -76.7277 },
  carlisle:      { name: "Carlisle, PA",      lat: 40.2010, lng: -77.2003 },
  mechanicsburg: { name: "Mechanicsburg, PA", lat: 40.2143, lng: -77.0086 },
  chambersburg:  { name: "Chambersburg, PA",  lat: 39.9376, lng: -77.6614 },
  hershey:       { name: "Hershey, PA",       lat: 40.2859, lng: -76.6502 },
  elizabethtown: { name: "Elizabethtown, PA", lat: 40.1528, lng: -76.6027 },
  gettysburg:    { name: "Gettysburg, PA",    lat: 39.8309, lng: -77.2311 },
  lebanon:       { name: "Lebanon, PA",       lat: 40.3409, lng: -76.4113 }
};

/* Segmentation taxonomy (reuses shipped segmentation vocabulary) */
const TAXONOMY = [
  { id: "volume", label: "Volume (all types)", group: "Volume", children: ["vol-schools", "vol-sports", "vol-dance", "vol-events"] },
  { id: "vol-schools", label: "Schools",  group: "Volume", parent: "volume" },
  { id: "vol-sports",  label: "Sports",   group: "Volume", parent: "volume" },
  { id: "vol-dance",   label: "Dance",    group: "Volume", parent: "volume" },
  { id: "vol-events",  label: "Events",   group: "Volume", parent: "volume" },
  { id: "weddings",    label: "Weddings",    group: "Client" },
  { id: "portraits",   label: "Portraits",   group: "Client" },
  { id: "family",      label: "Family",      group: "Client" },
  { id: "seniors",     label: "Seniors",     group: "Client" },
  { id: "newborn",     label: "Newborn",     group: "Client" },
  { id: "commercial",  label: "Commercial",  group: "Client" },
  { id: "real-estate", label: "Real Estate", group: "Client" }
];

const ROLES = [
  { id: "lead",      label: "Lead shooter" },
  { id: "second",    label: "Second shooter" },
  { id: "assistant", label: "Assistant" },
  { id: "coverage",  label: "Volume day coverage" }
];

const TOPICS = [
  { id: "portrait-lighting", label: "Portrait lighting" },
  { id: "off-camera-flash",  label: "Off-camera flash" },
  { id: "volume-workflow",   label: "Volume workflow" },
  { id: "second-shooting",   label: "Second shooting" },
  { id: "wedding-workflow",  label: "Wedding workflow" },
  { id: "posing",            label: "Posing" },
  { id: "pricing",           label: "Pricing" },
  { id: "business",          label: "Business" },
  { id: "editing",           label: "Editing" },
  { id: "real-estate-edu",   label: "Real estate" }
];

/* The three switchable demo viewpoints */
const PERSONAS = {
  marisol: {
    key: "marisol", profileId: "p-marisol",
    name: "Marisol Reyes", studio: "Reyes Volume Studio",
    role: "Volume studio owner", town: "lancaster",
    email: "marisol@reyesvolume.com", isVolume: true, av: "av-b", initials: "MR"
  },
  devon: {
    key: "devon", profileId: "p-devon",
    name: "Devon Blake", studio: "Devon Blake Photography",
    role: "Independent photographer", town: "mechanicsburg",
    email: "devon@devonblake.photo", isVolume: false, av: "av-a", initials: "DB"
  },
  eleanor: {
    key: "eleanor", profileId: "p-eleanor",
    name: "Eleanor Whitfield", studio: "Whitfield Weddings",
    role: "Educator · 15-year wedding veteran", town: "harrisburg",
    email: "eleanor@whitfieldweddings.com", isVolume: false, av: "av-d", initials: "EW"
  }
};

/* Network profiles (~12 seekers + the three personas) */
const DATA_PROFILES = [
  {
    id: "p-devon", name: "Devon Blake", town: "mechanicsburg", av: "av-a", initials: "DB",
    available: true, shootTypes: ["weddings", "portraits", "seniors"],
    roles: ["second", "lead"], radius: 50, rate: "$45–60/hr",
    gear: "", portfolio: "devonblake.zenfolio.site",
    wantsToLearn: ["volume-workflow", "portrait-lighting"], willingToTeach: false,
    activity: "Active this week"
  },
  {
    id: "p-sarah", name: "Sarah Mitchell", town: "harrisburg", av: "av-c", initials: "SM",
    available: true, shootTypes: ["volume", "vol-events"],
    roles: ["second", "assistant", "coverage"], radius: 50, rate: "$40–55/hr",
    gear: "Dual Canon bodies, 24-70, 70-200, strobes", portfolio: "sarahmitchell.zenfolio.site",
    wantsToLearn: ["editing"], willingToTeach: false, activity: "Active today"
  },
  {
    id: "p-tom", name: "Tom Herzog", town: "carlisle", av: "av-e", initials: "TH",
    available: true, shootTypes: ["vol-sports", "seniors"],
    roles: ["second", "lead"], radius: 50, rate: "$45–65/hr",
    gear: "Sony A7IV ×2, 70-200/2.8, AlienBees", portfolio: "tomherzog.zenfolio.site",
    wantsToLearn: [], willingToTeach: true, activity: "Active this week"
  },
  {
    id: "p-marcus", name: "Marcus Vega", town: "york", av: "av-f", initials: "MV",
    available: true, shootTypes: ["vol-schools", "vol-sports"],
    roles: ["assistant", "coverage"], radius: 100, rate: "$35–45/hr",
    gear: "Nikon Z6, posing tables, data-card workflow", portfolio: "marcusvega.zenfolio.site",
    wantsToLearn: ["volume-workflow"], willingToTeach: false, activity: "Active today"
  },
  {
    id: "p-nadia", name: "Nadia Osei", town: "harrisburg", av: "av-d", initials: "NO",
    available: true, shootTypes: ["vol-sports", "vol-schools", "seniors"],
    roles: ["second", "assistant"], radius: 50, rate: "$40–50/hr",
    gear: "Canon R6, 24-105, speedlights", portfolio: "nadiaosei.zenfolio.site",
    wantsToLearn: ["portrait-lighting"], willingToTeach: false, activity: "Active this week"
  },
  {
    id: "p-grant", name: "Grant Ellison", town: "mechanicsburg", av: "av-e", initials: "GE",
    available: true, shootTypes: ["volume"],
    roles: ["second", "coverage"], radius: 100, rate: "$45–60/hr",
    gear: "Full volume rig — dual bodies, strobes, greenscreen", portfolio: "keystonesports.zenfolio.site",
    wantsToLearn: [], willingToTeach: true, activity: "Active today"
  },
  {
    id: "p-priya", name: "Priya Raman", town: "lancaster", av: "av-a", initials: "PR",
    available: true, shootTypes: ["weddings", "family", "seniors"],
    roles: ["second"], radius: 25, rate: "$50–70/hr",
    gear: "Fuji X-T5 ×2, 16-55, 56/1.2", portfolio: "priyaraman.zenfolio.site",
    wantsToLearn: ["off-camera-flash"], willingToTeach: false, activity: "Active this week"
  },
  {
    id: "p-owen", name: "Owen Park", town: "harrisburg", av: "av-b", initials: "OP",
    available: true, shootTypes: ["portraits", "seniors"],
    roles: ["second", "assistant"], radius: 25, rate: "$35–50/hr",
    gear: "Canon R8, 50/1.8, 85/1.8", portfolio: "owenpark.zenfolio.site",
    wantsToLearn: ["portrait-lighting", "posing"], willingToTeach: false, activity: "Active today"
  },
  {
    id: "p-jess", name: "Jess Nakamura", town: "chambersburg", av: "av-c", initials: "JN",
    available: true, shootTypes: ["weddings", "seniors"],
    roles: ["second"], radius: 100, rate: "$50–75/hr",
    gear: "Sony A7IV, 35/1.4, 85/1.8, dual card", portfolio: "jessnakamura.zenfolio.site",
    wantsToLearn: ["wedding-workflow"], willingToTeach: false, activity: "Active this week"
  },
  {
    id: "p-caleb", name: "Caleb Moss", town: "york", av: "av-f", initials: "CM",
    available: true, shootTypes: ["seniors", "portraits"],
    roles: ["second"], radius: 50, rate: "$40–55/hr",
    gear: "Nikon Z6 II, 24-70, reflectors", portfolio: "calebmoss.zenfolio.site",
    wantsToLearn: ["posing", "business"], willingToTeach: false, activity: "Active this month"
  },
  {
    id: "p-alina", name: "Alina Kowalski", town: "hershey", av: "av-d", initials: "AK",
    available: true, shootTypes: ["newborn", "family", "portraits"],
    roles: ["lead"], radius: 25, rate: "$75–100/hr",
    gear: "Studio strobes, posing props, full newborn kit", portfolio: "alinakowalski.zenfolio.site",
    wantsToLearn: ["business"], willingToTeach: true, activity: "Active this week"
  },
  {
    id: "p-ray", name: "Ray Delgado", town: "york", av: "av-e", initials: "RD",
    available: true, shootTypes: ["commercial", "real-estate"],
    roles: ["lead", "second"], radius: 50, rate: "$60–90/hr",
    gear: "Canon R5, tilt-shift, drone (Part 107)", portfolio: "raydelgado.zenfolio.site",
    wantsToLearn: [], willingToTeach: true, activity: "Active this week"
  },
  {
    id: "p-eleanor", name: "Eleanor Whitfield", town: "harrisburg", av: "av-d", initials: "EW",
    available: true, shootTypes: ["weddings", "portraits"],
    roles: ["lead"], radius: 25, rate: "",
    gear: "", portfolio: "whitfieldweddings.zenfolio.site",
    wantsToLearn: [], willingToTeach: true, activity: "Active today"
  },
  {
    id: "p-marisol", name: "Marisol Reyes", studio: "Reyes Volume Studio", town: "lancaster", av: "av-b", initials: "MR",
    available: false, shootTypes: ["volume"],
    roles: [], radius: 50, rate: "",
    gear: "", portfolio: "reyesvolume.zenfolio.site",
    wantsToLearn: [], willingToTeach: false, activity: "Active today"
  }
];

/* Job leads. Today (in demo terms) is mid-August; dates run through mid-October. */
const DATA_LEADS = [
  {
    id: "l1", title: "Fall sports day — 2 second shooters",
    poster: { name: "Marisol Reyes", studio: "Reyes Volume Studio", initials: "MR", av: "av-b", portfolio: "reyesvolume.zenfolio.site" },
    personaKey: "marisol",
    shootTypes: ["vol-sports"], roles: ["second"], headcount: 2,
    dateLabel: "Sat, Sep 19", dateISO: "2026-09-19", time: "7:30 AM – 3:00 PM",
    town: "carlisle", radius: 50, pay: "$45/hr",
    description: "Two-field fall sports day for a youth league — roughly 400 athletes across 28 teams. You'll run a posing station with an assistant. Shot-flow training provided the morning of; we handle all fulfillment and delivery.",
    gear: "Full-frame body, 70-200mm or similar. Strobe experience a plus — we supply the lighting rig.",
    status: "open", visibility: "matched", postedAgo: "2d ago",
    stats: { notified: 23, viewed: 11 },
    interested: [
      { profileId: "p-sarah",  note: "I shoot league sports days every fall — dual bodies, and I know the banner workflow.", status: "interested" },
      { profileId: "p-tom",    note: "Carlisle local, 6 seasons of sports volume. Happy to help with setup too.", status: "interested" },
      { profileId: "p-grant",  note: "Have my own rig if you need a third station.", status: "interested" },
      { profileId: "p-nadia",  note: "Available all day — I've assisted on two of your league days before.", status: "interested" }
    ]
  },
  {
    id: "l2", title: "School picture day — assistant",
    poster: { name: "Marisol Reyes", studio: "Reyes Volume Studio", initials: "MR", av: "av-b", portfolio: "reyesvolume.zenfolio.site" },
    personaKey: "marisol",
    shootTypes: ["vol-schools"], roles: ["assistant"], headcount: 1,
    dateLabel: "Tue, Sep 8", dateISO: "2026-09-08", time: "8:00 AM – 1:30 PM",
    town: "york", radius: 30, pay: "$35/hr",
    description: "K–8 picture day at a York charter school. Assist with line flow, posing tweaks, and data cards. Great first volume day if you're newer to schools work.",
    gear: "None required — just comfortable shoes.",
    status: "open", visibility: "matched", postedAgo: "4d ago",
    stats: { notified: 9, viewed: 5 },
    interested: [
      { profileId: "p-marcus", note: "I run data cards for two other studios — very familiar with the flow.", status: "interested" },
      { profileId: "p-nadia",  note: "Free that Tuesday and happy to assist.", status: "interested" }
    ]
  },
  {
    id: "l3", title: "Second shooter — vineyard wedding",
    poster: { name: "Lauren Fitch", studio: "Willow & Pine Photography", initials: "LF", av: "av-a", portfolio: "willowandpine.zenfolio.site" },
    shootTypes: ["weddings"], roles: ["second"], headcount: 1,
    dateLabel: "Sat, Aug 29", dateISO: "2026-08-29", time: "1:00 PM – 9:30 PM",
    town: "hershey", radius: 50, pay: "$60/hr",
    description: "140-guest vineyard wedding outside Hershey. You'll own cocktail-hour candids, reception details, and a second angle on the ceremony. Gallery-ready culling not required — cards handed off same night.",
    gear: "Dual bodies required; 35mm and 85mm preferred.",
    status: "open", visibility: "matched", postedAgo: "6h ago",
    stats: { notified: 12, viewed: 7 }, interested: []
  },
  {
    id: "l4", title: "Senior portrait overflow — lead shooter",
    poster: { name: "Dana Brooks", studio: "Keystone Senior Portraits", initials: "DK", av: "av-c", portfolio: "keystoneseniors.zenfolio.site" },
    shootTypes: ["seniors"], roles: ["lead"], headcount: 1,
    dateLabel: "Week of Sep 14 (3 sessions)", dateISO: "2026-09-14", time: "Golden hour, flexible",
    town: "carlisle", radius: 25, pay: "$65/hr",
    description: "We're booked past capacity for fall seniors. Take three on-location sessions under our brand — we handle booking, editing, and delivery. Posing guide provided.",
    gear: "Full-frame body, 85mm or 70-200, reflector.",
    status: "open", visibility: "matched", postedAgo: "1d ago",
    stats: { notified: 8, viewed: 4 }, interested: []
  },
  {
    id: "l5", title: "Fall mini sessions — second shooter",
    poster: { name: "Tess Whitman", studio: "Golden Hour Family Co.", initials: "TW", av: "av-f", portfolio: "goldenhourfamily.zenfolio.site" },
    shootTypes: ["family", "seniors"], roles: ["second"], headcount: 1,
    dateLabel: "Sat, Oct 3", dateISO: "2026-10-03", time: "9:00 AM – 4:00 PM",
    town: "mechanicsburg", radius: 25, pay: "$50/hr",
    description: "Back-to-back 20-minute fall minis at a Mechanicsburg farm. You'll shoot candids and detail angles while I run the posed setups. 18 families booked.",
    gear: "Your choice — bring what you love for candids.",
    status: "open", visibility: "matched", postedAgo: "3d ago",
    stats: { notified: 10, viewed: 6 }, interested: []
  },
  {
    id: "l6", title: "Full-day second — barn wedding",
    poster: { name: "Nate Corbin", studio: "Juniper Lane Weddings", initials: "NC", av: "av-e", portfolio: "juniperlane.zenfolio.site" },
    shootTypes: ["weddings"], roles: ["second"], headcount: 1,
    dateLabel: "Sat, Sep 26", dateISO: "2026-09-26", time: "11:00 AM – 10:00 PM",
    town: "lancaster", radius: 50, pay: "$65/hr",
    description: "Full-day barn wedding in Lancaster County — 180 guests, two prep locations. Meal provided, travel stipend if you're over 30 miles out.",
    gear: "Dual bodies, fast primes, flash for reception.",
    status: "open", visibility: "matched", postedAgo: "5h ago",
    stats: { notified: 11, viewed: 5 }, interested: []
  },
  {
    id: "l7", title: "Dance studio picture week — day coverage",
    poster: { name: "Mia Tran", studio: "Encore Dance Photos", initials: "MT", av: "av-d", portfolio: "encoredance.zenfolio.site" },
    shootTypes: ["vol-dance"], roles: ["coverage"], headcount: 2,
    dateLabel: "Sep 21–25 (pick your days)", dateISO: "2026-09-21", time: "3:30 – 8:30 PM",
    town: "york", radius: 40, pay: "$40/hr",
    description: "Five evenings of dance studio portraits — individual and group setups on a pre-lit set. We train you on the pose list Monday afternoon.",
    gear: "Provided — you shoot on our tethered rig.",
    status: "open", visibility: "all", postedAgo: "1d ago",
    stats: { notified: 7, viewed: 3 }, interested: []
  },
  {
    id: "l8", title: "Newborn session coverage (maternity leave)",
    poster: { name: "Harper Voss", studio: "Little Wren Studio", initials: "HV", av: "av-a", portfolio: "littlewren.zenfolio.site" },
    shootTypes: ["newborn"], roles: ["lead"], headcount: 1,
    dateLabel: "Flexible — late August", dateISO: "2026-08-24", time: "Weekday mornings",
    town: "harrisburg", radius: 25, pay: "$75/hr",
    description: "Covering my studio's newborn sessions while I'm on leave — roughly 2 sessions a week for 6 weeks. Must have posed-newborn safety experience.",
    gear: "Studio is fully equipped — strobes, props, wraps.",
    status: "open", visibility: "matched", postedAgo: "2d ago",
    stats: { notified: 3, viewed: 2 }, interested: []
  },
  {
    id: "l9", title: "School retake day — second shooter",
    poster: { name: "Rich Adler", studio: "Cumberland Valley School Photos", initials: "RA", av: "av-e", portfolio: "cvschoolphotos.zenfolio.site" },
    shootTypes: ["vol-schools"], roles: ["second"], headcount: 1,
    dateLabel: "Tue, Oct 6", dateISO: "2026-10-06", time: "8:00 AM – 12:30 PM",
    town: "chambersburg", radius: 50, pay: "$38/hr",
    description: "Fall retake day at two adjacent elementary schools. You take the smaller building — about 120 students on a standard grey backdrop.",
    gear: "Body + 50mm; lighting provided.",
    status: "open", visibility: "matched", postedAgo: "6d ago",
    stats: { notified: 6, viewed: 2 }, interested: []
  },
  {
    id: "l10", title: "Product shoot assistant — 2 days",
    poster: { name: "Sam Ostrowski", studio: "Forge & Field Commercial", initials: "SO", av: "av-f", portfolio: "forgeandfield.zenfolio.site" },
    shootTypes: ["commercial"], roles: ["assistant"], headcount: 1,
    dateLabel: "Wed–Thu, Sep 2–3", dateISO: "2026-09-02", time: "9:00 AM – 5:00 PM",
    town: "lancaster", radius: 30, pay: "$50/hr",
    description: "Two studio days shooting a 60-SKU outdoor gear catalog. Assist with set builds, styling, and tethered capture.",
    gear: "None — studio equipped. Capture One familiarity a plus.",
    status: "open", visibility: "matched", postedAgo: "3d ago",
    stats: { notified: 4, viewed: 2 }, interested: []
  },
  {
    id: "l11", title: "Homecoming event coverage",
    poster: { name: "Grant Ellison", studio: "Keystone Sports Imaging", initials: "GE", av: "av-e", portfolio: "keystonesports.zenfolio.site" },
    shootTypes: ["vol-events"], roles: ["second"], headcount: 2,
    dateLabel: "Sat, Oct 10", dateISO: "2026-10-10", time: "6:00 – 10:00 PM",
    town: "hershey", radius: 40, pay: "$42/hr",
    description: "High school homecoming dance — two photographers on step-and-repeat stations. Fast-paced, fun crowd, all gear and lighting pre-set.",
    gear: "Provided.",
    status: "open", visibility: "all", postedAgo: "8h ago",
    stats: { notified: 9, viewed: 4 }, interested: []
  },
  {
    id: "l12", title: "Elopement second shooter",
    poster: { name: "Nate Corbin", studio: "Juniper Lane Weddings", initials: "NC", av: "av-e", portfolio: "juniperlane.zenfolio.site" },
    shootTypes: ["weddings"], roles: ["second"], headcount: 1,
    dateLabel: "Sat, Sep 12", dateISO: "2026-09-12", time: "3:00 – 8:00 PM",
    town: "gettysburg", radius: 50, pay: "$60/hr",
    description: "Intimate 20-guest elopement at an orchard outside Gettysburg.",
    gear: "Dual bodies, primes.",
    status: "filled", visibility: "matched", postedAgo: "1w ago",
    stats: { notified: 10, viewed: 8 }, interested: []
  }
];

/* Workshops & mentoring */
const DATA_WORKSHOPS = [
  {
    id: "w1", kind: "workshop", title: "Portrait Lighting Intensive",
    hostName: "Eleanor Whitfield", hostStudio: "Whitfield Weddings", hostProfileId: "p-eleanor", personaKey: "eleanor",
    hostAv: "av-d", hostInitials: "EW",
    format: "in-person", town: "harrisburg", venue: "Whitfield Studio, Harrisburg",
    seats: 8, sold: 3, price: 149,
    dateLabel: "Sat, Sep 12", time: "9:00 AM – 4:00 PM", duration: "Full day",
    topics: ["portrait-lighting", "off-camera-flash"], level: "Intermediate", cover: "g1",
    description: "A hands-on day in my studio covering one-light through three-light portrait setups, modifier choice, and how to light on location when you have ten minutes and a parking lot. Small group — everyone shoots every setup. Bring your camera and one lens; strobes provided.",
    roster: ["Owen Park", "Alina Kowalski", "Priya Raman"]
  },
  {
    id: "w2", kind: "workshop", title: "Second Shooter Bootcamp",
    hostName: "Eleanor Whitfield", hostStudio: "Whitfield Weddings", hostProfileId: "p-eleanor", personaKey: "eleanor",
    hostAv: "av-d", hostInitials: "EW",
    format: "virtual", meetingNote: "Meeting link sent on booking",
    seats: 25, sold: 11, price: 49,
    dateLabel: "Thu, Aug 27", time: "7:00 – 9:00 PM", duration: "2 hours",
    topics: ["second-shooting", "wedding-workflow"], level: "Beginner", cover: "g2",
    description: "Everything I wish my second shooters knew on day one: what to shoot when the lead is shooting, card and file handoff etiquette, how to get rebooked, and what to charge. Live over Zoom with Q&A — recording included with your seat.",
    roster: ["Owen Park", "Bree Hollis", "Caleb Moss", "Jess Nakamura", "+7 more"]
  },
  {
    id: "w3", kind: "workshop", title: "Volume Workflow 101",
    hostName: "Grant Ellison", hostStudio: "Keystone Sports Imaging", hostProfileId: "p-grant",
    hostAv: "av-e", hostInitials: "GE",
    format: "virtual", meetingNote: "Meeting link sent on booking",
    seats: 20, sold: 6, price: 59,
    dateLabel: "Tue, Sep 15", time: "12:00 – 1:30 PM", duration: "90 minutes",
    topics: ["volume-workflow"], level: "All levels", cover: "g3",
    description: "How a 400-subject sports day actually runs: station layout, data cards, shot flow, and the fulfillment pipeline. Ideal if you want to pick up paid volume-day work this fall.",
    roster: ["Marcus Vega", "Nadia Osei", "+4 more"]
  },
  {
    id: "w4", kind: "workshop", title: "Senior Posing on Location",
    hostName: "Tom Herzog", hostStudio: "Herzog Photography", hostProfileId: "p-tom",
    hostAv: "av-e", hostInitials: "TH",
    format: "in-person", town: "carlisle", venue: "Downtown Carlisle (walking session)",
    seats: 6, sold: 4, price: 129,
    dateLabel: "Sun, Sep 20", time: "1:00 – 5:00 PM", duration: "Half day",
    topics: ["posing"], level: "Intermediate", cover: "g4",
    description: "A live senior session with two real models. We rotate through urban and natural-light spots and build a pose flow you can reuse all season.",
    roster: ["Caleb Moss", "Owen Park", "+2 more"]
  },
  {
    id: "w5", kind: "mentoring", title: "Pricing & Portfolio Mentoring (1:1)",
    hostName: "Alina Kowalski", hostStudio: "Alina Kowalski Photography", hostProfileId: "p-alina",
    hostAv: "av-d", hostInitials: "AK",
    format: "virtual", meetingNote: "Meeting link sent on booking",
    seats: 1, sold: 0, price: 85, recurring: "Monthly — first Wednesday",
    dateLabel: "Wed, Sep 2", time: "By arrangement", duration: "60 minutes / session",
    topics: ["pricing", "business"], level: "All levels", cover: "g5",
    description: "One-on-one working sessions on your pricing, packages, and portfolio curation. We meet monthly and set concrete goals between sessions.",
    roster: []
  },
  {
    id: "w6", kind: "workshop", title: "Real Estate & Twilight Exteriors",
    hostName: "Ray Delgado", hostStudio: "Delgado Commercial", hostProfileId: "p-ray",
    hostAv: "av-e", hostInitials: "RD",
    format: "in-person", town: "york", venue: "Model home, east York",
    seats: 10, sold: 2, price: 99,
    dateLabel: "Thu, Oct 8", time: "4:00 – 8:00 PM", duration: "4 hours",
    topics: ["real-estate-edu"], level: "Beginner", cover: "g6",
    description: "Shoot a staged model home from daylight through twilight: window pulls, HDR vs. flambient, and the twilight exterior that sells the listing.",
    roster: ["Marcus Vega", "+1 more"]
  }
];

/* Availability listings (the reverse flow) */
const DATA_AVAILABILITY = [
  {
    id: "a1", profileId: "p-sarah",
    dates: "Saturdays in September & October", shootTypes: ["volume"], roles: ["second", "assistant", "coverage"],
    radius: 50, note: "Trained on volume workflow; I bring a dual-camera rig and can run a station solo.", postedAgo: "2d ago"
  },
  {
    id: "a2", profileId: "p-tom",
    dates: "Sep 14–30 (weekdays OK)", shootTypes: ["vol-sports", "seniors"], roles: ["second"],
    radius: 50, note: "Fall gap between my own senior sessions — happy to second on sports days.", postedAgo: "5d ago"
  },
  {
    id: "a3", profileId: "p-jess",
    dates: "Weekends through October", shootTypes: ["weddings"], roles: ["second"],
    radius: 100, note: "Will travel — comfortable owning a second angle unsupervised.", postedAgo: "1w ago"
  },
  {
    id: "a4", profileId: "p-owen",
    dates: "Weekday afternoons", shootTypes: ["portraits"], roles: ["assistant", "second"],
    radius: 25, note: "Building experience — happy to assist on anything portrait-adjacent.", postedAgo: "3d ago"
  },
  {
    id: "a5", profileId: "p-caleb",
    dates: "Fri–Sun through fall", shootTypes: ["seniors", "portraits"], roles: ["second"],
    radius: 50, note: "Senior-season overflow welcome — I match your editing style from a reference gallery.", postedAgo: "6d ago"
  }
];

/* Seeded notifications per persona */
const DATA_NOTIFS = {
  devon: [
    { text: "New lead matches your profile: “Full-day second — barn wedding” · Lancaster, PA", href: "#/lead/l6", unread: true, ago: "5h" },
    { text: "New lead matches your profile: “Fall mini sessions — second shooter” · Mechanicsburg, PA", href: "#/lead/l5", unread: true, ago: "1d" },
    { text: "New workshop matches your interests: Volume Workflow 101 (virtual)", href: "#/workshop/w3", unread: false, ago: "2d" },
    { text: "Weekly digest: 4 leads and 2 workshops matched you this week", href: "#/home", unread: false, ago: "3d" }
  ],
  marisol: [
    { text: "Sarah Mitchell is interested in “Fall sports day — 2 second shooters”", href: "#/manage/l1", unread: true, ago: "3h" },
    { text: "Tom Herzog is interested in “Fall sports day — 2 second shooters”", href: "#/manage/l1", unread: true, ago: "8h" },
    { text: "2 photographers near you just listed availability for volume work", href: "#/board/avail", unread: false, ago: "1d" },
    { text: "Marcus Vega is interested in “School picture day — assistant”", href: "#/manage/l2", unread: false, ago: "2d" }
  ],
  eleanor: [
    { text: "2 seats booked this week: Second Shooter Bootcamp", href: "#/workshop/w2", unread: true, ago: "5h" },
    { text: "3 photographers near Harrisburg want to learn portrait lighting", href: "#/host", unread: false, ago: "1d" },
    { text: "Portrait Lighting Intensive is in 4 weeks — 5 seats left", href: "#/workshop/w1", unread: false, ago: "2d" }
  ]
};
