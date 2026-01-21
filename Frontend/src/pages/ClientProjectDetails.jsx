import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function ClientProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    const res = await api.get(`/projects/${id}`);
    setProject(res.data);
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">{project.title}</h2>

      <p><b>Budget:</b> ₹{project.budget}</p>
      <p><b>Status:</b> {project.status}</p>

      {/* REQUIREMENTS */}
      <h3 className="mt-6 font-semibold">Client Requirements</h3>
      <ul>
        {project.requirements.map(req => (
          <li key={req._id}>
            {req.text} — <b>{req.status}</b>
          </li>
        ))}
      </ul>

      {/* AI VALIDATION REPORT */}
      {project.validationReport && (
        <>
          <h3 className="mt-6 font-semibold">AI Validation Report</h3>
          <ul>
            {project.validationReport.map((v, i) => (
              <li key={i}>
                {v.requirement} :{" "}
                {v.matched ? "✅ Matched" : "❌ Missing"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
