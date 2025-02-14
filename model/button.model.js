const mongoose = require("mongoose");

const buttonClickSchema = new mongoose.Schema(
  {
    websiteId: {
      type: String,
      required: true,
    },
    buttons: [
      {
        buttonId: {
          type: Number,
          required: [true, "Button ID is required"],
          enum: [1, 2, 3, 4, 5],
        },
        clicked: {
          type: Number,
          default: 0,
        },
        ipAddresses: {
          type: [String],
          default: [],
        },
        clickedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

const ButtonClick = mongoose.model("ButtonClick", buttonClickSchema);

module.exports = ButtonClick;
