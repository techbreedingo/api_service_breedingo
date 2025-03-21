const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/paymentModel');
const UserCoin = require('../models/userCoin');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

exports.createOrder = async (req, res) => {
    console.log(req.body,req.user);
    try {
        const { amount, currency = 'INR', metadata } = req.body;
        const userId = req.user.userId; // From auth middleware

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);
        
        // Save order details in our database
        const payment = new Payment({
            orderId: order.id,
            userId,
            amount,
            currency,
            status: 'created',
            metadata
        });
        await payment.save();

        res.json({
            success: true,
            order,
            key_id: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating order',
            error: error.message
        });
    }
};

exports.verifyPayment = async (req, res) => {
    const userId = req.user.userId;
    //console.log(razorpay_order_id);
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Update payment status in database
        const payment = await Payment.findOneAndUpdate(
            { orderId: razorpay_order_id },
            {
                $set: {
                    status: 'paid',
                    paymentId: razorpay_payment_id,
                    razorpaySignature: razorpay_signature
                }
            }
        );

        res.json({
            success: true,
            message: 'Payment verified successfully'
        });

        const userCoin = await UserCoin.findOne({ userId });
        userCoin.totalCoin +=payment.amount;
        await userCoin.save();

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payment = await Payment.findOne({ orderId });
        
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        res.json({
            success: true,
            payment
        });
    } catch (error) {
        console.error('Error fetching payment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment',
            error: error.message
        });
    }
};
