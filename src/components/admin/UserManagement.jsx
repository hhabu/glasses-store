// components/admin/UserManagement.jsx
import { useState, useEffect } from "react";
import mockUsers from "../../data/mockUsers";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("CUSTOMER");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "SALES",
    avatar: "",
  });

  /* ================= LOAD USERS ================= */
  useEffect(() => {
    const stored = localStorage.getItem("admin_users");
    if (stored) {
      setUsers(JSON.parse(stored));
    } else {
      setUsers(mockUsers);
      localStorage.setItem("admin_users", JSON.stringify(mockUsers));
    }
  }, []);

  /* ================= FILTER ================= */
  const filteredUsers =
    userFilter === "CUSTOMER"
      ? users.filter((u) => u.role === "CUSTOMER")
      : users.filter(
          (u) => u.role === "SALES" || u.role === "OPERATION"
        );

  /* ================= CREATE STAFF ================= */
  const handleCreateUser = () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      alert("Please fill all required fields");
      return;
    }

    const newAccount = {
      id: Date.now(),
      ...newUser,
      status: "ACTIVE",
      createDate: new Date().toISOString().split("T")[0],
    };

    const updatedList = [...users, newAccount];

    setUsers(updatedList);
    localStorage.setItem("admin_users", JSON.stringify(updatedList));

    setShowModal(false);
    setNewUser({
      username: "",
      password: "",
      name: "",
      role: "SALES",
      avatar: "",
    });
  };

  /* ================= UPDATE STATUS ================= */
  const handleChangeStatus = (id, status) => {
    const updatedUsers = users.map((u) =>
      u.id === id ? { ...u, status } : u
    );

    setUsers(updatedUsers);
    localStorage.setItem(
      "admin_users",
      JSON.stringify(updatedUsers)
    );
  };

  return (
    <>
      <h2>User & Staff Management</h2>

      {/* FILTER BUTTONS */}
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setUserFilter("CUSTOMER")}
          className={userFilter === "CUSTOMER" ? "active" : ""}
        >
          Customers
        </button>

        <button
          onClick={() => setUserFilter("STAFF")}
          className={userFilter === "STAFF" ? "active" : ""}
          style={{ marginLeft: "10px" }}
        >
          Staff
        </button>

        {/* CREATE STAFF BUTTON */}
        {userFilter === "STAFF" && (
          <button
            style={{
              marginLeft: "20px",
              background: "var(--pink-primary)",
              color: "#fff",
            }}
            onClick={() => setShowModal(true)}
          >
            + Create Account
          </button>
        )}
      </div>

      {/* USER TABLE */}
      <table width="100%" cellPadding="10" border="1">
        <thead>
          <tr>
            <th>Avatar</th>
            <th>Username</th>
            <th>Name</th>
            <th>Role</th>
            {userFilter === "CUSTOMER" && <th>Status</th>}
            <th>Create Date</th>
          </tr>
        </thead>

        <tbody>
          {filteredUsers.map((u) => (
            <tr key={u.id}>
              <td>
                <img
                  src={u.avatar}
                  alt={u.username}
                  width="40"
                  style={{ borderRadius: "50%" }}
                />
              </td>

              <td>{u.username}</td>
              <td>{u.name}</td>
              <td>{u.role}</td>

              {/* STATUS ONLY FOR CUSTOMER */}
              {userFilter === "CUSTOMER" && (
                <td>
                  <select
                    value={u.status || "ACTIVE"}
                    onChange={(e) =>
                      handleChangeStatus(u.id, e.target.value)
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </td>
              )}

              <td>{u.createDate}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h3>Create Staff Account</h3>

            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Full Name"
              value={newUser.name}
              onChange={(e) =>
                setNewUser({ ...newUser, name: e.target.value })
              }
              style={inputStyle}
            />

            <select
              value={newUser.role}
              onChange={(e) =>
                setNewUser({ ...newUser, role: e.target.value })
              }
              style={inputStyle}
            >
              <option value="SALES">Sales</option>
              <option value="OPERATION">Operation</option>
            </select>

            <input
              type="text"
              placeholder="Avatar URL (optional)"
              value={newUser.avatar}
              onChange={(e) =>
                setNewUser({ ...newUser, avatar: e.target.value })
              }
              style={inputStyle}
            />

            <div style={{ marginTop: "15px" }}>
              <button
                onClick={handleCreateUser}
                style={{ marginRight: "10px" }}
              >
                Save
              </button>

              <button onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ================= SIMPLE STYLES ================= */
const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalStyle = {
  background: "#fff",
  padding: "20px",
  borderRadius: "8px",
  width: "300px",
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  marginTop: "10px",
};
