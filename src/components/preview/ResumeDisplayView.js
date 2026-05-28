"use client";

export default function ResumeDisplayView({ resumeData }) {
  return (
    <div className="bg-white p-8 rounded-lg shadow-lg h-full overflow-y-auto text-gray-900 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {resumeData.profile.full_name}
          </h3>
          <p className="text-sm text-gray-600">{resumeData.profile.email}</p>
          <p className="text-sm text-gray-600">{resumeData.profile.phone}</p>
          <p className="text-sm text-gray-600">{resumeData.profile.location}</p>
          <p className="text-sm text-gray-600">{resumeData.profile.website}</p>
          <p className="text-sm text-gray-600">{resumeData.profile.headline}</p>
          <p className="mt-4 text-sm text-gray-700 leading-relaxed">
            {resumeData.profile.generic_summary}
          </p>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-1">Work Experience</h4>
          <ul className="mt-3 space-y-4">
            {resumeData.work_experience.map((exp, i) => (
              <li key={i}>
                <p className="font-semibold text-gray-900">
                  {exp.job_title} at {exp.company}
                </p>
                <p className="text-sm text-gray-500">
                  {exp.start_date} - {exp.end_date}
                </p>
                <ul className="list-disc list-inside mt-1 text-sm text-gray-700 space-y-1">
                  {exp.responsibilities.map((resp, j) => (
                    <li key={j}>{resp}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-1">Education</h4>
          <ul className="mt-3 space-y-3">
            {resumeData.education.map((edu, i) => (
              <li key={i}>
                <p className="font-semibold text-gray-900">{edu.institution}</p>
                <p className="text-sm text-gray-600">
                  {edu.degree} in {edu.field_of_study}
                </p>
                <p className="text-sm text-gray-500">
                  {edu.start_date} - {edu.end_date}
                </p>
                {edu.relevant_coursework && (
                  <p className="text-sm text-gray-500">{edu.relevant_coursework}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-1">Skills</h4>
          <ul className="flex flex-wrap gap-2 mt-3">
            {resumeData.skills.map((skill, i) => (
              <li
                key={i}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {skill.skill_name}
              </li>
            ))}
          </ul>
        </div>
        {resumeData.additional_info && (
          <div>
            <h4 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-1">Additional Information</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              {resumeData.additional_info.languages?.length > 0 && (
                <li>
                  <span className="font-semibold">Languages:</span>{" "}
                  {resumeData.additional_info.languages.join(", ")}
                </li>
              )}
              {resumeData.additional_info.certifications?.length > 0 && (
                <li>
                  <span className="font-semibold">Certifications:</span>{" "}
                  {resumeData.additional_info.certifications.join(", ")}
                </li>
              )}
              {resumeData.additional_info.awards_activities?.length > 0 && (
                <li>
                  <span className="font-semibold">Awards/Activities:</span>{" "}
                  {resumeData.additional_info.awards_activities.join(", ")}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}