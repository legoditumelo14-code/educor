import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Course } from "../types/course";
import type { CertificateRecipient, CertificateStatus, CourseCertificate, CourseCompletion } from "../types/certificate";

const certificatesCollection = collection(db, "certificates");
const completionsCollection = collection(db, "courseCompletions");

const toMillis = (value: unknown) => {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();

  const maybeTimestamp = value as Partial<Timestamp>;
  if (typeof maybeTimestamp.toMillis === "function") {
    return maybeTimestamp.toMillis();
  }

  return 0;
};

const createVerificationId = (studentId: string, courseId: string) =>
  `EDU-${studentId.slice(0, 4).toUpperCase()}-${courseId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

const mapCertificate = (id: string, data: DocumentData): CourseCertificate => ({
  id,
  verificationId: typeof data.verificationId === "string" ? data.verificationId : id,
  status: data.status === "pending" ? "pending" : "approved",
  courseId: typeof data.courseId === "string" ? data.courseId : "",
  courseTitle: typeof data.courseTitle === "string" ? data.courseTitle : "Untitled course",
  courseCategory: typeof data.courseCategory === "string" ? data.courseCategory : "General",
  courseLevel: typeof data.courseLevel === "string" ? data.courseLevel : "Self-paced",
  teacherId: typeof data.teacherId === "string" ? data.teacherId : "",
  teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "Educor learner",
  completedAtMs: toMillis(data.completedAt),
  issuedAtMs: toMillis(data.issuedAt),
  approvedAtMs: toMillis(data.approvedAt),
  approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : "",
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const mapCompletion = (id: string, data: DocumentData): CourseCompletion => ({
  id,
  courseId: typeof data.courseId === "string" ? data.courseId : "",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "Educor learner",
  completedAtMs: toMillis(data.completedAt),
});

const sortCertificates = (certificates: CourseCertificate[]) =>
  certificates.sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return b.updatedAtMs - a.updatedAtMs;
  });

export const getAllCertificates = async (): Promise<CourseCertificate[]> => {
  const snapshot = await getDocs(certificatesCollection);
  return sortCertificates(snapshot.docs.map((certificateDoc) => mapCertificate(certificateDoc.id, certificateDoc.data())));
};

export const getCertificatesForStudent = async (studentId: string): Promise<CourseCertificate[]> => {
  const certificatesQuery = query(certificatesCollection, where("studentId", "==", studentId));
  const snapshot = await getDocs(certificatesQuery);
  return sortCertificates(snapshot.docs.map((certificateDoc) => mapCertificate(certificateDoc.id, certificateDoc.data())));
};

export const getCertificatesForTeacher = async (teacherId: string): Promise<CourseCertificate[]> => {
  const certificatesQuery = query(certificatesCollection, where("teacherId", "==", teacherId));
  const snapshot = await getDocs(certificatesQuery);
  return sortCertificates(snapshot.docs.map((certificateDoc) => mapCertificate(certificateDoc.id, certificateDoc.data())));
};

export const getCompletionsForStudent = async (studentId: string): Promise<Record<string, CourseCompletion>> => {
  const completionsQuery = query(completionsCollection, where("studentId", "==", studentId));
  const snapshot = await getDocs(completionsQuery);

  return snapshot.docs.reduce<Record<string, CourseCompletion>>((completionMap, completionDoc) => {
    const completion = mapCompletion(completionDoc.id, completionDoc.data());
    if (completion.courseId) {
      completionMap[completion.courseId] = completion;
    }

    return completionMap;
  }, {});
};

export const completeCourseAndIssueCertificate = async (course: Course, student: CertificateRecipient) => {
  const certificateId = `${student.uid}_${course.id}`;
  const certificateRef = doc(db, "certificates", certificateId);
  const existingCertificate = await getDoc(certificateRef);

  await setDoc(
    doc(db, "courseCompletions", certificateId),
    {
      courseId: course.id,
      studentId: student.uid,
      studentEmail: student.email,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (existingCertificate.exists()) {
    return mapCertificate(existingCertificate.id, existingCertificate.data());
  }

  const status: CertificateStatus = course.certificateApprovalRequired ? "pending" : "approved";

  await setDoc(certificateRef, {
    verificationId: createVerificationId(student.uid, course.id),
    status,
    courseId: course.id,
    courseTitle: course.title,
    courseCategory: course.category,
    courseLevel: course.level,
    teacherId: course.teacherId,
    teacherEmail: course.teacherEmail,
    studentId: student.uid,
    studentEmail: student.email,
    completedAt: serverTimestamp(),
    issuedAt: status === "approved" ? serverTimestamp() : null,
    approvedAt: status === "approved" ? serverTimestamp() : null,
    approvedBy: status === "approved" ? "automatic" : "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const createdCertificate = await getDoc(certificateRef);
  return mapCertificate(createdCertificate.id, createdCertificate.data() ?? {});
};

export const approveCertificate = async (certificate: CourseCertificate, approver: CertificateRecipient) => {
  await updateDoc(doc(db, "certificates", certificate.id), {
    status: "approved",
    issuedAt: certificate.issuedAtMs ? new Date(certificate.issuedAtMs) : serverTimestamp(),
    approvedAt: serverTimestamp(),
    approvedBy: approver.uid,
    updatedAt: serverTimestamp(),
  });
};

const pdfText = (value: string) =>
  value
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

export const createCertificatePdf = (certificate: CourseCertificate) => {
  const issuedDate = certificate.issuedAtMs
    ? new Date(certificate.issuedAtMs).toLocaleDateString()
    : "Pending approval";
  const content = [
    "q",
    "0.075 0.365 0.329 rg 0 0 792 612 re f",
    "0.965 0.984 0.980 rg 34 34 724 544 re f",
    "0.847 0.329 0.208 RG 6 w 54 54 684 504 re S",
    "0.075 0.365 0.329 rg BT /F2 36 Tf 226 500 Td (Certificate of Completion) Tj ET",
    "0.322 0.392 0.373 rg BT /F1 14 Tf 288 462 Td (This certifies that) Tj ET",
    `0.075 0.365 0.329 rg BT /F2 30 Tf 180 410 Td (${pdfText(certificate.studentEmail)}) Tj ET`,
    "0.322 0.392 0.373 rg BT /F1 14 Tf 294 372 Td (has completed) Tj ET",
    `0.847 0.329 0.208 rg BT /F2 24 Tf 164 328 Td (${pdfText(certificate.courseTitle)}) Tj ET`,
    `0.322 0.392 0.373 rg BT /F1 12 Tf 92 268 Td (Level: ${pdfText(certificate.courseLevel)} | Category: ${pdfText(certificate.courseCategory)}) Tj ET`,
    `0.322 0.392 0.373 rg BT /F1 12 Tf 92 238 Td (Teacher: ${pdfText(certificate.teacherEmail)}) Tj ET`,
    `0.322 0.392 0.373 rg BT /F1 12 Tf 92 208 Td (Issued: ${pdfText(issuedDate)}) Tj ET`,
    `0.322 0.392 0.373 rg BT /F1 12 Tf 92 178 Td (Verification ID: ${pdfText(certificate.verificationId)}) Tj ET`,
    "0.075 0.365 0.329 RG 2 w 520 170 150 0 l S",
    "0.322 0.392 0.373 rg BT /F1 11 Tf 534 148 Td (Educor Verification) Tj ET",
    "Q",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
};

export const downloadCertificatePdf = (certificate: CourseCertificate) => {
  const blob = createCertificatePdf(certificate);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${certificate.verificationId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
