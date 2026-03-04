import { useEffect, useMemo, useState } from "react";
import "../styles/EyeProfile.css";

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

function buildStorageKey(user) {
  const uniqueId = user?.id ?? user?.username ?? user?.email ?? "guest";
  return `eye_profiles_${uniqueId}`;
}

function readProfiles(storageKey) {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

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
    profileName: form.profileName.trim(),
    leftEye: {
      myopia: Number(form.leftMyopia) || 0,
      astigmatism: Number(form.leftAstigmatism) || 0,
      hyperopia: Number(form.leftHyperopia) || 0,
    },
    rightEye: {
      myopia: Number(form.rightMyopia) || 0,
      astigmatism: Number(form.rightAstigmatism) || 0,
      hyperopia: Number(form.rightHyperopia) || 0,
    },
    note: form.note.trim(),
  };
}

export default function EyeProfile() {
  const user = useMemo(() => getCurrentUser(), []);
  const storageKey = useMemo(() => buildStorageKey(user), [user]);
  const [profiles, setProfiles] = useState(() => readProfiles(storageKey));
  const [form, setForm] = useState(() => getEmptyForm());
  const [message, setMessage] = useState("");

  useEffect(() => {
    setProfiles(readProfiles(storageKey));
  }, [storageKey]);

  const isCustomer = user?.role === "CUSTOMER";

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.profileName.trim()) {
      setMessage("Please enter profile name.");
      return;
    }

    const payload = buildEyeProfileFromForm(form);
    const newProfile = {
      id: Date.now(),
      ...payload,
      createdAt: new Date().toISOString(),
    };
    const nextProfiles = [newProfile, ...profiles];
    setMessage("Eye profile saved.");

    setProfiles(nextProfiles);
    localStorage.setItem(storageKey, JSON.stringify(nextProfiles));
    setForm(getEmptyForm());
  };

  const handleDelete = (id) => {
    const nextProfiles = profiles.filter((profile) => profile.id !== id);
    setProfiles(nextProfiles);
    localStorage.setItem(storageKey, JSON.stringify(nextProfiles));
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
            <button type="submit">Save Eye Profile</button>
          </div>
          {message ? <p className="eye-profile-message">{message}</p> : null}
        </form>

        <div className="eye-profile-list">
          <h3>Saved Profiles ({profiles.length})</h3>
          {profiles.length === 0 ? (
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
                    >
                      Delete
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
