import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  GraduationCap,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  UserRoundCheck,
} from "lucide-react";
import clsx from "clsx";
import { auth } from "../../lib/firebase";
import {
  createTutorBooking,
  createTutorReview,
  getTutorBookingsForStudent,
  getTutorBookingsForTeacher,
  getTutorProfileForTeacher,
  getTutorProfiles,
  getTutorReviews,
  saveTutorProfile,
  updateTutorBookingStatus,
} from "../../lib/tutors";
import type {
  TutorBooking,
  TutorBookingFormValues,
  TutorBookingStatus,
  TutorFilters,
  TutorProfile,
  TutorReview,
  TutorReviewFormValues,
  TutorSubject,
} from "../../types/tutor";
import { TUTOR_SUBJECTS } from "../../types/tutor";
import TutorProfileForm from "./TutorProfileForm";
import TutorState from "./TutorState";

interface TutorMarketplaceModuleProps {
  role: "student" | "teacher" | null;
}

const skeletonCards = Array.from({ length: 4 }, (_, index) => index);

const today = () => new Date().toISOString().slice(0, 10);

const defaultBooking = (profile?: TutorProfile): TutorBookingFormValues => ({
  subject: profile?.subjects[0] ?? "Mathematics",
  date: today(),
  startTime: profile?.availability[0]?.startTime ?? "15:00",
  durationMinutes: 60,
  note: "",
});

const defaultReview: TutorReviewFormValues = {
  rating: 5,
  comment: "",
};

const statusStyles: Record<TutorBookingStatus, string> = {
  pending: "bg-[#fff7df] text-[#8a6415]",
  confirmed: "bg-[#eef7f4] text-[#135d54]",
  completed: "bg-[#edf5fb] text-[#2f6f9f]",
  cancelled: "bg-[#fff1ec] text-[#9d321f]",
};

