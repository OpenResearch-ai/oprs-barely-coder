import { redirect } from "next/navigation";

export default async function SprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/products`);
}
