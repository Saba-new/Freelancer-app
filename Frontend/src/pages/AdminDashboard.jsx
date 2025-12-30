import Navbar from "../components/Navbar";

export default function AdminDashboard() {
  return (
    <>
      <Navbar />
      <div className="p-4">
        <h2 className="text-xl font-bold">Admin Dashboard</h2>
        <p>Resolve disputes here</p>
      </div>
    </>
  );
}