const formatDate = (date: string) => {
  if (!date) return "No date";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const averageRating = (reviews: TutorReview[]) => {
  if (reviews.length === 0) return 0;
  return Math.round((reviews.reduce((total, review) => total + review.rating, 0) / reviews.length) * 10) / 10;
};

const matchesFilters = (profile: TutorProfile, filters: TutorFilters) => {
  const query = filters.search.trim().toLowerCase();
  const matchesSearch =
    !query ||
    [profile.displayName, profile.headline, profile.bio, profile.teacherEmail, profile.subjects.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(query);
  const matchesSubject = filters.subject === "All" || profile.subjects.includes(filters.subject);
  const matchesRate = filters.maxRate === 0 || profile.hourlyRate <= filters.maxRate;

  return profile.active && matchesSearch && matchesSubject && matchesRate;
};

function BookingCard({
  booking,
  canManage,
  busy,
  onStatus,
}: {
  booking: TutorBooking;
  canManage: boolean;
  busy: boolean;
  onStatus: (booking: TutorBooking, status: TutorBookingStatus) => void;
}) {
  return (
    <article className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold">{canManage ? booking.studentEmail : booking.tutorName}</p>
          <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">
            {booking.subject} - {formatDate(booking.date)} at {booking.startTime}
          </p>
          {booking.note && <p className="mt-2 text-sm leading-6 text-[#52645f] dark:text-white/65">{booking.note}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[booking.status]}`}>
          {booking.status}
        </span>
      </div>

      {canManage && booking.status !== "completed" && booking.status !== "cancelled" && (
        <div className="mt-4 flex flex-wrap gap-2">
          {(["confirmed", "completed", "cancelled"] as TutorBookingStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onStatus(booking, status)}
              disabled={busy}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#52645f] transition hover:text-[#135d54] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

function TutorCard({
  profile,
  reviews,
  selected,
  canBook,
  bookingValues,
  reviewValues,
  busy,
  onSelect,
  onBookingChange,
  onReviewChange,
  onBook,
  onReview,
}: {
  profile: TutorProfile;
  reviews: TutorReview[];
  selected: boolean;
  canBook: boolean;
  bookingValues: TutorBookingFormValues;
  reviewValues: TutorReviewFormValues;
  busy: boolean;
  onSelect: (profile: TutorProfile) => void;
  onBookingChange: (values: TutorBookingFormValues) => void;
  onReviewChange: (values: TutorReviewFormValues) => void;
  onBook: (event: FormEvent<HTMLFormElement>, profile: TutorProfile) => void;
  onReview: (event: FormEvent<HTMLFormElement>, profile: TutorProfile) => void;
}) {
  const rating = averageRating(reviews);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className={clsx(
        "rounded-xl border p-5 shadow-sm backdrop-blur-xl transition",
        selected
          ? "border-[#135d54] bg-[#eef7f4]"
          : "border-white/45 bg-white/75 dark:border-white/10 dark:bg-white/10"
      )}
    >
      <button type="button" onClick={() => onSelect(profile)} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[#d85435]">{profile.subjects.join(", ")}</p>
            <h3 className="mt-2 text-2xl font-bold">{profile.displayName}</h3>
            <p className="mt-1 font-semibold text-[#52645f] dark:text-white/70">{profile.headline}</p>
          </div>
          <div className="rounded-xl bg-[#135d54] px-4 py-3 text-right text-white">
            <p className="text-xs font-bold uppercase text-white/65">Rate</p>
            <p className="text-xl font-bold">${profile.hourlyRate}/h</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-3 leading-7 text-[#52645f] dark:text-white/65">{profile.bio}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#135d54]">
            <Star size={13} aria-hidden="true" />
            {rating || "New"} ({reviews.length})
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#52645f]">
            <FileCheck2 size={13} aria-hidden="true" />
            {profile.qualifications.length} qualifications
          </span>
        </div>
      </button>

      {selected && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
            <h4 className="font-bold">Availability</h4>
            <div className="mt-3 space-y-2">
              {profile.availability.length === 0 ? (
                <p className="text-sm text-[#52645f] dark:text-white/65">No slots listed.</p>
              ) : (
                profile.availability.map((slot) => (
                  <p key={slot.id} className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#52645f]">
                    {slot.day}: {slot.startTime} - {slot.endTime}
                  </p>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#dbe7e2] bg-[#f8fbfa] p-4 dark:border-white/10 dark:bg-white/5">
            <h4 className="font-bold">Payment placeholder</h4>
            <p className="mt-2 text-sm leading-6 text-[#52645f] dark:text-white/65">
              Card capture, escrow, payouts, and refunds can connect here when payments are enabled.
            </p>
          </section>

          {canBook && (
            <>
              <form onSubmit={(event) => onBook(event, profile)} className="rounded-xl border border-[#dbe7e2] bg-white p-4">
                <h4 className="font-bold">Book a session</h4>
                <div className="mt-3 grid gap-3">
                  <select
                    value={bookingValues.subject}
                    onChange={(event) => onBookingChange({ ...bookingValues, subject: event.target.value as TutorSubject })}
                    className="rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                  >
                    {profile.subjects.map((subject) => (
                      <option key={subject} value={subject}>
                        {subject}
                      </option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={bookingValues.date}
                      onChange={(event) => onBookingChange({ ...bookingValues, date: event.target.value })}
                      className="rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                    />
                    <input
                      type="time"
                      value={bookingValues.startTime}
                      onChange={(event) => onBookingChange({ ...bookingValues, startTime: event.target.value })}
                      className="rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                    />
                  </div>
                  <select
                    value={bookingValues.durationMinutes}
                    onChange={(event) => onBookingChange({ ...bookingValues, durationMinutes: Number(event.target.value) })}
                    className="rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                  <textarea
                    value={bookingValues.note}
                    onChange={(event) => onBookingChange({ ...bookingValues, note: event.target.value })}
                    placeholder="Learning goals or context"
                    className="min-h-20 rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-full bg-[#135d54] px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Booking..." : "Request booking"}
                  </button>
                </div>
              </form>

              <form onSubmit={(event) => onReview(event, profile)} className="rounded-xl border border-[#dbe7e2] bg-white p-4">
                <h4 className="font-bold">Leave a review</h4>
                <div className="mt-3 grid gap-3">
                  <select
                    value={reviewValues.rating}
                    onChange={(event) => onReviewChange({ ...reviewValues, rating: Number(event.target.value) })}
                    className="rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                  >
                    {[5, 4, 3, 2, 1].map((ratingOption) => (
                      <option key={ratingOption} value={ratingOption}>
                        {ratingOption} stars
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={reviewValues.comment}
                    onChange={(event) => onReviewChange({ ...reviewValues, comment: event.target.value })}
                    placeholder="Share what helped"
                    className="min-h-20 rounded-lg border border-[#c9ded8] px-3 py-2 text-[#17211f]"
                  />
                  <button
                    type="submit"
                    disabled={busy || !reviewValues.comment.trim()}
                    className="rounded-full bg-[#edf5fb] px-4 py-2 font-bold text-[#2f6f9f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save review
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </motion.article>
  );
}

export default function TutorMarketplaceModule({ role }: TutorMarketplaceModuleProps) {
  const [profiles, setProfiles] = useState<TutorProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<TutorProfile | null>(null);
  const [bookings, setBookings] = useState<TutorBooking[]>([]);
  const [reviews, setReviews] = useState<TutorReview[]>([]);
  const [selectedTutorId, setSelectedTutorId] = useState("");
  const [filters, setFilters] = useState<TutorFilters>({ search: "", subject: "All", maxRate: 0 });
  const [bookingValues, setBookingValues] = useState<TutorBookingFormValues>(() => defaultBooking());
  const [reviewValues, setReviewValues] = useState<TutorReviewFormValues>(defaultReview);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const canTutor = role === "teacher";
  const canBook = role !== "teacher";

  const loadMarketplace = async () => {
    const user = auth.currentUser;
    setError("");
    setLoading(true);

    try {
      const [profileData, reviewData] = await Promise.all([getTutorProfiles(), getTutorReviews()]);
      setProfiles(profileData);
      setReviews(reviewData);
      setSelectedTutorId((current) => current || profileData[0]?.id || "");

      if (user && canTutor) {
        const teacherProfile = await getTutorProfileForTeacher(user.uid);
        setCurrentProfile(teacherProfile);
        setBookings(await getTutorBookingsForTeacher(user.uid));
      } else if (user) {
        setBookings(await getTutorBookingsForStudent(user.uid));
      }
    } catch {
      setError("Tutor marketplace could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialMarketplace = async () => {
      const user = auth.currentUser;

      try {
        const [profileData, reviewData] = await Promise.all([getTutorProfiles(), getTutorReviews()]);
        if (!mounted) return;

        setProfiles(profileData);
        setReviews(reviewData);
        setSelectedTutorId((current) => current || profileData[0]?.id || "");

        if (user && role === "teacher") {
          const teacherProfile = await getTutorProfileForTeacher(user.uid);
          const teacherBookings = await getTutorBookingsForTeacher(user.uid);
          if (mounted) {
            setCurrentProfile(teacherProfile);
            setBookings(teacherBookings);
          }
        } else if (user) {
          const studentBookings = await getTutorBookingsForStudent(user.uid);
          if (mounted) setBookings(studentBookings);
        }
      } catch {
        if (mounted) setError("Tutor marketplace could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialMarketplace();

    return () => {
      mounted = false;
    };
  }, [role]);

  const reviewsByTutor = useMemo(
    () =>
      reviews.reduce<Record<string, TutorReview[]>>((reviewMap, review) => {
        reviewMap[review.tutorId] = [...(reviewMap[review.tutorId] ?? []), review];
        return reviewMap;
      }, {}),
    [reviews]
  );

  const filteredProfiles = useMemo(
    () => profiles.filter((profile) => matchesFilters(profile, filters)),
    [filters, profiles]
  );

  const activeTutors = useMemo(() => profiles.filter((profile) => profile.active).length, [profiles]);
  const averageRate = useMemo(
    () => Math.round(profiles.reduce((total, profile) => total + profile.hourlyRate, 0) / Math.max(profiles.length, 1)),
    [profiles]
  );

  const handleProfileSubmit = async (values: Parameters<typeof saveTutorProfile>[0]) => {
    const user = auth.currentUser;
    setActionError("");

    if (!user || !canTutor) {
      setActionError("Only teacher accounts can create tutor profiles.");
      return;
    }

    try {
      setSubmitting(true);
      await saveTutorProfile(values, { uid: user.uid, email: user.email || "Educor tutor" }, currentProfile);
      await loadMarketplace();
    } catch {
      setActionError("Tutor profile could not be saved. Check uploads and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectTutor = (profile: TutorProfile) => {
    setSelectedTutorId(profile.id);
    setBookingValues(defaultBooking(profile));
    setReviewValues(defaultReview);
  };

  const handleBooking = async (event: FormEvent<HTMLFormElement>, profile: TutorProfile) => {
    event.preventDefault();
    const user = auth.currentUser;
    setActionError("");

    if (!user) {
      setActionError("Sign in again before booking a tutor.");
      return;
    }

    try {
      setBusyId(profile.id);
      await createTutorBooking(profile, bookingValues, { uid: user.uid, email: user.email || "Educor student" });
      await loadMarketplace();
    } catch {
      setActionError("Booking request could not be sent. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const handleReview = async (event: FormEvent<HTMLFormElement>, profile: TutorProfile) => {
    event.preventDefault();
    const user = auth.currentUser;
    setActionError("");

    if (!user || !reviewValues.comment.trim()) return;

    try {
      setBusyId(profile.id);
      await createTutorReview(profile, reviewValues, { uid: user.uid, email: user.email || "Educor student" });
      setReviewValues(defaultReview);
      await loadMarketplace();
    } catch {
      setActionError("Review could not be saved. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const handleBookingStatus = async (booking: TutorBooking, status: TutorBookingStatus) => {
    setBusyId(booking.id);
    setActionError("");

    try {
      await updateTutorBookingStatus(booking, status);
      await loadMarketplace();
    } catch {
      setActionError("Booking status could not be updated.");
    } finally {
      setBusyId("");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <section className="h-72 animate-pulse rounded-2xl border border-white/35 bg-[#135d54]/80 shadow-xl" />
        <section className="grid gap-4 xl:grid-cols-2">
          {skeletonCards.map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
            />
          ))}
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <TutorState
        icon={RefreshCw}
        title="Marketplace did not load"
        message={error}
        actionLabel="Try again"
        onAction={loadMarketplace}
      />
    );
  }

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.38),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Tutor Marketplace
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              Discover verified tutors, book sessions, and build trusted learning support.
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Tutor profiles, pricing, availability, bookings, reviews, and payment placeholders live in one polished marketplace.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Active tutors", value: activeTutors },
              { label: "Bookings", value: bookings.length },
              { label: "Avg rate", value: `$${averageRate}` },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {canTutor && (
        <TutorProfileForm
          key={currentProfile?.id ?? "new-tutor-profile"}
          profile={currentProfile}
          submitting={submitting}
          onSubmit={handleProfileSubmit}
        />
      )}

      {actionError && (
        <section className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-4">
          <section className="grid gap-3 rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl lg:grid-cols-[1fr_190px_160px] lg:items-center dark:border-white/10 dark:bg-white/10">
            <label className="relative">
              <span className="sr-only">Search tutors</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6c7d78]"
                size={17}
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search tutors"
                className="w-full rounded-full border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
              />
            </label>

            <select
              value={filters.subject}
              onChange={(event) => setFilters((current) => ({ ...current, subject: event.target.value as TutorFilters["subject"] }))}
              className="rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            >
              <option value="All">All subjects</option>
              {TUTOR_SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <input
              type="number"
              min={0}
              value={filters.maxRate}
              onChange={(event) => setFilters((current) => ({ ...current, maxRate: Number(event.target.value) }))}
              placeholder="Max rate"
              className="rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </section>

          {filteredProfiles.length === 0 ? (
            <TutorState
              icon={GraduationCap}
              title="No tutors match your filters"
              message="Adjust the subject, search, or rate filter to discover more tutor profiles."
            />
          ) : (
            <motion.section layout className="grid gap-4">
              <AnimatePresence initial={false}>
                {filteredProfiles.map((profile) => (
                  <TutorCard
                    key={profile.id}
                    profile={profile}
                    reviews={reviewsByTutor[profile.id] ?? []}
                    selected={selectedTutorId === profile.id}
                    canBook={canBook}
                    bookingValues={bookingValues}
                    reviewValues={reviewValues}
                    busy={busyId === profile.id}
                    onSelect={handleSelectTutor}
                    onBookingChange={setBookingValues}
                    onReviewChange={setReviewValues}
                    onBook={handleBooking}
                    onReview={handleReview}
                  />
                ))}
              </AnimatePresence>
            </motion.section>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">{canTutor ? "Booking requests" : "Your sessions"}</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">
                  {canTutor ? "Incoming learner bookings." : "Requested tutor sessions."}
                </p>
              </div>
              <CalendarCheck className="text-[#135d54]" size={22} aria-hidden="true" />
            </div>

            <div className="mt-5 space-y-3">
              {bookings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#b7d5ce] bg-[#f8fbfa] p-4 text-sm font-semibold text-[#52645f] dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                  No bookings yet.
                </p>
              ) : (
                bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    canManage={canTutor}
                    busy={busyId === booking.id}
                    onStatus={handleBookingStatus}
                  />
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-white/45 bg-white/75 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf5fb] text-[#2f6f9f]">
                <CreditCard size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-bold">Payments placeholder</h2>
                <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">Future checkout, payouts, invoices, and refunds.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {["Checkout intent", "Tutor payout", "Refund workflow"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl bg-[#f8fbfa] p-3 dark:bg-white/5">
                  <CheckCircle2 className="text-[#135d54]" size={18} aria-hidden="true" />
                  <p className="text-sm font-bold text-[#52645f] dark:text-white/70">{item}</p>
                </div>
              ))}
            </div>
          </section>

          {canTutor && currentProfile && (
            <section className="rounded-xl border border-[#135d54] bg-[#eef7f4] p-5 text-[#135d54] shadow-sm">
              <div className="flex items-center gap-3">
                <UserRoundCheck size={22} aria-hidden="true" />
                <div>
                  <h2 className="font-bold">Profile live</h2>
                  <p className="mt-1 text-sm">{currentProfile.active ? "Visible in marketplace" : "Hidden from marketplace"}</p>
                </div>
              </div>
            </section>
          )}

          {submitting && (
            <section className="flex items-center gap-3 rounded-xl border border-white/45 bg-white/75 p-4 text-[#52645f] shadow-sm backdrop-blur-xl">
              <Loader2 className="animate-spin text-[#135d54]" size={18} aria-hidden="true" />
              <p className="font-semibold">Saving marketplace changes...</p>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}
