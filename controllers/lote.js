const { response }=require('express');
const Lote = require('../models/lote');
const PDF = require('../models/pdf');
const fs=require('fs');
const { v4: uuidv4 }=require('uuid');
const { isAdmin } = require('./admin');
const Imagen = require('../models/imagen');
const path=require('path');
const { subirImagen, borrarImagen, subirPDF } = require('../helpers/imagenes');

const crearLote= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
            const pdf=req.files['pdf']
            const nombreCortado=pdf.name.split('.');
            const extensionArchivo=nombreCortado[nombreCortado.length-1];
            const nombreArchivo= uuidv4()+'.'+extensionArchivo;
            const path= './files/pdfs/'+nombreArchivo;
            const datos={ name: nombreCortado[0], pdf: nombreArchivo };

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
                lote.terminos_condiciones=pdfFile.pdf;
                lote.uuid=uuidv4();
                await lote.save();  
                
                if(req.files['img'].length==undefined){
                    subirImagen(req.files['img'],lote.uuid,res)
                }else{
                    for (let i = 0; i < req.files['img'].length; i++) {
                        subirImagen(req.files['img'][i],lote.uuid,res)
                    };
                }
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

const lote= async(req,res = response) =>{    
    if(await isAdmin(res,req.uid)){
        const lote = await Lote.aggregate([
            { "$match": { uuid:req.body.uuid } },
            { $project: { __v: 0, '_id':0 } },
            { $lookup: {
                from: "pdfs",
                localField: "terminos_condiciones",
                foreignField: "pdf",
                as: "pdf"
            } },
            {$unwind: { path: "$pdf", preserveNullAndEmptyArrays: true }},
            { $project: { __v: 0, "pdf.__v": 0, "pdf._id": 0, } },
            { $lookup: {
                from: "imagens",
                localField: "uuid",
                foreignField: "lote",
                as: "img"
            } },
            { $project: { __v: 0, "img.__v": 0, "img._id": 0, "img.lote": 0, } },
        ]).collation({locale: 'en'})

        res.json({
            ok:true,
            lote
        });
    }
};

const getArchivo= async(req,res = response) =>{
    const img=req.query.img;
    const tipo=req.query.tipo;
    let pathImg;
    if(tipo=='lotes') {
        const imagenesDB= await Imagen.find({img});
        if(imagenesDB.length>0){
            pathImg=pathImg= path.join( __dirname, '../files/lotes/'+imagenesDB[0].img);
        }else{
            pathImg=pathImg= path.join( __dirname, '../files/lotes/'+imagenesDB.img);
        }
    }
    if(tipo=='pdfs') {
        const PDFDB= await PDF.find({ 'pdf': { $eq: img } });
        if(PDFDB.length>0){
            pathImg=pathImg= path.join( __dirname, '../files/pdfs/'+PDFDB[0].pdf);
        }else{
            pathImg=pathImg= path.join( __dirname, '../files/pdfs/'+PDFDB.pdf);
        }
    }

    if(fs.existsSync(pathImg)){
        res.sendFile(pathImg);
    }else{
        const pathImg= path.join( __dirname, '../files/no-img.jpg');
        res.sendFile(pathImg);
    }
};

const deleteLote=async(req,res=response) =>{
    const uuid=req.body.uuid;
    try {        
        if(await isAdmin(res,req.uid)){
            const loteDB = await Lote.find({uuid})
            const imgDB = await Imagen.find({lote:uuid})
            const pdfDB = await PDF.find({pdf:loteDB[0].terminos_condiciones})
            
            if(pdfDB.length!=0){
                let pathPDF='./files/pdfs/'+pdfDB[0].pdf;
                if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                await PDF.findByIdAndDelete(pdfDB[0]._id);    
            }
            if(imgDB.length!=0){
                for (let i = 0; i < imgDB.length; i++) {
                    let pathImg='./files/lotes/'+imgDB[i].img
                    if(fs.existsSync(pathImg)) fs.unlinkSync(pathImg);
                    await Imagen.findByIdAndDelete(imgDB[i]._id);
                }
            }
            await Lote.findByIdAndDelete(loteDB[0]._id);

            res.json({
                ok:true,
            })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok:false,
            msg:'error borrar'
        });
    }
};

