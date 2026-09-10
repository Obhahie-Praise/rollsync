import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { ProfileForm } from "@/components/settings/ProfileForm";

export default async function ProfileSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const user = {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email,
    image: session.user.image ?? null,
  };

  return <ProfileForm user={user} />;
}
