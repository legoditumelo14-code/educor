import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  Building2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  School,
  ShieldCheck,
  Target,
  UsersRound,
} from "lucide-react";

const outcomes = [
  { label: "Pilot launch", value: "Free", detail: "Start with lessons and assignments" },
  { label: "Teacher plan", value: "R99", detail: "Monthly tools for active classes" },
  { label: "Retention focus", value: "Progress", detail: "Keep learners moving week by week" },
];

const businessStages = [
  {
    icon: Target,
    title: "Acquire",
    text: "A clear promise for learners and educators: structured lessons, measurable progress, and a simple start.",
  },
  {
    icon: BookOpenCheck,
    title: "Activate",
    text: "New users land inside practical tools immediately: lessons, tasks, class content, and role-based access.",
  },
  {
    icon: ClipboardCheck,
    title: "Retain",
    text: "Assignments, due dates, and progress views give learners a reason to return and teachers a reason to upgrade.",
  },
  {
    icon: Building2,
    title: "Expand",
    text: "Educor can grow from single teachers to training teams and institutions without changing the core product.",
  },
];

const audienceCards = [
  {
    icon: GraduationCap,
    title: "For learners",
    text: "A guided place to keep lessons, assignments, and progress in one view so study time feels organised.",
  },
  {
    icon: School,
    title: "For educators",
    text: "A lightweight class workspace for publishing content, assigning work, and checking learner momentum.",
  },
  {
    icon: Briefcase,
    title: "For training teams",
    text: "A partner-ready product story for teams that need repeatable onboarding, reporting, and delivery.",
  },
];

