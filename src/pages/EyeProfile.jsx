import { useEffect, useMemo, useState } from "react";
import "../styles/EyeProfile.css";
import { useAuth } from "../context/AuthContext";
import {
  createEyeProfile,
  deleteEyeProfile,
  fetchEyeProfilesByAccount,
} from "../services/eyeProfileApi";

function getEmptyForm() {
  return {
    profileName: "",
    leftMyopia: "",
    leftAstigmatism: "",
    leftHyperopia: "",
    rightMyopia: "",
    rightAstigmatism: "",
    rightHyperopia: "",
    note: "",
  };
}

function buildEyeProfileFromForm(form) {
  return {
    profile_name: form.profileName.trim(),
    left_eye_SPH: String(form.leftMyopia || "0"),
    left_eye_CYL: String(form.leftAstigmatism || "0"),
    left_eye_hyperropia: String(form.leftHyperopia || "0"),
    right_eye_SPH: String(form.rightMyopia || "0"),
    right_eye_CYL: String(form.rightAstigmatism || "0"),
    right_eye_hyperropia: String(form.rightHyperopia || "0"),
    note: form.note.trim(),
  };
}

function mapApiProfileToView(item) {
  return {
    id: item?.id ?? "",
    accountId: item?.account_id ?? "",
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

export default function EyeProfile() {
  const { user } = useAuth();
  const accountId = useMemo(() => {
    if (user?.id === undefined || user?.id === null || user?.id === "") {
      return "";
    }
    return String(user.id);
  }, [user]);
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState(() => getEmptyForm());
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    const isCustomer = user?.role === "CUSTOMER";
    if (!isCustomer || !accountId) {
      setProfiles([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetchEyeProfilesByAccount(accountId)
      .then((data) => {
        if (!isMounted) {
          return;
        }
        const list = (Array.isArray(data) ? data : []).map((item) =>
          mapApiProfileToView(item)
        );
        setProfiles(list);
      })
      .catch(() => {
        if (isMounted) {
          setProfiles([]);
          setMessage("Failed to load eye profiles.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [accountId, user?.role]);

  const isCustomer = user?.role === "CUSTOMER";

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.profileName.trim()) {
      setMessage("Please enter profile name.");
      return;
    }
    if (!accountId) {
      setMessage("Missing account id. Please re-login.");
      return;
    }

    const payload = {
      account_id: accountId,
      ...buildEyeProfileFromForm(form),
    };

    try {
      setIsSaving(true);
      const created = await createEyeProfile(payload);
      const mapped = mapApiProfileToView(created);
      setProfiles((prev) => [mapped, ...prev]);
      setMessage("Eye profile saved.");
      setForm(getEmptyForm());
    } catch {
      setMessage("Failed to save eye profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const targetId = String(id ?? "");
    if (!targetId) {
      return;
    }

    try {
      setDeletingId(targetId);
      await deleteEyeProfile(targetId);
      setProfiles((prev) => prev.filter((profile) => String(profile.id) !== targetId));
      setMessage("Eye profile deleted.");
    } catch {
      setMessage("Failed to delete eye profile.");
    } finally {
      setDeletingId("");
    }
  };

  if (!isCustomer) {
    return (
      <div className="eye-profile-page">
        <h2>Eye Profile</h2>
        <p>Please login as a customer to manage eye profiles.</p>
      </div>
    );
  }

  return (
    <div className="eye-profile-page">
      <div className="eye-profile-container">
        <h2>Eye Profile</h2>
        <p className="eye-profile-subtitle">
          Save multiple prescriptions for left eye and right eye.
        </p>

        <form className="eye-profile-form" onSubmit={handleSave}>
          <label>Profile name</label>
          <input
            name="profileName"
            value={form.profileName}
            onChange={handleFieldChange}
            placeholder="Example: Daily glasses"
          />

          <div className="eye-grid">
            <div className="eye-column">
              <h4>Left Eye</h4>
              <label>Myopia (SPH)</label>
              <input
                type="number"
                step="0.25"
                name="leftMyopia"
                value={form.leftMyopia}
                onChange={handleFieldChange}
              />
              <label>Astigmatism (CYL)</label>
              <input
                type="number"
                step="0.25"
                name="leftAstigmatism"
                value={form.leftAstigmatism}
                onChange={handleFieldChange}
              />
              <label>Hyperopia (SPH+)</label>
              <input
                type="number"
                step="0.25"
                name="leftHyperopia"
                value={form.leftHyperopia}
                onChange={handleFieldChange}
              />
            </div>

            <div className="eye-column">
              <h4>Right Eye</h4>
              <label>Myopia (SPH)</label>
              <input
                type="number"
                step="0.25"
                name="rightMyopia"
                value={form.rightMyopia}
                onChange={handleFieldChange}
              />
              <label>Astigmatism (CYL)</label>
              <input
                type="number"
                step="0.25"
                name="rightAstigmatism"
                value={form.rightAstigmatism}
                onChange={handleFieldChange}
              />
              <label>Hyperopia (SPH+)</label>
              <input
                type="number"
                step="0.25"
                name="rightHyperopia"
                value={form.rightHyperopia}
                onChange={handleFieldChange}
              />
            </div>
          </div>

          <label>Note</label>
          <textarea
            name="note"
            rows="3"
            value={form.note}
            onChange={handleFieldChange}
            placeholder="Optional notes"
          />

          <div className="eye-form-actions">
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Eye Profile"}
            </button>
          </div>
          {message ? <p className="eye-profile-message">{message}</p> : null}
        </form>

        <div className="eye-profile-list">
          <h3>Saved Profiles ({profiles.length})</h3>
          {isLoading ? (
            <p>Loading eye profiles...</p>
          ) : profiles.length === 0 ? (
            <p>No eye profile yet.</p>
          ) : (
            profiles.map((profile) => (
              <div className="eye-profile-card" key={profile.id}>
                <div className="eye-profile-card-head">
                  <h4>{profile.profileName}</h4>
                  <div className="eye-card-actions">
                    <button
                      type="button"
                      className="eye-delete-btn"
                      onClick={() => handleDelete(profile.id)}
                      disabled={deletingId === String(profile.id)}
                    >
                      {deletingId === String(profile.id) ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                <p>
                  <strong>Left:</strong> Myopia {profile.leftEye.myopia}, Astigmatism{" "}
                  {profile.leftEye.astigmatism}, Hyperopia {profile.leftEye.hyperopia}
                </p>
                <p>
                  <strong>Right:</strong> Myopia {profile.rightEye.myopia}, Astigmatism{" "}
                  {profile.rightEye.astigmatism}, Hyperopia {profile.rightEye.hyperopia}
                </p>
                {profile.note ? (
                  <p>
                    <strong>Note:</strong> {profile.note}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
