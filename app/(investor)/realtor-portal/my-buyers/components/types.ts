/** Optional second badge; omit or `'none'` to show acreage only. */
export type SavedPropertyViewRequest = "none" | "pending" | "scheduled" | "completed";

export type SavedPropertyRow = {
  id: string;
  thumbnailSrc: string;
  price: string;
  subtitle: string;
  address: string;
  acreageLabel: string;
  viewingRequest: SavedPropertyViewRequest;
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
  avatarUrl?: string;
  locationSubtitle: string;
  lastActiveAt: string;
  email: string;
  phone: string;
  location: string;
  priority: number;
  stats: { searches: number; scheduled: number; unread: number };
  filters: string[];
  savedProperties: SavedPropertyRow[];
  activity: ActivityRow[];
};
