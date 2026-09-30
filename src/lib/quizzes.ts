import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Quiz,
  QuizAnswer,
  QuizAttempt,
  QuizAttemptStatus,
  QuizAuthor,
  QuizFormValues,
  QuizMatchPair,
  QuizOption,
  QuizQuestion,
  QuizQuestionType,
  QuizSubmissionValues,
} from "../types/quiz";

const quizzesCollection = collection(db, "quizzes");
const attemptsCollection = collection(db, "quizAttempts");

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

export const createQuizQuestion = (type: QuizQuestionType = "multiple_choice"): QuizQuestion => ({
  id: createId(),
  type,
  prompt: "",
  points: type === "essay" ? 10 : 1,
  options:
    type === "multiple_choice"
      ? [
          { id: createId(), text: "Option A", isCorrect: true },
          { id: createId(), text: "Option B", isCorrect: false },
        ]
      : type === "true_false"
        ? [
            { id: "true", text: "True", isCorrect: true },
            { id: "false", text: "False", isCorrect: false },
          ]
        : [],
  correctAnswer: "",
  pairs: type === "matching" ? [{ id: createId(), prompt: "", answer: "" }] : [],
});

const normalizeQuestionType = (value: unknown): QuizQuestionType => {
  if (
    value === "multiple_choice" ||
    value === "true_false" ||
    value === "short_answer" ||
    value === "essay" ||
    value === "matching"
  ) {
    return value;
  }

  return "multiple_choice";
};

const normalizeOptions = (options: unknown, type: QuizQuestionType): QuizOption[] => {
  if (type === "true_false") {
    const optionData = Array.isArray(options) ? options : [];
    const trueOption = optionData.find((option) => option?.id === "true") as Partial<QuizOption> | undefined;

    return [
      { id: "true", text: "True", isCorrect: trueOption?.isCorrect !== false },
      { id: "false", text: "False", isCorrect: trueOption?.isCorrect === false },
    ];
  }

  if (!Array.isArray(options)) return [];

  return options
    .map((option): QuizOption | null => {
      if (!option || typeof option !== "object") return null;
      const data = option as Partial<QuizOption>;

      return {
        id: typeof data.id === "string" ? data.id : createId(),
        text: typeof data.text === "string" ? data.text : "",
        isCorrect: Boolean(data.isCorrect),
      };
    })
    .filter((option): option is QuizOption => Boolean(option));
};

const normalizePairs = (pairs: unknown): QuizMatchPair[] => {
  if (!Array.isArray(pairs)) return [];

  return pairs
    .map((pair): QuizMatchPair | null => {
      if (!pair || typeof pair !== "object") return null;
      const data = pair as Partial<QuizMatchPair>;

      return {
        id: typeof data.id === "string" ? data.id : createId(),
        prompt: typeof data.prompt === "string" ? data.prompt : "",
        answer: typeof data.answer === "string" ? data.answer : "",
      };
    })
    .filter((pair): pair is QuizMatchPair => Boolean(pair));
};

const normalizeQuestions = (questions: unknown): QuizQuestion[] => {
  if (!Array.isArray(questions)) return [];

  return questions.map((question): QuizQuestion => {
    const data = question && typeof question === "object" ? (question as Partial<QuizQuestion>) : {};
    const type = normalizeQuestionType(data.type);

    return {
      id: typeof data.id === "string" ? data.id : createId(),
      type,
      prompt: typeof data.prompt === "string" ? data.prompt : "",
      points: typeof data.points === "number" && data.points > 0 ? data.points : 1,
      options: normalizeOptions(data.options, type),
      correctAnswer: typeof data.correctAnswer === "string" ? data.correctAnswer : "",
      pairs: normalizePairs(data.pairs),
    };
  });
};

const mapQuiz = (id: string, data: DocumentData): Quiz => ({
  id,
  title: typeof data.title === "string" ? data.title : "Untitled quiz",
  description: typeof data.description === "string" ? data.description : "",
  teacherId: typeof data.teacherId === "string" ? data.teacherId : "",
  teacherEmail: typeof data.teacherEmail === "string" ? data.teacherEmail : "Educor teacher",
  timeLimitMinutes: typeof data.timeLimitMinutes === "number" ? data.timeLimitMinutes : 15,
  randomizeQuestions: Boolean(data.randomizeQuestions),
  questions: normalizeQuestions(data.questions),
  createdAtMs: toMillis(data.createdAt),
  updatedAtMs: toMillis(data.updatedAt),
});

