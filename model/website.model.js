const mongoose = require("mongoose");

const websiteVisitSchema = new mongoose.Schema({
  websiteId: {
    type: Number,
    required: true,
    unique: true,
  },
  websiteName: {
    type: String,
    required: false,
    unique: true,
  },
  ipAddresses: [
    {
      type: String,
    },
  ],
  visits: [
    {
      visitedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
});

const WebsiteVisit = mongoose.model("WebsiteVisit", websiteVisitSchema);

module.exports = WebsiteVisit;
