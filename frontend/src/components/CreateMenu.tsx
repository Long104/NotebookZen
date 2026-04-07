"use client";
import { StickyNote } from "lucide-react";
import { X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

export default function CreateMenu() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const { getToken } = useAuth();
  // When making a fetch call:


  async function createZenNote(e) {
    e.preventDefault();
    const token = await getToken();
    console.log("zen successfully");
    if (title == "") {
      setError("title is required.");
      return;
    }
    await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, content }),
    });

    setTitle("");
    setContent("");
  }
  return (
    <div className="w-full flex justify-center ">
      <div className="border-2 flex flex-col  border-green-400 px-4 py-8 px-12 w-[70%] min-h-[70vh] bg-gray-900">
        <form onSubmit={createZenNote} className="flex flex-col gap-7">
          {/*Top title */}
          <div className="text-2xl">Write Your Thoughts</div>

          {error}
          {/*Title section */}

          <div className="flex flex-col gap-4">
            <p className="text-xl">Title</p>
            <input
              placeholder="Enter your title..."
              className="p-2 bg-gray-600"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/*Content section */}
          <div className="flex flex-col gap-4">
            <p className="text-xl">Content</p>
            <textarea
              className="p-2 bg-gray-600 h-[30vh]"
              placeholder="Start writing here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/*Button section */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              type="submit"
              className="bg-purple-600 text-xl py-1 px-10 flex gap-2 items-center justify-center"
            >
              <StickyNote />
              <p>Save Note</p>
            </button>
            <button className="bg-gray-600 text-xl flex items-center px-10 p-1 justify-center">
              <X />
              <p>Cancel</p>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
