import { useState, useEffect } from "react";
import "../styles/CustomerProfile.css";
import { updateUser } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import { DEFAULT_AVATAR_URL } from "../constants/avatar";

export default function CustomerProfile() {
  const { user: sessionUser, setUser: setSessionUser } = useAuth();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (sessionUser) {
      setUser(sessionUser);
    }
  }, [sessionUser]);

  const handleSave = async () => {
    try {
      const updated = await updateUser(user);
      setSessionUser(updated);
      setUser(updated);
      setEditMode(false);
      alert("Profile updated!");
    } catch {
      alert("Failed to update profile. Please try again.");
    }
  };

  if (!user) return <h2 className="profile-empty">No user data</h2>;

  return (
    <div className="customer-profile-page">
      <div className="customer-profile-container">
        <h2 className="profile-title">Customer Profile</h2>

        <div className="profile-card">
        {/* AVATAR */}
          <div className="profile-avatar-wrap">
          <img
            src={user.avatar || DEFAULT_AVATAR_URL}
            alt="avatar"
            width="120"
            height="120"
            className="profile-avatar-img"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_AVATAR_URL;
            }}
          />
        </div>

          <label className="profile-label">Username</label>
          <input
            value={user.username}
            disabled
            className="profile-input profile-input-readonly"
          />

          <label className="profile-label">Full Name</label>
          <input
            value={user.name || ""}
            disabled={!editMode}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
            className={`profile-input ${!editMode ? "profile-input-readonly" : ""}`}
          />

          <label className="profile-label">Email</label>
          <input
            value={user.email || ""}
            disabled={!editMode}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            className={`profile-input ${!editMode ? "profile-input-readonly" : ""}`}
          />

          <label className="profile-label">Phone</label>
          <input
            value={user.phone || ""}
            disabled={!editMode}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
            className={`profile-input ${!editMode ? "profile-input-readonly" : ""}`}
          />

          <label className="profile-label">Address</label>
          <input
            value={user.address || ""}
            disabled={!editMode}
            onChange={(e) => setUser({ ...user, address: e.target.value })}
            className={`profile-input ${!editMode ? "profile-input-readonly" : ""}`}
          />

          <label className="profile-label">Status</label>
          <input
            value={user.status}
            disabled
            className="profile-input profile-input-readonly"
          />

          <div className="profile-actions">
            {!editMode ? (
              <button className="profile-btn profile-btn-primary" onClick={() => setEditMode(true)}>
                Edit Profile
              </button>
            ) : (
              <>
                <button className="profile-btn profile-btn-primary" onClick={handleSave}>
                Save
                </button>
                <button className="profile-btn profile-btn-secondary" onClick={() => setEditMode(false)}>
                Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
