const { Schema, model } = require('mongoose');

const PDFSchema = Schema({
    name: { type: String, require:true },
    pdf: { type: String, require:true }
});

PDFSchema.method('toJSON', function() {
    const { __v, ...object } = this.toObject();
    return object;
});

module.exports= model('PDF',PDFSchema);