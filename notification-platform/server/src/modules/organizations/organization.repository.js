const prisma = require('../../config/database');

class OrganizationRepository {
  async createWithMember({ name, slug, userId }) {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
        },
      });

      const member = await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId,
          role: 'OWNER',
        },
      });

      return {
        ...organization,
        membership: member,
      };
    });
  }

  async findBySlug(slug) {
    return prisma.organization.findUnique({
      where: { slug },
    });
  }

  async findById(id) {
    return prisma.organization.findUnique({
      where: { id },
    });
  }

  async findUserOrganizations(userId) {
    const memberships = await prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      joinedAt: m.createdAt,
    }));
  }

  async findMembership(organizationId, userId) {
    return prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
  }

  async findMembers(organizationId) {
    return prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(id, data) {
    return prisma.organization.update({
      where: { id },
      data,
    });
  }
}

module.exports = new OrganizationRepository();
