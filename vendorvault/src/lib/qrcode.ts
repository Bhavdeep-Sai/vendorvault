import QRCode from 'qrcode';
import { cloudinary } from './cloudinary';

// Generates a QR code for the public welcome page (for dashboard hero QR)
export async function generateWelcomeQRCode(): Promise<{ qrCodeData: string; qrCodeUrl: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (!baseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production environment');
  }
  const welcomeUrl = `${baseUrl || 'http://localhost:3000'}/welcome`;
  const qrCodeData = await QRCode.toDataURL(welcomeUrl);
  const buffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
  const qrCodeUrl = await new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'railway-vendors/qrcodes',
        resource_type: 'image',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result?.secure_url || '');
        }
      }
    ).end(buffer);
  });
  return { qrCodeData, qrCodeUrl };
}

// Generates a QR code for a license verification page
export async function generateLicenseQRCode(licenseNumber: string): Promise<{ qrCodeData: string; qrCodeUrl: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || process.env.VERCEL_URL;
  
  // Determine the correct base URL
  let verifyBaseUrl: string;
  if (baseUrl) {
    // If we have a configured base URL, use it
    verifyBaseUrl = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  } else if (process.env.NODE_ENV === 'production') {
    // In production without configured URL, we need a fallback
    console.warn('No base URL configured for production. QR codes may not work correctly.');
    verifyBaseUrl = 'https://vendorvault.vercel.app'; // Replace with your actual domain
  } else {
    // Development environment
    verifyBaseUrl = 'http://localhost:3000';
  }
  
  // Create verification URL
  const verifyUrl = `${verifyBaseUrl}/verify/${licenseNumber}`;
  
  // Generate QR code as data URL
  const qrCodeData = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: 'H',
    width: 512,
    margin: 2,
  });
  
  // Upload to Cloudinary
  const buffer = Buffer.from(qrCodeData.split(',')[1], 'base64');
  const qrCodeUrl = await new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'railway-vendors/qrcodes/licenses',
        public_id: `license-${licenseNumber}`,
        resource_type: 'image',
        overwrite: true, // Allow regeneration if needed
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result?.secure_url || '');
        }
      }
    ).end(buffer);
  });
  
  return { qrCodeData, qrCodeUrl };
}

