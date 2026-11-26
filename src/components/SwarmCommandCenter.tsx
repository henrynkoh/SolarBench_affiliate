import { useEffect, useMemo, useRef, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  LogIn,
  PauseCircle,
  Play,
  PlayCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  XCircle,
} from 'lucide-react';
import {
  AgentPerformanceRecord,
  AutonomousSwarmStatus,
  SolarProduct,
  SwarmAgentDivision,
  SwarmAgentId,
  SwarmDeliberationResult,
  SwarmProposedAction,
  SwarmRunRecord,
  SystemBuildItem,
} from '../types/solar';
import {
  SOLAR_SWARM_AGENTS,
  SWARM_MISSION_PRESETS,
  buildDeterministicSwarmReplay,
} from '../data/solarSwarm';
import { getBestOffer, getOfferLandedPrice } from '../data/solarCatalog';
import { signInWithGoogleForArchive } from '../lib/firebase';
import {
  decideSwarmRunClient,
  persistSwarmRunClient,
  runLiveSwarmDeliberation,
  toggleSwarmAgentActiveClient,
} from '../services/accountCloudService';

interface SwarmCommandCenterProps {
  catalog: SolarProduct[];
  buildItems: SystemBuildItem[];
  utilityRate: number;
  user: User | null;
  runs: SwarmRunRecord[];
  metrics: AgentPerformanceRecord[];
  autonomousStatus: AutonomousSwarmStatus | null;
  isSweepingAutonomous: boolean;
  onToggleAutopilot: (nextEnabled: boolean) => Promise<void>;
  onTriggerAutonomousSweep: () => Promise<void>;
  externalMissionRequest: {
    agentId?: SwarmAgentId;
    directive: string;
    nonce: number;
  } | null;
  onUpdateMetrics: (next: AgentPerformanceRecord[]) => void;
  onUpdateRuns: (next: SwarmRunRecord[]) => void;
  onExecuteCeoProposal: (
    proposal: SwarmProposedAction,
    missionTitle: string
  ) => string;
  onJumpToFeature: (anchor: string) => void;
  onNotify: (message: string) => void;
}

const WORKFLOW_STAGES = [
  {
    step: 1,
    code: '01',
    label: 'Chief Scan & Job Allocation',
    summary: 'Agent #01 Aria splits the CEO directive into 14 domain jobs.',
  },
  {
    step: 2,
    code: '02',
    label: '15-Agent Quorum Vote',
    summary: 'Core Bench & Growth agents audit prices, thermal IP, runtime, SEO & distribution.',
  },
  {
    step: 3,
    code: '03',
    label: 'CEO Dispatch Sent',
    summary: 'Chief Aria compiles safety guards and sends card to CEO phone.',
  },
  {
    step: 4,
    code: '04',
    label: 'Human CEO Stamp',
    summary: 'Human CEO inspects trade-offs and taps Approve or Reject.',
  },
  {
    step: 5,
    code: '05',
    label: 'Executed Across SolarBench',
    summary: 'Approved action mutates catalog/BOM live & updates agent SLAs.',
  },
];

