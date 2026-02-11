"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBoard = initializeBoard;
exports.rollDice = rollDice;
exports.getAvailableMoves = getAvailableMoves;
exports.isValidMoveShort = isValidMoveShort;
exports.isValidMoveLong = isValidMoveLong;
exports.canPlayerBearOff = canPlayerBearOff;
exports.applyMove = applyMove;
exports.hasValidMoves = hasValidMoves;
exports.checkWinner = checkWinner;
exports.switchPlayer = switchPlayer;
/**
 * Initialize the board state for a new game
 * Short backgammon (backgammon) has initial positions with hitting
 * Long backgammon (narde) - all checkers start at one point, no hitting
 */
function initializeBoard(type) {
    // positions[0-23] represent points 1-24
    // Positive numbers = player 1 checkers
    // Negative numbers = player 2 checkers
    const positions = new Array(24).fill(0);
    if (type === 'short') {
        // Standard backgammon starting position
        // Player 1 moves counterclockwise (24 -> 1)
        // Player 2 moves clockwise (1 -> 24)
        // Player 1 (positive)
        positions[23] = 2; // Point 24 - 2 checkers
        positions[12] = 5; // Point 13 - 5 checkers
        positions[7] = 3; // Point 8 - 3 checkers
        positions[5] = 5; // Point 6 - 5 checkers
        // Player 2 (negative)
        positions[0] = -2; // Point 1 - 2 checkers
        positions[11] = -5; // Point 12 - 5 checkers
        positions[16] = -3; // Point 17 - 3 checkers
        positions[18] = -5; // Point 19 - 5 checkers
    }
    else {
        // Long backgammon (narde) starting position
        // All 15 checkers start at one point for each player
        positions[23] = 15; // Player 1: all checkers on point 24
        positions[11] = -15; // Player 2: all checkers on point 12
    }
    return {
        positions,
        currentPlayer: 1,
        dice: [0, 0],
        remainingMoves: [],
        moveHistory: [],
        player1Bar: 0,
        player2Bar: 0,
        player1Off: 0,
        player2Off: 0,
    };
}
/**
 * Roll two dice
 */
function rollDice() {
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    return [die1, die2];
}
/**
 * Get available moves based on dice roll
 * For doubles, player gets 4 moves
 */
function getAvailableMoves(dice) {
    if (dice[0] === dice[1]) {
        // Doubles - 4 moves
        return [dice[0], dice[0], dice[0], dice[0]];
    }
    return [...dice].filter(d => d > 0);
}
/**
 * Check if a move is valid (short backgammon)
 */
function isValidMoveShort(boardState, from, to, player, diceValue) {
    const { positions, player1Bar, player2Bar, player1Off, player2Off } = boardState;
    // Check if player has checkers on the bar
    if (player === 1 && player1Bar > 0 && from !== -1) {
        return false; // Must enter from bar first
    }
    if (player === 2 && player2Bar > 0 && from !== -1) {
        return false;
    }
    // Handle bearing off
    if (to === 24 || to === -1) {
        // Can only bear off if all checkers are in home board
        const canBearOff = canPlayerBearOff(boardState, player);
        if (!canBearOff)
            return false;
        // Check if exact or higher value is acceptable
        if (player === 1) {
            const homeStart = 0;
            const homeEnd = 5;
            const fromPoint = from;
            if (fromPoint < homeStart || fromPoint > homeEnd)
                return false;
            const exactTo = fromPoint - diceValue;
            if (exactTo < 0) {
                // Higher dice value than needed - check if there are no checkers behind
                for (let i = fromPoint + 1; i <= 5; i++) {
                    if (positions[i] > 0)
                        return false;
                }
            }
        }
        // Similar logic for player 2...
        return true;
    }
    // Entering from bar
    if (from === -1) {
        if (player === 1) {
            // Enter to opponent's home board (points 19-24 = indices 18-23)
            const enterPoint = 24 - diceValue;
            if (to !== enterPoint)
                return false;
            // Check if blocked (2+ opponent checkers)
            if (positions[to] <= -2)
                return false;
        }
        else {
            // Player 2 enters to points 1-6 = indices 0-5
            const enterPoint = diceValue - 1;
            if (to !== enterPoint)
                return false;
            if (positions[to] >= 2)
                return false;
        }
        return true;
    }
    // Regular move
    const direction = player === 1 ? -1 : 1; // Player 1 moves backwards, Player 2 forwards
    const expectedTo = from + (direction * diceValue);
    if (to !== expectedTo)
        return false;
    if (to < 0 || to > 23)
        return false;
    // Check if from has player's checker
    if (player === 1 && positions[from] <= 0)
        return false;
    if (player === 2 && positions[from] >= 0)
        return false;
    // Check if destination is blocked
    if (player === 1 && positions[to] <= -2)
        return false;
    if (player === 2 && positions[to] >= 2)
        return false;
    return true;
}
/**
 * Check if a move is valid (long backgammon - no hitting)
 */
