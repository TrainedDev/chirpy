require("dotenv").config();
const app = require(".");

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log("server is ready"));
