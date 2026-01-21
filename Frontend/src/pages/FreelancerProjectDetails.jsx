import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

export default function FreelancerProjectDetails() {
  const { id } = useParams();
  const [project, setProject] = useState(null);

  useEffect(() => {
    fetchProject();
  }, []);

  const fetchProject = async () => {
    const res = await api.get(`/projects/${id}`);
    setProject(res.data);
  };

  const updateStatus = async (reqId, status) => {
    await api.patch(`/projects/${id}/requirements/${reqId}`, { status });
    fetchProject();
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">{project.title}</h2>

      <h3 className="mt-4 font-semibold">Task Progress</h3>

      {project.requirements.map(req => (
        <div key={req._id} className="flex items-center gap-3 mt-2">
          <span>{req.text}</span>
          <select
            value={req.status}
            onChange={(e) => updateStatus(req._id, e.target.value)}
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      ))}
    </div>
  );
}
