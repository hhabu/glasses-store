import { useNavigate } from "react-router-dom";

export default function Cart() {
  const navigate = useNavigate();

  return (
    <button
      className="btn cart-icon-btn"
      onClick={() => navigate("/cart")}
      aria-label="Go to cart"
      title="Cart"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M1 1h4l2.68 11.39a2 2 0 0 0 1.95 1.61h7.72a2 2 0 0 0 1.95-1.61L23 6H6" />
      </svg>
    </button>
  );
}
