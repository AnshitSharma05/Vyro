const ValidationError = require('../../shared/errors/validation-error');
const { TEMPLATE_MESSAGES } = require('./template.constants');

/**
 * Regex matching double-curly variable placeholders: {{variableName}}
 * Supports spaces around variable name, e.g., {{ variableName }}
 */
const VARIABLE_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;

class TemplateRenderer {
  /**
   * Extracts a deduplicated array of variable names present in text content.
   *
   * @param {string|null} text
   * @returns {string[]}
   */
  extractVariables(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const variables = new Set();
    let match;

    // Reset regex index state
    const regex = new RegExp(VARIABLE_REGEX);
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        variables.add(match[1].trim());
      }
    }

    return Array.from(variables);
  }

  /**
   * Validates that all variables required by a template string are supplied in the data object.
   *
   * @param {string|null} text
   * @param {Object} data
   * @returns {{ valid: boolean, missingVariables: string[] }}
   */
  validateVariables(text, data = {}) {
    const requiredVars = this.extractVariables(text);
    const missingVariables = requiredVars.filter(
      (varName) => data[varName] === undefined || data[varName] === null
    );

    return {
      valid: missingVariables.length === 0,
      missingVariables,
    };
  }

  /**
   * Renders a single string by substituting {{variable}} placeholders with data values.
   *
   * @param {string|null} text
   * @param {Object} data
   * @returns {string|null}
   */
  renderString(text, data = {}) {
    if (text === null || text === undefined) {
      return null;
    }

    if (typeof text !== 'string') {
      return '';
    }

    const { valid, missingVariables } = this.validateVariables(text, data);
    if (!valid) {
      throw new ValidationError(
        `${TEMPLATE_MESSAGES.MISSING_VARIABLES}: ${missingVariables.join(', ')}`,
        { missingVariables }
      );
    }

    return text.replace(VARIABLE_REGEX, (_, varName) => {
      const trimmedKey = varName.trim();
      const val = data[trimmedKey];
      return val !== undefined && val !== null ? String(val) : '';
    });
  }

  /**
   * Renders both template subject (if applicable) and body against a data object.
   *
   * @param {{ subject?: string|null, body: string }} templateContent
   * @param {Object} data
   * @returns {{ subject: string|null, body: string, variables: string[] }}
   */
  renderTemplate({ subject, body }, data = {}) {
    const subjectVars = this.extractVariables(subject);
    const bodyVars = this.extractVariables(body);
    const allRequiredVars = Array.from(new Set([...subjectVars, ...bodyVars]));

    const missingVariables = allRequiredVars.filter(
      (varName) => data[varName] === undefined || data[varName] === null
    );

    if (missingVariables.length > 0) {
      throw new ValidationError(
        `${TEMPLATE_MESSAGES.MISSING_VARIABLES}: ${missingVariables.join(', ')}`,
        { missingVariables }
      );
    }

    const renderedSubject = subject ? this.renderString(subject, data) : null;
    const renderedBody = this.renderString(body, data);

    return {
      subject: renderedSubject,
      body: renderedBody,
      variables: allRequiredVars,
    };
  }
}

module.exports = new TemplateRenderer();
