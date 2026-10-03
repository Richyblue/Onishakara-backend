const generateCardNumber = () => {

    const year =
        new Date().getFullYear();

    const random =
        Math.floor(
            100000 +
            Math.random() * 900000
        );

    return `SAL-${year}-${random}`;
};

module.exports =
    generateCardNumber;