const planCards = [
  {
    name: "Starter",
    price: "R0",
    note: "Validate demand",
    features: ["Learner account", "Access to shared lessons", "Assignment visibility"],
  },
  {
    name: "Educator",
    price: "R99/mo",
    note: "Convert active teachers",
    features: ["Create lessons", "Manage assignments", "Track class progress"],
    highlighted: true,
  },
  {
    name: "Institution",
    price: "Custom",
    note: "Grow partnerships",
    features: ["Team rollout", "Programme reporting", "Dedicated onboarding"],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <>
      <Head>
        <title>Educor | Learning progress for learners and educators</title>
        <meta
          name="description"
          content="Educor helps learners, teachers, and training teams manage lessons, assignments, and measurable learning progress."
          key="description"
        />
      </Head>

      <main className="min-h-screen bg-[#f8fbfa] text-[#17211f]">
        <header className="sticky top-0 z-30 border-b border-[#dbe7e2] bg-[#f8fbfa]/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135d54] text-white">
                <GraduationCap size={20} aria-hidden="true" />
              </span>
              Educor
            </Link>

            <nav className="hidden items-center gap-7 text-sm font-medium text-[#4f625d] md:flex">
              <a href="#model" className="hover:text-[#135d54]">
                Model
              </a>
              <a href="#audiences" className="hover:text-[#135d54]">
                Audiences
              </a>
              <a href="#plans" className="hover:text-[#135d54]">
                Plans
              </a>
            </nav>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[#135d54] hover:bg-[#e5f2ef] sm:inline-flex"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[#d85435] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#bb462c]"
              >
                Start free
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </header>

        <section className="relative isolate flex min-h-[88vh] items-center overflow-hidden border-b border-[#dbe7e2]">
          <Image
            src="/illustrations/hero-learning.svg"
            alt=""
            width={960}
            height={720}
            priority
            className="pointer-events-none absolute bottom-0 right-[-170px] z-0 w-[760px] max-w-none opacity-20 md:right-[-80px] md:opacity-35 lg:right-0"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f8fbfa] to-transparent" />

          <motion.div
            className="relative z-10 mx-auto grid w-full max-w-7xl gap-10 px-5 py-20 md:px-8"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.p
              variants={fadeUp}
              className="max-w-max rounded-full border border-[#b7d5ce] bg-white/80 px-4 py-2 text-sm font-semibold text-[#135d54]"
            >
              Learning delivery with a business model behind it
            </motion.p>
            <motion.div variants={fadeUp} className="max-w-3xl">
              <h1 className="text-5xl font-bold leading-[1.02] tracking-normal text-[#17211f] md:text-7xl">
                Educor
              </h1>
              <p className="mt-6 max-w-2xl text-xl leading-8 text-[#42524e] md:text-2xl">
                A focused learning platform for turning lessons, assignments, and progress tracking into a product learners keep using and educators can pay for.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#135d54] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#0f4942]"
              >
                Create an account
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                href="#plans"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[#b7d5ce] bg-white px-6 py-3 font-semibold text-[#135d54] transition hover:border-[#135d54]"
              >
                Compare plans
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="grid max-w-4xl gap-3 pt-6 sm:grid-cols-3"
              aria-label="Educor business outcomes"
            >
              {outcomes.map((outcome) => (
                <div key={outcome.label} className="rounded-lg border border-[#dbe7e2] bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase text-[#6c7d78]">{outcome.label}</p>
                  <p className="mt-2 text-2xl font-bold text-[#17211f]">{outcome.value}</p>
                  <p className="mt-1 text-sm text-[#52645f]">{outcome.detail}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        <section id="model" className="bg-white px-5 py-20 md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase text-[#d85435]">Business alignment</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-5xl">
                Built around the path from trial to paid teaching workflow.
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {businessStages.map((stage) => {
                const Icon = stage.icon;
                return (
                  <motion.article
                    key={stage.title}
                    className="rounded-lg border border-[#dbe7e2] bg-[#f8fbfa] p-5"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e5f2ef] text-[#135d54]">
                      <Icon size={22} aria-hidden="true" />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold">{stage.title}</h3>
                    <p className="mt-3 leading-7 text-[#52645f]">{stage.text}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="audiences" className="border-y border-[#dbe7e2] bg-[#eef7f4] px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase text-[#135d54]">Who it serves</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-5xl">
                One offer, three buying conversations.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#52645f]">
                The site now speaks to the people who influence Educor growth: learners who need structure, educators who need tools, and organisations that need repeatable learning delivery.
              </p>
            </div>

            <div className="grid gap-4">
              {audienceCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-lg border border-[#c9ded8] bg-white p-5 shadow-sm">
                    <div className="flex gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#ffe8dd] text-[#d85435]">
                        <Icon size={22} aria-hidden="true" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{card.title}</h3>
                        <p className="mt-2 leading-7 text-[#52645f]">{card.text}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 md:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
            <div className="order-2 lg:order-1">
              <Image
                src="/illustrations/onlineclass.svg"
                alt="Online class illustration"
                width={680}
                height={500}
                className="mx-auto h-auto w-full max-w-xl"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-sm font-semibold uppercase text-[#d85435]">Product proof</p>
              <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-5xl">
                The logged-in app now matches the public promise.
              </h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: UsersRound, title: "Role-based access", text: "Learners and teachers see the right actions." },
                  { icon: Clock, title: "Due-date workflow", text: "Assignments give learning a weekly rhythm." },
                  { icon: ShieldCheck, title: "Session awareness", text: "Accounts stay protected during inactivity." },
                  { icon: ClipboardCheck, title: "Progress visibility", text: "The dashboard reinforces ongoing outcomes." },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-lg border border-[#dbe7e2] bg-[#f8fbfa] p-5">
                      <Icon size={22} className="text-[#135d54]" aria-hidden="true" />
                      <h3 className="mt-4 font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[#52645f]">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="plans" className="bg-[#17211f] px-5 py-20 text-white md:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase text-[#ffb693]">Commercial path</p>
                <h2 className="mt-3 text-3xl font-bold tracking-normal md:text-5xl">
                  Pricing that supports adoption first, then conversion.
                </h2>
              </div>
              <Link
                href="/signup"
                className="inline-flex w-max items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-[#17211f] transition hover:bg-[#e5f2ef]"
              >
                Start free
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {planCards.map((plan) => (
                <article
                  key={plan.name}
                  className={`rounded-lg border p-6 ${
                    plan.highlighted
                      ? "border-[#ffb693] bg-[#24332f]"
                      : "border-white/15 bg-white/5"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-semibold">{plan.name}</h3>
                    {plan.highlighted && (
                      <span className="rounded-full bg-[#ffb693] px-3 py-1 text-xs font-bold uppercase text-[#17211f]">
                        Core offer
                      </span>
                    )}
                  </div>
                  <p className="mt-5 text-4xl font-bold">{plan.price}</p>
                  <p className="mt-2 text-sm uppercase text-white/65">{plan.note}</p>
                  <ul className="mt-6 space-y-3 text-white/82">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <ClipboardCheck size={18} className="mt-0.5 shrink-0 text-[#ffb693]" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#f8fbfa] px-5 py-16 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-lg border border-[#dbe7e2] bg-white p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div>
              <p className="text-sm font-semibold uppercase text-[#135d54]">Ready for validation</p>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                Give every visitor a clearer reason to join Educor.
              </h2>
            </div>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d85435] px-6 py-3 font-semibold text-white transition hover:bg-[#bb462c]"
            >
              Create account
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
