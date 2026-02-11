"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNickname = exports.generateInviteCode = exports.sanitizeAddress = exports.isValidStake = exports.isValidNickname = exports.isValidEmail = exports.isValidEthereumAddress = void 0;
const ethers_1 = require("ethers");
const isValidEthereumAddress = (address) => {
    try {
        return ethers_1.ethers.isAddress(address);
    }
    catch {
        return false;
    }
};
exports.isValidEthereumAddress = isValidEthereumAddress;
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.isValidEmail = isValidEmail;
const isValidNickname = (name) => {
    // 3-30 characters, alphanumeric and underscores only
    const nameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return nameRegex.test(name);
};
exports.isValidNickname = isValidNickname;
const isValidStake = (stake) => {
    return stake >= 1 && Number.isFinite(stake);
};
exports.isValidStake = isValidStake;
const sanitizeAddress = (address) => {
    return address.toLowerCase().trim();
};
exports.sanitizeAddress = sanitizeAddress;
const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};
exports.generateInviteCode = generateInviteCode;
const generateNickname = () => {
    const adjectives = ['Swift', 'Brave', 'Lucky', 'Sharp', 'Bold', 'Quick', 'Clever', 'Wise'];
    const nouns = ['Player', 'Gamer', 'Master', 'Pro', 'Champion', 'King', 'Legend', 'Star'];
    const number = Math.floor(Math.random() * 9999);
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj}${noun}${number}`;
};
exports.generateNickname = generateNickname;
//# sourceMappingURL=validation.js.map