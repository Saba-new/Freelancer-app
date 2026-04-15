import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import ChatBox from "../components/ChatBox";
import MilestoneManager from "../components/MilestoneManager";
import ProjectIntelligenceCard from "../components/ProjectIntelligenceCard";

export default function ClientDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");

  // Preview Modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);
  
  // Add Requirement Modal
  const [showAddRequirement, setShowAddRequirement] = useState(false);
  const [newRequirementText, setNewRequirementText] = useState("");
  const [newRequirementCategory, setNewRequirementCategory] = useState("other");
  const [newRequirementPriority, setNewRequirementPriority] = useState("medium");

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/projects/client-dashboard");
      setProjects(res.data.projects || []);
      
      // Update preview project if modal is open
      if (previewProject) {
        const updatedProject = res.data.projects.find(p => p._id === previewProject._id);
        if (updatedProject) {
          console.log('Updating preview project with milestones:', updatedProject.milestones?.length || 0);
          setPreviewProject(updatedProject);
        }
      }
    } catch (err) {
      console.error("Dashboard error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    
    // Auto-refresh every 10 seconds to detect updates
    const interval = setInterval(() => {
      fetchDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  /* ================= CREATE PROJECT ================= */
  const createProject = async () => {
    if (!title || !budget) return alert("Title & Budget required");
    if (!description || description.length < 20) {
      return alert("Please provide a detailed project description (at least 20 characters) for AI requirement extraction");
    }

    try {
      setLoading(true);
      await api.post("/projects", { title, budget, description });
      setTitle("");
      setBudget("");
      setDescription("");
      setShowNewProject(false);
      await fetchDashboard();
      alert("Project created! AI has extracted requirements from your description.");
    } catch (err) {
      alert("Failed to create project: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE PROJECT ================= */
  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    
    try {
      await api.delete(`/projects/${id}`);
      alert("Project deleted successfully!");
      setShowPreview(false);
      await fetchDashboard();
    } catch (err) {
      alert("Failed to delete project: " + (err.response?.data?.message || err.message));
    }
  };

  /* ================= OPEN PROJECT PREVIEW ================= */
  const openProjectPreview = async (projectId) => {
    try {
      // Fetch fresh project data from server
      const res = await api.get(`/projects/${projectId}`);
      setPreviewProject(res.data);
      setShowPreview(true);
    } catch (err) {
      console.error("Failed to load project:", err);
      alert("Failed to load project details");
    }
  };

  /* ================= RELEASE PAYMENT ================= */
  const releasePayment = async (id) => {
    await api.put(`/projects/${id}/release-payment`);
    alert("Payment released successfully");
    setShowPreview(false);
    fetchDashboard();
  };

  /* ================= ADD REQUIREMENT ================= */
  const addRequirement = async () => {
    if (!newRequirementText.trim()) {
      return alert("Requirement text is required");
    }

    try {
      await api.post(`/projects/${previewProject._id}/requirements`, {
        text: newRequirementText,
        category: newRequirementCategory,
        priority: newRequirementPriority,
      });
      
      setNewRequirementText("");
      setNewRequirementCategory("other");
      setNewRequirementPriority("medium");
      setShowAddRequirement(false);
      
      // Refresh the project
      const res = await api.get(`/projects/${previewProject._id}`);
      setPreviewProject(res.data);
      alert("Requirement added successfully!");
    } catch (err) {
      alert("Failed to add requirement: " + (err.response?.data?.message || err.message));
    }
  };

  /* ================= DELETE REQUIREMENT ================= */
  const deleteRequirement = async (reqId) => {
    if (!window.confirm("Delete this requirement?")) return;

    try {
      await api.delete(`/projects/${previewProject._id}/requirements/${reqId}`);
      
      // Refresh the project
      const res = await api.get(`/projects/${previewProject._id}`);
      setPreviewProject(res.data);
      alert("Requirement deleted!");
    } catch (err) {
      alert("Failed to delete requirement: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return <p className="p-6 text-gray-400">Loading...</p>;
  }

  /* ================= STATS ================= */
  const totalProjects = projects.length;
  const active = projects.filter(p => p.status === "active").length;
  const submitted = projects.filter(p => p.status === "submitted").length;
  const completed = projects.filter(p => p.status === "completed").length;
  const totalBudget = projects.reduce(
    (sum, p) => sum + Number(p.budget || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white">
      <Navbar />

      <div className="p-6 max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Client Dashboard</h2>
          <div className="flex gap-3">
            <button
              onClick={fetchDashboard}
              className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition flex items-center gap-2"
              title="Refresh projects"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowNewProject(true)}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold transition"
            >
              + New Project
            </button>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          <StatCard title="Total Projects" value={totalProjects} />
          <StatCard title="Active" value={active} />
          <StatCard title="Submitted" value={submitted} />
          <StatCard title="Completed" value={completed} />
          <StatCard title="Total Budget" value={`₹${totalBudget}`} />
        </div>

        {/* PROJECT TABLE */}
        <div className="bg-gray-900 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <Th>Title</Th>
                <Th>Budget</Th>
                <Th>Status</Th>
                <Th>Preview</Th>
                <Th>Delete</Th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-400">
                    No projects yet
                  </td>
                </tr>
              )}

              {projects.map(p => (
                <tr
                  key={p._id}
                  className="border-b border-gray-800 hover:bg-gray-800 transition"
                >
                  <Td>{p.title}</Td>
                  <Td>₹{p.budget}</Td>
                  <Td>
                    <StatusBadge status={p.status} />
                  </Td>
                  <Td>
                    <button
                      onClick={() => openProjectPreview(p._id)}
                      className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-sm"
                    >
                      View
                    </button>
                  </Td>
                  <Td>
                    <button
                      onClick={() => deleteProject(p._id)}
                      className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-sm"
                    >
                      Delete
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= NEW PROJECT MODAL ================= */}
      {showNewProject && (
        <Modal onClose={() => setShowNewProject(false)}>
          <h3 className="text-xl font-bold mb-4">Create New Project</h3>

          <input
            className="input"
            placeholder="Project title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="input"
            placeholder="Budget"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />

          <textarea
            className="input min-h-[120px]"
            placeholder="Detailed project description (AI will extract requirements from this)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            🤖 AI will analyze your description to extract project requirements
          </p>

          <div className="flex justify-end gap-3 mt-4">
            <Btn gray onClick={() => setShowNewProject(false)}>Cancel</Btn>
            <Btn onClick={createProject}>Create</Btn>
          </div>
        </Modal>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {showPreview && previewProject && (
        <Modal wide onClose={() => setShowPreview(false)}>
          <h3 className="text-xl font-bold mb-2">Project Preview</h3>

          <p><b>Title:</b> {previewProject.title}</p>
          <p><b>Budget:</b> ₹{previewProject.budget}</p>
          <p className="mb-2">
            <b>Status:</b> {previewProject.status}
          </p>

          {/* REQUIREMENTS LIST */}
          {previewProject.requirements && previewProject.requirements.length > 0 && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-lg flex items-center gap-2">
                  🎯 Project Requirements
                  <span className="text-sm text-gray-400">({previewProject.requirements.length} items)</span>
                </h4>
                {previewProject.status === "active" && (
                  <button
                    onClick={() => setShowAddRequirement(!showAddRequirement)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded"
                  >
                    + Add Requirement
                  </button>
                )}
              </div>

              {/* ADD REQUIREMENT FORM */}
              {showAddRequirement && (
                <div className="mb-4 bg-gray-700 p-3 rounded-lg space-y-2">
                  <input
                    className="input text-sm"
                    placeholder="Requirement description"
                    value={newRequirementText}
                    onChange={(e) => setNewRequirementText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <select
                      className="input text-sm flex-1"
                      value={newRequirementCategory}
                      onChange={(e) => setNewRequirementCategory(e.target.value)}
                    >
                      <option value="frontend">Frontend</option>
                      <option value="backend">Backend</option>
                      <option value="database">Database</option>
                      <option value="authentication">Authentication</option>
                      <option value="api">API</option>
                      <option value="deployment">Deployment</option>
                      <option value="testing">Testing</option>
                      <option value="other">Other</option>
                    </select>
                    <select
                      className="input text-sm flex-1"
                      value={newRequirementPriority}
                      onChange={(e) => setNewRequirementPriority(e.target.value)}
                    >
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addRequirement}
                      className="text-sm bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded flex-1"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRequirement(false);
                        setNewRequirementText("");
                      }}
                      className="text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded flex-1"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <ul className="space-y-2">
                {previewProject.requirements.map((req, i) => (
                  <li key={req._id || i} className="flex items-start gap-2 p-2 bg-gray-700/50 rounded group">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      req.status === "completed" ? "bg-green-600" :
                      req.status === "in-progress" ? "bg-yellow-600" :
                      "bg-gray-600"
                    }`}>
                      {req.status || "pending"}
                    </span>
                    <span className="flex-1">{req.text}</span>
                    {req.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        req.priority === "high" ? "bg-red-600/30 text-red-300" :
                        req.priority === "medium" ? "bg-yellow-600/30 text-yellow-300" :
                        "bg-blue-600/30 text-blue-300"
                      }`}>
                        {req.priority}
                      </span>
                    )}
                    {previewProject.status === "active" && (
                      <button
                        onClick={() => deleteRequirement(req._id)}
                        className="text-red-400 hover:text-red-300 text-xs opacity-0 group-hover:opacity-100 transition"
                        title="Delete requirement"
                      >
                        🗑️
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ProjectIntelligenceCard projectId={previewProject._id} />

          {/* MILESTONE MANAGER */}
          <MilestoneManager project={previewProject} onUpdate={fetchDashboard} />

          {/* SUBMITTED WORK LINK */}
          {previewProject.submissionUrl && (
            <a
              href={previewProject.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
            >
              🔗 View Submitted Work
            </a>
          )}

          {/* 🔥 AI VALIDATION SCORE */}
          {previewProject.overallScore !== undefined && previewProject.status === "submitted" && (
            <div className="mt-4 bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-4 rounded-lg border border-purple-500/30">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-lg">🤖 AI Validation Score</h4>
                <span className={`text-3xl font-bold ${
                  previewProject.overallScore >= 70 ? "text-green-400" :
                  previewProject.overallScore >= 40 ? "text-yellow-400" :
                  "text-red-400"
                }`}>
                  {previewProject.overallScore}%
                </span>
              </div>
              {previewProject.aiFeedback && (
                <p className="text-sm text-gray-300 italic">"{previewProject.aiFeedback}"</p>
              )}
            </div>
          )}

          {/* AI STRENGTHS */}
          {previewProject.aiStrengths && previewProject.aiStrengths.length > 0 && (
            <div className="mt-3 bg-green-900/20 p-3 rounded-lg border border-green-500/30">
              <h5 className="font-semibold text-sm mb-2">✅ Strengths:</h5>
              <ul className="text-sm space-y-1">
                {previewProject.aiStrengths.map((item, i) => (
                  <li key={i} className="text-green-300">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI MISSING ITEMS */}
          {previewProject.aiMissingItems && previewProject.aiMissingItems.length > 0 && (
            <div className="mt-3 bg-red-900/20 p-3 rounded-lg border border-red-500/30">
              <h5 className="font-semibold text-sm mb-2">⚠️ Missing/Unclear:</h5>
              <ul className="text-sm space-y-1">
                {previewProject.aiMissingItems.map((item, i) => (
                  <li key={i} className="text-red-300">• {item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 🔥 DETAILED VALIDATION REPORT */}
          {previewProject.validationReport &&
            previewProject.validationReport.length > 0 && (
              <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                <h4 className="font-semibold mb-3 text-lg">
                  📊 Detailed Validation Report
                </h4>

                <ul className="space-y-2">
                  {previewProject.validationReport.map((v, i) => (
                    <li
                      key={i}
                      className={`p-3 rounded ${
                        v.matched ? "bg-green-600/20 border border-green-500/30" : "bg-red-600/20 border border-red-500/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium">{v.requirement}</span>
                        <span className="font-semibold">
                          {v.matched ? "✔ Matched" : "✖ Missing"}
                        </span>
                      </div>
                      {v.evidence && (
                        <p className="text-xs text-gray-400 mt-1">{v.evidence}</p>
                      )}
                      {v.confidence && (
                        <p className="text-xs text-gray-400 mt-1">Confidence: {v.confidence}%</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

          {/* PROGRESS BAR */}
          <div className="mt-6">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>
                {previewProject.overallScore || previewProject.progress || 0}%
              </span>
            </div>

            <div className="h-2 bg-gray-700 rounded">
              <div
                className="h-2 bg-green-500 rounded transition-all duration-500"
                style={{
                  width: `${previewProject.overallScore || previewProject.progress || 0}%`,
                }}
              />
            </div>
          </div>

          {/* CHAT */}
          <ChatBox projectId={previewProject._id} />

          {/* OLD APPROVE & RELEASE PAYMENT - Only show if no milestones */}
          {!previewProject.milestones || previewProject.milestones.length === 0 ? (
            <>
              {previewProject.status === "submitted" &&
                !previewProject.paymentReleased && (
                  <button
                    onClick={() => releasePayment(previewProject._id)}
                    className="mt-4 w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition"
                  >
                    Approve & Release Payment
                  </button>
                )}

              {previewProject.paymentReleased && (
                <p className="mt-4 text-green-400 font-semibold">
                  Payment Released ✔
                </p>
              )}
            </>
          ) : null}

          <div className="flex justify-end mt-4">
            <Btn gray onClick={() => setShowPreview(false)}>Close</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ================= UI HELPERS ================= */

function StatCard({ title, value }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 text-center hover:scale-105 transition shadow">
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-blue-600",
    submitted: "bg-yellow-500 text-black",
    completed: "bg-green-600",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-sm ${styles[status]}`}>
      {status}
    </span>
  );
}

function Th({ children }) {
  return <th className="p-4 text-left text-gray-300">{children}</th>;
}

function Td({ children }) {
  return <td className="p-4">{children}</td>;
}

function Modal({ children, wide, onClose }) {
  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-gray-900 p-6 rounded-xl max-h-[90vh] overflow-y-auto ${
          wide ? "max-w-4xl w-full" : "max-w-md w-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function Btn({ children, gray, ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-lg transition ${
        gray
          ? "bg-gray-600 hover:bg-gray-700"
          : "bg-blue-600 hover:bg-blue-700"
      }`}
    >
      {children}
    </button>
  );
}
