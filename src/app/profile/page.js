"use client";

import { useState, useEffect } from "react";
import { useApiClient } from "@/hooks/useApiClient";
import ResumeUpload from "@/components/profile/ResumeUpload";
import TemplateViewer from "@/components/preview/TemplateViewer";
import { FeatureAccessService } from "@/services/featureAccessService";
import { ROLES, PLANS } from "@/lib/constants";

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

  const [createNewResume, setCreateNewResume] = useState(false);
  const [userRole, setUserRole] = useState(100); // Default to USER role
  
  const hasAiEditAccess = FeatureAccessService.hasAccess('EDIT_RESUME_WITH_AI', userRole);
  const hasCreateNewResumeAccess = FeatureAccessService.hasAccess('CREATE_NEW_RESUME_ON_EDIT', userRole);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await apiClient("/api/user/profile");

        if (response.ok) {
          const data = await response.json();
          setName(data.name || "");
          setUserRole(data.role !== undefined ? data.role : 100);
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
        body: JSON.stringify({ resume: masterResume, query: aiEditQuery, createNewResume }),
      });

      if (response.ok) {
        const data = await response.json();
        setMasterResume(data);
        setSuccess("Resume updated successfully with AI!");
        setShowAiEditor(false);
        setAiEditQuery("");
        setCreateNewResume(false);
      } else {
        const data = await response.json();
        setError(data.error || "Failed to edit resume with AI.");
      }
    } catch (err) {
      setError("An unexpected error occurred during AI edit.");
    }

    setEditing(false);
  };


  const [activeTab, setActiveTab] = useState("details");
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if (userRole === 99) { // Subscriber
      // Fetch subscription details if needed, or just use user data
      // For now, we'll derive from user data we already have or fetch if missing
    }
  }, [userRole]);

  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: 'PRO', // Use constant or ID
        }),
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to initiate checkout");
      }
    } catch (err) {
      setError("Failed to initiate checkout");
    }
  };

  const handleManageSubscription = async () => {
     try {
      const response = await fetch('/api/checkout/create-portal-session', {
        method: 'POST',
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to open billing portal");
      }
    } catch (err) {
      setError("Failed to open billing portal");
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-8 text-center">Your Profile</h1>
      
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800 rounded-lg p-1 flex space-x-2">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === "details" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-4 py-2 rounded-md transition-colors ${
              activeTab === "subscription" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            Subscription
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          {activeTab === "details" && (
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
              {hasAiEditAccess && (
                <button
                  onClick={() => setShowAiEditor(!showAiEditor)}
                  className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                >
                  {showAiEditor ? "Cancel AI Edit" : "Edit with AI"}
                </button>
              )}
              {!hasAiEditAccess && (
                <div className="w-full mt-4 bg-gray-700 text-gray-400 font-bold py-2 px-4 rounded text-center">
                  Edit with AI (Pro Feature)
                </div>
              )}
              {showAiEditor && (
                <div className="mt-4">
                  <textarea
                    className="w-full h-24 bg-gray-700 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Describe the changes you want to make..."
                    value={aiEditQuery}
                    onChange={(e) => setAiEditQuery(e.target.value)}
                  ></textarea>
                  
                  <div className="mt-4 flex items-center">
                    <input
                      type="checkbox"
                      id="createNewResume"
                      checked={createNewResume}
                      onChange={(e) => setCreateNewResume(e.target.checked)}
                      disabled={!hasCreateNewResumeAccess}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="createNewResume" className="ml-2 text-sm font-medium text-gray-300">
                      Create new resume version {!hasCreateNewResumeAccess && <span className="text-yellow-500 text-xs ml-1">(Pro Feature)</span>}
                    </label>
                  </div>

                  <button
                    onClick={handleAiEdit}
                    disabled={editing}
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
                  >
                    {editing ? "Editing..." : "Submit AI Edit"}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-full">
              <h2 className="text-2xl font-bold mb-6 text-center">
                Subscription Plan
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gray-700 p-6 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">
                        {userRole === ROLES.ADMIN ? 'Admin Plan' : (userRole === ROLES.SUBSCRIBER ? 'Pro Plan' : 'Free Plan')}
                      </h3>
                      <p className="text-gray-400 text-sm mt-1">
                        {userRole === ROLES.ADMIN ? 'Full system access with unlimited credits' : (userRole === ROLES.SUBSCRIBER ? 'Unlimited access to all features' : 'Basic access with daily limits')}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      userRole === ROLES.ADMIN ? 'bg-purple-500/20 text-purple-400' : (userRole === ROLES.SUBSCRIBER ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400')
                    }`}>
                      {userRole === ROLES.ADMIN ? 'ADMIN' : (userRole === ROLES.SUBSCRIBER ? 'ACTIVE' : 'CURRENT')}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Credits</span>
                      <span className="font-medium text-white">
                        {userRole === ROLES.ADMIN ? 'Unlimited' : (userRole === ROLES.SUBSCRIBER ? `${PLANS.PRO.credits} / month` : `${PLANS.FREE.credits} / day`)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Reset Period</span>
                      <span className="font-medium text-white">
                        {userRole === ROLES.ADMIN ? 'N/A' : (userRole === ROLES.SUBSCRIBER ? 'Monthly' : 'Daily')}
                      </span>
                    </div>
                  </div>

                  {userRole !== ROLES.SUBSCRIBER && userRole !== ROLES.ADMIN && (
                    <button
                      onClick={handleUpgrade}
                      className="w-full mt-6 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg"
                    >
                      Upgrade to Pro ($13.99/mo)
                    </button>
                  )}
                  
                  {userRole === ROLES.SUBSCRIBER && (
                    <button
                      onClick={handleManageSubscription}
                      className="w-full mt-6 bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                    >
                      Manage Subscription
                    </button>
                  )}
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-white mb-3">Plan Features</h4>
                  <ul className="space-y-2 text-sm text-gray-300">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      AI Resume Editing
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create New Versions
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className={`w-4 h-4 ${userRole === ROLES.SUBSCRIBER || userRole === ROLES.ADMIN ? 'text-green-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={userRole !== ROLES.SUBSCRIBER && userRole !== ROLES.ADMIN ? 'text-gray-500' : ''}>Priority Support (Pro)</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <ResumeUpload parsing={parsing} handleFileUpload={handleFileUpload} />
        </div>
        <div>{masterResume && <TemplateViewer resume={masterResume} />}</div>
      </div>
    </div>
  );
}
