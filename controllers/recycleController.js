const Product =require("../models/Product");

exports.getDeletedProducts =
async (req,res)=>{

  const products =
    await Product.findAll({

      paranoid:false,

      where:{
        deletedAt:{
          [Op.ne]:
          null
        }
      }

    });

  res.json({
    success:true,
    products
  });

}

exports.restoreProduct =
async (req,res)=>{

  const product =
    await Product.findByPk(

      req.params.id,

      {
        paranoid:false
      }

    );

  await product.restore();

  res.json({
    success:true,
    message:
    "Product restored"
  });

}

exports.forceDeleteProduct =
async (req,res)=>{

  const product =
    await Product.findByPk(

      req.params.id,

      {
        paranoid:false
      }

    );

  await product.destroy({
    force:true
  });

  res.json({
    success:true,
    message:
    "Product permanently deleted"
  });

}