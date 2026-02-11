import { Router, Response } from 'express';
import User from '../models/User';
import Game from '../models/Game';
import Transaction from '../models/Transaction';
import AdminSettings from '../models/AdminSettings';
import { AuthRequest, auth } from '../middleware/auth';
import { adminAuth } from '../middleware/admin';

const router = Router();

// All admin routes require auth + admin check
router.use(auth);
router.use(adminAuth);

// Get admin statistics
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const settings = await AdminSettings.findOne() || await AdminSettings.create({});
    
    // Get active players (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activePlayers = await User.countDocuments({
      lastLogin: { $gte: oneDayAgo },
    });

    // Get real-time stats
    const [totalGames, activeGames, totalUsers] = await Promise.all([
      Game.countDocuments({ status: 'completed' }),
      Game.countDocuments({ status: 'active' }),
      User.countDocuments(),
    ]);

    res.json({
      totalGames,
      activeGames,
      activePlayers,
      totalUsers,
      totalVolume: settings.totalVolume,
      totalCommission: settings.totalCommission,
      currentCommission: settings.commission,
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Update commission rate
router.put('/commission', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commission } = req.body;

    if (commission === undefined || commission < 0 || commission > 15) {
      res.status(400).json({ error: 'Commission must be between 0 and 15' });
      return;
    }

    const settings = await AdminSettings.findOne() || await AdminSettings.create({});
    settings.commission = commission;
    settings.lastUpdated = new Date();
    settings.updatedBy = req.user!._id;
    await settings.save();

    res.json({
      message: 'Commission updated successfully',
      commission: settings.commission,
    });
  } catch (error) {
    console.error('Update commission error:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// Withdraw commissions
router.post('/withdraw', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { address, amount } = req.body;

    if (!address || !amount || amount <= 0) {
      res.status(400).json({ error: 'Address and valid amount required' });
      return;
    }

    const settings = await AdminSettings.findOne();
    if (!settings || settings.totalCommission < amount) {
      res.status(400).json({ error: 'Insufficient commission balance' });
      return;
    }

    // Deduct from commission
    settings.totalCommission -= amount;
    await settings.save();

    // Create transaction record
    const transaction = new Transaction({
      user: req.user!._id,
      type: 'commission',
      amount,
      status: 'pending',
    });
    await transaction.save();

    // In production, this would trigger smart contract withdrawal
    // For MVP, we just record the transaction

    res.json({
      message: 'Commission withdrawal initiated',
      transaction,
      remainingCommission: settings.totalCommission,
    });
  } catch (error) {
    console.error('Withdraw commission error:', error);
    res.status(500).json({ error: 'Failed to withdraw commission' });
  }
});

// Get all transactions (admin view)
router.get('/transactions', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status, page = 1, limit = 50 } = req.query;

    const filter: Record<string, unknown> = {};
    
    if (type) {
      filter.type = type;
    }
    
    if (status) {
      filter.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('user', 'name walletAddress email')
        .populate('game', 'type stake')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Transaction.countDocuments(filter),
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
  } catch (error) {
    console.error('Get admin transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get all users (admin view)
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, search } = req.query;

    const filter: Record<string, unknown> = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(filter),
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all games (admin view)
router.get('/games', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;

    const filter: Record<string, unknown> = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (type) {
      filter.type = type;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [games, total] = await Promise.all([
      Game.find(filter)
        .populate('player1', 'name walletAddress')
        .populate('player2', 'name walletAddress')
        .populate('winner', 'name walletAddress')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Game.countDocuments(filter),
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
  } catch (error) {
    console.error('Get admin games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Toggle user admin status
router.patch('/users/:userId/admin', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.isAdmin = !!isAdmin;
    await user.save();

    res.json({
      message: `User ${isAdmin ? 'promoted to' : 'removed from'} admin`,
      user: {
        id: user._id,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error('Toggle admin error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
