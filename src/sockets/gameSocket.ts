import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Game from '../models/Game';
import User from '../models/User';
import AdminSettings from '../models/AdminSettings';
import Transaction from '../models/Transaction';
import {
  rollDice,
  getAvailableMoves,
  isValidMoveShort,
  isValidMoveLong,
  applyMove,
  hasValidMoves,
  checkWinner,
  switchPlayer,
} from '../services/gameLogic';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    _id: string;
    name: string;
    walletAddress?: string;
  };
}

interface JwtPayload {
  userId: string;
}

export function setupGameSocket(io: Server): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
      ) as JwtPayload;
      
      const user = await User.findById(decoded.userId).select('_id name walletAddress');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = {
        _id: user._id.toString(),
        name: user.name,
        walletAddress: user.walletAddress,
      };
      
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.user?.name} (${socket.userId})`);

    // Join game room
    socket.on('game:join-room', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId)
          .populate('player1', 'name walletAddress')
          .populate('player2', 'name walletAddress');

        if (!game) {
          socket.emit('game:error', { message: 'Game not found' });
          return;
        }

        // Check if user is a player in this game
        const isPlayer1 = game.player1._id.toString() === socket.userId;
        const isPlayer2 = game.player2?._id.toString() === socket.userId;

        if (!isPlayer1 && !isPlayer2) {
          // Allow spectators to join but mark them
          socket.join(`game:${gameId}:spectators`);
        }

        socket.join(`game:${gameId}`);
        socket.emit('game:joined', { game });

        // Notify others in the room
        socket.to(`game:${gameId}`).emit('game:player-joined', {
          player: socket.user,
        });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('game:error', { message: 'Failed to join game room' });
      }
    });

    // Roll dice
    socket.on('game:roll-dice', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId);

        if (!game) {
          socket.emit('game:error', { message: 'Game not found' });
          return;
        }

        if (game.status !== 'active') {
          socket.emit('game:error', { message: 'Game is not active' });
          return;
        }

        // Debug logging
        console.log('Roll dice attempt:', {
          socketUserId: socket.userId,
          player1: game.player1?.toString(),
          player2: game.player2?.toString(),
        });

        const isPlayer1 = game.player1?.toString() === socket.userId;
        const isPlayer2 = game.player2?.toString() === socket.userId;
        
        if (!isPlayer1 && !isPlayer2) {
          socket.emit('game:error', { message: 'You are not a player in this game' });
          return;
        }
        
        const playerNum = isPlayer1 ? 1 : 2;

        // Handle initial roll phase (one die each to determine who starts)
        if (game.boardState.initialRollPhase) {
          // Check if this player already rolled
          if (playerNum === 1 && game.boardState.player1InitialRoll > 0) {
            socket.emit('game:error', { message: 'You already rolled. Wait for opponent.' });
            return;
          }
          if (playerNum === 2 && game.boardState.player2InitialRoll > 0) {
            socket.emit('game:error', { message: 'You already rolled. Wait for opponent.' });
            return;
          }

          // Roll one die
          const singleDie = Math.floor(Math.random() * 6) + 1;
          
          if (playerNum === 1) {
            game.boardState.player1InitialRoll = singleDie;
          } else {
            game.boardState.player2InitialRoll = singleDie;
          }

          await game.save();

          // Emit the initial roll to everyone
          io.to(`game:${gameId}`).emit('game:initial-roll', {
            player: playerNum,
            roll: singleDie,
            player1Roll: game.boardState.player1InitialRoll,
            player2Roll: game.boardState.player2InitialRoll,
          });

          // Check if both have rolled
          if (game.boardState.player1InitialRoll > 0 && game.boardState.player2InitialRoll > 0) {
            const p1Roll = game.boardState.player1InitialRoll;
            const p2Roll = game.boardState.player2InitialRoll;

            if (p1Roll === p2Roll) {
              // Tie - reset and roll again
              game.boardState.player1InitialRoll = 0;
              game.boardState.player2InitialRoll = 0;
              await game.save();

              io.to(`game:${gameId}`).emit('game:initial-roll-tie', {
                message: 'Tie! Both players roll again.',
                roll: p1Roll,
              });
            } else {
              // Determine winner and set up first move
              const firstPlayer = p1Roll > p2Roll ? 1 : 2;
              game.boardState.initialRollPhase = false;
              game.boardState.currentPlayer = firstPlayer;
              game.boardState.dice = [p1Roll, p2Roll] as [number, number];
              game.boardState.remainingMoves = getAvailableMoves([p1Roll, p2Roll] as [number, number]);
              await game.save();

              io.to(`game:${gameId}`).emit('game:initial-roll-complete', {
                winner: firstPlayer,
                player1Roll: p1Roll,
                player2Roll: p2Roll,
                dice: [p1Roll, p2Roll],
                availableMoves: game.boardState.remainingMoves,
                boardState: game.boardState,
              });
            }
          }
          return;
        }

        // Regular roll - check if it's this player's turn
        const currentPlayerNum = game.boardState.currentPlayer;

        if ((currentPlayerNum === 1 && !isPlayer1) || (currentPlayerNum === 2 && !isPlayer2)) {
          socket.emit('game:error', { message: 'Not your turn' });
          return;
        }

        // Check if dice already rolled
        if (game.boardState.remainingMoves.length > 0) {
          socket.emit('game:error', { message: 'Dice already rolled' });
          return;
        }

        // Roll dice
        const dice = rollDice();
        const moves = getAvailableMoves(dice);

        game.boardState.dice = dice;
        game.boardState.remainingMoves = moves;
        await game.save();

        // Emit to all players in the room
        io.to(`game:${gameId}`).emit('game:dice-rolled', {
          dice,
          availableMoves: moves,
          player: currentPlayerNum,
        });

        // Check if player has any valid moves
        const canMove = hasValidMoves(
          game.boardState,
          currentPlayerNum,
          moves,
          game.type
        );

        if (!canMove) {
          // No valid moves - skip turn
          game.boardState.currentPlayer = switchPlayer(currentPlayerNum);
          game.boardState.remainingMoves = [];
          await game.save();

          io.to(`game:${gameId}`).emit('game:turn-skipped', {
            reason: 'No valid moves available',
            nextPlayer: game.boardState.currentPlayer,
          });
        }
      } catch (error) {
        console.error('Roll dice error:', error);
        socket.emit('game:error', { message: 'Failed to roll dice' });
      }
    });

    // Make a move
    socket.on('game:move', async ({ gameId, from, to }) => {
      try {
        const game = await Game.findById(gameId);

        if (!game) {
          socket.emit('game:error', { message: 'Game not found' });
          return;
        }

        if (game.status !== 'active') {
          socket.emit('game:error', { message: 'Game is not active' });
          return;
        }

        // Check if it's this player's turn
        const isPlayer1 = game.player1.toString() === socket.userId;
        const isPlayer2 = game.player2?.toString() === socket.userId;
        const currentPlayerNum = game.boardState.currentPlayer;

        if ((currentPlayerNum === 1 && !isPlayer1) || (currentPlayerNum === 2 && !isPlayer2)) {
          socket.emit('game:error', { message: 'Not your turn' });
          return;
        }

        if (game.boardState.remainingMoves.length === 0) {
          socket.emit('game:error', { message: 'Roll dice first' });
          return;
        }

        // Find a valid dice value for this move
        const validateFn = game.type === 'short' ? isValidMoveShort : isValidMoveLong;
        let usedDiceValue: number | null = null;

        for (const diceValue of game.boardState.remainingMoves) {
          if (validateFn(game.boardState, from, to, currentPlayerNum, diceValue)) {
            usedDiceValue = diceValue;
            break;
          }
        }

        if (usedDiceValue === null) {
          socket.emit('game:error', { message: 'Invalid move' });
          return;
        }

        // Apply the move
        game.boardState = applyMove(game.boardState, from, to, currentPlayerNum, game.type);

        // Remove used dice value
        const diceIndex = game.boardState.remainingMoves.indexOf(usedDiceValue);
        if (diceIndex > -1) {
          game.boardState.remainingMoves.splice(diceIndex, 1);
        }

        // Check for winner
        const winner = checkWinner(game.boardState);
        if (winner) {
          game.status = 'completed';
          game.winner = winner === 1 ? game.player1 : game.player2;
          game.completedAt = new Date();

          // Process winnings
          await processGameWinnings(game);

          await game.save();
          await game.populate('winner', 'name walletAddress');

          io.to(`game:${gameId}`).emit('game:completed', {
            winner: game.winner,
            boardState: game.boardState,
          });
          return;
        }

        // If no more moves, switch player
        if (game.boardState.remainingMoves.length === 0) {
          game.boardState.currentPlayer = switchPlayer(currentPlayerNum);
        }

        await game.save();

        // Emit updated board state
        io.to(`game:${gameId}`).emit('game:move-made', {
          from,
          to,
          player: currentPlayerNum,
          boardState: game.boardState,
        });
      } catch (error) {
        console.error('Move error:', error);
        socket.emit('game:error', { message: 'Failed to make move' });
      }
    });

    // Surrender
    socket.on('game:surrender', async ({ gameId }) => {
      try {
        const game = await Game.findById(gameId);

        if (!game || game.status !== 'active') {
          socket.emit('game:error', { message: 'Invalid game' });
          return;
        }

        const isPlayer1 = game.player1.toString() === socket.userId;
        const isPlayer2 = game.player2?.toString() === socket.userId;

        if (!isPlayer1 && !isPlayer2) {
          socket.emit('game:error', { message: 'Not a player in this game' });
          return;
        }

        // The other player wins
        game.winner = isPlayer1 ? game.player2 : game.player1;
        game.status = 'completed';
        game.completedAt = new Date();

        await processGameWinnings(game);
        await game.save();
        await game.populate('winner', 'name walletAddress');

        io.to(`game:${gameId}`).emit('game:completed', {
          winner: game.winner,
          reason: 'surrender',
          boardState: game.boardState,
        });
      } catch (error) {
        console.error('Surrender error:', error);
        socket.emit('game:error', { message: 'Failed to surrender' });
      }
    });

    // Leave game room
    socket.on('game:leave-room', ({ gameId }) => {
      socket.leave(`game:${gameId}`);
      socket.to(`game:${gameId}`).emit('game:player-left', {
        player: socket.user,
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user?.name}`);
    });
  });
}

