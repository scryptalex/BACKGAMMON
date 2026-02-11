import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import User from '../models/User';
import { AuthRequest, auth } from '../middleware/auth';
import { isValidEthereumAddress, sanitizeAddress, generateNickname } from '../utils/validation';

const router = Router();

// Verify wallet signature and authenticate
router.post('/wallet', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { address, signature, message } = req.body;

    if (!address || !signature || !message) {
      res.status(400).json({ error: 'Address, signature, and message are required' });
      return;
    }

    if (!isValidEthereumAddress(address)) {
      res.status(400).json({ error: 'Invalid wallet address' });
      return;
    }

    // Verify signature
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      res.status(401).json({ error: 'Signature does not match address' });
      return;
    }

    const sanitizedAddress = sanitizeAddress(address);

    // Find or create user
    let user = await User.findOne({ walletAddress: sanitizedAddress });

    if (!user) {
      // Create new user
      user = new User({
        walletAddress: sanitizedAddress,
        name: generateNickname(),
        authProvider: 'metamask', // Default, can be walletconnect
        balance: 0,
      });
      await user.save();
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), walletAddress: user.walletAddress },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        name: user.name,
        balance: user.balance,
        isAdmin: user.isAdmin,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('Wallet auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// OAuth callback handler (Google/Apple)
router.post('/oauth', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, name, provider } = req.body;

    if (!email || !provider) {
      res.status(400).json({ error: 'Email and provider are required' });
      return;
    }

    if (!['google', 'apple'].includes(provider)) {
      res.status(400).json({ error: 'Invalid provider' });
      return;
    }

    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({
        email: email.toLowerCase(),
        name: name || generateNickname(),
        authProvider: provider,
        balance: 0,
      });
      await user.save();
    } else {
      user.lastLogin = new Date();
      await user.save();
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        balance: user.balance,
        isAdmin: user.isAdmin,
        authProvider: user.authProvider,
      },
    });
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user
router.get('/me', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
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
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Update user profile
router.patch('/profile', auth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const { name } = req.body;

    if (name) {
      if (name.length < 3 || name.length > 30) {
        res.status(400).json({ error: 'Name must be 3-30 characters' });
        return;
      }
      req.user.name = name;
    }

    await req.user.save();

    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        balance: req.user.balance,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
