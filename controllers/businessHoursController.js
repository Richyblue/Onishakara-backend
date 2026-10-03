const BusinessHours = require("../models/BusinessHours");

const defaultSchedule = [
  {
    dayOfWeek: "monday",
    openingTime: "09:00:00",
    closingTime: "21:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
  {
    dayOfWeek: "tuesday",
    openingTime: "09:00:00",
    closingTime: "21:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
  {
    dayOfWeek: "wednesday",
    openingTime: "09:00:00",
    closingTime: "21:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
  {
    dayOfWeek: "thursday",
    openingTime: "09:00:00",
    closingTime: "21:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
  {
    dayOfWeek: "friday",
    openingTime: "09:00:00",
    closingTime: "22:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
  {
    dayOfWeek: "saturday",
    openingTime: "09:00:00",
    closingTime: "22:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
  {
    dayOfWeek: "sunday",
    openingTime: "12:00:00",
    closingTime: "20:00:00",
    isOpen: true,
    gracePeriod: 15,
  },
];


// Get weekly schedule
exports.getBusinessHours = async (req, res) => {
  try {
    let hours = await BusinessHours.findAll({
      order: [["id", "ASC"]],
    });

    // Create default schedule if empty
    if (hours.length === 0) {
      await BusinessHours.bulkCreate(defaultSchedule);

      hours = await BusinessHours.findAll({
        order: [["id", "ASC"]],
      });
    }

    return res.status(200).json({
      success: true,
      businessHours: hours,
    });
  } catch (error) {
    console.error("GET BUSINESS HOURS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load business hours",
      error: error.message,
    });
  }
};


// Update weekly schedule
exports.updateBusinessHours = async (req, res) => {
  try {
    const { businessHours } = req.body;

    if (!Array.isArray(businessHours)) {
      return res.status(400).json({
        success: false,
        message: "businessHours must be an array",
      });
    }

    for (const item of businessHours) {
      if (!item.dayOfWeek) continue;

      await BusinessHours.upsert({
        dayOfWeek: item.dayOfWeek,
        openingTime: item.openingTime,
        closingTime: item.closingTime,
        isOpen: item.isOpen,
        gracePeriod: item.gracePeriod,
      });
    }

    const updatedHours = await BusinessHours.findAll({
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      message: "Business hours updated successfully",
      businessHours: updatedHours,
    });
  } catch (error) {
    console.error("UPDATE BUSINESS HOURS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update business hours",
      error: error.message,
    });
  }
};

// Get today's business hours
exports.getTodayBusinessHours = async (req, res) => {
  try {
    // Get today's day based on Lagos/Nigeria time
    const today = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Africa/Lagos",
    })
      .format(new Date())
      .toLowerCase();

    const businessHours = await BusinessHours.findOne({
      where: {
        dayOfWeek: today,
      },
    });

    if (!businessHours) {
      return res.status(404).json({
        success: false,
        message: "Business hours not configured for today",
      });
    }

    return res.status(200).json({
      success: true,
      businessHours,
    });
  } catch (error) {
    console.error("GET TODAY BUSINESS HOURS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load today's business hours",
      error: error.message,
    });
  }
};