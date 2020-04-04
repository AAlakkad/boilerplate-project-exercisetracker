const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

function formatDate(date) {
  if (typeof date === "string") {
    date = new Date(Date.parse(date));
  }
  return date
    .toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit"
    })
    .replace(/,/g, "");
}

const mongoose = require("mongoose");
mongoose.connect(process.env.MLAB_URI || "mongodb://localhost/exercise-track", {
  useMongoClient: true
});

const User = mongoose.model(
  "user",
  new mongoose.Schema({
    username: { type: String, required: true },
    log: [
      {
        description: { type: String, required: true },
        duration: { type: Number, required: true },
        date: { type: Date, default: Date.now }
      }
    ]
  })
);

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/exercise/new-user", function(req, res) {
  const user = new User({ username: req.body.username });
  user.save(function(err) {
    if (err) {
      return res.json(err);
    }

    res.json(user);
  });
});

app.get("/api/exercise/users", function(req, res) {
  const users = User.find()
    .select("_id username")
    .exec(function(err, data) {
      if (err) {
        return res.json(err);
      }
      res.json(data);
    });
});

app.post("/api/exercise/add", function(req, res) {
  const date = req.body.date ? new Date(req.body.date) : new Date();
  const log = {
    description: req.body.description,
    duration: parseInt(req.body.duration, 10),
    date
  };
  User.findById(req.body.userId, function(err, user) {
    if (err || !user) {
      return res.json({ error: "could not find user by provided id" });
    }

    User.update(
      { _id: req.body.userId },
      { $push: { log } },
      { runValidators: true },
      function(err) {
        if (err) {
          return res.json(err.message);
        }
        const formatedDate = formatDate(date);

        const response = {
          username: user.username,
          description: log.description,
          duration: log.duration,
          _id: user._id,
          date: formatedDate
        };

        res.json(response);
      }
    );
  });
});

app.get("/api/exercise/log", function(req, res) {
  const limit = parseInt(req.query.limit, 10) || false;
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;

  User.findById(req.query.userId, function(err, _user) {
    if (!_user) {
      return res.json("Could not find user with given conditions");
    }

    // deep copy _user object
    const user = JSON.parse(JSON.stringify(_user));
    if (to) {
      user.log = user.log.filter(log => Date.parse(log.date) < to.getTime());
    }

    if (from) {
      user.log = user.log.filter(log => Date.parse(log.date) > from.getTime());
    }

    user.log = user.log.map(_log => {
      return Object.assign(_log, {
        date: formatDate(_log.date),
        _id: undefined
      });
    });

    if (limit) {
      user.log = user.log.slice(0, limit);
    }
    res.json(Object.assign(user, { __v: undefined }));
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
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
