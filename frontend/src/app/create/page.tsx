"use client";

import CreateToprow from "@/components/CreateToprow";
import CreateMenu from "@/components/CreateMenu";
import AppLayout from "@/components/AppLayout";

export default function Create() {
  return (
    <AppLayout>
      <div className="w-full min-h-full">
        <div className="flex flex-col gap-8 items-center py-8">
          <CreateToprow />
          <CreateMenu />
        </div>
      </div>
    </AppLayout>
  );
}
