import { LoanDetailContent } from "@/components/debts/loan-detail-content";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LoanDetailPage({ params }: Props) {
  const { id } = await params;
  return <LoanDetailContent debtId={parseInt(id, 10)} />;
}
