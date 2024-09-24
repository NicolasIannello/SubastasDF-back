const { Schema, model } = require('mongoose');

const WebSchema = Schema({
    texto: { type: String, required: true },
    id: { type: Number, required: true },
});

WebSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('Web',WebSchema);