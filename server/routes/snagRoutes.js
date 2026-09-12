const express = require('express');
const router = express.Router();
const { getSnags, createSnag } = require('../controllers/snagController');
const { validateSnagCreate } = require('../middleware/validateRequest');

router.get('/', getSnags);
router.post('/', validateSnagCreate, createSnag);

module.exports = router;
