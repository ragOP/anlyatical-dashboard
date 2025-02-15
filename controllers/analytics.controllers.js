const requestIp = require("request-ip");
const dayjs = require("dayjs");
const ButtonClick = require("../model/button.model");
const WebsiteVisit = require("../model/website.model");
const sessionModel = require("../model/session.model");
const Todo = require("../model/todo.model");

exports.handleclickButton = async (req, res) => {
  try {
    let { websiteId, buttonId } = req.body;
    const clientIp = requestIp.getClientIp(req);

    if (!websiteId || buttonId === undefined || buttonId === null) {
      return res.status(400).send({
        success: false,
        message: "websiteId and buttonId are required",
      });
    }

    if (![1, 2, 3, 4, 5].includes(buttonId)) {
      return res.status(400).send({
        success: false,
        message: "Invalid buttonId. It must be between 1 and 5.",
      });
    }

    let websiteButtons = await ButtonClick.findOne({ websiteId });

    if (!websiteButtons) {
      await ButtonClick.create({
        websiteId,
        buttons: [
          {
            buttonId,
            clicked: 1,
            ipAddresses: [clientIp],
            clickedAt: Date.now(),
          },
        ],
      });

      return res.status(201).send({
        success: true,
        message: `Button ${buttonId} clicked successfully`,
        data: {
          websiteId,
          buttons: [
            {
              buttonId,
              clicked: 1,
              ipAddresses: [clientIp],
              clickedAt: Date.now(),
            },
          ],
        },
      });
    }

    const buttonIndex = websiteButtons.buttons.findIndex(
      (btn) => btn.buttonId === buttonId
    );

    if (buttonIndex === -1) {
      await ButtonClick.updateOne(
        { websiteId },
        {
          $push: {
            buttons: {
              buttonId,
              clicked: 1,
              ipAddresses: [clientIp],
              clickedAt: Date.now(),
            },
          },
        }
      );
    } else {
      const existingButton = websiteButtons.buttons[buttonIndex];

      if (existingButton.ipAddresses.includes(clientIp)) {
        return res.status(400).send({
          success: false,
          message: "User has already clicked this button",
        });
      }
      await ButtonClick.updateOne(
        { websiteId, "buttons.buttonId": buttonId },
        {
          $inc: { "buttons.$.clicked": 1 },
          $push: { "buttons.$.ipAddresses": clientIp },
          $set: { "buttons.$.clickedAt": Date.now() },
        }
      );
    }

    const finalResponse = await ButtonClick.findOne({ websiteId });

    res.status(200).send({
      success: true,
      message: `Button ${buttonId} clicked successfully`,
      data: finalResponse,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.handleClickWebsite = async (req, res) => {
  try {
    const { websiteId, websiteName } = req.body;
    const clientIp = requestIp.getClientIp(req);

    if (!websiteId || !websiteName) {
      return res.status(400).json({
        success: false,
        message: "websiteId and websiteName are required",
      });
    }

    const existingVisit = await WebsiteVisit.findOne({ websiteId });

    if (existingVisit) {
      const isIpRecorded = existingVisit.ipAddresses.includes(clientIp);

      if (isIpRecorded) {
        return res.status(400).json({
          success: false,
          message: "User already visited this website",
        });
      }
      existingVisit.ipAddresses.push(clientIp);
      existingVisit.visits.push({ visitedAt: new Date() });
      await existingVisit.save();
    } else {
      await WebsiteVisit.create({
        websiteId,
        websiteName,
        ipAddresses: [clientIp],
        visits: [{ visitedAt: new Date() }],
      });
    }
    res.status(200).json({
      success: true,
      message: "Website visit logged successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.handleGetAllWebsiteViews = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    if (startDate && endDate) {
      startDate = dayjs(startDate).startOf("day").toDate();
      endDate = dayjs(endDate).endOf("day").toDate();

      if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }
    } else {
      endDate = dayjs().endOf("day").toDate();
      startDate = dayjs().subtract(7, "days").startOf("day").toDate();
    }

    let dateFilter =
      startDate && endDate
        ? { "visits.visitedAt": { $gte: startDate, $lte: endDate } }
        : {};

    const websiteVisits = await WebsiteVisit.find(dateFilter);

    const websiteStats = await Promise.all(
      websiteVisits.map(async (visit) => {
        const buttonData = await ButtonClick.findOne(
          startDate && endDate
            ? {
                websiteId: visit.websiteId,
                "buttons.clickedAt": { $gte: startDate, $lte: endDate },
              }
            : { websiteId: visit.websiteId }
        );

        const buttonClicks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        if (buttonData?.buttons) {
          buttonData.buttons.forEach((btn) => {
            if ([1, 2, 3, 4, 5].includes(btn.buttonId)) {
              buttonClicks[btn.buttonId] = btn.clicked;
            }
          });
        }

        const filteredVisits =
          startDate && endDate
            ? visit.visits.filter(
                (v) => v.visitedAt >= startDate && v.visitedAt <= endDate
              )
            : visit.visits;

        const totalVisits = filteredVisits.length;
        const uniqueVisitors = new Set(filteredVisits.map((v) => v.ipAddress))
          .size;
        const fifthButtonClicks = buttonClicks[5];

        const conversionPercentage =
          totalVisits > 0
            ? ((fifthButtonClicks / totalVisits) * 100).toFixed(2)
            : "0";

        let history = [];
        let currentDate = dayjs();

        for (let i = 0; i < 7; i++) {
          const dateString = currentDate.format("YYYY-MM-DD");

          const dailyVisits = filteredVisits.filter(
            (visit) =>
              dayjs(visit.visitedAt).format("YYYY-MM-DD") === dateString
          );

          const dailyTotalVisits = dailyVisits.length;
          const dailyUniqueVisitors = new Set(
            dailyVisits.map((v) => v.ipAddress)
          ).size;

          const dailyButtonClicks = buttonData?.buttons.filter(
            (btn) => dayjs(btn.clickedAt).format("YYYY-MM-DD") === dateString
          );

          const dailyFifthButtonClicks =
            dailyButtonClicks?.reduce(
              (acc, btn) => (btn.buttonId === 5 ? acc + btn.clicked : acc),
              0
            ) || 0;

          const dailyConversionPercentage =
            dailyTotalVisits > 0
              ? ((dailyFifthButtonClicks / dailyTotalVisits) * 100).toFixed(2)
              : "0";

          history.push({
            date: dayjs(dateString).format("dddd"),
            uniqueVisitors: dailyUniqueVisitors,
            totalVisits: dailyTotalVisits,
            conversionPercentage: `${dailyConversionPercentage}`,
          });

          currentDate = currentDate.subtract(1, "day");
        }

        return {
          websiteId: visit.websiteId,
          websiteName: visit.websiteName,
          uniqueVisitors,
          totalVisits,
          conversionPercentage: `${conversionPercentage}`,
          buttonClicks,
          dateRange: startDate
            ? { startDate, endDate }
            : { startDate: "All Time", endDate: "All Time" },
          history,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: websiteStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.handleStartSession = async (req, res) => {
  try {
    const { websiteId, sessionId } = req.body;
    const clientIp = requestIp.getClientIp(req);

    if (!websiteId || !sessionId) {
      return res.status(400).send({
        success: false,
        message: "websiteId and sessionId are required",
      });
    }

    await sessionModel.create({
      websiteId,
      sessionId,
      startTime: new Date(),
      clientIp,
      interactions: 0,
    });

    res.status(200).send({ success: true, message: "Session started" });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
};

exports.handleEndSession = async (req, res) => {
  try {
    const { websiteId, sessionId } = req.body;

    const session = await sessionModel.findOne({ websiteId, sessionId });
    if (!session) {
      return res
        .status(404)
        .send({ success: false, message: "Session not found" });
    }

    const endTime = new Date();
    const sessionDuration = (endTime - session.startTime) / 1000;

    await sessionModel.updateOne(
      { websiteId, sessionId },
      { $set: { endTime, sessionDuration } }
    );

    res.status(200).send({
      success: true,
      message: "Session ended",
      duration: sessionDuration,
    });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
};

exports.handleSessionTransaction = async (req, res) => {
  try {
    const { websiteId, sessionId } = req.body;

    await sessionModel.updateOne(
      { websiteId, sessionId },
      { $inc: { interactions: 1 } }
    );

    res.status(200).send({ success: true, message: "Interaction recorded" });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message });
  }
};

exports.handleGetWebsiteAnalytics = async (req, res) => {
  try {
    const { websiteId } = req.params;
    let { startDate, endDate } = req.query;

    if (!websiteId) {
      return res.status(400).json({
        success: false,
        message: "Website ID is required",
      });
    }

    let dateFilter = {};
    if (startDate && endDate) {
      startDate = dayjs(startDate).startOf("day").toDate();
      endDate = dayjs(endDate).endOf("day").toDate();
      dateFilter = { $gte: startDate, $lte: endDate };
    }

    const websiteVisit = await WebsiteVisit.findOne(
      startDate && endDate
        ? { websiteId, "visits.visitedAt": dateFilter }
        : { websiteId }
    );

    if (!websiteVisit) {
      return res.status(404).json({
        success: false,
        message: "No website visit data found",
      });
    }

    const buttonData = await ButtonClick.findOne(
      startDate && endDate
        ? { websiteId, "buttons.clickedAt": dateFilter }
        : { websiteId }
    );

    const buttonClicks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (buttonData?.buttons) {
      buttonData.buttons.forEach((btn) => {
        if ([1, 2, 3, 4, 5].includes(btn.buttonId)) {
          buttonClicks[btn.buttonId] = btn.clicked;
        }
      });
    }

    const filteredVisits =
      startDate && endDate
        ? websiteVisit.visits.filter(
            (v) => v.visitedAt >= startDate && v.visitedAt <= endDate
          )
        : websiteVisit.visits;

    const totalVisits = filteredVisits.length;
    const uniqueVisitors = new Set(filteredVisits.map((v) => v.ipAddress)).size;
    const fifthButtonClicks = buttonClicks[5];

    const conversionPercentage =
      totalVisits > 0
        ? ((fifthButtonClicks / totalVisits) * 100).toFixed(2)
        : "0";

    const sessions = await sessionModel.find(
      startDate && endDate
        ? { websiteId, updatedAt: dateFilter }
        : { websiteId }
    );

    const totalSessions = sessions.length;
    const totalDuration = sessions.reduce(
      (acc, session) => acc + (session.sessionDuration || 0),
      0
    );
    const bounces = sessions.filter(
      (session) => session.interactions === 0
    ).length;

    const averageSessionDuration = totalSessions
      ? (totalDuration / totalSessions).toFixed(2)
      : "0";
    const bounceRate = totalSessions
      ? ((bounces / totalSessions) * 100).toFixed(2)
      : "0";

      let history = [];
      let currentDate = dayjs();
  
      for (let i = 0; i < 7; i++) {
        const dateString = currentDate.format("YYYY-MM-DD");
  
        const dailyVisits = websiteVisit.visits.filter(
          (visit) => dayjs(visit.visitedAt).format("YYYY-MM-DD") === dateString
        );
  
        const dailySessions = sessions.filter(
          (session) => dayjs(session.updatedAt).format("YYYY-MM-DD") === dateString
        );
  
        const dailyTotalVisits = dailyVisits.length;
        const dailyUniqueVisitors = new Set(dailyVisits.map((v) => v.ipAddress)).size;
        const dailyBounces = dailySessions.filter((s) => s.interactions === 0).length;
        const dailyTotalSessions = dailySessions.length;
  
        const dailyBounceRate = dailyTotalSessions
          ? ((dailyBounces / dailyTotalSessions) * 100).toFixed(2)
          : "0";
  
        const dailyButtonClicks = buttonData?.buttons.filter(
          (btn) => dayjs(btn.clickedAt).format("YYYY-MM-DD") === dateString
        );
  
        const dailyFifthButtonClicks =
          dailyButtonClicks?.reduce(
            (acc, btn) => (btn.buttonId === 5 ? acc + btn.clicked : acc),
            0
          ) || 0;
  
        const dailyConversionPercentage =
          dailyTotalVisits > 0
            ? ((dailyFifthButtonClicks / dailyTotalVisits) * 100).toFixed(2)
            : "0";
  
        history.push({
          date: dayjs(dateString).format("dddd"),
          uniqueVisitors: dailyUniqueVisitors,
          totalVisits: dailyTotalVisits,
          conversionPercentage: `${dailyConversionPercentage}`,
          bounceRate: `${dailyBounceRate}`,
        });
  
        currentDate = currentDate.subtract(1, "day");
      }

    res.status(200).json({
      success: true,
      data: {
        websiteId,
        websiteName: websiteVisit.websiteName,
        uniqueVisitors,
        totalVisits,
        conversionPercentage: `${conversionPercentage}`,
        buttonClicks,
        averageSessionDuration: `${averageSessionDuration} seconds`,
        bounceRate: `${bounceRate}`,
        dateRange: startDate
          ? { startDate, endDate }
          : { startDate: "All Time", endDate: "All Time" },
        history,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

exports.handlePostTodo = async (req, res) => {
  try {
    const { todos } = req.body;

    if (!Array.isArray(todos)) {
      return res.status(400).json({
        success: false,
        message: "The provided data must be an array of todos",
      });
    }

    const todoItems = todos.map((todo) => ({
      text: todo.text,
      isCompleted: todo.isCompleted || false,
    }));

    await Todo.insertMany(todoItems);

    return res.status(200).json({
      success: true,
      message: "Todos saved successfully!",
      data: todoItems,
    });
  } catch (error) {
    console.error("Error while processing todo array:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

exports.handleGetTodos = async (req, res) => {
  try {
    const todos = await Todo.find();
    if (todos.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No todos found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Todos fetched successfully!",
      data: todos,
    });
  } catch (error) {
    console.error("Error while fetching todos:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
