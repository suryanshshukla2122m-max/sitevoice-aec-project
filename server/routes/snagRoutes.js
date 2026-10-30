const express = require('express');
const router = express.Router();
const { getSnags, createSnag, updateSnag, deleteSnag } = require('../controllers/snagController');
const { validateSnagCreate } = require('../middleware/validateRequest');

router.get('/', getSnags);
router.post('/', validateSnagCreate, createSnag);
router.patch('/:id', updateSnag);
router.delete('/:id', deleteSnag);

module.exports = router;
