const planService = require('./plan.service');
const ApiResponse = require('../../shared/utils/api-response');
const asyncHandler = require('../../shared/utils/async-handler');

class PlanController {
  list = asyncHandler(async (req, res) => {
    const plans = await planService.listPlans();
    return ApiResponse.success(res, 'Subscription plans retrieved successfully', { plans }, 200);
  });

  changePlan = asyncHandler(async (req, res) => {
    const { organizationId } = req.params;
    const { planCode } = req.body;

    const orgWithPlan = await planService.changeOrganizationPlan(organizationId, planCode);
    return ApiResponse.success(res, `Organization plan updated to ${planCode}`, { organization: orgWithPlan }, 200);
  });
}

module.exports = new PlanController();
