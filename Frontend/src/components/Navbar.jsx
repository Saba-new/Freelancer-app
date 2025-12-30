import { useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { logout } from "../utils/auth";

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1️⃣ Remove token
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    // 2️⃣ Redirect to login
    navigate("/");
  };
  


  return (
    <nav className="flex justify-between items-center px-6 py-4
      bg-white dark:bg-gray-900
      border-b dark:border-gray-700">

      <h1 className="font-bold text-lg text-gray-800 dark:text-white">
        Freelancer App
      </h1>

      <div className="flex gap-4 items-center">
        <ThemeToggle />

        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm rounded-lg
          bg-red-500 text-white hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
