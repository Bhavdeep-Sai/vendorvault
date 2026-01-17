import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary, validateCloudinaryConfig } from '@/lib/cloudinary';
import { requireAuth } from '@/middleware/auth';
import { MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/constants';

async function handler(req: NextRequest, userId: string, role: string) {
  try {
    // Validate Cloudinary configuration
    try {
      validateCloudinaryConfig();
    } catch {
      return NextResponse.json(
        { error: 'File upload service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'railway-vendors';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds limit. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.ALL.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP images and PDF documents are allowed.' },
        { status: 400 }
      );
    }

    const url = await uploadToCloudinary(file, folder);

    if (!url) {
      return NextResponse.json(
        { error: 'Upload failed: No URL returned from upload service' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      url,
      fileName: file.name,
    });
  } catch (error: unknown) {
    console.error('Upload error:', error instanceof Error ? error.message : 'Unknown error');
    
    // Provide more specific error messages
    let errorMessage = 'Upload failed';
    if (error instanceof Error) {
      if (error.message?.includes('Invalid cloud_name')) {
        errorMessage = 'Invalid Cloudinary configuration. Please check environment variables.';
      } else if (error.message?.includes('Invalid api_key')) {
        errorMessage = 'Invalid Cloudinary API key. Please check environment variables.';
      } else if (error.message?.includes('File size')) {
        errorMessage = 'File is too large. Maximum size is 10MB.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export const POST = requireAuth(handler);

