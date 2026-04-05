import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import Image from "next/image";

export default function CardSmall({ src, name, title, description }) {
  return (
    <Card size="sm" className="mx-auto w-full max-w-sm hover:bg-gray-700">
      <CardHeader>
        <Image
          src={src}
          alt={name}
          width={10}
          height={10}
          className="rounded-full mx-auto w-10 h-10"
        />
      </CardHeader>
      <CardContent className="text-center text-lg lg:text-2xl">
        {title}
      </CardContent>
      <CardContent className="text-center  lg:text-sm xl:text-lg">
        {description}
      </CardContent>
    </Card>
  );
}
