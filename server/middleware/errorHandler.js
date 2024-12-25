export const errorHandler = (err, req, res, next) => {
  console.error(err.stack)
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message),
    })
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Duplicate field value entered',
    })
  }
  
  res.status(500).json({
    message: 'Something went wrong',
  })
}
