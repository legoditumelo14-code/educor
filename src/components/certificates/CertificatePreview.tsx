import { Award, BadgeCheck } from "lucide-react";
import type { CourseCertificate } from "../../types/certificate";

interface CertificatePreviewProps {
  certificate: CourseCertificate;
}

const formatDate = (millis: number) => {
  if (!millis) return "Pending approval";
  return new Date(millis).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
};

export default function CertificatePreview({ certificate }: CertificatePreviewProps) {
  const approved = certificate.status === "approved";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/45 bg-white/75 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/10">
      <div className="relative aspect-[1.38] min-h-[360px] overflow-hidden rounded-xl bg-[#f8fbfa] p-6 text-[#17211f] shadow-inner sm:p-8">
        <div className="absolute inset-0 border-[14px] border-[#135d54]" />
        <div className="absolute inset-[28px] border-2 border-[#d85435]" />
        <div className="absolute right-8 top-8 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#d85435] text-[#135d54]">
          <Award size={42} aria-hidden="true" />
        </div>
        {!approved && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-lg border-4 border-[#d85435] px-8 py-3 text-3xl font-black uppercase text-[#d85435]/35">
            Pending
          </div>
        )}

        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
          <p className="text-sm font-bold uppercase tracking-normal text-[#d85435]">Educor</p>
          <h2 className="mt-4 text-3xl font-bold tracking-normal text-[#135d54] sm:text-5xl">
            Certificate of Completion
          </h2>
          <p className="mt-6 text-sm uppercase tracking-normal text-[#52645f]">Presented to</p>
          <p className="mt-3 max-w-3xl break-words font-serif text-3xl font-bold text-[#17211f] sm:text-5xl">
            {certificate.studentEmail}
          </p>
          <p className="mt-6 max-w-2xl leading-7 text-[#52645f]">
            for successfully completing the Educor course
          </p>
          <p className="mt-3 max-w-3xl text-2xl font-bold text-[#135d54] sm:text-3xl">
            {certificate.courseTitle}
          </p>

          <div className="mt-8 grid w-full max-w-3xl gap-3 text-left text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs font-bold uppercase text-[#6c7d78]">Issued</p>
              <p className="mt-1 font-semibold">{formatDate(certificate.issuedAtMs)}</p>
            </div>
            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs font-bold uppercase text-[#6c7d78]">Verification ID</p>
              <p className="mt-1 break-all font-semibold">{certificate.verificationId}</p>
            </div>
            <div className="rounded-lg bg-white/80 p-3">
              <p className="text-xs font-bold uppercase text-[#6c7d78]">Status</p>
              <p className="mt-1 inline-flex items-center gap-2 font-semibold text-[#135d54]">
                <BadgeCheck size={16} aria-hidden="true" />
                {approved ? "Approved" : "Awaiting approval"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
