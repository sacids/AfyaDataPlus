function parseSchema(rawSchema) {
    if (!rawSchema.form_defn) {
        throw new Error('Invalid schema: Schema is missing form_defn');
    }

    const formDefn = JSON.parse(rawSchema.form_defn);
    if (!formDefn.pages || formDefn.pages.length === 0) {
        throw new Error('Invalid schema: Schema is missing pages');
    }


    return {
        formId: rawSchema.formId || 'default',
        title: rawSchema.title || 'Untitled Form',
        form: rawSchema.form_id,
        project: rawSchema.project,
        meta: formDefn.meta,
        pages: formDefn.pages,
        language: formDefn.languages,
    };
}

module.exports = { parseSchema };