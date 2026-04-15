import { useEffect, useState } from "react";
import api from "../services/api";

function riskTone(score) {
  if (score >= 75) return "text-red-400 bg-red-500/15 border-red-500/30";
  if (score >= 55) return "text-yellow-300 bg-yellow-500/15 border-yellow-500/30";
  if (score >= 30) return "text-blue-300 bg-blue-500/15 border-blue-500/30";
  return "text-green-300 bg-green-500/15 border-green-500/30";
}

export default function ProjectIntelligenceCard({ projectId, compact = false }) {
  const [intelligence, setIntelligence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadIntelligence = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await api.get(`/projects/${projectId}/intelligence`);
        if (active) setIntelligence(res.data);
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Failed to load intelligence");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    if (projectId) {
      loadIntelligence();
    }

    return () => {
      active = false;
    };
  }, [projectId]);

  if (!projectId) return null;

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-gray-700 bg-gray-800/60 p-4 text-sm text-gray-400">
        Loading project intelligence...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-red-500/30 bg-red-900/20 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!intelligence) return null;

  return (
    <div className={`mt-4 rounded-xl border bg-gray-900/80 p-4 ${compact ? "border-gray-700" : "border-indigo-500/20"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Project Intelligence Engine</p>
          <h4 className="mt-1 text-lg font-semibold text-white">Delay Risk Forecast</h4>
        </div>

        <div className={`rounded-lg border px-3 py-2 text-right ${riskTone(intelligence.riskScore)}`}>
          <div className="text-2xl font-bold">{intelligence.riskScore}%</div>
          <div className="text-[11px] uppercase tracking-wide">Risk</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <InfoBox label="Stage" value={intelligence.stage} />
        <InfoBox label="ETA impact" value={`${intelligence.predictedDelayDays}d`} />
        <InfoBox label="Confidence" value={`${intelligence.confidence}%`} />
        <InfoBox label="Completion" value={`${intelligence.rates.requirementCompletionRate}%`} />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400"
          style={{ width: `${intelligence.riskScore}%` }}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Top drivers</p>
          <div className="mt-2 space-y-2">
            {intelligence.topDrivers.map((driver) => (
              <div key={driver.label} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-100">{driver.label}</p>
                  <p className="text-xs text-gray-400">{driver.note}</p>
                </div>
                <span className="text-xs font-semibold text-blue-300">{driver.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Next actions</p>
          <ul className="mt-2 space-y-2 text-sm text-gray-200">
            {intelligence.recommendedActions.map((action, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-indigo-400">•</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 rounded-lg border border-gray-700 bg-gray-950/60 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Milestone replanning</p>
          <ul className="mt-2 space-y-1 text-sm text-gray-300">
            {intelligence.milestoneReplan.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500">
            Estimated completion window: {intelligence.predictedCompletionWindow}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