function isValidMoveLong(boardState, from, to, player, diceValue) {
    const { positions } = boardState;
    // Bearing off check
    if (to === 24 || to === -1) {
        return canPlayerBearOff(boardState, player);
    }
    const direction = player === 1 ? -1 : 1;
    const expectedTo = from + (direction * diceValue);
    if (to !== expectedTo)
        return false;
    if (to < 0 || to > 23)
        return false;
    // Check if from has player's checker
    if (player === 1 && positions[from] <= 0)
        return false;
    if (player === 2 && positions[from] >= 0)
        return false;
    // In long backgammon, can't land on opponent's checker at all
    if (player === 1 && positions[to] < 0)
        return false;
    if (player === 2 && positions[to] > 0)
        return false;
    // Check for 6-prime blocking rule (can't block 6 consecutive points)
    // This is simplified - full implementation would check consecutive blocks
    return true;
}
/**
 * Check if player can bear off (all checkers in home board)
 */
function canPlayerBearOff(boardState, player) {
    const { positions, player1Bar, player2Bar } = boardState;
    if (player === 1) {
        if (player1Bar > 0)
            return false;
        // Player 1 home board is points 1-6 (indices 0-5)
        for (let i = 6; i < 24; i++) {
            if (positions[i] > 0)
                return false;
        }
        return true;
    }
    else {
        if (player2Bar > 0)
            return false;
        // Player 2 home board is points 19-24 (indices 18-23)
        for (let i = 0; i < 18; i++) {
            if (positions[i] < 0)
                return false;
        }
        return true;
    }
}
/**
 * Apply a move to the board
 */
function applyMove(boardState, from, to, player, gameType) {
    const newState = JSON.parse(JSON.stringify(boardState));
    // Remove checker from origin
    if (from === -1) {
        // From bar
        if (player === 1)
            newState.player1Bar--;
        else
            newState.player2Bar--;
    }
    else {
        if (player === 1)
            newState.positions[from]--;
        else
            newState.positions[from]++;
    }
    // Handle bearing off
    if (to === 24 || to < 0) {
        if (player === 1)
            newState.player1Off++;
        else
            newState.player2Off++;
    }
    else {
        // Regular move
        if (gameType === 'short') {
            // Check for hitting opponent's blot
            if (player === 1 && newState.positions[to] === -1) {
                newState.positions[to] = 0;
                newState.player2Bar++;
            }
            else if (player === 2 && newState.positions[to] === 1) {
                newState.positions[to] = 0;
                newState.player1Bar++;
            }
        }
        // Place checker at destination
        if (player === 1)
            newState.positions[to]++;
        else
            newState.positions[to]--;
    }
    // Record move
    const move = {
        from,
        to,
        player,
        timestamp: new Date(),
    };
    newState.moveHistory.push(move);
    return newState;
}
/**
 * Check if player has any valid moves
 */
function hasValidMoves(boardState, player, remainingMoves, gameType) {
    if (remainingMoves.length === 0)
        return false;
    const { positions, player1Bar, player2Bar } = boardState;
    const validateFn = gameType === 'short' ? isValidMoveShort : isValidMoveLong;
    // Check if must enter from bar
    const mustEnterFromBar = (player === 1 && player1Bar > 0) || (player === 2 && player2Bar > 0);
    for (const diceValue of remainingMoves) {
        if (mustEnterFromBar) {
            const enterPoint = player === 1 ? 24 - diceValue : diceValue - 1;
            if (validateFn(boardState, -1, enterPoint, player, diceValue)) {
                return true;
            }
        }
        else {
            // Check all points
            for (let from = 0; from < 24; from++) {
                const hasChecker = player === 1 ? positions[from] > 0 : positions[from] < 0;
                if (hasChecker) {
                    const direction = player === 1 ? -1 : 1;
                    const to = from + (direction * diceValue);
                    // Check regular move
                    if (to >= 0 && to <= 23 && validateFn(boardState, from, to, player, diceValue)) {
                        return true;
                    }
                    // Check bearing off
                    if (canPlayerBearOff(boardState, player)) {
                        if (validateFn(boardState, from, player === 1 ? -1 : 24, player, diceValue)) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}
/**
 * Check if game is finished
 */
function checkWinner(boardState) {
    if (boardState.player1Off === 15)
        return 1;
    if (boardState.player2Off === 15)
        return 2;
    return null;
}
/**
 * Switch current player
 */
function switchPlayer(currentPlayer) {
    return currentPlayer === 1 ? 2 : 1;
}
//# sourceMappingURL=gameLogic.js.map