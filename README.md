# 🚂 VendorVault

<div align="center">

**Modern Railway Vendor License Management Platform**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.9-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.21.0-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

[Live Demo](#) • [Documentation](#features) • [Report Bug](https://github.com/Bhavdeep-Sai/vendorvault/issues)

</div>

---

## 📖 About The Project

VendorVault revolutionizes railway vendor license management by replacing traditional paper-based processes with a comprehensive digital platform. Built for Indian Railways, it streamlines the entire lifecycle from application submission to QR-based license verification.

### 🎯 Problem Statement

Traditional railway vendor licensing involves:
- ❌ Manual paperwork and long processing times
- ❌ Difficulty in tracking application status
- ❌ Challenges in license verification
- ❌ Inefficient communication between stakeholders

### ✨ Our Solution

VendorVault provides:
- ✅ **100% Digital Process** - Paperless application and approval workflow
- ✅ **Real-time Tracking** - Live status updates and notifications
- ✅ **QR Code Verification** - Instant license validation via mobile
- ✅ **Role-based Dashboards** - Tailored interfaces for all stakeholders
- ✅ **Secure Document Management** - Cloud-based storage with Cloudinary
- ✅ **Automated Workflows** - Streamlined approval and negotiation processes

---

## 🌟 Key Features

### For Vendors 🏪
- 📝 Digital license application with document upload
- 📊 Real-time application tracking dashboard
- 💳 Payment and agreement management
- 🔔 Instant notifications for status updates
- 📱 QR code-based digital licenses
- 🔄 Easy license renewal process

### For Station Managers 🚉
- ✅ Application review and approval workflow
- 🏪 Comprehensive vendor management
- 💰 Financial oversight and analytics
- 🗺️ Interactive station layout builder with drag-and-drop
- 👥 Inspector management and assignment
- 📈 Performance dashboards and reports

### For Inspectors 🔍
- 📸 QR code scanning for instant verification
- 📋 Digital inspection logging
- 📊 Inspection history and reports
- ✅ Real-time license validation

### For Railway Administrators 🎯
- 🎯 System-wide oversight and control
- 👥 User and role management
- 🏢 Station and platform management
- 📊 Comprehensive analytics and insights
- 🔐 Security and compliance monitoring

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.9 (App Router)
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion 12.26.2
- **State Management**: Zustand + React Context
- **Notifications**: React Hot Toast

### Backend
- **Runtime**: Node.js with Next.js API Routes
- **Database**: MongoDB 6.21.0 with Mongoose ODM
- **Authentication**: JWT + bcryptjs
- **File Storage**: Cloudinary

### Additional Tools
- **QR Codes**: qrcode + html5-qrcode
- **Icons**: Heroicons
- **Drag & Drop**: @dnd-kit
- **Linting**: ESLint
- **Type Checking**: TypeScript

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm or yarn
- MongoDB instance (local or Atlas)
- Cloudinary account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Bhavdeep-Sai/vendorvault.git
   cd vendorvault
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vendorvault
   
   # Authentication (min 32 characters)
   JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   
   # Application URL
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Optional: Seed Demo Data

```bash
# Create railway admin user
npm run seed:railway-admin

# Create demo users for all roles
npm run seed:all
```

---

## 📁 Project Structure

```
vendorvault/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes (57+ endpoints)
│   │   ├── vendor/            # Vendor dashboard
│   │   ├── station-manager/   # Station manager portal
│   │   ├── inspector/         # Inspector dashboard
│   │   ├── railway-admin/     # Admin dashboard
│   │   └── auth/              # Authentication pages
│   ├── components/            # Reusable React components
│   ├── lib/                   # Utility functions
│   ├── models/                # Mongoose models (20+ models)
│   ├── middleware.ts          # Next.js middleware (auth)
│   └── types/                 # TypeScript definitions
├── public/                    # Static assets
├── scripts/                   # Database seeding scripts
└── package.json
```

---

## 🎨 Screenshots

<!-- Add screenshots of your application here -->
*Coming soon...*

---

## 🔐 Security Features

- ✅ JWT-based authentication with HTTP-only cookies
- ✅ Password hashing with bcryptjs (12 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Input validation on all API routes
- ✅ Secure file upload validation
- ✅ Environment variable protection
- ✅ CSRF protection via SameSite cookies
- ✅ Security headers (HSTS, X-Frame-Options, CSP)
- ✅ Rate limiting on sensitive endpoints

---

## 📊 Performance Optimizations

- ⚡ Image optimization with Next.js Image component
- ⚡ Automatic code splitting
- ⚡ CSS optimization with Tailwind purging
- ⚡ Font optimization with display: swap
- ⚡ MongoDB connection pooling
- ⚡ Gzip compression enabled
- ⚡ Production bundle optimization

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Bhavdeep-Sai/vendorvault)

1. Click the button above or go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `NEXT_PUBLIC_APP_URL`
4. Deploy!

### Environment Setup

**MongoDB Atlas**:
1. Create free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Whitelist Vercel IPs or use 0.0.0.0/0
3. Create database user
4. Copy connection string

**Cloudinary**:
1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Get credentials from dashboard
3. Add to environment variables

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed:railway-admin` | Create admin user |
| `npm run seed:all` | Seed demo data |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🐛 Known Issues

- File upload limited to 10MB (Cloudinary free tier)
- QR scanning requires HTTPS in production
- Real-time updates use polling (WebSockets not implemented)

---

## 🔮 Roadmap

- [ ] Real-time notifications with WebSockets
- [ ] Email notification system
- [ ] SMS notifications
- [ ] Advanced analytics dashboard
- [ ] PDF report generation
- [ ] Multi-language support (i18n)
- [ ] Dark mode
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Bhavdeep Sai**

- GitHub: [@Bhavdeep-Sai](https://github.com/Bhavdeep-Sai)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/your-profile)

---

## 🙏 Acknowledgments

- Built as part of Web Systems Integration course project
- Inspired by the need to digitize Indian Railways operations
- Special thanks to Kalvium for the opportunity

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ for Indian Railways

</div>
