const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

dayjs.extend(utc);
dayjs.extend(timezone);

exports.changeServerTimezone = () => {
  const usaTimeZone = "America/New_York";
  const currentDate = dayjs().tz(usaTimeZone);
  return currentDate.format("YYYY-MM-DD HH:mm:ss ZZ");
};
