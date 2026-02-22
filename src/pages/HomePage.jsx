// src/pages/HomePage.jsx

import glassesList from "../data/GlassesList";
import GlassesCard from "../components/glasses/GlassesCard";
import "../styles/Glasses.css";

export default function HomePage() {
  return (
    <div className="glasses-container">
      <h2 className="title">Glasses Collection</h2>

      <div className="glasses-grid">
        {glassesList.map((g) => (
          <GlassesCard key={g.id} glasses={g} />
        ))}
      </div>
    </div>
  );
}
