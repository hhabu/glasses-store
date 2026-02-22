// src/pages/HomePage.jsx

import glassesList from "../data/GlassesList";
import GlassesCard from "../components/glasses/GlassesCard";
import "../styles/Glasses.css";

export default function HomePage() {
  const handleAddToCart = (glasses) => {
    const cartItem = {
      id: glasses.id,
      name: glasses.name,
      brand: glasses.brand,
      color: glasses.color,
      image: glasses.image,
      price: glasses.price,
      quantity: 1,
    };

    const currentCart = JSON.parse(localStorage.getItem("cart")) || [];
    const existingIndex = currentCart.findIndex((item) => item.id === glasses.id);

    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
  };

  return (
    <div className="glasses-container">
      <h2 className="title">Glasses Collection</h2>

      <div className="glasses-grid">
        {glassesList.map((g) => (
          <GlassesCard key={g.id} glasses={g} onAddToCart={handleAddToCart} />
        ))}
      </div>
    </div>
  );
}
