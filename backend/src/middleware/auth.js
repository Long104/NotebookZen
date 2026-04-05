// Correct:
const { verifyToken } = require("@clerk/backend");
require("dotenv").config();

async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        // verifyToken is a standalone function, not a client method
        const { sub: userId } = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });

        if (!userId) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.auth = { userId };
        next();
    } catch (error) {
        console.error("Auth error:", error);
        return res.status(401).json({ error: "Unauthorized" });
    }
}

module.exports = { requireAuth };

