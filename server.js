const { createApp } = require("./src/app");
const { port } = require("./src/config");
const { initDatabase } = require("./src/db");

const app = createApp();

initDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Investigation files app running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to initialize database.", error);
    process.exit(1);
  });
