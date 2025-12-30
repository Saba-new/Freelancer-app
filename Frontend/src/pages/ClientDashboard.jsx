import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import ChatBox from "../components/ChatBox";

export default function ClientDashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Project Modal
  const [showNewProject, setShowNewProject] = useState(false);
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");

  // Preview Modal
  const [showPreview, setShowPreview] = useState(false);
  const [previewProject, setPreviewProject] = useState(null);

  const fetchDashboard = async () => {
    try {
      const res = await api.get("/projects/client-dashboard");
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error("Dashboard error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  /* ================= CREATE PROJECT ================= */
  const createProject = async () => {
    if (!title || !budget) return alert("Title & Budget required");

    await api.post("/projects", { title, budget });
    setTitle("");
    setBudget("");
    setShowNewProject(false);
    fetchDashboard();
  };

  /* ================= DELETE PROJECT ================= */
  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    await api.delete(`/projects/${id}`);
    setShowPreview(false);
    fetchDashboard();
  };

  /* ================= RELEASE PAYMENT ================= */
  const releasePayment = async (id) => {
    await api.put(`/projects/${id}/release-payment`);
    alert("Payment released successfully");
    setShowPreview(false);
    fetchDashboard();
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
          <button
            onClick={() => setShowNewProject(true)}
            className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-semibold transition"
          >
            + New Project
          </button>
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
                      onClick={() => {
                        setPreviewProject(p);
                        setShowPreview(true);
                      }}
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
        <Modal>
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

          <div className="flex justify-end gap-3 mt-4">
            <Btn gray onClick={() => setShowNewProject(false)}>Cancel</Btn>
            <Btn onClick={createProject}>Create</Btn>
          </div>
        </Modal>
      )}

      {/* ================= PREVIEW MODAL ================= */}
      {showPreview && previewProject && (
        <Modal wide>
          <h3 className="text-xl font-bold mb-2">Project Preview</h3>

          <p><b>Title:</b> {previewProject.title}</p>
          <p><b>Budget:</b> ₹{previewProject.budget}</p>
          <p className="mb-2">
            <b>Status:</b> {previewProject.status}
          </p>

          {/* SUBMITTED WORK LINK */}
          {previewProject.submissionUrl && (
            <a
              href={previewProject.submissionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mb-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition"
            >
              View Submitted Work
            </a>
          )}

          {/* PROGRESS BAR — ONLY 0% OR 100% */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Progress</span>
              <span>
                {previewProject.status === "submitted" ||
                previewProject.status === "completed"
                  ? "100%"
                  : "0%"}
              </span>
            </div>

            <div className="h-2 bg-gray-700 rounded">
              <div
                className="h-2 bg-green-500 rounded transition-all duration-500"
                style={{
                  width:
                    previewProject.status === "submitted" ||
                    previewProject.status === "completed"
                      ? "100%"
                      : "0%",
                }}
              />
            </div>
          </div>

          {/* CHAT */}
          <ChatBox projectId={previewProject._id} />

          {/* APPROVE & RELEASE PAYMENT — CLIENT ONLY */}
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

function Modal({ children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div
        className={`bg-gray-900 p-6 rounded-xl animate-scaleIn ${
          wide ? "max-w-xl w-full" : "max-w-md w-full"
        }`}
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
