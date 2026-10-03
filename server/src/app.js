import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import routes from "./routes/index.js";

// Builds the app; never connects to Mongo and never listens (project_structure.md §2.3),
// so Supertest runs the real middleware chain without a port or Atlas.
const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL, // exact origin, never '*' with a real API
    credentials: false, // the token travels in a header, not a cookie — there are no cookies
  }),
);
// Request lines only; tokens and passwords travel in bodies and headers, never URLs.
if (env.NODE_ENV !== "test")
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
