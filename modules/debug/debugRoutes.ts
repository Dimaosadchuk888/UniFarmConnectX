import { Router } from 'express';
import { supabase } from '../../core/supabase';
import jwt from 'jsonwebtoken';

const router = Router();

// Защита debug endpoints только для development окружения
const debugMiddleware = (req: any, res: any, next: any) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ 
      success: false, 
      error: 'Debug endpoints are disabled in production' 
    });
  }
  next();
};

// Debug endpoint to check user existence
router.get('/check-user/:id', debugMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    console.log('[DEBUG] Checking user with ID:', userId);
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      return res.json({ 
        success: false, 
        error: error.message,
        code: error.code 
      });
    }
    
    if (data) {
      return res.json({ 
        success: true, 
        user_found: true,
        user: {
          id: data.id,
          telegram_id: data.telegram_id,
          username: data.username,
          ref_code: data.ref_code
        }
      });
    }
    
    return res.json({ 
      success: true, 
      user_found: false 
    });
    
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Debug JWT decode endpoint
router.post('/decode-jwt', debugMiddleware, async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ success: false, error: 'No JWT token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.decode(token);
    
    return res.json({ 
      success: true, 
      decoded,
      token_length: token.length
    });
    
  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;