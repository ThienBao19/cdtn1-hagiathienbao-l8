// AuthController – POST /api/auth/login
const { validateLoginBody } = require('../validators/auth.validator');

function createAuthController(authService) {
  return {
    login: async (req, res) => {
      const { username, password } = validateLoginBody(req.body);
      res.json(await authService.login(username, password));
    },
  };
}

module.exports = { createAuthController };
