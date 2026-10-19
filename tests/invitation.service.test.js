// Kiểm thử InvitationService – QT-10 (US1, AC1.1–AC1.3)
const { createInvitationService } = require('../src/backend/services/invitation.service');
const { createFakeDb } = require('./fakes/in-memory-repositories');

const NOW = new Date('2026-10-02T02:30:00Z');

function setup() {
  const fake = createFakeDb({ now: () => NOW });
  const service = createInvitationService({ ...fake, now: () => NOW, validDays: 7 });
  return { fake, service };
}

describe('InvitationService.createForTicket – QT-10', () => {
  test('[Luồng đúng] AC1.1: phiếu Đã đóng, chưa có lời mời -> tạo đúng 1 lời mời, token 64 hex, hạn 7 ngày', async () => {
    const { fake, service } = setup();
    fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });

    const result = await service.createForTicket('BH-000123/2026');

    expect(result.status).toBe('CHO_TRA_LOI');
    expect(result.token).toMatch(/^[0-9a-f]{64}$/);
    expect(result.expires_at).toBe('2026-10-09T02:30:00.000Z');
    expect(result.survey_url).toContain(result.token);
    expect(fake.db.invitations).toHaveLength(1);
  });

  test('[Dữ liệu sai] AC1.2: gửi sự kiện đóng phiếu lần 2 -> INVITATION_EXISTS, vẫn chỉ có 1 lời mời', async () => {
    const { fake, service } = setup();
    fake.addTicket({ ticket_code: 'BH-000123/2026', status: 'DA_DONG' });
    await service.createForTicket('BH-000123/2026');

    await expect(service.createForTicket('BH-000123/2026'))
      .rejects.toMatchObject({ code: 'INVITATION_EXISTS', message: 'Phiếu đã có lời mời khảo sát' });
    expect(fake.db.invitations).toHaveLength(1);
  });

  test('[Dữ liệu sai] AC1.3: phiếu Hoàn tất (chưa đóng) -> TICKET_NOT_CLOSED, không tạo lời mời', async () => {
    const { fake, service } = setup();
    fake.addTicket({ ticket_code: 'BH-000124/2026', status: 'HOAN_TAT', closed_at: null });

    await expect(service.createForTicket('BH-000124/2026'))
      .rejects.toMatchObject({ code: 'TICKET_NOT_CLOSED', message: 'Chỉ khảo sát phiếu ở trạng thái Đã đóng' });
    expect(fake.db.invitations).toHaveLength(0);
  });

  test('[Dữ liệu sai] mã phiếu không tồn tại -> TICKET_NOT_FOUND', async () => {
    const { service } = setup();
    await expect(service.createForTicket('BH-999999/2026')).rejects.toMatchObject({ code: 'TICKET_NOT_FOUND' });
  });
});
