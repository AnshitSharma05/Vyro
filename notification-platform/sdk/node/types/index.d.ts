declare module 'notification-platform-node' {
  export interface ClientOptions {
    apiKey: string;
    baseURL?: string;
    timeout?: number;
    maxRetries?: number;
    debug?: boolean;
  }

  export interface RequestOptions {
    idempotencyKey?: string;
    timeout?: number;
    headers?: Record<string, string>;
  }

  export type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  export type Category = 'TRANSACTIONAL' | 'SECURITY' | 'MARKETING' | 'SYSTEM';
  export type DevicePlatform = 'IOS' | 'ANDROID' | 'WEB';
  export type WorkflowStatus = 'ACTIVE' | 'INACTIVE';

  export interface RecipientObject {
    externalUserId: string;
    email?: string;
    phone?: string;
  }

  export type Recipient = string | RecipientObject;

  export interface EventInput {
    event: string;
    externalEventId: string;
    recipient: Recipient;
    data?: Record<string, any>;
  }

  export interface NotificationInput {
    channel?: Channel;
    template: string;
    category?: Category;
    recipient: Recipient;
    data?: Record<string, any>;
    scheduledAt?: string | null;
  }

  export interface RecipientInput {
    externalUserId: string;
    email?: string;
    phone?: string;
  }

  export interface PreferenceInput {
    [category: string]: {
      [channel: string]: boolean;
    };
  }

  export interface DeviceInput {
    token: string;
    platform?: DevicePlatform;
  }

  export interface WorkflowActionInput {
    order?: number;
    channel: Channel;
    category?: Category;
    template: string;
    delaySeconds?: number;
  }

  export interface WorkflowInput {
    name: string;
    description?: string;
    eventName: string;
    status?: WorkflowStatus;
    actions: WorkflowActionInput[];
  }

  export class EventsResource {
    track(input: EventInput, options?: RequestOptions): Promise<any>;
    get(eventId: string, options?: RequestOptions): Promise<any>;
    list(params?: { page?: number; limit?: number }, options?: RequestOptions): Promise<any>;
  }

  export class NotificationsResource {
    send(input: NotificationInput, options?: RequestOptions): Promise<any>;
    get(notificationId: string, options?: RequestOptions): Promise<any>;
    list(params?: { page?: number; limit?: number; status?: string; channel?: Channel; recipient?: string }, options?: RequestOptions): Promise<any>;
    cancel(notificationId: string, options?: RequestOptions): Promise<any>;
  }

  export class RecipientsResource {
    create(input: RecipientInput, options?: RequestOptions): Promise<any>;
    get(externalUserId: string, options?: RequestOptions): Promise<any>;
    update(externalUserId: string, input: { email?: string; phone?: string }, options?: RequestOptions): Promise<any>;
    list(params?: { page?: number; limit?: number }, options?: RequestOptions): Promise<any>;
  }

  export class PreferencesResource {
    get(externalUserId: string, options?: RequestOptions): Promise<any>;
    update(externalUserId: string, preferences: PreferenceInput, options?: RequestOptions): Promise<any>;
  }

  export class DevicesResource {
    register(externalUserId: string, input: DeviceInput, options?: RequestOptions): Promise<any>;
    list(externalUserId: string, options?: RequestOptions): Promise<any>;
    remove(externalUserId: string, deviceId: string, options?: RequestOptions): Promise<any>;
  }

  export class TemplatesResource {
    list(projectId: string, params?: { page?: number; limit?: number }, options?: RequestOptions): Promise<any>;
    get(projectId: string, templateId: string, options?: RequestOptions): Promise<any>;
    create(projectId: string, input: { name: string; channel: Channel; subject: string; body: string }, options?: RequestOptions): Promise<any>;
    update(projectId: string, templateId: string, input: { subject?: string; body?: string }, options?: RequestOptions): Promise<any>;
    delete(projectId: string, templateId: string, options?: RequestOptions): Promise<any>;
  }

  export class WorkflowsResource {
    create(input: WorkflowInput, options?: RequestOptions): Promise<any>;
    get(workflowId: string, options?: RequestOptions): Promise<any>;
    update(workflowId: string, input: Partial<WorkflowInput>, options?: RequestOptions): Promise<any>;
    deactivate(workflowId: string, options?: RequestOptions): Promise<any>;
    list(params?: { page?: number; limit?: number }, options?: RequestOptions): Promise<any>;
  }

  export class WebhooksResource {
    verifySignature(
      rawPayload: string | Buffer,
      signatureHeader: string,
      secret: string,
      options?: { toleranceSeconds?: number }
    ): boolean;
  }

  export class NotificationPlatformError extends Error {
    statusCode: number | null;
    code: string;
    requestId: string | null;
    details: any;
  }

  export class ValidationError extends NotificationPlatformError {}
  export class AuthenticationError extends NotificationPlatformError {}
  export class AuthorizationError extends NotificationPlatformError {}
  export class NotFoundError extends NotificationPlatformError {}
  export class ConflictError extends NotificationPlatformError {}
  export class RateLimitError extends NotificationPlatformError {
    retryAfter: string | null;
  }
  export class ServerError extends NotificationPlatformError {}
  export class TimeoutError extends NotificationPlatformError {}
  export class NetworkError extends NotificationPlatformError {}

  export default class NotificationClient {
    constructor(options: ClientOptions);
    events: EventsResource;
    notifications: NotificationsResource;
    recipients: RecipientsResource;
    preferences: PreferencesResource;
    devices: DevicesResource;
    templates: TemplatesResource;
    workflows: WorkflowsResource;
    webhooks: WebhooksResource;
  }

  export const CHANNELS: Record<Channel, Channel>;
  export const CATEGORIES: Record<Category, Category>;
  export const DEVICE_PLATFORMS: Record<DevicePlatform, DevicePlatform>;
  export const WORKFLOW_STATUSES: Record<WorkflowStatus, WorkflowStatus>;
}
