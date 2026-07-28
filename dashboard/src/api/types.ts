export interface SettingsProfile {
  id: string;
  name: string;
  configJson: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  defaultProfileId: string | null;
  defaultProfile?: SettingsProfile | null;
}

export interface Device {
  id: string;
  name: string;
  groupId: string | null;
  group?: Group | null;
  profileId: string | null;
  profile?: SettingsProfile | null;
  lastSeenAt: string | null;
  batteryLevel: number | null;
  ipAddress: string | null;
  currentUrlOrApp: string | null;
  appVersion: string | null;
  androidVersion: string | null;
  model: string | null;
  isOnline: boolean;
  enrollmentCode: string | null;
  enrollmentCodeExpiresAt: string | null;
}

export type CommandType =
  | "RELOAD"
  | "LOCK"
  | "UNLOCK"
  | "REBOOT"
  | "RESTART_APP"
  | "REQUEST_SCREENSHOT"
  | "APPLY_PROFILE"
  | "SET_URL";

export interface Command {
  id: string;
  deviceId: string;
  type: CommandType;
  payload: unknown;
  status: "PENDING" | "ACKED" | "FAILED";
  result: unknown;
  createdAt: string;
  ackedAt: string | null;
}

export interface HeartbeatLog {
  id: string;
  deviceId: string;
  timestamp: string;
  batteryLevel: number | null;
  ipAddress: string | null;
  currentUrlOrApp: string | null;
}

export interface Screenshot {
  id: string;
  deviceId: string;
  filePath: string;
  capturedAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
}

// tv-kiosk digital-signage app (proxied — see backend/src/routes/signage.routes.ts)
export interface SignageMedia {
  id: string;
  filename: string;
  originalName: string;
  type: "image" | "video";
  path: string;
  mimetype: string;
}

export interface SignagePlayback {
  type: "single" | "slideshow";
  mediaId?: string;
  mediaIds?: string[];
}

export interface SignageSettings {
  slideshowInterval: number;
}
