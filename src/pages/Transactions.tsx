import { BatchManager } from "@/components/BatchManager";

export default function Transactions() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Transaction Batches</h1>
      <p className="text-muted-foreground">
        View all transaction batches that have been submitted to the Layer 2 network
      </p>
      <BatchManager />
    </div>
  );
}
