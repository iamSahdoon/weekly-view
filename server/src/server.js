import app from "./app.js";

// S0 placeholder. S1 awaits the Mongo connection and binds env.PORT from config/env.js.
const PORT = 5000;

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
