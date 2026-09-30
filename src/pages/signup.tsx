import type { FormEvent } from "react";
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail, User } from "lucide-react";
import { auth, setUserRole } from "../lib/firebase";

type Role = "student" | "teacher";

const roleNotes: Record<Role, string> = {
  student: "Access lessons, assignments, and your learning progress.",
  teacher: "Create lessons, assign work, and manage class momentum.",
};

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setUserRole(userCredential.user.uid, role);
      router.push("/dashboard");
    } catch {
      setError("We could not create that account. Check your details and try again.");
    }
  };

  return (
    <>
      <Head>
        <title>Create your Educor account</title>
        <meta
          name="description"
          content="Join Educor as a learner or educator to manage lessons, assignments, and progress."
          key="description"
        />
      </Head>

      <main className="grid min-h-screen bg-[#f8fbfa] text-[#17211f] lg:grid-cols-[1fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-[#dbe7e2] bg-[#eef7f4] p-10 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-[#17211f]">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135d54] text-white">
              <GraduationCap size={20} aria-hidden="true" />
            </span>
            Educor
          </Link>

          <div className="relative z-10 max-w-xl">
            <p className="text-sm font-semibold uppercase text-[#d85435]">Start with a clear role</p>
            <h1 className="mt-4 text-5xl font-bold leading-tight tracking-normal">
              Build the learning workspace that matches your plan.
            </h1>
            <p className="mt-5 text-lg leading-8 text-[#52645f]">
              Educor starts simple for learners, then opens paid teaching and class-management tools as your usage grows.
            </p>
          </div>

          <Image
            src="/illustrations/students.svg"
            alt="Students learning together"
            width={680}
            height={520}
            priority
            className="relative z-10 mx-auto h-auto w-full max-w-xl"
          />
        </section>

        <section className="flex items-center justify-center px-5 py-10 md:px-8">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-[#dbe7e2] bg-white p-6 shadow-sm">
            <div className="mb-8">
              <Link href="/" className="mb-8 flex items-center gap-2 font-semibold tracking-tight text-[#17211f] lg:hidden">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135d54] text-white">
                  <GraduationCap size={20} aria-hidden="true" />
                </span>
                Educor
              </Link>
              <p className="text-sm font-semibold uppercase text-[#135d54]">Create account</p>
              <h2 className="mt-2 text-3xl font-bold tracking-normal">Join Educor</h2>
              <p className="mt-3 text-[#52645f]">{roleNotes[role]}</p>
            </div>

            <label className="mb-2 block text-sm font-semibold text-[#34423e]" htmlFor="email">
              Email
            </label>
            <div className="relative mb-4">
              <Mail className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-[#c9ded8] bg-white py-3 pl-10 pr-4 outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <label className="mb-2 block text-sm font-semibold text-[#34423e]" htmlFor="password">
              Password
            </label>
            <div className="relative mb-4">
              <Lock className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
              <input
                id="password"
                type={show ? "text" : "password"}
                placeholder="Create a password"
                className="w-full rounded-lg border border-[#c9ded8] bg-white py-3 pl-10 pr-11 outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShow((value) => !value)}
                className="absolute right-3 top-3 text-[#52645f] hover:text-[#135d54]"
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>

            <label className="mb-2 block text-sm font-semibold text-[#34423e]" htmlFor="role">
              Role
            </label>
            <div className="relative mb-5">
              <User className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
              <select
                id="role"
                className="w-full rounded-lg border border-[#c9ded8] bg-white py-3 pl-10 pr-4 outline-none transition focus:border-[#135d54] focus:ring-2 focus:ring-[#b7d5ce]"
                value={role}
                onChange={(event) => setRole(event.target.value as Role)}
              >
                <option value="student">Learner</option>
                <option value="teacher">Educator</option>
              </select>
            </div>

            {error && <p className="mb-4 rounded-lg bg-[#fff1ec] px-3 py-2 text-sm text-[#9d321f]">{error}</p>}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
            >
              Create account
              <ArrowRight size={18} aria-hidden="true" />
            </button>

            <p className="mt-5 text-center text-sm text-[#52645f]">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-[#135d54] hover:underline">
                Login
              </Link>
            </p>
          </form>
        </section>
      </main>
    </>
  );
}
