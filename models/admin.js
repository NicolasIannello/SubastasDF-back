const { Schema, model } = require('mongoose');

const AdminSchema = Schema({
    usuario: { type: String, required: true },
    pass: { type: String },
});

AdminSchema.method('toJSON', function() {
    const { __v, _id,pass, ...object } = this.toObject();
    object.vid= _id;
    return object;
});

module.exports= model('Admin',AdminSchema);