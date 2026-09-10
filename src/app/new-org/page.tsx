export default function NewOrgPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[30px] shadow-sm border border-gray-100 p-10 text-center flex flex-col items-center">
        <h1 className="logo-font text-[40px] font-semibold bg-clip-text text-transparent bg-linear-to-b from-[#7898FF] to-[#0926CF] mb-6">
          Roll SYNC
        </h1>
        <h2 className="text-[24px] font-medium text-gray-900 tracking-tight mb-2">
          Create a new organization
        </h2>
        <p className="text-gray-500 text-[15px]">
          The new organization setup will live here.
        </p>
      </div>
    </div>
  );
}
