/** Optional second badge; omit or `'none'` to show acreage only. */
export type SavedPropertyViewRequest = "none" | "pending" | "scheduled" | "completed";

export type SavedPropertyRow = {
  id: string;
  /** Listing photo from API; satellite uses lat/lng on the client when available. */
  thumbnailSrc: string;
  latitude?: number | null;
  longitude?: number | null;
  url?: string;
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
  /** Viewing request listing address (kind === "viewed"). */
  address?: string;
  /** Saved property listing title (kind === "saved"). */
  title?: string;
  /** Listing URL (kind === "viewed" | "saved"). */
  url?: string;
  prompt?: string | null;
  state?: string;
  county?: string;
  priceRange?: string;
  size?: string;
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
  preferenceBudget: string;
  preferenceAcreage: string;
  preferencePurpose: string;
  preferenceTimeframe: string;
  priority: number;
  unreadMessages: number;
  savedPropertiesCount: number;
  savedSearches: number;
  viewingRequests: { pending: number; scheduled: number; completed: number };
  stats: { searches: number; scheduled: number; unread: number };
  filters: string[];
  savedProperties: SavedPropertyRow[];
  activity: ActivityRow[];
};
