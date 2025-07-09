import express from 'express';

const router = express.Router();

router.get('/test-simple', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Simple test route works!',
    timestamp: new Date().toISOString()
  });
});

export default router;