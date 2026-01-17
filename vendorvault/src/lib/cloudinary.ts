import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary Configuration
 * Centralized configuration for all Cloudinary operations
 */
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary
if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
} else {
  console.warn('⚠️  Cloudinary configuration incomplete. Missing:', {
    cloudName: !cloudName,
    apiKey: !apiKey,
    apiSecret: !apiSecret,
  });
}

/**
 * Validates Cloudinary configuration
 * @throws Error if configuration is incomplete
 */
export function validateCloudinaryConfig(): void {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.');
  }
}

/**
 * Determines the resource type for Cloudinary upload
 * @param file - File object or file metadata
 * @returns 'raw' for PDFs, 'image' for images, 'auto' for other types
 */
function getResourceType(file: File | Buffer | { type?: string; name?: string }): 'raw' | 'image' | 'auto' {
  const fileType = ('type' in file && file.type) ? file.type : '';
  const fileName = ('name' in file && file.name) ? file.name : '';
  
  if (fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    return 'raw';
  }
  
  if (fileType.startsWith('image/')) {
    return 'image';
  }
  
  return 'auto';
}

/**
 * Converts file to Buffer for upload
 * @param file - File, Buffer, or other data type
 * @returns Buffer ready for upload
 */
async function fileToBuffer(file: File | Buffer | unknown): Promise<Buffer> {
  // If it's already a Buffer, return it
  if (Buffer.isBuffer(file)) {
    return file;
  }
  
  // If it has arrayBuffer method (File API), convert it
  if (file && typeof (file as File).arrayBuffer === 'function') {
    const arrayBuffer = await (file as File).arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  
  // Try to convert to Buffer directly
  if (file) {
    try {
      if (typeof file === 'string') {
        return Buffer.from(file);
      } else if (ArrayBuffer.isView(file)) {
        return Buffer.from(file.buffer, file.byteOffset, file.byteLength);
      } else if (file instanceof ArrayBuffer) {
        return Buffer.from(file);
      }
      throw new Error('Invalid file type. Expected File or Buffer.');
    } catch {
      throw new Error('Invalid file type. Expected File or Buffer.');
    }
  }
  
  throw new Error('No valid file data provided');
}

/**
 * Converts a Cloudinary URL to a downloadable format
 * For raw resources (PDFs), ensures the URL is accessible
 * @param url - Original Cloudinary URL
 * @returns Properly formatted URL for download/view
 */
export function getDownloadableUrl(url: string): string {
  try {
    // If URL contains /raw/upload/, it needs to be converted for proper access
    // Cloudinary raw files should use /image/upload/ with fl_attachment flag
    // OR use the original URL which should work if uploaded correctly
    
    // The URL should already be correct from secure_url
    // But if there are issues, we can transform it
    return url;
  } catch (error) {
    console.error('❌ Error processing Cloudinary URL:', error);
    return url;
  }
}

/**
 * Uploads a file to Cloudinary
 * @param file - File or Buffer to upload
 * @param folder - Cloudinary folder path (default: 'railway-vendors')
 * @returns Promise resolving to the secure URL of uploaded file
 */
export async function uploadToCloudinary(
  file: File | Buffer | unknown, 
  folder: string = 'railway-vendors'
): Promise<string> {
  // Validate configuration first
  validateCloudinaryConfig();
  
  if (!file) {
    throw new Error('No file provided for upload');
  }

  try {
    // Convert file to buffer
    const buffer = await fileToBuffer(file);
    
    // Determine resource type
    const resourceType = getResourceType(file);
    
    // Upload to Cloudinary
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          type: 'upload',
          access_mode: 'public',
          // For PDFs, ensure they're downloadable
          flags: resourceType === 'raw' ? 'attachment' : undefined,
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(new Error(error.message || 'Cloudinary upload failed'));
          } else if (!result?.secure_url) {
            reject(new Error('Upload succeeded but no URL returned'));
          } else {
            console.log('✅ File uploaded successfully to Cloudinary:', result.secure_url);
            console.log('📄 Upload result:', JSON.stringify({
              url: result.secure_url,
              public_id: result.public_id,
              resource_type: result.resource_type,
              format: result.format,
            }));
            resolve(result.secure_url);
          }
        }
      );
      
      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    throw error instanceof Error ? error : new Error('Failed to process file for upload');
  }
}

/**
 * Extracts the public ID from a Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID without extension
 */
export function getPublicIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    
    if (uploadIndex === -1) {
      throw new Error('Invalid Cloudinary URL: "upload" segment not found');
    }
    
    // Get everything after 'upload' and the version (v1234567890)
    const pathAfterUpload = urlParts.slice(uploadIndex + 2).join('/');
    
    // Remove file extension
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
    
    return publicId;
  } catch (error) {
    console.error('❌ Error extracting public ID from URL:', url, error);
    throw new Error('Failed to extract public ID from Cloudinary URL');
  }
}

/**
 * Deletes a file from Cloudinary by URL
 * @param fileUrl - Cloudinary file URL
 * @returns Promise resolving to deletion result
 */
export async function deleteFromCloudinary(fileUrl: string): Promise<{ result: string; error?: string }> {
  validateCloudinaryConfig();
  
  if (!fileUrl) {
    throw new Error('No file URL provided for deletion');
  }

  try {
    const publicId = getPublicIdFromUrl(fileUrl);
    
    // Determine resource type from URL or try both
    let deleteResult;
    
    try {
      // Try as raw first (PDFs)
      deleteResult = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'raw' 
      });
      
      if (deleteResult.result === 'ok') {
        console.log('✅ File deleted from Cloudinary (raw):', publicId);
        return deleteResult;
      }
    } catch {
      // If raw fails, try as image
      deleteResult = await cloudinary.uploader.destroy(publicId, { 
        resource_type: 'image' 
      });
      
      if (deleteResult.result === 'ok') {
        console.log('✅ File deleted from Cloudinary (image):', publicId);
        return deleteResult;
      }
    }
    
    // If neither worked, log warning but don't throw
    console.warn('⚠️  File may not exist in Cloudinary:', publicId);
    return deleteResult || { result: 'not_found' };
    
  } catch (error) {
    console.error('❌ Cloudinary deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Don't throw - allow document deletion to proceed even if Cloudinary deletion fails
    return { result: 'error', error: errorMessage };
  }
}

export { cloudinary };

