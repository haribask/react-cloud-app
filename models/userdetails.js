const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bcrypt = require("bcrypt-nodejs");

const userdetails = new Schema({
  firstname: {
    type: String,
    default: ""
  },
  lastname: {
    type: String,
    default: ""
  },
  email: {
    type: String,
    default: ""
  },
  password: {
    type: String,
    default: ""
  }
});

/*userdetails.pre("save", function(next) {
  // generate a salt
  return bcrypt.genSalt(10, function(error, salt) {
    if (error) {
      return next(error);
    }

    // hash the password using the new salt
    return bcrypt.hash(this.password, salt, function(error, hash) {
      if (error) {
        return next(error);
      }
      // override the cleartext password with the hashed one
      this.password = hash;
      return next();
    });
  });
});

userdetails.methods.comparePassword = function(passw, cb) {
  bcrypt.compare(passw, this.password, function(err, isMatch) {
    if (err) {
      return cb(err, false);
    }
    return cb(null, isMatch);
  });
};*/

userdetails.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userdetails.methods.validatePassword = function(loginUser, passwordfromDB) {
  //console.log("<userdetails.js>pwd: " + passwordfromDB);
  //console.log("<userdetails.js>existing user's pwd: " + loginUser.password);
  return bcrypt.compareSync(loginUser.password, passwordfromDB);
};

var allUserDetails = mongoose.model("UserDetails", userdetails, "userdetails");
module.exports = allUserDetails;
