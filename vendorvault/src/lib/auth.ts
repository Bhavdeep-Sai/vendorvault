import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import User from '@/models/User';
import connectDB from './mongodb';
import { JWT_EXPIRY, BCRYPT_ROUNDS } from './constants';

/**
 * Get JWT secret from environment variables
 * Validates at runtime instead of module load to prevent build failures
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be defined. Please set it in your .env file.');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, getJWTSecret(), { expiresIn: JWT_EXPIRY });
}

export function verifyTokenString(token: string): { userId: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as { userId: string; role: string };
    return decoded;
  } catch (error: any) {
    return null;
  }
}

export async function verifyJWT(token: string): Promise<{ userId: string; role: string } | null> {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as { userId: string; role: string };
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function verifyUserFromToken(token: string) {
  try {
    await connectDB();

    const decoded = verifyTokenString(token);
    if (!decoded) {
      return null;
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

export async function verifyToken(request: NextRequest) {
  try {
    await connectDB();

    const token = request.cookies.get('token')?.value;
    if (!token) {
      throw new Error('No token found');
    }

    const decoded = verifyTokenString(token);
    if (!decoded) {
      throw new Error('Invalid token');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  } catch (error) {
    return null;
  }
}

