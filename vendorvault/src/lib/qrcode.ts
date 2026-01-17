import QRCode from 'qrcode';
import { cloudinary } from './cloudinary';

export async function generateQRCode(licenseNumber: string): Promise<{ qrCodeData: string; qrCodeUrl: string }> {
  // Get base URL from environment variable
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

  if (!baseUrl && process.env.NODE_ENV === 'production') {
    throw new Error('NEXT_PUBLIC_APP_URL must be set in production environment');
  }

  const verificationUrl = `${baseUrl || 'http://localhost:3000'}/verify/${licenseNumber}`;

  // Generate QR code as data URL
  const qrCodeData = await QRCode.toDataURL(verificationUrl);

  // Upload to Cloudinary for permanent storage
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

