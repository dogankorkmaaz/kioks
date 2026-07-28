import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  AdminUser,
  Command,
  CommandType,
  Device,
  Group,
  HeartbeatLog,
  Screenshot,
  SettingsProfile,
  SignageMedia,
  SignagePlayback,
  SignageSettings,
} from "./types";

export function useMe() {
  return useQuery<AdminUser>({
    queryKey: ["me"],
    queryFn: () => api.get("/api/auth/me"),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (creds: { email: string; password: string }) =>
      api.post<AdminUser>("/api/auth/login", creds),
    onSuccess: (user) => qc.setQueryData(["me"], user),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/auth/logout"),
    onSuccess: () => qc.setQueryData(["me"], null),
  });
}

// Devices — short refetch interval so the list reflects device heartbeats (every 15-30s) reasonably live.
export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: () => api.get("/api/admin/devices"),
    refetchInterval: 15_000,
  });
}

export function useCreateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; groupId?: string; profileId?: string }) =>
      api.post<Device>("/api/admin/devices", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

// Generates a fresh 6-character code for the device to redeem via the app's Settings
// screen (POST /api/enroll) — much friendlier to type on a TV remote than a raw token.
export function useGenerateEnrollmentCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (deviceId: string) => api.post<Device>(`/api/admin/devices/${deviceId}/enrollment-code`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; groupId?: string | null; profileId?: string | null; name?: string }) =>
      api.put<Device>(`/api/admin/devices/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/devices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });
}

export function useSendDeviceCommand() {
  return useMutation({
    mutationFn: ({ deviceId, type, payload }: { deviceId: string; type: CommandType; payload?: unknown }) =>
      api.post<Command>(`/api/admin/devices/${deviceId}/commands`, { type, payload }),
  });
}

export function useDeviceHeartbeats(deviceId: string | null) {
  return useQuery<HeartbeatLog[]>({
    queryKey: ["heartbeats", deviceId],
    queryFn: () => api.get(`/api/admin/devices/${deviceId}/heartbeats?limit=50`),
    enabled: !!deviceId,
  });
}

export function useLatestScreenshot(deviceId: string | null) {
  return useQuery<Screenshot | null>({
    queryKey: ["latest-screenshot", deviceId],
    queryFn: async () => {
      try {
        return await api.get<Screenshot>(`/api/admin/devices/${deviceId}/screenshots/latest`);
      } catch {
        return null;
      }
    },
    enabled: !!deviceId,
    refetchInterval: 15_000,
  });
}

// Groups
export function useGroups() {
  return useQuery<Group[]>({ queryKey: ["groups"], queryFn: () => api.get("/api/admin/groups") });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; defaultProfileId?: string | null }) =>
      api.post<Group>("/api/admin/groups", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useDeleteGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["groups"] }),
  });
}

export function useSendGroupCommand() {
  return useMutation({
    mutationFn: ({ groupId, type }: { groupId: string; type: CommandType }) =>
      api.post(`/api/admin/groups/${groupId}/commands`, { type }),
  });
}

// Profiles
export function useProfiles() {
  return useQuery<SettingsProfile[]>({ queryKey: ["profiles"], queryFn: () => api.get("/api/admin/profiles") });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; config: Record<string, unknown> }) =>
      api.post<SettingsProfile>("/api/admin/profiles", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; name?: string; config?: Record<string, unknown> }) =>
      api.put<SettingsProfile>(`/api/admin/profiles/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/profiles/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

// Signage (proxied tv-kiosk digital-signage app — see backend/src/routes/signage.routes.ts)
const SIGNAGE_BASE = "/api/admin/signage";

export function useSignageMedia() {
  return useQuery<SignageMedia[]>({
    queryKey: ["signage-media"],
    queryFn: () => api.get(`${SIGNAGE_BASE}/api/media`),
    refetchInterval: 15_000,
  });
}

export function useUploadSignageMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<SignageMedia>(`${SIGNAGE_BASE}/api/upload`, formData);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signage-media"] }),
  });
}

export function useDeleteSignageMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`${SIGNAGE_BASE}/api/media/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signage-media"] }),
  });
}

export function useSignageCurrent(tvId: string) {
  return useQuery<SignagePlayback | null>({
    queryKey: ["signage-current", tvId],
    queryFn: () => api.get(`${SIGNAGE_BASE}/api/current/${tvId}`),
    refetchInterval: 10_000,
  });
}

export function usePlaySignage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SignagePlayback & { tv?: string }) => api.post(`${SIGNAGE_BASE}/api/play`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signage-current"] }),
  });
}

export function useStopSignage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { tv?: string }) => api.post(`${SIGNAGE_BASE}/api/stop`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signage-current"] }),
  });
}

export function useSignageSettings() {
  return useQuery<SignageSettings>({
    queryKey: ["signage-settings"],
    queryFn: () => api.get(`${SIGNAGE_BASE}/api/settings`),
  });
}

export function useUpdateSignageSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slideshowInterval: number) => api.post(`${SIGNAGE_BASE}/api/settings`, { slideshowInterval }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["signage-settings"] }),
  });
}
