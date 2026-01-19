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

// Generates a QR code containing just the license number for inspector scanning
export async function generateLicenseQRCode(licenseNumber: string): Promise<{ qrCodeData: string; qrCodeUrl: string }> {
  // Simple QR code with just license number for easy scanning
  // Inspector devices can use this to fetch all data from the system
  const qrContent = licenseNumber;
  
  console.log(`Generating QR code for license: ${licenseNumber}`);
  
  // Generate QR code as data URL
  const qrCodeData = await QRCode.toDataURL(qrContent, {
    errorCorrectionLevel: 'M', // Medium error correction for better readability
    width: 256, // Smaller size for better scanning
    margin: 1,
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

