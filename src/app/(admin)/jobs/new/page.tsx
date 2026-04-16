import { JobForm } from '../JobForm';

export default function NewJobPage() {
  return (
    <div className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Add job</h1>
      <JobForm />
    </div>
  );
}
