"use client";

import { useState, useEffect } from "react";
import { useApiClient } from "@/hooks/useApiClient";
import ResumeUpload from "@/components/profile/ResumeUpload";
import ManualResumeForm from "@/components/profile/ManualResumeForm";
import PremiumFeatureLock from "@/components/common/PremiumFeatureLock";
import PermissionGate from "@/components/common/PermissionGate";
import TemplateViewer from "@/components/preview/TemplateViewer";
import { ROLES, PLANS, PERMISSIONS } from "@/lib/constants";
import { checkPermission, getPermissionMetadata } from "@/lib/accessControl";

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [masterResume, setMasterResume] = useState(null);
  const [showAiEditor, setShowAiEditor] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [deletingMaster, setDeletingMaster] = useState(false);
  const [confirmDeleteMaster, setConfirmDeleteMaster] = useState(false);
  const [aiEditQuery, setAiEditQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const apiClient = useApiClient();

  const [createNewResume, setCreateNewResume] = useState(false);
  const [userRole, setUserRole] = useState(ROLES.USER);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);

  // Format a date string using LOCAL calendar parts (avoids UTC off-by-one-day)
  const formatLocalDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  
  const hasAiEditAccess = checkPermission({ role: userRole }, PERMISSIONS.EDIT_RESUME_WITH_AI);
  const hasCreateNewResumeAccess = checkPermission({ role: userRole }, PERMISSIONS.CREATE_NEW_RESUME_ON_EDIT);
  const canParseResume = checkPermission({ role: userRole }, PERMISSIONS.PARSE_RESUME);
  const canEditProfile = checkPermission({ role: userRole }, PERMISSIONS.EDIT_OWN_PROFILE);

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
            setDateOfBirth(formatLocalDate(data.dateOfBirth));
          }
          setSubscriptionInfo({
            status: data.subscriptionStatus || "none",
            expiresAt: data.subscriptionExpiresAt || null,
            creditsRemaining: data.creditsRemaining,
            creditsUsed: data.creditsUsed || 0,
          });
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

  const handleDeleteMasterResume = async () => {
    setDeletingMaster(true);
    setError("");
    setSuccess("");
    try {
      const res = await apiClient("/api/resumes/master", { method: "DELETE" });
      if (res.ok) {
        setMasterResume(null);
        setConfirmDeleteMaster(false);
        setSuccess("Master resume deleted.");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete resume.");
      }
    } catch {
      setError("An unexpected error occurred.");
    }
    setDeletingMaster(false);
  };

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

  const handleUpgrade = async () => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planName: 'PRO',
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
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (portalLoading) return;
    setPortalLoading(true);
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
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="container mx-auto px-6 pt-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 mb-3">
            Account Management
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
            Profile & Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Manage your personal credentials, master resume data, and subscription tier.
          </p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1 rounded-xl bg-slate-900/90 border border-white/[0.08] shadow-inner">
            <button
              onClick={() => setActiveTab("details")}
              className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "details"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Details & Resume
            </button>
            <button
              onClick={() => setActiveTab("subscription")}
              className={`px-6 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "subscription"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Plan & Credits
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className={`${masterResume && activeTab === 'details' ? 'lg:col-span-6' : 'lg:col-span-8 lg:col-start-3'} space-y-6`}>
            {activeTab === "details" && (
              <>
                {/* Account Details Form */}
                <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/[0.08] space-y-6">
                  <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.08]">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Personal Credentials</h2>
                      <p className="text-[11px] text-slate-400">Used for resume headers and generation</p>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {success && (
                    <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{success}</span>
                    </div>
                  )}

                  {canEditProfile ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full app-input px-3.5 py-2.5 text-xs sm:text-sm text-white"
                          placeholder="Your legal name"
                        />
                      </div>
                      <div>
                        <label htmlFor="dateOfBirth" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          id="dateOfBirth"
                          value={dateOfBirth}
                          onChange={(e) => setDateOfBirth(e.target.value)}
                          required
                          className="w-full app-input px-3.5 py-2.5 text-xs sm:text-sm text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-2.5 px-4 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
                      >
                        {loading ? "Saving Changes..." : "Save Credentials"}
                      </button>
                    </form>
                  ) : (
                    <PremiumFeatureLock
                      featureName={getPermissionMetadata(PERMISSIONS.EDIT_OWN_PROFILE)?.name || "Edit Profile"}
                      description={getPermissionMetadata(PERMISSIONS.EDIT_OWN_PROFILE)?.description}
                      planName={getPermissionMetadata(PERMISSIONS.EDIT_OWN_PROFILE)?.requiredPlan}
                      variant="compact"
                    />
                  )}
                </div>

                {/* Master Resume Manager */}
                <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/[0.08] space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-white">Master Resume Base</h2>
                        <p className="text-[11px] text-slate-400">
                          {masterResume ? "Baseline configured and ready" : "No baseline resume uploaded"}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {masterResume && !confirmDeleteMaster && (
                        <button
                          onClick={() => setConfirmDeleteMaster(true)}
                          className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        onClick={() => setShowManualForm((v) => !v)}
                        className="btn-secondary px-3 py-1.5 text-xs font-semibold rounded-lg"
                      >
                        {showManualForm ? "Close Form" : masterResume ? "Edit Details" : "Add Manually"}
                      </button>
                    </div>
                  </div>

                  {confirmDeleteMaster && (
                    <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <span className="text-rose-300">Are you sure? This cannot be undone.</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setConfirmDeleteMaster(false)}
                          className="px-2.5 py-1 text-xs text-slate-300 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDeleteMasterResume}
                          disabled={deletingMaster}
                          className="px-3 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                        >
                          {deletingMaster ? "Deleting..." : "Confirm Delete"}
                        </button>
                      </div>
                    </div>
                  )}

                  {showManualForm && (
                    <div className="pt-2">
                      <ManualResumeForm
                        initialData={masterResume || undefined}
                        onSaved={(saved) => {
                          setMasterResume(saved.content);
                          setShowManualForm(false);
                          setSuccess("Master resume updated!");
                        }}
                      />
                    </div>
                  )}

                  {canParseResume ? (
                    <div className="pt-2">
                      <ResumeUpload parsing={parsing} handleFileUpload={handleFileUpload} />
                    </div>
                  ) : (
                    <PremiumFeatureLock
                      featureName={getPermissionMetadata(PERMISSIONS.PARSE_RESUME)?.name || "AI Resume Parsing"}
                      description={getPermissionMetadata(PERMISSIONS.PARSE_RESUME)?.description}
                      planName={getPermissionMetadata(PERMISSIONS.PARSE_RESUME)?.requiredPlan}
                    />
                  )}
                </div>
              </>
            )}

            {activeTab === "subscription" && (
              <div className="glass-card p-6 sm:p-8 rounded-2xl border border-white/[0.08] space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-white">Current Subscription</h2>
                      <p className="text-[11px] text-slate-400">Plan limits, renewals, and billing</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    userRole === ROLES.ADMIN
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : userRole === ROLES.SUBSCRIBER
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {userRole === ROLES.ADMIN ? 'Admin' : (userRole === ROLES.SUBSCRIBER ? 'Pro Plan' : 'Free Tier')}
                  </span>
                </div>

                {/* Credit Usage Progress */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-medium">Credits Remaining</span>
                    <span className="font-bold text-white">
                      {userRole === ROLES.ADMIN
                        ? 'Unlimited'
                        : `${subscriptionInfo?.creditsRemaining ?? 0} available`}
                    </span>
                  </div>
                  {userRole !== ROLES.ADMIN && (
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(5, ((subscriptionInfo?.creditsRemaining || 0) / (userRole === ROLES.SUBSCRIBER ? PLANS.PRO.credits : PLANS.FREE.credits)) * 100))}%`
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Reset period: {userRole === ROLES.SUBSCRIBER ? 'Monthly' : 'Daily'}</span>
                    {subscriptionInfo?.expiresAt && (
                      <span>Renews: {formatLocalDate(subscriptionInfo.expiresAt)}</span>
                    )}
                  </div>
                </div>

                {/* Upgrade or Manage Billing */}
                {userRole !== ROLES.SUBSCRIBER && userRole !== ROLES.ADMIN && (
                  <>
                    <div className="p-4 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/20 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                        What you get with {PLANS.PRO.name}
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-300">
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          <span>{PLANS.PRO.credits} generation credits / month (vs {PLANS.FREE.credits} / day)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          <span>Custom AI instructions for tailored generation</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          <span>AI resume editor with version history</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          <span>Cover letter generator + resume upload parsing</span>
                        </li>
                      </ul>
                      <a href="/pricing" className="inline-block text-xs font-semibold text-indigo-300 hover:text-indigo-200 transition-colors">
                        Compare plans →
                      </a>
                    </div>
                    <button
                      onClick={handleUpgrade}
                      disabled={checkoutLoading}
                      className="w-full btn-primary py-3 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                    >
                      {checkoutLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Opening Stripe Checkout...
                        </span>
                      ) : (
                        `Upgrade to ${PLANS.PRO.name} ($${PLANS.PRO.price}/${PLANS.PRO.interval})`
                      )}
                    </button>
                  </>
                )}

                {userRole === ROLES.SUBSCRIBER && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="w-full btn-secondary py-3 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-2"
                  >
                    {portalLoading ? 'Opening Stripe Customer Portal...' : 'Manage Billing & Invoices'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Master Resume Preview */}
          {masterResume && activeTab === "details" && (
            <div className="lg:col-span-6 glass-card p-6 rounded-2xl border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">Master Resume Preview</h2>
                    <p className="text-[11px] text-slate-400">Baseline document representation</p>
                  </div>
                </div>
              </div>
              <TemplateViewer resume={masterResume} user={{ role: userRole }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

