const workflowRepository = require('./workflow.repository');
const NotFoundError = require('../../shared/errors/not-found-error');
const ConflictError = require('../../shared/errors/conflict-error');

class WorkflowService {
  async createWorkflow({ projectId, name, description, eventName, status = 'ACTIVE', actions = [] }) {
    const existing = await workflowRepository.findByNameAndProjectId(projectId, name);
    if (existing) {
      throw new ConflictError(`Workflow with name "${name}" already exists in project`);
    }

    return workflowRepository.create({
      projectId,
      name,
      description,
      eventName,
      status,
      actions,
    });
  }

  async getWorkflow(projectId, id) {
    const workflow = await workflowRepository.findByIdAndProjectId(id, projectId);
    if (!workflow) {
      throw new NotFoundError(`Workflow "${id}" not found in project`);
    }
    return workflow;
  }

  async listWorkflows(projectId, pagination) {
    return workflowRepository.findByProjectId(projectId, pagination);
  }

  async updateWorkflow(projectId, id, updateData) {
    const workflow = await this.getWorkflow(projectId, id);

    if (updateData.name && updateData.name !== workflow.name) {
      const existing = await workflowRepository.findByNameAndProjectId(projectId, updateData.name);
      if (existing) {
        throw new ConflictError(`Workflow with name "${updateData.name}" already exists in project`);
      }
    }

    return workflowRepository.update(id, updateData);
  }

  async deleteWorkflow(projectId, id) {
    await this.getWorkflow(projectId, id);
    return workflowRepository.delete(id);
  }
}

module.exports = new WorkflowService();
