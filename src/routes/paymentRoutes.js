const express = require('express');
const router = express.Router();
const { createOrder, verifyPayment, getPaymentStatus } = require('../controllers/paymentController');

// Create a new order
router.post('/create-order', createOrder);

// Verify payment after success
router.post('/verify', verifyPayment);

// Get payment status
router.get('/status/:orderId', getPaymentStatus);

module.exports = router;
