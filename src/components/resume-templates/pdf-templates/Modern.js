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

// // Using a modern, clean, sans-serif font
// Font.register({
//   family: 'Lato',
//   fonts: [
//     { src: 'https://fonts.gstatic.com/s/lato/v16/S6uyw4BMUTPHjx4wWw.ttf', fontWeight: 400 },
//     { src: 'https://fonts.gstatic.com/s/lato/v16/S6u9w4BMUTPHh6UCMw.ttf', fontWeight: 700 },
//   ],
// });

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    // fontFamily: 'Lato',
  },
  leftColumn: {
    flexDirection: "column",
    width: "30%",
    padding: "20px 20px",
    backgroundColor: "#2C3E50",
    color: "white",
  },
  rightColumn: {
    flexDirection: "column",
    width: "70%",
    padding: "20px 20px",
  },
  header: {
    textAlign: "center",
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  title: {
    fontSize: 14,
    marginBottom: 10,
  },
  contactInfo: {
    marginBottom: 20,
  },
  contactItem: {
    fontSize: 10,
    marginBottom: 5,
  },
  link: {
    color: "#4A90E2",
    textDecoration: "none",
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#BDC3C7",
    paddingBottom: 5,
    textTransform: "uppercase",
  },
  leftSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#7F8C8D",
    paddingBottom: 5,
    textTransform: "uppercase",
    color: "white",
  },
  content: {
    fontSize: 10,
    lineHeight: 1.4,
  },
  job: {
    marginBottom: 15,
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: "bold",
  },
  company: {
    fontSize: 10,
    fontStyle: "italic",
    marginBottom: 5,
  },
  date: {
    fontSize: 9,
    color: "#555",
    marginBottom: 5,
  },
  jobDetails: {
    paddingLeft: 10,
  },
  bullet: {
    fontSize: 10,
    lineHeight: 1.4,
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
    fontStyle: "italic",
  },
  skillList: {
    fontSize: 10,
    lineHeight: 1.5,
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

const ModernTemplate = ({ resumeData }) => {
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
        <View style={styles.leftColumn}>
          <View style={styles.header}>
            <Text style={styles.name}>{profile.full_name || "Your Name"}</Text>
            <Text style={styles.title}>{profile.title || "Your Title"}</Text>
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactItem}>{profile.email}</Text>
            <Text style={styles.contactItem}>{profile.phone}</Text>
            <Text style={styles.contactItem}>{profile.location}</Text>
            {profile.website && (
              <Link
                src={profile.website}
                style={[styles.contactItem, styles.link]}
              >
                {profile.website}
              </Link>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.leftSectionTitle}>Skills</Text>
            <Text style={styles.skillList}>{skillList.join(", ")}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.leftSectionTitle}>Education</Text>
            {education.map((edu, index) => (
              <View key={index} style={styles.educationItem}>
                <Text style={styles.degree}>{edu.degree}</Text>
                <Text style={styles.institution}>{edu.institution}</Text>
                <Text style={styles.date}>
                  {formatDate(edu.start_date)} -{" "}
                  {edu.is_current ? "Present" : formatDate(edu.end_date)}
                </Text>
              </View>
            ))}
          </View>

          {languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.leftSectionTitle}>Languages</Text>
              <Text style={styles.content}>{languages.join(", ")}</Text>
            </View>
          )}
        </View>

        <View style={styles.rightColumn}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.content}>{profile.generic_summary}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {work_experience.map((job, index) => (
              <View key={index} style={styles.job}>
                <Text style={styles.jobTitle}>{job.job_title}</Text>
                <Text style={styles.company}>{job.company}</Text>
                <Text style={styles.date}>
                  {formatDate(job.start_date)} -{" "}
                  {job.is_current ? "Present" : formatDate(job.end_date)}
                </Text>
                <View style={styles.jobDetails}>
                  {job.responsibilities.map((resp, i) => (
                    <Text key={i} style={styles.bullet}>
                      • {resp}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {certifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certifications</Text>
              <Text style={styles.content}>{certifications.join(", ")}</Text>
            </View>
          )}

          {awards_activities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Awards & Activities</Text>
              <Text style={styles.content}>{awards_activities.join(", ")}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
};

export default ModernTemplate;
