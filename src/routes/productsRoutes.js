const express = require('express');
const path = require('path');
const multer = require('multer');
const productsController = require('../controllers/productsController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const validations = require('../middlewares/validations');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'public', 'images'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'producto-' + Date.now() + ext);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    req.fileFieldError = 'imageFile';
    validations.imageFilter(req, file, cb);
  }
});
const router = express.Router();

router.get('/', productsController.list);
router.get('/create', adminMiddleware, productsController.create);
router.get('/baja', adminMiddleware, productsController.bajaList);
router.post('/', adminMiddleware, upload.single('imageFile'), validations.product, productsController.store);
router.get('/cart', productsController.cart);
router.get('/checkout', authMiddleware, productsController.checkout);
router.post('/checkout/quote', authMiddleware, productsController.quoteRoute);
router.post('/checkout', authMiddleware, productsController.processCheckout);
router.get('/detail/:id', (req, res) => res.redirect('/products/' + req.params.id));
router.get('/edit/:id', (req, res) => res.redirect('/products/' + req.params.id + '/edit'));
router.get('/:id/edit', adminMiddleware, productsController.edit);
router.put('/:id', adminMiddleware, upload.single('imageFile'), validations.product, productsController.update);
router.delete('/:id', adminMiddleware, productsController.destroy);
router.get('/:id', productsController.detail);

module.exports = router;
