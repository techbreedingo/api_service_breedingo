const express = require('express');
const router = express.Router();
const { getPromotions, getPromotionById } = require('../controllers/promotionController');

// Get all promotions
router.get('/', getPromotions);

// Get single promotion by ID
router.get('/:id', getPromotionById);

module.exports = router;
