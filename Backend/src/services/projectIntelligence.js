function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function daysBetween(dateA, dateB = new Date()) {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

function milestoneSummary(project) {
  const milestones = Array.isArray(project.milestones) ? project.milestones : [];
  const total = milestones.length;
  const completed = milestones.filter((milestone) => milestone.status === "completed" || milestone.status === "paid").length;
  const submitted = milestones.filter((milestone) => milestone.status === "submitted").length;
  const active = milestones.filter((milestone) => milestone.status === "in-progress").length;
  const pending = milestones.filter((milestone) => milestone.status === "pending").length;
  const completionRate = total > 0 ? completed / total : 0;

  return { total, completed, submitted, active, pending, completionRate };
}

export function buildProjectIntelligence(project) {
  const requirements = Array.isArray(project.requirements) ? project.requirements : [];
  const milestones = milestoneSummary(project);

  const totalRequirements = requirements.length;
  const completedRequirements = requirements.filter((req) => req.status === "completed").length;
  const inProgressRequirements = requirements.filter((req) => req.status === "in-progress").length;
  const pendingRequirements = requirements.filter((req) => req.status === "pending").length;
  const highPriorityRequirements = requirements.filter((req) => req.priority === "high").length;
  const verifiedRequirements = requirements.filter((req) => req.verified).length;

  const requirementCompletionRate = totalRequirements > 0 ? completedRequirements / totalRequirements : 0;
  const inProgressRate = totalRequirements > 0 ? inProgressRequirements / totalRequirements : 0;
  const pendingRate = totalRequirements > 0 ? pendingRequirements / totalRequirements : 0;
  const highPriorityRate = totalRequirements > 0 ? highPriorityRequirements / totalRequirements : 0;
  const verificationRate = totalRequirements > 0 ? verifiedRequirements / totalRequirements : 0;

  const projectAgeDays = daysBetween(project.createdAt);
  const sinceSubmissionDays = project.submittedAt ? daysBetween(project.submittedAt) : 0;
  const hasSubmission = Boolean(project.submissionUrl || project.submittedAt);
  const isSubmitted = project.status === "submitted";
  const isCompleted = project.status === "completed";

  const milestonePressure = milestones.total > 0
    ? (milestones.pending * 0.9 + milestones.active * 0.6 + milestones.submitted * 0.4) / milestones.total
    : 0;

  const scopeComplexity = clamp(
    (totalRequirements * 3.4) + (highPriorityRequirements * 4.5) + (milestones.total * 2.5),
    0,
    100
  );

  const budgetComplexity = clamp(
    Math.log10(toNumber(project.budget, 1) + 10) * 12,
    0,
    40
  );

  const agePressure = clamp(
    projectAgeDays * (0.7 + pendingRate * 1.2),
    0,
    45
  );

  const progressHealth = clamp(
    (requirementCompletionRate * 38) + (verificationRate * 14) + (milestones.completionRate * 16),
    0,
    70
  );

  const submissionPenalty = isSubmitted
    ? clamp(42 - toNumber(project.overallScore, 45), 0, 30)
    : 0;

  const baseRisk = 18;
  const riskScore = clamp(
    Math.round(
      baseRisk +
      scopeComplexity * 0.34 +
      budgetComplexity * 0.6 +
      agePressure +
      milestonePressure * 22 +
      pendingRate * 28 +
      highPriorityRate * 14 +
      inProgressRate * 8 +
      submissionPenalty -
      progressHealth
    ),
    0,
    100
  );

  const predictedDelayDays = isCompleted
    ? 0
    : Math.max(
        0,
        Math.round(
          (riskScore / 14) +
          (pendingRequirements * 0.5) +
          (highPriorityRequirements * 0.3) +
          (milestones.pending * 0.8) -
          (completedRequirements * 0.15)
        )
      );

  const confidence = clamp(
    Math.round(
      52 +
      Math.min(totalRequirements, 12) * 2 +
      Math.min(milestones.total, 6) * 3 +
      Math.min(projectAgeDays, 20) * 0.6 -
      (totalRequirements < 3 ? 12 : 0) -
      (milestones.total === 0 ? 8 : 0)
    ),
    35,
    95
  );

  const stage = isCompleted
    ? "completed"
    : isSubmitted
      ? "submitted"
      : riskScore >= 75
        ? "critical"
        : riskScore >= 55
          ? "at-risk"
          : riskScore >= 30
            ? "steady"
            : "healthy";

  const predictedCompletionWindow = isCompleted
    ? "Completed"
    : isSubmitted
      ? `${Math.max(0, sinceSubmissionDays)}-day review window`
      : `${Math.max(1, predictedDelayDays + Math.max(2, totalRequirements - completedRequirements))} days`;

  const topDrivers = [
    {
      label: "Scope complexity",
      value: scopeComplexity,
      note: `${totalRequirements} requirements, ${highPriorityRequirements} high priority`,
    },
    {
      label: "Pending work",
      value: Math.round(pendingRate * 100),
      note: `${pendingRequirements} pending requirements`,
    },
    {
      label: "Milestone pressure",
      value: Math.round(milestonePressure * 100),
      note: `${milestones.pending} pending milestones`,
    },
    {
      label: "Project age",
      value: projectAgeDays,
      note: `${projectAgeDays} days since creation`,
    },
  ]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const recommendedActions = [];
  if (pendingRequirements > 0) {
    recommendedActions.push(`Focus on the ${pendingRequirements} pending requirement${pendingRequirements === 1 ? "" : "s"} first.`);
  }
  if (highPriorityRequirements > 0) {
    recommendedActions.push(`Resolve the ${highPriorityRequirements} high-priority items before expanding scope.`);
  }
  if (milestones.total > 0 && milestones.pending > 0) {
    recommendedActions.push("Break the next milestone into smaller deliverables to reduce schedule risk.");
  }
  if (riskScore >= 60) {
    recommendedActions.push("Reforecast the timeline with a tighter weekly review cycle.");
  }
  if (isSubmitted && toNumber(project.overallScore, 0) < 70) {
    recommendedActions.push("Address missing submission items before client review to improve approval odds.");
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("Keep current pace and maintain requirement updates.");
  }

  const milestoneReplan = milestones.total > 0
    ? milestones.pending > 0 || milestones.active > 0
      ? [
          `Current milestone pressure is ${Math.round(milestonePressure * 100)}%.`,
          milestones.pending > 0
            ? `${milestones.pending} milestone${milestones.pending === 1 ? " needs" : "s need"} to be started or clarified.`
            : "Existing milestones are in motion.",
          riskScore >= 60
            ? "Consider splitting the next delivery into smaller reviewable checkpoints."
            : "Milestone structure looks stable enough for the current pace.",
        ]
      : ["Milestones are in good shape."]
    : ["Add milestones to make timeline prediction more accurate."];

  return {
    version: 1,
    stage,
    riskScore,
    confidence,
    predictedDelayDays,
    predictedCompletionWindow,
    hasSubmission,
    totals: {
      requirements: totalRequirements,
      completedRequirements,
      inProgressRequirements,
      pendingRequirements,
      highPriorityRequirements,
      verifiedRequirements,
      milestones: milestones.total,
      completedMilestones: milestones.completed,
      submittedMilestones: milestones.submitted,
    },
    rates: {
      requirementCompletionRate: Math.round(requirementCompletionRate * 100),
      pendingRate: Math.round(pendingRate * 100),
      verificationRate: Math.round(verificationRate * 100),
      milestoneCompletionRate: Math.round(milestones.completionRate * 100),
    },
    topDrivers,
    recommendedActions,
    milestoneReplan,
    generatedAt: new Date().toISOString(),
  };
}
