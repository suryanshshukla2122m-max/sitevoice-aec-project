const express = require('express');
const router = express.Router();
const { interpretVoice } = require('../controllers/voiceController');
const { validateVoiceInterpretRequest } = require('../middleware/validateRequest');

router.post('/interpret', validateVoiceInterpretRequest, interpretVoice);

module.exports = router;