export function SwarmCommandCenter({
  catalog,
  buildItems,
  utilityRate,
  user,
  runs,
  metrics,
  autonomousStatus,
  isSweepingAutonomous,
  onToggleAutopilot,
  onTriggerAutonomousSweep,
  externalMissionRequest,
  onUpdateMetrics,
  onUpdateRuns,
  onExecuteCeoProposal,
  onJumpToFeature,
  onNotify,
}: SwarmCommandCenterProps) {
  const [directive, setDirective] = useState(
    SWARM_MISSION_PRESETS[0].directive
  );
  const [easyStoryMode, setEasyStoryMode] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(3);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isDeliberating, setIsDeliberating] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [ceoDecisionStatus, setCeoDecisionStatus] = useState<
    'pending' | 'approved' | 'rejected'
  >('pending');
  const [executedOutcomeText, setExecutedOutcomeText] = useState<string | null>(
    null
  );
  const [activePersistedRunId, setActivePersistedRunId] = useState<
    number | null
  >(null);
  const [copiedStory, setCopiedStory] = useState(false);
  const [divisionFilter, setDivisionFilter] = useState<'all' | SwarmAgentDivision>('all');
  const [showPatrolMatrix, setShowPatrolMatrix] = useState(false);
  const [nextSweepCountdown, setNextSweepCountdown] = useState<string>('15:00');
  const replayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const updateCountdown = () => {
      if (!autonomousStatus?.autopilotEnabled || !autonomousStatus?.nextScheduledRunIso) {
        setNextSweepCountdown('Paused');
        return;
      }
      const diffMs = Math.max(
        0,
        new Date(autonomousStatus.nextScheduledRunIso).getTime() - Date.now()
      );
      const totalSec = Math.floor(diffMs / 1000);
      const mins = String(Math.floor(totalSec / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      setNextSweepCountdown(`${mins}:${secs}`);
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [autonomousStatus?.autopilotEnabled, autonomousStatus?.nextScheduledRunIso]);

  const activeAgentIds = useMemo(() => {
    const ids = metrics
      .filter((m) => m.isActive)
      .map((m) => m.agentId);
    if (!ids.includes('chief-of-staff')) {
      return ['chief-of-staff' as SwarmAgentId, ...ids];
    }
    return ids;
  }, [metrics]);

  const [deliberation, setDeliberation] = useState<SwarmDeliberationResult>(
    () =>
      buildDeterministicSwarmReplay({
        directive: SWARM_MISSION_PRESETS[0].directive,
        catalog,
        buildItems,
        utilityRate,
        activeAgentIds: SOLAR_SWARM_AGENTS.map((a) => a.agentId),
        presetActionType: SWARM_MISSION_PRESETS[0].actionType,
      })
  );

  useEffect(() => {
    return () => {
      if (replayTimerRef.current) {
        window.clearInterval(replayTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!externalMissionRequest) return;
    setDirective(externalMissionRequest.directive);
    const replay = buildDeterministicSwarmReplay({
      directive: externalMissionRequest.directive,
      catalog,
      buildItems,
      utilityRate,
      activeAgentIds,
    });
    setDeliberation(replay);
    setCeoDecisionStatus('pending');
    setExecutedOutcomeText(null);
    setActivePersistedRunId(null);
    setActiveStage(3);
    setLiveError(null);
  }, [externalMissionRequest, catalog, buildItems, utilityRate, activeAgentIds]);

  const catalogSummary = useMemo(() => {
    return catalog
      .slice(0, 14)
      .map((p) => {
        const best = getBestOffer(p, true);
        const landed = getOfferLandedPrice(best);
        return `${p.id} (${p.name}, ${p.category}, ${p.voltageClass}, $${landed} at ${best.merchantName}, auth=${best.isAuthorizedDealer})`;
      })
      .join('\n');
  }, [catalog]);

  const buildSummary = useMemo(() => {
    if (buildItems.length === 0) return 'No items currently in BOM.';
    return buildItems
      .map((item) => {
        const prod = catalog.find((c) => c.id === item.productId);
        if (!prod) return `${item.quantity}x ${item.productId}`;
        const offer =
          prod.offers.find((o) => o.merchantId === item.selectedMerchantId) ??
          getBestOffer(prod, true);
        return `${item.quantity}x ${prod.name} [$${getOfferLandedPrice(offer)} ea via ${offer.merchantName}, auth=${offer.isAuthorizedDealer}]`;
      })
      .join('; ');
  }, [buildItems, catalog]);

  const metricById = useMemo(() => {
    const map = new Map<SwarmAgentId, AgentPerformanceRecord>();
    for (const m of metrics) {
      map.set(m.agentId, m);
    }
    return map;
  }, [metrics]);

  const voteById = useMemo(() => {
    const map = new Map<string, SwarmDeliberationResult['agentVotes'][number]>();
    for (const v of deliberation.agentVotes) {
      map.set(v.agentId, v);
    }
    return map;
  }, [deliberation]);

  const avgSwarmLatency = useMemo(() => {
    const active = metrics.filter((m) => m.isActive);
    if (active.length === 0) return 0;
    return Math.round(
      active.reduce((sum, m) => sum + m.avgLatencyMs, 0) / active.length
    );
  }, [metrics]);

  const avgSwarmAccuracy = useMemo(() => {
    const active = metrics.filter((m) => m.isActive);
    if (active.length === 0) return 0;
    return Math.round(
      active.reduce((sum, m) => sum + m.accuracyScore, 0) / active.length
    );
  }, [metrics]);

  const stopReplayTimer = () => {
    if (replayTimerRef.current) {
      window.clearInterval(replayTimerRef.current);
      replayTimerRef.current = null;
    }
    setIsReplaying(false);
  };

  const applyLocalMetricBump = (result: SwarmDeliberationResult) => {
    const voteMap = new Map(result.agentVotes.map((v) => [v.agentId, v]));
    const nowIso = new Date().toISOString();
    onUpdateMetrics(
      metrics.map((m) => {
        const v = voteMap.get(m.agentId);
        if (!v || v.decision === 'standby') return m;
        return {
          ...m,
          tasksCompleted: m.tasksCompleted + 1,
          avgLatencyMs: Math.round((m.avgLatencyMs + v.latencyMs) / 2),
          accuracyScore: Math.min(
            99,
            Math.max(82, Math.round(m.accuracyScore * 0.85 + v.confidencePct * 0.15))
          ),
          lastTaskSummary: v.assignedJob,
          updatedAt: nowIso,
        };
      })
    );
  };

  const handleRunLiveSwarm = async (overrideDirective?: string) => {
    const activeDirective = (overrideDirective ?? directive).trim();
    if (!activeDirective) return;

    stopReplayTimer();
    setLiveError(null);
    setIsDeliberating(true);
    setActiveStage(1);
    setCeoDecisionStatus('pending');
    setExecutedOutcomeText(null);
    setActivePersistedRunId(null);

    try {
      const result = await runLiveSwarmDeliberation({
        directive: activeDirective,
        catalogSummary,
        buildSummary,
        utilityRate,
        activeAgentIds,
      });

      setDeliberation(result);
      setActiveStage(3);

      if (user && user.emailVerified) {
        try {
          const saved = await persistSwarmRunClient(user, result);
          setActivePersistedRunId(saved.run.id);
          onUpdateMetrics(saved.metrics);
          onUpdateRuns([saved.run, ...runs].slice(0, 25));
        } catch {
          applyLocalMetricBump(result);
        }
      } else {
        applyLocalMetricBump(result);
        const sessionRun: SwarmRunRecord = {
          id: Date.now(),
          userUid: 'session-ceo',
          missionTitle: result.missionTitle,
          directive: result.directive,
          chiefOfStaffSummary: result.chiefOfStaffSummary,
          consensusScore: result.consensusScore,
          approveVotes: result.approveVotes,
          cautionVotes: result.cautionVotes,
          holdVotes: result.holdVotes,
          proposedActionType: result.proposedAction.actionType,
          proposedActionLabel: result.proposedAction.actionLabel,
          proposedPayloadJson: JSON.stringify(result.proposedAction),
          ceoDecision: 'pending',
          executedSummary: 'Waiting for Human CEO sign-off.',
          createdAt: result.generatedAtIso,
          decidedAt: null,
        };
        onUpdateRuns([sessionRun, ...runs].slice(0, 25));
      }

      onNotify(
        `Agent #01 Aria packaged ${result.approveVotes + result.cautionVotes}/${activeAgentIds.length} votes (${result.consensusScore}/100) for CEO review.`
      );
    } catch (err) {
      setLiveError(
        err instanceof Error
          ? err.message
          : 'Unable to contact Live AI Swarm right now.'
      );
      setActiveStage(1);
    } finally {
      setIsDeliberating(false);
    }
  };

  const handlePlayFiveStepReplay = (
    presetActionType?:
      | 'optimize-bom-split'
      | 'filter-local-ai-48v'
      | 'load-compare-preset'
      | 'open-product-audit'
      | 'set-utility-rate',
    overrideDirective?: string
  ) => {
    stopReplayTimer();
    setLiveError(null);
    const activeDirective = (overrideDirective ?? directive).trim() || SWARM_MISSION_PRESETS[0].directive;
    const replay = buildDeterministicSwarmReplay({
      directive: activeDirective,
      catalog,
      buildItems,
      utilityRate,
      activeAgentIds,
      presetActionType,
    });
    setDeliberation(replay);
    setCeoDecisionStatus('pending');
    setExecutedOutcomeText(null);
    setActivePersistedRunId(null);
    setActiveStage(1);
    setIsReplaying(true);

    let step = 1;
    replayTimerRef.current = window.setInterval(() => {
      step += 1;
      if (step <= 3) {
        setActiveStage(step);
      } else {
        stopReplayTimer();
        onNotify(
          '5-Step Swarm Replay arrived at Stage 3 CEO Dispatch. Tap Approve & Execute on the CEO phone card.'
        );
      }
    }, 1150);
  };

  const handleCeoDecision = async (decision: 'approved' | 'rejected') => {
    stopReplayTimer();
    let outcome = 'Rejected by Human CEO. No changes applied to SolarBench.';
    if (decision === 'approved') {
      outcome = onExecuteCeoProposal(
        deliberation.proposedAction,
        deliberation.missionTitle
      );
      setActiveStage(5);
    } else {
      setActiveStage(4);
      onNotify('Human CEO rejected proposal — system left unchanged.');
    }

    setCeoDecisionStatus(decision);
    setExecutedOutcomeText(outcome);

    if (user && user.emailVerified && activePersistedRunId) {
      try {
        const updated = await decideSwarmRunClient(
          user,
          activePersistedRunId,
          decision,
          outcome
        );
        onUpdateMetrics(updated.metrics);
        onUpdateRuns(
          runs.map((r) => (r.id === updated.run.id ? updated.run : r))
        );
        return;
      } catch {
        // Fallback updates local session state
      }
    }

    if (decision === 'approved') {
      onUpdateMetrics(
        metrics.map((m) =>
          m.isActive ? { ...m, approvalsWon: m.approvalsWon + 1 } : m
        )
      );
    }

    onUpdateRuns(
      runs.map((r, idx) =>
        idx === 0 && r.ceoDecision === 'pending'
          ? {
              ...r,
              ceoDecision: decision,
              executedSummary: outcome,
              decidedAt: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const handleToggleAgent = async (agentId: SwarmAgentId) => {
    if (agentId === 'chief-of-staff') {
      onNotify('Agent #01 Aria (Chief of Staff) stays permanently active.');
      return;
    }
    const current = metricById.get(agentId);
    if (!current) return;
    const nextActive = !current.isActive;

    onUpdateMetrics(
      metrics.map((m) =>
        m.agentId === agentId ? { ...m, isActive: nextActive } : m
      )
    );

    if (user && user.emailVerified) {
      try {
        const updated = await toggleSwarmAgentActiveClient(
          user,
          agentId,
          nextActive
        );
        onUpdateMetrics(
          metrics.map((m) => (m.agentId === agentId ? updated : m))
        );
      } catch (err) {
        onNotify(
          err instanceof Error ? err.message : 'Unable to save agent toggle.'
        );
      }
    }
  };

  const buildShareableStoryText = () => {
    const lines = [
      `SolarBench 1 Human CEO + 15 AI Agents Live Workflow`,
      `Mission: ${deliberation.missionTitle}`,
      ``,
      ...deliberation.easyStorySteps.map(
        (s) => `${s.stepNumber}. ${s.title}: ${s.detail} -> ${s.result}`
      ),
      ``,
      `Chief Aria Verdict: ${deliberation.consensusScore}/100 (${deliberation.approveVotes} Yes, ${deliberation.cautionVotes} Caution)`,
      `CEO Action: ${deliberation.proposedAction.actionLabel}`,
    ];
    return lines.join('\n');
  };

  const handleCopyEasyStory = async () => {
    try {
      await navigator.clipboard.writeText(buildShareableStoryText());
      setCopiedStory(true);
      onNotify('Copied visual step-by-step Swarm story for KakaoTalk / SNS sharing.');
      window.setTimeout(() => setCopiedStory(false), 2200);
    } catch {
      onNotify('Clipboard access blocked by browser.');
    }
  };

  const chiefAgent = SOLAR_SWARM_AGENTS[0];
  const chiefMetric = metricById.get(chiefAgent.agentId);
  const chiefVote = voteById.get(chiefAgent.agentId);
  const specialistAgents = SOLAR_SWARM_AGENTS.slice(1);
  const filteredSpecialists =
    divisionFilter === 'all'
      ? specialistAgents
      : specialistAgents.filter((a) => a.division === divisionFilter);

  return (
    <section
      id="swarm"
      className="bg-white border-b border-slate-200 py-10"
      aria-labelledby="swarm-heading"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Section Header + Top Mode Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-slate-500">
              1 Human CEO · Agent #01 Aria (Chief of Staff) · 9 Core Bench Specialists + 5 Growth &amp; Freshness Agents
            </p>
            <h2
              id="swarm-heading"
              className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-1"
            >
              SolarBench AI Swarm Command &amp; CEO Dispatch
            </h2>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
              Chief of Staff Aria allocates every hardware benchmark, thermal safety, tariff, SEO schema, catalog freshness, and channel distribution task across Agents #02–#15, monitors SLAs, and sends one clean approval card to you—the Human CEO—before anything executes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setEasyStoryMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                easyStoryMode
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:border-slate-500'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {easyStoryMode ? 'Technical Mode' : 'Easy Visual Story'}
            </button>

            {user && user.emailVerified ? (
              <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 font-mono">
                CEO: {user.email}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void signInWithGoogleForArchive()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-300 hover:border-slate-500 text-slate-800 transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in to Save Swarm Ledger
              </button>
            )}
          </div>
        </div>

        {/* 24/7 Autonomous Autopilot Operations Strip */}
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="font-semibold text-amber-400">
                  AUTONOMOUS SWARM DAEMON
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span
                  className={
                    autonomousStatus?.autopilotEnabled ?? true
                      ? 'text-emerald-400 font-semibold'
                      : 'text-amber-300 font-semibold'
                  }
                >
                  {autonomousStatus?.autopilotEnabled ?? true
                    ? 'AUTOPILOT ACTIVE (15-MIN PATROLS)'
                    : 'AUTOPILOT PAUSED BY CEO'}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {autonomousStatus?.summaryText ??
                  'Agent #01 Aria automatically audits all 30 SKUs, midnight spotlight MP4 integrity, SEO schema briefs, and outbound telemetry in the background.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  void onToggleAutopilot(!(autonomousStatus?.autopilotEnabled ?? true))
                }
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                  autonomousStatus?.autopilotEnabled ?? true
                    ? 'bg-slate-800 border-slate-600 text-slate-100 hover:bg-slate-700'
                    : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                }`}
              >
                {autonomousStatus?.autopilotEnabled ?? true ? (
                  <>
                    <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                    Pause Autopilot
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    Enable Autopilot
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSweepingAutonomous}
                onClick={() => void onTriggerAutonomousSweep()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSweepingAutonomous ? 'animate-spin' : ''}`}
                />
                {isSweepingAutonomous
                  ? 'Auditing 15 Agents...'
                  : 'Run Full 15-Agent Sweep Now'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-800 text-xs font-mono tabular-nums">
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-lg p-2.5">
              <div className="text-[11px] text-slate-400 font-sans">Fleet Health</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 shrink-0" />
                {autonomousStatus?.overallHealthScore ?? 100}%
              </div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-lg p-2.5">
              <div className="text-[11px] text-slate-400 font-sans">Completed Sweeps</div>
              <div className="text-sm font-bold text-white mt-0.5">
                #{autonomousStatus?.totalCyclesCompleted ?? 1} Cycles
              </div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-lg p-2.5">
              <div className="text-[11px] text-slate-400 font-sans">Catalog &amp; MP4 DB</div>
              <div className="text-sm font-bold text-white mt-0.5">
                {autonomousStatus?.catalogSkuCount ?? 30} SKUs ·{' '}
                {autonomousStatus?.healthyVideoCount ?? 6}/
                {autonomousStatus?.videoArchiveCount ?? 6} MP4
              </div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-lg p-2.5">
              <div className="text-[11px] text-slate-400 font-sans">Next Auto-Sweep</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {nextSweepCountdown}
              </div>
            </div>
            <div className="bg-slate-800/70 border border-slate-700/80 rounded-lg p-2.5 flex items-center justify-between col-span-2 sm:col-span-1">
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Agent Audit Log</div>
                <div className="text-xs font-semibold text-slate-200 mt-0.5">
                  {autonomousStatus?.checks?.length ?? 15} Verified
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPatrolMatrix((v) => !v)}
                className="text-[11px] font-sans font-semibold text-amber-400 hover:underline whitespace-nowrap"
              >
                {showPatrolMatrix ? 'Hide Log' : 'Inspect Log'}
              </button>
            </div>
          </div>

          {showPatrolMatrix && autonomousStatus && autonomousStatus.checks.length > 0 && (
            <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {autonomousStatus.checks.map((chk) => (
                <div
                  key={chk.agentId}
                  className="bg-slate-800/60 border border-slate-700/80 rounded-lg p-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                    <span className="text-slate-300 font-semibold">
                      #{String(chk.agentNumber).padStart(2, '0')} {chk.agentName}
                    </span>
                    <span
                      className={
                        chk.status === 'pass'
                          ? 'text-emerald-400 font-semibold'
                          : chk.status === 'healed'
                          ? 'text-amber-300 font-semibold'
                          : 'text-rose-400 font-semibold'
                      }
                    >
                      {chk.status.toUpperCase()} · {chk.metricValue}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {chk.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CEO Directive Command Input + Mission Presets */}
        <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-2.5">
            <label htmlFor="ceo-directive-input" className="sr-only">
              Human CEO Directive for Agent #01 Aria
            </label>
            <input
              id="ceo-directive-input"
              type="text"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isDeliberating) {
                  void handleRunLiveSwarm();
                }
              }}
              placeholder="Give Agent #01 Aria a CEO directive (e.g., Audit BOM for OEM warranty savings or 48V Local AI LLM UPS)..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
            />
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={isDeliberating}
                onClick={() => void handleRunLiveSwarm()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isDeliberating ? 'Swarm Deliberating...' : 'Run Live AI Swarm'}
              </button>

              <button
                type="button"
                onClick={() => handlePlayFiveStepReplay()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                {isReplaying ? 'Replaying...' : 'Play 5-Step Replay'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-slate-600">
              One-Click Missions:
            </span>
            {SWARM_MISSION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDirective(preset.directive);
                  handlePlayFiveStepReplay(preset.actionType, preset.directive);
                }}
                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:border-slate-400 text-slate-800 font-medium transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {liveError && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-2.5 text-xs text-amber-900"
            >
              <span>{liveError}</span>
              <button
                type="button"
                onClick={() => handlePlayFiveStepReplay()}
                className="font-semibold underline underline-offset-2 text-amber-950 shrink-0"
              >
                Run Interactive 5-Step Replay Instead
              </button>
            </div>
          )}
        </div>

        {/* 5-Step Live Timeline + Mobile-Frame CEO Dispatch Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 cols: 5-Step Interactive Timeline & Easy Picture-Book Story Mode */}
          <div className="lg:col-span-7 bg-[#F7F8FA] border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Live Swarm Execution Pipeline (5-Step Oversight)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Source:{' '}
                  <span className="font-semibold text-slate-700">
                    {deliberation.sourceMode === 'live-gemini'
                      ? 'Live AI Model Deliberation'
                      : 'Interactive 5-Step Swarm Replay'}
                  </span>{' '}
                  · Active Quorum:{' '}
                  <span className="font-mono tabular-nums font-semibold text-slate-800">
                    {activeAgentIds.length}/15 Agents
                  </span>
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-600">
                Avg SLA: <strong className="text-slate-900">{avgSwarmLatency}ms</strong> · Accuracy:{' '}
                <strong className="text-emerald-700">{avgSwarmAccuracy}%</strong>
              </div>
            </div>

            {/* 5-Step Pipeline Stepper */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {WORKFLOW_STAGES.map((stage) => {
                const isDone = activeStage > stage.step;
                const isCurrent = activeStage === stage.step;
                return (
                  <button
                    key={stage.step}
                    type="button"
                    onClick={() => {
                      stopReplayTimer();
                      setActiveStage(stage.step);
                    }}
                    className={`text-left p-2.5 rounded-lg border transition-colors ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900'
                        : isDone
                        ? 'bg-white text-slate-900 border-emerald-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span
                        className={
                          isCurrent
                            ? 'text-amber-400 font-semibold'
                            : isDone
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        STEP {stage.code}
                      </span>
                      {isDone && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </div>
                    <div className="text-xs font-semibold mt-1 leading-snug">
                      {stage.label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Communication Detail */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-2">
              <div className="text-xs font-mono font-semibold text-amber-700">
                Stage 0{activeStage} ·{' '}
                {WORKFLOW_STAGES[activeStage - 1]?.label ?? 'Swarm Dispatch'}
              </div>
              <p className="text-sm font-semibold text-slate-900">
                {deliberation.missionTitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeStage === 1
                  ? `Agent #01 Aria (Chief of Staff) parsed your CEO directive and assigned focused verification jobs across ${activeAgentIds.length - 1} specialist robots.`
                  : activeStage === 2
                  ? `${deliberation.approveVotes} Approve · ${deliberation.cautionVotes} Caution · ${deliberation.holdVotes} Hold across active specialists. Score: ${deliberation.consensusScore}/100.`
                  : activeStage === 3
                  ? deliberation.chiefOfStaffSummary
                  : activeStage === 4
                  ? ceoDecisionStatus === 'approved'
                    ? 'Human CEO verified Thermal & OEM Warranty guards and stamped APPROVED.'
                    : ceoDecisionStatus === 'rejected'
                    ? 'Human CEO stamped REJECTED. All catalog and BOM states preserved.'
                    : 'Waiting cleanly for Human CEO stamp on the dispatch card.'
                  : executedOutcomeText ?? deliberation.proposedAction.summaryText}
              </p>
            </div>

            {/* Easy Visual Picture-Book Story Mode (Walkthrough + Shareable KakaoTalk Copy) */}
            {easyStoryMode && (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Easy Picture-Book Walkthrough: How Your 15 Robot Helpers Work
                    </h4>
                    <p className="text-xs text-slate-600">
                      Step-by-step plain visual explanation ready to share with friends, team members, or SNS followers.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopyEasyStory()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-amber-300 hover:border-amber-500 text-slate-900 transition-colors whitespace-nowrap"
                  >
                    {copiedStory ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Copied Story
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Story Summary
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  {deliberation.easyStorySteps.map((step) => (
                    <div
                      key={step.stepNumber}
                      className="bg-white border border-amber-200/80 rounded-lg p-3 flex items-start gap-3"
                    >
                      <div className="w-6 h-6 rounded-md bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {step.stepNumber}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900">
                          {step.title}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {step.detail}
                        </p>
                        <div className="text-[11px] font-semibold text-amber-800 mt-1">
                          Outcome: {step.result}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 5 cols: Mobile-Frame CEO Dispatch Gate (#solarbench-ceo-dispatch) */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white rounded-2xl border-4 border-slate-800 p-4 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      CEO Dispatch · #solarbench-ceo-dispatch
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      From Agent #01 Aria (Chief of Staff)
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono tabular-nums text-amber-400 font-semibold">
                  {deliberation.consensusScore}/100 Score
                </span>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-2.5">
                <div className="text-xs font-bold text-amber-300">
                  {deliberation.slackDispatchHeadline}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {deliberation.proposedAction.summaryText}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono tabular-nums text-[11px]">
                  <div className="bg-slate-900/70 rounded-lg py-1.5 px-2 border border-slate-700">
                    <div className="text-emerald-400 font-bold text-sm">
                      {deliberation.approveVotes}
                    </div>
                    <div className="text-slate-400">Approve</div>
                  </div>
                  <div className="bg-slate-900/70 rounded-lg py-1.5 px-2 border border-slate-700">
                    <div className="text-amber-400 font-bold text-sm">
                      {deliberation.cautionVotes}
                    </div>
                    <div className="text-slate-400">Caution</div>
                  </div>
                  <div className="bg-slate-900/70 rounded-lg py-1.5 px-2 border border-slate-700">
                    <div className="text-rose-400 font-bold text-sm">
                      {deliberation.holdVotes}
                    </div>
                    <div className="text-slate-400">Hold</div>
                  </div>
                </div>

                <div className="bg-slate-900/80 border border-slate-700 rounded-lg p-2.5 text-[11px] text-slate-300 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{deliberation.proposedAction.safetyGuardText}</span>
                </div>

                <div className="text-[11px] font-mono text-slate-300 pt-1">
                  Action: <strong className="text-white">{deliberation.proposedAction.actionLabel}</strong>
                </div>
              </div>

              {/* Human CEO Sign-Off Buttons */}
              {ceoDecisionStatus === 'pending' ? (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => void handleCeoDecision('approved')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Approve &amp; Execute
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCeoDecision('rejected')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                </div>
              ) : (
                <div
                  className={`rounded-lg p-3 border text-xs ${
                    ceoDecisionStatus === 'approved'
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-200'
                      : 'bg-slate-800 border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {ceoDecisionStatus === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                    )}
                    CEO Stamp: {ceoDecisionStatus.toUpperCase()}
                  </div>
                  <p className="mt-1 leading-relaxed text-[11px]">
                    {executedOutcomeText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Agent #01 Chief of Staff Leadership Card */}
        <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="text-xs font-mono text-amber-400 font-semibold">
                AGENT #01 · CHIEF OF STAFF · ORCHESTRATOR
              </div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                {chiefAgent.name} — {chiefAgent.roleTitle}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {easyStoryMode ? chiefAgent.easyAnalogy : chiefAgent.authorityScope}
              </p>
              <p className="text-xs text-emerald-300 pt-0.5">
                Current Report:{' '}
                <span className="text-slate-100">
                  {easyStoryMode
                    ? chiefVote?.easySummary ?? chiefAgent.easyLabel
                    : chiefVote?.finding ?? chiefAgent.ownedFeature}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3 bg-slate-800/80 border border-slate-700 rounded-lg p-3 text-center font-mono tabular-nums shrink-0">
              <div>
                <div className="text-[11px] text-slate-400">Tasks</div>
                <div className="text-sm font-bold text-white">
                  {chiefMetric?.tasksCompleted ?? 14}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Approved</div>
                <div className="text-sm font-bold text-emerald-400">
                  {chiefMetric?.approvalsWon ?? 13}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Latency</div>
                <div className="text-sm font-bold text-amber-300">
                  {chiefVote?.latencyMs || chiefMetric?.avgLatencyMs || 145}ms
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">Accuracy</div>
                <div className="text-sm font-bold text-white">
                  {chiefMetric?.accuracyScore ?? 98}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 14 Specialist Agents Feature Ownership & SLA Performance Grid */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                14 Feature-Owning AI Specialists (Managed &amp; Monitored by Agent #01 Aria)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                {specialistAgents.filter((a) => metricById.get(a.agentId)?.isActive !== false).length}/14 Specialists Active · #02–#10 Core Bench · #11–#15 Growth &amp; Freshness
              </p>
            </div>

            <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 self-start">
              <button
                type="button"
                onClick={() => setDivisionFilter('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  divisionFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All 14
              </button>
              <button
                type="button"
                onClick={() => setDivisionFilter('core-bench')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  divisionFilter === 'core-bench'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Core Bench (#02–#10)
              </button>
              <button
                type="button"
                onClick={() => setDivisionFilter('growth-ops')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  divisionFilter === 'growth-ops'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Growth &amp; SEO (#11–#15)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSpecialists.map((agent) => {
              const perf = metricById.get(agent.agentId);
              const vote = voteById.get(agent.agentId);
              const isActive = perf?.isActive ?? true;
              const voteDecision = !isActive
                ? 'standby'
                : vote?.decision ?? 'approve';

              return (
                <article
                  key={agent.agentId}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-3 transition-colors ${
                    isActive
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-50 border-slate-200 opacity-75'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-mono text-slate-500">
                          Agent #{String(agent.agentNumber).padStart(2, '0')} ·{' '}
                          <span className="text-slate-600">
                            {agent.division === 'growth-ops' ? 'Growth Ops' : 'Core Bench'}
                          </span>{' '}
                          ·{' '}
                          <span
                            className={
                              voteDecision === 'approve'
                                ? 'text-emerald-700 font-semibold'
                                : voteDecision === 'caution'
                                ? 'text-amber-700 font-semibold'
                                : voteDecision === 'hold'
                                ? 'text-rose-700 font-semibold'
                                : 'text-slate-400 font-semibold'
                            }
                          >
                            {voteDecision === 'approve'
                              ? 'Approve'
                              : voteDecision === 'caution'
                              ? 'Caution Note'
                              : voteDecision === 'hold'
                              ? 'Hold'
                              : 'Paused'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {agent.name} — {easyStoryMode ? agent.easyLabel : agent.roleTitle}
                        </h4>
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleToggleAgent(agent.agentId)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:border-slate-400 text-[11px] font-semibold text-slate-700 shrink-0"
                        title={
                          isActive
                            ? `Pause ${agent.name}`
                            : `Activate ${agent.name}`
                        }
                      >
                        {isActive ? (
                          <>
                            <PauseCircle className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <PlayCircle className="w-3 h-3 text-amber-700" />
                            Paused
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-xs font-medium text-amber-800">
                      Owns: {agent.ownedFeature}
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {easyStoryMode
                        ? vote?.easySummary || agent.easyAnalogy
                        : vote?.finding || agent.authorityScope}
                    </p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">
                      {perf?.tasksCompleted ?? 10} runs ·{' '}
                      {vote?.latencyMs || perf?.avgLatencyMs || agent.defaultLatencyMs}ms ·{' '}
                      <strong className="text-slate-800">
                        {perf?.accuracyScore ?? agent.defaultAccuracy}%
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => onJumpToFeature(agent.featureAnchor)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-800 hover:text-amber-700 whitespace-nowrap"
                    >
                      Inspect Feature
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Recent CEO Decision Ledger */}
        {runs.length > 0 && (
          <div className="bg-[#F7F8FA] border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                Recent Swarm Missions &amp; Human CEO Sign-Offs
              </h3>
              <span className="text-xs text-slate-500 font-mono tabular-nums">
                {runs.length} recorded
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] text-slate-500 font-semibold">
                    <th className="py-2 pr-3">Mission</th>
                    <th className="py-2 px-3">Consensus</th>
                    <th className="py-2 px-3">Proposed SolarBench Action</th>
                    <th className="py-2 px-3">CEO Stamp</th>
                    <th className="py-2 pl-3">Execution Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70">
                  {runs.slice(0, 5).map((run) => (
                    <tr key={run.id} className="text-slate-700">
                      <td className="py-2.5 pr-3 font-semibold text-slate-900">
                        {run.missionTitle}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums">
                        {run.consensusScore}/100 ({run.approveVotes}Y/
                        {run.cautionVotes}C)
                      </td>
                      <td className="py-2.5 px-3">{run.proposedActionLabel}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        <span
                          className={
                            run.ceoDecision === 'approved'
                              ? 'text-emerald-700'
                              : run.ceoDecision === 'rejected'
                              ? 'text-rose-700'
                              : 'text-amber-700'
                          }
                        >
                          {run.ceoDecision.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2.5 pl-3 text-slate-600">
                        {run.executedSummary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
