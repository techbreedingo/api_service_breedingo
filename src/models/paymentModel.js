const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['created', 'attempted', 'paid', 'failed'],
        default: 'created'
    },
    paymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    metadata: {
        type: Object
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema);
