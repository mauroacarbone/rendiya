const express = require('express');
const autoescuelasController = require('../controllers/autoescuelasController');
const validations = require('../middlewares/validations');

const router = express.Router();

router.get('/', autoescuelasController.index);
router.post('/', validations.autoescuelaLead, autoescuelasController.registerLead);

module.exports = router;
