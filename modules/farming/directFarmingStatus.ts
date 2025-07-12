import { Request, Response } from 'express';
import { supabase } from '../../core/supabase';
import { logger } from '../../core/logger';

/**
 * Direct handler para verificar o status real do farming
 * Ignora transformações complexas e mostra dados brutos
 */
export async function directFarmingStatusHandler(req: Request, res: Response) {
  try {
    // БЕЗОПАСНОСТЬ: Используем только ID из JWT токена
    const authenticatedUserId = (req as any).user?.id;
    
    if (!authenticatedUserId) {
      return res.status(401).json({
        success: false,
        error: 'Требуется авторизация'
      });
    }
    
    // Если передан user_id в параметрах, проверяем что это свой ID
    const requestedUserId = req.query.user_id as string;
    if (requestedUserId && requestedUserId !== authenticatedUserId.toString()) {
      logger.warn('[DirectFarmingStatus] SECURITY: Попытка доступа к чужому статусу фарминга', {
        authenticated_user_id: authenticatedUserId,
        requested_user_id: requestedUserId,
        ip: req.ip
      });
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещен. Вы можете просматривать только свой статус фарминга'
      });
    }
    
    const userId = authenticatedUserId;
    
    logger.info('[DirectFarmingStatus] Verificando status do farming', { userId });
    
    // Buscar dados do usuário diretamente
    const { data: user, error } = await supabase
      .from('users')
      .select('id, telegram_id, balance_uni, balance_ton, uni_deposit_amount, uni_farming_start_timestamp, uni_farming_rate, uni_farming_last_update')
      .eq('id', userId)
      .single();
      
    if (error) {
      logger.error('[DirectFarmingStatus] Erro ao buscar usuário', { error: error.message });
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }
    
    // Análise detalhada do status
    const hasTimestamp = !!user.uni_farming_start_timestamp;
    const hasDeposit = parseFloat(user.uni_deposit_amount || '0') > 0;
    const hasRate = parseFloat(user.uni_farming_rate || '0') > 0;
    
    // Calcular se deveria estar ativo
    const shouldBeActive = hasTimestamp && hasDeposit && hasRate;
    
    // Retornar análise detalhada
    res.json({
      success: true,
      data: {
        user_id: user.id,
        balance_uni: user.balance_uni,
        raw_data: {
          uni_deposit_amount: user.uni_deposit_amount,
          uni_farming_start_timestamp: user.uni_farming_start_timestamp,
          uni_farming_rate: user.uni_farming_rate,
          uni_farming_last_update: user.uni_farming_last_update
        },
        analysis: {
          has_timestamp: hasTimestamp,
          has_deposit: hasDeposit,
          has_rate: hasRate,
          should_be_active: shouldBeActive,
          timestamp_value: user.uni_farming_start_timestamp,
          deposit_value: user.uni_deposit_amount,
          rate_value: user.uni_farming_rate
        },
        // Campo calculado conforme o serviço original
        uni_farming_active: shouldBeActive,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('[DirectFarmingStatus] Erro crítico', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}