const BaseJoi = require('joi');
const sanitizeHtml = require('sanitize-html');

const extension = (joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.escapeHTML': '{{#label}} must not include HTML!'
    },
    rules: {
        escapeHTML: {
            validate(value, helpers) {
                const clean = sanitizeHtml(value,
                    {
                        allowedTags: [],
                        allowedAttributes: {},
                    });
                if (clean !== value) return helpers.error('string.escapeHTML', { value });
                return clean;
            }
        }
    }
});

const Joi = BaseJoi.extend(extension);

module.exports.photoboothSchema = Joi.object({
    photo: Joi.object({
        memberName: Joi.string().required().escapeHTML(),
        image: Joi.string().required().escapeHTML(),
        sessionDate: Joi.date().required()
    }).required(),
    deleteImages: Joi.array()
});