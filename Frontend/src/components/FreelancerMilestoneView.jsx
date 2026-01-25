import { useState } from "react";
import api from "../services/api";

export default function FreelancerMilestoneView({ project, onUpdate }) {
  const [submissionData, setSubmissionData] = useState({});
  const [showSubmitForm, setShowSubmitForm] = useState({});
  const [expandedMilestones, setExpandedMilestones] = useState({});

  const hasMilestones = project.milestones && project.milestones.length > 0;

  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const startMilestone = async (milestoneId) => {
    try {
      await api.patch(`/projects/${project._id}/milestones/${milestoneId}/status`, {
        status: "in-progress",
      });
      alert("Milestone marked as in-progress!");
      onUpdate();
    } catch (err) {
      alert("Failed to update milestone: " + (err.response?.data?.message || err.message));
    }
  };

  const submitMilestone = async (milestoneId) => {
    const data = submissionData[milestoneId];
    if (!data || !data.submissionUrl) {
      alert("Please provide a submission URL");
      return;
    }

    try {
      const res = await api.put(
        `/projects/${project._id}/milestones/${milestoneId}/submit`,
        {
          submissionUrl: data.submissionUrl,
          submissionDescription: data.submissionDescription || "",
        }
      );

      if (res.data.validation) {
        const score = res.data.validation.overallScore;
        alert(
          `Milestone submitted! AI Validation Score: ${score}%\n\n${res.data.validation.feedback}`
        );
      } else {
        alert("Milestone submitted successfully!");
      }

      setShowSubmitForm({ ...showSubmitForm, [milestoneId]: false });
      setSubmissionData({ ...submissionData, [milestoneId]: {} });
      onUpdate();
    } catch (err) {
      alert("Failed to submit milestone: " + (err.response?.data?.message || err.message));
    }
  };

  const updateSubmissionData = (milestoneId, field, value) => {
    setSubmissionData({
      ...submissionData,
      [milestoneId]: {
        ...(submissionData[milestoneId] || {}),
        [field]: value,
      },
    });
  };

  const toggleSubmitForm = (milestoneId) => {
    setShowSubmitForm({
      ...showSubmitForm,
      [milestoneId]: !showSubmitForm[milestoneId],
    });
  };

  if (!hasMilestones) {
    return (
      <div className="mt-4 p-3 bg-gray-800 rounded-lg text-gray-400 text-sm">
        No milestones defined for this project yet. Client will add milestones soon.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="bg-gray-800 p-4 rounded-lg">
        <h4 className="font-semibold mb-3 text-lg">📋 Project Milestones</h4>

        <div className="space-y-3">
          {project.milestones.map((milestone, index) => (
            <div
              key={milestone._id}
              className={`rounded-lg border-2 ${
                milestone.status === "paid"
                  ? "bg-green-900/20 border-green-500/30"
                  : milestone.status === "submitted"
                  ? "bg-yellow-900/20 border-yellow-500/30"
                  : milestone.status === "in-progress"
                  ? "bg-blue-900/20 border-blue-500/30"
                  : "bg-gray-700/50 border-gray-600"
              }`}
            >
              {/* Collapsible Header */}
              <div 
                className="flex justify-between items-start p-4 cursor-pointer hover:bg-gray-900/30 transition rounded-t-lg"
                onClick={() => toggleMilestone(milestone._id)}
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl transition-transform duration-200" style={{ transform: expandedMilestones[milestone._id] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                    ▶
                  </span>
                  <div>
                    <h5 className="font-semibold">
                      {index + 1}. {milestone.title}
                    </h5>
                    {milestone.description && !expandedMilestones[milestone._id] && (
                      <p className="text-sm text-gray-400 mt-1 truncate">{milestone.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xl font-bold text-green-400">₹{milestone.amount}</div>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      milestone.status === "paid"
                        ? "bg-green-600"
                        : milestone.status === "submitted"
                        ? "bg-yellow-600 text-black"
                        : milestone.status === "in-progress"
                        ? "bg-blue-600"
                        : "bg-gray-600"
                    }`}
                  >
                    {milestone.status}
                  </span>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedMilestones[milestone._id] && (
              <div className="px-4 pb-4">
                {milestone.description && (
                  <p className="text-sm text-gray-400 mb-3">{milestone.description}</p>
                )}

              {/* Actions based on status */}
              {milestone.status === "pending" && (
                <button
                  onClick={() => startMilestone(milestone._id)}
                  className="mt-3 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold transition"
                >
                  ▶ Start Working
                </button>
              )}

              {milestone.status === "in-progress" && (
                <div className="mt-3">
                  {!showSubmitForm[milestone._id] ? (
                    <button
                      onClick={() => toggleSubmitForm(milestone._id)}
                      className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition"
                    >
                      ✓ Submit Milestone
                    </button>
                  ) : (
                    <div className="bg-gray-900 p-3 rounded-lg">
                      <h6 className="font-semibold mb-2 text-sm">Submit Milestone Work</h6>

                      <input
                        type="text"
                        placeholder="Submission URL (GitHub, Drive, etc.)"
                        value={submissionData[milestone._id]?.submissionUrl || ""}
                        onChange={(e) =>
                          updateSubmissionData(milestone._id, "submissionUrl", e.target.value)
                        }
                        className="w-full mb-2 p-2 bg-gray-700 rounded text-white"
                      />

                      <textarea
                        placeholder="Description of completed work"
                        value={submissionData[milestone._id]?.submissionDescription || ""}
                        onChange={(e) =>
                          updateSubmissionData(
                            milestone._id,
                            "submissionDescription",
                            e.target.value
                          )
                        }
                        className="w-full mb-2 p-2 bg-gray-700 rounded text-white resize-none"
                        rows="3"
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleSubmitForm(milestone._id)}
                          className="flex-1 bg-gray-600 hover:bg-gray-700 px-3 py-2 rounded transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => submitMilestone(milestone._id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 px-3 py-2 rounded font-semibold transition"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {milestone.status === "submitted" && (
                <div className="mt-3">
                  <div className="text-yellow-400 text-sm mb-2">
                    ⏳ Waiting for client approval...
                  </div>
                  {milestone.submissionUrl && (
                    <a
                      href={milestone.submissionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      🔗 View Your Submission
                    </a>
                  )}
                  {milestone.overallScore !== undefined && (
                    <div className="mt-2 p-2 bg-gray-900 rounded">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">AI Validation Score:</span>
                        <span
                          className={`font-bold ${
                            milestone.overallScore >= 70
                              ? "text-green-400"
                              : milestone.overallScore >= 40
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {milestone.overallScore}%
                        </span>
                      </div>
                      {milestone.aiFeedback && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          "{milestone.aiFeedback}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {milestone.status === "paid" && (
                <div className="text-green-400 text-sm font-semibold">
                  ✓ Payment Received{" "}
                  {milestone.paidAt && `on ${new Date(milestone.paidAt).toLocaleDateString()}`}
                </div>
              )}
              </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress Summary */}
        <div className="mt-4 p-3 bg-gray-900 rounded">
          <div className="flex justify-between mb-2">
            <span className="font-semibold">Milestone Progress:</span>
            <span className="text-sm">
              {project.milestones.filter((m) => m.status === "paid").length} /{" "}
              {project.milestones.length} completed
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: `${
                  (project.milestones.filter((m) => m.status === "paid").length /
                    project.milestones.length) *
                  100
                }%`,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-400">Total Earned:</span>
            <span className="font-bold text-green-400">
              ₹
              {project.milestones
                .filter((m) => m.status === "paid")
                .reduce((sum, m) => sum + m.amount, 0)}{" "}
              / ₹{project.budget}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
