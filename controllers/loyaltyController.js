const LoyaltyCard = require('../models/loyaltyCard')
const Customer = require('../models/Customer')

exports.getLoyaltyCards = async (req, res) => {
  try {
    const cards = await LoyaltyCard.findAll({
      include: [
        {
          model: Customer,
          attributes: [
            'id',
            'fullname',
            'phone',
            'email',
            'loyaltyPoints',
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    })

    return res.status(200).json({
      success: true,
      cards,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.updateStatus = async (req, res) => {
  try {
    const card =
      await LoyaltyCard.findByPk(
        req.params.id,
      )

    if (!card) {
      return res.status(404).json({
        success: false,
        message: 'Card not found',
      })
    }

    await card.update({
      status: req.body.status,
    })

    return res.status(200).json({
      success: true,
      message:
        'Status updated successfully',
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}