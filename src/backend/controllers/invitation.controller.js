// InvitationController – API1 POST /api/survey-invitations
const { validateInvitationBody } = require('../validators/survey.validator');

function createInvitationController(invitationService) {
  return {
    create: async (req, res) => {
      const { ticket_code } = validateInvitationBody(req.body);
      res.status(201).json(await invitationService.createForTicket(ticket_code));
    },
  };
}

module.exports = { createInvitationController };
