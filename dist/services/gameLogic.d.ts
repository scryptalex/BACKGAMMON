import { BoardState, GameType } from '../models/Game';
/**
 * Initialize the board state for a new game
 * Short backgammon (backgammon) has initial positions with hitting
 * Long backgammon (narde) - all checkers start at one point, no hitting
 */
export declare function initializeBoard(type: GameType): BoardState;
/**
 * Roll two dice
 */
export declare function rollDice(): [number, number];
/**
 * Get available moves based on dice roll
 * For doubles, player gets 4 moves
 */
export declare function getAvailableMoves(dice: [number, number]): number[];
/**
 * Check if a move is valid (short backgammon)
 */
export declare function isValidMoveShort(boardState: BoardState, from: number, to: number, player: 1 | 2, diceValue: number): boolean;
/**
 * Check if a move is valid (long backgammon - no hitting)
 */
export declare function isValidMoveLong(boardState: BoardState, from: number, to: number, player: 1 | 2, diceValue: number): boolean;
/**
 * Check if player can bear off (all checkers in home board)
 */
export declare function canPlayerBearOff(boardState: BoardState, player: 1 | 2): boolean;
/**
 * Apply a move to the board
 */
export declare function applyMove(boardState: BoardState, from: number, to: number, player: 1 | 2, gameType: GameType): BoardState;
/**
 * Check if player has any valid moves
 */
export declare function hasValidMoves(boardState: BoardState, player: 1 | 2, remainingMoves: number[], gameType: GameType): boolean;
/**
 * Check if game is finished
 */
export declare function checkWinner(boardState: BoardState): 1 | 2 | null;
/**
 * Switch current player
 */
export declare function switchPlayer(currentPlayer: 1 | 2): 1 | 2;
//# sourceMappingURL=gameLogic.d.ts.map