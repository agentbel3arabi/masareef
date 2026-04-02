import { P2PDetailContent } from "@/components/debts/p2p-detail-content";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function P2PDetailPage({ params }: Props) {
  const { id } = await params;
  return <P2PDetailContent debtId={parseInt(id, 10)} />;
}
