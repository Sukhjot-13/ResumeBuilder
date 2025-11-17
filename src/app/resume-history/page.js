
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResumeHistoryPage() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Function to get a cookie by name
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  };

  useEffect(() => {
    const accessToken = getCookie('accessToken');
    if (!accessToken) {
      router.push('/login');
      return;
    }

    const fetchResumes = async () => {
      try {
        const response = await fetch('/api/resumes', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setResumes(data);
        } else {
          const data = await response.json();
          setError(data.error || 'Failed to fetch resumes');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Loading resumes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Your Resumes</h1>
      {resumes.length === 0 ? (
        <p className="text-center">No resumes found. Start by creating one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div key={resume._id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-xl font-semibold mb-2">Resume ID: {resume._id}</h2>
              <p className="text-gray-400">Created At: {new Date(resume.createdAt).toLocaleDateString()}</p>
              {/* You might want to display more details here, e.g., a link to view the resume */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
