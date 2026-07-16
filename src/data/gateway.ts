import type { SoundName } from "cuelume";

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
  id: string;
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
  { id: "studio", name: "Studio", shapeIndex: 0, accent: "#a78bfa", route: "/studio", url: "https://studio.houseofexp.com/", cue: "sparkle" },
  { id: "finance", name: "Finance", shapeIndex: 1, accent: "#f472b6", route: "/finance", url: "https://finance.houseofexp.com/", cue: "tick" },
  { id: "rental", name: "Rental", shapeIndex: 2, accent: "#38bdf8", route: "/rental", url: "https://rental.houseofexp.com/", comingSoon: true, cue: "droplet" },
  { id: "admin", name: "Website Admin", shapeIndex: 3, accent: "#fb923c", route: "/website-admin", url: "https://houseofexp.com/edit/", cue: "page" },
  { id: "client", name: "Client Portal", shapeIndex: 4, accent: "#2dd4bf", route: "/client-portal", url: "https://client.houseofexp.com/", cue: "bloom" },
  { id: "academy", name: "Academy", shapeIndex: 5, accent: "#facc15", route: "/academy", url: "https://academy.houseofexp.com/", comingSoon: true, cue: "chime" },
];

export const USERS: GatewayUser[] = [
  { id: "aldi", name: "Pak Aldi", shapeIndex: 6, accent: "#c084fc", cue: "chime" },
  { id: "dissa", name: "Pak Dissa", shapeIndex: 7, accent: "#60a5fa", cue: "ready" },
  { id: "bil", name: "Pak Bil", shapeIndex: 8, accent: "#34d399", cue: "sparkle" },
];

export const SELECTOR_ITEMS: SelectorItem[] = [
  ...DESTINATIONS.map((item) => ({ ...item, kind: "destination" as const })),
  ...USERS.map((item) => ({ ...item, kind: "user" as const })),
];

export const STORAGE_KEY = "hox-gateway-selection";
