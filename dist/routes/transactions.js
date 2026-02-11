"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const Transaction_1 = __importDefault(require("../models/Transaction"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get user's transactions
router.get('/', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { type, status, page = 1, limit = 20 } = req.query;
        const filter = { user: req.user._id };
        if (type) {
            filter.type = type;
        }
        if (status) {
            filter.status = status;
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [transactions, total] = await Promise.all([
            Transaction_1.default.find(filter)
                .populate('game', 'type stake')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Transaction_1.default.countDocuments(filter),
        ]);
        res.json({
            transactions,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// Record a deposit (after on-chain confirmation)
router.post('/deposit', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { amount, txHash } = req.body;
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }
        if (!txHash) {
            res.status(400).json({ error: 'Transaction hash required' });
            return;
        }
        // Check if transaction already recorded
        const existingTx = await Transaction_1.default.findOne({ txHash });
        if (existingTx) {
            res.status(409).json({ error: 'Transaction already recorded' });
            return;
        }
        // Create transaction record
        const transaction = new Transaction_1.default({
            user: req.user._id,
            type: 'deposit',
            amount: Number(amount),
            txHash,
            status: 'completed',
            completedAt: new Date(),
        });
        await transaction.save();
        // Update user balance
        req.user.balance += Number(amount);
        await req.user.save();
        res.status(201).json({
            transaction,
            newBalance: req.user.balance,
        });
    }
    catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ error: 'Failed to process deposit' });
    }
});
// Request a withdrawal
router.post('/withdraw', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { amount } = req.body;
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'Invalid amount' });
            return;
        }
        if (req.user.balance < amount) {
            res.status(400).json({ error: 'Insufficient balance' });
            return;
        }
        // Deduct from balance immediately
        req.user.balance -= Number(amount);
        await req.user.save();
        // Create pending withdrawal transaction
        const transaction = new Transaction_1.default({
            user: req.user._id,
            type: 'withdraw',
            amount: Number(amount),
            status: 'pending',
        });
        await transaction.save();
        // In production, this would trigger the backend to process the withdrawal
        // via smart contract interaction
        res.status(201).json({
            transaction,
            newBalance: req.user.balance,
            message: 'Withdrawal request submitted',
        });
    }
    catch (error) {
        console.error('Withdraw error:', error);
        res.status(500).json({ error: 'Failed to process withdrawal' });
    }
});
// Get user balance
router.get('/balance', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        res.json({ balance: req.user.balance });
    }
    catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});
exports.default = router;
//# sourceMappingURL=transactions.js.map