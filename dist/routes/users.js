"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const User_1 = __importDefault(require("../models/User"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
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
// Get user profile
router.get('/profile', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        res.json({
            user: {
                id: req.user._id,
                walletAddress: req.user.walletAddress,
                email: req.user.email,
                name: req.user.name,
                balance: req.user.balance,
                isAdmin: req.user.isAdmin,
                authProvider: req.user.authProvider,
                createdAt: req.user.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});
// Update user name
router.patch('/name', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { name } = req.body;
        if (!name || name.length < 3 || name.length > 30) {
            res.status(400).json({ error: 'Name must be 3-30 characters' });
            return;
        }
        // Check if name already taken
        const existingUser = await User_1.default.findOne({ name, _id: { $ne: req.user._id } });
        if (existingUser) {
            res.status(409).json({ error: 'Name already taken' });
            return;
        }
        req.user.name = name;
        await req.user.save();
        res.json({
            message: 'Name updated successfully',
            name: req.user.name,
        });
    }
    catch (error) {
        console.error('Update name error:', error);
        res.status(500).json({ error: 'Failed to update name' });
    }
});
// Get public user info by ID
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User_1.default.findById(userId).select('name createdAt');
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        res.json({
            user: {
                id: user._id,
                name: user.name,
                createdAt: user.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map