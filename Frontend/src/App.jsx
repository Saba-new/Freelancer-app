import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ClientDashboard from "./pages/ClientDashboard";
import FreelancerDashboard from "./pages/FreelancerDashboard";
import ProtectedRoute from "./routes/ProtectedRoute";

// ✅ ADD THESE IMPORTS (THIS IS THE FIX)
import ClientProjectDetails from "./pages/ClientProjectDetails";
import FreelancerProjectDetails from "./pages/FreelancerProjectDetails";

export default function App() {
  return (
    <Routes>
      {/* PROJECT DETAILS */}
      <Route
        path="/client/project/:id"
        element={<ClientProjectDetails />}
      />
      <Route
        path="/freelancer/project/:id"
        element={<FreelancerProjectDetails />}
      />

      {/* AUTH */}
      <Route path="/" element={<Login />} />

      {/* CLIENT DASHBOARD */}
      <Route
        path="/client"
        element={
          <ProtectedRoute role="client">
            <ClientDashboard />
          </ProtectedRoute>
        }
      />

      {/* FREELANCER DASHBOARD */}
      <Route
        path="/freelancer"
        element={
          <ProtectedRoute role="freelancer">
            <FreelancerDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
