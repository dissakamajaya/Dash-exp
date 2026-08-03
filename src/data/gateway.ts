import type { SoundName } from "cuelume";
import type { StaffId } from "@/lib/session";


export type Destination = {
  id: string;
  name: string;
  shapeIndex: string;
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
  shapeIndex: string;
  accent: string;
  /** Sound cue played on selection. */
  cue: SoundName;
};


export const DESTINATIONS: Destination[] = [
  { id: "portal", name: "Portal", shapeIndex: "portal", accent: "#9360eb", route: "/portal", url: "https://client.houseofexp.com/admin", cue: "sparkle" },
  { id: "journal", name: "Journal", shapeIndex: "journal", accent: "#eb609f", route: "/journal", url: "https://finance.houseofexp.com/", cue: "tick" },
  { id: "rental", name: "Rental", shapeIndex: "rental", accent: "#60bfeb", route: "/rental", url: "https://rental.houseofexp.com/", comingSoon: true, cue: "droplet" },
  { id: "studiostaff", name: "StudioStaff®", shapeIndex: "studiostaff", accent: "#eb9f60", route: "/studiostaff", url: "https://studio.houseofexp.com/", cue: "page" },
  { id: "academy", name: "Academy", shapeIndex: "academy", accent: "#ebcb60", route: "/academy", url: "https://academy.houseofexp.com/", comingSoon: true, cue: "chime" },
  { id: "research", name: "Research", shapeIndex: "research", accent: "#60ebd0", route: "/research", url: "", comingSoon: true, cue: "bloom" },
  { id: "admin", name: "House Admin", shapeIndex: "admin", accent: "#6075eb", route: "/house-admin", url: "https://houseofexp.com/edit/", cue: "ready" },
  { id: "crm", name: "CRM", shapeIndex: "crm", accent: "#7deb60", route: "/crm", url: "https://crm.houseofexp.com", cue: "success" },
];

export const STAFF_IDS = ["aldi", "dissa", "bil"] as const satisfies readonly StaffId[];

export const USERS: GatewayUser[] = [
  { id: "aldi", name: "Pak Aldi", shapeIndex: "user-aldi", accent: "#c070eb", cue: "chime" },
  { id: "dissa", name: "Pak Dissa", shapeIndex: "user-dissa", accent: "#70a7eb", cue: "ready" },
  { id: "bil", name: "Pak Bil", shapeIndex: "user-bil", accent: "#70ebb1", cue: "sparkle" },
];


export const STORAGE_KEY = "hox-gateway-selection";
