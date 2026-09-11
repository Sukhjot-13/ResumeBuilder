"use client";

export default function ResumeDisplayView({ resumeData }) {
  if (!resumeData) return null;

  const profile = resumeData.profile || {};
  const workExperience = resumeData.work_experience || [];
  const education = resumeData.education || [];
  const skills = resumeData.skills || [];
  const additionalInfo = resumeData.additional_info || {};

  return (
    <div className="resume-paper p-8 sm:p-10 max-w-2xl mx-auto overflow-y-auto text-slate-800 text-[13px] leading-relaxed shadow-lg font-sans">
      {/* Header / Contact Info */}
      <div className="text-center pb-5 mb-5 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-1">
          {profile.full_name || "Untitled Resume"}
        </h1>
        {profile.headline && (
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700 mb-2">
            {profile.headline}
          </p>
        )}
        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1 text-xs text-slate-600">
          {profile.email && <span>{profile.email}</span>}
          {profile.phone && (
            <>
              <span className="text-slate-300">&bull;</span>
              <span>{profile.phone}</span>
            </>
          )}
          {profile.location && (
            <>
              <span className="text-slate-300">&bull;</span>
              <span>{profile.location}</span>
            </>
          )}
          {profile.website && (
            <>
              <span className="text-slate-300">&bull;</span>
              <a href={profile.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            </>
          )}
        </div>
        {profile.generic_summary && (
          <p className="mt-3.5 text-xs text-slate-600 max-w-xl mx-auto text-left sm:text-center leading-normal">
            {profile.generic_summary}
          </p>
        )}
      </div>

      <div className="space-y-6">
        {/* Work Experience */}
        {workExperience.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-3 flex items-center justify-between">
              <span>Professional Experience</span>
            </h2>
            <div className="space-y-4">
              {workExperience.map((exp, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{exp.job_title}</span>
                      {exp.company && (
                        <span className="text-slate-700 font-medium"> &mdash; {exp.company}</span>
                      )}
                    </div>
                    {(exp.start_date || exp.end_date) && (
                      <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        {exp.start_date} {exp.start_date && (exp.end_date || exp.is_current) ? "–" : ""}{" "}
                        {exp.is_current ? "Present" : exp.end_date}
                      </span>
                    )}
                  </div>
                  {Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                    <ul className="list-disc list-outside ml-4 text-xs text-slate-700 space-y-1 pt-1">
                      {exp.responsibilities.map((resp, j) => (
                        <li key={j} className="pl-1">
                          {resp}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {education.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-3">
              Education
            </h2>
            <div className="space-y-3">
              {education.map((edu, i) => (
                <div key={i} className="flex flex-col sm:flex-row sm:items-baseline justify-between">
                  <div>
                    <span className="font-bold text-slate-900">
                      {edu.degree} {edu.field_of_study ? `in ${edu.field_of_study}` : ""}
                    </span>
                    {edu.institution && (
                      <span className="text-slate-700"> &mdash; {edu.institution}</span>
                    )}
                    {edu.relevant_coursework && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Coursework: {edu.relevant_coursework}
                      </p>
                    )}
                  </div>
                  {(edu.start_date || edu.end_date) && (
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {edu.start_date} {edu.start_date && edu.end_date ? "–" : ""} {edu.end_date}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
              Key Competencies & Technical Skills
            </h2>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="bg-slate-100 text-slate-800 border border-slate-200/80 px-2.5 py-0.5 rounded text-xs font-medium"
                >
                  {skill.skill_name || skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Additional Info */}
        {(additionalInfo.languages?.length > 0 ||
          additionalInfo.certifications?.length > 0 ||
          additionalInfo.awards_activities?.length > 0) && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-300 pb-1 mb-2.5">
              Additional Information
            </h2>
            <div className="text-xs text-slate-700 space-y-1.5">
              {additionalInfo.languages?.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-900">Languages: </span>
                  <span>{additionalInfo.languages.join(", ")}</span>
                </div>
              )}
              {additionalInfo.certifications?.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-900">Certifications: </span>
                  <span>{additionalInfo.certifications.join(", ")}</span>
                </div>
              )}
              {additionalInfo.awards_activities?.length > 0 && (
                <div>
                  <span className="font-semibold text-slate-900">Honors & Activities: </span>
                  <span>{additionalInfo.awards_activities.join(", ")}</span>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}