"use client";

import { useState, useEffect } from "react";
import { useApiClient } from "@/hooks/useApiClient";
import ResumeUpload from "@/components/profile/ResumeUpload";
import TemplateViewer from "@/components/preview/TemplateViewer";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [masterResume, setMasterResume] = useState(null);
  const [showAiEditor, setShowAiEditor] = useState(false);
  const [aiEditQuery, setAiEditQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const apiClient = useApiClient();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiClient("/api/user/profile");

        if (response.ok) {
          const data = await response.json();
          setName(data.name || "");
          if (data.dateOfBirth) {
            setDateOfBirth(
              new Date(data.dateOfBirth).toISOString().split("T")[0]
            );
          }
          if (data.mainResume) {
            setMasterResume(data.mainResume.content);
          }
        } else {
          const data = await response.json();
          setError(data.error || "Failed to fetch profile");
        }
      } catch (err) {
        setError("An unexpected error occurred.");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [apiClient]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, dateOfBirth }),
      });

      if (response.ok) {
        setSuccess("Profile updated successfully!");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    }

    setLoading(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setParsing(true);
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("resumeFile", file);

    try {
      const response = await apiClient("/api/parse-resume", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess("Resume parsed successfully!");

        const profileResponse = await apiClient("/api/user/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mainResume: data }),
        });

        if (profileResponse.ok) {
          const updatedUser = await profileResponse.json();
          setMasterResume(updatedUser.mainResume.content);
        }
      } else {
        const data = await response.json();
        setError(data.error || "Failed to parse resume.");
      }
    } catch (err) {
      setError("An unexpected error occurred during resume parsing.");
    } finally {
      setParsing(false);
    }
  };

  const handleAiEdit = async () => {
    setEditing(true);
    setError("");
    setSuccess("");

    try {
      const response = await apiClient("/api/edit-resume-with-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resume: masterResume, query: aiEditQuery }),
      });

      if (response.ok) {
        const data = await response.json();
        setMasterResume(data);
        setSuccess("Resume updated successfully with AI!");
        setShowAiEditor(false);
        setAiEditQuery("");
      } else {
        const data = await response.json();
        setError(data.error || "Failed to edit resume with AI.");
      }
    } catch (err) {
      setError("An unexpected error occurred during AI edit.");
    }

    setEditing(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Your Profile</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Your Details
            </h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            {success && <p className="text-green-500 mb-4">{success}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="mb-4">
                <label htmlFor="dateOfBirth" className="block mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                  className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </form>
            <button
              onClick={() => setShowAiEditor(!showAiEditor)}
              className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
            >
              {showAiEditor ? "Cancel AI Edit" : "Edit with AI"}
            </button>
            {showAiEditor && (
              <div className="mt-4">
                <textarea
                  className="w-full h-24 bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Describe the changes you want to make..."
                  value={aiEditQuery}
                  onChange={(e) => setAiEditQuery(e.target.value)}
                ></textarea>
                <button
                  onClick={handleAiEdit}
                  disabled={editing}
                  className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
                >
                  {editing ? "Editing..." : "Submit AI Edit"}
                </button>
              </div>
            )}
          </div>
          <ResumeUpload parsing={parsing} handleFileUpload={handleFileUpload} />
        </div>
        <div>{masterResume && <TemplateViewer resume={masterResume} />}</div>
      </div>
    </div>
  );
}
