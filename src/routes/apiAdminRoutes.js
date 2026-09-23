const express = require('express');
const apiAutoescuelasController = require('../controllers/api/autoescuelasController');
const apiAdminMiddleware = require('../middlewares/apiAdminMiddleware');

const router = express.Router();

router.use(apiAdminMiddleware);
router.get('/leads', apiAutoescuelasController.leads);
router.patch('/leads/:id/status', apiAutoescuelasController.updateLead);

module.exports = router;
