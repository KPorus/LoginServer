const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const { body, validationResult, check } = require("express-validator");
const app = express();
const session = require("express-session");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

app.use(cookieParser());
app.use(session({ secret: "fardin125168456", saveUninitialized: true, resave: true }));

const user = {
  email: "",
  password:""
};
// fun part
app.use((req, res, next) => {
  console.log(req.path, "I am watching you.");
  next();
});

// middle wares
const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1rqmivg.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const userCollection = client.db("Users").collection("user");

    // user login

    app.post(
      "/login",
      body("email").isEmail().withMessage("Please provide corrrect mail"),
      check("password")
        .isLength({ min: 5 })
        .withMessage("Password must be at least 5")
        .matches(/[\!\@\#\$\%\^\&\*]{1,}/)
        .withMessage("must contain a unique number")
        .matches(/[A-Z]{1,}/)
        .withMessage("must contain a capital word"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          let errorsList = errors.array().map((error) => error.msg);
          return res.status(422).json(errorsList);
        }
        next();
      },
      async (req, res) => {
        const user = req.body;
          const find = await userCollection.findOne({
            email: user.email,
            password: user.password,
          });
          if (find) {
            console.log(true);
             req.session.user= user
             req.session.save();
              return res.send(find);
            
          } else {
            res.send("User not found");
          }
      }
    );

    // user check
    app.get("/user", (req, res) => {
      const sessionUser = req.session.user;
      return res.send(sessionUser);
    });

    // logout
    app.get("/logout", (req, res) => {
      req.session.destroy();
      return res.send("User logged out!");
    });

    // user register
    app.post(
      "/register",

      body("email")
        .isEmail()
        .trim()
        .notEmpty()
        .withMessage("Please provide corrrect mail"),
      body("name").trim().notEmpty().withMessage("Name is missing"),
      // password must be at least 5 chars long
      check("password").isLength({min:5}).withMessage("Password must be at least 5")
        .matches(/[\!\@\#\$\%\^\&\*]{1,}/)
        .withMessage("must contain a unique number")
        .matches(/[A-Z]{1,}/)
        .withMessage("must contain a capital word"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          let errorsList = errors.array().map((error) => error.msg);
          return res.status(422).json(errorsList);
        }
        next();
      },
      async (req, res) => {
        const user = req.body;
          const find = await userCollection.findOne({ email: user.email });
          if (!find) {
            const result = await userCollection.insertOne(user);
            res.status(200).json("register success");
          } else {
            res.send("User already register");
          }
      }
    );
  } finally {
  }
}

run().catch((err) => console.error(err));

app.listen(port, (req, res) => {
  console.log(` server running on ${port}`);
});
