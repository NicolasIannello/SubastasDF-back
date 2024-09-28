const { response }=require('express');
const Lote = require('../models/lote');
const PDF = require('../models/pdf');
const fs=require('fs');
const { v4: uuidv4 }=require('uuid');
const { isAdmin } = require('./admin');
const Imagen = require('../models/imagen');

const crearLote= async(req,res = response) =>{
    const {titulo}=req.body;

    try {
        if(await isAdmin(res,req.uid)){
            const existeLote= await Lote.findOne({titulo});
            if(existeLote){
                return res.status(400).json({
                    ok:false,
                    msg:'Ya existe un lote con ese titulo'
                });
            }

            const pdf=req.files['pdf']
            const nombreCortado=pdf.name.split('.');
            const extensionArchivo=nombreCortado[nombreCortado.length-1];
            const nombreArchivo= uuidv4()+'.'+extensionArchivo;
            const path= './files/pdfs/'+nombreArchivo;
            const datos={ pdf: nombreArchivo };

            pdf.mv(path, async (err)=>{
                if(err){
                    console.log(err);
                    return res.status(500).json({
                        ok:false,
                        msg:'error en carga de archivo: '+nombreCortado[0],
                    })
                }
                const pdfFile = new PDF(datos)
                await pdfFile.save();
                const lote= new Lote(req.body);
                lote.disponible=true;
                lote.terminos_condiciones=pdfFile._id;
                await lote.save();  

                for (let i = 0; i < req.files['img'].length; i++) {
                    const img=req.files['img'][i]
                    const nombreCortado=img.name.split('.');
                    const extensionArchivo=nombreCortado[nombreCortado.length-1];
                    const nombreArchivo= uuidv4()+'.'+extensionArchivo;
                    const path= './files/lotes/'+nombreArchivo;
                    const datos={ lote: lote._id, img: nombreArchivo };
        
                    img.mv(path, async (err)=>{
                        if(err){
                            console.log(err);
                            return res.status(500).json({
                                ok:false,
                                msg:'error en carga de imagen '+nombreCortado[0],
                            })
                        }
                        const imagen = new Imagen(datos);
                        await imagen.save();
                    })
                };
            })            

            res.json({
                ok:true,
            });
            
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error'
        });
    }
};

const getLotes= async(req,res = response) =>{
    if(await isAdmin(res,req.uid)){
        const desde= parseInt(req.query.desde) || 0;
        const limit= parseInt(req.query.limit) || 20;
        const orden= parseInt(req.query.orden) || 1;
        const order= req.query.order || '_id';
        var sortOperator = { "$sort": { } };
        sortOperator["$sort"][order] = orden;

        const [ lotes, total ]= await Promise.all([
            Lote.aggregate([
                { $project: {
                    __v: 0,
                    "descripcion": 0,
                    "aclaracion": 0,
                    "terminos_condiciones": 0,
                } },
                sortOperator,
                { $skip: desde },
                { $limit: limit },
            ]).collation({locale: 'en'}),
            Lote.countDocuments()
        ]); 
        
        res.json({
            ok:true,
            lotes,
            total
        });
    }
};

module.exports={ crearLote, getLotes }