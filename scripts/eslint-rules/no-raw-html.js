/**
 * ESLint Rule: No Raw HTML Elements
 *
 * DS Standards: Use design system components instead of raw HTML elements.
 *   <p>        → <Paragraph>
 *   <h1>–<h6>  → <Heading level={n}>
 *   <label>    → <Label>
 *   <span>     → <Paragraph data-size="sm"> or remove
 *   <strong>   → <Paragraph> with data-weight="bold"
 *   <em>       → <Paragraph> with data-weight or CSS
 *   <b>, <i>   → same as strong/em
 *   <button>   → <Button>
 *   <input>    → <Textfield> / <Checkbox> / <Radio>
 *   <select>   → <Select> / <NativeSelect>
 *   <textarea> → <Textarea>
 *   <table>    → <DataTable> or DS Table
 *   <fieldset> → <Fieldset>
 *
 * Exceptions:
 * - <label> is NOT flagged (used for custom label associations)
 * - <a> is NOT flagged (used for router links, etc.)
 * - Inside @digilist-saas/ds package itself (DS components legitimately use raw HTML)
 *
 * Scope: apps/ and packages/digilist/ only.
 * packages/ds/ is excluded (it IS the design system).
 */

const FORBIDDEN_ELEMENTS = {
    p: 'Use <Paragraph> from @digilist-saas/ds instead of <p>.',
    h1: 'Use <Heading level={1}> from @digilist-saas/ds instead of <h1>.',
    h2: 'Use <Heading level={2}> from @digilist-saas/ds instead of <h2>.',
    h3: 'Use <Heading level={3}> from @digilist-saas/ds instead of <h3>.',
    h4: 'Use <Heading level={4}> from @digilist-saas/ds instead of <h4>.',
    h5: 'Use <Heading level={5}> from @digilist-saas/ds instead of <h5>.',
    h6: 'Use <Heading level={6}> from @digilist-saas/ds instead of <h6>.',
    strong: 'Use <Paragraph> with data-weight="bold" instead of <strong>.',
    em: 'Use <Paragraph> with data-weight or CSS instead of <em>.',
    b: 'Use <Paragraph> with data-weight="bold" instead of <b>.',
    i: 'Use <Paragraph> with data-weight or CSS instead of <i>.',
    button: 'Use <Button> from @digilist-saas/ds instead of <button>.',
    input: 'Use <Textfield>, <Checkbox>, or <Radio> from @digilist-saas/ds instead of <input>.',
    select: 'Use <Select> or <NativeSelect> from @digilist-saas/ds instead of <select>.',
    textarea: 'Use <Textarea> from @digilist-saas/ds instead of <textarea>.',
    table: 'Use <DataTable> or DS Table from @digilist-saas/ds instead of <table>.',
    fieldset: 'Use <Fieldset> from @digilist-saas/ds instead of <fieldset>.',
};

export default {
    meta: {
        type: 'problem',
        docs: {
            description:
                'Prevent raw HTML elements that have DS equivalents. Use Paragraph, Heading, Label, etc.',
            category: 'DS Standards',
        },
        messages: {
            noRawHtml: '{{suggestion}}',
        },
        schema: [],
    },

    create(context) {
        const filename = context.getFilename();

        // Only enforce in apps/ and packages/digilist/
        const inScope =
            filename.includes('/apps/') ||
            filename.includes('/packages/digilist/');

        if (!inScope) {
            return {};
        }

        // Skip the DS package itself
        if (filename.includes('/packages/ds/')) {
            return {};
        }

        // Skip story files
        if (filename.includes('.stories.')) {
            return {};
        }

        return {
            JSXOpeningElement(node) {
                const name = node.name?.name;
                if (!name || typeof name !== 'string') return;

                const suggestion = FORBIDDEN_ELEMENTS[name];
                if (suggestion) {
                    context.report({
                        node,
                        messageId: 'noRawHtml',
                        data: { suggestion },
                    });
                }
            },
        };
    },
};
