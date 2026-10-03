const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Expense = sequelize.define(
    "Expense",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },

        title: {
            type: DataTypes.STRING(150),
            allowNull: false
        },

        amount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },

        category: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: "General"
        },

        expenseDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },

        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    },
    {
        tableName: "Expenses",
        timestamps: true
    }
);

module.exports = Expense;