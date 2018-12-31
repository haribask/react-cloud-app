const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const airbnbdata = new Schema({
  room_type: String,
  country: String,
  city: String,
  neighborhood: String,
  reviews: Number,
  overall_satisfaction: Number,
  accommodates: Number,
  bedrooms: Number,
  bathrooms: Number,
  price: Number
});

var allAirbnbdata = mongoose.model("AirbnbData", airbnbdata, "airbnbdataset");
module.exports = allAirbnbdata;
