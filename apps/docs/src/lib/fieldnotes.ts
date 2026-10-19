/**
 * Content for the Fieldnotes demo (`components/fieldnotes/`): a birding log
 * played perfectly straight, for birds that are all, regrettably, overdue.
 */

export type Rarity = "Uncommon" | "Rare" | "Very rare";

export interface Species {
  slug: string;
  name: string;
  scientific: string;
  range: string;
  /** Year of the last accepted record. */
  lastSeen: number;
  rarity: Rarity;
  note: string;
  /** Initials of the naturalists on the record, for the avatar pile. */
  spotters: string[];
}

export const SPRITE_DIR = "/fieldnotes";
export const sprite = (slug: string) => `${SPRITE_DIR}/${slug}.webp`;

export const RARITY_VARIANT: Record<Rarity, string> = {
  Uncommon: "info",
  Rare: "warning",
  "Very rare": "destructive",
};

export const species: Species[] = [
  {
    slug: "dodo",
    name: "Dodo",
    scientific: "Raphus cucullatus",
    range: "Mauritius",
    lastSeen: 1662,
    rarity: "Very rare",
    note: "Ground-dwelling and unbothered by people. Approach quietly anyway.",
    spotters: ["VE", "BH", "JS"],
  },
  {
    slug: "great-auk",
    name: "Great auk",
    scientific: "Pinguinus impennis",
    range: "North Atlantic",
    lastSeen: 1844,
    rarity: "Very rare",
    note: "Flightless. Check rocky islets off Iceland and Newfoundland.",
    spotters: ["JB", "SI"],
  },
  {
    slug: "oahu-akialoa",
    name: "Oʻahu ʻakialoa",
    scientific: "Akialoa ellisiana",
    range: "Oʻahu, Hawaiʻi",
    lastSeen: 1837,
    rarity: "Rare",
    note: "Listen for tapping in koa forest. The long bill probes bark for insects.",
    spotters: ["AB", "FD"],
  },
  {
    slug: "carolina-parakeet",
    name: "Carolina parakeet",
    scientific: "Conuropsis carolinensis",
    range: "Eastern United States",
    lastSeen: 1918,
    rarity: "Uncommon",
    note: "Travels in noisy flocks along river bottoms. Fond of cockleburs.",
    spotters: ["JA", "CB", "EM", "RW"],
  },
];

export const bySlug = Object.fromEntries(species.map((s) => [s.slug, s])) as Record<
  string,
  Species
>;

export type Status = "Confirmed" | "Pending review";

export interface Sighting {
  slug: string;
  /** ISO date, or a bare year for the older records. */
  date: string;
  location: string;
  observer: string;
  count: number;
  status: Status;
}

export const sightings: Sighting[] = [
  {
    slug: "dodo",
    date: "2026-10-14",
    location: "Backyard feeder",
    observer: "You",
    count: 1,
    status: "Pending review",
  },
  {
    slug: "carolina-parakeet",
    date: "2026-10-09",
    location: "Riverside park",
    observer: "You",
    count: 12,
    status: "Pending review",
  },
  {
    slug: "great-auk",
    date: "2026-09-27",
    location: "Ferry terminal",
    observer: "You",
    count: 2,
    status: "Pending review",
  },
  {
    slug: "carolina-parakeet",
    date: "1918-02-21",
    location: "Cincinnati, Ohio",
    observer: "Zoo staff",
    count: 1,
    status: "Confirmed",
  },
  {
    slug: "great-auk",
    date: "1844-06-03",
    location: "Eldey, Iceland",
    observer: "J. Brandsson",
    count: 2,
    status: "Confirmed",
  },
  {
    slug: "oahu-akialoa",
    date: "1837",
    location: "Oʻahu, Hawaiʻi",
    observer: "F. Deppe",
    count: 1,
    status: "Confirmed",
  },
  {
    slug: "dodo",
    date: "1662",
    location: "Île d'Ambre, Mauritius",
    observer: "V. Evertsz",
    count: 1,
    status: "Confirmed",
  },
];

export const STATUS_VARIANT: Record<Status, string> = {
  Confirmed: "success",
  "Pending review": "muted",
};

/** Your sightings today by hour of day, for the life list chart: one big dawn. */
export const todayByHour: { hour: string; count: number }[] = [
  { hour: "4a", count: 0 },
  { hour: "5a", count: 1 },
  { hour: "6a", count: 7 },
  { hour: "7a", count: 3 },
  { hour: "8a", count: 1 },
  { hour: "9a", count: 0 },
  { hour: "10a", count: 0 },
  { hour: "11a", count: 1 },
  { hour: "12p", count: 0 },
  { hour: "1p", count: 0 },
  { hour: "2p", count: 0 },
  { hour: "3p", count: 1 },
  { hour: "4p", count: 2 },
  { hour: "5p", count: 4 },
  { hour: "6p", count: 2 },
  { hour: "7p", count: 0 },
];

export interface Spotter {
  initials: string;
  name: string;
  detail: string;
}

export const spotters: Spotter[] = [
  { initials: "YO", name: "You", detail: "3 sightings pending review" },
  { initials: "JA", name: "John James Audubon", detail: "Painted 2 of your 4 species" },
  { initials: "JB", name: "Jón Brandsson", detail: "Last confirmed great auk, 1844" },
  { initials: "VE", name: "Volkert Evertsz", detail: "Last confirmed dodo, 1662" },
];
