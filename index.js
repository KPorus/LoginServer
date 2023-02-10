const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const { body, validationResult, check } = require("express-validator");
const app = express();
const session = require("express-session");
const cookieParser = require("cookie-parser");
const Cryptr = require('cryptr');
const cryptr = new Cryptr(process.env.ACCESS_TOKEN_SECRET);

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

async function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, user) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.user = user;
    next();
  });
}

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

    app.get("/", (req, res) => {
      res.send("I am watching you.");
    });

    // user login
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
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "14d",
        });
        return res.status(200).send({ token:token });
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
    app.post("/addpost/:email", verifyJWT, async (req, res) => {
      const post = req.body;
      const Useremail = req.params.email;
      const Posts = { ...post, likes: [], Useremail, comment: [] };
      const UserPosts = await postCollection.insertOne(Posts);
      return res.status(200).send(UserPosts);
    });

    //all post ============
    app.get("/allpost",  verifyJWT, async (req, res) => {
      const query = {};
      const cursor = postCollection.find(query);
      const posts = await cursor.toArray();
      res.send(posts);
    });

    //Delete post ============
    app.delete("/deletePost/:email/:id", verifyJWT, async (req, res) => {
      const user = req.params.email;
      const filter = { Useremail: user };
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const findPost = await postCollection.find(filter);
      if (findPost) {
        const result = await postCollection.deleteOne(query);
        res.send(result);
      } else {
        res.status(400).send("There is no post of this user.");
      }
    });

    //update post ============
    app.patch("/updatePost/:email/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const post = req.body.post;
      const img = req.body.img;
      console.log(post);
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          post: {
            test: post,
            img: img,
          },
        },
      };
      const result = await postCollection.updateOne(query, updatedDoc);
      res.status(200).send(result);
    });

    //post comment ============
    app.patch("/comment/:postId",verifyJWT, async (req, res) => {
      const id = req.params.postId;
      const comment = req.body.comment;
      console.log(comment);
      const query = { _id: ObjectId(id) };
      const updatedDoc = {
        $push: {
          comment: comment,
        },
      };
      const result = await postCollection.updateOne(query, updatedDoc);
      res.status(200).send(result);
    });

    //like & disliked a post ===========

    app.put("/like/:userId/:id", async (req, res) => {
      const id = req.params.id;
      const userId = req.params.userId;
      const query = { _id: ObjectId(id) };
      const likeQuery = { likes: [userId] };
      const findPost = await postCollection
        .find({ query, likeQuery })
        .toArray();
      const likeCount = await postCollection.count(likeQuery);
      if (findPost == false && likeCount == 0) {
        const updatedDoc = {
          $push: {
            likes: [userId],
          },
        };
        const result = await postCollection.updateOne(query, updatedDoc);
        res.status(200).json("The post has been liked");
      } else {
        const updatedDoc = {
          $pull: {
            likes: [userId],
          },
        };
        const result = await postCollection.updateOne(query, updatedDoc);
        res.status(200).json("The post has been disliked");
      }
    });

    // // disliked a post =============
    // app.put("/dislike/:userId/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const userId = req.params.userId;
    //   const query = { _id: ObjectId(id) };
    //   const likeQuery = { likes: [userId] };
    //   const findPost = await postCollection
    //     .find({ query, likeQuery })
    //     .toArray();

    //   console.log(findPost);
    //   if (findPost) {
    //      const updatedDoc = {
    //        $pull: {
    //          likes: [userId],
    //        },
    //      };
    //      const result = await postCollection.updateOne(query, updatedDoc);
    //      res.status(200).json("The post has been disliked");
    //   }
    // });
  } finally {
  }
}

run().catch((err) => console.error(err));

app.listen(port, (req, res) => {
  console.log(` server running on ${port}`);
});
