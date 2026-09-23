const express = require('express');
const apiAutoescuelasController = require('../controllers/api/autoescuelasController');
const apiAdminMiddleware = require('../middlewares/apiAdminMiddleware');

const router = express.Router();

router.get('/', apiAutoescuelasController.list);
router.get('/leads', apiAdminMiddleware, apiAutoescuelasController.leads);
router.patch('/leads/:id', apiAdminMiddleware, apiAutoescuelasController.updateLead);

module.exports = router;
