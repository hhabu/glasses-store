import { useState, useEffect } from "react";

export default function CustomerProfile() {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem("user"));
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  const handleSave = () => {
    // update current login user
    localStorage.setItem("user", JSON.stringify(user));

    // update admin_users list
    const users = JSON.parse(localStorage.getItem("admin_users")) || [];
    const updatedUsers = users.map((u) =>
      u.id === user.id ? user : u
    );

    localStorage.setItem("admin_users", JSON.stringify(updatedUsers));

    setEditMode(false);
    alert("Profile updated!");
  };

  if (!user) return <h2>No user data</h2>;

  return (
    <div style={{ padding: "40px" }}>
      <h2>Customer Profile</h2>

      <div style={cardStyle}>
        {/* AVATAR */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src={user.avatar}
            alt="avatar"
            width="120"
            height="120"
            style={{ borderRadius: "50%" }}
          />
        </div>

        <label>Username</label>
        <input value={user.username} disabled style={inputStyle} />

        <label>Full Name</label>
        <input
          value={user.name || ""}
          disabled={!editMode}
          onChange={(e) =>
            setUser({ ...user, name: e.target.value })
          }
          style={inputStyle}
        />

        <label>Email</label>
        <input
          value={user.email || ""}
          disabled={!editMode}
          onChange={(e) =>
            setUser({ ...user, email: e.target.value })
          }
          style={inputStyle}
        />

        <label>Phone</label>
        <input
          value={user.phone || ""}
          disabled={!editMode}
          onChange={(e) =>
            setUser({ ...user, phone: e.target.value })
          }
          style={inputStyle}
        />

        <label>Address</label>
        <input
          value={user.address || ""}
          disabled={!editMode}
          onChange={(e) =>
            setUser({ ...user, address: e.target.value })
          }
          style={inputStyle}
        />

        <label>Status</label>
        <input value={user.status} disabled style={inputStyle} />

        <div style={{ marginTop: "20px" }}>
          {!editMode ? (
            <button onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          ) : (
            <>
              <button onClick={handleSave} style={{ marginRight: "10px" }}>
                Save
              </button>
              <button onClick={() => setEditMode(false)}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  marginTop: "20px",
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  maxWidth: "500px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  marginTop: "5px",
  marginBottom: "15px",
};
