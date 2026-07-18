import type {
  ComplianceReportRead,
  EquipmentRead,
  IncidentRead,
  MaintenanceRead,
  NotificationRead,
  PermitRead,
  PlantRead,
  RiskEventRead,
  SeverityLevel,
  ZoneRead
} from "@/types/domain";
import type { HistoricalSimilarityMatch } from "@/types/risk";
import { titleCase } from "@/utils/format";

export interface IntelligenceContributor {
  label: string;
  detail: string;
}

export interface ZoneHotspot {
  zoneId: string;
  zoneName: string;
  plantId: string;
  plantName: string;
  severity: SeverityLevel;
  hotspotScore: number;
  workerExposureCount: number;
  activePermitCount: number;
  maintenancePressureCount: number;
  degradedEquipmentCount: number;
  openIncidentCount: number;
  contributors: IntelligenceContributor[];
  recommendedAction: string;
  predictionHorizon: string;
}

export interface NotificationNarrative {
  summary: string;
  recommendedAction: string;
  confidence: number;
  contributors: IntelligenceContributor[];
  matchedZoneName?: string;
}

export interface IncidentIntelligence {
  summary: string;
  contributors: IntelligenceContributor[];
  affectedAssets: string[];
  evidenceUsed: string[];
  likelyConsequences: string[];
  recommendedResponse: string[];
  regulatoryContext: string[];
}

export interface ComplianceWatchItem {
  title: string;
  detail: string;
  status: "success" | "warning" | "critical";
}

export type IntelligenceSourceKind = "live" | "derived" | "demo";

export interface AgentInsight {
  id: string;
  agentName: string;
  responsibility: string;
  status: "monitoring" | "watch" | "escalated";
  sourceKind: IntelligenceSourceKind;
  confidence: number;
  summary: string;
  evidence: string[];
  impact: string;
  recommendedAction: string;
}

export interface ExecutiveDecisionBrief {
  headline: string;
  narrative: string;
  nextAction: string;
  supportingAgents: string[];
  sourceKind: IntelligenceSourceKind;
}

const severityWeights: Record<SeverityLevel, number> = {
  safe: 10,
  low: 28,
  moderate: 52,
  high: 74,
  critical: 92
};

