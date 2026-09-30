import type { FormEvent } from "react";
import { useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { browserSessionPersistence, setPersistence, signInWithEmailAndPassword } from "firebase/auth";
import { ArrowRight, Eye, EyeOff, GraduationCap, Lock, Mail } from "lucide-react";
import { auth } from "../lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch {
      setError("Those details did not match an Educor account.");
    }
  };

  return (
    <>
      <Head>
        <title>Login to Educor</title>
        <meta
          name="description"
          content="Log in to Educor to continue lessons, assignments, and progress tracking."
          key="description"
        />
      </Head>

      <main className="grid min-h-screen bg-[#f8fbfa] text-[#17211f] lg:grid-cols-[0.92fr_1fr]">
        <section className="flex items-center justify-center px-5 py-10 md:px-8">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-lg border border-[#dbe7e2] bg-white p-6 shadow-sm">
            <Link href="/" className="mb-8 flex items-center gap-2 font-semibold tracking-tight text-[#17211f]">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#135d54] text-white">
                <GraduationCap size={20} aria-hidden="true" />
              </span>
              Educor
            </Link>

            <div className="mb-8">
              <p className="text-sm font-semibold uppercase text-[#135d54]">Welcome back</p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal">Continue your learning flow</h1>
              <p className="mt-3 text-[#52645f]">
                Pick up lessons, assignments, and progress checks from the same workspace.
              </p>
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
            <div className="relative mb-5">
              <Lock className="absolute left-3 top-3 text-[#78918a]" size={18} aria-hidden="true" />
              <input
                id="password"
                type={show ? "text" : "password"}
                placeholder="Enter your password"
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

            {error && <p className="mb-4 rounded-lg bg-[#fff1ec] px-3 py-2 text-sm text-[#9d321f]">{error}</p>}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#135d54] px-5 py-3 font-semibold text-white transition hover:bg-[#0f4942]"
            >
              Login
              <ArrowRight size={18} aria-hidden="true" />
            </button>

            <p className="mt-5 text-center text-sm text-[#52645f]">
              New to Educor?{" "}
              <Link href="/signup" className="font-semibold text-[#135d54] hover:underline">
                Create an account
              </Link>
            </p>
          </form>
        </section>

        <section className="relative hidden overflow-hidden border-l border-[#dbe7e2] bg-[#17211f] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase text-[#ffb693]">Return to outcomes</p>
            <h2 className="mt-4 text-5xl font-bold leading-tight tracking-normal">
              Lessons, assignments, and progress stay connected.
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/75">
              Educor keeps the daily product experience aligned with the commercial promise visitors see before they sign up.
            </p>
          </div>

          <Image
            src="/illustrations/education.svg"
            alt="Education platform illustration"
            width={680}
            height={520}
            priority
            className="mx-auto h-auto w-full max-w-xl"
          />
        </section>
      </main>
    </>
  );
}
