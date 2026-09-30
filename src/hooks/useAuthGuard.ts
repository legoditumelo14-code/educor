import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";

export const useAuthGuard = (redirectIfLoggedIn: boolean) => {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (redirectIfLoggedIn && user) {
        router.push("/dashboard");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, redirectIfLoggedIn]);

  return loading;
};
