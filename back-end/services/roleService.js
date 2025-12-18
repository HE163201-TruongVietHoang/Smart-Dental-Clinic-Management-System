const roleAccess = require("../access/roleAccess");

async function getAllRoles() {
  return await roleAccess.getAllRoles();
}

async function getRoleById(roleId) {
  return await roleAccess.getRoleById(roleId);
}

async function createRole({ roleName }) {
  return await roleAccess.createRole({ roleName });
}

async function updateRole(roleId, { roleName }) {
  return await roleAccess.updateRole(roleId, { roleName });
}

async function deleteRole(roleId) {
  await roleAccess.deleteRole(roleId);
}

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
