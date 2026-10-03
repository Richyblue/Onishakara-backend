const dashboardService = require('../service/dashboardService')

const getDashboard = async (req, res) => {
  try {
    const dashboard = await dashboardService(req)

    return res.status(200).json({
      success: true,
      dashboard,
    })
  } catch (error) {
    console.error('Dashboard Error:', error)

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        'Unable to load dashboard',
    })
  }
}

module.exports = getDashboard