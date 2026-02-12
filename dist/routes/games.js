"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongoose_1 = __importDefault(require("mongoose"));
const Game_1 = __importDefault(require("../models/Game"));
const AdminSettings_1 = __importDefault(require("../models/AdminSettings"));
const auth_1 = require("../middleware/auth");
const validation_1 = require("../utils/validation");
const gameLogic_1 = require("../services/gameLogic");
const router = (0, express_1.Router)();
// Get all available games (waiting status)
router.get('/', async (req, res) => {
    try {
        const { status, type, minStake, maxStake, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status) {
            filter.status = status;
        }
        else {
            filter.status = 'waiting';
        }
        if (type && ['short', 'long'].includes(type)) {
            filter.type = type;
        }
        if (!filter.private) {
            filter.private = false;
        }
        if (minStake || maxStake) {
            filter.stake = {};
            if (minStake)
                filter.stake.$gte = Number(minStake);
            if (maxStake)
                filter.stake.$lte = Number(maxStake);
        }
        const skip = (Number(page) - 1) * Number(limit);
        const [games, total] = await Promise.all([
            Game_1.default.find(filter)
                .populate('player1', 'name walletAddress')
                .populate('player2', 'name walletAddress')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Game_1.default.countDocuments(filter),
        ]);
        res.json({
            games,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});
// Get single game
router.get('/:id', async (req, res) => {
    try {
        const id = String(req.params.id);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: 'Invalid game ID' });
            return;
        }
        const game = await Game_1.default.findById(id)
            .populate('player1', 'name walletAddress')
            .populate('player2', 'name walletAddress')
            .populate('winner', 'name walletAddress');
        if (!game) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        res.json({ game });
    }
    catch (error) {
        console.error('Get game error:', error);
        res.status(500).json({ error: 'Failed to fetch game' });
    }
});
// Create a new game
router.post('/', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { type, stake, private: isPrivate } = req.body;
        if (!['short', 'long'].includes(type)) {
            res.status(400).json({ error: 'Invalid game type. Must be "short" or "long"' });
            return;
        }
        if (!(0, validation_1.isValidStake)(Number(stake))) {
            res.status(400).json({ error: 'Invalid stake. Minimum is 1 USDT' });
            return;
        }
        // Balance is checked on blockchain via smart contract
        // No need to check MongoDB balance
        // Initialize board state
        const boardState = (0, gameLogic_1.initializeBoard)(type);
        // Create game
        const game = new Game_1.default({
            type,
            stake: Number(stake),
            player1: req.user._id,
            private: !!isPrivate,
            inviteCode: isPrivate ? (0, validation_1.generateInviteCode)() : undefined,
            boardState,
        });
        await game.save();
        // Populate player data
        await game.populate('player1', 'name walletAddress');
        res.status(201).json({ game });
    }
    catch (error) {
        console.error('Create game error:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
});
// Join a game
router.post('/:id/join', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const id = String(req.params.id);
        const { inviteCode } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: 'Invalid game ID' });
            return;
        }
        const game = await Game_1.default.findById(id);
        if (!game) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        if (game.status !== 'waiting') {
            res.status(400).json({ error: 'Game is not available for joining' });
            return;
        }
        if (game.player1.toString() === req.user._id.toString()) {
            res.status(400).json({ error: 'Cannot join your own game' });
            return;
        }
        if (game.private && game.inviteCode !== inviteCode) {
            res.status(403).json({ error: 'Invalid invite code' });
            return;
        }
        // Balance is checked on blockchain via smart contract
        // No need to check MongoDB balance
        // Update game
        game.player2 = req.user._id;
        game.status = 'active';
        game.startedAt = new Date();
        await game.save();
        // Update admin stats
        const settings = await AdminSettings_1.default.findOne() || await AdminSettings_1.default.create({});
        settings.totalGames += 1;
        settings.totalVolume += game.stake * 2;
        await settings.save();
        // Populate player data
        await game.populate('player1', 'name walletAddress');
        await game.populate('player2', 'name walletAddress');
        res.json({ game });
    }
    catch (error) {
        console.error('Join game error:', error);
        res.status(500).json({ error: 'Failed to join game' });
    }
});
// Cancel a game (only creator, only if not started)
router.post('/:id/cancel', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const id = String(req.params.id);
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: 'Invalid game ID' });
            return;
        }
        const game = await Game_1.default.findById(id);
        if (!game) {
            res.status(404).json({ error: 'Game not found' });
            return;
        }
        if (game.player1.toString() !== req.user._id.toString()) {
            res.status(403).json({ error: 'Only the game creator can cancel' });
            return;
        }
        if (game.status !== 'waiting') {
            res.status(400).json({ error: 'Cannot cancel a game that has already started' });
            return;
        }
        // Refund handled by smart contract
        // Update game status
        game.status = 'cancelled';
        await game.save();
        res.json({ message: 'Game cancelled successfully', game });
    }
    catch (error) {
        console.error('Cancel game error:', error);
        res.status(500).json({ error: 'Failed to cancel game' });
    }
});
// Get games by invite code (for private games)
router.get('/invite/:code', auth_1.auth, async (req, res) => {
    try {
        const code = String(req.params.code);
        const game = await Game_1.default.findOne({ inviteCode: code.toUpperCase(), status: 'waiting' })
            .populate('player1', 'name walletAddress');
        if (!game) {
            res.status(404).json({ error: 'Game not found or no longer available' });
            return;
        }
        res.json({ game });
    }
    catch (error) {
        console.error('Get game by invite error:', error);
        res.status(500).json({ error: 'Failed to fetch game' });
    }
});
// Get user's games
router.get('/user/my-games', auth_1.auth, async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { status } = req.query;
        const filter = {
            $or: [
                { player1: req.user._id },
                { player2: req.user._id },
            ],
        };
        if (status) {
            filter.status = status;
        }
        const games = await Game_1.default.find(filter)
            .populate('player1', 'name walletAddress')
            .populate('player2', 'name walletAddress')
            .populate('winner', 'name walletAddress')
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ games });
    }
    catch (error) {
        console.error('Get user games error:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});
exports.default = router;
//# sourceMappingURL=games.js.map