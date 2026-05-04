export type SavedPropertyRow = {
  id: string;
  label: string;
  subtitle: string;
  price: string;
  status: "Viewing pending" | "Saved";
};

export type ActivityRow = {
  id: string;
  kind: "viewed" | "saved" | "searched";
  text: string;
  when: string;
};

export type BuyerDetail = {
  id: string;
  name: string;
  locationSubtitle: string;
  lastSeen: string;
  email: string;
  phone: string;
  location: string;
  priority: number;
  stats: { searches: number; scheduled: number; unread: number };
  filters: string[];
  savedProperties: SavedPropertyRow[];
  activity: ActivityRow[];
};
