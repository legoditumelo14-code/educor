import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Award, BadgeCheck, ClipboardCheck, Download, RefreshCw, Search, Send, Sparkles } from "lucide-react";
import { auth } from "../../lib/firebase";
import {
  approveCertificate,
  downloadCertificatePdf,
  getCertificatesForStudent,
  getCertificatesForTeacher,
} from "../../lib/certificates";
import type { CourseCertificate } from "../../types/certificate";
import CertificatePreview from "./CertificatePreview";
import CertificateState from "./CertificateState";

interface CertificatesModuleProps {
  role: "student" | "teacher" | null;
}

const skeletonCards = Array.from({ length: 4 }, (_, index) => index);

export default function CertificatesModule({ role }: CertificatesModuleProps) {
  const [certificates, setCertificates] = useState<CourseCertificate[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "pending" | "approved">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  const canApprove = role === "teacher";

  const loadCertificates = async () => {
    setError("");
    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        setCertificates([]);
        return;
      }

      const data =
        role === "teacher" ? await getCertificatesForTeacher(user.uid) : await getCertificatesForStudent(user.uid);
      setCertificates(data);
      setSelectedId((current) => current || data[0]?.id || "");
    } catch {
      setError("Certificates could not be loaded. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadInitialCertificates = async () => {
      try {
        const user = auth.currentUser;
        const data = user
          ? role === "teacher"
            ? await getCertificatesForTeacher(user.uid)
            : await getCertificatesForStudent(user.uid)
          : [];

        if (!mounted) return;
        setCertificates(data);
        setSelectedId(data[0]?.id || "");
      } catch {
        if (mounted) setError("Certificates could not be loaded. Check your connection and try again.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialCertificates();

    return () => {
      mounted = false;
    };
  }, [role]);

  const filteredCertificates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return certificates.filter((certificate) => {
      const matchesSearch =
        !query ||
        [
          certificate.studentEmail,
          certificate.courseTitle,
          certificate.teacherEmail,
          certificate.verificationId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "All" || certificate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [certificates, search, statusFilter]);

  const selectedCertificate =
    filteredCertificates.find((certificate) => certificate.id === selectedId) ?? filteredCertificates[0];
  const pendingCount = certificates.filter((certificate) => certificate.status === "pending").length;
  const approvedCount = certificates.filter((certificate) => certificate.status === "approved").length;

  const handleApprove = async (certificate: CourseCertificate) => {
    const user = auth.currentUser;
    if (!user) return;

    setActionError("");
    setBusyId(certificate.id);

    try {
      await approveCertificate(certificate, {
        uid: user.uid,
        email: user.email || "Educor teacher",
      });
      await loadCertificates();
    } catch {
      setActionError("The certificate could not be approved. Please try again.");
    } finally {
      setBusyId("");
    }
  };

  const shareCertificate = async (certificate: CourseCertificate) => {
    setShareMessage("");
    const shareUrl =
      typeof window === "undefined"
        ? certificate.verificationId
        : `${window.location.origin}/dashboard?certificate=${certificate.verificationId}`;
    const text = `Educor certificate for ${certificate.courseTitle}. Verification ID: ${certificate.verificationId}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Educor Certificate",
          text,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        setShareMessage("Certificate link copied.");
      }
    } catch {
      setShareMessage("Sharing was cancelled.");
    }
  };

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-white/35 bg-[#135d54] p-6 text-white shadow-xl md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.24),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(216,84,53,0.38),_transparent_34%)]" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur">
              <Sparkles size={16} aria-hidden="true" />
              Certificates
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-normal md:text-5xl">
              {canApprove ? "Approve credentials with a polished certificate workflow." : "Collect credentials as courses are completed."}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-white/80">
              Completed courses generate verifiable Educor certificates with preview, sharing, and PDF download.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Certificates", value: certificates.length },
              { label: "Approved", value: approvedCount },
              { label: "Pending", value: pendingCount },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/20 bg-white/15 p-4 backdrop-blur-xl">
                <p className="text-xs font-semibold uppercase text-white/60">{item.label}</p>
                <p className="mt-2 text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {actionError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ffd8c9] bg-[#fff1ec] p-4 text-[#9d321f]">
          <AlertCircle className="mt-0.5 shrink-0" size={20} aria-hidden="true" />
          <p className="font-semibold">{actionError}</p>
        </div>
      )}

      {shareMessage && (
        <div className="rounded-xl border border-[#dbe7e2] bg-white/75 p-4 font-semibold text-[#135d54] shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
          {shareMessage}
        </div>
      )}

      <section className="rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search certificates</span>
            <Search className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by learner, course, teacher, or verification ID"
              className="w-full rounded-lg border border-[#c9ded8] bg-white/90 py-3 pl-10 pr-4 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            />
          </label>

          <label>
            <span className="sr-only">Filter certificate status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "All" | "pending" | "approved")}
              className="w-full rounded-lg border border-[#c9ded8] bg-white/90 px-4 py-3 text-[#17211f] outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
            >
              <option value="All">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending approval</option>
            </select>
          </label>

          <div className="rounded-lg bg-[#eef7f4] px-4 py-3 text-center text-sm font-semibold text-[#135d54]">
            {filteredCertificates.length} {filteredCertificates.length === 1 ? "certificate" : "certificates"}
          </div>
        </div>
      </section>

      {error && (
        <CertificateState
          icon={RefreshCw}
          title="Certificates did not load"
          message={error}
          actionLabel="Try again"
          onAction={loadCertificates}
        />
      )}

      {loading && (
        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {skeletonCards.map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-xl border border-white/45 bg-white/60 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10"
              >
                <div className="h-5 w-32 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="mt-4 h-6 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
                <div className="mt-3 h-4 w-2/3 rounded-full bg-[#dbe7e2] dark:bg-white/10" />
              </div>
            ))}
          </div>
          <div className="h-96 animate-pulse rounded-2xl border border-white/45 bg-white/60 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10" />
        </section>
      )}

      {!loading && !error && certificates.length === 0 && (
        <CertificateState
          icon={Award}
          title={canApprove ? "No certificates to approve yet" : "No certificates yet"}
          message={
            canApprove
              ? "When learners complete courses that require approval, their certificate requests will appear here."
              : "Complete a course from the Courses tab to generate your certificate."
          }
        />
      )}

      {!loading && !error && certificates.length > 0 && filteredCertificates.length === 0 && (
        <CertificateState
          icon={Search}
          title="No certificates match"
          message="Try a broader search term or show all statuses."
          actionLabel="Clear filters"
          onAction={() => {
            setSearch("");
            setStatusFilter("All");
          }}
        />
      )}

      {!loading && !error && selectedCertificate && (
        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-3">
            {filteredCertificates.map((certificate) => (
              <button
                key={certificate.id}
                type="button"
                onClick={() => setSelectedId(certificate.id)}
                className={`w-full rounded-xl border p-4 text-left shadow-sm backdrop-blur-xl transition ${
                  selectedCertificate.id === certificate.id
                    ? "border-[#135d54] bg-[#eef7f4]"
                    : "border-white/45 bg-white/75 hover:border-[#b7d5ce] dark:border-white/10 dark:bg-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-[#d85435]">
                      {certificate.status === "approved" ? "Approved" : "Pending approval"}
                    </p>
                    <h3 className="mt-2 font-bold">{certificate.courseTitle}</h3>
                    <p className="mt-1 text-sm text-[#52645f] dark:text-white/65">{certificate.studentEmail}</p>
                  </div>
                  {certificate.status === "approved" ? (
                    <BadgeCheck className="text-[#135d54]" size={20} aria-hidden="true" />
                  ) : (
                    <ClipboardCheck className="text-[#d85435]" size={20} aria-hidden="true" />
                  )}
                </div>
                <p className="mt-3 break-all rounded-lg bg-white/80 px-3 py-2 text-xs font-semibold text-[#52645f] dark:bg-white/10 dark:text-white/70">
                  {certificate.verificationId}
                </p>
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <CertificatePreview certificate={selectedCertificate} />

            <div className="flex flex-col gap-3 rounded-xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl md:flex-row md:items-center md:justify-between dark:border-white/10 dark:bg-white/10">
              <div>
                <p className="text-sm font-semibold text-[#52645f] dark:text-white/65">Verification ID</p>
                <p className="mt-1 break-all text-lg font-bold">{selectedCertificate.verificationId}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {canApprove && selectedCertificate.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedCertificate)}
                    disabled={busyId === selectedCertificate.id}
                    className="inline-flex items-center gap-2 rounded-full bg-[#135d54] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4942] disabled:opacity-60"
                  >
                    <BadgeCheck size={16} aria-hidden="true" />
                    Approve
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => downloadCertificatePdf(selectedCertificate)}
                  disabled={selectedCertificate.status !== "approved"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#eef7f4] px-4 py-2 text-sm font-semibold text-[#135d54] transition hover:bg-[#dbe7e2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={16} aria-hidden="true" />
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={() => shareCertificate(selectedCertificate)}
                  disabled={selectedCertificate.status !== "approved"}
                  className="inline-flex items-center gap-2 rounded-full bg-[#ffe8dd] px-4 py-2 text-sm font-semibold text-[#9d321f] transition hover:bg-[#ffd8c9] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send size={16} aria-hidden="true" />
                  Share
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
