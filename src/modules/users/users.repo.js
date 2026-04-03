async function getByFirebaseUid(firebaseUid) {
  return {
    firebase_uid: firebaseUid,
    role: "student",
    priority_level: 4,
  };
}

async function updateRole(id, role) {
  return {
    user_id: Number(id),
    role,
    updated: true,
  };
}

async function deactivate(id) {
  return {
    user_id: Number(id),
    is_active: false,
  };
}

module.exports = {
  getByFirebaseUid,
  updateRole,
  deactivate,
};
