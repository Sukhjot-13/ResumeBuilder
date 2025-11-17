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

// A more creative, serif font

const styles = StyleSheet.create({
  page: {
    padding: "30px",
    backgroundColor: "#F4F4F4",
    // fontFamily: 'Playfair Display',
  },
  container: {
    border: "1px solid #B0A8A4",
    padding: "20px",
  },
  header: {
    textAlign: "center",
    marginBottom: 25,
  },
  name: {
    fontSize: 34,
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    color: "#6D6D6D",
    fontStyle: "italic",
  },
  contactInfo: {
    flexDirection: "row",
    justifyContent: "center",
    fontSize: 10,
    marginTop: 10,
    color: "#6D6D6D",
  },
  contactItem: {
    marginHorizontal: 10,
  },
  link: {
    color: "#C3A995",
    textDecoration: "none",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4A4A4A",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  content: {
    fontSize: 11,
    lineHeight: 1.6,
    color: "#555",
    textAlign: "center",
  },
  job: {
    marginBottom: 20,
  },
  jobTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4A4A4A",
  },
  company: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#6D6D6D",
    marginBottom: 5,
  },
  date: {
    fontSize: 10,
    color: "#888",
    marginBottom: 8,
  },
  bullet: {
    fontSize: 11,
    lineHeight: 1.6,
    textAlign: "left",
    marginBottom: 4,
    paddingLeft: 10,
  },
  educationItem: {
    marginBottom: 10,
    textAlign: "center",
  },
  degree: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4A4A4A",
  },
  institution: {
    fontSize: 11,
    color: "#6D6D6D",
  },
  skills: {
    textAlign: "center",
    fontSize: 11,
    color: "#555",
  },
});

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const [year, month] = dateStr.split("-");
  if (month) {
    const monthName = new Date(
      Date.parse(year + "-" + month + "-01")
    ).toLocaleString("default", { month: "long" });
    return `${monthName} ${year}`;
  }
  return year;
};

const CreativeTemplate = ({ resumeData }) => {
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.name}>{profile.full_name || "Your Name"}</Text>
            <Text style={styles.title}>
              {profile.title || "Creative Professional"}
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactItem}>{profile.email}</Text>
              <Text style={styles.contactItem}>-</Text>
              <Text style={styles.contactItem}>{profile.phone}</Text>
              <Text style={styles.contactItem}>-</Text>
              {profile.website && (
                <Link
                  src={profile.website}
                  style={[styles.contactItem, styles.link]}
                >
                  {profile.website}
                </Link>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.content}>{profile.generic_summary}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {work_experience.map((job, index) => (
              <View key={index} style={styles.job}>
                <Text style={styles.jobTitle}>{job.job_title}</Text>
                <Text style={styles.company}>{job.company}</Text>
                <Text style={styles.date}>
                  {formatDate(job.start_date)} -{" "}
                  {job.is_current ? "Present" : formatDate(job.end_date)}
                </Text>
                {job.responsibilities.map((resp, i) => (
                  <Text key={i} style={styles.bullet}>
                    &#8226; {resp}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Text style={styles.degree}>{edu.degree}</Text>
                <Text style={styles.institution}>
                  {edu.institution} ({formatDate(edu.start_date)} -{" "}
                  {edu.is_current ? "Present" : formatDate(edu.end_date)})
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skills}>{skillList.join(" / ")}</Text>
          </View>

          {(languages.length > 0 ||
            certifications.length > 0 ||
            awards_activities.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Extras</Text>
              {languages.length > 0 && (
                <Text style={styles.content}>
                  <Text style={{ fontWeight: "bold" }}>Languages:</Text>{" "}
                  {languages.join(", ")}
                </Text>
              )}
              {certifications.length > 0 && (
                <Text style={styles.content}>
                  <Text style={{ fontWeight: "bold" }}>Certifications:</Text>{" "}
                  {certifications.join(", ")}
                </Text>
              )}
              {awards_activities.length > 0 && (
                <Text style={styles.content}>
                  <Text style={{ fontWeight: "bold" }}>Awards:</Text>{" "}
                  {awards_activities.join(", ")}
                </Text>
              )}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default CreativeTemplate;
