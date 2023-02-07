const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const { body, validationResult, check } = require("express-validator");
const app = express();
const session = require("express-session");
const cookieParser = require("cookie-parser");
const port = process.env.PORT || 5000;

app.use(cookieParser());
app.use(
  session({ secret: "fardin125168456", saveUninitialized: true, resave: true })
);

const user = {
  email: "",
  password: "",
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
    const postCollection = client.db("Users").collection("post");

    // user login
    app.get("/", (req, res) => {
      res.send("I am watching you.");
    });
    app.post("/login", async (req, res) => {
      const user = req.body;
      const find = await userCollection.findOne({
        email: user.email,
        password: user.password,
      });
      if (find) {
        console.log(true);
        req.session.user = find;
        req.session.save();
        return res.status(200).send("User Login Successfull");
      } else {
        res
          .status(400)
          .send("User not found. Please check if everything is ok!!");
      }
    });

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
      check("password")
        .isLength({ min: 5 })
        .withMessage("Password must be at least 5")
        .matches(/[\!\@\#\$\%\^\&\*]{1,}/)
        .withMessage("must contain a unique number")
        .matches(/[A-Z]{1,}/)
        .withMessage("must contain a capital word")
        .matches(/\d/)
        .withMessage("must contain a number"),
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

    const forgetPass = {};
    app.post("/forgot-password", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const oldUser = await userCollection.findOne(query);
      if (!oldUser) {
        return res.json({ status: "User Not Exists!!" });
      }
      return res.send("User found for forget pass");
    });

    // reset password
    app.patch(
      "/resetPass/:id",
      check("password")
        .isLength({ min: 5 })
        .withMessage("Password must be at least 5")
        .matches(/[\!\@\#\$\%\^\&\*]{1,}/)
        .withMessage("must contain a unique number")
        .matches(/[A-Z]{1,}/)
        .withMessage("must contain a capital word")
        .matches(/\d/)
        .withMessage("must contain a number"),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          let errorsList = errors.array().map((error) => error.msg);
          return res.status(422).json(errorsList);
        }
        next();
      },
      async (req, res) => {
        const id = req.params.id;
        const user = req.body;
        console.log(user);
        const query = { _id: ObjectId(id) };
        const updatedDoc = {
          $set: {
            password: user.password,
          },
        };
        const result = await userCollection.updateOne(query, updatedDoc);
        res.send({ state: "password reset", result });
      }
    );

    //user post ================
    app.post("/addpost/:email", async (req, res) => {
      const post = req.body;
      const Useremail = req.params.email;
      const Posts = { ...post,likes:{userId:""},Useremail };
      const UserPosts = await postCollection.insertOne(Posts);
      return res
        .status(200)
        .send(UserPosts);;
    });


    //all post ============
    app.get("/allpost", async (req, res) => {
      const query = {};
      const cursor = postCollection.find(query);
      const posts = await cursor.toArray();
      res.send(posts);
    });

    //Delete post ============
    app.delete("/deletePost/:email/:id", async (req, res) => {
      const user = req.params.email;
      const filter = { Useremail: user };
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const findPost = await postCollection.find(filter);
      if (findPost) {
        const result = await postCollection.deleteOne(query)
        res.send(result);
      }
      else
      {
        res.status(400).send("There is no post of this user.")
      }
    });

  } finally {
  }
}

run().catch((err) => console.error(err));

app.listen(port, (req, res) => {
  console.log(` server running on ${port}`);
});
