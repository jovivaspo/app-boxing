"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://10.142.199.144:8080";

export async function googleLogin(idToken: string) {
  console.log("googleLogin called with idToken:", idToken);
  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    console.log("Response from backend:", res);

    if (!res.ok) {
      const body = await res.text().catch(() => "Unknown error");
      return { success: false, error: `Backend error ${res.status}: ${body}` };
    }

    const data = (await res.json()) as {
      token?: string;
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
        pictureUrl: string;
        createdAt: string;
      };
    };

    console.log(data);

    if (!data.token || !data.user) {
      return { success: false, error: "Backend did not return a token or user" };
    }

    const cookieStore = await cookies();
    cookieStore.set("jwt", data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });
    cookieStore.set("user", JSON.stringify(data.user), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/");
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") {
      throw err;
    }
    return { success: false, error: String(err) };
  }
}
