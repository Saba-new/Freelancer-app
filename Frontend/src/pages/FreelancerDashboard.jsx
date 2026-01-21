import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import ChatBox from "../components/ChatBox";

export default function FreelancerDashboard() {
  const [projects, setProjects] = useState([]);
  const [links, setLinks] = useState({});
  const [descriptions, setDescriptions] = useState({});
  const [files, setFiles] = useState(null);
  const [expandedProjects, setExpandedProjects] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState({});

  const loadProjects = async () => {
    const res = await api.get("/projects/freelancer-dashboard");
    setProjects(res.data.projects || []);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const toggleExpand = (id) => {
    setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getAISuggestions = async (projectId) => {
    try {
      setLoadingSuggestions(prev => ({ ...prev, [projectId]: true }));
      const res = await api.get(`/projects/${projectId}/progress-suggestions`);
      setAiSuggestions(prev => ({ ...prev, [projectId]: res.data }));
    } catch (err) {
      alert("Failed to get AI suggestions: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [projectId]: false }));
    }
  };

  const submitWork = async (id) => {
    if (!links[id]) return alert("Paste submission link");
    
    try {
      const res = await api.put(`/projects/${id}/submit`, {
        submissionUrl: links[id],
        submissionDescription: descriptions[id] || "",
      });

      if (res.data.validation) {
        const score = res.data.validation.overallScore;
        const feedback = res.data.validation.feedback;
        
        alert(`Work submitted!\n\nAI Validation Score: ${score}%\n\nFeedback: ${feedback}`);
      } else {
        alert("Work submitted successfully!");
      }

      loadProjects();
    } catch (err) {
      alert("Submission failed: " + (err.response?.data?.message || err.message));
    }
  };

  const updateRequirementStatus = async (projectId, reqId, status) => {
    try {
      await api.patch(`/projects/${projectId}/requirements/${reqId}`, { status });
      loadProjects();
    } catch (err) {
      alert("Failed to update: " + (err.response?.data?.message || err.message));
    }
  };

  const uploadFiles = async (id) => {
    if (!files) return alert("Select files");
    const formData = new FormData();
    for (let file of files) {
      formData.append("files", file);
    }

    await api.put(`/projects/${id}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setFiles(null);
    loadProjects();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <Navbar />

      <div className="p-6 max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">
          Freelancer Dashboard
        </h2>

        {projects.length === 0 && (
          <p className="text-gray-400">No assigned projects yet</p>
        )}

        {projects.map((p) => {
          const completedReqs = p.requirements?.filter(r => r.status === "completed").length || 0;
          const totalReqs = p.requirements?.length || 0;
          const progressPercent = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;
          const isExpanded = expandedProjects[p._id];

          return (
            <div
              key={p._id}
              className="bg-gray-900 p-6 rounded-xl mb-6 shadow hover:shadow-xl transition border border-gray-800"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{p.title}</h3>
                <StatusBadge status={p.status} />
              </div>

              <p className="text-gray-400 mb-3">
                Budget: ₹{p.budget}
              </p>

              {/* PROGRESS INDICATOR */}
              {totalReqs > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Requirements Progress</span>
                    <span className="font-semibold text-blue-400">
                      {completedReqs}/{totalReqs} ({progressPercent}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* REQUIREMENTS TRACKER */}
              {p.requirements && p.requirements.length > 0 && (
                <div className="mb-4 bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold">📋 Requirements</h4>
                    <button
                      onClick={() => toggleExpand(p._id)}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      {isExpanded ? "Hide" : "Show All"}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(isExpanded ? p.requirements : p.requirements.slice(0, 3)).map((req) => (
                      <div
                        key={req._id}
                        className="flex items-start gap-2 p-2 bg-gray-700/50 rounded"
                      >
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{req.text}</span>
                            {req.priority && (
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  req.priority === "high"
                                    ? "bg-red-600/30 text-red-300"
                                    : req.priority === "medium"
                                    ? "bg-yellow-600/30 text-yellow-300"
                                    : "bg-blue-600/30 text-blue-300"
                                }`}
                              >
                                {req.priority}
                              </span>
                            )}
                          </div>
                          {req.category && (
                            <span className="text-xs text-gray-400">
                              Category: {req.category}
                            </span>
                          )}
                        </div>

                        {/* STATUS SELECTOR */}
                        {p.status !== "submitted" && p.status !== "completed" && (
                          <select
                            value={req.status}
                            onChange={(e) =>
                              updateRequirementStatus(p._id, req._id, e.target.value)
                            }
                            className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1"
                          >
                            <option value="pending">Pending</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        )}

                        {(p.status === "submitted" || p.status === "completed") && (
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              req.status === "completed"
                                ? "bg-green-600"
                                : req.status === "in-progress"
                                ? "bg-yellow-600"
                                : "bg-gray-600"
                            }`}
                          >
                            {req.status}
                          </span>
                        )}
                      </div>
                    ))}
                    {!isExpanded && p.requirements.length > 3 && (
                      <p className="text-xs text-gray-400 text-center">
                        +{p.requirements.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* AI SUGGESTIONS */}
              {p.status === "active" && (
                <div className="mb-4">
                  {!aiSuggestions[p._id] ? (
                    <button
                      onClick={() => getAISuggestions(p._id)}
                      disabled={loadingSuggestions[p._id]}
                      className="text-sm bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded disabled:opacity-50"
                    >
                      {loadingSuggestions[p._id] ? "Loading..." : "🤖 Get AI Progress Suggestions"}
                    </button>
                  ) : (
                    <div className="bg-purple-900/30 p-4 rounded-lg border border-purple-500/30">
                      <h5 className="font-semibold mb-2 text-sm">🤖 AI Suggestions:</h5>
                      
                      {aiSuggestions[p._id].nextSteps && (
                        <div className="mb-2">
                          <p className="text-xs text-gray-400 mb-1">Next Steps:</p>
                          <ul className="text-sm space-y-1">
                            {aiSuggestions[p._id].nextSteps.map((step, i) => (
                              <li key={i} className="text-gray-300">• {step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-4 text-xs mt-2">
                        {aiSuggestions[p._id].estimatedTimeToComplete && (
                          <span className="text-gray-400">
                            ⏱️ Est: {aiSuggestions[p._id].estimatedTimeToComplete}
                          </span>
                        )}
                        {aiSuggestions[p._id].riskAssessment && (
                          <span
                            className={`${
                              aiSuggestions[p._id].riskAssessment === "high"
                                ? "text-red-400"
                                : aiSuggestions[p._id].riskAssessment === "medium"
                                ? "text-yellow-400"
                                : "text-green-400"
                            }`}
                          >
                            🎯 Risk: {aiSuggestions[p._id].riskAssessment}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SUBMISSION */}
              {p.status !== "submitted" && p.status !== "completed" && (
                <div className="space-y-2">
                  <textarea
                    value={descriptions[p._id] || ""}
                    onChange={(e) =>
                      setDescriptions({ ...descriptions, [p._id]: e.target.value })
                    }
                    placeholder="Describe what you've implemented (helps AI validate your work)"
                    className="input min-h-[80px]"
                  />

                  <input
                    value={links[p._id] || ""}
                    onChange={(e) =>
                      setLinks({ ...links, [p._id]: e.target.value })
                    }
                    placeholder="Paste submission link (Drive / GitHub)"
                    className="input"
                  />

                  <button
                    onClick={() => submitWork(p._id)}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                  >
                    Submit Work (AI will validate)
                  </button>
                </div>
              )}

              {/* SUBMISSION STATUS */}
              {p.status === "submitted" && (
                <div className="bg-yellow-900/30 p-3 rounded border border-yellow-500/30">
                  <p className="text-sm font-semibold text-yellow-300">
                    ⏳ Submitted - Awaiting client review
                  </p>
                  {p.overallScore !== undefined && (
                    <p className="text-xs text-gray-300 mt-1">
                      AI Score: {p.overallScore}%
                    </p>
                  )}
                </div>
              )}

              {/* FILE UPLOAD */}
              <div className="mt-3">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="text-sm text-gray-400"
                />
                <button
                  onClick={() => uploadFiles(p._id)}
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded"
                >
                  Upload Files
                </button>
              </div>

              {/* PAYMENT CONFIRMATION */}
              {p.paymentReleased && (
                <p className="mt-4 text-green-400 font-semibold flex items-center gap-2">
                  <span className="text-2xl">✅</span> Payment Received
                </p>
              )}

              {/* CHAT */}
              <ChatBox projectId={p._id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== STATUS BADGE ===== */
function StatusBadge({ status }) {
  const map = {
    active: "bg-blue-600",
    submitted: "bg-yellow-500 text-black",
    completed: "bg-green-600",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm ${map[status]}`}>
      {status}
    </span>
  );
}