// Process game winnings
async function processGameWinnings(game: any): Promise<void> {
  const settings = await AdminSettings.findOne() || await AdminSettings.create({});
  
  const totalPot = game.stake * 2;
  const commissionRate = settings.commission / 100;
  const commission = totalPot * commissionRate;
  const payout = totalPot - commission;

  // Update winner balance
  const winner = await User.findById(game.winner);
  if (winner) {
    winner.balance += payout;
    await winner.save();
  }

  // Update admin stats
  settings.totalCommission += commission;
  await settings.save();

  // Create transaction records
  const player1 = await User.findById(game.player1);
  const player2 = await User.findById(game.player2);

  if (game.winner.toString() === game.player1.toString()) {
    // Player 1 won
    await Transaction.create({
      user: game.player1,
      type: 'game_win',
      amount: payout,
      status: 'completed',
      game: game._id,
      completedAt: new Date(),
    });
    await Transaction.create({
      user: game.player2,
      type: 'game_loss',
      amount: game.stake,
      status: 'completed',
      game: game._id,
      completedAt: new Date(),
    });
  } else {
    // Player 2 won
    await Transaction.create({
      user: game.player2,
      type: 'game_win',
      amount: payout,
      status: 'completed',
      game: game._id,
      completedAt: new Date(),
    });
    await Transaction.create({
      user: game.player1,
      type: 'game_loss',
      amount: game.stake,
      status: 'completed',
      game: game._id,
      completedAt: new Date(),
    });
  }
}
