import { NextRequest, NextResponse } from 'next/server';
import { uploadToCloudinary, validateCloudinaryConfig } from '@/lib/cloudinary';

export async function POST(req: NextRequest) {
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
    const documentType = formData.get('documentType') as string || 'document';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size (max 1MB for registration documents)
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty' },
        { status: 400 }
      );
    }

    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds 1MB limit' },
        { status: 400 }
      );
    }

    // Validate file type based on document type
    const allowedTypes: { [key: string]: string[] } = {
      photograph: ['image/jpeg', 'image/jpg', 'image/png'],
      default: ['application/pdf']
    };

    const validTypes = documentType === 'photograph' 
      ? allowedTypes.photograph 
      : allowedTypes.default;

    if (!validTypes || !validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: documentType === 'photograph' 
          ? 'Photograph must be JPG or PNG format' 
          : 'Document must be PDF format' 
        },
        { status: 400 }
      );
    }

    // Upload to Cloudinary in registration folder
    const folder = `railway-vendors/registration/${documentType}`;
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
    
    let errorMessage = 'Upload failed';
    if (error instanceof Error) {
      if (error.message?.includes('Invalid cloud_name')) {
        errorMessage = 'Invalid Cloudinary configuration. Please check environment variables.';
      } else if (error.message?.includes('Invalid api_key')) {
        errorMessage = 'Invalid Cloudinary API key. Please check environment variables.';
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
