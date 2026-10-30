// InvitationController – API1 POST /api/survey-invitations
const { validateInvitationBody } = require('../validators/survey.validator');
const { logger } = require('../logger');

function createInvitationController(invitationService) {
  return {
    create: async (req, res) => {
      const { ticket_code } = validateInvitationBody(req.body);
      const invitation = await invitationService.createForTicket(ticket_code);
      // Sự kiện nghiệp vụ: chỉ ghi mã, không ghi token (token là "chìa khoá" mở trang khảo sát)
      logger.info({ requestId: req.requestId, invitationId: invitation.invitation_id, ticketCode: ticket_code }, 'đã tạo lời mời khảo sát');
      res.status(201).json(invitation);
    },
  };
}

module.exports = { createInvitationController };
