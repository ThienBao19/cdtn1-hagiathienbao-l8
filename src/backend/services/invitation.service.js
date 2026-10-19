// InvitationService – quy tắc tạo lời mời khảo sát (US1, FR1, UC1).
//  • QT-10: chỉ tạo lời mời cho phiếu ở trạng thái Đã đóng, mỗi phiếu đúng 1 lời mời.
//  • NFR4 : mã lời mời là chuỗi ngẫu nhiên 64 ký tự hex.
//  • BR-L8-01: hạn trả lời = created_at + 7 ngày; trạng thái lời mời TÍNH khi đọc, không lưu.
// Không biết gì về HTTP (req/res/mã trạng thái) – chỉ ném AppError có mã lỗi nghiệp vụ.
const crypto = require('crypto');
const { AppError, DuplicateKeyError } = require('../errors/app-error');

const DAY_MS = 24 * 60 * 60 * 1000;
const STATUS = { CHO_TRA_LOI: 'CHO_TRA_LOI', DA_TRA_LOI: 'DA_TRA_LOI', HET_HAN: 'HET_HAN' };

function expiresAt(createdAt, validDays) {
  return new Date(new Date(createdAt).getTime() + validDays * DAY_MS);
}

// Trạng thái lời mời (thuật ngữ SRS): Đã trả lời nếu có phản hồi; Hết hạn nếu đã QUA hạn; còn lại Chờ trả lời.
// Đúng thời điểm hết hạn vẫn còn hiệu lực; trễ 1 ms là hết hạn.
function computeInvitationStatus({ createdAt, hasResponse, now, validDays }) {
  if (hasResponse) return STATUS.DA_TRA_LOI;
  return now.getTime() > expiresAt(createdAt, validDays).getTime() ? STATUS.HET_HAN : STATUS.CHO_TRA_LOI;
}

function createInvitationService({
  ticketRepository,
  invitationRepository,
  now = () => new Date(),
  generateToken = () => crypto.randomBytes(32).toString('hex'),
  validDays = 7,
  frontendUrl = 'http://localhost:5173',
}) {
  return {
    async createForTicket(ticketCode) {
      const ticket = await ticketRepository.findByCode(ticketCode);
      if (!ticket) throw new AppError('TICKET_NOT_FOUND', `Không tìm thấy phiếu bảo hành ${ticketCode}`);
      if (ticket.status !== 'DA_DONG') {
        throw new AppError('TICKET_NOT_CLOSED', 'Chỉ khảo sát phiếu ở trạng thái Đã đóng');
      }
      const existing = await invitationRepository.findByTicketId(ticket.ticket_id);
      if (existing) throw new AppError('INVITATION_EXISTS', 'Phiếu đã có lời mời khảo sát');

      let invitation;
      try {
        invitation = await invitationRepository.insert({ ticket_id: ticket.ticket_id, token: generateToken() });
      } catch (err) {
        // Hai yêu cầu đến cùng lúc: ràng buộc UNIQUE(ticket_id) chặn bản thứ hai (NFR5).
        if (err instanceof DuplicateKeyError) throw new AppError('INVITATION_EXISTS', 'Phiếu đã có lời mời khảo sát');
        throw err;
      }
      return {
        invitation_id: invitation.invitation_id,
        ticket_code: ticket.ticket_code,
        token: invitation.token,
        status: computeInvitationStatus({ createdAt: invitation.created_at, hasResponse: false, now: now(), validDays }),
        expires_at: expiresAt(invitation.created_at, validDays).toISOString(),
        survey_url: `${frontendUrl}/khao-sat/${invitation.token}`,
      };
    },
  };
}

module.exports = { createInvitationService, computeInvitationStatus, expiresAt, STATUS };
