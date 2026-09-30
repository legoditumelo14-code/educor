// src/lib/api.ts
import { db } from "./firebase";
import { collection, getDocs, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";

export interface Lesson {
  id: string;
  title: string;
  content: string;
}

const lessonsCol = collection(db, "lessons");

// Get all lessons
export const getLessons = async (): Promise<Lesson[]> => {
  const snapshot = await getDocs(lessonsCol);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Lesson[];
};

// Add lesson
export const addLessonAPI = async (lesson: Omit<Lesson, "id">) => {
  await addDoc(lessonsCol, lesson);
};

// Update lesson
export const updateLessonAPI = async (id: string, lesson: Omit<Lesson, "id">) => {
  const lessonRef = doc(db, "lessons", id);
  await updateDoc(lessonRef, lesson);
};

// Delete lesson
export const deleteLessonAPI = async (id: string) => {
  const lessonRef = doc(db, "lessons", id);
  await deleteDoc(lessonRef);
};