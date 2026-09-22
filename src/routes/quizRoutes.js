const express = require('express');
const quizController = require('../controllers/quizController');

const router = express.Router();

router.get('/', quizController.simulador);

module.exports = router;
