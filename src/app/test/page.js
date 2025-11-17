"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useApiClient } from "@/hooks/useApiClient";

const ReactPdfView = dynamic(
  () => import("@/components/preview/ReactPdfView"),
  {
    ssr: false,
  }
);

export default function TestPage() {
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiClient = useApiClient();

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const profileResponse = await apiClient("/api/user/profile");

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          if (data && data.mainResume) {
            setResumeData(data.mainResume.content);
          }
        } else {
          console.error("Failed to fetch profile");
        }
      } catch (err) {
        console.error("An unexpected error occurred while fetching data.", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, [apiClient]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <p className="text-2xl">Loading master resume...</p>
      </div>
    );
  }

  if (!resumeData) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex justify-center items-center">
        <p className="text-2xl text-red-500">
          Master resume not found. Please upload a master resume in your
          profile.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">
        PDF View Comparison
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[80vh]">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-center">
            React-PDF View
          </h2>
          <div className="w-full h-full bg-white">
            <ReactPdfView resumeData={resumeData} template="Classic" />
          </div>
        </div>
      </div>
    </div>
  );
}