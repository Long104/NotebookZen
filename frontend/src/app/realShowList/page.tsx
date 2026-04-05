"use client";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

// typescript for note
type Note = {
  id: number;
  title: string;
  content?: string;
  createdAt: string;
};

// typescript for selected note
type SelectedNote = {
  id: number;
  title: string;
  content?: string;
  createdAt: string;
};
export default function RealShowList() {
  const { getToken } = useAuth();

  // useState Note variable
  const [noteList, setNoteList] = useState<Note[]>([]);
  // useState for storing selected note
  const [selectedNote, setSelectedNote] = useState<SelectedNote>({
    id: 0,
    title: "",
    content: "",
    createdAt: "",
  });

  // useState for identify whether edit button is been click
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    // asynchronous function to fetch data from the backend
    const fetchData = async () => {
      const token = await getToken();

      try {
        //fetching
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/notes`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) {
          throw new Error("failed to fetch");
        }

        // convert json back to object
        const result = await response.json();
        // store result to noteList usestate
        setNoteList(result);
      } catch (error) {
        console.error("Error fetching notes:", error);
      }
    };

    fetchData();
  }, []);

  //async function when the user click on the note
  function handleSelectedNote(note: Note) {
    setSelectedNote(note);

    // for the when the user click the edit button
    setIsEditing(false);
    // setEditTitle(note.title);
    // setEditContent(note.content || "");
  }

  // function when the user click edit button
  function handleEditNote() {
    setIsEditing(true);
    setEditTitle(selectedNote.title);
    setEditContent(selectedNote.content || "");
  }

  // Cancel button functionality
  function handleCancel() {
    setIsEditing(false);
  }

  // update function for confirm button
  async function handleSaveUpdate() {
    // for clerk
    const token = await getToken();

    try {
      // update api
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
            title: editTitle,
            content: editContent,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const result = await response.json();
      const updatedNote = result.data;

      // update the note lists
      setNoteList((prev) =>
        prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)),
      );

      //update the note that selected
      setSelectedNote(updatedNote);
      setIsEditing(false);

      alert("Note updated successfully");
    } catch (error) {
      console.error("Error updating note:", error);
      alert("Failed to update note.");
    }
  }

  // CRUD delete for delete button
  async function handleDeleteButton() {
    const token = await getToken();
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
            id: selectedNote.id,
          }),
        },
      );
      // the selectedNote.id is store in result
      const result = await response.json();

      const deletedNote = result.data;

      // update the noteList
      setNoteList((prev) => prev.filter((note) => note.id !== deletedNote.id));

      setSelectedNote({
        id: 0,
        title: "",
        content: "",
        createdAt: "",
      });
      setIsEditing(false);
      alert("Note deleted successfully");
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("failed to delete note.");
    }
  }

  return (
    <div className="flex">
      {/* Sidebar to show list of notes */}
      <div className="w-[30%] border-r-2 border-gray-700 h-screen">
        {/*Top row */}
        <div className="border-b-2 border-gray-500">
          {/*for add padding */}
          <div className="p-4 flex flex-col gap-2">
            {/*menu button section */}
            <div>
              <button className="flex gap-2">
                <ArrowLeft />
                Menu
              </button>
            </div>
            {/*Title section */}
            <div>
              <h1>Your Notes</h1>
              {/*the amount of save note */}
            </div>
          </div>
        </div>
        {/*List of notes section */}
        <div className="p-4 flex flex-col gap-2">
          {noteList.map((note) => (
            // each note in the list
            <div
              key={note.id}
              className="bg-green-500 p-4"
              onClick={() => handleSelectedNote(note)}
            >
              <div className="flex w-full h-full">
                <div>{note.title}</div>
              </div>
              <div>{new Date(note.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
      {/*Main content selected note */}
      <div className="w-[70%] p-4">
        {selectedNote.title ? (
          isEditing ? (
            // edit mode
            <div className="bg-gray-700 w-full">
              {/*Top row */}
              <div className="border-b-2 border-white">
                {/*for add padding */}
                <div className="p-2">
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xl"
                  />
                  <div className="flex justify-between">
                    <div>
                      {new Date(selectedNote.createdAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="bg-green-500 p-2"
                        onClick={handleSaveUpdate}
                      >
                        Confirm
                      </button>
                      <button
                        className="bg-gray-400 p-2"
                        onClick={handleCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* for content */}
              <div className="p-2">
                <textarea
                  className="w-full"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              </div>
            </div>
          ) : (
            // view mode
            <div className="bg-gray-700">
              {/*Top row */}
              <div className=" border-b-2 border-white">
                {/*for padding */}
                <div className="p-2">
                  {/*Title */}
                  <div className="text-xl">{selectedNote.title}</div>
                  {/*date and buttons */}
                  <div className="flex justify-between">
                    <div>
                      {new Date(selectedNote.createdAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEditNote}
                        className="p-2 bg-green-500"
                      >
                        Edit
                      </button>
                      <button
                        className="p-2 bg-red-500"
                        onClick={handleDeleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/*Content */}
              <div className="p-2">
                <div>{selectedNote.content}</div>
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col gap-4 h-full justify-center items-center">
            <div className="text-2xl">Select a Note to review</div>
            <div>Choose a note from the sidebar to see its content</div>
          </div>
        )}
      </div>
    </div>
  );
}
