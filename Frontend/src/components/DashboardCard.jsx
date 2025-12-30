export default function DashboardCard({ title, value, status }) {
  return (
    <div
      className="page-animate p-6 rounded-xl bg-white dark:bg-gray-800
      shadow hover:shadow-xl hover:-translate-y-1
      transition-all duration-300"
    >
      <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>

      <p className="text-2xl font-bold mt-2 text-gray-800 dark:text-white">
        {value}
      </p>

      <span
        className={`inline-block mt-3 px-3 py-1 text-xs rounded-full
        ${
          status === "ACTIVE"
            ? "bg-green-100 text-green-700"
            : "bg-yellow-100 text-yellow-700"
        }`}
      >
        {status}
      </span>
    </div>
  );
}
