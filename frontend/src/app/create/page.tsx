"use client";
import CreateToprow from "@/components/CreateToprow";
import CreateMenu from "@/components/CreateMenu";
export default function Create() {
  return (
    <div className="w-full h-screen border-2 border-white">
      <div className="flex flex-col gap-10 items-center border-2 border-blue-400">
        {/*Top section */}
        <CreateToprow />
        {/*Main section */}
        <CreateMenu />
      </div>
    </div>
  );
}
