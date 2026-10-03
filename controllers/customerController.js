const Customer = require('../models/Customer')
const LoyaltyCard = require('../models/loyaltyCard')

exports.createCustomer = async (
  req,
  res,
) => {
  try {
    const customer =
      await Customer.create(req.body)

    await LoyaltyCard.create({
      CustomerId: customer.id,
      cardNumber: `LC${String(
        customer.id,
      ).padStart(6, '0')}`,
      status: 'active',
    })

    return res.status(201).json({
      success: true,
      customer,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [['createdAt', 'DESC']],
    })

    return res.status(200).json({
      success: true,
      customers,
    })
  } catch(error){

    db.all(
     `
     SELECT *
     FROM customers
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
  
          customers:rows
  
        });
  
     }
    );
  
  }
}

exports.getCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id)

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    return res.status(200).json({
      success: true,
      customer,
    })
  } catch(error){

    db.get(
      `
      SELECT *
      FROM customers
      WHERE id = ?
      `,
      [req.params.id],
      (err,row)=>{
  
        if(!row){
  
          return res.status(404).json({
            success:false,
            message:
            'Customer not found'
          });
  
        }
  
        return res.status(200).json({
  
          success:true,
  
          offline:true,
  
          customer:row
  
        });
  
      }
    );
  
  }
}

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id)

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    await customer.update(req.body)

    return res.status(200).json({
      success: true,
      customer,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id)

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      })
    }

    await customer.destroy()

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
