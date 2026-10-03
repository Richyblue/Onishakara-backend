const calculatePenalty = ({
    baseAmount,
    penaltyRate = 10,
  }) => {
    const amount = Number(baseAmount || 0);
    const rate = Number(penaltyRate || 0);
  
    return Number(((amount * rate) / 100).toFixed(2));
  };
  
  module.exports = {
    calculatePenalty,
  };