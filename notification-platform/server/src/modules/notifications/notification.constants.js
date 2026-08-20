const NOTIFICATION_MESSAGES = {
  SENT_SUCCESS: 'Notification sent successfully',
  RETRIEVED: 'Notification retrieved successfully',
  LIST_RETRIEVED: 'Notifications retrieved successfully',
  NOT_FOUND: 'Notification not found',
  TEMPLATE_NOT_FOUND: 'Template not found in project',
  INVALID_RECIPIENT_EMAIL: 'Recipient must be a valid email address for EMAIL channel',
  INVALID_RECIPIENT_PHONE: 'Recipient must be a valid phone number',
  PROJECT_NOT_FOUND: 'Project not found',
  ORGANIZATION_FORBIDDEN: 'You are not a member of the organization that owns this project',
  UNSUPPORTED_CHANNEL: 'Delivery provider for this channel is not supported or configured',
};

module.exports = {
  NOTIFICATION_MESSAGES,
};
