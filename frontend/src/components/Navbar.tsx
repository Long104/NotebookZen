"use client";
import Image from "next/image";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export default function Navbar() {
  return (
    <nav className="border-white border-2 w-full h-30 sm:h-20 flex flex-col sm:flex-row justify-between items-center p-5 ">
      {/*Logo and title section */}
      <div className="flex items-center gap-3">
        <Image
          src="/zenLogo2.png"
          alt="Logo"
          width={60}
          height={40}
          className="rounded-full"
        />

        <div className="hidden md:block">ZenNote</div>
      </div>
      {/*Profile and Donate section or buy premium */}
      <div className="flex gap-4 items-center">
        {/*Sign in */}
        <header className="flex justify-end items-center p-4 gap-4 h-16">
          <Show when="signed-out">
            <div className="bg-violet-600 p-2 rounded-md cursor-pointer">
              <SignInButton />
            </div>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </header>
      </div>
    </nav>
  );
}
