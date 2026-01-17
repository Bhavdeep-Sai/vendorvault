"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  DocumentIcon,
  LightningIcon,
  QrCodeIcon,
  UserIcon,
  ShieldIcon,
  CheckIcon,
} from "@/components/Icons";

const ShopIcon = ({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    fill="currentColor"
    className={className}
    viewBox="0 0 16 16"
  >
    <path d="M2.97 1.35A1 1 0 0 1 3.73 1h8.54a1 1 0 0 1 .76.35l2.609 3.044A1.5 1.5 0 0 1 16 5.37v.255a2.375 2.375 0 0 1-4.25 1.458A2.37 2.37 0 0 1 9.875 8 2.37 2.37 0 0 1 8 7.083 2.37 2.37 0 0 1 6.125 8a2.37 2.37 0 0 1-1.875-.917A2.375 2.375 0 0 1 0 5.625V5.37a1.5 1.5 0 0 1 .361-.976zm1.78 4.275a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0 1.375 1.375 0 1 0 2.75 0V5.37a.5.5 0 0 0-.12-.325L12.27 2H3.73L1.12 5.045A.5.5 0 0 0 1 5.37v.255a1.375 1.375 0 0 0 2.75 0 .5.5 0 0 1 1 0M1.5 8.5A.5.5 0 0 1 2 9v6h12V9a.5.5 0 0 1 1 0v6h.5a.5.5 0 0 1 0 1H.5a.5.5 0 0 1 0-1H1V9a.5.5 0 0 1 .5-.5m2 .5a.5.5 0 0 1 .5.5V13h8V9.5a.5.5 0 0 1 1 0V13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a.5.5 0 0 1 .5-.5" />
  </svg>
);

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && typeof window !== "undefined") {
      const url = `${window.location.origin}/welcome`;

      QRCode.toCanvas(canvasRef.current, url, {
        width: 120,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
    }
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-3"
            >
              <div className="bg-cyan-600 p-2.5 rounded-lg">
                <ShopIcon size={28} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">VendorVault</h1>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="hidden md:flex items-center space-x-2"
            >
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-sm text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="bg-cyan-600 text-white px-5 py-2.5 rounded-sm text-sm font-medium hover:bg-cyan-700 transition-colors"
              >
                Get Started
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-10">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Left Content */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-block bg-cyan-50 text-cyan-700 border-2 border-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                  Railway Vendor Management Platform
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                  Digital License
                  <span className="block text-cyan-600 mt-2">Management</span>
                </h1>
                <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                  Streamline vendor licensing for railway stations. From
                  application to QR-verified digital licenses—secure, fast, and
                  paperless.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center px-8 py-4 bg-cyan-600 text-white text-base font-semibold rounded-sm hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200"
                  >
                    Apply for License
                    <svg
                      className="ml-2 w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                  <Link
                    href="/auth/station-manager-application"
                    className="inline-flex items-center justify-center px-8 py-4 bg-gray-100 text-gray-900 text-base font-semibold rounded-sm hover:bg-gray-200 transition-all"
                  >
                    Station Manager Portal
                  </Link>
                </div>

                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-gray-200"
                >
                  <div>
                    <div className="text-3xl font-bold text-gray-900">100%</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Digital Process
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">24/7</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Access Available
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">Fast</div>
                    <div className="text-sm text-gray-600 mt-1">Approvals</div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                <div className="bg-cyan-600 rounded-2xl p-8 shadow-2xl">
                  <div className="bg-white rounded-2xl rounded-b-none p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-green-100 p-2 rounded-full border-2 border-green-600">
                          <CheckIcon className="text-green-600" size={20} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            License Status
                          </div>
                          <div className="text-xs text-gray-500">
                            Active & Verified
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        APPROVED
                      </div>
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs">
                            License Number
                          </div>
                          <div className="font-semibold text-gray-900">
                            VV-2026-001
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">
                            Valid Until
                          </div>
                          <div className="font-semibold text-gray-900">
                            Dec 2026
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-[#EEF2F7] rounded-2xl rounded-t-none p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-center">
                      <div className="bg-white p-3 rounded-lg shadow-md">
                        <canvas ref={canvasRef} className="max-w-full h-auto" />
                      </div>
                    </div>
                    <p className="text-center text-gray-500 text-sm mt-4 font-medium">
                      Scan to Apply
                    </p>
                    <p className="text-center text-gray-500 text-xs mt-1 opacity-90">
                      Quick access to applications
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                A comprehensive platform designed for vendors, station managers,
                and railway administration
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="bg-cyan-100 w-14 h-14 rounded-sm flex items-center justify-center mb-6">
                  <DocumentIcon className="text-cyan-600" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Digital Applications
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Submit applications online with document uploads, real-time
                  tracking, and instant status updates.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Secure document storage
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Real-time status tracking
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Automated notifications
                  </li>
                </ul>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="bg-amber-100 w-14 h-14 rounded-sm flex items-center justify-center mb-6">
                  <LightningIcon className="text-amber-600" size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  Fast Processing
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Accelerated approval workflow reduces waiting time from weeks
                  to days with intelligent routing.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Streamlined approvals
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Automated verification
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Priority processing
                  </li>
                </ul>
              </motion.div>

              <motion.div
                variants={fadeInUp}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all"
              >
                <div className="bg-green-100 text-green-600 w-14 h-14 rounded-sm flex items-center justify-center mb-6">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M2 2h2v2H2z" />
                    <path d="M6 0v6H0V0zM5 1H1v4h4zM4 12H2v2h2z" />
                    <path d="M6 10v6H0v-6zm-5 1v4h4v-4zm11-9h2v2h-2z" />
                    <path d="M10 0v6h6V0zm5 1v4h-4V1zM8 1V0h1v2H8v2H7V1zm0 5V4h1v2zM6 8V7h1V6h1v2h1V7h5v1h-4v1H7V8zm0 0v1H2V8H1v1H0V7h3v1zm10 1h-1V7h1zm-1 0h-1v2h2v-1h-1zm-4 0h2v1h-1v1h-1zm2 3v-1h-1v1h-1v1H9v1h3v-2zm0 0h3v1h-2v1h-1zm-4-1v1h1v-2H7v1z" />
                    <path d="M7 12h1v3h4v1H7zm9 2v2h-3v-1h2v-1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  QR Verification
                </h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  Instant license validation through QR codes. Inspectors verify
                  authenticity in seconds.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Instant verification
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Tamper-proof security
                  </li>
                  <li className="flex items-center">
                    <CheckIcon className="text-green-500 mr-2" size={16} />
                    Mobile-friendly access
                  </li>
                </ul>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Simple Process
              </h2>
              <p className="text-xl text-gray-600">
                Get your digital license in three easy steps
              </p>
            </motion.div>

            <div className="relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2"></div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="relative"
                >
                  <div className="bg-white border-4 border-cyan-600 rounded-2xl p-8 text-center">
                    <div className="bg-cyan-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">
                      1
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      Register Account
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Create your vendor profile and fill out the application
                      form with required business details and documentation.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <div className="bg-white border-4 border-amber-500 rounded-2xl p-8 text-center">
                    <div className="bg-amber-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">
                      2
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      Review & Approval
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Railway administration and station managers review your
                      application thoroughly and provide approval or feedback.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="relative"
                >
                  <div className="bg-white border-4 border-green-500 rounded-2xl p-8 text-center">
                    <div className="bg-green-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 text-2xl font-bold shadow-lg">
                      3
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-gray-900">
                      Get Digital License
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      Receive your verified digital license with QR code. Access
                      it anytime, renew easily, and maintain compliance.
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* User Roles Section */}
        <section className="py-24 bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Who Uses VendorVault?
              </h2>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                A complete platform serving multiple stakeholders in the railway
                vendor ecosystem
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-cyan-500 transition-all"
              >
                <div className="bg-cyan-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <ShopIcon size={24} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2">Vendors</h3>
                <p className="text-gray-400 text-sm">
                  Apply for licenses, manage renewals, track applications, and
                  access digital licenses with QR codes.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-green-500 transition-all"
              >
                <div className="bg-green-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="25"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Station Managers</h3>
                <p className="text-gray-400 text-sm">
                  Review applications, manage vendors, oversee platform
                  operations, and maintain station compliance.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-amber-500 transition-all"
              >
                <div className="bg-amber-600 w-12 h-12 rounded-sm flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="25"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Inspectors</h3>
                <p className="text-gray-400 text-sm">
                  Verify licenses instantly with QR scanner, conduct
                  inspections, and ensure regulatory compliance.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-purple-500 transition-all"
              >
                <div className="bg-purple-600 w-12 h-12 rounded-sm flex items-center justify-center mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="25"
                    height="25"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                  >
                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0m-9 8c0 1 1 1 1 1h5v-1a2 2 0 0 1 .01-.2 4.49 4.49 0 0 1 1.534-3.693Q8.844 9.002 8 9c-5 0-6 3-6 4m7 0a1 1 0 0 1 1-1v-1a2 2 0 1 1 4 0v1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1zm3-3a1 1 0 0 0-1 1v1h2v-1a1 1 0 0 0-1-1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2">Railway Admin</h3>
                <p className="text-gray-400 text-sm">
                  Oversee all operations, manage system-wide policies, generate
                  reports, and maintain platform integrity.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-cyan-600">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-cyan-100 mb-10 max-w-2xl mx-auto">
                Join hundreds of vendors who have digitized their license
                management. Start your application today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/auth/register"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-cyan-600 text-lg font-bold rounded-sm hover:bg-gray-100 transition-all shadow-lg"
                >
                  Apply for Vendor License
                  <svg
                    className="ml-2 w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center px-8 py-4 bg-cyan-700 text-white text-lg font-bold rounded-sm hover:bg-cyan-800 transition-all border-2 border-white/20"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-cyan-600 p-2 rounded-lg">
                  <ShopIcon size={24} className="text-white" />
                </div>
                <span className="text-xl font-bold">VendorVault</span>
              </div>
              <p className="text-gray-400 text-sm">
                Modern railway vendor license management platform.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="/auth/register"
                    className="hover:text-white transition-colors"
                  >
                    Apply for License
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/login"
                    className="hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/verify"
                    className="hover:text-white transition-colors"
                  >
                    Verify License
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">For Teams</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link
                    href="/auth/station-manager-application"
                    className="hover:text-white transition-colors"
                  >
                    Station Manager
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/login"
                    className="hover:text-white transition-colors"
                  >
                    Inspector Portal
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/login"
                    className="hover:text-white transition-colors"
                  >
                    Admin Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Compliance
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-sm text-gray-400">
              © 2026 VendorVault. All rights reserved. Professional railway
              vendor license management platform.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
