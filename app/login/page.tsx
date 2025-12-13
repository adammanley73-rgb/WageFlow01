import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

const bypass =
  process.env.AUTH_BYPASS === "1" || process.env.NEXT_PUBLIC_AUTH_BYPASS === "1";

export default function LoginPage() {
  if (bypass) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}
