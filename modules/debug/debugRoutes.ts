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

// Check tables existence endpoint
router.get('/check-tables', async (req, res) => {
  try {
    // Check uni_farming_data
    const { data: uniData, error: uniError } = await supabase
      .from('uni_farming_data')
      .select('count')
      .limit(1);
      
    // Check ton_farming_data  
    const { data: tonData, error: tonError } = await supabase
      .from('ton_farming_data')
      .select('count')
      .limit(1);
      
    // Check users with farming data
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .or('uni_deposit_amount.gt.0,uni_farming_active.eq.true,ton_boost_active.eq.true');
      
    res.json({
      success: true,
      uni_farming_exists: !uniError || uniError.code !== '42P01',
      ton_farming_exists: !tonError || tonError.code !== '42P01',
      users_to_migrate: users?.length || 0
    });
  } catch (error: any) {
    console.error('Error checking tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check tables'
    });
  }
});

// Migration endpoint
router.post('/migrate-production', async (req, res) => {
  try {
    // Import migration script
    const migrationScript = await import('../../scripts/migrate-to-production');
    
    // Mock the console to capture output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };
    
    // Run migration
    await migrationScript.default();
    
    // Restore console
    console.log = originalLog;
    
    // Get counts
    const { count: uniCount } = await supabase
      .from('uni_farming_data')
      .select('*', { count: 'exact', head: true });
      
    const { count: tonCount } = await supabase
      .from('ton_farming_data')
      .select('*', { count: 'exact', head: true });
    
    res.json({
      success: true,
      uni_count: uniCount || 0,
      ton_count: tonCount || 0,
      logs
    });
  } catch (error: any) {
    console.error('Error migrating to production:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test production endpoint
router.get('/test-production', async (req, res) => {
  try {
    const { uniFarmingRepository } = await import('../farming/UniFarmingRepository');
    const { tonFarmingRepository } = await import('../boost/TonFarmingRepository');
    
    // Test repositories
    const uniTest = await uniFarmingRepository.getByUserId('62');
    const tonTest = await tonFarmingRepository.getByUserId('62');
    
    // Check if using fallback
    const uniUsingFallback = (uniFarmingRepository as any).isUsingFallback || false;
    const tonUsingFallback = (tonFarmingRepository as any).isUsingFallback || false;
    
    const tests = {
      uni_repository_works: !!uniTest,
      ton_repository_works: !!tonTest,
      fallback_disabled: !uniUsingFallback && !tonUsingFallback,
      all_tests_passed: !!uniTest && !!tonTest && !uniUsingFallback && !tonUsingFallback
    };
    
    res.json({
      success: true,
      ...tests
    });
  } catch (error: any) {
    console.error('Error testing production:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;