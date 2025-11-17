"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import JobDescriptionInput from "@/components/home/JobDescriptionInput";
import SpecialInstructionsInput from "@/components/home/SpecialInstructionsInput";
import TemplateViewer from "@/components/preview/TemplateViewer";

export default function DashboardPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const router = useRouter();
  const apiClient = useApiClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch profile
        const profileResponse = await apiClient("/api/user/profile");

        if (profileResponse.ok) {
          const data = await profileResponse.json();
          setProfile(data);
        } else {
          console.error("Failed to fetch profile");
        }

        // Fetch resumes
        const resumesResponse = await apiClient("/api/resumes");

        if (resumesResponse.ok) {
          const data = await resumesResponse.json();
          setResumes(data);
        } else {
          console.error("Failed to fetch resumes");
        }
      } catch (err) {
        console.error("An unexpected error occurred while fetching data.");
      }
    };

    fetchData();
  }, [apiClient]);

  const handleLogout = () => {
    document.cookie =
      "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie =
      "refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  const goToProfile = () => {
    router.push("/profile");
  };

  const goToResumeHistory = () => {
    router.push("/resume-history");
  };

  const handleGenerateResume = async () => {
    setGenerating(true);
    try {
      const generateResponse = await apiClient("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: profile.mainResume.content, // Always send the master resume
          jobDescription,
          specialInstructions,
        }),
      });

      if (generateResponse.ok) {
        const { resume, metadata } = await generateResponse.json();
        setTailoredResume(resume);

        const saveResponse = await apiClient("/api/resumes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: resume, metadata }),
        });

        if (saveResponse.ok) {
          const newResume = await saveResponse.json();
          setResumes([newResume, ...resumes]);
        }
      } else {
        console.error(
          "Error generating resume:",
          await generateResponse.text()
        );
      }
    } catch (error) {
      console.error("Error generating resume:", error);
    }
    setGenerating(false);
  };

  const handleDeleteResume = async (resumeId) => {
    setDeletingId(resumeId);
    try {
      const response = await apiClient(`/api/resumes/${resumeId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setResumes(resumes.filter((resume) => resume._id !== resumeId));
      } else {
        console.error("Error deleting resume:", await response.text());
      }
    } catch (error) {
      console.error("Error deleting resume:", error);
    }
    setDeletingId(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <div className="flex gap-4">
          <button
            onClick={goToProfile}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Profile
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <JobDescriptionInput
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
          />
          <SpecialInstructionsInput
            specialInstructions={specialInstructions}
            setSpecialInstructions={setSpecialInstructions}
            handleGenerateResume={handleGenerateResume}
            generating={generating}
            profile={profile}
          />
        </div>
        <div>
          {tailoredResume && <TemplateViewer resume={tailoredResume} />}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-semibold mb-4">Your Saved Resumes</h2>
        {resumes.length === 0 ? (
          <p>No resumes found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resumes
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((resume) => (
                <div
                  key={resume._id}
                  className="bg-gray-800 p-6 rounded-lg shadow-lg"
                >
                  <h3 className="text-xl font-semibold mb-2">
                    {resume.metadata?.jobTitle || "Resume"}
                  </h3>
                  {resume.metadata?.companyName && (
                    <p className="text-gray-400">
                      Company: {resume.metadata.companyName}
                    </p>
                  )}
                  <p className="text-gray-400">
                    Created At: {new Date(resume.createdAt).toLocaleString()}
                  </p>
                  <div className="flex gap-4 mt-4">
                    <button
                      onClick={() => setTailoredResume(resume.content)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteResume(resume._id)}
                      disabled={deletingId === resume._id}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-gray-500"
                    >
                      {deletingId === resume._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
