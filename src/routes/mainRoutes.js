const express = require('express');
const router = express.Router();
const mainController = require('../controllers/mainController');
const productsController = require('../controllers/productsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', mainController.home);
router.get('/reservar', authMiddleware, productsController.startReservation);

module.exports = router;
