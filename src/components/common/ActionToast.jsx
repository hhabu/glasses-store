import "../../styles/ActionToast.css";

export default function ActionToast({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="action-toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
