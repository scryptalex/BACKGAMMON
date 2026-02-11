"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupGameSocket = setupGameSocket;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Game_1 = __importDefault(require("../models/Game"));
const User_1 = __importDefault(require("../models/User"));
const AdminSettings_1 = __importDefault(require("../models/AdminSettings"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const gameLogic_1 = require("../services/gameLogic");
function setupGameSocket(io) {
    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
            const user = await User_1.default.findById(decoded.userId).select('_id name walletAddress');
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
        }
        catch (error) {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.user?.name} (${socket.userId})`);
        // Join game room
        socket.on('game:join-room', async ({ gameId }) => {
            try {
                const game = await Game_1.default.findById(gameId)
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
            }
            catch (error) {
                console.error('Join room error:', error);
                socket.emit('game:error', { message: 'Failed to join game room' });
            }
        });
        // Roll dice
        socket.on('game:roll-dice', async ({ gameId }) => {
            try {
                const game = await Game_1.default.findById(gameId);
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
                // Check if dice already rolled
                if (game.boardState.remainingMoves.length > 0) {
                    socket.emit('game:error', { message: 'Dice already rolled' });
                    return;
                }
                // Roll dice
                const dice = (0, gameLogic_1.rollDice)();
                const moves = (0, gameLogic_1.getAvailableMoves)(dice);
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
                const canMove = (0, gameLogic_1.hasValidMoves)(game.boardState, currentPlayerNum, moves, game.type);
                if (!canMove) {
                    // No valid moves - skip turn
                    game.boardState.currentPlayer = (0, gameLogic_1.switchPlayer)(currentPlayerNum);
                    game.boardState.remainingMoves = [];
                    await game.save();
                    io.to(`game:${gameId}`).emit('game:turn-skipped', {
                        reason: 'No valid moves available',
                        nextPlayer: game.boardState.currentPlayer,
                    });
                }
            }
            catch (error) {
                console.error('Roll dice error:', error);
                socket.emit('game:error', { message: 'Failed to roll dice' });
            }
        });
        // Make a move
        socket.on('game:move', async ({ gameId, from, to }) => {
            try {
                const game = await Game_1.default.findById(gameId);
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
                const validateFn = game.type === 'short' ? gameLogic_1.isValidMoveShort : gameLogic_1.isValidMoveLong;
                let usedDiceValue = null;
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
                game.boardState = (0, gameLogic_1.applyMove)(game.boardState, from, to, currentPlayerNum, game.type);
                // Remove used dice value
                const diceIndex = game.boardState.remainingMoves.indexOf(usedDiceValue);
                if (diceIndex > -1) {
                    game.boardState.remainingMoves.splice(diceIndex, 1);
                }
                // Check for winner
                const winner = (0, gameLogic_1.checkWinner)(game.boardState);
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
                    game.boardState.currentPlayer = (0, gameLogic_1.switchPlayer)(currentPlayerNum);
                }
                await game.save();
                // Emit updated board state
                io.to(`game:${gameId}`).emit('game:move-made', {
                    from,
                    to,
                    player: currentPlayerNum,
                    boardState: game.boardState,
                });
            }
            catch (error) {
                console.error('Move error:', error);
                socket.emit('game:error', { message: 'Failed to make move' });
            }
        });
        // Surrender
        socket.on('game:surrender', async ({ gameId }) => {
            try {
                const game = await Game_1.default.findById(gameId);
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
            }
            catch (error) {
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
async function processGameWinnings(game) {
    const settings = await AdminSettings_1.default.findOne() || await AdminSettings_1.default.create({});
    const totalPot = game.stake * 2;
    const commissionRate = settings.commission / 100;
    const commission = totalPot * commissionRate;
    const payout = totalPot - commission;
    // Update winner balance
    const winner = await User_1.default.findById(game.winner);
    if (winner) {
        winner.balance += payout;
        await winner.save();
    }
    // Update admin stats
    settings.totalCommission += commission;
    await settings.save();
    // Create transaction records
    const player1 = await User_1.default.findById(game.player1);
    const player2 = await User_1.default.findById(game.player2);
    if (game.winner.toString() === game.player1.toString()) {
        // Player 1 won
        await Transaction_1.default.create({
            user: game.player1,
            type: 'game_win',
            amount: payout,
            status: 'completed',
            game: game._id,
            completedAt: new Date(),
        });
        await Transaction_1.default.create({
            user: game.player2,
            type: 'game_loss',
            amount: game.stake,
            status: 'completed',
            game: game._id,
            completedAt: new Date(),
        });
    }
    else {
        // Player 2 won
        await Transaction_1.default.create({
            user: game.player2,
            type: 'game_win',
            amount: payout,
            status: 'completed',
            game: game._id,
            completedAt: new Date(),
        });
        await Transaction_1.default.create({
            user: game.player1,
            type: 'game_loss',
            amount: game.stake,
            status: 'completed',
            game: game._id,
            completedAt: new Date(),
        });
    }
}
//# sourceMappingURL=gameSocket.js.map