export default function StatusStepper({ status }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className={status === "LOCKED" ? "font-bold" : ""}>LOCKED</span>
      →
      <span className={status === "SUBMITTED" ? "font-bold" : ""}>SUBMITTED</span>
      →
      <span className={status === "RELEASED" ? "font-bold" : ""}>RELEASED</span>
    </div>
  );
}
