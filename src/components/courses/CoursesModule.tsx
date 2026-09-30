import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, BookOpenCheck, Layers3, RefreshCw, SearchX, Sparkles } from "lucide-react";
import { auth } from "../../lib/firebase";
import {
  completeCourseAndIssueCertificate,
  getCertificatesForStudent,
} from "../../lib/certificates";
import { createCourse, deleteCourse, getCourses, updateCourse } from "../../lib/courses";
import type { CourseCertificate } from "../../types/certificate";
import type { Course, CourseFilters, CourseFormValues } from "../../types/course";
import CourseCard from "./CourseCard";
import CourseFiltersBar from "./CourseFilters";
import CourseForm from "./CourseForm";
import CourseState from "./CourseState";

interface CoursesModuleProps {
  role: "student" | "teacher" | null;
  onCoursesLoaded?: (count: number) => void;
}

const defaultFilters: CourseFilters = {
  search: "",
  category: "All",
  level: "All",
};

const skeletonCards = Array.from({ length: 6 }, (_, index) => index);

export default function CoursesModule({ role, onCoursesLoaded }: CoursesModuleProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [filters, setFilters] = useState<CourseFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [completingId, setCompletingId] = useState("");
  const [studentCertificates, setStudentCertificates] = useState<Record<string, CourseCertificate>>({});
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const loadCourses = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await getCourses();
      setCourses(data);
      onCoursesLoaded?.(data.length);

      const user = auth.currentUser;
      if (role !== "teacher" && user) {
        const certificateData = await getCertificatesForStudent(user.uid);
        setStudentCertificates(
          certificateData.reduce<Record<string, CourseCertificate>>((certificateMap, certificate) => {
            certificateMap[certificate.courseId] = certificate;
            return certificateMap;
          }, {})
        );
      }
    } catch {
      setError("Courses could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialCourses = async () => {
      try {
        const data = await getCourses();
        if (!mounted) return;

        setCourses(data);
        onCoursesLoaded?.(data.length);

        const user = auth.currentUser;
        if (role !== "teacher" && user) {
          const certificateData = await getCertificatesForStudent(user.uid);
          if (!mounted) return;
          setStudentCertificates(
            certificateData.reduce<Record<string, CourseCertificate>>((certificateMap, certificate) => {
              certificateMap[certificate.courseId] = certificate;
              return certificateMap;
            }, {})
          );
        }
      } catch {
        if (mounted) {
          setError("Courses could not be loaded. Check your connection and try again.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadInitialCourses();

    return () => {
      mounted = false;
    };
  }, [onCoursesLoaded, role]);

  const filteredCourses = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return courses.filter((course) => {
      const matchesSearch =
        !search ||
        [course.title, course.description, course.teacherEmail, course.category]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesCategory = filters.category === "All" || course.category === filters.category;
      const matchesLevel = filters.level === "All" || course.level === filters.level;

      return matchesSearch && matchesCategory && matchesLevel;
    });
  }, [courses, filters]);

  const categoryCount = useMemo(() => new Set(courses.map((course) => course.category)).size, [courses]);
  const canManage = role === "teacher";

  const refreshAfterChange = async () => {
    const data = await getCourses();
    setCourses(data);
    onCoursesLoaded?.(data.length);
  };

  const refreshStudentCertificates = async () => {
    const user = auth.currentUser;
    if (!user || canManage) return;

    const certificateData = await getCertificatesForStudent(user.uid);
    setStudentCertificates(
      certificateData.reduce<Record<string, CourseCertificate>>((certificateMap, certificate) => {
        certificateMap[certificate.courseId] = certificate;
        return certificateMap;
      }, {})
    );
  };

  const handleCreate = async (values: CourseFormValues, thumbnail: File | null) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user || !canManage) {
      setActionError("Only logged-in educators can create courses.");
      return;
    }

    setSubmitting(true);
    try {
      await createCourse(
        values,
        {
          uid: user.uid,
          email: user.email || "Educor teacher",
        },
        thumbnail
      );
      await refreshAfterChange();
    } catch {
      setActionError("The course could not be published. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (values: CourseFormValues, thumbnail: File | null) => {
    if (!editingCourse) return;
    setActionError("");
    setSubmitting(true);

    try {
      await updateCourse(editingCourse, values, thumbnail);
      setEditingCourse(null);
      await refreshAfterChange();
    } catch {
      setActionError("The course could not be updated. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;

    setActionError("");
    setDeletingId(course.id);

    try {
      await deleteCourse(course);
      if (editingCourse?.id === course.id) {
        setEditingCourse(null);
      }
      await refreshAfterChange();
    } catch {
      setActionError("The course could not be deleted. Please try again.");
    } finally {
      setDeletingId("");
    }
  };

  const handleCompleteCourse = async (course: Course) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user || canManage) {
      setActionError("Only logged-in learners can complete courses.");
      return;
    }

    setCompletingId(course.id);
    try {
      await completeCourseAndIssueCertificate(course, {
        uid: user.uid,
        email: user.email || "Educor learner",
      });
      await refreshStudentCertificates();
    } catch {
      setActionError("The course could not be completed. Please try again.");
    } finally {
      setCompletingId("");
    }
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.26),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.42),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Courses marketplace
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {canManage ? "Create, curate, and grow course demand." : "Browse structured courses built for momentum."}
            </h1>
            <p className="mt-4 max-w-2xl leading-8 text-white/80">
              Courses give Educor a polished startup-ready catalog: searchable learning paths, clear categories, strong thumbnails, and a teacher workflow that turns content into a product.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Live courses", value: courses.length },
              { label: "Categories", value: categoryCount },
              { label: "Mode", value: canManage ? "Teacher" : "Student" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {canManage && (
        <CourseForm
          key={editingCourse?.id ?? "create-course"}
          mode={editingCourse ? "edit" : "create"}
          initialCourse={editingCourse}
          submitting={submitting}
          onSubmit={editingCourse ? handleUpdate : handleCreate}
          onCancel={editingCourse ? () => setEditingCourse(null) : undefined}
        />
      )}

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </div>
      )}

      <CourseFiltersBar filters={filters} resultCount={filteredCourses.length} onChange={setFilters} />

      {error && (
        <CourseState
          icon={RefreshCw}
          title="Courses did not load"
          message={error}
          actionLabel="Try again"
          onAction={loadCourses}
        />
      )}

      {loading && (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-96 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            >
              <div className="h-44 rounded-t-xl bg-[#dbe7e2] dark:bg-white/10" />
              <div className="space-y-3 p-5">
                <div className="h-4 w-24 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-7 w-3/4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-4 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="h-4 w-5/6 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              </div>
            </div>
          ))}
        </section>
      )}

      {!loading && !error && courses.length === 0 && (
        <CourseState
          icon={Layers3}
          title={canManage ? "Create the first course" : "Courses are coming soon"}
          message={
            canManage
              ? "Publish a course with a thumbnail, category, and clear outcome so students have a polished catalog to browse."
              : "Educators have not published courses yet. Once they do, they will appear here with search and filters."
          }
        />
      )}

      {!loading && !error && courses.length > 0 && filteredCourses.length === 0 && (
        <CourseState
          icon={SearchX}
          title="No courses match your filters"
          message="Try a broader search term, another category, or all levels to bring more courses back into view."
          actionLabel="Clear filters"
          onAction={() => setFilters(defaultFilters)}
        />
      )}

      {!loading && !error && filteredCourses.length > 0 && (
        <motion.section layout className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                canManage={canManage}
                actionBusy={deletingId === course.id || completingId === course.id || submitting}
                certificate={studentCertificates[course.id]}
                onEdit={setEditingCourse}
                onDelete={handleDelete}
                onComplete={handleCompleteCourse}
              />
            ))}
          </AnimatePresence>
        </motion.section>
      )}

      {!loading && !error && filteredCourses.length > 0 && (
        <section className="rounded-xl border border-white/45 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef7f4] text-[#135d54]">
              <BookOpenCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-bold">Catalog health</h3>
              <p className="mt-1 leading-7 text-[#52645f] dark:text-white/70">
                Strong course cards, categories, search, and filters make the catalog useful for students while giving teachers a repeatable publishing workflow.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
