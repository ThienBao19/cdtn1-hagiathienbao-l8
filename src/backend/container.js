// Nối các lớp: pool -> repositories -> services. Chỉ file này biết cả ba lớp.
const env = require('./config/env');
const { createCustomerRepository } = require('./repositories/customer.repository');
const { createTechnicianRepository } = require('./repositories/technician.repository');
const { createTicketRepository } = require('./repositories/ticket.repository');
const { createInvitationRepository } = require('./repositories/invitation.repository');
const { createResponseRepository } = require('./repositories/response.repository');
const { createCustomerService } = require('./services/customer.service');
const { createTechnicianService } = require('./services/technician.service');
const { createInvitationService } = require('./services/invitation.service');
const { createSurveyService } = require('./services/survey.service');

function buildServices(db) {
  const customerRepository = createCustomerRepository(db);
  const technicianRepository = createTechnicianRepository(db);
  const ticketRepository = createTicketRepository(db);
  const invitationRepository = createInvitationRepository(db);
  const responseRepository = createResponseRepository(db);
  const validDays = env.invitationValidDays;
  return {
    customerService: createCustomerService({ customerRepository }),
    technicianService: createTechnicianService({ technicianRepository }),
    invitationService: createInvitationService({ ticketRepository, invitationRepository, validDays, frontendUrl: env.frontendUrl }),
    surveyService: createSurveyService({ invitationRepository, responseRepository, validDays }),
  };
}

module.exports = { buildServices };
