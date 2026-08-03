require("dotenv").config();

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET must be set to a random string of at least 32 characters.");
  process.exit(1);
}
if (!process.env.API_SECRET || process.env.API_SECRET.length < 16) {
  console.error("API_SECRET must be set to a random string of at least 16 characters.");
  process.exit(1);
}

exports.SECRET = process.env.SESSION_SECRET;
exports.LOG_TIME_FORMAT = "DD MMM YY, HH:MM:ss";
exports.PORT = process.env.PORT || "8080";
exports.IP = process.env.IP || "0.0.0.0";
exports.GRADER_PORT = process.env.GRADER_PORT || "9500";
exports.GRADER_IP = process.env.GRADER_IP || "127.0.0.1";
exports.GRADER_KEY = process.env.GRADER_KEY || "change-me-to-a-random-string";
exports.TIME_FORMAT = "DD MMM YY, HH:mm:ss";
exports.API_SECRET = process.env.API_SECRET;
exports.LANGUAGES = { java: "Java", py: "Python", pas: "Pascal", cpp: "C++11" };
