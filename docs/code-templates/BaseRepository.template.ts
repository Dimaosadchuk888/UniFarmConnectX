/**
 * {{MODULE_NAME}} Repository
 * Data access layer for {{MODULE_NAME}} module
 */

import { supabase } from '@/core/supabaseClient';
import { logger } from '@/core/logger';
import { 
  {{MODULE_NAME}},
  Create{{MODULE_NAME}}Data,
  Update{{MODULE_NAME}}Data,
  {{MODULE_NAME}}Filter,
  {{MODULE_NAME}}Stats
} from './types';

export class {{MODULE_NAME}}Repository {
  private readonly TABLE_NAME = '{{TABLE_NAME}}'; // TODO: Set correct table name

  /**
   * Find {{MODULE_NAME_LOWER}} by ID
   */
  async findById(id: string): Promise<{{MODULE_NAME}} | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      return data as {{MODULE_NAME}};
    } catch (error) {
      logger.error(`[{{MODULE_NAME}}Repository] Error finding by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Find all {{MODULE_NAME_LOWER}}s by user ID
   */
  async findByUserId(
    userId: string, 
    limit: number = 10, 
    offset: number = 0
  ): Promise<{
    {{MODULE_NAME_LOWER}}s: {{MODULE_NAME}}[];
    total: number;
  }> {
    try {
      // Get total count
      const { count, error: countError } = await supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        throw countError;
      }

      // Get paginated data
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        throw error;
      }

      return {
        {{MODULE_NAME_LOWER}}s: data as {{MODULE_NAME}}[],
        total: count || 0
      };
    } catch (error) {
      logger.error(`[{{MODULE_NAME}}Repository] Error finding by user ID ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Find {{MODULE_NAME_LOWER}}s with filters
   */
  async findWithFilters(filters: {{MODULE_NAME}}Filter): Promise<{{MODULE_NAME}}[]> {
    try {
      let query = supabase.from(this.TABLE_NAME).select('*');

      // Apply filters
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // TODO: Add more filter conditions based on your needs
      /*
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.minAmount) {
        query = query.gte('amount', filters.minAmount);
      }

      if (filters.maxAmount) {
        query = query.lte('amount', filters.maxAmount);
      }
      */

      // Sorting
      const sortField = filters.sortBy || 'created_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      // Pagination
      if (filters.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data as {{MODULE_NAME}}[];
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Repository] Error finding with filters:', error);
      throw error;
    }
  }

  /**
   * Create new {{MODULE_NAME_LOWER}}
   */
  async create(data: Create{{MODULE_NAME}}Data): Promise<{{MODULE_NAME}}> {
    try {
      const { data: created, error } = await supabase
        .from(this.TABLE_NAME)
        .insert(data)
        .select()
        .single();

      if (error) {
        throw error;
      }

      logger.info(`[{{MODULE_NAME}}Repository] Created {{MODULE_NAME_LOWER}} with ID ${created.id}`);

      return created as {{MODULE_NAME}};
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Repository] Error creating {{MODULE_NAME_LOWER}}:', error);
      throw error;
    }
  }

  /**
   * Create multiple {{MODULE_NAME_LOWER}}s
   */
  async createMany(data: Create{{MODULE_NAME}}Data[]): Promise<{{MODULE_NAME}}[]> {
    try {
      const { data: created, error } = await supabase
        .from(this.TABLE_NAME)
        .insert(data)
        .select();

      if (error) {
        throw error;
      }

      logger.info(`[{{MODULE_NAME}}Repository] Created ${created.length} {{MODULE_NAME_LOWER}}s`);

      return created as {{MODULE_NAME}}[];
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Repository] Error creating multiple {{MODULE_NAME_LOWER}}s:', error);
      throw error;
    }
  }

  /**
   * Update {{MODULE_NAME_LOWER}}
   */
  async update(id: string, data: Update{{MODULE_NAME}}Data): Promise<{{MODULE_NAME}} | null> {
    try {
      const { data: updated, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found
          return null;
        }
        throw error;
      }

      logger.info(`[{{MODULE_NAME}}Repository] Updated {{MODULE_NAME_LOWER}} with ID ${id}`);

      return updated as {{MODULE_NAME}};
    } catch (error) {
      logger.error(`[{{MODULE_NAME}}Repository] Error updating {{MODULE_NAME_LOWER}} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete {{MODULE_NAME_LOWER}}
   */
  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      logger.info(`[{{MODULE_NAME}}Repository] Deleted {{MODULE_NAME_LOWER}} with ID ${id}`);

      return true;
    } catch (error) {
      logger.error(`[{{MODULE_NAME}}Repository] Error deleting {{MODULE_NAME_LOWER}} ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple {{MODULE_NAME_LOWER}}s
   */
  async deleteMany(ids: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .in('id', ids);

      if (error) {
        throw error;
      }

      logger.info(`[{{MODULE_NAME}}Repository] Deleted ${ids.length} {{MODULE_NAME_LOWER}}s`);

      return true;
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Repository] Error deleting multiple {{MODULE_NAME_LOWER}}s:', error);
      throw error;
    }
  }

  /**
   * Get {{MODULE_NAME_LOWER}} statistics
   */
  async getStats(userId: string): Promise<{{MODULE_NAME}}Stats> {
    try {
      // TODO: Implement statistics queries based on your needs
      // Example implementation:

      // Total count
      const { count: total, error: totalError } = await supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (totalError) {
        throw totalError;
      }

      // Active count (example)
      const { count: active, error: activeError } = await supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');

      if (activeError) {
        throw activeError;
      }

      // TODO: Add more statistics queries
      /*
      // Sum of amounts
      const { data: sumData, error: sumError } = await supabase
        .from(this.TABLE_NAME)
        .select('amount')
        .eq('user_id', userId);

      if (sumError) {
        throw sumError;
      }

      const totalAmount = sumData.reduce((sum, item) => sum + (item.amount || 0), 0);
      */

      return {
        total: total || 0,
        active: active || 0,
        // TODO: Add more statistics fields
      };
    } catch (error) {
      logger.error(`[{{MODULE_NAME}}Repository] Error getting stats for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Check if {{MODULE_NAME_LOWER}} exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('id', id);

      if (error) {
        throw error;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.error(`[{{MODULE_NAME}}Repository] Error checking existence of ${id}:`, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL query (use with caution)
   */
  async executeRawQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query,
        params
      });

      if (error) {
        throw error;
      }

      return data as T[];
    } catch (error) {
      logger.error('[{{MODULE_NAME}}Repository] Error executing raw query:', error);
      throw error;
    }
  }

  /**
   * Begin transaction (if supported by Supabase)
   */
  async beginTransaction(): Promise<void> {
    // TODO: Implement transaction support if needed
    // Supabase doesn't have built-in transaction support in the client library
    // You might need to use stored procedures or handle this at the service level
    logger.warn('[{{MODULE_NAME}}Repository] Transaction support not implemented');
  }

  /**
   * Commit transaction
   */
  async commitTransaction(): Promise<void> {
    // TODO: Implement transaction support if needed
    logger.warn('[{{MODULE_NAME}}Repository] Transaction support not implemented');
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(): Promise<void> {
    // TODO: Implement transaction support if needed
    logger.warn('[{{MODULE_NAME}}Repository] Transaction support not implemented');
  }
}

// Export singleton instance
export const {{MODULE_NAME_LOWER}}Repository = new {{MODULE_NAME}}Repository();