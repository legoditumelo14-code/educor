"use client";

import { auth } from "../lib/firebase";

export default function Profile() {
  const user = auth.currentUser;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}