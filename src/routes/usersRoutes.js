const express = require('express');
const path = require('path');
const multer = require('multer');
const usersController = require('../controllers/usersController');
const guestMiddleware = require('../middlewares/guestMiddleware');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const validations = require('../middlewares/validations');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'images', 'users'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, 'user-' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    req.fileFieldError = 'image';
    validations.imageFilter(req, file, cb);
  }
});
const router = express.Router();

router.get('/login', guestMiddleware, usersController.login);
router.post('/login', guestMiddleware, validations.login, usersController.processLogin);
router.get('/register', guestMiddleware, usersController.register);
router.post('/register', guestMiddleware, upload.single('image'), validations.register, usersController.processRegister);
router.get('/profile', authMiddleware, usersController.profile);
router.get('/reservations', authMiddleware, usersController.reservations);
router.get('/reservations/:id/voucher', usersController.reservationVoucher);
router.post('/reservations/:id/confirm', authMiddleware, usersController.confirmReservation);
router.post('/reservations/:id/cancel', authMiddleware, usersController.cancelReservation);
router.get('/logout', authMiddleware, usersController.logout);
router.get('/', adminMiddleware, usersController.list);
router.get('/:id/edit', authMiddleware, usersController.edit);
router.put('/:id', authMiddleware, upload.single('image'), validations.profile, usersController.update);
router.get('/:id', authMiddleware, usersController.detail);

module.exports = router;
