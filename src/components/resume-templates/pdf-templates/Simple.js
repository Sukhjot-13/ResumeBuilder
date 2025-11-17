import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Link,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: "50px",
    // fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
    backgroundColor: "#fff",
    color: "#000",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  contactLine: {
    fontSize: 10,
    marginBottom: 20,
    color: "#333",
  },
  link: {
    color: "#000",
    textDecoration: "underline",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  job: {
    marginBottom: 15,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  company: {
    fontSize: 10,
  },
  date: {
    fontSize: 10,
    color: "#555",
  },
  bullet: {
    flexDirection: "row",
    marginLeft: 10,
    marginTop: 5,
  },
  bulletChar: {
    marginRight: 5,
  },
  bulletText: {
    flex: 1,
  },
  educationItem: {
    marginBottom: 10,
  },
  degree: {
    fontSize: 11,
    fontWeight: "bold",
  },
  institution: {
    fontSize: 10,
  },
  skills: {
    fontSize: 10,
  },
});

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [year, month] = dateStr.split("-");
  if (month) {
    const monthName = new Date(
      Date.parse(year + "-" + month + "-01")
    ).toLocaleString("default", { month: "short" });
    return `${monthName} ${year}`;
  }
  return year;
};

const SimpleTemplate = ({ resumeData }) => {
  const {
    profile = {},
    work_experience = [],
    education = [],
    skills = {},
    additional_info = {},
  } = resumeData;
  const {
    languages = [],
    certifications = [],
    awards_activities = [],
  } = additional_info;
  const skillList = skills.list_of_skills || [];

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{profile.full_name || "Your Name"}</Text>
        <Text style={styles.contactLine}>
          {profile.email} | {profile.phone} | {profile.location}
          {profile.website && (
            <>
              {" "}
              |{" "}
              <Link src={profile.website} style={styles.link}>
                {profile.website}
              </Link>
            </>
          )}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text>{profile.generic_summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {work_experience.map((job, index) => (
            <View key={index} style={styles.job}>
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{job.job_title}</Text>
                <Text style={styles.date}>
                  {formatDate(job.start_date)} -{" "}
                  {job.is_current ? "Present" : formatDate(job.end_date)}
                </Text>
              </View>
              <Text style={styles.company}>{job.company}</Text>
              {job.responsibilities.map((resp, i) => (
                <View key={i} style={styles.bullet}>
                  <Text style={styles.bulletChar}>-</Text>
                  <Text style={styles.bulletText}>{resp}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {education.map((edu, index) => (
            <View key={index} style={styles.educationItem}>
              <View style={styles.jobHeader}>
                <Text style={styles.degree}>
                  {edu.degree} in {edu.field_of_study}
                </Text>
                <Text style={styles.date}>
                  {formatDate(edu.start_date)} -{" "}
                  {edu.is_current ? "Present" : formatDate(edu.end_date)}
                </Text>
              </View>
              <Text style={styles.institution}>{edu.institution}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <Text style={styles.skills}>{skillList.join(", ")}</Text>
        </View>

        {(languages.length > 0 ||
          certifications.length > 0 ||
          awards_activities.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            {languages.length > 0 && (
              <Text>- Languages: {languages.join(", ")}</Text>
            )}
            {certifications.length > 0 && (
              <Text>- Certifications: {certifications.join(", ")}</Text>
            )}
            {awards_activities.length > 0 && (
              <Text>- Awards: {awards_activities.join(", ")}</Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default SimpleTemplate;