const actualizarLote= async(req,res=response)=>{    
    if(await isAdmin(res,req.uid)){        
        let flag=false;
        const loteDB= await Lote.find({uuid:req.body.lote});
        if(!loteDB){
            res.json({
                ok:false
            })
        }

        let {...camposL}=loteDB;        
        camposL=req.body;

        if(req.files && req.files['pdf']){
            let pathPDF='./files/pdfs/'+loteDB[0].terminos_condiciones;
            const pdfDB= await PDF.find({pdf:loteDB[0].terminos_condiciones});        
            
            const pdf=req.files['pdf']
            const nombreCortado=pdf.name.split('.');
            const extensionArchivo=nombreCortado[nombreCortado.length-1];
            const nombreArchivo= uuidv4()+'.'+extensionArchivo;
            const path= './files/pdfs/'+nombreArchivo;
            const datos={ name: nombreCortado[0], pdf: nombreArchivo };

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
                camposL.terminos_condiciones= pdfFile.pdf;
                if(fs.existsSync(pathPDF)) fs.unlinkSync(pathPDF);
                await PDF.findByIdAndDelete(pdfDB[0]._id);
                await Lote.findByIdAndUpdate(loteDB[0]._id, camposL,{new:true}); 
            })    
        }else{
            flag=true;
        }
        if(req.files && req.files['img']) {
            borrarImagen(req.body.lote);
            if(req.files['img'].length==undefined){
                subirImagen(req.files['img'],req.body.lote,res)
            }else{
                for (let i = 0; i < req.files['img'].length; i++) {
                    subirImagen(req.files['img'][i],req.body.lote,res)
                };
            }
        }
        
        if(flag) await Lote.findByIdAndUpdate(loteDB[0]._id, camposL,{new:true});   

        res.json({
            ok:true,
        })
    }
}

const duplicarLote= async(req,res = response) =>{
    try {
        if(await isAdmin(res,req.uid)){
            const loteDB = await Lote.findById(req.body.id);
            const imgDB = await Imagen.find({lote: loteDB.uuid});
            const pdfDB = await PDF.find({pdf: loteDB.terminos_condiciones});

            let pathPDF='./files/pdfs/'+loteDB.terminos_condiciones;
            let pdf=uuidv4();
            let newFile='./files/pdfs/'+pdf+'.pdf';
            if(fs.existsSync(pathPDF)) {
                fs.copyFileSync(pathPDF, newFile)
                let {_id, ...datosPDF} = pdfDB[0]._doc;            
                const pdfNew= new PDF(datosPDF);
                pdfNew.pdf=pdf+'.pdf'
                await pdfNew.save();
            }

            let {_id, ...datos} = loteDB._doc;            
            const lote= new Lote(datos);
            lote.terminos_condiciones=pdf+'.pdf'
            lote.disponible=true;
            lote.uuid=uuidv4();
            await lote.save();

            for (let i = 0; i < imgDB.length; i++) {
                let extension = imgDB[i].img.split('.');
                
                let pathImg='./files/lotes/'+imgDB[i].img;
                let imguuid=uuidv4();
                let newFileImg='./files/lotes/'+imguuid+'.'+extension[1];
                if(fs.existsSync(pathImg)) {
                    fs.copyFileSync(pathImg, newFileImg)
                    const img= new Imagen();
                    img.lote=lote.uuid;
                    img.img=imguuid+'.'+extension[1]
                    await img.save();
                }
            }
            
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


module.exports={ crearLote, getLotes, lote, getArchivo, deleteLote, actualizarLote, duplicarLote }