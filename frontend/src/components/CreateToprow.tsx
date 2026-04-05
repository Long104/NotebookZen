import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
export default function CreateToprow() {
  return (
    <div
      className="flex flex-wrap justify-around w-[80%] border-2 border-red-300
      max-[1280px]:gap-8
      max-[1024px]:gap-4
      max-[640px]:flex-col items-center
    "
    >
      {/*Back to menu button */}
      <div className="flex items-center ">
        <ArrowLeft />
        <div>Back to Menu</div>
      </div>
      {/*Title */}
      <div className="text-2xl">Create New Note</div>
      {/*View all notes button */}
      <div className="flex border-2 border-purple-400">
        <Button variant="outline">
          <Menu />
          Views All Notes
        </Button>
      </div>
    </div>
  );
}
