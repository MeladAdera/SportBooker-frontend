import { apiFetch, ApiError, parseApiErrorBody } from '@/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FakePlayerResponse = {
  id: string;
  name: string;
  email: string;
  photoUrl: string;
  skillLevel: string;
  preferredPosition: string;
  dominantFoot: string;
  preferredDays: string[];
  createdAt: string;
};

export type CreateFakePlayerDto = {
  name?: string;
  photoUrl?: string;
  skillLevel?: string;
  preferredPosition?: string;
  dominantFoot?: string;
  preferredDays?: string[];
};

export type BulkCreateFakePlayersDto = {
  count: number;
  seed?: number;
};

export type BulkCreateFakePlayersResponse = {
  count: number;
  players: FakePlayerResponse[];
};

export type AutoFillFakeMatchDto = {
  count?: number;
};

export type AutoFillFakeMatchResponse = {
  filled: number;
  confirmedCount: number;
  fakeBookingsCount: number;
  spotsRemaining: number;
};

export type ClearFakesMatchResponse = {
  removed: number;
  confirmedCount: number;
  fakeBookingsCount: number;
  spotsRemaining: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let envelope = null;
    try {
      envelope = parseApiErrorBody(JSON.parse(text));
    } catch {
      /* noop */
    }
    throw new ApiError(
      envelope ?? {
        statusCode: res.status,
        message: res.statusText || 'Request failed',
      },
    );
  }
  if (!text) return undefined as unknown as T;
  const json = JSON.parse(text) as Record<string, unknown>;
  return (json?.data ?? json) as T;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const fakePlayersKeys = {
  all: ['operator', 'fakePlayers'] as const,
};

// ── API functions ─────────────────────────────────────────────────────────────

export async function createFakePlayer(
  dto?: CreateFakePlayerDto,
): Promise<FakePlayerResponse> {
  const res = await apiFetch('/admin/fake-players', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto ?? {}),
  });
  return parseResponse<FakePlayerResponse>(res);
}

export async function bulkCreateFakePlayers(
  dto: BulkCreateFakePlayersDto,
): Promise<BulkCreateFakePlayersResponse> {
  const res = await apiFetch('/admin/fake-players/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto),
  });
  return parseResponse<BulkCreateFakePlayersResponse>(res);
}

export async function deleteFakePlayer(id: string): Promise<void> {
  const res = await apiFetch(`/admin/fake-players/${id}`, {
    method: 'DELETE',
  });
  await parseResponse<{ deleted: boolean }>(res);
}

export async function autoFillFakeMatch(
  matchId: string,
  dto?: AutoFillFakeMatchDto,
): Promise<AutoFillFakeMatchResponse> {
  const res = await apiFetch(`/tenant/matches/${matchId}/auto-fill-fake`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dto ?? {}),
  });
  return parseResponse<AutoFillFakeMatchResponse>(res);
}

export async function clearFakesMatch(
  matchId: string,
): Promise<ClearFakesMatchResponse> {
  const res = await apiFetch(`/tenant/matches/${matchId}/clear-fakes`, {
    method: 'POST',
  });
  return parseResponse<ClearFakesMatchResponse>(res);
}
