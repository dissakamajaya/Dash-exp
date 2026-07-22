import type { SoundName } from "cuelume";
import type { StaffId } from "@/lib/session";


export type Destination = {
  id: string;
  name: string;
  shapeIndex: number;
  accent: string;
  route: string;
  /** Production URL the gateway redirects to after login. */
  url: string;
  /** No deployed app yet — show the in-page splash instead of redirecting. */
  comingSoon?: boolean;
  /** Sound cue played on selection. */
  cue: SoundName;
};

export type GatewayUser = {
  id: StaffId;
  name: string;
  shapeIndex: number;
  accent: string;
  /** Sound cue played on selection. */
  cue: SoundName;
};

export type SelectorItem = {
  id: string;
  name: string;
  shapeIndex: number;
  accent: string;
  kind: "destination" | "user";
  cue: SoundName;
};

export const DESTINATIONS: Destination[] = [
  { id: "portal", name: "Portal", shapeIndex: 0, accent: "#9360eb", route: "/portal", url: "https://client.houseofexp.com/admin", cue: "sparkle" },
  { id: "journal", name: "Journal", shapeIndex: 1, accent: "#eb609f", route: "/journal", url: "https://finance.houseofexp.com/", cue: "tick" },
  { id: "rental", name: "Rental", shapeIndex: 2, accent: "#60bfeb", route: "/rental", url: "https://rental.houseofexp.com/", comingSoon: true, cue: "droplet" },
  { id: "studiostaff", name: "StudioStaff®", shapeIndex: 3, accent: "#eb9f60", route: "/studiostaff", url: "https://studio.houseofexp.com/", cue: "page" },
  { id: "academy", name: "Academy", shapeIndex: 4, accent: "#ebcb60", route: "/academy", url: "https://academy.houseofexp.com/", comingSoon: true, cue: "chime" },
  { id: "research", name: "Research", shapeIndex: 5, accent: "#60ebd0", route: "/research", url: "", comingSoon: true, cue: "bloom" },
  { id: "admin", name: "House Admin", shapeIndex: 6, accent: "#6075eb", route: "/house-admin", url: "https://houseofexp.com/edit/", cue: "ready" },
];

export const STAFF_IDS = ["aldi", "dissa", "bil"] as const satisfies readonly StaffId[];

export const USERS: GatewayUser[] = [
  { id: "aldi", name: "Pak Aldi", shapeIndex: 7, accent: "#c070eb", cue: "chime" },
  { id: "dissa", name: "Pak Dissa", shapeIndex: 8, accent: "#70a7eb", cue: "ready" },
  { id: "bil", name: "Pak Bil", shapeIndex: 9, accent: "#70ebb1", cue: "sparkle" },
];

export const SELECTOR_ITEMS: SelectorItem[] = [
  ...DESTINATIONS.map((item) => ({ ...item, kind: "destination" as const })),
  ...USERS.map((item) => ({ ...item, kind: "user" as const })),
];

export const STORAGE_KEY = "hox-gateway-selection";
