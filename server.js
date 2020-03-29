const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model(
  "user",
  new mongoose.Schema({
    username: String,
    log: [
      {
        description: String,
        duration: Number,
        date: { type: Date, default: Date.now },
      },
    ],
  })
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", function (req, res) {
  const user = new User({ username: req.body.username });
  user.save(function (err) {
    if (err) {
      return res.json(err);
    }

    res.json(user);
  });
});

app.get("/api/exercise/users", function (req, res) {
  const users = User.find()
    .select("_id username")
    .exec(function (err, data) {
      if (err) {
        return res.json(err);
      }
      res.json(data);
    });
});

app.post("/api/exercise/add", function (req, res) {
  res.json({ user: "with exercise object" });
});

app.get("/api/exercise/log", function (req, res) {
  res.json({
    user:
      "with all exercise object filtered with count property that specity how many records are there",
  });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res.status(errCode).type("txt").send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
