"use client";

export default function CoverLetterDisplayView({ coverLetterData }) {
  if (!coverLetterData) return null;

  const {
    recipientName,
    recipientTitle,
    companyName,
    jobTitle,
    salutation,
    bodyParagraphs,
    closing,
    senderName,
    senderEmail,
  } = coverLetterData;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg h-full overflow-y-auto text-gray-900 max-w-2xl mx-auto">
      {/* Sender Info */}
      {senderName && <p className="font-semibold">{senderName}</p>}
      {senderEmail && <p className="text-sm text-gray-600">{senderEmail}</p>}

      <p className="mt-4 text-sm text-gray-600">
        {new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* Recipient Info */}
      <div className="mt-6">
        <p>{salutation || `Dear ${recipientName || 'Hiring Manager'},`}</p>
      </div>

      {/* Body */}
      <div className="mt-4 space-y-4">
        {Array.isArray(bodyParagraphs) &&
          bodyParagraphs.map((para, i) => (
            <p key={i} className="text-sm leading-relaxed">
              {para}
            </p>
          ))}
      </div>

      {/* Closing */}
      <div className="mt-8">
        <p>{closing || 'Sincerely,'}</p>
        <p className="mt-2 font-semibold">{senderName || 'Applicant'}</p>
      </div>
    </div>
  );
}
