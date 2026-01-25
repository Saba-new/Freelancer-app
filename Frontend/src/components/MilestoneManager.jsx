import { useState } from "react";
import api from "../services/api";

export default function MilestoneManager({ project, onUpdate }) {
  const [showAddMilestones, setShowAddMilestones] = useState(false);
  const [milestones, setMilestones] = useState([
    { title: "", description: "", amount: "" },
  ]);
  const [expandedMilestones, setExpandedMilestones] = useState({});

  const hasMilestones = project.milestones && project.milestones.length > 0;

  console.log('MilestoneManager - project.milestones:', project.milestones?.length || 0);

  const toggleMilestone = (milestoneId) => {
    setExpandedMilestones(prev => ({
      ...prev,
      [milestoneId]: !prev[milestoneId]
    }));
  };

  const addMilestoneField = () => {
    setMilestones([...milestones, { title: "", description: "", amount: "" }]);
  };

  const removeMilestoneField = (index) => {
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const saveMilestones = async () => {
    // Validate
    const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
    if (Math.abs(totalAmount - project.budget) > 0.01) {
      alert(`Total milestone amount (₹${totalAmount}) must equal project budget (₹${project.budget})`);
      return;
    }

    const hasEmpty = milestones.some(m => !m.title || !m.amount);
    if (hasEmpty) {
      alert("Please fill all milestone titles and amounts");
      return;
    }

    try {
      await api.post(`/projects/${project._id}/milestones`, { milestones });
      alert("Milestones added successfully!");
      setShowAddMilestones(false);
      onUpdate();
    } catch (err) {
      alert("Failed to add milestones: " + (err.response?.data?.message || err.message));
    }
  };

  const approveMilestone = async (milestoneId) => {
    if (!window.confirm("Approve and release payment for this milestone?")) return;

    try {
      await api.put(`/projects/${project._id}/milestones/${milestoneId}/approve`);
      alert("Payment released for milestone!");
      onUpdate();
    } catch (err) {
      alert("Failed to release payment: " + (err.response?.data?.message || err.message));
    }
  };

  const totalAmount = milestones.reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const remaining = project.budget - totalAmount;

  return (
    <div className="mt-4">
      {!hasMilestones ? (
        <div>
          <button
            onClick={() => setShowAddMilestones(!showAddMilestones)}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition"
          >
            {showAddMilestones ? "Cancel" : "➕ Add Milestones"}
          </button>

          {showAddMilestones && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold mb-3">Define Project Milestones</h4>
              <p className="text-sm text-gray-400 mb-4">
                Break down your project into milestones. Total amount must equal ₹{project.budget}
              </p>

              {milestones.map((milestone, index) => (
                <div key={index} className="mb-3 p-3 bg-gray-700 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold">Milestone {index + 1}</span>
                    {milestones.length > 1 && (
                      <button
                        onClick={() => removeMilestoneField(index)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        ✖ Remove
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Milestone Title"
                    value={milestone.title}
                    onChange={(e) => updateMilestone(index, "title", e.target.value)}
                    className="w-full mb-2 p-2 bg-gray-600 rounded text-white"
                  />

                  <textarea
                    placeholder="Description (optional)"
                    value={milestone.description}
                    onChange={(e) => updateMilestone(index, "description", e.target.value)}
                    className="w-full mb-2 p-2 bg-gray-600 rounded text-white resize-none"
                    rows="2"
                  />

                  <input
                    type="number"
                    placeholder="Amount (₹)"
                    value={milestone.amount}
                    onChange={(e) => updateMilestone(index, "amount", e.target.value)}
                    className="w-full p-2 bg-gray-600 rounded text-white"
                  />
                </div>
              ))}

              <button
                onClick={addMilestoneField}
                className="text-blue-400 hover:text-blue-300 text-sm mb-3"
              >
                + Add Another Milestone
              </button>

              <div className="flex justify-between items-center mb-3 p-3 bg-gray-900 rounded">
                <span className="font-semibold">Total Amount:</span>
                <span className={`text-xl font-bold ${Math.abs(remaining) < 0.01 ? "text-green-400" : "text-red-400"}`}>
                  ₹{totalAmount.toFixed(2)} / ₹{project.budget}
                </span>
              </div>

              {Math.abs(remaining) > 0.01 && (
                <p className="text-sm text-yellow-400 mb-3">
                  Remaining: ₹{remaining.toFixed(2)}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAddMilestones(false)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveMilestones}
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-semibold transition"
                >
                  Save Milestones
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
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

                {milestone.submissionUrl && (
                  <a
                    href={milestone.submissionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm block mt-2"
                  >
                    🔗 View Submission
                  </a>
                )}

                {milestone.overallScore !== undefined && (
                  <div className="mt-3 p-2 bg-gray-900 rounded">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">AI Score:</span>
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
                      <p className="text-xs text-gray-400 mt-1 italic">"{milestone.aiFeedback}"</p>
                    )}
                  </div>
                )}

                {milestone.status === "submitted" && (
                  <button
                    onClick={() => approveMilestone(milestone._id)}
                    className="mt-3 w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-semibold transition"
                  >
                    ✓ Approve & Release Payment
                  </button>
                )}

                {milestone.status === "paid" && (
                  <div className="mt-2 text-green-400 text-sm font-semibold">
                    ✓ Payment Released {milestone.paidAt && `on ${new Date(milestone.paidAt).toLocaleDateString()}`}
                  </div>
                )}
                </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-gray-900 rounded">
            <div className="flex justify-between">
              <span className="font-semibold">Total Budget:</span>
              <span className="font-bold text-green-400">₹{project.budget}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-400">Paid So Far:</span>
              <span className="text-sm">
                ₹
                {project.milestones
                  .filter((m) => m.status === "paid")
                  .reduce((sum, m) => sum + m.amount, 0)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
