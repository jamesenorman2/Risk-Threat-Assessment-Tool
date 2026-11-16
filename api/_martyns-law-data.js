// Curated baseline for the Martyn's Law (Terrorism (Protection of Premises)
// Act 2025) card.
//
// The underscore prefix keeps Vercel from exposing this file as a route.
//
// This is what the app shows when no live check is possible, and what live
// results are compared against: if the official sources move on (a new
// regulation is made, or GOV.UK updates a page we track), /api/martyns-law
// reports the difference and the app flags it. When that happens, re-read the
// sources and update this file, then bump `reviewed`.
//
// Provenance matters on a compliance topic, so each fact says where it came
// from. "primary" = read directly from legislation.gov.uk on the review date.
// "reported" = taken from GOV.UK / NHS England pages as surfaced by search,
// not read in full — verify before relying on it.

module.exports = {
  reviewed: "2026-11-16",

  act: {
    title: "Terrorism (Protection of Premises) Act 2025",
    short: "Martyn’s Law",
    citation: "2025 c. 10",
    royalAssent: "2025-04-03",
    url: "https://www.legislation.gov.uk/ukpga/2025/10",
    basis: "primary",
  },

  regulator: {
    name: "Security Industry Authority (SIA)",
    url: "https://www.sia.homeoffice.gov.uk/",
    note: "Regulates the Act across the whole of the UK.",
  },

  // Where the Act stands today.
  status: {
    premisesDutiesInForce: false,
    headline: "Part in force — premises duties not yet commenced",
    detail:
      "Only the guidance and regulator-preparation provisions are in force. The duties on the people responsible for premises (sections 5–10) have no commencement date yet; a date will be set by further commencement regulations. Spring 2027 is the reported expectation, not a date set in legislation.",
    expected: "Spring 2027 — no date has been fixed yet",
    expectedBasis: "reported",
    inForce: [
      {
        provision: "Section 27 — guidance",
        date: "2026-04-10",
        instrument: "SI 2026/320, Commencement No. 1",
      },
      {
        provision:
          "Section 12(2) and (3) except (2)(c) — SIA guidance and advice; section 18(5)–(7) — qualifying worldwide revenue statement",
        date: "2026-06-15",
        instrument: "SI 2026/622, Commencement No. 2",
      },
    ],
    basis: "primary",
  },

  // Who it applies to and what it requires. Section references are to the Act.
  tiers: [
    {
      id: "standard",
      name: "Standard duty",
      capacity: "200–799 individuals",
      requires:
        "Appropriate public protection procedures, so far as reasonably practicable (s.5), plus notifying the SIA (s.9).",
      maxPenalty: "£10,000",
    },
    {
      id: "enhanced",
      name: "Enhanced duty",
      capacity: "800 or more individuals",
      requires:
        "Standard duty, plus assessing and keeping under review appropriate public protection measures and putting them in place so far as reasonably practicable (s.6), documenting compliance (s.7), and designating a senior individual where the responsible person is not an individual (s.10).",
      maxPenalty: "£18 million or 5% of qualifying worldwide revenue, whichever is greater",
    },
  ],
  tierBasis:
    "The test (s.2) is whether it is reasonable to expect that from time to time that many individuals may be present on the premises at the same time in connection with a Schedule 1 use. Premises must also be wholly or mainly used for a Schedule 1 use and not be excluded (Schedule 2).",
  tiersSource: "primary",

  // Hospitals and health care.
  healthcare: {
    summary:
      "Use as a hospital or for the provision of health care is a specified use in Schedule 1 (paragraph 10). Unlike places of worship, health care is not fixed at standard duty — the tier follows expected capacity.",
    responsiblePerson:
      "Where a hospital is operated by an NHS trust, NHS foundation trust or Health and Social Care trust, that trust is the responsible person; where it is operated by a Health Board or Special Health Board, that Board; in any other case, the hospital’s governing body (Schedule 1, para 10(2)).",
    campus:
      "Where qualifying premises form part of other qualifying premises and the same person is responsible for two or more of them, they are treated as one set of premises (s.2(5)) — relevant to hospital campuses.",
    principalUse:
      "Where premises have two or more Schedule 1 uses (for example a hospital with retail, food and drink or a car park), the Principal Use of Premises Regulations 2026 (SI 2026/1005, in force 15 October 2026) determine which use is treated as the principal use.",
    basis: "primary",
    nhs: {
      title: "NHS England estates bulletin PRN02056 (November 2025): application to healthcare buildings",
      url: "https://www.england.nhs.uk/wp-content/uploads/2025/11/PRN02056-netb-terrorism-protection-of-premises-act-2025-application-to-healthcare-buildings.pdf",
      basis: "reported",
    },
  },

  // Statutory instruments made under the Act. New ones appearing in the
  // legislation.gov.uk feed are reported as drift.
  instruments: [
    {
      id: "uksi/2026/320",
      title: "The Terrorism (Protection of Premises) Act 2025 (Commencement No. 1) Regulations 2026",
      made: "2026-03-18",
      inForce: "2026-04-10",
    },
    {
      id: "uksi/2026/622",
      title: "The Terrorism (Protection of Premises) Act 2025 (Commencement No. 2) Regulations 2026",
      made: "2026-06-10",
      inForce: "2026-06-15",
    },
    {
      id: "uksi/2026/793",
      title: "The Terrorism (Protection of Premises) (Notification Requirements) Regulations 2026",
      made: "2026-07-09",
      inForce: "On the day section 9(1) of the Act comes fully into force",
    },
    {
      id: "uksi/2026/1005",
      title: "The Terrorism (Protection of Premises) (Principal Use of Premises) Regulations 2026",
      made: "2026-09-08",
      inForce: "2026-10-15",
    },
  ],

  // GOV.UK pages whose last-updated date is tracked through the GOV.UK
  // Content API. `knownUpdated` is the date we last saw for each.
  guidance: [
    {
      key: "statutory-guidance",
      title: "Statutory guidance (Home Office)",
      path: "/government/publications/the-terrorism-protection-of-premises-act-2025/terrorism-protection-of-premises-act-2025-statutory-guidance",
      knownUpdated: "2026-05-18",
      note: "Published 15 April 2026. A corrected version of the guidance PDF has since been issued — check the page’s change notes.",
      basis: "reported",
    },
    {
      key: "scope-factsheet",
      title: "Factsheet: scope of premises",
      path: "/government/publications/terrorism-protection-of-premises-act-2025-factsheets/terrorism-protection-of-premises-act-2025-scope-premises",
      knownUpdated: null,
      basis: "reported",
    },
    {
      key: "enhanced-factsheet",
      title: "Factsheet: enhanced duty requirements",
      path: "/government/publications/terrorism-protection-of-premises-act-2025-factsheets/terrorism-protection-of-premises-act-2025-enhanced-duty-requirements-factsheet",
      knownUpdated: null,
      basis: "reported",
    },
  ],

  // Parts we know are still outstanding — shown so users know what to watch.
  pending: [
    "Commencement regulations bringing the premises duties (sections 5–10) into force",
    "SIA’s final guidance on investigation and enforcement powers (section 12) — reported as still pending in late October 2026",
  ],

  sources: [
    { label: "The Act — legislation.gov.uk", url: "https://www.legislation.gov.uk/ukpga/2025/10" },
    { label: "Statutory instruments made under the Act", url: "https://www.legislation.gov.uk/uksi?title=Terrorism%20(Protection%20of%20Premises)" },
    { label: "Home Office statutory guidance — GOV.UK", url: "https://www.gov.uk/government/publications/the-terrorism-protection-of-premises-act-2025/terrorism-protection-of-premises-act-2025-statutory-guidance" },
    { label: "Security Industry Authority", url: "https://www.sia.homeoffice.gov.uk/" },
  ],
};
