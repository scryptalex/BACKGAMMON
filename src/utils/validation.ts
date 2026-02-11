import { ethers } from 'ethers';

export const isValidEthereumAddress = (address: string): boolean => {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidNickname = (name: string): boolean => {
  // 3-30 characters, alphanumeric and underscores only
  const nameRegex = /^[a-zA-Z0-9_]{3,30}$/;
  return nameRegex.test(name);
};

export const isValidStake = (stake: number): boolean => {
  return stake >= 1 && Number.isFinite(stake);
};

export const sanitizeAddress = (address: string): string => {
  return address.toLowerCase().trim();
};

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const generateNickname = (): string => {
  const adjectives = ['Swift', 'Brave', 'Lucky', 'Sharp', 'Bold', 'Quick', 'Clever', 'Wise'];
  const nouns = ['Player', 'Gamer', 'Master', 'Pro', 'Champion', 'King', 'Legend', 'Star'];
  const number = Math.floor(Math.random() * 9999);
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  
  return `${adj}${noun}${number}`;
};
