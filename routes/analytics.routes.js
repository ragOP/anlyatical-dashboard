const express = require("express");
const {
  handleclickButton,
  handleClickWebsite,
  handleGetAllWebsiteViews,
} = require("../controllers/analytics.controllers");

const route = express.Router();

route.post("/button", handleclickButton);
route.post("/website", handleClickWebsite);
route.post("/analytics/all-website-views", handleGetAllWebsiteViews);

module.exports = route;