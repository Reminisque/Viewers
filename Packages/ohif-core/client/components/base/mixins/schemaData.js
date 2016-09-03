import { OHIF } from 'meteor/ohif:core';
import { Blaze } from 'meteor/blaze';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { _ } from 'meteor/underscore';

// Helper function to get the component's current schema
const getCurrentSchema = (parentComponent, key) => {
    // Get the parent component schema
    let schema = parentComponent && parentComponent.schema;

    // Try to get the form schema if it was not found
    if (parentComponent && !schema) {
        const form = parentComponent.getForm();
        schema = form && form.schema;
    }

    // Stop here if there's no key or schema defined
    if (!key || !schema) {
        return;
    }

    // Get the current schema data using component's key
    const currentSchema = _.clone(schema._schema[key]);

    // Stop here if no schema was found for the given key
    if (!currentSchema) {
        return;
    }

    // Merge the sub-schema properties if it's an array
    if (Array.isArray(currentSchema.type())) {
        _.extend(currentSchema, schema._schema[key + '.$']);
    }

    // Return the component's schema definitions
    return currentSchema;
};

/*
 * schemaData: change the component data based on its form's schema data
 */
OHIF.mixins.schemaData = new OHIF.Mixin({
    dependencies: 'component',
    composition: {

        onData() {
            // Get the current template data
            const data = Template.currentData();

            // Get the parent component
            const parent = OHIF.blaze.getParentComponent(Blaze.currentView);

            // Get he parent component key
            const parentKey = parent && parent.templateInstance.data.pathKey;

            // Check if the parent is an array group
            const isParentArray = parent && parent.templateInstance.data.arrayValues;

            // Set the path key for this component
            data.pathKey = data.key || (isParentArray ? '$' : '');
            if (data.pathKey && typeof parentKey === 'string') {
                const prefix = parentKey ? `${parentKey}.` : '';
                data.pathKey = `${prefix}${data.pathKey}`;
            }

            // Get the current schema data using component's key
            const currentSchema = getCurrentSchema(parent, data.pathKey);

            // Stop here if there's no schema data for current key
            if (!currentSchema) {
                return;
            }

            // Use schema's label if it was not defined
            if (!data.label) {
                data.label = new ReactiveVar(currentSchema.label);
            }

            // Set the min value
            if (_.isUndefined(data.min) && currentSchema.min) {
                data.min = currentSchema.min;
            }

            // Set the max value
            if (_.isUndefined(data.max) && currentSchema.max) {
                data.max = currentSchema.max;
            }

            // Set the emptyOption data attribute if given on schema
            if (currentSchema.emptyOption) {
                data.emptyOption = currentSchema.emptyOption;
            }

            // Fill the items if it's an array schema
            if (!data.items && Array.isArray(currentSchema.allowedValues)) {
                // Initialize the items array
                const items = [];

                // Get the values and labels arrays from schema
                const values = currentSchema.allowedValues;
                const labels = currentSchema.valuesLabels || [];

                // Iterate the allowed values array
                for (let i = 0; i < values.length; i++) {
                    // Push the current item to the items array
                    items.push({
                        value: values[i],
                        label: labels[i] || values[i]
                    });
                }

                // Add the items to a reactive instance
                data.items = new ReactiveVar(items);
            }
        },

        onCreated() {
            const instance = Template.instance();
            const component = instance.component;

            // Create a data parser according to current schema key
            component.parseData = value => {
                // Get the current schema data using component's key
                const currentSchema = getCurrentSchema(component.parent, instance.data.pathKey);

                // Stop here if there's no schema data for current key
                if (!currentSchema) {
                    return;
                }

                // Check if the schema is a Number
                if (currentSchema.type === Number) {
                    return parseFloat(value);
                }

                // Check if the schema is a Boolean
                if (currentSchema.type === Boolean) {
                    return !!value;
                }

                // Return the original value if none of the checks matched
                return value;
            };
        },

        onMixins() {
            const instance = Template.instance();
            const component = instance.component;

            // Get the current schema data using component's key
            const currentSchema = getCurrentSchema(component.parent, instance.data.pathKey);

            // Stop here if there's no schema data for current key
            if (!currentSchema) {
                return;
            }

            // Fill the component with its default value after rendering
            if (currentSchema.defaultValue) {
                component.value(currentSchema.defaultValue);
            }
        }

    }
});
