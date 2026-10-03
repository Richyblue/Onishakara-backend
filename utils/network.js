const axios = require('axios');

async function isOnline() {
  try {
    await axios.get('https://google.com');
    return true;
  } catch {
    return false;
  }
}

module.exports = isOnline;