import React from "react";
import { Page, Text, View, Document, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 60,
    fontSize: 11,
    lineHeight: 1.6,
    fontFamily: "Helvetica",
    color: "#000",
  },
  senderName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 2,
  },
  senderEmail: {
    fontSize: 10,
    color: "#444",
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: "#444",
    marginBottom: 20,
  },
  recipientLine: {
    fontSize: 11,
    marginBottom: 2,
  },
  salutation: {
    fontSize: 11,
    marginTop: 20,
    marginBottom: 14,
  },
  bodyParagraph: {
    fontSize: 11,
    marginBottom: 10,
    textAlign: "justify",
  },
  closing: {
    fontSize: 11,
    marginTop: 20,
  },
  signatureName: {
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 4,
  },
});

export default function CoverLetterTemplate({ coverLetterData }) {
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
  } = coverLetterData || {};

  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {senderName && <Text style={styles.senderName}>{senderName}</Text>}
        {senderEmail && <Text style={styles.senderEmail}>{senderEmail}</Text>}

        <Text style={styles.date}>{today}</Text>

        {recipientName && (
          <Text style={styles.recipientLine}>{recipientName}</Text>
        )}
        {recipientTitle && (
          <Text style={styles.recipientLine}>{recipientTitle}</Text>
        )}
        {companyName && (
          <Text style={styles.recipientLine}>{companyName}</Text>
        )}

        <Text style={styles.salutation}>
          {salutation || `Dear ${recipientName || "Hiring Manager"},`}
        </Text>

        {Array.isArray(bodyParagraphs) &&
          bodyParagraphs.map((para, i) => (
            <Text key={i} style={styles.bodyParagraph}>
              {para}
            </Text>
          ))}

        <Text style={styles.closing}>{closing || "Sincerely,"}</Text>
        <Text style={styles.signatureName}>{senderName || "Applicant"}</Text>
      </Page>
    </Document>
  );
}
