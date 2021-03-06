/**
 * Handles soaked array or string slicing, e.g. `names?[i..]`.
 */
import { REMOVE_GUARD } from '../../../suggestions';
import findSoakContainer from '../../../utils/findSoakContainer';
import SlicePatcher from './SlicePatcher';

const GUARD_HELPER = `function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}`;

export default class SoakedSlicePatcher extends SlicePatcher {
  patchAsExpression(): void {
    if (this.shouldPatchAsOptionalChaining()) {
      super.patchAsExpression();
      return;
    }

    this.registerHelper('__guard__', GUARD_HELPER);
    this.addSuggestion(REMOVE_GUARD);

    const soakContainer = findSoakContainer(this);
    const varName = soakContainer.claimFreeBinding('x');
    const prefix = this.slice(soakContainer.contentStart, this.contentStart);

    if (prefix.length > 0) {
      this.remove(soakContainer.contentStart, this.contentStart);
    }

    this.insert(this.expression.outerEnd, `, ${varName} => ${prefix}${varName}`);

    soakContainer.insert(soakContainer.contentStart, '__guard__(');

    super.patchAsExpression();
    soakContainer.appendDeferredSuffix(')');
  }

  /**
   * For a soaked splice operation, we are the soak container.
   */
  getSpliceCode(expressionCode: string): string {
    if (this.shouldPatchAsOptionalChaining()) {
      return super.getSpliceCode(expressionCode);
    }
    const spliceStart = this.captureCodeForPatchOperation(() => {
      this.registerHelper('__guard__', GUARD_HELPER);
      this.addSuggestion(REMOVE_GUARD);
      const varName = this.claimFreeBinding('x');
      this.insert(this.expression.outerEnd, `, ${varName} => ${varName}`);
      this.patchAsSpliceExpressionStart();
    });
    return `__guard__(${spliceStart}, ...[].concat(${expressionCode})))`;
  }

  shouldPatchAsOptionalChaining(): boolean {
    return this.options.useOptionalChaining || false;
  }
}
