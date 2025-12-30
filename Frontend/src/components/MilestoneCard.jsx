export default function MilestoneCard({ title, amount, status }) {
  return (
    <div className="bg-white p-4 rounded shadow mb-3">
      <h3 className="font-semibold">{title}</h3>
      <p>₹{amount}</p>
      <span className="text-sm text-blue-600">{status}</span>
    </div>
  );
}
