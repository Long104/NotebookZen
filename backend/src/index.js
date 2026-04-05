const express = require("express");
const cors = require("cors");
const prisma = require("../prismaClient");
const webhookRoutes = require("./routes/webhooks/clerk");
const app = express();
const port = 8000;
const { requireAuth } = require("./middleware/auth");

// Mount webhook routes
app.use("/api/webhooks", webhookRoutes);

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);

app.get("/", (req, res) => {
  res.send("Hello world.");
});

//--------------- Notes ---------------

// Get all notes (for the logged-in user only)
app.get("/notes", requireAuth, async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: {
        user: { clerkId: req.auth.userId },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// Get one note by Id
app.get("/notes/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  const note = await prisma.note.findUnique({
    where: { id: id },
  });
  res.json(note);
});

// Create note (linked to logged-in user)
app.post("/notes", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { clerkId: req.auth.userId },
  });
  const newNote = await prisma.note.create({
    data: {
      title: req.body.title,
      content: req.body.content,
      userId: user.id,
    },
  });
  res.json({ message: "Create Success!", data: newNote });
});

// Update
app.put("/notes", requireAuth, async (req, res) => {
  const updateNote = await prisma.note.update({
    where: { id: req.body.id },
    data: {
      title: req.body.title,
      content: req.body.content,
    },
  });
  res.json({ message: "Update success", data: updateNote });
});

// Delete
app.delete("/notes", requireAuth, async (req, res) => {
  const deleteNote = await prisma.note.delete({
    where: {
      id: req.body.id,
    },
  });
  res.json({
    message: "delete data",
    data: deleteNote,
  });
});

app.get("/notesCount/:id", async (req, res) => {
  const userId = req.params.id;
  const noteCount = await prisma.note.count({
    where: {
      userId: Number(userId),
    },
  });

  return res.json(noteCount);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
