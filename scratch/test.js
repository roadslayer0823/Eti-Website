const assert = require('assert');
const user = { username: 'test', loginCount: 4 };

if (user.loginCount >= 4) {
  console.log("Blocked: reached limit 4");
} else {
  console.log("Allowed");
}
