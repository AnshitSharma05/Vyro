const prisma = require('../../config/database');

class ApiKeyRepository {
  async create({ projectId, name, keyPrefix, keyHash, expiresAt, scopes = [] }) {
    return prisma.apiKey.create({
      data: {
        projectId,
        name,
        keyPrefix,
        keyHash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scopes: scopes || [],
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByPrefix(keyPrefix) {
    return prisma.apiKey.findMany({
      where: { keyPrefix },
      include: {
        project: {
          include: {
            organization: true,
          },
        },
      },
    });
  }

  async findByProjectId(projectId) {
    return prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByIdAndProjectId(id, projectId) {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        projectId: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey || apiKey.projectId !== projectId) {
      return null;
    }

    return apiKey;
  }

  async revoke(id) {
    return prisma.apiKey.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateLastUsedAt(id) {
    return prisma.apiKey.update({
      where: { id },
      data: {
        lastUsedAt: new Date(),
      },
    });
  }
}

module.exports = new ApiKeyRepository();
