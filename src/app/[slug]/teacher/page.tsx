import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function TeacherPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/${slug}/teacher/today`);
}
