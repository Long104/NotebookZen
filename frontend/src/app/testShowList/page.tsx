"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

type Note = {
  id: number;
  title: string;
  content?: string;
  createdAt: string;
};

type SelectedNote = {
  id?: number;
  title: string;
  content?: string;
  createdAt: string;
};

export default function TestShowList() {
  const { getToken } = useAuth();

  const [noteList, setNoteList] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<SelectedNote>({
    id: undefined,
    title: "",
    content: "",
    createdAt: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken();
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch");

        const result = await response.json();
        setNoteList(result);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchData();
  }, []);

  function handleSelectedNote(note: Note) {
    setSelectedNote(note);
    // setEditedTitle(note.title);
    // setEditedContent(note.content || "");
    setIsEditing(false);
  }

  // if the user clicks edit button
  function handleEditClick() {
    setEditedTitle(selectedNote.title);
    setEditedContent(selectedNote.content || "");
    setIsEditing(true);
  }

  // ✅ FIXED FUNCTION
  // if the user clicks the save button
  async function handleSaveEdit() {
    const token = await getToken();
    if (!editedTitle.trim()) {
      alert("Title cannot be empty!");
      return;
    }

    if (!selectedNote.id) {
      alert("Note ID not found!");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: selectedNote.id,
            title: editedTitle,
            content: editedContent,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const result = await response.json();
      const updatedNote = result.data; // ⭐ IMPORTANT FIX

      setNoteList((prev) =>
        prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
      );

      setSelectedNote(updatedNote);
      setIsEditing(false);

      alert("Note updated successfully!");
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note.");
    }
  }

  // delete
  async function handleDelete(id: number) {
    const token = await getToken();
    if (!editedTitle.trim()) {
      alert("Title cannot be empty!");
      return;
    }

    if (!selectedNote.id) {
      alert("Note ID not found!");
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const result = await response.json();
      console.log(result);
      const deletedNote = result.data; // ⭐ IMPORTANT FIX

      setNoteList((prev) => prev.filter((note) => note.id !== deletedNote.id));

      setSelectedNote(deletedNote);
      setIsEditing(false);

      alert("Note deleted successfully!");
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note.");
    }
  }

  function handleCancelEdit() {
    setEditedTitle(selectedNote.title);
    setEditedContent(selectedNote.content || "");
    setIsEditing(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <div className="w-[30%] border-r">
        {noteList.map((note) => (
          <div
            key={note.id}
            className="p-4 m-2 bg-green-400 cursor-pointer"
            onClick={() => handleSelectedNote(note)}
          >
            <div className="flex justify-between">
              <span>{note.title}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectedNote(note);
                  setIsEditing(true);
                }}
                className="bg-green-700 px-2"
              >
                Edit
              </button>
            </div>

            <div>{new Date(note.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div className="w-[70%] p-2">
        {selectedNote.title ? (
          isEditing ? (
            <>
              {/* Edit Mode */}
              <div className=" bg-gray-700 flex flex-col gap-2">
                <div className="border-b-2 border-white">
                  <div className="p-4">
                    <h1 className="text-xl mb-4 ">Edit Note</h1>
                  </div>
                </div>

                {/*For second rows */}
                <div className="p-4">
                  <input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="w-full mb-2 p-2 border"
                  />

                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full p-2 border h-40"
                  />

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      className="bg-green-500 p-2"
                    >
                      Save
                    </button>

                    <button
                      onClick={handleCancelEdit}
                      className="bg-gray-400 p-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* View Mode */}
              <div className=" bg-gray-700 ">
                {/*Top row */}
                <div className="border-b-2 border-white">
                  <div className="p-2">
                    <h1 className="text-xl">{selectedNote.title}</h1>
                    <div className="flex justify-between">
                      <p>{new Date(selectedNote.createdAt).toLocaleString()}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditClick}
                          className=" bg-green-500 py-2 px-4 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedNote.id)}
                          className="bg-red-500 p-2"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 whitespace-pre-wrap p-2">
                  {selectedNote.content}
                </div>
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col gap-4 items-center justify-center h-full">
            <div className="text-2xl">Select a Note to review</div>
            <div>Choose a note from the sidebar to see its content</div>
          </div>
        )}
      </div>
    </div>
  );
}
