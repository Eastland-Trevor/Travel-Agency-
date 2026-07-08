import { redirect } from "react-router";
import { account } from "~/appwrite/client";
import { getCurrentAccount } from "~/appwrite/auth";

export async function clientLoader({ request }: { request: Request }) {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const secret = url.searchParams.get("secret");

    if (!userId || !secret) return redirect("/sign-in");

    try {
        await account.createSession(userId, secret);
        await getCurrentAccount(5, 500);
        return redirect("/");
    } catch (error) {
        console.error("Error completing OAuth login:", error);
        return redirect("/sign-in");
    }
}

const AuthCallback = () => {
    return (
        <main className="auth">
            <section className="size-full glassmorphism flex-center px-6">
                <div className="sign-in-card">
                    <h1 className="p-28-bold text-dark-100 text-center">Signing you in...</h1>
                </div>
            </section>
        </main>
    );
};

export default AuthCallback;
