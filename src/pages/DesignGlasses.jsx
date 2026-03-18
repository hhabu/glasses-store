import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/DesignGlasses.css";
import { formatVND } from "../utils/currency";
import { useAuth } from "../context/AuthContext";
import ActionToast from "../components/common/ActionToast";
import useActionToast from "../hooks/useActionToast";
import { readCatalogProducts } from "../utils/productCatalog";
import { fetchEyeProfilesByAccount } from "../services/eyeProfileApi";

function readSelectedProductFromStorage() {
  try {
    const stored = JSON.parse(localStorage.getItem("selectedDesignProduct"));
    if (stored && stored.product_id === undefined && stored.id !== undefined) {
      return { ...stored, product_id: stored.id };
    }
    return stored;
  } catch {
    return null;
  }
}

function normalizeCategoryKey(value) {
  return (value || "").toLowerCase().replace(/[\s-]+/g, "_").trim();
}

function getProductId(value) {
  const raw = value?.product_id ?? value?.id;
  return raw === undefined || raw === null ? "" : String(raw);
}

function mapApiProfileToView(item) {
  return {
    id: item?.id ?? "",
    profileName: item?.profile_name ?? "",
    leftEye: {
      myopia: item?.left_eye_SPH ?? "0",
      astigmatism: item?.left_eye_CYL ?? "0",
      hyperopia: item?.left_eye_hyperropia ?? "0",
    },
    rightEye: {
      myopia: item?.right_eye_SPH ?? "0",
      astigmatism: item?.right_eye_CYL ?? "0",
      hyperopia: item?.right_eye_hyperropia ?? "0",
    },
    note: item?.note ?? "",
  };
}

function formatEyeProfileSummary(profile) {
  if (!profile) {
    return "";
  }
  return `L: SPH ${profile.leftEye.myopia}, CYL ${profile.leftEye.astigmatism}, HYP ${profile.leftEye.hyperopia} | R: SPH ${profile.rightEye.myopia}, CYL ${profile.rightEye.astigmatism}, HYP ${profile.rightEye.hyperopia}`;
}

