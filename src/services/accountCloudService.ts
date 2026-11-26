import type { User } from 'firebase/auth';
import {
  AgentPerformanceRecord,
  AutonomousSwarmStatus,
  GrowthCampaignBrief,
  OutboundClickSummary,
  SolarQuoteSnapshotRecord,
  SwarmAgentId,
  SwarmDeliberationResult,
  SwarmRunRecord,
  UtilityRateProfileRecord,
} from '../types/solar';

async function authFetch(
  user: User,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const idToken = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${idToken}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...init, headers });
}

export async function syncAccountProfile(user: User): Promise<void> {
  const res = await authFetch(user, '/api/account/sync', { method: 'POST' });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Failed to sync user account.');
  }
}

export async function fetchUtilityRateProfiles(
  user: User
): Promise<UtilityRateProfileRecord[]> {
  const res = await authFetch(user, '/api/utility-profiles');
  const payload = (await res.json().catch(() => ({}))) as {
    profiles?: UtilityRateProfileRecord[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to load utility rate profiles.');
  }
  return Array.isArray(payload.profiles) ? payload.profiles : [];
}

export async function createUtilityRateProfile(
  user: User,
  input: {
    label: string;
    locationQuery: string;
    utilityContext: string;
    ratePerKwh: number;
    isDefault?: boolean;
  }
): Promise<UtilityRateProfileRecord> {
  const res = await authFetch(user, '/api/utility-profiles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    profile?: UtilityRateProfileRecord;
    error?: string;
  };
  if (!res.ok || !payload.profile) {
    throw new Error(payload.error || 'Failed to save utility rate profile.');
  }
  return payload.profile;
}

export async function removeUtilityRateProfile(
  user: User,
  profileId: number
): Promise<void> {
  const res = await authFetch(user, `/api/utility-profiles/${profileId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Failed to delete utility rate profile.');
  }
}

export async function fetchSolarQuoteSnapshots(
  user: User
): Promise<SolarQuoteSnapshotRecord[]> {
  const res = await authFetch(user, '/api/solar-quotes');
  const payload = (await res.json().catch(() => ({}))) as {
    quotes?: SolarQuoteSnapshotRecord[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to load saved hardware quotes.');
  }
  return Array.isArray(payload.quotes) ? payload.quotes : [];
}

export async function createSolarQuoteSnapshotClient(
  user: User,
  input: {
    quoteTitle: string;
    totalLandedCost: number;
    totalStorageWh: number;
    totalSolarWatts: number;
    utilityRateSnapshot: number;
    items: {
      productId: string;
      productName: string;
      merchantId: string;
      quantity: number;
      unitLandedPrice: number;
    }[];
  }
): Promise<SolarQuoteSnapshotRecord> {
  const res = await authFetch(user, '/api/solar-quotes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    quote?: SolarQuoteSnapshotRecord;
    error?: string;
  };
  if (!res.ok || !payload.quote) {
    throw new Error(payload.error || 'Failed to save hardware quote snapshot.');
  }
  return payload.quote;
}

export async function removeSolarQuoteSnapshotClient(
  user: User,
  quoteId: number
): Promise<void> {
  const res = await authFetch(user, `/api/solar-quotes/${quoteId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Failed to delete hardware quote.');
  }
}

export async function runLiveSwarmDeliberation(input: {
  directive: string;
  catalogSummary: string;
  buildSummary: string;
  utilityRate: number;
  activeAgentIds: SwarmAgentId[];
}): Promise<SwarmDeliberationResult> {
  const res = await fetch('/api/swarm/deliberate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    result?: SwarmDeliberationResult;
    error?: string;
  };
  if (!res.ok || !payload.result) {
    throw new Error(payload.error || 'Failed to run Live AI Swarm deliberation.');
  }
  return payload.result;
}

export async function fetchSwarmState(user: User): Promise<{
  runs: SwarmRunRecord[];
  metrics: AgentPerformanceRecord[];
}> {
  const res = await authFetch(user, '/api/swarm/state');
  const payload = (await res.json().catch(() => ({}))) as {
    runs?: SwarmRunRecord[];
    metrics?: AgentPerformanceRecord[];
    error?: string;
  };
  if (!res.ok) {
    throw new Error(payload.error || 'Failed to load Swarm history.');
  }
  return {
    runs: Array.isArray(payload.runs) ? payload.runs : [],
    metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
  };
}

export async function persistSwarmRunClient(
  user: User,
  deliberation: SwarmDeliberationResult
): Promise<{
  run: SwarmRunRecord;
  metrics: AgentPerformanceRecord[];
}> {
  const res = await authFetch(user, '/api/swarm/runs', {
    method: 'POST',
    body: JSON.stringify({
      missionTitle: deliberation.missionTitle,
      directive: deliberation.directive,
      chiefOfStaffSummary: deliberation.chiefOfStaffSummary,
      consensusScore: deliberation.consensusScore,
      approveVotes: deliberation.approveVotes,
      cautionVotes: deliberation.cautionVotes,
      holdVotes: deliberation.holdVotes,
      proposedActionType: deliberation.proposedAction.actionType,
      proposedActionLabel: deliberation.proposedAction.actionLabel,
      proposedPayloadJson: JSON.stringify(deliberation.proposedAction),
      agentVotes: deliberation.agentVotes,
    }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    run?: SwarmRunRecord;
    metrics?: AgentPerformanceRecord[];
    error?: string;
  };
  if (!res.ok || !payload.run) {
    throw new Error(payload.error || 'Failed to save Swarm deliberation.');
  }
  return {
    run: payload.run,
    metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
  };
}

export async function decideSwarmRunClient(
  user: User,
  runId: number,
  ceoDecision: 'approved' | 'rejected',
  executedSummary: string
): Promise<{
  run: SwarmRunRecord;
  metrics: AgentPerformanceRecord[];
}> {
  const res = await authFetch(user, `/api/swarm/runs/${runId}/decision`, {
    method: 'PATCH',
    body: JSON.stringify({ ceoDecision, executedSummary }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    run?: SwarmRunRecord;
    metrics?: AgentPerformanceRecord[];
    error?: string;
  };
  if (!res.ok || !payload.run) {
    throw new Error(payload.error || 'Failed to save Human CEO decision.');
  }
  return {
    run: payload.run,
    metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
  };
}

export async function toggleSwarmAgentActiveClient(
  user: User,
  agentId: SwarmAgentId,
  isActive: boolean
): Promise<AgentPerformanceRecord> {
  const res = await authFetch(user, `/api/swarm/agents/${agentId}/toggle`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    metric?: AgentPerformanceRecord;
    error?: string;
  };
  if (!res.ok || !payload.metric) {
    throw new Error(payload.error || 'Failed to update agent status.');
  }
  return payload.metric;
}

export async function fetchGrowthAnalytics(): Promise<{
  summary: OutboundClickSummary;
  briefs: GrowthCampaignBrief[];
}> {
  const res = await fetch('/api/growth/analytics');
  const payload = (await res.json().catch(() => ({}))) as {
    summary?: OutboundClickSummary;
    briefs?: GrowthCampaignBrief[];
    error?: string;
  };
  if (!res.ok || !payload.summary) {
    throw new Error(payload.error || 'Failed to load growth analytics.');
  }
  return {
    summary: payload.summary,
    briefs: Array.isArray(payload.briefs) ? payload.briefs : [],
  };
}

export async function generateGrowthBriefClient(input: {
  briefType: string;
  targetSlug: string;
  utilityRate: number;
  focusSummary: string;
}): Promise<GrowthCampaignBrief> {
  const res = await fetch('/api/growth/generate-brief', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    brief?: GrowthCampaignBrief;
    error?: string;
  };
  if (!res.ok || !payload.brief) {
    throw new Error(payload.error || 'Failed to generate AI distribution brief.');
  }
  return payload.brief;
}

export async function fetchAutonomousSwarmStatus(): Promise<AutonomousSwarmStatus> {
  const res = await fetch('/api/swarm/autonomous-status');
  const payload = (await res.json().catch(() => ({}))) as {
    status?: AutonomousSwarmStatus;
    error?: string;
  };
  if (!res.ok || !payload.status) {
    throw new Error(payload.error || 'Failed to load autonomous swarm status.');
  }
  return payload.status;
}

export async function triggerAutonomousSwarmSweep(): Promise<AutonomousSwarmStatus> {
  const res = await fetch('/api/swarm/autonomous-run', { method: 'POST' });
  const payload = (await res.json().catch(() => ({}))) as {
    status?: AutonomousSwarmStatus;
    error?: string;
  };
  if (!res.ok || !payload.status) {
    throw new Error(payload.error || 'Failed to run autonomous swarm sweep.');
  }
  return payload.status;
}

export async function setAutonomousSwarmEnabled(
  autopilotEnabled: boolean
): Promise<AutonomousSwarmStatus> {
  const res = await fetch('/api/swarm/autonomous-config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autopilotEnabled }),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    status?: AutonomousSwarmStatus;
    error?: string;
  };
  if (!res.ok || !payload.status) {
    throw new Error(payload.error || 'Failed to update autopilot configuration.');
  }
  return payload.status;
}

export interface SlackStatusInfo {
  configured: boolean;
  mode: 'webhook' | 'bot-token' | 'unconfigured';
  channelId: string;
  channelUrl: string;
}

export interface SlackShareResult {
  delivered: boolean;
  configured: boolean;
  channelId?: string;
  channelUrl: string;
  formattedMessage: string;
  message?: string;
  error?: string;
}

export async function fetchSlackStatus(): Promise<SlackStatusInfo> {
  const res = await fetch('/api/slack/status');
  if (!res.ok) {
    return {
      configured: false,
      mode: 'unconfigured',
      channelId: 'C8Y7536BU',
      channelUrl: 'https://app.slack.com/client/T8Z8U3MPZ/C8Y7536BU',
    };
  }
  return (await res.json()) as SlackStatusInfo;
}

export async function dispatchSlackShare(input?: {
  mode?: 'launch-review' | 'daily-spotlight' | 'custom';
  customText?: string;
  publicUrl?: string;
}): Promise<SlackShareResult> {
  const res = await fetch('/api/slack/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input ?? {}),
  });
  const payload = (await res.json().catch(() => ({}))) as SlackShareResult;
  if (!res.ok && !payload.formattedMessage) {
    throw new Error(payload.error || 'Failed to dispatch Slack message.');
  }
  return payload;
}


