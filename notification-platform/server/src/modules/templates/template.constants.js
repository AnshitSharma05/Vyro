const TEMPLATE_MESSAGES = {
  CREATED: 'Template created successfully',
  UPDATED: 'Template updated successfully',
  DELETED: 'Template deleted successfully',
  RETRIEVED: 'Template retrieved successfully',
  LIST_RETRIEVED: 'Templates retrieved successfully',
  PREVIEW_SUCCESS: 'Template rendered successfully',
  NOT_FOUND: 'Template not found',
  DUPLICATE_NAME: 'A template with this name already exists in this project',
  INVALID_CHANNEL: 'Invalid template channel',
  SUBJECT_REQUIRED_FOR_EMAIL: 'Subject is required for EMAIL channel',
  SUBJECT_NOT_ALLOWED: 'Subject is only supported for EMAIL channel',
  MISSING_VARIABLES: 'Missing required template variables',
  PROJECT_NOT_FOUND: 'Project not found',
  ORGANIZATION_FORBIDDEN: 'You are not a member of the organization that owns this project',
  INSUFFICIENT_PERMISSIONS: 'Only organization OWNER or ADMIN can perform this action',
};

module.exports = {
  TEMPLATE_MESSAGES,
};
