const requestIp = require("request-ip");
const ButtonClick = require("../model/button.model");
const WebsiteVisit = require("../model/website.model");

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
    let dateFilter = {};

    if (startDate && endDate) {
      startDate = new Date(startDate);
      endDate = new Date(endDate);
      endDate.setHours(23, 59, 59, 999);

      if (isNaN(startDate) || isNaN(endDate)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      dateFilter = { "visits.visitedAt": { $gte: startDate, $lte: endDate } };
    }

    const websiteVisits = await WebsiteVisit.find(dateFilter);

    const websiteStats = await Promise.all(
      websiteVisits.map(async (visit) => {
        const buttonData = await ButtonClick.findOne({
          websiteId: visit.websiteId,
          ...(startDate && endDate && {
            "buttons.clickedAt": { $gte: startDate, $lte: endDate },
          }),
        });

        const buttonClicks = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        if (buttonData?.buttons) {
          buttonData.buttons.forEach((btn) => {
            if ([1, 2, 3, 4, 5].includes(btn.buttonId)) {
              buttonClicks[btn.buttonId] = btn.clicked;
            }
          });
        }

        const filteredVisits = startDate
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