import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("client");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitHandler = async () => {
    setLoading(true);
    setError("");

    try {
      if (isSignup) {
        await api.post("/auth/register", { email, password, role });
        alert("Account created. Please login.");
        setIsSignup(false);
      } else {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);

        if (res.data.role === "client") navigate("/client");
        else navigate("/freelancer");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="bg-gray-900 p-8 rounded-xl w-96 shadow-2xl animate-scaleIn">

        <h2 className="text-2xl font-bold text-white text-center mb-6">
          {isSignup ? "Create Account" : "Welcome Back"}
        </h2>

        {error && (
          <p className="bg-red-600/20 text-red-400 p-2 rounded mb-3 text-sm text-center">
            {error}
          </p>
        )}

        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {isSignup && (
          <select
            className="input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="client">Client</option>
            <option value="freelancer">Freelancer</option>
          </select>
        )}

        <button
          onClick={submitHandler}
          disabled={loading}
          className="w-full mt-4 bg-blue-600 hover:bg-blue-700 transition py-2 rounded font-semibold"
        >
          {loading ? "Please wait..." : isSignup ? "Sign Up" : "Login"}
        </button>

        <p
          onClick={() => setIsSignup(!isSignup)}
          className="mt-5 text-center text-gray-400 text-sm cursor-pointer hover:text-white transition"
        >
          {isSignup
            ? "Already have an account? Login"
            : "New here? Create an account"}
        </p>
      </div>
    </div>
  );
}
