const prisma = require('../../config/database');
const { DEFAULT_PLANS } = require('../../shared/quotas/quota.constants');

class PlanRepository {
  async seedDefaultPlans() {
    for (const planDef of Object.values(DEFAULT_PLANS)) {
      const existing = await prisma.plan.findUnique({
        where: { code: planDef.code },
      });

      if (!existing) {
        await prisma.plan.create({
          data: {
            code: planDef.code,
            name: planDef.name,
            description: planDef.description,
            active: true,
            limits: {
              create: Object.entries(planDef.limits).map(([metric, limit]) => ({
                metric,
                limit,
              })),
            },
          },
        });
      }
    }
  }

  async findAll() {
    await this.seedDefaultPlans();
    return prisma.plan.findMany({
      where: { active: true },
      include: { limits: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findByCode(code) {
    await this.seedDefaultPlans();
    return prisma.plan.findUnique({
      where: { code },
      include: { limits: true },
    });
  }

  async findById(id) {
    return prisma.plan.findUnique({
      where: { id },
      include: { limits: true },
    });
  }

  async assignPlanToOrg(organizationId, planId) {
    return prisma.organization.update({
      where: { id: organizationId },
      data: { planId },
      include: { plan: { include: { limits: true } } },
    });
  }
}

module.exports = new PlanRepository();
