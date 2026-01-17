'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface InspectorManagementProps {
  refreshTrigger?: number;
}

interface Inspector {
  _id: string;
  userId: {
    _id: string;
    fullName: string;
    email: string;
  };
  employeeId: string;
  designation: string;
  status: string;
  totalInspections: number;
  lastInspectionDate?: string;
  contactNumber?: string;
}

export function InspectorManagement({ refreshTrigger }: InspectorManagementProps) {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', employeeId: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspectors();
  }, [refreshTrigger]);

  const fetchInspectors = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/station-manager/inspectors');
      if (response.ok) {
        const data = await response.json();
        setInspectors(data.inspectors || []);
      } else {
        toast.error('Failed to load inspectors');
      }
    } catch {
      toast.error('Error loading inspectors');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SUSPENDED: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Inspectors</h2>
        <div>
          <button
            className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : 'Add Inspector'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="p-6 border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Inspector name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="p-2 border rounded" />
            <input placeholder="Inspector email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="p-2 border rounded" />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="p-2 border rounded" />
            <input placeholder="Employee ID" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="p-2 border rounded" />
          </div>
          <div className="mt-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={async () => {
              // submit
              try {
                setLoading(true);
                const res = await fetch('/api/station-manager/inspectors', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: form.name, email: form.email, password: form.password, employeeId: form.employeeId })
                });
                const data = await res.json();
                if (data.success) {
                  toast.success('Inspector created');
                  setShowForm(false);
                  setForm({ name: '', email: '', password: '', employeeId: '' });
                  fetchInspectors();
                } else {
                  toast.error(data.error || 'Failed to create');
                }
              } catch (e) {
                console.error(e);
                toast.error('Failed to create inspector');
              } finally { setLoading(false); }
            }}>Create Inspector</button>
          </div>
        </div>
      )}

      <div className="p-6">
        {inspectors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No inspectors assigned yet.</p>
            <p className="text-sm mt-2">Add inspectors to help monitor vendor compliance.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inspectors.map((inspector) => (
              <div
                key={inspector._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900">
                        {inspector.userId.fullName}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(inspector.status)}`}>
                        {inspector.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {inspector.designation}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Employee ID: {inspector.employeeId}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-full">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Total Inspections</p>
                    <p className="font-semibold text-gray-900">
                      {inspector.totalInspections}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Last Inspection</p>
                    <p className="font-semibold text-gray-900 text-xs">
                      {inspector.lastInspectionDate 
                        ? new Date(inspector.lastInspectionDate).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>

                {inspector.contactNumber && (
                  <div className="mt-3 text-sm text-gray-600">
                    <span className="text-xs">📞 {inspector.contactNumber}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

