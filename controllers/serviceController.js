const Service = require('../models/Service')
//const db =require('../config/offlineDb');

exports.createService = async (req, res) => {
  try {
    const { name, price, duration } = req.body

    const service = await Service.create({
      name,
      price,
      duration,
    })

    return res.status(201).json({
      success: true,
      service,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.getServices = async (req, res) => {
  try {
    const services = await Service.findAll({
      order: [['createdAt', 'DESC']],
    })

    return res.status(200).json({
      success: true,
      services,
    })
  } catch(error){

    db.all(
      `
      SELECT *
      FROM services
      ORDER BY id DESC
      `,
      [],
      (err,rows)=>{
  
        if(err){
  
          return res.status(500).json({
            success:false,
            message:err.message
          });
  
        }
  
        return res.status(200).json({
          success:true,
          offline:true,
          services:rows
        });
  
      }
    );
  
  }
}

exports.getService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id)

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      })
    }

    return res.status(200).json({
      success: true,
      service,
    })
  } catch(error){

    db.get(
      `
      SELECT *
      FROM services
      WHERE id = ?
      `,
      [req.params.id],
      (err,row)=>{
  
        if(!row){
  
          return res.status(404).json({
            success:false,
            message:'Service not found'
          });
  
        }
  
        return res.status(200).json({
          success:true,
          offline:true,
          service:row
        });
  
      }
    );
  
  }
}

exports.updateService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id)

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      })
    }

    await service.update(req.body)

    return res.status(200).json({
      success: true,
      service,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id)

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found',
      })
    }

    await service.destroy()

    return res.status(200).json({
      success: true,
      message: 'Service deleted successfully',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