export default function DesignGlasses() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedLensId, setSelectedLensId] = useState("");
  const [selectedEyeProfileId, setSelectedEyeProfileId] = useState("");
  const [lensProducts, setLensProducts] = useState([]);
  const [isLensLoading, setIsLensLoading] = useState(true);
  const [lensLoadError, setLensLoadError] = useState("");
  const [eyeProfiles, setEyeProfiles] = useState([]);
  const [isEyeProfileLoading, setIsEyeProfileLoading] = useState(true);
  const [eyeProfileLoadError, setEyeProfileLoadError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(() =>
    location.state?.selectedProduct || readSelectedProductFromStorage()
  );
  const { toast, showToast } = useActionToast();
  const accountId =
    user?.id === undefined || user?.id === null || user?.id === ""
      ? ""
      : String(user.id);

  const ensureCustomer = () => {
    if (!user) {
      navigate("/login");
      return false;
    }
    if (user.role !== "CUSTOMER") {
      navigate("/");
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (location.state?.selectedProduct) {
      setSelectedProduct(location.state.selectedProduct);
      localStorage.setItem(
        "selectedDesignProduct",
        JSON.stringify(location.state.selectedProduct)
      );
    }
  }, [location.state]);

  useEffect(() => {
    let isMounted = true;
    setIsLensLoading(true);
    setLensLoadError("");

    readCatalogProducts()
      .then((data) => {
        if (!isMounted) {
          return;
        }

        const lensItems = (Array.isArray(data) ? data : []).filter((item) => {
          const categoryKey = normalizeCategoryKey(item?.category);
          return categoryKey === "lens" || categoryKey === "lenses";
        });

        setLensProducts(lensItems);
      })
      .catch(() => {
        if (isMounted) {
          setLensProducts([]);
          setLensLoadError("Failed to load lens products.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLensLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const isCustomer = user?.role === "CUSTOMER";
    if (!isCustomer || !accountId) {
      setEyeProfiles([]);
      setSelectedEyeProfileId("");
      setIsEyeProfileLoading(false);
      setEyeProfileLoadError("");
      return;
    }

    let isMounted = true;
    setIsEyeProfileLoading(true);
    setEyeProfileLoadError("");

    fetchEyeProfilesByAccount(accountId)
      .then((data) => {
        if (!isMounted) {
          return;
        }
        const list = (Array.isArray(data) ? data : []).map((item) =>
          mapApiProfileToView(item)
        );
        setEyeProfiles(list);
      })
      .catch(() => {
        if (isMounted) {
          setEyeProfiles([]);
          setEyeProfileLoadError("Failed to load your eye profiles.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsEyeProfileLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, user?.role]);

  useEffect(() => {
    if (!Array.isArray(lensProducts) || lensProducts.length === 0) {
      setSelectedLensId("");
      return;
    }

    setSelectedLensId((prev) => {
      const hasCurrent = lensProducts.some((item) => getProductId(item) === String(prev));
      if (hasCurrent) {
        return prev;
      }
      return getProductId(lensProducts[0]);
    });
  }, [lensProducts]);

  useEffect(() => {
    if (!Array.isArray(eyeProfiles) || eyeProfiles.length === 0) {
      setSelectedEyeProfileId("");
      return;
    }

    setSelectedEyeProfileId((prev) => {
      const hasCurrent = eyeProfiles.some((item) => String(item.id) === String(prev));
      if (hasCurrent) {
        return prev;
      }
      return String(eyeProfiles[0].id);
    });
  }, [eyeProfiles]);

  const selectedLens = lensProducts.find(
    (lens) => getProductId(lens) === String(selectedLensId)
  );
  const selectedEyeProfile = eyeProfiles.find(
    (profile) => String(profile.id) === String(selectedEyeProfileId)
  );
  const hasFrameForDesignSelected =
    !!selectedProduct &&
    normalizeCategoryKey(selectedProduct?.category) === "frame_for_design";

  const handleRemoveSelectedProduct = () => {
    localStorage.removeItem("selectedDesignProduct");
    setSelectedProduct(null);
  };

  const clearDesignPage = () => {
    localStorage.removeItem("selectedDesignProduct");
    setSelectedProduct(null);
    setSelectedLensId("");
    setSelectedEyeProfileId("");
  };

  const handleAddDesignedToCart = () => {
    if (!hasFrameForDesignSelected || !selectedLens || !selectedEyeProfile) {
      return;
    }

    if (!ensureCustomer()) {
      return;
    }

    const frameId = getProductId(selectedProduct);
    const lensId = getProductId(selectedLens);
    const eyeProfileId = String(selectedEyeProfile.id);
    const framePrice = selectedProduct.pricingView?.finalPrice ?? selectedProduct.price ?? 0;
    const lensPrice = selectedLens.pricingView?.finalPrice ?? selectedLens.price ?? 0;
    const cartItemId = `${frameId}-${lensId}-ep-${eyeProfileId}`;
    const cartItem = {
      id: cartItemId,
      frameId,
      lensId,
      eyeProfileId,
      name: `${selectedProduct.name} + ${selectedLens.name}`,
      brand: selectedProduct.brand,
      color: selectedProduct.color,
      image: selectedProduct.image,
      price: framePrice + lensPrice,
      quantity: 1,
      lensName: selectedLens.name,
      eyeProfileName: selectedEyeProfile.profileName,
      eyeProfileSummary: formatEyeProfileSummary(selectedEyeProfile),
    };

    let currentCart = [];
    try {
      const stored = JSON.parse(localStorage.getItem("cart"));
      currentCart = Array.isArray(stored) ? stored : [];
    } catch {
      currentCart = [];
    }

    const existingIndex = currentCart.findIndex((item) => item.id === cartItemId);
    if (existingIndex >= 0) {
      currentCart[existingIndex].quantity += 1;
    } else {
      currentCart.push(cartItem);
    }

    localStorage.setItem("cart", JSON.stringify(currentCart));
    showToast("Added to cart successfully");
    clearDesignPage();
  };

  return (
    <div className="design-page">
      <div className="design-hero">
        <p className="design-kicker">Studio</p>
        <h1 className="design-title">Design Glasses</h1>
        <p className="design-subtitle">
          Choose a frame and lens type that matches your vision needs.
        </p>
        <div className="design-steps">
          <div className="design-step is-active">Step 1. Choose frame for design</div>
          {hasFrameForDesignSelected ? (
            <>
              <div className="design-step is-active">Step 2. Choose lens</div>
              <div className="design-step is-active">Step 3. Choose your prescription</div>
            </>
          ) : null}
        </div>
      </div>

      <div className="design-section">
        <h3 className="design-section-title">Step 1. Choose frame for design</h3>
        <p className="design-section-note">
          Pick a frame and then select a lens package to build your custom pair.
        </p>
      </div>

      {selectedProduct ? (
        <div className="design-card">
          <img
            src={selectedProduct.image}
            alt={selectedProduct.name}
            className="design-card-image"
          />
          <div className="design-card-info">
            <h3 className="design-card-title">{selectedProduct.name}</h3>
            <p><strong>Brand:</strong> {selectedProduct.brand}</p>
            <p><strong>Color:</strong> {selectedProduct.color}</p>
            <p><strong>Price:</strong> {formatVND(selectedProduct.price)}</p>
            <button className="design-btn design-btn-dark" onClick={handleRemoveSelectedProduct}>
              Remove selected frame
            </button>
          </div>
        </div>
      ) : (
        <div className="design-empty">
          <p className="design-empty-text">
            No product selected yet. Please choose "Design" from a product detail page.
          </p>
          <button
            className="design-btn"
            onClick={() => navigate("/?category=frame_for_design")}
          >
            Go to HomePage to choose frames
          </button>
        </div>
      )}
      {hasFrameForDesignSelected ? (
        <>
          <div className="design-section">
            <h3 className="design-section-title">Step 2. Choose lens</h3>
          </div>

          {isLensLoading ? <p className="design-empty-text">Loading lens products...</p> : null}
          {!isLensLoading && lensLoadError ? (
            <p className="design-empty-text">{lensLoadError}</p>
          ) : null}
          {!isLensLoading && !lensLoadError && lensProducts.length === 0 ? (
            <p className="design-empty-text">No lens products found (category: LENS).</p>
          ) : null}
          {!isLensLoading && !lensLoadError && lensProducts.length > 0 ? (
            <div className="design-lens-product-grid">
              {lensProducts.map((lens) => {
                const lensId = getProductId(lens);
                const isActive = selectedLensId === lensId;
                const lensPrice = lens.pricingView?.finalPrice ?? lens.price ?? 0;
                return (
                  <button
                    key={lensId}
                    onClick={() => setSelectedLensId(lensId)}
                    className={`design-lens-product-card ${isActive ? "is-active" : ""}`}
                  >
                    <div className="design-lens-product-image-wrap">
                      <img
                        src={lens.image}
                        alt={lens.name}
                        className="design-lens-product-image"
                      />
                      {isActive ? (
                        <span className="design-lens-selected-tag">Selected</span>
                      ) : null}
                    </div>
                    <div className="design-lens-product-body">
                      <div className="design-lens-product-meta">
                        <span>{lens.brand || "Lens"}</span>
                        <span>{lens.color || "Clear"}</span>
                      </div>
                      <h4 className="design-lens-product-name">{lens.name}</h4>
                      <p className="design-lens-product-desc">
                        {lens.description || "Lens package from catalog."}
                      </p>
                      <div className="design-lens-product-footer">
                        <span className="design-lens-product-price">
                          + {formatVND(lensPrice)}
                        </span>
                        <span className="design-lens-product-cta">
                          {isActive ? "Selected" : "Select lens"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="design-section">
            <h3 className="design-section-title">Step 3. Choose your prescription</h3>
          </div>

          <div className="design-step3-actions">
            <button
              type="button"
              className="design-btn design-btn-outline"
              onClick={() => navigate("/eye-profile")}
            >
              Create New Eye Profile
            </button>
          </div>

          {isEyeProfileLoading ? (
            <p className="design-empty-text">Loading eye profiles...</p>
          ) : null}
          {!isEyeProfileLoading && eyeProfileLoadError ? (
            <p className="design-empty-text">{eyeProfileLoadError}</p>
          ) : null}
          {!isEyeProfileLoading && !eyeProfileLoadError && eyeProfiles.length === 0 ? (
            <p className="design-empty-text">
              No eye profile found. Please create a new eye profile first.
            </p>
          ) : null}
          {!isEyeProfileLoading && !eyeProfileLoadError && eyeProfiles.length > 0 ? (
            <div className="design-profile-grid">
              {eyeProfiles.map((profile) => {
                const isActive = String(profile.id) === String(selectedEyeProfileId);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    className={`design-profile-card ${isActive ? "is-active" : ""}`}
                    onClick={() => setSelectedEyeProfileId(String(profile.id))}
                  >
                    <h4 className="design-profile-name">{profile.profileName || "Eye Profile"}</h4>
                    <p className="design-profile-detail">
                      <strong>Left:</strong> SPH {profile.leftEye.myopia}, CYL{" "}
                      {profile.leftEye.astigmatism}, HYP {profile.leftEye.hyperopia}
                    </p>
                    <p className="design-profile-detail">
                      <strong>Right:</strong> SPH {profile.rightEye.myopia}, CYL{" "}
                      {profile.rightEye.astigmatism}, HYP {profile.rightEye.hyperopia}
                    </p>
                    {profile.note ? (
                      <p className="design-profile-note">
                        <strong>Note:</strong> {profile.note}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}

          {selectedLens && selectedEyeProfile ? (
            <div className="design-summary">
              <h3 className="design-section-title">Current selection</h3>
              <p>
                {selectedProduct.name} + {selectedLens.name}
              </p>
              <p>Eye Profile: {selectedEyeProfile.profileName}</p>
              <p className="design-summary-eye">{formatEyeProfileSummary(selectedEyeProfile)}</p>
              <p className="design-summary-total">
                Estimated total:{" "}
                {formatVND(
                  (selectedProduct.pricingView?.finalPrice ?? selectedProduct.price ?? 0) +
                    (selectedLens.pricingView?.finalPrice ?? selectedLens.price ?? 0)
                )}
              </p>
              <button className="design-btn" onClick={handleAddDesignedToCart}>
                Add To Cart
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {toast.message ? (
        <ActionToast key={toast.key} message={toast.message} />
      ) : null}
    </div>
  );
}
