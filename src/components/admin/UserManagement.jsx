// components/admin/UserManagement.jsx
import { useState, useEffect } from "react";
import { createUser, readUsers, updateUser } from "../../services/userService";
import "../../styles/AdminUsers.css";
import { DEFAULT_AVATAR_URL } from "../../constants/avatar";

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
    let isMounted = true;
    readUsers()
      .then((list) => {
        if (isMounted) {
          setUsers(list);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUsers([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* ================= FILTER ================= */
  const filteredUsers =
    userFilter === "CUSTOMER"
      ? users.filter((u) => u.role === "CUSTOMER")
      : users.filter(
          (u) => u.role === "SALES" || u.role === "OPERATION"
        );

  /* ================= CREATE STAFF ================= */
  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.name) {
      alert("Please fill all required fields");
      return;
    }

    const newAccount = {
      id: Date.now(),
      ...newUser,
      createdAt: new Date().toISOString().split("T")[0],
    };

    const isDuplicateUsername = users.some(
      (u) => u.username.toLowerCase() === newUser.username.trim().toLowerCase()
    );
    if (isDuplicateUsername) {
      alert("Username already exists");
      return;
    }

    try {
      const created = await createUser(newAccount);
      setUsers((prev) => [created, ...prev]);
    } catch {
      alert("Failed to create account. Please try again.");
      return;
    }

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
  const handleChangeStatus = async (id, status) => {
    const updatedUsers = users.map((u) =>
      u.id === id ? { ...u, status } : u
    );

    setUsers(updatedUsers);
    const target = updatedUsers.find((u) => u.id === id);
    if (!target) {
      return;
    }

    try {
      await updateUser(target);
    } catch {
      alert("Failed to update status. Please try again.");
    }
  };


  return (
    <>
      <h2>User & Staff Management</h2>

      {/* FILTER BUTTONS */}
      <div className="admin-users-toolbar">
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
            className="admin-users-create"
            onClick={() => setShowModal(true)}
          >
            + Create Account
          </button>
        )}
      </div>

      {/* USER TABLE */}
      <table className="admin-users-table">
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
                  src={u.avatar || DEFAULT_AVATAR_URL}
                  alt={u.username}
                  width="40"
                  style={{ borderRadius: "50%" }}
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_AVATAR_URL;
                  }}
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

              <td>{u.createdAt || u.createDate || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ================= MODAL ================= */}
      {showModal && (
        <div className="admin-users-overlay">
          <div className="admin-users-modal">
            <h3>Create Staff Account</h3>

            <input
              type="text"
              placeholder="Username"
              value={newUser.username}
              onChange={(e) =>
                setNewUser({ ...newUser, username: e.target.value })
              }
              className="admin-users-input"
            />

            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              className="admin-users-input"
            />

            <input
              type="text"
              placeholder="Full Name"
              value={newUser.name}
              onChange={(e) =>
                setNewUser({ ...newUser, name: e.target.value })
              }
              className="admin-users-input"
            />

            <select
              value={newUser.role}
              onChange={(e) =>
                setNewUser({ ...newUser, role: e.target.value })
              }
              className="admin-users-input"
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
              className="admin-users-input"
            />

            <div className="admin-users-actions">
              <button
                onClick={handleCreateUser}
                className="admin-users-primary"
              >
                Save
              </button>

              <button className="admin-users-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

