import Project from "../models/Project.js";
import extractRequirements from "../utils/requirementExtractor.js";

// CREATE PROJECT (Client)
export const createProject = async (req, res) => {
  try {
    const { title, budget, description } = req.body;

    // 🔹 AI-assisted requirement extraction
    const requirements = extractRequirements(description);

    const project = new Project({
      title,
      budget,
      description,
      client: req.user.id,   // from auth middleware
      requirements,
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: "Project creation failed" });
  }
};
export const updateRequirementStatus = async (req, res) => {
  try {
    const { projectId, requirementId } = req.params;
    const { status } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const requirement = project.requirements.id(requirementId);
    if (!requirement) {
      return res.status(404).json({ message: "Requirement not found" });
    }

    requirement.status = status;
    await project.save();

    res.json({ message: "Requirement updated", project });
  } catch (error) {
    res.status(500).json({ message: "Failed to update requirement" });
  }
};
