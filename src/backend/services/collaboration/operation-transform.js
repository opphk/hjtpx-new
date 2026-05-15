const { logWarning, logError } = require('../../middleware/logger');

class OperationTransform {
  constructor() {
    this.config = {
      maxOperationLength: parseInt(process.env.OT_MAX_OPERATION_LENGTH) || 10000,
      maxOperationDepth: parseInt(process.env.OT_MAX_OPERATION_DEPTH) || 100,
      enableConflictDetection: process.env.OT_CONFLICT_DETECTION !== 'false',
      enableAutoRecovery: process.env.OT_AUTO_RECOVERY !== 'false'
    };
  }

  transform(op1, op2) {
    if (!this.validateOperation(op1) || !this.validateOperation(op2)) {
      throw new Error('Invalid operations');
    }

    let transformedOp1 = { ...op1 };
    let transformedOp2 = { ...op2 };

    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position <= op2.position) {
        transformedOp2.position += op1.text.length;
      } else {
        transformedOp1.position += op2.text.length;
      }
    } else if (op1.type === 'insert' && op2.type === 'delete') {
      if (op1.position <= op2.position) {
        transformedOp2.position += op1.text.length;
      } else if (op1.position >= op2.position + op2.length) {
        transformedOp1.position -= op2.length;
      } else {
        transformedOp1.position = op2.position;
      }
    } else if (op1.type === 'delete' && op2.type === 'insert') {
      if (op2.position <= op1.position) {
        transformedOp1.position += op2.text.length;
      } else if (op2.position >= op1.position + op1.length) {
        transformedOp2.position -= op1.length;
      } else {
        const beforeLength = op2.position - op1.position;
        const afterLength = op1.length - beforeLength;
        transformedOp2.position = op1.position + beforeLength;
        op1.length = beforeLength;
        transformedOp1 = { ...op1, length: beforeLength };
      }
    } else if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position >= op2.position + op2.length) {
        transformedOp1.position -= op2.length;
      } else if (op2.position >= op1.position + op1.length) {
        transformedOp2.position -= op1.length;
      } else if (op1.position === op2.position) {
        if (op1.length > op2.length) {
          transformedOp1.length -= op2.length;
          transformedOp2 = null;
        } else if (op1.length < op2.length) {
          transformedOp2.length -= op1.length;
          transformedOp1 = null;
        } else {
          transformedOp1 = null;
          transformedOp2 = null;
        }
      } else if (op1.position < op2.position) {
        const overlap = op1.position + op1.length - op2.position;
        if (op1.length > op2.length + overlap) {
          transformedOp1.length -= (op2.length + overlap);
        } else {
          transformedOp1.length = op1.position + op1.length - op2.position;
          transformedOp2.position = op1.position;
          transformedOp2.length -= overlap;
        }
      } else {
        const overlap = op2.position + op2.length - op1.position;
        if (op2.length > op1.length + overlap) {
          transformedOp2.length -= (op1.length + overlap);
        } else {
          transformedOp2.length = op2.position + op2.length - op1.position;
          transformedOp1.position = op2.position;
          transformedOp1.length -= overlap;
        }
      }
    } else if (op1.type === 'format' && op2.type === 'format') {
      transformedOp1 = this.transformFormatOp(op1, op2);
      transformedOp2 = this.transformFormatOp(op2, op1);
    }

    return {
      transformed: [transformedOp1, transformedOp2],
      conflict: this.detectConflict(op1, op2),
      resolution: this.resolveConflict(op1, op2, transformedOp1, transformedOp2)
    };
  }

  transformFormatOp(formatOp1, formatOp2) {
    const transformed = { ...formatOp1 };

    if (formatOp2.position <= formatOp1.position) {
      transformed.position += formatOp2.length || 0;
    } else if (formatOp2.position < formatOp1.position + (formatOp1.length || 0)) {
      const offset = formatOp2.position - formatOp1.position;
      transformed.position += offset;
      transformed.length = (transformed.length || 0) - offset;
    }

    return transformed;
  }

  detectConflict(op1, op2) {
    if (!this.config.enableConflictDetection) {
      return false;
    }

    if (op1.type === 'insert' && op2.type === 'insert') {
      return op1.position === op2.position && op1.text === op2.text;
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      return this.rangesOverlap(
        op1.position, op1.position + op1.length,
        op2.position, op2.position + op2.length
      );
    }

    if (op1.type === 'insert' && op2.type === 'delete') {
      return this.positionInRange(op1.position, op2.position, op2.length);
    }

    if (op1.type === 'delete' && op2.type === 'insert') {
      return this.positionInRange(op2.position, op1.position, op1.length);
    }

    return false;
  }

  rangesOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  }

  positionInRange(pos, start, length) {
    return pos >= start && pos < start + length;
  }

  resolveConflict(op1, op2, transformed1, transformed2) {
    if (!this.config.enableAutoRecovery) {
      return null;
    }

    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position === op2.position && op1.text === op2.text) {
        return {
          strategy: 'keep_first',
          winner: 'op1',
          reason: 'identical_inserts'
        };
      }
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (this.rangesOverlap(
        op1.position, op1.position + op1.length,
        op2.position, op2.position + op2.length
      )) {
        return {
          strategy: 'merge_deletes',
          merged: {
            position: Math.min(op1.position, op2.position),
            length: Math.max(op1.position + op1.length, op2.position + op2.length) - Math.min(op1.position, op2.position)
          }
        };
      }
    }

    return null;
  }

  compose(op1, op2) {
    if (!this.validateOperation(op1) || !this.validateOperation(op2)) {
      throw new Error('Invalid operations for composition');
    }

    if (op1.type !== op2.type) {
      throw new Error('Can only compose operations of the same type');
    }

    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position + op1.text.length === op2.position) {
        return {
          type: 'insert',
          position: op1.position,
          text: op1.text + op2.text,
          metadata: this.mergeMetadata(op1.metadata, op2.metadata)
        };
      }
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      if (op1.position === op2.position) {
        return {
          type: 'delete',
          position: op1.position,
          length: op1.length + op2.length,
          metadata: this.mergeMetadata(op1.metadata, op2.metadata)
        };
      }
      if (op1.position + op1.length === op2.position) {
        return {
          type: 'delete',
          position: op1.position,
          length: op1.length + op2.length,
          metadata: this.mergeMetadata(op1.metadata, op2.metadata)
        };
      }
    }

    return null;
  }

  mergeMetadata(meta1, meta2) {
    return {
      ...meta1,
      ...meta2,
      composedAt: Date.now()
    };
  }

  invert(op, document) {
    if (!this.validateOperation(op)) {
      throw new Error('Invalid operation for inversion');
    }

    switch (op.type) {
      case 'insert':
        return {
          type: 'delete',
          position: op.position,
          length: op.text.length,
          metadata: { inverted: true, originalOp: op }
        };

      case 'delete':
        return {
          type: 'insert',
          position: op.position,
          text: document.slice(op.position, op.position + op.length),
          metadata: { inverted: true, originalOp: op }
        };

      case 'format':
        return {
          type: 'format',
          position: op.position,
          length: op.length,
          properties: op.properties,
          revertProperties: op.revertProperties,
          metadata: { inverted: true, originalOp: op }
        };

      default:
        throw new Error('Unknown operation type');
    }
  }

  validateOperation(op) {
    if (!op || typeof op !== 'object') {
      logWarning('Invalid operation: not an object');
      return false;
    }

    if (!op.type || !['insert', 'delete', 'retain', 'format', 'replace'].includes(op.type)) {
      logWarning('Invalid operation: unknown type', { type: op.type });
      return false;
    }

    if (typeof op.position !== 'number' || op.position < 0) {
      logWarning('Invalid operation: invalid position', { position: op.position });
      return false;
    }

    if (op.type === 'insert' && typeof op.text !== 'string') {
      logWarning('Invalid operation: insert requires text');
      return false;
    }

    if (op.type === 'delete' && typeof op.length !== 'number') {
      logWarning('Invalid operation: delete requires length');
      return false;
    }

    if (op.text && op.text.length > this.config.maxOperationLength) {
      logWarning('Invalid operation: text too long', { length: op.text.length });
      return false;
    }

    return true;
  }

  apply(document, operation) {
    if (!this.validateOperation(operation)) {
      throw new Error('Invalid operation');
    }

    const { type, position, text, length } = operation;

    switch (type) {
      case 'insert':
        if (position > document.length) {
          throw new Error('Insert position out of bounds');
        }
        return document.slice(0, position) + text + document.slice(position);

      case 'delete':
        if (position + length > document.length) {
          throw new Error('Delete range out of bounds');
        }
        return document.slice(0, position) + document.slice(position + length);

      case 'retain':
        return document;

      case 'format':
        return document;

      case 'replace':
        if (position + length > document.length) {
          throw new Error('Replace range out of bounds');
        }
        return document.slice(0, position) + text + document.slice(position + length);

      default:
        throw new Error('Unknown operation type');
    }
  }

  createInsertOp(position, text, metadata = {}) {
    return {
      type: 'insert',
      position,
      text,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    };
  }

  createDeleteOp(position, length, metadata = {}) {
    return {
      type: 'delete',
      position,
      length,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    };
  }

  createFormatOp(position, length, properties, metadata = {}) {
    return {
      type: 'format',
      position,
      length,
      properties,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    };
  }

  createReplaceOp(position, length, text, metadata = {}) {
    return {
      type: 'replace',
      position,
      length,
      text,
      metadata: {
        timestamp: Date.now(),
        ...metadata
      }
    };
  }

  getOperationDescription(op) {
    switch (op.type) {
      case 'insert':
        return `Insert "${op.text}" at position ${op.position}`;
      case 'delete':
        return `Delete ${op.length} characters at position ${op.position}`;
      case 'format':
        return `Format ${op.length} characters at position ${op.position}`;
      case 'replace':
        return `Replace ${op.length} characters at position ${op.position} with "${op.text}"`;
      default:
        return `Unknown operation`;
    }
  }

  serializeOperation(op) {
    return JSON.stringify(op);
  }

  deserializeOperation(data) {
    try {
      return JSON.parse(data);
    } catch (error) {
      logError('Error deserializing operation', { error: error.message });
      return null;
    }
  }
}

module.exports = OperationTransform;
