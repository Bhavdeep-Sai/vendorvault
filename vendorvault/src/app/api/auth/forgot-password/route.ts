import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { sign } from 'jsonwebtoken';

// Import the secure JWT secret getter
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable must be defined. Please set it in your .env file.');
  }
  return secret;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'If this email exists, you will receive a password reset link' },
        { status: 200 }
      );
    }

    const resetToken = sign(
      { userId: user._id, email: user.email, type: 'password-reset' },
      getJWTSecret(),
      { expiresIn: '1h' }
    );

    const resetUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    console.log(`\n📧 Password Reset Link for ${user.email}:`);
    console.log(`${resetUrl}/auth/reset-password?token=${resetToken}`);
    console.log(`Token expires in 1 hour\n`);

    return NextResponse.json({
      success: true,
      message: 'If this email exists, you will receive a password reset link',
      resetToken,
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset request' },
      { status: 500 }
    );
  }
}
