import ResetPasswordPageClient from "./page.client";

type SearchParams = Record<string, string | string[] | undefined>;

function getToken(searchParams?: SearchParams): string {
  const token = searchParams?.token;
  if (Array.isArray(token)) {
    return token[0] ?? "";
  }
  return token ?? "";
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  return <ResetPasswordPageClient initialToken={getToken(searchParams)} />;
}
