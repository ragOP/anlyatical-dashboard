const express = require("express");
const {
  handleclickButton,
  handleClickWebsite,
  handleGetAllWebsiteViews,
  handleStartSession,
  handleEndSession,
  handleSessionTransaction,
  handleGetWebsiteAnalytics,
  handlePostTodo,
  handleGetTodos,
} = require("../controllers/analytics.controllers");

const route = express.Router();

route.post("/button", handleclickButton);
route.post("/website", handleClickWebsite);
route.get("/analytics/all-website-views", handleGetAllWebsiteViews);
route.post("/session/start", handleStartSession);
route.post("/session/end", handleEndSession);
route.post("/session/interaction", handleSessionTransaction);
route.get("/analytics/single/website-view/:websiteId", handleGetWebsiteAnalytics);
route.post("/todo", handlePostTodo);
route.get("/todo", handleGetTodos);

module.exports = route;