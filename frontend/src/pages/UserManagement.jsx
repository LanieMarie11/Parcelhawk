import { useEffect, useState } from "react";
import axios from "axios";
import { DataGrid } from "@mui/x-data-grid";
import { Button, Form, Modal } from "react-bootstrap";

function UserManagement() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    role: "",
  });
  const [editForm, setEditForm] = useState(null);
  const [deleteUser, setDeleteUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const columns = [
    { field: "firstName", headerName: "First Name", flex: 1 },
    { field: "lastName", headerName: "Last Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1.5 },
    { field: "mobile", headerName: "Mobile", flex: 1 },
    { field: "role", headerName: "Role", flex: 0.75 },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={() => openEditModal(params.row)}>
            Edit
          </Button>
          <Button variant="outline-danger" size="sm" onClick={() => openDeleteModal(params.row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    axios.get("/api/userManagement/getUsers").then((res) => {
      setRows(res.data.map((u, i) => ({ ...u, id: u.id || i })));
    });
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleEditChange = (e) =>
    setEditForm({ ...editForm, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post("/api/userManagement/addUser", form);
    setForm({ firstName: "", lastName: "", email: "", mobile: "", role: "" });
    fetchUsers();
    setShowModal(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    await axios.put(`/api/userManagement/updateUser/${editForm.id}`, editForm);
    setEditForm(null);
    fetchUsers();
    setShowEditModal(false);
  };

  const openEditModal = (user) => {
    setEditForm({ ...user });
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setDeleteUser(user);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    await axios.delete(`/api/userManagement/deleteUser/${deleteUser.id}`);
    setShowDeleteModal(false);
    setDeleteUser(null);
    fetchUsers();
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>User Management</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          Add User
        </Button>
      </div>
      <DataGrid rows={rows} columns={columns} pageSize={5} />

      {/* Add User Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add User</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>First Name</Form.Label>
              <Form.Control
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Mobile</Form.Label>
              <Form.Control
                name="mobile"
                value={form.mobile}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Role</Form.Label>
              <Form.Select name="role" value={form.role} onChange={handleChange} required>
                <option value="">Select Role</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add User
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        {editForm && (
          <Form onSubmit={handleEditSubmit}>
            <Modal.Body>
              <Form.Group className="mb-2">
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  name="firstName"
                  value={editForm.firstName}
                  onChange={handleEditChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  name="lastName"
                  value={editForm.lastName}
                  onChange={handleEditChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Mobile</Form.Label>
                <Form.Control
                  name="mobile"
                  value={editForm.mobile}
                  onChange={handleEditChange}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-2">
                <Form.Label>Role</Form.Label>
                <Form.Select name="role" value={editForm.role} onChange={handleEditChange} required>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </Form.Select>
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Update User
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Delete User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete user{" "}
          <b>
            {deleteUser?.firstName} {deleteUser?.lastName}
          </b>
          ?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default UserManagement;
