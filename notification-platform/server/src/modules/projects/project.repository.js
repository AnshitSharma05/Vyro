const prisma = require('../../config/database');

class ProjectRepository {
  async create({ organizationId, name, slug }) {
    return prisma.project.create({
      data: {
        organizationId,
        name,
        slug,
      },
    });
  }

  async findByOrganizationIdAndSlug(organizationId, slug) {
    return prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });
  }

  async findProjectsByOrganizationId(organizationId) {
    return prisma.project.findMany({
      where: { organizationId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findProjectById(id) {
    return prisma.project.findUnique({
      where: { id },
    });
  }

  async findProjectByIdAndOrganizationId(id, organizationId) {
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.organizationId !== organizationId) {
      return null;
    }

    return project;
  }

  async update(id, data) {
    return prisma.project.update({
      where: { id },
      data,
    });
  }
}

module.exports = new ProjectRepository();
