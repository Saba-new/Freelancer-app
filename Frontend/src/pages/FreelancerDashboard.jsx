import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import ChatBox from "../components/ChatBox";

export default function FreelancerDashboard() {
  const [projects, setProjects] = useState([]);
  const [links, setLinks] = useState({});
  const [files, setFiles] = useState(null);

  const loadProjects = async () => {
    const res = await api.get("/projects/freelancer-dashboard");
    setProjects(res.data.projects || []);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const submitWork = async (id) => {
    if (!links[id]) return alert("Paste submission link");
    await api.put(`/projects/${id}/submit`, {
      submissionUrl: links[id],
    });
    loadProjects();
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

        {projects.map((p) => (
          <div
            key={p._id}
            className="bg-gray-900 p-6 rounded-xl mb-6 shadow hover:shadow-xl transition"
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">{p.title}</h3>
              <StatusBadge status={p.status} />
            </div>

            <p className="text-gray-400 mb-3">
              Budget: ₹{p.budget}
            </p>

            {/* SUBMISSION */}
            {p.status !== "submitted" && (
              <>
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
                  className="mt-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
                >
                  Submit Work
                </button>
              </>
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
              <p className="mt-4 text-green-400 font-semibold">
                Payment Received ✔
              </p>
            )}

            {/* CHAT */}
            <ChatBox projectId={p._id} />
          </div>
        ))}
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
