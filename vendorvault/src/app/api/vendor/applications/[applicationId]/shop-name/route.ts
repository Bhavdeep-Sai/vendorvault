import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { getAuthUser } from '@/middleware/auth';
import ShopApplication from '@/models/ShopApplication';
import License from '@/models/License';

// PATCH /api/vendor/applications/[applicationId]/shop-name - Update shop name
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ applicationId: string }> }
) {
  try {
    const params = await context.params;
    const user = await getAuthUser(request);
    if (!user || user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { shopName } = await request.json();

    if (!shopName || !shopName.trim()) {
      return NextResponse.json({ error: 'Shop name is required' }, { status: 400 });
    }

    // Find the application
    const application = await ShopApplication.findById(params.applicationId);
    
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify ownership - vendorId is User._id
    const Vendor = (await import('@/models/Vendor')).default;
    const vendor = await Vendor.findOne({ userId: user.userId });
    const vendorIdStr = application.vendorId.toString();
    const isOwner = vendorIdStr === user.userId || (vendor && vendorIdStr === vendor._id.toString());
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update shop name in application
    application.shopName = shopName.trim();
    await application.save();

    // Also update in License if exists
    try {
      const license = await License.findOne({ applicationId: params.applicationId });
      if (license) {
        license.shopName = shopName.trim();
        await license.save();
      }
    } catch (licenseError) {
      console.error('Failed to update license shop name:', licenseError);
      // Continue even if license update fails
    }

    return NextResponse.json({
      success: true,
      shopName: shopName.trim(),
      message: 'Shop name updated successfully'
    });
  } catch (error) {
    console.error('Error updating shop name:', error);
    return NextResponse.json(
      { error: 'Failed to update shop name' },
      { status: 500 }
    );
  }
}
