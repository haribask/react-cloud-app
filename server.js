const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
//const logger = require("morgan");
const AirbnbData = require("./models/airbnbdataset");
const UserDetails = require("./models/userdetails");
const config = require("./config");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const path=require("path");
//const authCheckMiddleware = require("./middleware/auth-check");

const API_PORT = 3001;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,"client", "build")));
//app.use(cors());

const router = express.Router();

const url = config.dbUri;
//console.log("mongo dbUri:" + url);

mongoose.connect(
  url,
  { useNewUrlParser: true }
);

let db = mongoose.connection;

db.once("open", () =>
  console.log(`connected to Mongo db, service at ${API_PORT}`)
);

db.on("error", console.error.bind(console, "MongoDB connection error"));

authenticate = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    //return res.status(401).end();
    return res.json({
      success: false,
      data: [],
      error: "User not logged in!!"
    });
  }

  //console.log("<auth-check.js>jwtSecret: " + config.jwtSecret);

  return jwt.verify(token, config.jwtSecret, (err, decoded) => {
    // the 401 code is for unauthorized status
    if (err) {
      //return res.status(401).end();
      return res.json({
        success: false,
        data: [],
        error: "User not logged in!!"
      });
    }

    const userId = decoded.sub;
    //console.log("<after jwt verify>userId: " + userId);

    // check if a user exists
    return UserDetails.findById(userId, (err, user) => {
      if (err || !user) {
        //return res.status(401).end();
        return res.json({ success: false, data: [], error: err });
      }

      //console.log("<after jwt verify>User is valid");
      return next();
    });
  });
};

router.get("/getAllRental", (req, res) => {
  if (
    authenticate(req, res, (err, next) => {
      if (err) {
        //return res.status(401).end();
        return res.json({ success: false, error: err });
      }
      //console.log("<getAllRental>valid token passed in the header");
      AirbnbData.find((err, data) => {
        if (err) return res.json({ success: false, data: [], error: err });
        return res.json({ success: true, data: data });
      });
    })
  );
});

router.get("/getDistinctCities", (req, res) => {
  AirbnbData.distinct("city", (err, data) => {
    if (err) return res.json({ success: false, error: err });
    return res.json({ success: true, data: data });
  });
});

router.get("/getRentalBy", (req, res) => {
  if (
    authenticate(req, res, (err, next) => {
      if (err) {
        //return res.status(401).end();
        return res.json({ success: false, error: err });
      }

      var cityInput = req.query.city;
      AirbnbData.find({ city: cityInput }, (err, data) => {
        if (err) return res.json({ success: false, data: [], error: err });
        return res.json({ success: true, data: data });
      });
    })
  );
});

router.get("/getRentalByPriceRange", (req, res) => {
  if (
    authenticate(req, res, (err, next) => {
      if (err) {
        //return res.status(401).end();
        return res.json({ success: false, error: err });
      }
      var minPrice = req.query.minprice;
      var maxPrice = req.query.maxprice;

      AirbnbData.find(
        { price: { $gte: minPrice, $lt: maxPrice } },
        (err, data) => {
          if (err) return res.json({ success: false, data: [], error: err });
          return res.json({ success: true, data: data });
        }
      );
    })
  );
});

router.post("/register", (req, res, next) => {
  var firstname = req.body.firstname;
  var lastname = req.body.lastname;
  var password = req.body.password;
  var email = req.body.email;

  if (!firstname) {
    return res.json({
      success: false,
      message: "Error: First name cannot be blank"
    });
  }
  if (!lastname) {
    return res.json({
      success: false,
      message: "Error: Last name cannot be blank"
    });
  }
  if (!email) {
    return res.json({
      success: false,
      message: "Error: Email cannot be blank"
    });
  }
  if (!password) {
    return res.json({
      success: false,
      message: "Error: Password cannot be blank"
    });
  }

  email = email.toLowerCase();

  //console.log("<reg>before calling userdetails.find, email: " + email);

  UserDetails.find({ email: email }, (err, previousUsers) => {
    if (err) {
      return res.json({
        success: false,
        message: "Error: signin server error"
      });
    } else if (previousUsers.length > 0) {
      return res.json({
        success: false,
        message: "Error: Account already exists"
      });
    }

    var newUser = new UserDetails();
    newUser.firstname = firstname;
    newUser.lastname = lastname;
    newUser.email = email;
    //newUser.password = password;
    newUser.password = newUser.generateHash(password);

    //UserDetails.save(JSON.stringify(newUser), (err, user) => {
    db.collection("userdetails").insertOne(newUser, (err, user) => {
      if (err) {
        return res.json({
          success: false,
          message: "Error: signin server error"
        });
      }

      UserDetails.findOne({ email: email }, (err, previousUser) => {
        if (previousUser) {
          const payload = {
            sub: previousUser._id
          };

          const token = jwt.sign(payload, config.jwtSecret);

          const userData = {
            email: previousUser.email
          };

          return res.json({
            success: true,
            message: "User created successfully---//",
            token: token,
            userData: userData
          });
        }
      });
    });
  });
});

router.post("/login", (req, res, next) => {
  var email = req.body.email;
  var password = req.body.password;

  if (!email) {
    return res.json({
      success: false,
      message: "Error: Email cannot be blank"
    });
  }
  if (!password) {
    return res.json({
      success: false,
      message: "Error: Password cannot be blank"
    });
  }

  email = email.toLowerCase();

  UserDetails.findOne({ email: email }, (err, previousUser) => {
    if (err) {
      return res.json({
        success: false,
        message: "Error: signin server error"
      });
    }

    if (!previousUser) {
      //console.log("previousUser is undefined");
      return res.json({
        success: false,
        message:
          "Error: Invalid login Id. Please register if you have not already!!"
      });
    }

    var loginUser = new UserDetails();
    loginUser.password = password;

    if (!loginUser.validatePassword(loginUser, previousUser.password)) {
      return res.json({
        success: false,
        message: "Error: entered password is not valid"
      });
    }

    const payload = {
      sub: previousUser._id
    };

    const token = jwt.sign(payload, config.jwtSecret);

    const userData = {
      email: previousUser.email
    };

    return res.json({
      success: true,
      message: "Login successful---//",
      token: token,
      userData: userData
    });
  });
});

//app.use("/api", authCheckMiddleware);
app.use("/api", router);

app.get("*", (req,res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(3001, () => console.log("listening on port " + API_PORT));
