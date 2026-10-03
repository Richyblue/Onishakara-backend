const Sale = require("../models/Sale");
const SaleItem = require("../models/saleItem");
const Service = require("../models/Service");

exports.createSale = async (req, res) => {
    try {

        const { customerId, items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No sale items provided"
            });
        }

        let totalAmount = 0;

        const sale = await Sale.create({
            customerId,
            ServiceProviderId,
            totalAmount,
            paymentMethod,
          
            RecordedById: req.user.id
          })

        for (const item of items) {

            const service = await Service.findByPk(
                item.serviceId
            );

            if (!service) continue;

            const subtotal =
                Number(service.price) *
                Number(item.quantity);

            totalAmount += subtotal;

            await SaleItem.create({
                SaleId: sale.id,
                ServiceId: service.id,
                quantity: item.quantity,
                price: service.price,
                subtotal
            });
        }

        sale.totalAmount = totalAmount;

        await sale.save();

        return res.status(201).json({
            success: true,
            sale
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });

    }
};


exports.approveSale = async (req, res) => {
    try {

        const sale = await Sale.findByPk(
            req.params.id
        );

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }

        sale.approvalStatus = "approved";

        await sale.save();

        return res.status(200).json({
            success: true,
            message: "Sale approved"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });

    }
};

