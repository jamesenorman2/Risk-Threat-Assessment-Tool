// Shared primitives for the redesign: icons, tokens, density.

const Icons = {
  // 16px stroke 1.5 — consistent, quiet line style
  wrap: (path, size=16) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{path}</svg>
  ),
  home:     () => Icons.wrap(<><path d="M2.5 7L8 2.5 13.5 7V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V7z"/><path d="M6.5 13.5V9.5h3v4"/></>),
  target:   () => Icons.wrap(<><circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2"/></>),
  shield:   () => Icons.wrap(<path d="M8 1.5l5 2v4c0 3-2.2 5.4-5 6.5-2.8-1.1-5-3.5-5-6.5v-4l5-2z"/>),
  bolt:     () => Icons.wrap(<path d="M8.5 1.5L3 9h4l-.5 5.5L12 7H8z"/>),
  flag:     () => Icons.wrap(<><path d="M3 14V2"/><path d="M3 2.5h9l-1.5 3 1.5 3H3"/></>),
  cube:     () => Icons.wrap(<><path d="M8 1.5l5.5 3v7L8 14.5 2.5 11.5v-7z"/><path d="M2.5 4.5L8 7.5l5.5-3M8 7.5v7"/></>),
  list:     () => Icons.wrap(<><path d="M5 3.5h9M5 8h9M5 12.5h9"/><circle cx="2.5" cy="3.5" r=".5" fill="currentColor"/><circle cx="2.5" cy="8" r=".5" fill="currentColor"/><circle cx="2.5" cy="12.5" r=".5" fill="currentColor"/></>),
  book:     () => Icons.wrap(<path d="M2.5 2.5h5a2 2 0 0 1 2 2v9a1.5 1.5 0 0 0-1.5-1.5h-5.5v-9.5zM13.5 2.5h-5a2 2 0 0 0-2 2v9a1.5 1.5 0 0 1 1.5-1.5h5.5v-9.5z"/>),
  chart:    () => Icons.wrap(<><path d="M2 14V2M14 14H2"/><rect x="4" y="8" width="2" height="5"/><rect x="8" y="5" width="2" height="8"/><rect x="12" y="10" width="2" height="3"/></>),
  docs:     () => Icons.wrap(<><path d="M3.5 1.5h6L12.5 4.5V14a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5z"/><path d="M9.5 1.5v3h3M5.5 8h5M5.5 11h3"/></>),
  beaker:   () => Icons.wrap(<><path d="M6 1.5v4L2.5 12a1 1 0 0 0 .9 1.5h9.2a1 1 0 0 0 .9-1.5L10 5.5v-4"/><path d="M5 1.5h6"/></>),
  database: () => Icons.wrap(<><ellipse cx="8" cy="3.5" rx="5" ry="2"/><path d="M3 3.5v5c0 1.1 2.2 2 5 2s5-.9 5-2v-5"/><path d="M3 8.5v4c0 1.1 2.2 2 5 2s5-.9 5-2v-4"/></>),
  cog:      () => Icons.wrap(<><circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8L3.4 3.4"/></>),
  save:     () => Icons.wrap(<><path d="M2.5 2.5h8l3 3V13a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5z"/><rect x="4.5" y="8.5" width="7" height="5"/><path d="M5 2.5v3h5v-3"/></>),
  download: () => Icons.wrap(<><path d="M8 2v8M4.5 7L8 10.5 11.5 7"/><path d="M2.5 13h11"/></>),
  upload:   () => Icons.wrap(<><path d="M8 10V2M4.5 5L8 1.5 11.5 5"/><path d="M2.5 13h11"/></>),
  print:    () => Icons.wrap(<><path d="M4 6V2.5h8V6"/><rect x="2" y="6" width="12" height="6" rx="1"/><rect x="4.5" y="9" width="7" height="5"/></>),
  plus:     () => Icons.wrap(<><path d="M8 3v10M3 8h10"/></>),
  chevR:    () => Icons.wrap(<path d="M6 3l5 5-5 5"/>),
  chevD:    () => Icons.wrap(<path d="M3 6l5 5 5-5"/>),
  chevL:    () => Icons.wrap(<path d="M10 3L5 8l5 5"/>),
  search:   () => Icons.wrap(<><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5l3 3"/></>),
  alert:    () => Icons.wrap(<><path d="M8 1.5l6.5 11.5h-13L8 1.5z"/><path d="M8 6v3.5M8 11.5v.01"/></>),
  check:    () => Icons.wrap(<path d="M3 8l3.5 3.5L13 5"/>),
  dot:      () => Icons.wrap(<circle cx="8" cy="8" r="2.5" fill="currentColor" stroke="none"/>),
  user:     () => Icons.wrap(<><circle cx="8" cy="5.5" r="2.5"/><path d="M3 13.5c.5-2.3 2.6-4 5-4s4.5 1.7 5 4"/></>),
  copy:     () => Icons.wrap(<><rect x="5" y="5" width="8.5" height="8.5" rx="1"/><path d="M11 5V3a.5.5 0 0 0-.5-.5H3a.5.5 0 0 0-.5.5v7.5a.5.5 0 0 0 .5.5h2"/></>),
  paste:    () => Icons.wrap(<><rect x="3.5" y="3" width="9" height="11" rx="1"/><path d="M5.5 3V2a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 .5.5v1"/></>),
  sparkle:  () => Icons.wrap(<><path d="M8 1.5L9.2 6 13.5 8 9.2 10 8 14.5 6.8 10 2.5 8 6.8 6z"/></>),
  lock:     () => Icons.wrap(<><rect x="3" y="7" width="10" height="6.5" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></>),
  clock:    () => Icons.wrap(<><circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/></>),
  link:     () => Icons.wrap(<><path d="M7 9a3 3 0 0 0 4.2 0l1.8-1.8a3 3 0 0 0-4.2-4.2L8 3.8"/><path d="M9 7a3 3 0 0 0-4.2 0L3 8.8a3 3 0 0 0 4.2 4.2L8 12.2"/></>),
  filter:   () => Icons.wrap(<path d="M2 3h12l-4.5 5.5V13l-3-1.5V8.5L2 3z"/>),
  grid:     () => Icons.wrap(<><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></>),
  eye:      () => Icons.wrap(<><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></>),
  trash:    () => Icons.wrap(<><path d="M2.5 4.5h11M6 4.5V3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1.5M4 4.5l.7 9a.5.5 0 0 0 .5.5h5.6a.5.5 0 0 0 .5-.5l.7-9"/></>),
  more:     () => Icons.wrap(<><circle cx="3" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none"/></>),
  menu:     () => Icons.wrap(<><path d="M2 4h12M2 8h12M2 12h12"/></>),
  arrowR:   () => Icons.wrap(<path d="M3 8h10M9 4l4 4-4 4"/>),
  edit:     () => Icons.wrap(<><path d="M11 2.5l2.5 2.5L5.5 13 2.5 13.5 3 10.5 11 2.5z"/></>),
  calendar: () => Icons.wrap(<><rect x="2" y="3.5" width="12" height="10" rx="1"/><path d="M2 6.5h12M5.5 2v3M10.5 2v3"/></>),
  ext:      () => Icons.wrap(<><path d="M6 3H3.5a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V10"/><path d="M9.5 2.5h3.5V6M13.5 2.5L8 8"/></>),
};

// Nav items for the app — 14 sections from the original
const NAV_SECTIONS = [
  { group: 'Project',    items: [
    { id:'context',  label:'Context',                  icon:'home',     badge:null, active:true },
    { id:'criteria', label:'Criteria & Tolerances',    icon:'target',   badge:null },
    { id:'assets',   label:'Assets',                   icon:'cube',     badge:'12' },
    { id:'threats',  label:'Threats',                  icon:'bolt',     badge:'7' },
    { id:'poi',      label:'Points of Interest',      icon:'flag',     badge:null },
    { id:'vuln',     label:'Attractiveness / Vuln.',  icon:'shield',    badge:null },
  ]},
  { group: 'Analysis',   items: [
    { id:'impact',   label:'Impact',                   icon:'chart',    badge:null },
    { id:'controls', label:'Existing Controls',       icon:'check',    badge:'34' },
    { id:'risk',     label:'Risk Register',            icon:'list',     badge:'28', pulse:true },
    { id:'residual', label:'Residual Risk & Treatments', icon:'beaker', badge:null },
  ]},
  { group: 'Outputs',    items: [
    { id:'summary',  label:'Summary',                  icon:'docs',     badge:null },
    { id:'dashboard',label:'Dashboard',                icon:'grid',     badge:null },
    { id:'sms',      label:'SMS Requirements',         icon:'book',     badge:null },
  ]},
  { group: 'System',     items: [
    { id:'method',   label:'Methodology',              icon:'book',     badge:null },
    { id:'database', label:'Database',                 icon:'database', badge:null },
    { id:'settings', label:'Settings',                 icon:'cog',      badge:null },
  ]},
];

// Treatment categories — semantic, NOT random colors
const TREATMENT_CATEGORIES = [
  { key:'proc',  label:'Procedures',       glyph:'P' },
  { key:'elec',  label:'Electronic Sys.',  glyph:'E' },
  { key:'phys',  label:'Physical Struct.', glyph:'S' },
  { key:'resp',  label:'Response',         glyph:'R' },
  { key:'train', label:'Training',         glyph:'T' },
];

// Sample data for the screen
const SAMPLE = {
  projectName: 'Aberdeen Port — Terminal 3 Expansion',
  projectNumber: 'SRA-2026-0148',
  supportRef: 'MAR/AG/2026-09',
  date: '2026-04-23',
  rmsStage: 'Stage 2 — Risk Treatment',
  revision: 'Rev. C',
  client: 'Northsea Maritime Authority',
  siteAddress: 'Pocra Quay, Aberdeen AB11 5EJ',
  province: 'Aberdeenshire',
  country: 'United Kingdom',
  consignment: 'Mixed — liquid bulk, containerised',
  treatments: ['proc','elec','phys','resp','train'],
  scope: 'Assessment covers physical security, personnel screening, and cyber-physical controls for Terminal 3 expansion (berths 14–16). Excludes maritime perimeter beyond the HAT line and vessel-side security which remains under ISPS Code provisions.',
  assumptions: 'Operations continue under existing ISPS ship/port interface plan. Facility Security Officer (FSO) reports unchanged. No classified cargo within scope. Threat picture as of Q1 2026 bulletin from NaCTSO.',
  notes: 'Client requested emphasis on insider threat and unauthorised UAS activity over the berthing area. Previous assessment (2023) to be superseded in full.',
  meetings: [
    { date:'2026-03-14', desc:'Kick-off — scope & stakeholders',              attendees:'K. Morrison · J. Patel · FSO Aberdeen' },
    { date:'2026-03-28', desc:'Walk-down — berths 14–16 & gatehouse',         attendees:'Team + R. Okafor (Ops)' },
    { date:'2026-04-09', desc:'Threat briefing — NaCTSO liaison',              attendees:'J. Patel · DI Lawson' },
    { date:'2026-04-18', desc:'Stakeholder review — draft findings',           attendees:'Client exec · FSO · Legal' },
  ],
};

// Tokens exposed to window for other files
window.Icons = Icons;
window.NAV_SECTIONS = NAV_SECTIONS;
window.TREATMENT_CATEGORIES = TREATMENT_CATEGORIES;
window.SAMPLE = SAMPLE;
