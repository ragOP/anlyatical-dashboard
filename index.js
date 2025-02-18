const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectToDatabase } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

const routes = require("./routes/analytics.routes");
const { changeServerTimezone } = require("./utils/serverTimeConfig");

app.use(cors());
app.use(express.json());

const timeZone = changeServerTimezone(); 

console.log(`Server is running in ${timeZone} timezone.`);

(async () => {
  await connectToDatabase();
})();

app.use('/api', routes);

app.listen(PORT, function () {
  console.log(`Server is running on port ${PORT}`);
});
