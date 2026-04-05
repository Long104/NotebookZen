import Image from "next/image";
import Card from "@/components/Card";
import Link from "next/link";

export default function MenuBody() {
  return (
    <div className="p-5">
      {/*Main body section */}
      <div className="py-10 gap-y-10">
        <Image
          src="/BodyLogo.jpg"
          alt="BodyLogo"
          width={120}
          height={120}
          className="rounded-full  mx-auto"
        />
        {/*Title */}
        <h1 className=" text-3xl text-center pt-10">
          Calm yourself by Jotting
        </h1>
        {/*Slogan */}
        <p className="text-center pt-10 text-lg">
          Store your gold ideas, manage and scale your ideas, and links your
          insights in one simple concept
        </p>
      </div>
      {/*Cards section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-30 gap-y-10 h-full w-full">
        <Link href="/create">
          <Card
            src="/createLogo.jpg"
            name="createLogo"
            title="Create"
            description="Start a new fresh ideas"
          />
        </Link>
        <Link href="/realShowList">
          <Card
            src="/saveLogo.png"
            name="saveLogo"
            title="Save List"
            description="Store and manage your ideas"
          />
        </Link>

        {/* Target the 3rd card only on mobile/tablet */}
        <div className="col-span-1 md:col-span-2 lg:col-span-1 flex justify-center w-full">
          <Card
            src="/mappingLogo.png"
            name="mappingLogo"
            title="Mapping"
            description="Connect and links your ideas"
          />
        </div>
      </div>
    </div>
  );
}