const normalizeAttemptStatus = (value: unknown): QuizAttemptStatus => {
  if (value === "needs_review") return "needs_review";
  return "submitted";
};

const normalizeAnswers = (answers: unknown): QuizAnswer[] => {
  if (!Array.isArray(answers)) return [];

  return answers
    .map((answer): QuizAnswer | null => {
      if (!answer || typeof answer !== "object") return null;
      const data = answer as Partial<QuizAnswer>;

      return {
        questionId: typeof data.questionId === "string" ? data.questionId : "",
        type: normalizeQuestionType(data.type),
        selectedOptionId: typeof data.selectedOptionId === "string" ? data.selectedOptionId : "",
        responseText: typeof data.responseText === "string" ? data.responseText : "",
        matchingAnswers:
          data.matchingAnswers && typeof data.matchingAnswers === "object"
            ? (data.matchingAnswers as Record<string, string>)
            : {},
        awardedPoints: typeof data.awardedPoints === "number" ? data.awardedPoints : 0,
        maxPoints: typeof data.maxPoints === "number" ? data.maxPoints : 0,
        autoMarked: Boolean(data.autoMarked),
      };
    })
    .filter((answer): answer is QuizAnswer => Boolean(answer));
};

const mapAttempt = (id: string, data: DocumentData): QuizAttempt => ({
  id,
  quizId: typeof data.quizId === "string" ? data.quizId : "",
  quizTitle: typeof data.quizTitle === "string" ? data.quizTitle : "Untitled quiz",
  studentId: typeof data.studentId === "string" ? data.studentId : "",
  studentEmail: typeof data.studentEmail === "string" ? data.studentEmail : "Educor student",
  answers: normalizeAnswers(data.answers),
  score: typeof data.score === "number" ? data.score : 0,
  maxScore: typeof data.maxScore === "number" ? data.maxScore : 0,
  objectiveScore: typeof data.objectiveScore === "number" ? data.objectiveScore : 0,
  objectiveMaxScore: typeof data.objectiveMaxScore === "number" ? data.objectiveMaxScore : 0,
  percentage: typeof data.percentage === "number" ? data.percentage : 0,
  status: normalizeAttemptStatus(data.status),
  startedAtMs: toMillis(data.startedAt),
  submittedAtMs: toMillis(data.submittedAt),
  timeSpentSeconds: typeof data.timeSpentSeconds === "number" ? data.timeSpentSeconds : 0,
});

const normalizeText = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const markQuestion = (
  question: QuizQuestion,
  response: Pick<QuizAnswer, "selectedOptionId" | "responseText" | "matchingAnswers">
): QuizAnswer => {
  let awardedPoints = 0;
  let autoMarked = true;

  if (question.type === "multiple_choice" || question.type === "true_false") {
    const selected = question.options.find((option) => option.id === response.selectedOptionId);
    awardedPoints = selected?.isCorrect ? question.points : 0;
  } else if (question.type === "short_answer") {
    awardedPoints =
      normalizeText(response.responseText) === normalizeText(question.correctAnswer) ? question.points : 0;
  } else if (question.type === "matching") {
    const correctCount = question.pairs.filter(
      (pair) => normalizeText(response.matchingAnswers[pair.id] ?? "") === normalizeText(pair.answer)
    ).length;
    awardedPoints = question.pairs.length
      ? Math.round((correctCount / question.pairs.length) * question.points * 100) / 100
      : 0;
  } else {
    autoMarked = false;
  }

  return {
    questionId: question.id,
    type: question.type,
    selectedOptionId: response.selectedOptionId,
    responseText: response.responseText,
    matchingAnswers: response.matchingAnswers,
    awardedPoints,
    maxPoints: question.points,
    autoMarked,
  };
};

