const LoyaltyCard =
require('../models/loyaltyCard')

const Customer =require('../models/Customer')

exports.lookupCard =
async (req, res) => {

  try {

    const loyaltyCard =
      await LoyaltyCard.findOne({

        where: {
          cardNumber:
            req.params.cardNumber
        },

        include: [
          {
            model: Customer,
            attributes: [
              'id',
              'fullname',
              'phone',
              'loyaltyPoints'
            ]
          }
        ]

      })

    if (!loyaltyCard) {

      return res.status(404)
      .json({

        success: false,

        message:
          'Card not found'

      })

    }

    return res.status(200)
    .json({

      success: true,

      loyaltyCard

    })

  } catch (error) {

    console.error(error)

    return res.status(500)
    .json({

      success: false,

      message:
        'Server error'

    })

  }

}