// ReportController – GET /api/reports/technicians, GET /api/reports/monthly-trend
const str = (v) => (v === undefined || v === '' ? undefined : String(v));

function createReportController(reportService) {
  return {
    technicians: async (req, res) => res.json(await reportService.byTechnician(req.user, { month: str(req.query.month) })),
    monthlyTrend: async (req, res) => res.json(
      await reportService.monthlyTrend(req.user, { from: str(req.query.from), to: str(req.query.to) }),
    ),
  };
}

module.exports = { createReportController };