const incidentConsequenceMap: Record<string, string[]> = {
  gas_leak: [
    "Escalation toward toxic exposure or ignition if controls are not restored quickly.",
    "Permit suspension and area isolation may be required to prevent secondary events."
  ],
  fire: [
    "Rapid spread into adjacent assets if suppression and isolation lag behind the event.",
    "Worker exposure, smoke migration, and asset downtime can widen quickly."
  ],
  equipment_failure: [
    "Loss of containment or process interruption can trigger downstream operational instability.",
    "Maintenance backlog may increase if the failed asset remains online."
  ],
  near_miss: [
    "The same control gap can convert into a recordable incident on the next shift.",
    "Operator confidence and permit discipline usually degrade if the near miss is not closed out."
  ],
  chemical_exposure: [
    "Additional worker exposure and decontamination escalation may follow if the area stays active.",
    "Compliance scrutiny increases when exposure controls or PPE discipline are unclear."
  ],
  safety_incident: [
    "Repeat worker harm is possible if the underlying operational control remains in place.",
    "Investigation delay can prolong unsafe work conditions."
  ],
  worker_collapse: [
    "Medical escalation and broader workforce exposure review may be required immediately.",
    "The surrounding area should be treated as potentially unstable until the root cause is known."
  ]
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function normalizeConfidence(value: number) {
  if (value > 1) {
    return clampPercentage(value) / 100;
  }

  return Math.max(0, Math.min(1, value));
}

function agentStatusFromScore(score: number): AgentInsight["status"] {
  if (score >= 84) {
    return "escalated";
  }

  if (score >= 60) {
    return "watch";
  }

  return "monitoring";
}

export function getPredictionHorizon(severity: SeverityLevel, riskScore?: number) {
  const normalizedScore = riskScore ?? severityWeights[severity];

  if (severity === "critical" || normalizedScore >= 88) {
    return "Immediate (0-15 min)";
  }

  if (severity === "high" || normalizedScore >= 72) {
    return "Near term (15-60 min)";
  }

  if (severity === "moderate" || normalizedScore >= 48) {
    return "Shift watch (1-4 hr)";
  }

  if (severity === "low") {
    return "Monitor this shift";
  }

  return "No immediate escalation";
}

function buildHotspotRecommendation(
  hotspotScore: number,
  permitCount: number,
  maintenancePressureCount: number,
  degradedEquipmentCount: number
) {
  if (hotspotScore >= 88) {
    if (permitCount > 0) {
      return "Suspend overlapping permits, isolate the zone, and dispatch the safety officer immediately.";
    }

    if (maintenancePressureCount > 0) {
      return "Pause maintenance, isolate affected equipment, and verify gas-free conditions before work resumes.";
    }

    return "Escalate to the incident command workflow and restrict access until controls are restored.";
  }

  if (hotspotScore >= 70) {
    if (degradedEquipmentCount > 0) {
      return "Inspect degraded equipment now and confirm barriers before the next work interval.";
    }

    return "Increase monitoring frequency and clear the conflicting work package before the next shift handover.";
  }

  return "Maintain enhanced observation and close open contributing conditions before the next shift.";
}

export function extractInsightText(record: Record<string, unknown>) {
  const prioritizedKeys = [
    "title",
    "name",
    "issue",
    "violation",
    "recommendation",
    "action",
    "description",
    "detail",
    "message",
    "summary",
    "reference"
  ];

  for (const key of prioritizedKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  const stringValue = Object.values(record).find((value) => typeof value === "string" && value.trim());
  return typeof stringValue === "string" ? stringValue.trim() : null;
}

export function extractInsightList(records?: Array<Record<string, unknown>> | null, limit = 3) {
  if (!records?.length) {
    return [];
  }

  return uniqueStrings(records.map((record) => extractInsightText(record))).slice(0, limit);
}

export function buildZoneHotspots({
  zones,
  plants,
  permits,
  maintenance,
  equipment,
  incidents
}: {
  zones: ZoneRead[];
  plants: PlantRead[];
  permits: PermitRead[];
  maintenance: MaintenanceRead[];
  equipment: EquipmentRead[];
  incidents: IncidentRead[];
}) {
  const plantMap = new Map(plants.map((plant) => [plant.id, plant.name]));

  return zones
    .map<ZoneHotspot>((zone) => {
      const relatedEquipment = equipment.filter((item) => item.zone_id === zone.id);
      const equipmentIds = new Set(relatedEquipment.map((item) => item.id));
      const activePermits = permits.filter(
        (permit) =>
          permit.zone_id === zone.id &&
          (permit.status === "open" || permit.status === "approved" || permit.status === "suspended")
      );
      const maintenancePressure = maintenance.filter(
        (item) =>
          equipmentIds.has(item.equipment_id) &&
          (item.status === "running" || item.status === "overdue" || item.status === "scheduled")
      );
      const degradedEquipment = relatedEquipment.filter(
        (item) =>
          item.health_score < 75 ||
          item.status === "warning" ||
          item.status === "critical" ||
          item.status === "offline" ||
          item.status === "maintenance"
      );
      const openIncidents = incidents.filter((incident) => incident.zone_id === zone.id && incident.status !== "closed");
      const workerExposureCount = new Set(
        [...activePermits.map((permit) => permit.worker_id), ...openIncidents.map((incident) => incident.worker_id)].filter(Boolean)
      ).size;

      const contributors: IntelligenceContributor[] = [];

      if (severityWeights[zone.risk_level] >= 74) {
        contributors.push({
          label: `${titleCase(zone.risk_level)} zone risk posture`,
          detail: `${zone.zone_name} is already classified as ${zone.risk_level}, so any overlapping work inherits elevated exposure.`
        });
      }

      if (activePermits.length > 0) {
        contributors.push({
          label: `${activePermits.length} active permits overlap the zone`,
          detail: `Concurrent permit activity is increasing work execution pressure in ${zone.zone_name}.`
        });
      }

      if (maintenancePressure.length > 0) {
        contributors.push({
          label: `${maintenancePressure.length} maintenance tasks are active or overdue`,
          detail: "Maintenance activity and backlog can reduce the buffer for safe operations in this zone."
        });
      }

      if (degradedEquipment.length > 0) {
        contributors.push({
          label: `${degradedEquipment.length} equipment assets show degraded health`,
          detail: "Equipment condition is contributing to the AI hotspot score and raising the likelihood of control loss."
        });
      }

      if (openIncidents.length > 0) {
        contributors.push({
          label: `${openIncidents.length} open incidents remain linked to the zone`,
          detail: "Historical and still-open incidents indicate unresolved operational instability."
        });
      }

      if (workerExposureCount > 0) {
        contributors.push({
          label: `${workerExposureCount} workers are linked to active zone work`,
          detail: "Permit assignments or incident records indicate direct worker exposure around the active hazard context."
        });
      }

      const hotspotScore = clampPercentage(
        severityWeights[zone.risk_level] +
          activePermits.length * 9 +
          maintenancePressure.length * 11 +
          degradedEquipment.length * 8 +
          openIncidents.length * 12 +
          workerExposureCount * 6
      );

      return {
        zoneId: zone.id,
        zoneName: zone.zone_name,
        plantId: zone.plant_id,
        plantName: plantMap.get(zone.plant_id) ?? "Unknown plant",
        severity: zone.risk_level,
        hotspotScore,
        workerExposureCount,
        activePermitCount: activePermits.length,
        maintenancePressureCount: maintenancePressure.length,
        degradedEquipmentCount: degradedEquipment.length,
        openIncidentCount: openIncidents.length,
        contributors,
        recommendedAction: buildHotspotRecommendation(
          hotspotScore,
          activePermits.length,
          maintenancePressure.length,
          degradedEquipment.length
        ),
        predictionHorizon: getPredictionHorizon(zone.risk_level, hotspotScore)
      };
    })
    .sort((left, right) => right.hotspotScore - left.hotspotScore);
}

function findMatchingHotspot(text: string, hotspots: ZoneHotspot[]) {
  const normalized = text.toLowerCase();

  return (
    hotspots.find(
      (hotspot) =>
        normalized.includes(hotspot.zoneName.toLowerCase()) || normalized.includes(hotspot.plantName.toLowerCase())
    ) ?? hotspots[0]
  );
}

function findMatchingRisk(text: string, liveRisks: RiskEventRead[]) {
  const normalized = text.toLowerCase();

  return (
    liveRisks.find((risk) => {
      const haystack = [risk.risk_category, risk.reason, risk.recommendation].join(" ").toLowerCase();
      return normalized.includes(risk.risk_category.toLowerCase()) || haystack.includes(normalized);
    }) ?? liveRisks[0]
  );
}

export function buildNotificationNarrative(
  notification: NotificationRead,
  hotspots: ZoneHotspot[],
  liveRisks: RiskEventRead[]
): NotificationNarrative {
  const sourceText = `${notification.title} ${notification.message}`;
  const matchedHotspot = hotspots.length ? findMatchingHotspot(sourceText, hotspots) : null;
  const matchedRisk = liveRisks.length ? findMatchingRisk(sourceText, liveRisks) : null;
  const contributors = matchedHotspot?.contributors.slice(0, 3) ?? [];
  const confidence = matchedRisk
    ? clampPercentage(matchedRisk.confidence * 100) / 100
    : clampPercentage((matchedHotspot?.hotspotScore ?? 58) * 0.9) / 100;

  if (matchedHotspot) {
    const primaryContributor = matchedHotspot.contributors[0]?.label ?? "Multiple operational factors";

    return {
      summary: `Critical compound risk detected in ${matchedHotspot.zoneName}. ${primaryContributor} is overlapping with the current alert condition.`,
      recommendedAction: matchedRisk?.recommendation || matchedHotspot.recommendedAction,
      confidence,
      contributors,
      matchedZoneName: matchedHotspot.zoneName
    };
  }

  if (matchedRisk) {
    return {
      summary: `AI correlation elevated this notification because ${matchedRisk.reason.toLowerCase()}.`,
      recommendedAction: matchedRisk.recommendation,
      confidence,
      contributors: [
        {
          label: titleCase(matchedRisk.risk_category),
          detail: matchedRisk.reason
        }
      ]
    };
  }

  return {
    summary: "AI correlation recommends operator review because this notification can affect the current operational safety posture.",
    recommendedAction: "Acknowledge the alert, review the Risk Center evidence, and confirm whether active work should pause.",
    confidence,
    contributors: []
  };
}

export function buildIncidentIntelligence({
  incident,
  zone,
  equipment,
  permits,
  maintenance,
  relatedRisks,
  complianceReports
}: {
  incident: IncidentRead;
  zone?: ZoneRead | null;
  equipment?: EquipmentRead | null;
  permits: PermitRead[];
  maintenance: MaintenanceRead[];
  relatedRisks: RiskEventRead[];
  complianceReports: ComplianceReportRead[];
}) {
  const linkedPermits = permits.filter((permit) => permit.zone_id === incident.zone_id || permit.equipment_id === incident.equipment_id);
  const relatedMaintenance = maintenance.filter((item) => item.equipment_id === incident.equipment_id);
  const openRelatedRisks = relatedRisks.filter((risk) => risk.status !== "closed");
  const contributors: IntelligenceContributor[] = [];

  if (openRelatedRisks.length > 0) {
    contributors.push({
      label: `${openRelatedRisks.length} related risk events are still open`,
      detail: "The incident is aligned with unresolved risk signals from the compound risk engine."
    });
  }

  if (linkedPermits.some((permit) => permit.status === "open" || permit.status === "approved" || permit.status === "suspended")) {
    contributors.push({
      label: "Permit activity overlaps the incident context",
      detail: "At least one permit remains active in the affected zone or on the affected asset."
    });
  }

  if (relatedMaintenance.some((item) => item.status === "running" || item.status === "overdue")) {
    contributors.push({
      label: "Maintenance pressure is present",
      detail: "Running or overdue maintenance is increasing operational pressure around the incident context."
    });
  }

  if (equipment && (equipment.health_score < 75 || equipment.status !== "healthy")) {
    contributors.push({
      label: `${equipment.equipment_name} is not in a healthy state`,
      detail: `Asset health is ${equipment.health_score.toFixed(0)}% with status ${equipment.status}.`
    });
  }

  const affectedAssets = uniqueStrings([
    zone ? `Zone: ${zone.zone_name}` : null,
    equipment ? `Equipment: ${equipment.equipment_name}` : null,
    ...linkedPermits.slice(0, 2).map((permit) => `Permit: ${permit.permit_number}`)
  ]);

  const evidenceUsed = uniqueStrings([
    zone ? `Zone context: ${zone.zone_name} is classified as ${zone.risk_level}.` : null,
    equipment
      ? `Equipment context: ${equipment.equipment_name} is at ${equipment.health_score.toFixed(0)}% health with status ${equipment.status}.`
      : null,
    linkedPermits.length ? `${linkedPermits.length} linked permits were considered in the AI review.` : null,
    relatedMaintenance.length ? `${relatedMaintenance.length} maintenance records were considered for the affected asset.` : null,
    ...openRelatedRisks.slice(0, 2).map((risk) => `Risk engine signal: ${risk.reason}`),
    incident.evidence?.length ? `${incident.evidence.length} existing incident evidence entries were included.` : null
  ]).slice(0, 5);

  const likelyConsequences = uniqueStrings([
    ...openRelatedRisks.map((risk) => risk.expected_consequence ?? null),
    ...(incidentConsequenceMap[incident.incident_type] ?? [
      "Operational instability can widen if the underlying condition is left in place.",
      "Investigation delay may keep unsafe controls active longer than intended."
    ])
  ]).slice(0, 3);

  const recommendedResponse = uniqueStrings([
    ...openRelatedRisks.map((risk) => risk.recommendation),
    linkedPermits.length ? "Suspend overlapping permits until the incident scene is declared stable." : null,
    relatedMaintenance.length ? "Pause non-essential maintenance on the affected asset until the response plan is confirmed." : null,
    incident.status === "open" ? "Dispatch the safety officer and begin the formal investigation workflow." : null
  ]).slice(0, 4);

  const regulatoryContext = uniqueStrings(
    complianceReports.flatMap((report) => [
      `${titleCase(report.framework)} posture at ${report.score.toFixed(0)}%`,
      ...extractInsightList(report.violations, 2),
      ...extractInsightList(report.recommendations, 2)
    ])
  ).slice(0, 4);

  const summary =
    incident.ai_summary?.trim() ||
    `${titleCase(incident.incident_type)} remains ${incident.severity} in ${zone?.zone_name ?? "the affected area"}, with ${
      contributors[0]?.label.toLowerCase() ?? "multiple control gaps still active"
    }.`;

  return {
    summary,
    contributors,
    affectedAssets,
    evidenceUsed,
    likelyConsequences,
    recommendedResponse,
    regulatoryContext
  };
}

function plantIdFromIncident(incident: IncidentRead, zones: ZoneRead[]) {
  if (!incident.zone_id) {
    return null;
  }

  return zones.find((zone) => zone.id === incident.zone_id)?.plant_id ?? null;
}

export function buildComplianceWatchlist({
  plants,
  zones,
  reports,
  permits,
  maintenance,
  equipment,
  incidents
}: {
  plants: PlantRead[];
  zones: ZoneRead[];
  reports: ComplianceReportRead[];
  permits: PermitRead[];
  maintenance: MaintenanceRead[];
  equipment: EquipmentRead[];
  incidents: IncidentRead[];
}) {
  const plantMap = new Map(plants.map((plant) => [plant.id, plant.name]));
  const zoneMap = new Map(zones.map((zone) => [zone.id, zone]));
  const equipmentMap = new Map(equipment.map((item) => [item.id, item]));
  const watchItems: ComplianceWatchItem[] = [];

  for (const report of reports) {
    if (report.score < 75) {
      watchItems.push({
        title: `${titleCase(report.framework)} score is below target`,
        detail: `${plantMap.get(report.plant_id) ?? report.plant_id} is at ${report.score.toFixed(0)}%, increasing the likelihood of control gaps and audit findings.`,
        status: report.score < 65 ? "critical" : "warning"
      });
    }

    for (const finding of extractInsightList(report.violations, 2)) {
      watchItems.push({
        title: `${titleCase(report.framework)} possible violation`,
        detail: `${plantMap.get(report.plant_id) ?? report.plant_id}: ${finding}`,
        status: "warning"
      });
    }
  }

  for (const permit of permits) {
    const zone = permit.zone_id ? zoneMap.get(permit.zone_id) : null;
    if (!zone) {
      continue;
    }

    if ((permit.status === "open" || permit.status === "approved") && (zone.risk_level === "high" || zone.risk_level === "critical")) {
      watchItems.push({
        title: `${titleCase(permit.permit_type)} permit overlaps an elevated-risk zone`,
        detail: `${permit.permit_number} remains ${permit.status} in ${zone.zone_name}, which is currently classified as ${zone.risk_level}.`,
        status: zone.risk_level === "critical" ? "critical" : "warning"
      });
    }
  }

  for (const item of maintenance) {
    const asset = equipmentMap.get(item.equipment_id);
    if (!asset) {
      continue;
    }

    if (item.status === "overdue" || (item.status === "running" && asset.health_score < 70)) {
      watchItems.push({
        title: "Inspection or maintenance control requires review",
        detail: `${asset.equipment_name} has ${item.status} ${item.maintenance_type} work while asset health is ${asset.health_score.toFixed(0)}%.`,
        status: item.status === "overdue" ? "critical" : "warning"
      });
    }
  }

  for (const incident of incidents) {
    const plantId = plantIdFromIncident(incident, zones);
    if (!plantId || incident.status === "closed") {
      continue;
    }

    watchItems.push({
      title: `${titleCase(incident.incident_type)} remains open`,
      detail: `${plantMap.get(plantId) ?? plantId}: ${incident.title} still requires closure and corrective action verification.`,
      status: incident.severity === "critical" ? "critical" : "warning"
    });
  }

  return watchItems.slice(0, 8);
}

export function buildAgentInsights({
  hotspots,
  liveRisks,
  permits,
  maintenance,
  incidents,
  plants = [],
  zones = [],
  equipment = [],
  complianceReports = []
}: {
  hotspots: ZoneHotspot[];
  liveRisks: RiskEventRead[];
  permits: PermitRead[];
  maintenance: MaintenanceRead[];
  incidents: IncidentRead[];
  plants?: PlantRead[];
  zones?: ZoneRead[];
  equipment?: EquipmentRead[];
  complianceReports?: ComplianceReportRead[];
}) {
  const rankedRisks = [...liveRisks].sort((left, right) => right.risk_score - left.risk_score);
  const topRisk = rankedRisks[0] ?? null;
  const topHotspot = hotspots[0] ?? null;
  const activePermits = permits.filter(
    (permit) => permit.status === "open" || permit.status === "approved" || permit.status === "suspended"
  );
  const hotWorkPermits = activePermits.filter((permit) => permit.permit_type === "hot_work");
  const permitOverlapHotspots = hotspots.filter((hotspot) => hotspot.activePermitCount > 0 && hotspot.hotspotScore >= 70);
  const maintenancePressure = maintenance.filter(
    (item) => item.status === "running" || item.status === "overdue" || item.status === "scheduled"
  );
  const overdueMaintenance = maintenance.filter((item) => item.status === "overdue");
  const degradedEquipment = equipment.filter(
    (item) =>
      item.health_score < 75 ||
      item.status === "warning" ||
      item.status === "critical" ||
      item.status === "offline" ||
      item.status === "maintenance"
  );
  const openIncidents = incidents.filter((incident) => incident.status !== "closed");
  const criticalIncidents = openIncidents.filter((incident) => incident.severity === "critical");
  const lowScoreReports = complianceReports.filter((report) => report.score < 75);
  const complianceWatchlist = buildComplianceWatchlist({
    plants,
    zones,
    reports: complianceReports,
    permits,
    maintenance,
    equipment,
    incidents
  });

  const riskSignalScore = Math.max(topRisk?.risk_score ?? 0, topHotspot?.hotspotScore ?? 0);
  const permitSignalScore = clampPercentage(activePermits.length * 11 + hotWorkPermits.length * 14 + permitOverlapHotspots.length * 16);
  const maintenanceSignalScore = clampPercentage(
    maintenancePressure.length * 12 + overdueMaintenance.length * 16 + degradedEquipment.length * 7
  );
  const complianceSignalScore = clampPercentage(lowScoreReports.length * 18 + complianceWatchlist.length * 9);
  const incidentSignalScore = clampPercentage(openIncidents.length * 11 + criticalIncidents.length * 18);
  const emergencySignalScore = Math.max(riskSignalScore, incidentSignalScore, topHotspot?.hotspotScore ?? 0);

  const riskAgent: AgentInsight = {
    id: "risk-intelligence-agent",
    agentName: "Risk Intelligence Agent",
    responsibility: "Compound risk detection",
    status: agentStatusFromScore(riskSignalScore),
    sourceKind: topRisk ? "live" : topHotspot ? "derived" : "derived",
    confidence: normalizeConfidence(topRisk?.confidence ?? (topHotspot ? 0.76 : 0.58)),
    summary: topRisk
      ? `${titleCase(topRisk.risk_category)} is the dominant risk signal because ${topRisk.reason.toLowerCase()}.`
      : topHotspot
        ? `${topHotspot.zoneName} remains the highest derived hotspot based on overlapping permits, maintenance pressure, and open incident context.`
        : "No dominant compound-risk signal is active, so the agent remains in monitoring mode.",
    evidence: uniqueStrings([
      topRisk?.reason,
      topHotspot
        ? `${topHotspot.zoneName} hotspot score ${topHotspot.hotspotScore.toFixed(0)} with ${topHotspot.activePermitCount} permit overlaps.`
        : null,
      topHotspot?.contributors[0]?.label
    ]).slice(0, 3),
    impact:
      topRisk?.expected_consequence ??
      (topHotspot
        ? "If the current overlap persists, the affected zone can move from elevated exposure into a recordable compound event."
        : "Continue monitoring for the next correlated operational shift."),
    recommendedAction:
      topRisk?.recommendation ??
      topHotspot?.recommendedAction ??
      "Keep monitoring live risks and verify whether permits, maintenance, or access controls need adjustment."
  };

  const permitAgent: AgentInsight = {
    id: "permit-intelligence-agent",
    agentName: "Permit Intelligence Agent",
    responsibility: "Permit conflict detection",
    status: agentStatusFromScore(permitSignalScore),
    sourceKind: "derived",
    confidence: normalizeConfidence(0.52 + activePermits.length * 0.04 + hotWorkPermits.length * 0.05),
    summary: activePermits.length
      ? `${activePermits.length} active permits remain in play${hotWorkPermits.length ? `, including ${hotWorkPermits.length} hot-work permits` : ""}${permitOverlapHotspots[0] ? ` around ${permitOverlapHotspots[0].zoneName}` : ""}.`
      : "No active permits are currently increasing the compound-risk posture.",
    evidence: uniqueStrings([
      hotWorkPermits.length ? `${hotWorkPermits.length} hot-work permits require immediate review.` : null,
      permitOverlapHotspots[0]
        ? `${permitOverlapHotspots[0].zoneName} has ${permitOverlapHotspots[0].activePermitCount} overlapping permits in the current operating window.`
        : null,
      activePermits[0] ? `Representative permit: ${activePermits[0].permit_number}.` : null
    ]).slice(0, 3),
    impact: "Unchecked permit overlap can turn a process upset into a multi-factor incident with direct worker exposure.",
    recommendedAction: permitOverlapHotspots.length
      ? "Suspend or re-validate overlapping permits before work continues in the highest-risk zone."
      : "Reconfirm permit controls and isolate any hot-work package that lacks current area clearance."
  };

  const maintenanceAgent: AgentInsight = {
    id: "maintenance-intelligence-agent",
    agentName: "Maintenance Intelligence Agent",
    responsibility: "Maintenance pressure monitoring",
    status: agentStatusFromScore(maintenanceSignalScore),
    sourceKind: "derived",
    confidence: normalizeConfidence(0.5 + overdueMaintenance.length * 0.06 + maintenancePressure.length * 0.03),
    summary: maintenancePressure.length
      ? `${maintenancePressure.length} maintenance tasks are influencing the current safety posture, with ${overdueMaintenance.length} already overdue.`
      : "Maintenance pressure is currently low and not driving the dominant operating risk.",
    evidence: uniqueStrings([
      overdueMaintenance.length ? `${overdueMaintenance.length} maintenance records are overdue.` : null,
      degradedEquipment.length ? `${degradedEquipment.length} equipment assets are degraded or offline.` : null,
      maintenancePressure[0] ? `Representative maintenance status: ${maintenancePressure[0].status}.` : null
    ]).slice(0, 3),
    impact: "Maintenance backlog narrows the safety margin and can reduce the time available to recover from a live upset.",
    recommendedAction:
      overdueMaintenance.length || degradedEquipment.length
        ? "Pause non-essential maintenance in affected zones and inspect degraded equipment before the next work interval."
        : "Keep maintenance sequencing aligned with permit and operations windows."
  };

  const complianceAgent: AgentInsight = {
    id: "compliance-intelligence-agent",
    agentName: "Compliance Intelligence Agent",
    responsibility: "Regulatory conflict review",
    status: agentStatusFromScore(complianceSignalScore),
    sourceKind: complianceReports.length ? "live" : "derived",
    confidence: normalizeConfidence(complianceReports.length ? 0.68 + lowScoreReports.length * 0.04 : 0.56),
    summary: complianceWatchlist.length
      ? `${complianceWatchlist.length} compliance watch items are active across permits, maintenance, unresolved incidents, or low-scoring reports.`
      : complianceReports.length
        ? "Current stored compliance reports are not surfacing any standout regulatory escalations."
        : "Compliance posture is being derived from live operational context because no additional indexed guidance is loaded in this environment.",
    evidence: uniqueStrings([
      lowScoreReports[0]
        ? `${titleCase(lowScoreReports[0].framework)} score is ${lowScoreReports[0].score.toFixed(0)}%.`
        : null,
      complianceWatchlist[0]?.title,
      complianceWatchlist[1]?.title
    ]).slice(0, 3),
    impact: "Open regulatory gaps increase both audit exposure and the chance that unsafe work continues without corrective action.",
    recommendedAction: complianceWatchlist.length
      ? "Resolve the highest-severity watch items first and document corrective actions before the next compliance review."
      : "Maintain documentation discipline and add any missing regulatory source documents before production rollout."
  };

  const incidentAgent: AgentInsight = {
    id: "incident-investigation-agent",
    agentName: "Incident Investigation Agent",
    responsibility: "Incident intelligence",
    status: agentStatusFromScore(incidentSignalScore),
    sourceKind: openIncidents.length ? "live" : "derived",
    confidence: normalizeConfidence(0.54 + openIncidents.length * 0.04 + criticalIncidents.length * 0.06),
    summary: openIncidents.length
      ? `${openIncidents.length} unresolved incidents remain in the operating picture, including ${criticalIncidents.length} critical cases.`
      : "There are no open incidents currently widening the live safety posture.",
    evidence: uniqueStrings([
      criticalIncidents[0] ? `${criticalIncidents[0].title} remains ${criticalIncidents[0].status}.` : null,
      openIncidents[0]?.ai_summary ?? openIncidents[0]?.description,
      topRisk ? `Related live risk: ${topRisk.risk_category}.` : null
    ]).slice(0, 3),
    impact: "Unresolved incidents often indicate controls that are still open and can recur on the next shift if not closed out.",
    recommendedAction: openIncidents.length
      ? "Escalate unresolved incidents into the investigation workflow and verify closure of related permit and maintenance actions."
      : "Keep investigation workflows ready for the next live event."
  };

  const emergencyAgent: AgentInsight = {
    id: "emergency-response-agent",
    agentName: "Emergency Response Agent",
    responsibility: "Escalation posture",
    status: agentStatusFromScore(emergencySignalScore),
    sourceKind: topRisk ? "live" : "derived",
    confidence: normalizeConfidence(Math.max(topRisk?.confidence ?? 0.58, 0.55 + criticalIncidents.length * 0.05)),
    summary:
      emergencySignalScore >= 84
        ? "Emergency posture is elevated because live compound risk, incident, or hotspot signals indicate a narrow response window."
        : emergencySignalScore >= 60
          ? "Emergency posture is on watch because multiple signals are converging, but no immediate evacuation trigger has been confirmed."
          : "Emergency posture remains in monitoring mode while the AI layer continues to watch for escalation.",
    evidence: uniqueStrings([
      topRisk ? `Top live risk: ${topRisk.risk_category} at score ${topRisk.risk_score.toFixed(1)}.` : null,
      topHotspot ? `${topHotspot.zoneName} prediction horizon is ${topHotspot.predictionHorizon}.` : null,
      criticalIncidents.length ? `${criticalIncidents.length} critical incidents remain open.` : null
    ]).slice(0, 3),
    impact: "Faster escalation reduces worker exposure time and limits secondary asset damage during a deteriorating event.",
    recommendedAction:
      emergencySignalScore >= 84
        ? "Pre-stage evacuation, isolate the highest-risk zone, and notify the safety lead immediately."
        : "Confirm emergency contacts, verify muster readiness, and keep the highest-risk zone under tighter observation."
  };

  const coreAgents = [
    riskAgent,
    permitAgent,
    maintenanceAgent,
    complianceAgent,
    incidentAgent,
    emergencyAgent
  ];

  const priorityAgents = coreAgents.filter((agent) => agent.status !== "monitoring");
  const executiveLead = priorityAgents[0] ?? coreAgents[0];

  const executiveAgent: AgentInsight = {
    id: "executive-summary-agent",
    agentName: "Executive Summary Agent",
    responsibility: "Executive decision support",
    status: executiveLead.status,
    sourceKind: priorityAgents.some((agent) => agent.sourceKind === "live") ? "live" : executiveLead.sourceKind,
    confidence: normalizeConfidence(
      priorityAgents.length
        ? priorityAgents.reduce((sum, agent) => sum + agent.confidence, 0) / priorityAgents.length
        : executiveLead.confidence
    ),
    summary: priorityAgents.length
      ? `Leadership attention should move first to ${executiveLead.agentName.replace(" Agent", "")}, with support from ${priorityAgents
          .slice(1, 3)
          .map((agent) => agent.agentName.replace(" Agent", ""))
          .join(", ") || "the remaining AI agents"}.`
      : "No specialized agent is requesting escalation, so leadership can stay in a monitoring posture.",
    evidence: uniqueStrings(priorityAgents.slice(0, 3).map((agent) => agent.summary)).slice(0, 3),
    impact: "This agent turns cross-domain AI findings into a clear next move for safety leadership and shift handover.",
    recommendedAction: executiveLead.recommendedAction
  };

  return [...coreAgents, executiveAgent];
}

export function buildExecutiveDecisionBrief(agentInsights: AgentInsight[]): ExecutiveDecisionBrief | null {
  if (!agentInsights.length) {
    return null;
  }

  const operationalAgents = agentInsights.filter((agent) => agent.id !== "executive-summary-agent");
  const priorityAgents = operationalAgents.filter((agent) => agent.status !== "monitoring");
  const rankedAgents = (priorityAgents.length ? priorityAgents : operationalAgents).slice(0, 3);
  const leadAgent = rankedAgents[0];

  if (!leadAgent) {
    return null;
  }

  return {
    headline:
      leadAgent.status === "escalated"
        ? `${leadAgent.agentName.replace(" Agent", "")} is driving the current operating decision.`
        : `${leadAgent.agentName.replace(" Agent", "")} is the leading AI lens for the current view.`,
    narrative: `${leadAgent.summary} ${rankedAgents
      .slice(1)
      .map((agent) => `${agent.agentName.replace(" Agent", "")} adds: ${agent.summary.toLowerCase()}`)
      .join(" ")}`.trim(),
    nextAction: leadAgent.recommendedAction,
    supportingAgents: rankedAgents.map((agent) => agent.agentName),
    sourceKind: rankedAgents.some((agent) => agent.sourceKind === "live") ? "live" : leadAgent.sourceKind
  };
}

export function summarizeHistoricalSimilarity(matches: HistoricalSimilarityMatch[]) {
  if (!matches.length) {
    return "No historical similarity match returned.";
  }

  const topMatch = matches[0];
  return `Similar to ${topMatch.title} (${topMatch.source}) with ${Math.round(topMatch.similarity_score * 100)}% similarity.`;
}
