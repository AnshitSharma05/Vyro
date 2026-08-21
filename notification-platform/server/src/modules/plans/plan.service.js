const planRepository = require('./plan.repository');
const NotFoundError = require('../../shared/errors/not-found-error');

class PlanService {
  async listPlans() {
    return planRepository.findAll();
  }

  async getPlanByCode(code) {
    const plan = await planRepository.findByCode(code);
    if (!plan) {
      throw new NotFoundError(`Plan "${code}" not found`);
    }
    return plan;
  }

  async changeOrganizationPlan(organizationId, planCode) {
    const plan = await this.getPlanByCode(planCode);
    return planRepository.assignPlanToOrg(organizationId, plan.id);
  }
}

module.exports = new PlanService();
