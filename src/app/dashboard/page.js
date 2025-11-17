"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApiClient } from "@/hooks/useApiClient";
import JobDescriptionInput from "@/components/home/JobDescriptionInput";
import SpecialInstructionsInput from "@/components/home/SpecialInstructionsInput";
import TemplateViewer from "@/components/preview/TemplateViewer";
import ResumeList from "@/components/ResumeList";

export default function DashboardPage() {
  const [jobDescription, setJobDescription] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [generating, setGenerating] = useState(false);
  const [tailoredResume, setTailoredResume] = useState(null);
  const [profile, setProfile] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
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
      <ResumeList
        resumes={resumes}
        deletingId={deletingId}
        onDeleteResume={handleDeleteResume}
        onViewResume={setTailoredResume}
        loading={loading}
      />
    </div>
  );
}