export const gradeQuizSubmission = (quiz: Quiz, values: QuizSubmissionValues) => {
  const answers = quiz.questions.map((question) =>
    markQuestion(question, {
      selectedOptionId: values.answers[question.id]?.selectedOptionId ?? "",
      responseText: values.answers[question.id]?.responseText ?? "",
      matchingAnswers: values.answers[question.id]?.matchingAnswers ?? {},
    })
  );
  const score = answers.reduce((total, answer) => total + answer.awardedPoints, 0);
  const maxScore = quiz.questions.reduce((total, question) => total + question.points, 0);
  const objectiveAnswers = answers.filter((answer) => answer.autoMarked);
  const objectiveScore = objectiveAnswers.reduce((total, answer) => total + answer.awardedPoints, 0);
  const objectiveMaxScore = objectiveAnswers.reduce((total, answer) => total + answer.maxPoints, 0);

  return {
    answers,
    score,
    maxScore,
    objectiveScore,
    objectiveMaxScore,
    percentage: maxScore ? Math.round((score / maxScore) * 100) : 0,
    status: answers.some((answer) => !answer.autoMarked) ? "needs_review" : "submitted",
  };
};

export const getQuizzes = async (): Promise<Quiz[]> => {
  const snapshot = await getDocs(quizzesCollection);

  return snapshot.docs
    .map((quizDoc) => mapQuiz(quizDoc.id, quizDoc.data()))
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
};

export const createQuiz = async (values: QuizFormValues, author: QuizAuthor) => {
  await addDoc(quizzesCollection, {
    title: values.title.trim(),
    description: values.description.trim(),
    teacherId: author.uid,
    teacherEmail: author.email,
    timeLimitMinutes: values.timeLimitMinutes,
    randomizeQuestions: values.randomizeQuestions,
    questions: values.questions,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateQuiz = async (quiz: Quiz, values: QuizFormValues) => {
  await updateDoc(doc(db, "quizzes", quiz.id), {
    title: values.title.trim(),
    description: values.description.trim(),
    timeLimitMinutes: values.timeLimitMinutes,
    randomizeQuestions: values.randomizeQuestions,
    questions: values.questions,
    updatedAt: serverTimestamp(),
  });
};

export const deleteQuiz = async (quiz: Quiz) => {
  const attempts = await getAttemptsForQuiz(quiz.id);

  await deleteDoc(doc(db, "quizzes", quiz.id));
  await Promise.all(attempts.map((attempt) => deleteDoc(doc(db, "quizAttempts", attempt.id))));
};

export const getAttemptsForQuiz = async (quizId: string): Promise<QuizAttempt[]> => {
  const attemptsQuery = query(attemptsCollection, where("quizId", "==", quizId));
  const snapshot = await getDocs(attemptsQuery);

  return snapshot.docs.map((attemptDoc) => mapAttempt(attemptDoc.id, attemptDoc.data()));
};

export const getAllQuizAttempts = async (): Promise<QuizAttempt[]> => {
  const snapshot = await getDocs(attemptsCollection);

  return snapshot.docs.map((attemptDoc) => mapAttempt(attemptDoc.id, attemptDoc.data()));
};

export const getQuizAttemptsForStudent = async (studentId: string): Promise<Record<string, QuizAttempt>> => {
  const attemptsQuery = query(attemptsCollection, where("studentId", "==", studentId));
  const snapshot = await getDocs(attemptsQuery);

  return snapshot.docs.reduce<Record<string, QuizAttempt>>((attemptMap, attemptDoc) => {
    const attempt = mapAttempt(attemptDoc.id, attemptDoc.data());
    if (attempt.quizId) {
      attemptMap[attempt.quizId] = attempt;
    }

    return attemptMap;
  }, {});
};

export const submitQuizAttempt = async (quiz: Quiz, values: QuizSubmissionValues, student: QuizAuthor) => {
  const result = gradeQuizSubmission(quiz, values);

  await addDoc(attemptsCollection, {
    quizId: quiz.id,
    quizTitle: quiz.title,
    studentId: student.uid,
    studentEmail: student.email,
    answers: result.answers,
    score: result.score,
    maxScore: result.maxScore,
    objectiveScore: result.objectiveScore,
    objectiveMaxScore: result.objectiveMaxScore,
    percentage: result.percentage,
    status: result.status,
    startedAt: new Date(values.startedAtMs),
    submittedAt: serverTimestamp(),
    timeSpentSeconds: values.timeSpentSeconds,
  });
};

export const shuffleQuestions = (questions: QuizQuestion[]) =>
  [...questions]
    .map((question) => ({ question, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ question }) => question);
