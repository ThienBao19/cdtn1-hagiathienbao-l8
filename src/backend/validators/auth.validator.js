const { requireBody, requireString } = require('./common');

function validateLoginBody(raw) {
  const body = requireBody(raw);
  return {
    username: requireString(body, 'username', { max: 50 }),
    password: requireString(body, 'password', { max: 200 }),
  };
}

module.exports = { validateLoginBody };
