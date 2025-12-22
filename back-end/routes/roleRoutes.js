const express = require('express');
const router = express.Router();
const {
  listRolesController,
  getRoleController,
  createRoleController,
  updateRoleController,
  deleteRoleController
} = require('../controllers/roleController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');
// Apply authentication and authorization middleware
router.use(authMiddleware);
router.use(authorizeRoles('Admin'));
// GET /api/roles
router.get('/', listRolesController);
// GET /api/roles/:id
router.get('/:id', getRoleController);
// POST /api/roles
router.post('/', createRoleController);
// PUT /api/roles/:id
router.put('/:id', updateRoleController);
// DELETE /api/roles/:id
router.delete('/:id', deleteRoleController);

module.exports = router;
