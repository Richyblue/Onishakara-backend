const BusinessHours = require("../models/BusinessHours");

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const getNigeriaDateParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type) =>
    parts.find((part) => part.type === type)?.value;

  return {
    dayOfWeek: getPart("weekday").toLowerCase(),
    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
  };
};

const getTodayBusinessHours = async (date = new Date()) => {
  const { dayOfWeek } = getNigeriaDateParts(date);

  console.log("Nigeria day:", dayOfWeek);

  const businessHours = await BusinessHours.findOne({
    where: {
      dayOfWeek,
    },
  });

  return businessHours;
};

const getCurrentMinutes = (date = new Date()) => {
  const { hour, minute } = getNigeriaDateParts(date);

  return hour * 60 + minute;
};

const timeToMinutes = (time) => {
  if (!time) return 0;

  const parts = String(time).substring(0, 8).split(":");

  const hour = Number(parts[0] || 0);
  const minute = Number(parts[1] || 0);

  return hour * 60 + minute;
};

module.exports = {
  getTodayBusinessHours,
  getCurrentMinutes,
  timeToMinutes,
  getNigeriaDateParts,
};
// const BusinessHours = require("../models/BusinessHours");

// const dayNames = [
//   "sunday",
//   "monday",
//   "tuesday",
//   "wednesday",
//   "thursday",
//   "friday",
//   "saturday",
// ];

// const getTodayBusinessHours = async (date = new Date()) => {
//   const dayOfWeek = dayNames[date.getDay()];

//   const businessHours = await BusinessHours.findOne({
//     where: {
//       dayOfWeek,
//     },
//   });

//   return businessHours;
// };

// const timeToMinutes = (time) => {
//   if (!time) return 0;

//   const parts = String(time).substring(0, 8).split(":");

//   const hour = Number(parts[0] || 0);
//   const minute = Number(parts[1] || 0);

//   return hour * 60 + minute;
// };

// module.exports = {
//   getTodayBusinessHours,
//   timeToMinutes,
// };

