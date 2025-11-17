import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Font,
  Link,
} from "@react-pdf/renderer";

// A professional and widely used font
// Font.register({
//   family: 'Open Sans',
//   fonts: [
//     { src: 'https://fonts.gstatic.com/s/opensans/v17/mem8YaGs126MiZpBA-UFVZ0e.ttf', fontWeight: 400 },
//     { src: 'https://fonts.gstatic.com/s/opensans/v17/mem5YaGs126MiZpBA-UN7rgOUw.ttf', fontWeight: 700 },
//   ],
// });

const styles = StyleSheet.create({
  page: {
    padding: "30px 40px",
    // fontFamily: 'Open Sans',
    fontSize: 10,
    color: "#333",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#222",
  },
  contactLine: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 10,
    color: "#555",
  },
  contactSeparator: {
    marginHorizontal: 5,
  },
  link: {
    color: "#0056b3",
    textDecoration: "none",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textTransform: "uppercase",
    marginBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#333",
    paddingBottom: 4,
  },
  content: {
    fontSize: 10,
    lineHeight: 1.5,
  },
  job: {
    marginBottom: 15,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  date: {
    fontSize: 9,
    fontStyle: "italic",
  },
  company: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 8,
  },
  bullet: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bulletChar: {
    marginRight: 5,
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.5,
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
  skillsList: {
    marginTop: 5,
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

const ProfessionalTemplate = ({ resumeData }) => {
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
        <View style={styles.header}>
          <Text style={styles.name}>{profile.full_name || "Your Name"}</Text>
          <View style={styles.contactLine}>
            <Text>{profile.email}</Text>
            <Text style={styles.contactSeparator}>|</Text>
            <Text>{profile.phone}</Text>
            <Text style={styles.contactSeparator}>|</Text>
            <Text>{profile.location}</Text>
            {profile.website && (
              <>
                <Text style={styles.contactSeparator}>|</Text>
                <Link src={profile.website} style={styles.link}>
                  {profile.website}
                </Link>
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.content}>{profile.generic_summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
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
                  <Text style={styles.bulletChar}>•</Text>
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
          <Text style={styles.skillsList}>{skillList.join(", ")}</Text>
        </View>

        {(languages.length > 0 ||
          certifications.length > 0 ||
          awards_activities.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>
            {languages.length > 0 && (
              <Text style={styles.content}>
                <Text style={{ fontWeight: 700 }}>Languages:</Text>{" "}
                {languages.join(", ")}
              </Text>
            )}
            {certifications.length > 0 && (
              <Text style={styles.content}>
                <Text style={{ fontWeight: 700 }}>Certifications:</Text>{" "}
                {certifications.join(", ")}
              </Text>
            )}
            {awards_activities.length > 0 && (
              <Text style={styles.content}>
                <Text style={{ fontWeight: 700 }}>Awards & Activities:</Text>{" "}
                {awards_activities.join(", ")}
              </Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ProfessionalTemplate;
