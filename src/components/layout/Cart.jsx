import { useNavigate } from "react-router-dom";

export default function Cart() {
  const navigate = useNavigate();

  return (
    <button className="btn cart" onClick={() => navigate("/cart")}>
      Cart
    </button>
  );
}
