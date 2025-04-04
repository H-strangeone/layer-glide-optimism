import AdminBatchManager from "@/components/AdminBatchManager";
import BatchSubmission from "@/components/BatchSubmission";

const Admin = () => {
  return (
    <div className="container mx-auto space-y-8 py-8">
      <h1 className="text-4xl font-bold text-l2-primary">Admin Dashboard</h1>

      <div className="grid gap-8">
        <BatchSubmission />
        <AdminBatchManager />
      </div>
    </div>
  );
};

export default Admin;
