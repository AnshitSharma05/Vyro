const templateRenderer = require('../../src/modules/templates/template.renderer');
const ValidationError = require('../../src/shared/errors/validation-error');

describe('Template Renderer Unit Tests', () => {
  describe('extractVariables', () => {
    it('should extract unique variable names from text string', () => {
      const text = 'Hello {{name}}, your order {{orderId}} for {{amount}} is confirmed. Thanks {{name}}!';
      const variables = templateRenderer.extractVariables(text);

      expect(variables).toEqual(['name', 'orderId', 'amount']);
    });

    it('should handle whitespace inside double braces', () => {
      const text = 'Hello {{ name }}, welcome to {{ app_name }}!';
      const variables = templateRenderer.extractVariables(text);

      expect(variables).toEqual(['name', 'app_name']);
    });

    it('should return empty array for text without variables or empty input', () => {
      expect(templateRenderer.extractVariables('Static text without variables')).toEqual([]);
      expect(templateRenderer.extractVariables('')).toEqual([]);
      expect(templateRenderer.extractVariables(null)).toEqual([]);
    });
  });

  describe('validateVariables', () => {
    it('should return valid true when all required variables are supplied', () => {
      const text = 'Hello {{name}}, order {{orderId}}';
      const result = templateRenderer.validateVariables(text, { name: 'Anshit', orderId: 'ORD-1' });

      expect(result.valid).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it('should return missing variables when data payload is missing keys', () => {
      const text = 'Hello {{name}}, order {{orderId}}, amount {{amount}}';
      const result = templateRenderer.validateVariables(text, { name: 'Anshit' });

      expect(result.valid).toBe(false);
      expect(result.missingVariables).toEqual(['orderId', 'amount']);
    });
  });

  describe('renderString', () => {
    it('should substitute single and repeated variables correctly', () => {
      const text = 'Hello {{name}}! Welcome {{name}}. Your code is {{code}}.';
      const data = { name: 'Anshit', code: '123456' };

      const rendered = templateRenderer.renderString(text, data);
      expect(rendered).toBe('Hello Anshit! Welcome Anshit. Your code is 123456.');
    });

    it('should ignore extra variables in data payload', () => {
      const text = 'Hello {{name}}';
      const data = { name: 'Anshit', extra1: 'val1', extra2: 99 };

      const rendered = templateRenderer.renderString(text, data);
      expect(rendered).toBe('Hello Anshit');
    });

    it('should throw ValidationError when missing required variables', () => {
      const text = 'Hello {{name}}, order {{orderId}}';
      const data = { name: 'Anshit' };

      expect(() => templateRenderer.renderString(text, data)).toThrow(ValidationError);
    });

    it('should treat malicious input strictly as text data and never execute code', () => {
      const text = 'User input: {{maliciousInput}}';
      const data = { maliciousInput: '<script>alert("xss")</script>; process.exit(1);' };

      const rendered = templateRenderer.renderString(text, data);
      expect(rendered).toBe('User input: <script>alert("xss")</script>; process.exit(1);');
    });
  });

  describe('renderTemplate', () => {
    it('should render both subject and body with combined variable validation', () => {
      const template = {
        subject: 'Order {{orderId}} confirmed',
        body: 'Hello {{name}}, your order {{orderId}} costs {{amount}}.',
      };
      const data = { name: 'Anshit', orderId: 'ORD-999', amount: '₹1499' };

      const result = templateRenderer.renderTemplate(template, data);

      expect(result.subject).toBe('Order ORD-999 confirmed');
      expect(result.body).toBe('Hello Anshit, your order ORD-999 costs ₹1499.');
      expect(result.variables).toEqual(['orderId', 'name', 'amount']);
    });

    it('should throw ValidationError if missing a variable present only in subject or body', () => {
      const template = {
        subject: 'Order {{orderId}} confirmed',
        body: 'Hello {{name}}',
      };
      const data = { name: 'Anshit' }; // missing orderId

      expect(() => templateRenderer.renderTemplate(template, data)).toThrow(ValidationError);
    });
  });
});
